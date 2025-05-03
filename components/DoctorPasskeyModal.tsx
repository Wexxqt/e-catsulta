"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { decryptKey, encryptKey } from "@/lib/utils";
import { validatePasskey as validatePasskeyAPI } from "@/lib/utils/validatePasskey";
import { Doctors } from "@/constants";

interface DoctorPasskeyModalProps {
  onSuccess?: () => void;
}

export const DoctorPasskeyModal = ({ onSuccess }: DoctorPasskeyModalProps) => {
  const router = useRouter();
  const path = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For debugging
  const [debugInfo, setDebugInfo] = useState("");

  // Get the encrypted key from localStorage
  const encryptedKey =
    typeof window !== "undefined"
      ? window.localStorage.getItem("doctorAccessKey")
      : null;

  useEffect(() => {
    // Check if we're on the doctor page and need to show the modal
    if (path === "/doctor") {
      // Check if we have a valid access key and doctor name
      const doctorName = localStorage.getItem("doctorName");
      const hasValidKey =
        encryptedKey &&
        doctorName &&
        Doctors.some((doc) => doc.name === doctorName);

      if (!hasValidKey) {
        // If no valid key or doctor name, show the modal
        setOpen(true);
      } else {
        // If we have a valid key and doctor name, close the modal
        setOpen(false);
      }
    } else if (path === "/" && searchParams.get("doctor") === "true") {
      // If we're on the main page with doctor=true in the URL, show the modal
      setOpen(true);
      // Reset any stored data to ensure fresh authentication
      if (typeof window !== "undefined") {
        // Don't clear these values as they might be needed for re-authentication
        // localStorage.removeItem("doctorAccessKey");
        // localStorage.removeItem("doctorName");
      }
    }
  }, [path, encryptedKey, searchParams]);

  const closeModal = () => {
    setOpen(false);
    // Redirect to home page when closing the modal if we're not already on /doctor
    if (path !== "/doctor") {
      router.push("/");
    }
  };

  const validatePasskey = async () => {
    if (isSubmitting) return;

    if (!selectedDoctor) {
      setError("Please select a doctor first.");
      return;
    }

    const doctor = Doctors.find((doc) => doc.name === selectedDoctor);
    if (!doctor) {
      setError("Invalid doctor selection.");
      return;
    }

    setIsSubmitting(true);
    setError(""); // Clear any previous errors

    try {
      // Determine which doctor type to validate
      let doctorType: "dr_abundo" | "dr_decastro";

      /* cspell:disable-next-line */
      if (doctor.id === "dr-abundo") {
        doctorType = "dr_abundo";
      } else if (doctor.id === "dr-decastro") {
        doctorType = "dr_decastro";
      } else {
        setError("Doctor not configured properly.");
        setIsSubmitting(false);
        return;
      }

      // Define fallback passkeys in case API call fails
      const fallbackPasskeys = {
        dr_abundo: "000000",
        dr_decastro: "555555",
      };

      // First try API validation
      let isValid = false;
      try {
        isValid = await validatePasskeyAPI(passkey, doctorType);
      } catch (apiError) {
        console.error("API validation failed, using fallback:", apiError);
        // If API call fails, use fallback validation
        isValid = passkey === fallbackPasskeys[doctorType];
      }

      if (isValid) {
        // Store authentication data in localStorage
        const encryptedKey = encryptKey(passkey);
        localStorage.setItem("doctorAccessKey", encryptedKey);
        localStorage.setItem("doctorName", selectedDoctor);

        setOpen(false);

        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        } else {
          // Redirect to doctor dashboard
          router.push("/doctor");
        }
      } else {
        setError("Invalid passkey. Please try again.");
        setPasskey(""); // Clear the passkey on error
      }
    } catch (error) {
      console.error("Error validating passkey:", error);
      setError("An error occurred. Please try again.");
      setPasskey(""); // Clear the passkey on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Watch for passkey changes and auto-submit when length is correct
  useEffect(() => {
    if (passkey.length === 6 && selectedDoctor) {
      validatePasskey();
    }
  }, [passkey]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        // Only allow closing via the close button or successful authentication
        if (!isOpen && !localStorage.getItem("doctorAccessKey")) {
          setOpen(true);
        } else {
          setOpen(isOpen);
        }
      }}
    >
      <AlertDialogContent className="shad-alert-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-start justify-between">
            Doctor Access Verification
            <Image
              src="/assets/icons/close.svg"
              alt="close"
              width={20}
              height={20}
              onClick={() => closeModal()}
              className="cursor-pointer"
            />
          </AlertDialogTitle>
          <AlertDialogDescription>
            Please select your name and enter your passkey to access the
            dashboard.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="doctor-select"
              className="text-sm font-medium text-gray-700"
            ></label>
            <select
              id="doctor-select"
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value);
                setError("");
                setPasskey(""); // Clear passkey when doctor changes
              }}
              className="shad-input w-full"
              disabled={isSubmitting}
            >
              <option value="">Select a doctor...</option>
              {Doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.name}>
                  Dr. {doctor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <InputOTP
              maxLength={6}
              value={passkey}
              onChange={(value) => {
                setPasskey(value);
                setError("");
              }}
              disabled={!selectedDoctor || isSubmitting}
            >
              <InputOTPGroup className="shad-otp">
                <InputOTPSlot className="shad-otp-slot" index={0} />
                <InputOTPSlot className="shad-otp-slot" index={1} />
                <InputOTPSlot className="shad-otp-slot" index={2} />
                <InputOTPSlot className="shad-otp-slot" index={3} />
                <InputOTPSlot className="shad-otp-slot" index={4} />
                <InputOTPSlot className="shad-otp-slot" index={5} />
              </InputOTPGroup>
            </InputOTP>

            {error && (
              <p className="shad-error text-14-regular mt-4 flex justify-center">
                {error}
              </p>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={validatePasskey}
            className="shad-primary-btn w-full"
            disabled={!selectedDoctor || passkey.length !== 6 || isSubmitting}
          >
            {isSubmitting ? "Verifying..." : "Enter Doctor Passkey"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

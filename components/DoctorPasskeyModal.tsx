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
        // If we have a valid key and doctor name, make sure the modal is closed
        setOpen(false);
      }
    } else if (path === "/" && searchParams.get("doctor") === "true") {
      // If we're on the main page with doctor=true in the URL, show the modal
      setOpen(true);
    }
  }, [path, encryptedKey, searchParams]);

  const closeModal = () => {
    setOpen(false);
    // Don't redirect to home page when closing the modal
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

    try {
      // Get doctor passkey from environment variables
      let doctorPasskey = "";

      if (doctor.id === "dr-abundo") {
        doctorPasskey = process.env.NEXT_PUBLIC_DR_ABUNDO_PASSKEY || "";
      } else if (doctor.id === "dr-decastro") {
        doctorPasskey = process.env.NEXT_PUBLIC_DR_DECASTRO_PASSKEY || "";
      }

      // Fallback to empty string if env variable is not defined
      if (!doctorPasskey) {
        console.error(`Passkey not configured for ${doctor.id}`);
        setError(
          "Doctor authentication is not properly configured. Please contact administrator."
        );
        return;
      }

      if (passkey === doctorPasskey) {
        const encryptedKey = encryptKey(passkey);
        localStorage.setItem("doctorAccessKey", encryptedKey);
        localStorage.setItem("doctorName", selectedDoctor);

        setOpen(false);

        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        } else {
          // Use router.push as fallback
          router.push("/doctor");
        }
      } else {
        setError("Invalid passkey. Please try again.");
        setPasskey(""); // Clear the passkey on error
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      setPasskey(""); // Clear the passkey on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Watch for passkey changes and auto-submit when length is correct
  useEffect(() => {
    if (passkey.length === 6) {
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

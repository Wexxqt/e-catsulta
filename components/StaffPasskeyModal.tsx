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

interface StaffPasskeyModalProps {
  onSuccess?: () => void;
}

export const StaffPasskeyModal = ({ onSuccess }: StaffPasskeyModalProps) => {
  const router = useRouter();
  const path = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the encrypted key from localStorage
  const encryptedKey =
    typeof window !== "undefined"
      ? window.localStorage.getItem("staffAccessKey")
      : null;

  useEffect(() => {
    // Check if we're on the staff page and need to show the modal
    if (path === "/staff") {
      const checkPasskey = async () => {
        // If we have an encrypted key, validate it
        if (encryptedKey) {
          const decryptedKey = decryptKey(encryptedKey);
          const isValid = await validatePasskeyAPI(decryptedKey, "staff");

          if (isValid) {
            // If valid key, make sure the modal is closed
            setOpen(false);
          } else {
            // If invalid key, show the modal
            setOpen(true);
          }
        } else {
          // No key, show the modal
          setOpen(true);
        }
      };

      checkPasskey();
    } else if (path === "/" && searchParams.get("staff") === "true") {
      // If we're on the main page with staff=true in the URL, show the modal
      setOpen(true);
    }
  }, [path, encryptedKey, searchParams]);

  const closeModal = () => {
    setOpen(false);
    // Redirect to home page when closing the modal
    router.push("/");
  };

  const validatePasskey = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const isValid = await validatePasskeyAPI(passkey, "staff");

      if (isValid) {
        const encryptedKey = encryptKey(passkey);
        localStorage.setItem("staffAccessKey", encryptedKey);

        setOpen(false);

        // Call the onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        } else {
          // Use router.push as fallback
          router.push("/staff");
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
        if (!isOpen && !localStorage.getItem("staffAccessKey")) {
          setOpen(true);
        } else {
          setOpen(isOpen);
        }
      }}
    >
      <AlertDialogContent className="shad-alert-dialog max-w-[90vw] sm:max-w-md md:max-w-lg w-full mx-auto">
        <AlertDialogHeader className="space-y-2 sm:space-y-3">
          <AlertDialogTitle className="flex items-start justify-between text-xl sm:text-2xl">
            Staff Access Verification
            <Image
              src="/assets/icons/close.svg"
              alt="close"
              width={24}
              height={24}
              onClick={() => closeModal()}
              className="cursor-pointer p-1 hover:bg-gray-700/30 rounded-full transition-colors"
            />
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm sm:text-base">
            Please enter your passkey to access the staff dashboard.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-6 py-2 sm:py-4">
          <div>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={passkey}
                onChange={(value) => {
                  setPasskey(value);
                  setError("");
                }}
                disabled={isSubmitting}
                className="gap-1 sm:gap-2"
              >
                <InputOTPGroup className="shad-otp">
                  <InputOTPSlot
                    className="responsiveOtpSlot size-10 sm:size-12 md:size-16 text-xl sm:text-2xl md:text-3xl"
                    index={0}
                  />
                  <InputOTPSlot
                    className="responsiveOtpSlot size-10 sm:size-12 md:size-16 text-xl sm:text-2xl md:text-3xl"
                    index={1}
                  />
                  <InputOTPSlot
                    className="responsiveOtpSlot size-10 sm:size-12 md:size-16 text-xl sm:text-2xl md:text-3xl"
                    index={2}
                  />
                  <InputOTPSlot
                    className="responsiveOtpSlot size-10 sm:size-12 md:size-16 text-xl sm:text-2xl md:text-3xl"
                    index={3}
                  />
                  <InputOTPSlot
                    className="responsiveOtpSlot size-10 sm:size-12 md:size-16 text-xl sm:text-2xl md:text-3xl"
                    index={4}
                  />
                  <InputOTPSlot
                    className="responsiveOtpSlot size-10 sm:size-12 md:size-16 text-xl sm:text-2xl md:text-3xl"
                    index={5}
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <p className="shad-error text-sm sm:text-base mt-4 flex justify-center">
                {error}
              </p>
            )}
          </div>
        </div>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction
            onClick={validatePasskey}
            className="shad-primary-btn w-full sm:w-2/3 h-10 sm:h-12 text-sm sm:text-base font-medium"
            disabled={passkey.length !== 6 || isSubmitting}
          >
            {isSubmitting ? "Verifying..." : "Enter Staff Passkey"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

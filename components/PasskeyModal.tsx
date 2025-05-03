"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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

export const PasskeyModal = () => {
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(true); // Always open the modal initially
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const encryptedKey =
    typeof window !== "undefined"
      ? window.localStorage.getItem("accessKey")
      : null;

  useEffect(() => {
    // Check if we're on the admin page and need to show the modal
    if (path === "/admin") {
      const checkPasskey = async () => {
        // If we have an encrypted key, validate it
        if (encryptedKey) {
          const decryptedKey = decryptKey(encryptedKey);
          const isValid = await validatePasskeyAPI(decryptedKey, "admin");

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
    }
  }, [path, encryptedKey]);

  const closeModal = () => {
    setOpen(false);
    router.push("/");
  };

  const validatePasskey = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    setIsValidating(true);
    setError("");

    try {
      const isValid = await validatePasskeyAPI(passkey, "admin");

      if (isValid) {
        const encryptedKey = encryptKey(passkey);
        localStorage.setItem("accessKey", encryptedKey);
        setOpen(false);
        router.replace("/admin"); // Use router.replace here
      } else {
        setError("Invalid passkey. Please try again.");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      console.error(error);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="shad-alert-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-start justify-between">
            Admin Access Verification
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
            To access the admin page, please enter the passkey.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <InputOTP
            maxLength={6}
            value={passkey}
            onChange={(value) => setPasskey(value)}
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
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={(e) => validatePasskey(e)}
            className="shad-primary-btn w-full"
            disabled={isValidating}
          >
            {isValidating ? "Validating..." : "Enter Admin Passkey"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

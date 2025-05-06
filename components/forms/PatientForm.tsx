"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";

import { Form } from "@/components/ui/form";
import { createUser } from "@/lib/actions/patient.actions";
import { loginWithGoogle } from "@/lib/auth.service";
import { UserFormValidation } from "@/lib/validation";

import "react-phone-number-input/style.css";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";

export const PatientForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<ReactNode | null>(null);

  const form = useForm<z.infer<typeof UserFormValidation>>({
    resolver: zodResolver(UserFormValidation),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  // Add a function to check if error is likely due to existing account
  const isExistingAccountError = (error: any): boolean => {
    if (error && error.code === 409) return true; // Conflict error typically means account exists

    // Check error message for common patterns indicating existing account
    if (
      error &&
      typeof error === "string" &&
      (error.includes("already exists") ||
        error.includes("already registered") ||
        error.includes("already in use"))
    ) {
      return true;
    }

    // If we got a user object back instead of creating a new one, it's an existing account
    if (error && error.$id) return true;

    return false;
  };

  const onSubmit = async (values: z.infer<typeof UserFormValidation>) => {
    setIsLoading(true);
    setErrorMessage(null); // Clear any previous errors
    console.log("Starting registration with values:", values);

    try {
      // Format the phone number correctly
      let formattedPhone = values.phone;
      // Ensure phone has +63 prefix if it doesn't already
      if (!formattedPhone.startsWith("+")) {
        if (formattedPhone.startsWith("0")) {
          formattedPhone = "+63" + formattedPhone.substring(1);
        } else {
          formattedPhone = "+63" + formattedPhone;
        }
      }

      const user = {
        name: values.name,
        email: values.email,
        phone: formattedPhone,
      };

      console.log("Calling createUser with:", user);
      const newUser = await createUser(user);
      console.log("createUser response:", newUser);

      // Check if this is likely an existing user account
      const isExistingUser = !!(
        newUser && newUser.$createdAt !== newUser.$updatedAt
      );

      if (newUser && newUser.$id && !isExistingUser) {
        console.log(
          "Registration successful, redirecting to:",
          `/patients/${newUser.$id}/register`
        );
        router.push(`/patients/${newUser.$id}/register`);
      } else {
        console.error("Account already exists:", newUser);
        // Show existing account warning
        setErrorMessage(
          <div className="flex items-start text-amber-500 font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <strong>Existing account detected!</strong> This email appears to
              be already registered. Please use the{" "}
              <strong>Google Login</strong> button above instead of registering
              again. Creating a new account will result in loss of access to
              your previous medical records.
            </span>
          </div>
        );
      }
    } catch (error) {
      console.error("Registration error:", error);

      if (isExistingAccountError(error)) {
        // Show existing account warning
        setErrorMessage(
          <div className="flex items-start text-amber-500 font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <strong>Existing account detected!</strong> This email appears to
              be already registered. Please use the{" "}
              <strong>Google Login</strong> button above instead of registering
              again. Creating a new account will result in loss of access to
              your previous medical records.
            </span>
          </div>
        );
      } else {
        // Generic error message for other types of errors
        setErrorMessage(
          <div className="flex items-start text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              <strong>An error occurred.</strong> Please check your inputs and
              try again.
            </span>
          </div>
        );
      }
    }

    setIsLoading(false);
  };

  // Handle Google login directly
  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      await loginWithGoogle();
    } catch (error) {
      console.error("Google login failed:", error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Helper to detect iOS
  const isIOSDevice =
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(window.navigator.userAgent);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
        <section className="mb-12 space-y-4">
          <h1 className="header">Hi CatSUans! 👋</h1>
          <p className="text-dark-700">
            Get started with your medical appointment.
          </p>
        </section>

        {/* Login option for existing users - only Google login */}
        <div className="bg-dark-300 p-4 rounded-lg border border-dark-500 mb-6">
          <h2 className="text-16-medium text-light-200 mb-2">
            Already have an account?
          </h2>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Image
                  src="/assets/icons/google.svg"
                  alt="Google"
                  width={20}
                  height={20}
                />
              )}
          Continue with Google
            </Button>

            {isIOSDevice && (
              <p className="text-xs text-blue-400 mt-2 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="inline-block h-3 w-3 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1 9a1 1 0 01-1-1v-4a1 1 0 112 0v4a1 1 0 01-1 1z"
                    clipRule="evenodd"
                  />
                </svg>
                iOS users: You'll be redirected to Safari for secure login
              </p>
            )}
          </div>
        </div>

        {/* Error message - make it more prominent when it's likely an existing account */}
        {errorMessage && (
          <div className="mb-6">
            <div className="text-14-medium">{errorMessage}</div>
          </div>
        )}

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-dark-500" />
          </div>
          <span className="relative bg-dark-400 px-4 text-14-regular text-dark-600">
            New patient? Register below
          </span>
        </div>

        <div className="p-4 rounded-lg border border-dark-500 mb-6">
          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label="Full name"
            placeholder="Full Name"
            iconSrc="/assets/icons/user.svg"
            iconAlt="user"
          />

          <div className="my-4">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="email"
              label="Email"
              placeholder="yourname@email.com"
              iconSrc="/assets/icons/email.svg"
              iconAlt="email"
            />
          </div>

          <CustomFormField
            fieldType={FormFieldType.PHONE_INPUT}
            control={form.control}
            name="phone"
            label="Phone number"
            placeholder="+63 9XXXXXXXXX"
          />

          <div className="mt-6">
            <SubmitButton isLoading={isLoading}>
              Register as New Patient
            </SubmitButton>
          </div>
        </div>
      </form>
    </Form>
  );
};

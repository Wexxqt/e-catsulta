"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import SocialLogin from "../SocialLogin";

export const PatientForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<z.infer<typeof UserFormValidation>>({
    resolver: zodResolver(UserFormValidation),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof UserFormValidation>) => {
    setIsLoading(true);
    setErrorMessage(null); // Clear any previous errors
    console.log("Starting registration with values:", values);

    try {
      // Format the phone number correctly
      let formattedPhone = values.phone;
      // Ensure phone has +63 prefix if it doesn't already
      if (!formattedPhone.startsWith('+')) {
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '+63' + formattedPhone.substring(1);
        } else {
          formattedPhone = '+63' + formattedPhone;
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
      
      if (newUser && newUser.$id) {
        console.log("Registration successful, redirecting to:", `/patients/${newUser.$id}/register`);
        router.push(`/patients/${newUser.$id}/register`);
      } else {
        console.error("Registration failed: Server returned empty response");
        setErrorMessage("Registration failed. This may be due to an email that's already registered, server connection issues, or invalid phone number format. Try logging in with Google instead if you already have an account.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      let message = "An error occurred during registration.";
      if (error instanceof Error) {
        message += " " + error.message;
      }
      setErrorMessage(message);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-6">
        <section className="mb-12 space-y-4">
          <h1 className="header">Hi CatSUans! 👋</h1>
          <p className="text-dark-700">Get started with your medical appointment.</p>
        </section>
        
        {/* Error message display */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500 rounded-md p-3 mb-4">
            <p className="text-14-medium text-red-500">{errorMessage}</p>
          </div>
        )}
        
        {/* Login option for existing users */}
        <div className="bg-dark-300 p-4 rounded-lg border border-dark-500 mb-6">
          <h2 className="text-16-medium text-light-200 mb-2">Already have an account?</h2>
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
            Log in with Google
          </Button>
        </div>
        
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-dark-500" />
          </div>
          <span className="relative bg-dark-400 px-4 text-14-regular text-dark-600">
            New user? Register below
          </span>
        </div>

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="name"
          label="Full name"
          placeholder="Full Name"
          iconSrc="/assets/icons/user.svg"
          iconAlt="user"
        />

        <CustomFormField
          fieldType={FormFieldType.INPUT}
          control={form.control}
          name="email"
          label="Email"
          placeholder="yourname@email.com"
          iconSrc="/assets/icons/email.svg"
          iconAlt="email"
        />

        <CustomFormField
          fieldType={FormFieldType.PHONE_INPUT}
          control={form.control}
          name="phone"
          label="Phone number"
          placeholder="+63 9XXXXXXXXX"
        />
        
        <p className="text-12-regular text-dark-600 -mt-4 mb-2">
          Enter your number with +63 prefix (e.g., +639123456789) or without prefix (e.g., 09123456789)
        </p>

        <SubmitButton isLoading={isLoading}>Register Now</SubmitButton>
      </form>
    </Form>
  );
};

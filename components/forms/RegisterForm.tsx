"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Form, FormControl } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SelectItem } from "@/components/ui/select";
import {
  Category,
  GenderOptions,
  PatientFormDefaultValues,
} from "@/constants";
import { registerPatient, verifyPatientPasskey } from "@/lib/actions/patient.actions";
import { PatientFormValidation } from "@/lib/validation";

import "react-datepicker/dist/react-datepicker.css";
import "react-phone-number-input/style.css";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface ExtendedUser extends User {
  gender: "Male" | "Female" | "Other";
  birthDate?: string;
}

const RegisterForm = ({ user }: { user: ExtendedUser }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [idNumberLength, setIdNumberLength] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showPasskeyModal, setShowPasskeyModal] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [passkeyError, setPasskeyError] = useState("");
  const [formValues, setFormValues] = useState<any>(null);

  // Format date as user types (automatically add /)
  const formatDateInput = (value: string) => {
    // Remove any non-numeric characters
    let numericValue = value.replace(/[^0-9]/g, '');
    
    // Format with slashes
    if (numericValue.length > 4) {
      // Format: MM/DD/YYYY
      return `${numericValue.slice(0, 2)}/${numericValue.slice(2, 4)}/${numericValue.slice(4, 8)}`;
    } else if (numericValue.length > 2) {
      // Format: MM/DD
      return `${numericValue.slice(0, 2)}/${numericValue.slice(2)}`;
    }
    
    return numericValue;
  };

  const form = useForm<z.infer<typeof PatientFormValidation>>({
    resolver: zodResolver(PatientFormValidation),
    defaultValues: {
      ...PatientFormDefaultValues,
      name: user.name,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : "",
      gender: user.gender as "Male" | "Female" | "Other",
    },
  });

  const handlePasskeyValidation = async () => {
    setIsLoading(true);
    setPasskeyError("");

    try {
      // Verify the passkey against the ID number
      const isValid = await verifyPatientPasskey(formValues.identificationNumber, passkey);
      
      if (isValid) {
        // Continue with registration if passkey is valid
        await completeRegistration(formValues);
      } else {
        setPasskeyError("Invalid passkey. Please check and try again.");
      }
    } catch (error) {
      console.error("Passkey validation error:", error);
      setPasskeyError(error instanceof Error ? error.message : "Failed to validate passkey");
    } finally {
      setIsLoading(false);
    }
  };

  const completeRegistration = async (values: z.infer<typeof PatientFormValidation>) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Validate required fields
      if (!values.identificationNumber) {
        throw new Error("Please provide your identification number");
      }

      if (!values.privacyConsent) {
        throw new Error("Please accept the privacy policy to continue");
      }

      // Validate phone number format
      const phoneRegex = /^\+?[0-9]{10,15}$/;
      if (!phoneRegex.test(values.phone)) {
        throw new Error("Please enter a valid phone number (e.g., +639123456789 or 09123456789)");
      }

      // Validate emergency contact number format
      if (!/^\+639\d{9}$/.test(values.emergencyContactNumber)) {
        throw new Error("Please enter a valid emergency contact number in the format +639XXXXXXXXX");
      }

      // Validate birth date format
      const birthDateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
      if (!birthDateRegex.test(values.birthDate)) {
        throw new Error("Please enter your date of birth in MM/DD/YYYY format (e.g., 04/14/2000)");
      }
      
      const patient = {
        userId: user.$id,
        name: values.name,
        email: values.email,
        phone: values.phone,
        birthDate: new Date(values.birthDate),
        gender: values.gender as Gender,
        address: values.address,
        category: values.category ?? "",
        emergencyContactName: values.emergencyContactName,
        emergencyContactNumber: values.emergencyContactNumber,
        signsSymptoms: values.signsSymptoms || "",
        allergies: values.allergies,
        currentMedication: values.currentMedication,
        familyMedicalHistory: values.familyMedicalHistory,
        pastMedicalHistory: values.pastMedicalHistory,
        identificationType: "Student ID", // Default value
        identificationNumber: values.identificationNumber,
        privacyConsent: values.privacyConsent,
      };

      // Attempt registration with retry for mobile devices
      let newPatient = null;
      let retryCount = 0;
      const maxRetries = 3; // Increased from 2 for better reliability
      
      while (!newPatient && retryCount <= maxRetries) {
        try {
          // Add a small delay before first retry to allow any transient issues to resolve
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log(`Registration attempt ${retryCount} starting after delay...`);
          }
          
          // For mobile devices, use a more conservative approach on retries
          const isLowEndOrMobile = typeof window !== 'undefined' && (
            window.navigator.userAgent.includes('iPhone') || 
            window.navigator.userAgent.includes('Android') ||
            (window as any).isLowEndDevice === true
          );
          
          // Standard registration attempt
          newPatient = await registerPatient(patient);
          
          if (!newPatient && retryCount < maxRetries) {
            retryCount++;
            console.log(`Registration attempt ${retryCount} failed, retrying...`);
            continue;
          }
          
          if (!newPatient && retryCount >= maxRetries) {
            throw new Error("Registration could not be completed after multiple attempts. Please try again later.");
          }
          
          break; // Break out of retry loop if successful
        } catch (innerError) {
          if (retryCount >= maxRetries) {
            throw innerError; // Re-throw if we've exhausted retries
          }
          retryCount++;
          console.log(`Registration attempt ${retryCount} failed with error, retrying...`, innerError);
          
          // Use exponential backoff for retries (wait longer with each retry)
          const delayMs = 1000 * Math.pow(2, retryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      console.log("New patient response:", newPatient);

      if (newPatient) {
        // Ensure we have the user ID for redirection
        const userIdForRedirect = user.$id;
        console.log("User ID for redirection:", userIdForRedirect);
        console.log("Redirecting to:", `/patients/${userIdForRedirect}/dashboard`);
        
        // Show success modal instead of alert
        setShowSuccessModal(true);
      } else {
        // If newPatient is null or undefined, something went wrong
        throw new Error("Registration could not be completed. Please try again.");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      // Show more specific error messages
      if (error instanceof Error) {
        // Check for specific network or server errors
        if (error.message.includes("network") || error.message.includes("connection") || error.message.includes("timeout")) {
          setErrorMessage("Network error. Please check your connection and try again when you have a stable internet connection.");
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("An unexpected error occurred. Please try again with a stable internet connection.");
      }
      // Show option to proceed without documents
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof PatientFormValidation>) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Store the form values for later use
      setFormValues(values);
      
      // Show passkey modal for verification
      setShowPasskeyModal(true);
    } catch (error) {
      console.error("Form submission error:", error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a handler to track the ID number length
  const handleIdNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdNumberLength(e.target.value.length);
    // Let React Hook Form handle the actual validation
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex-1 space-y-12"
      >
        <section className="space-y-4">
          <h1 className="header">Hi CatSUans! 👋</h1>
          <p className="text-dark-700">Let us know more about yourself.</p>
          <p className="text-dark-600 text-sm">Fields marked with * are required.</p>
        </section>

        <section className="space-y-6">
          <div className="mb-9 space-y-1">
            <h2 className="sub-header">Personal Information</h2>
          </div>

          {/* NAME */}

          <CustomFormField
            fieldType={FormFieldType.INPUT}
            control={form.control}
            name="name"
            label='Full Name'
            placeholder="Full Name"
            iconSrc="/assets/icons/user.svg"
            iconAlt="user"
          />

          {/* EMAIL & PHONE */}
          <div className="flex flex-col gap-6 xl:flex-row">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="email"
              label="Email address"
              placeholder="yourname@email.com"
              iconSrc="/assets/icons/email.svg"
              iconAlt="email"
            />

            <CustomFormField
              fieldType={FormFieldType.PHONE_INPUT}
              control={form.control}
              name="phone"
              label="Phone Number"
              placeholder="+63 9XXXXXXXXX"
            />
          </div>

          {/* BirthDate & Gender */}
          <div className="flex flex-col gap-6 xl:flex-row">
            <CustomFormField
              fieldType={FormFieldType.SKELETON}
              control={form.control}
              name="birthDate"
              label="Date of birth"
              renderSkeleton={(field) => (
                <FormControl>
                  <div className="flex rounded-md border border-dark-500 bg-dark-400">
                    <Input
                      placeholder="MM/DD/YYYY (e.g., 04/14/2000)"
                      className="shad-input border-0"
                      maxLength={10}
                      value={field.value}
                      onChange={(e) => {
                        const formattedValue = formatDateInput(e.target.value);
                        field.onChange(formattedValue);
                      }}
                    />
                  </div>
                </FormControl>
              )}
            />

            <CustomFormField
              fieldType={FormFieldType.SKELETON}
              control={form.control}
              name="gender"
              label="Gender"
              renderSkeleton={(field) => (
                <FormControl>
                  <RadioGroup
                    className="flex h-11 gap-6 xl:justify-between"
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    {GenderOptions.map((option, i) => (
                      <div key={option + i} className="radio-group">
                        <RadioGroupItem value={option} id={option} />
                        <Label htmlFor={option} className="cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
              )}
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-6 xl:flex-row">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="address"
              label="Address"
              placeholder="123 Example Street, Example Bldg."
            /> 
          </div>

          {/* Category */}
          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="category"
            label="Category"
            placeholder="Select Category"
          >
            {Category.map((type, i) => (
              <SelectItem key={type + i} value={type}>
                {type}
              </SelectItem>
            ))}
          </CustomFormField>

          {/* Emergency Contact Name & Emergency Contact Number */}
          <div className="flex flex-col gap-6 xl:flex-row">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="emergencyContactName"
              label="Emergency contact name"
              placeholder="Guardian's name"
            />

            <CustomFormField
              fieldType={FormFieldType.PHONE_INPUT}
              control={form.control}
              name="emergencyContactNumber"
              label="Emergency contact number"
              placeholder="(555) 123-4567"
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="mb-9 space-y-1">
            <h2 className="sub-header">Medical and Dental Information</h2>
          </div>

          {/* Signs & Symptoms */}
          <div className="flex flex-col gap-6 xl:flex-row">
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="signsSymptoms"
              label="Signs & Symptoms "
              placeholder="e.g., Headache, sore gums, or tooth pain (if any)"
            />
          </div>

          {/* Allergies & Current Medications */}
          <div className="flex flex-col gap-6 xl:flex-row">
            <CustomFormField
              fieldType={FormFieldType.TEXTAREA}
              control={form.control}
              name="allergies"
              label="Allergies (if any)"
              placeholder="e.g., Penicillin, anesthesia (type 'None' if not applicable)"
            />

            <CustomFormField
              fieldType={FormFieldType.TEXTAREA}
              control={form.control}
              name="currentMedication"
              label="Current medications"
              placeholder="e.g., Paracetamol, dental antibiotics, or leave blank if none"
            />
          </div>

          {/* Family Medical History & Past Medical History */}
          <div className="flex flex-col gap-6 xl:flex-row">
            <CustomFormField
              fieldType={FormFieldType.TEXTAREA}
              control={form.control}
              name="familyMedicalHistory"
              label=" Family medical history (if relevant)"
              placeholder="e.g., Diabetes, gum disease (optional)"
            />

            <CustomFormField
              fieldType={FormFieldType.TEXTAREA}
              control={form.control}
              name="pastMedicalHistory"
              label="Past medical history"
              placeholder="e.g., Asthma, past dental extractions (optional)"
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="mb-9 space-y-1">
            <h2 className="sub-header">Identification and Verification</h2>
          </div>

          {/* Only keep the ID Number field */}
          <CustomFormField
            fieldType={FormFieldType.SKELETON}
            control={form.control}
            name="identificationNumber"
            label="Identification Number *"
            placeholder="Enter Student No. or Employee ID (e.g., 2023-0456 or EMP-0123)"
            renderSkeleton={(field) => (
              <FormControl>
                <div className="flex flex-col">
                  <div className="flex rounded-md border border-dark-500 bg-dark-400">
                    <Input
                      placeholder="Enter Student No. or Employee ID (e.g., 2023-0456 or EMP-0123)"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleIdNumberChange(e);
                      }}
                      className="shad-input border-0"
                      maxLength={10}
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className={`text-xs ${idNumberLength > 10 ? 'text-red-500' : 'text-dark-600'}`}>
                      {idNumberLength}/10 characters
                    </span>
                  </div>
                </div>
              </FormControl>
            )}
          />
        </section>

        <section className="space-y-6">
          <div className="mb-9 space-y-1">
            <h2 className="sub-header">Consent and Privacy</h2>
          </div>

          <CustomFormField
            fieldType={FormFieldType.CHECKBOX}
            control={form.control}
            name="treatmentConsent"
            label="I consent to receive treatment for my health condition."
          />

          <CustomFormField
            fieldType={FormFieldType.CHECKBOX}
            control={form.control}
            name="disclosureConsent"
            label="I consent to the use and disclosure of my health
            information for treatment purposes."
          />

          <CustomFormField
            fieldType={FormFieldType.CHECKBOX}
            control={form.control}
            name="privacyConsent"
            label="I acknowledge that I have reviewed and agree to the
            privacy policy"
          />
        </section>

        <SubmitButton isLoading={isLoading}>Submit and Continue</SubmitButton>
      </form>

      {/* Passkey Verification Modal */}
      <Dialog 
        open={showPasskeyModal} 
        onOpenChange={(open) => {
          setShowPasskeyModal(open);
          if (!open) {
            setPasskey("");
            setPasskeyError("");
          }
        }}
      >
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-primary">Verify Your Identity</DialogTitle>
            <DialogDescription className="text-center">
              Please enter the 6-digit passkey associated with your ID number.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-6">
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
            
            {passkeyError && (
              <p className="text-center text-red-500 mt-3 text-sm">
                {passkeyError}
              </p>
            )}
          </div>
          
          <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-center">
            <Button 
              variant="outline"
              onClick={() => setShowPasskeyModal(false)}
              className="sm:w-1/3"
            >
              Cancel
            </Button>
            <Button 
              type="button"
              className="bg-primary text-white hover:bg-primary-dark sm:w-1/3"
              onClick={handlePasskeyValidation}
              disabled={passkey.length < 6 || isLoading}
            >
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog 
        open={showSuccessModal} 
        onOpenChange={(open) => {
          setShowSuccessModal(open);
          // Redirect when modal is closed
          if (!open) {
            router.push(`/patients/${user.$id}/dashboard`);
          }
        }}
      >
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-primary">Registration Successful!</DialogTitle>
            <DialogDescription className="text-center">
              <div className="mt-2 flex flex-col items-center justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>
                <p className="mt-4 text-center text-sm text-gray-500">
                  Please log in with your Google account to access your patient dashboard.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center mt-4">
            <Button 
              className="bg-primary text-white hover:bg-primary-dark"
              onClick={() => {
                setShowSuccessModal(false);
                router.push(`/patients/${user.$id}/dashboard`);
              }}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog 
        open={showErrorModal} 
        onOpenChange={(open) => setShowErrorModal(open)}
      >
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-red-600">Registration Error</DialogTitle>
            <DialogDescription className="text-center">
              <div className="mt-2 flex flex-col items-center justify-center">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <p className="mt-4 text-center text-sm text-gray-700">
                  {errorMessage || "An error occurred during registration. Please try again."}
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center mt-4">
            <Button 
              className="bg-primary text-white hover:bg-primary-dark"
              onClick={() => setShowErrorModal(false)}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
};

export default RegisterForm;

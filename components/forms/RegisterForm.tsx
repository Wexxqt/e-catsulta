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
  IdentificationTypes,
  PatientFormDefaultValues,
} from "@/constants";
import { registerPatient } from "@/lib/actions/patient.actions";
import { PatientFormValidation } from "@/lib/validation";

import "react-datepicker/dist/react-datepicker.css";
import "react-phone-number-input/style.css";
import CustomFormField, { FormFieldType } from "../CustomFormField";
import { FileUploader } from "../FileUploader";
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

  const onSubmit = async (values: z.infer<typeof PatientFormValidation>) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Validate required fields
      if (!values.identificationType || !values.identificationNumber) {
        throw new Error("Please provide your identification type and number");
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
      
      // Store file info in form data
      let formData: FormData | undefined;
      let hasFiles = false;
      
      if (values.identificationDocument && values.identificationDocument.length > 0) {
        try {
          // Check if running on a low-end or mobile device
          const isLowEndOrMobile = typeof window !== 'undefined' && (
            window.navigator.userAgent.includes('iPhone') || 
            window.navigator.userAgent.includes('Android') ||
            (window as any).isLowEndDevice === true
          );
          
          // Detect iPhone 6 and similar older devices specifically
          const isOlderIPhone = typeof window !== 'undefined' && (
            /iPhone\s(5|6|7|8|SE)/i.test(window.navigator.userAgent)
          );
          
          // Validate file size and type
          const MAX_FILE_SIZE = isLowEndOrMobile ? 15 * 1024 * 1024 : 50 * 1024 * 1024; // 15MB for mobile, 50MB for desktop
          const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
          
          for (const file of values.identificationDocument) {
            if (file.size > MAX_FILE_SIZE) {
              throw new Error(`File ${file.name} is too large. ${isLowEndOrMobile ? "Maximum size is 15MB on mobile devices." : "Maximum size is 50MB."}`);
            }
            
            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
              throw new Error(`File ${file.name} has an invalid type. Please upload JPEG, PNG, or PDF files only.`);
            }
          }

          // Create new FormData with simplified approach
          formData = new FormData();
          hasFiles = true;
          
          // Support up to 2 files for ID (front and back)
          const fileCount = Math.min(values.identificationDocument.length, 2);
          
          for (let i = 0; i < fileCount; i++) {
            const currentFile = values.identificationDocument[i];
            
            // Add each file with a simple, consistent key format
            formData.append(`file${i}`, currentFile);
            formData.append(`fileName${i}`, currentFile.name);
            formData.append(`fileType${i}`, currentFile.type);
            formData.append(`fileSize${i}`, String(currentFile.size));
          }
          
          // Store the number of files
          formData.append("fileCount", String(fileCount));
          
          // Inform the server about device type
          formData.append("deviceType", isLowEndOrMobile ? "mobile" : "desktop");
          formData.append("isOlderDevice", isOlderIPhone ? "true" : "false");
          
          console.log("Files prepared for upload:", fileCount);
        } catch (fileError) {
          console.error("File processing error:", fileError);
          if (fileError instanceof Error) {
            throw fileError; // Re-throw specific file errors
          } else {
            throw new Error("Unable to process your documents. Please try uploading smaller or fewer files.");
          }
        }
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
        identificationType: values.identificationType,
        identificationNumber: values.identificationNumber,
        identificationDocument: hasFiles ? formData : undefined,
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
          
          // Try to register without file first if we've already had an error
          if (retryCount >= 1) {
            console.log("Retrying registration without file upload...");
            newPatient = await registerPatient({
              ...patient,
              identificationDocument: undefined // Skip document upload on retry
            });
          } else {
            // Standard registration attempt with file
            newPatient = await registerPatient(patient);
          }
          
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
        } else if (error.message.includes("file") || error.message.includes("document") || error.message.includes("upload")) {
          setErrorMessage("There was an issue with your document upload. You can try registering without uploading documents, and upload them later from your dashboard.");
        } else if (error.message.includes("storage") || error.message.includes("quota") || error.message.includes("exceeded")) {
          setErrorMessage("Storage issue detected. Please try using a smaller file size for your documents or try again later.");
        } else if (error.message.includes("multiple attempts")) {
          setErrorMessage("Registration could not be completed after multiple attempts. Try again without uploading documents, and you can add them later from your dashboard.");
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("An unexpected error occurred. Please try again with a stable internet connection or without uploading documents.");
      }
      // Show option to proceed without documents
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

          <CustomFormField
            fieldType={FormFieldType.SELECT}
            control={form.control}
            name="identificationType"
            label="Identification Type *"
            placeholder="Select ID type"
          >
            {IdentificationTypes.map((type, i) => (
              <SelectItem key={type + i} value={type}>
                {type}
              </SelectItem>
            ))}
          </CustomFormField>

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

          <CustomFormField
            fieldType={FormFieldType.SKELETON}
            control={form.control}
            name="identificationDocument"
            label="Scanned Copy of Identification Document *"
            renderSkeleton={(field) => (
              <FormControl>
                <div>
                  <FileUploader 
                    files={field.value || []} 
                    onChange={field.onChange} 
                    maxSizeInMB={typeof window !== 'undefined' && window.navigator.userAgent.includes('iPhone') ? 15 : 50}
                    maxFiles={typeof window !== 'undefined' && 
                             (/iPhone\s(5|6|7|8|SE)/i.test(window.navigator.userAgent)) ? 1 : 2}
                  />
                  <p className="text-12-regular text-dark-600 mt-1">
                    {typeof window !== 'undefined' && 
                     (/iPhone\s(5|6|7|8|SE)/i.test(window.navigator.userAgent)) 
                      ? "Please upload a clear scan or photo of your school/employee ID. Maximum file size: 15MB." 
                      : "Please upload clear scans or photos of both front and back of your school/employee ID. Maximum file size: 50MB per image."}
                  </p>
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
          <DialogFooter className="flex flex-col sm:flex-row justify-center gap-2 mt-4">
            <Button 
              className="bg-primary text-white hover:bg-primary-dark"
              onClick={() => setShowErrorModal(false)}
            >
              OK
            </Button>
            {(errorMessage && 
              (errorMessage.includes("document") || 
               errorMessage.includes("upload") || 
               errorMessage.includes("file") || 
               errorMessage.includes("multiple attempts"))) && (
              <Button
                variant="outline"
                className="border-primary text-primary hover:bg-primary-light"
                onClick={async () => {
                  setShowErrorModal(false);
                  setIsLoading(true);
                  
                  try {
                    // Get current form values but proceed without documents
                    const values = form.getValues();
                    const patientData = {
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
                      identificationType: values.identificationType,
                      identificationNumber: values.identificationNumber,
                      identificationDocument: undefined, // Skip documents
                      privacyConsent: values.privacyConsent,
                    };
                    
                    // Register without documents
                    const newPatient = await registerPatient(patientData);
                    
                    if (newPatient) {
                      // Ensure we have the user ID for redirection
                      const userIdForRedirect = user.$id;
                      console.log("User ID for redirection:", userIdForRedirect);
                      console.log("Redirecting to:", `/patients/${userIdForRedirect}/dashboard`);
                      
                      // Show success modal
                      setShowSuccessModal(true);
                    } else {
                      throw new Error("Registration could not be completed. Please try again later.");
                    }
                  } catch (err) {
                    if (err instanceof Error) {
                      setErrorMessage(err.message);
                    } else {
                      setErrorMessage("Failed to register. Please try again later.");
                    }
                    setShowErrorModal(true);
                  } finally {
                    setIsLoading(false);
                  }
                }}
              >
                Try Without Documents
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
};

export default RegisterForm;

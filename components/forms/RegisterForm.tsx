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

interface ExtendedUser extends User {
  gender: "Male" | "Female" | "Other";
  birthDate?: string;
}

const RegisterForm = ({ user }: { user: ExtendedUser }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [idNumberLength, setIdNumberLength] = useState(0);

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

    // Store file info in form data
    let formData: FormData | undefined;
    if (
      values.identificationDocument &&
      values.identificationDocument?.length > 0
    ) {
      formData = new FormData();
      
      // Add all files to FormData
      values.identificationDocument.forEach(file => {
        const blobFile = new Blob([file], {
          type: file.type,
        });
        
        formData!.append("blobFile", blobFile);
        formData!.append("fileName", file.name);
      });
    }

    try {
      
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
        identificationDocument: values.identificationDocument
          ? formData
          : undefined,
        privacyConsent: values.privacyConsent,
      };

      const newPatient = await registerPatient(patient);
      console.log("New patient response:", newPatient);

      if (newPatient) {
        console.log("Redirecting to:", `/patients/${user.$id}/dashboard`);
        
        // Show success message before redirect
        alert("Registration successful! Redirecting to your dashboard...");
        
        // Use setTimeout to ensure the alert is seen before redirect
        setTimeout(() => {
          router.push(`/patients/${user.$id}/dashboard`);
        }, 500);
      } else {
        // If newPatient is null or undefined, something went wrong
        alert("Registration could not be completed. Please try again.");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      alert("An error occurred while submitting the form. Please try again.");
    }

    setIsLoading(false);
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
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="birthDate"
              label="Date of birth"
              placeholder="MM/DD/YYYY"
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
                    maxSizeInMB={50}
                    maxFiles={2}
                  />
                  <p className="text-12-regular text-dark-600 mt-1">
                    Please upload clear scans or photos of both front and back of your school/employee ID. Maximum file size: 50MB per image.
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
    </Form>
  );
};

export default RegisterForm;

"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { UpdatePersonalInfoValidation } from "@/lib/validations";
import { z } from "zod";

import CustomFormField, { FormFieldType } from "@/components/CustomFormField";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { updatePatient } from "@/lib/actions/patient.actions";
import { Patient } from "@/types/appwrite.types";

interface EditPersonalInfoFormProps {
  patient: Patient;
  onSuccess?: () => void;
}

const EditPersonalInfoForm = ({ patient, onSuccess }: EditPersonalInfoFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  // Define form with default values from patient data
  const form = useForm<z.infer<typeof UpdatePersonalInfoValidation>>({
    resolver: zodResolver(UpdatePersonalInfoValidation),
    defaultValues: {
      name: patient.name || "",
      email: patient.email || "",
      phone: patient.phone || "",
      birthDate: patient.birthDate ? new Date(patient.birthDate) : undefined,
      gender: patient.gender || "prefer not to say",
      address: patient.address || "",
      emergencyContactName: patient.emergencyContactName || "",
      emergencyContactNumber: patient.emergencyContactNumber || "",
    },
  });

  // Handle form submission
  const onSubmit = async (data: z.infer<typeof UpdatePersonalInfoValidation>) => {
    try {
      setIsLoading(true);

      // Update patient information
      await updatePatient(patient.$id, {
        ...data,
      });

      // Show success message
      toast.success("Personal information updated successfully");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error updating personal information:", error);
      toast.error("Failed to update personal information");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <CustomFormField
            control={form.control}
            name="name"
            label="Full Name"
            placeholder="Enter your full name"
            fieldType={FormFieldType.INPUT}
          />

          {/* Email */}
          <CustomFormField
            control={form.control}
            name="email"
            label="Email"
            placeholder="Enter your email"
            fieldType={FormFieldType.INPUT}
          />

          {/* Phone */}
          <CustomFormField
            control={form.control}
            name="phone"
            label="Phone Number"
            placeholder="+63"
            fieldType={FormFieldType.PHONE_INPUT}
          />

          {/* Birth Date */}
          <CustomFormField
            control={form.control}
            name="birthDate"
            label="Date of Birth"
            dateFormat="MM/dd/yyyy"
            fieldType={FormFieldType.DATE_PICKER}
          />

          {/* Gender */}
          <CustomFormField
            control={form.control}
            name="gender"
            label="Gender"
            placeholder="Select gender"
            fieldType={FormFieldType.SELECT}
          >
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
            <SelectItem value="prefer not to say">Prefer not to say</SelectItem>
          </CustomFormField>

          {/* Address */}
          <CustomFormField
            control={form.control}
            name="address"
            label="Address"
            placeholder="Enter your address"
            fieldType={FormFieldType.TEXTAREA}
          />

          {/* Emergency Contact Name */}
          <CustomFormField
            control={form.control}
            name="emergencyContactName"
            label="Emergency Contact Name"
            placeholder="Enter emergency contact name"
            fieldType={FormFieldType.INPUT}
          />

          {/* Emergency Contact Number */}
          <CustomFormField
            control={form.control}
            name="emergencyContactNumber"
            label="Emergency Contact Number"
            placeholder="+63"
            fieldType={FormFieldType.PHONE_INPUT}
          />
        </div>

        <div className="flex justify-end">
          <Button 
            type="submit" 
            className="shad-primary-btn"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default EditPersonalInfoForm; 
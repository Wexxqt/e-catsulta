import { z } from "zod";

// Patient personal information validation schema
export const UpdatePersonalInfoValidation = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  birthDate: z.date().optional(),
  gender: z.enum(["male", "female", "other", "prefer not to say"]),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }).optional(),
  emergencyContactName: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
  emergencyContactNumber: z.string().min(10, { message: "Please enter a valid phone number" }).optional(),
});

// Patient medical information validation schema
export const UpdateMedicalInfoValidation = z.object({
  allergies: z.string().optional(),
  currentMedication: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  familyMedicalHistory: z.string().optional(),
  signsSymptoms: z.string().optional(),
}); 
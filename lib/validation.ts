import { z } from "zod";

export const UserFormValidation = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .refine(
      (phone) => {
        // Accept +63 format or without + prefix
        return /^\+?[0-9]{10,15}$/.test(phone);
      }, 
      "Please enter a valid phone number (e.g., +639123456789 or 09123456789)"
    ),
});

export const PatientFormValidation = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .refine(
      (phone) => {
        // Accept +63 format or without + prefix
        return /^\+?[0-9]{10,15}$/.test(phone);
      }, 
      "Please enter a valid phone number (e.g., +639123456789 or 09123456789)"
    ),
  birthDate: z
    .string()
    .regex(
      /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/,
      "Please enter your date of birth in MM/DD/YYYY format (e.g., 04/14/2000)"
    ),
  gender: z.enum(["Male", "Female", "Other"]),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be at most 500 characters"),
  category: z
    .string()
    .min(2, "Occupation must be at least 2 characters")
    .max(500, "Occupation must be at most 500 characters"),
  emergencyContactName: z
    .string()
    .min(2, "Contact name must be at least 2 characters")
    .max(50, "Contact name must be at most 50 characters"),
  emergencyContactNumber: z
    .string()
    .refine(
      (emergencyContactNumber) => /^\+639\d{9}$/.test(emergencyContactNumber),
      "Please enter a valid Philippine phone number (+639XXXXXXXXX)"
    ),
  allergies: z.string().optional(),
  currentMedication: z.string().optional(),
  familyMedicalHistory: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  identificationNumber: z.string()
    .min(1, "ID number is required")
    .max(10, "ID number cannot exceed 10 characters"),
  signsSymptoms: z.string().optional(),
  treatmentConsent: z
    .boolean()
    .default(false)
    .refine((value) => value === true, {
      message: "You must consent to treatment in order to proceed",
    }),
  disclosureConsent: z
    .boolean()
    .default(false)
    .refine((value) => value === true, {
      message: "You must consent to disclosure in order to proceed",
    }),
  privacyConsent: z
    .boolean()
    .default(false)
    .refine((value) => value === true, {
      message: "You must consent to privacy in order to proceed",
    }),
});

export const CreateAppointmentSchema = z.object({
  primaryPhysician: z.string().min(2, "Select at least one doctor"),
  schedule: z.coerce.date({
    required_error: "Please select an appointment date and time",
    invalid_type_error: "Invalid date format"
  }).refine(
    (date) => date instanceof Date && !isNaN(date.getTime()),
    "Please select a valid appointment date and time"
  ),
  reason: z
    .string()
    .min(2, "Reason must be at least 2 characters")
    .max(500, "Reason must be at most 500 characters"),
  note: z.string().optional(),
  cancellationReason: z.string().optional(),
});

export const ScheduleAppointmentSchema = z.object({
  primaryPhysician: z.string().min(2, "Select at least one doctor"),
  schedule: z.coerce.date({
    required_error: "Please select an appointment date and time",
    invalid_type_error: "Invalid date format"
  }).refine(
    (date) => date instanceof Date && !isNaN(date.getTime()),
    "Please select a valid appointment date and time"
  ),
  reason: z.string().optional(),
  note: z.string().optional(),
  cancellationReason: z.string().optional(),
});

export const CancelAppointmentSchema = z.object({
  primaryPhysician: z.string().min(2, "Select at least one doctor"),
  schedule: z.coerce.date({
    required_error: "Please select an appointment date and time",
    invalid_type_error: "Invalid date format"
  }).refine(
    (date) => date instanceof Date && !isNaN(date.getTime()),
    "Please select a valid appointment date and time"
  ),
  reason: z.string().optional(),
  note: z.string().optional(),
  cancellationReason: z
    .string()
    .min(2, "Reason must be at least 2 characters")
    .max(500, "Reason must be at most 500 characters"),
});

export function getAppointmentSchema(type: string) {
  switch (type) {
    case "create":
      return CreateAppointmentSchema;
    case "cancel":
      return CancelAppointmentSchema;
    default:
      return ScheduleAppointmentSchema;
  }
}

// Patient personal information validation schema
export const UpdatePersonalInfoValidation = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  birthDate: z.date().optional(),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]),
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
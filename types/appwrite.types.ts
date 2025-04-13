import { Models } from "node-appwrite";

export interface Patient extends Models.Document {
  userId: string;
  name: string;
  email: string;
  phone: string;
  birthDate: Date;
  gender: Gender;
  address: string;
  category: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  signsSymptoms: string;
  allergies: string | undefined;
  currentMedication: string | undefined;
  familyMedicalHistory: string | undefined;
  pastMedicalHistory: string | undefined;
  identificationType: string | undefined;
  identificationNumber: string | undefined;
  identificationDocument: FormData | undefined;
  identificationDocumentId?: string;
  identificationDocumentUrl?: string;
  avatarDocument: FormData | undefined;
  avatarId?: string;
  avatarUrl?: string;
  avatarUpdateTimestamp?: string;
  privacyConsent: boolean;
}

export interface Appointment extends Models.Document {
  patient: Patient;
  schedule: Date;
  status: Status;
  primaryPhysician: string;
  reason: string;
  note: string;
  userId: string;
  cancellationReason: string | null;
  archived?: boolean;
  appointmentCode?: string;
}

export interface PatientNote extends Models.Document {
  patientId: string;
  doctorId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

// Add these to your types/appwrite.types.ts file
export type Gender = "male" | "female" | "other" | "prefer not to say";

export type Status = "pending" | "scheduled" | "cancelled";

export interface CreateAppointmentParams {
  patient: Patient;
  schedule: Date;
  status: Status;
  primaryPhysician: string;
  reason: string;
  note: string;
  userId: string;
  cancellationReason: string | null;
}

export interface UpdateAppointmentParams {
  appointmentId: string;
  userId: string;
  timeZone?: string;
  appointment: Partial<Appointment>;
  type: "schedule" | "cancel";
}
"use server";

import { ID, InputFile, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";
import bcrypt from 'bcrypt';

import {
  BUCKET_ID,
  DATABASE_ID,
  ENDPOINT,
  PATIENT_COLLECTION_ID,
  PROJECT_ID,
  databases,
  storage,
  users,
  APPOINTMENT_COLLECTION_ID,
} from "../appwrite.config";
import { parseStringify } from "../utils";
import { Patient, Passkey } from "@/types/appwrite.types";

// Define types from index.d.ts to avoid type errors
interface CreateUserParams {
  name: string;
  email: string;
  phone: string;
}

interface RegisterUserParams extends CreateUserParams {
  userId: string;
  birthDate: Date;
  gender: string;
  address: string;
  category: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  signsSymptoms: string;
  allergies?: string;
  currentMedication?: string;
  familyMedicalHistory?: string;
  pastMedicalHistory?: string;
  identificationType: string;
  identificationNumber: string;
  profilePictureUrl?: string;
  privacyConsent: boolean;
}

// Define the collection ID for patient notes
const PATIENT_NOTES_COLLECTION_ID = process.env.PATIENT_NOTES_COLLECTION_ID || "patient_notes";

// Constants for passkey collection
const PASSKEY_COLLECTION_ID = process.env.PASSKEY_COLLECTION_ID || "passkeys";

// CREATE APPWRITE USER
export const createUser = async (user: CreateUserParams) => {
  try {
    // Create new user -> https://appwrite.io/docs/references/1.5.x/server-nodejs/users#create
    const newuser = await users.create(
      ID.unique(),
      user.email,
      user.phone,
      undefined,
      user.name
    );

    return parseStringify(newuser);
  } catch (error: any) {
    // Check existing user
    if (error && error?.code === 409) {
      const existingUser = await users.list([
        Query.equal("email", [user.email]),
      ]);

      return existingUser.users[0];
    }
    console.error("An error occurred while creating a new user:", error);
  }
};

// GET USER
export const getUser = async (userId: string) => {
  try {
    const user = await users.get(userId);

    return parseStringify(user);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the user details:",
      error
    );
  }
};

// REGISTER PATIENT
export const registerPatient = async (patient: RegisterUserParams) => {
  try {
    // Validate critical environment variables first
    if (!DATABASE_ID || !PATIENT_COLLECTION_ID) {
      console.error("Missing critical environment variables:", {
        DATABASE_ID: Boolean(DATABASE_ID),
        PATIENT_COLLECTION_ID: Boolean(PATIENT_COLLECTION_ID)
      });
      throw new Error("Server configuration error. Please contact support.");
    }

    // Create patient in database
    const newPatient = await databases.createDocument(
          DATABASE_ID!,
          PATIENT_COLLECTION_ID!,
          ID.unique(),
      {
        userId: patient.userId,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        birthDate: new Date(patient.birthDate).toISOString(),
        gender: patient.gender,
        address: patient.address,
        category: patient.category,
        emergencyContactName: patient.emergencyContactName,
        emergencyContactNumber: patient.emergencyContactNumber,
        signsSymptoms: patient.signsSymptoms || "",
        allergies: patient.allergies || "",
        currentMedication: patient.currentMedication || "",
        familyMedicalHistory: patient.familyMedicalHistory || "",
        pastMedicalHistory: patient.pastMedicalHistory || "",
        identificationType: patient.identificationType,
        identificationNumber: patient.identificationNumber,
        profilePictureUrl: patient.profilePictureUrl || "",
        privacyConsent: patient.privacyConsent,
      }
    );

    return parseStringify(newPatient);
  } catch (error) {
    console.error("Error registering patient:", error);
    throw new Error((error as Error).message || "Failed to register patient");
  }
};

// GET PATIENT
export const getPatient = async (userId: string) => {
  try {
    console.log('getPatient called with userId:', userId);
    
    if (!userId) {
      console.error('getPatient: No userId provided');
      return null;
    }

    if (!DATABASE_ID || !PATIENT_COLLECTION_ID) {
      console.error('getPatient: Missing database configuration', {
        DATABASE_ID,
        PATIENT_COLLECTION_ID
      });
      return null;
    }

    // Query the database for the patient
    const response = await databases.listDocuments(
      DATABASE_ID,
      PATIENT_COLLECTION_ID,
      [
        Query.equal("userId", userId)
      ]
    );

    console.log('getPatient database response:', {
      total: response.total,
      documentsFound: response.documents.length
    });

    // For new users, this should return null
    if (!response.documents.length) {
      console.log('getPatient: No patient found for userId:', userId);
      return null;
    }

    const patient = response.documents[0] as Patient;
    console.log('getPatient: Found patient:', {
      patientId: patient.$id,
      userId: patient.userId
    });

    return patient;
  } catch (error) {
    console.error('getPatient error:', error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        userId,
        databaseId: DATABASE_ID,
        collectionId: PATIENT_COLLECTION_ID
      });
    }
    return null;
  }
};

// UPDATE PATIENT INFORMATION
export const updatePatient = async (patientId: string, updatedData: Partial<Patient>) => {
  try {
    if (!DATABASE_ID || !PATIENT_COLLECTION_ID) {
      throw new Error("Database ID or Collection ID is not defined");
    }

    // Handle any avatar uploads first if present
    const hasAvatarUpload = updatedData.avatarDocument && 
                          typeof updatedData.avatarDocument !== 'string' && 
                          'get' in updatedData.avatarDocument;
    
    if (hasAvatarUpload) {
      try {
        const avatarFormData = updatedData.avatarDocument as FormData;
        const fileObject = avatarFormData.get("file") as Blob;
        const fileName = avatarFormData.get("fileName") as string;

        if (fileObject && fileName) {
          // Get existing patient to check for existing avatar
          const existingPatient = await databases.getDocument(
            DATABASE_ID,
            PATIENT_COLLECTION_ID,
            patientId
          ) as unknown as Patient;

          // Delete old avatar if it exists
          if (existingPatient.avatarId) {
            try {
              await storage.deleteFile(BUCKET_ID!, existingPatient.avatarId);
              console.log("Deleted old avatar:", existingPatient.avatarId);
            } catch (deleteError) {
              console.error("Error deleting old avatar:", deleteError);
              // Continue even if delete fails
            }
          }

          // Upload new avatar
          const inputFile = InputFile.fromBlob(fileObject, fileName);
          const file = await storage.createFile(BUCKET_ID!, ID.unique(), inputFile);
          const avatarUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`;

          // Add avatar information to update data
          updatedData.avatarId = file.$id;
          updatedData.avatarUrl = avatarUrl;
          updatedData.avatarUpdateTimestamp = new Date().toISOString();

          console.log("Uploaded new avatar:", file.$id);
        }
      } catch (avatarError) {
        console.error("Error processing avatar upload:", avatarError);
        // Continue with update even if avatar upload fails
      }
    }

    // Remove FormData fields before sending to Appwrite
    const cleanedData = { ...updatedData };
    delete cleanedData.avatarDocument;

    // Handle date fields
    if (cleanedData.birthDate instanceof Date) {
      cleanedData.birthDate = cleanedData.birthDate.toISOString() as any;
    }

    // Update the patient document
    const updatedPatient = await databases.updateDocument(
      DATABASE_ID,
      PATIENT_COLLECTION_ID,
          patientId,
      cleanedData
    );

    console.log("Patient updated successfully:", updatedPatient.$id);
    return parseStringify(updatedPatient);
  } catch (error) {
    console.error("Error updating patient:", error);
    throw new Error("Failed to update patient information");
  }
};

// DELETE PATIENT 
export const deletePatient = async (patientId: string, userId: string) => {
  try {
    if (!patientId) {
      throw new Error("Missing required parameter: patientId");
    }

    // Get the patient to check if there's an ID document to delete
    const patient = await databases.getDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId
    );

    // Fix this check to use the new array-based field
    if ((patient as any).identificationDocumentIds) {
      try {
        // Parse the JSON string to get the array of document IDs
        const documentIds = JSON.parse((patient as any).identificationDocumentIds);
        // Delete each document ID
        for (const docId of documentIds) {
        await storage.deleteFile(
          BUCKET_ID!,
            docId
        );
        }
      } catch (fileError) {
        console.error("Error deleting identification documents:", fileError);
        // Continue with patient deletion even if file deletion fails
      }
    }

    // Delete the patient document
    await databases.deleteDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId
    );

    // Redirect to home page after deletion
    return { success: true, message: "Patient record deleted successfully" };
  } catch (error) {
    console.error("Error deleting patient:", error);
    return { success: false, error: String(error) };
  }
};

// Get All Patients for Admin
export const getAllPatients = async ({
  searchQuery = "",
  category = "",
  limit = 50,
  page = 1,
}: {
  searchQuery?: string;
  category?: string;
  limit?: number;
  page?: number;
}) => {
  try {
    const queries: any[] = [];
    
    // Add category filter if specified
    if (category) {
      queries.push(Query.equal("category", category));
    }
    
    // Add search query if specified - try a different approach
    if (searchQuery && searchQuery.trim() !== "") {
      // First try: Instead of using Query.search which might be problematic, 
      // let's use Query.startsWith which is more reliable
      queries.push(
        Query.startsWith("name", searchQuery.trim())
      );
      
      // If this doesn't work as expected, try Query.equal for exact matches
    }
    
    // Add pagination
    const offset = (page - 1) * limit;
    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));
    
    console.log("Search query params:", { searchQuery, category, page, limit });
    console.log("Executing search with queries:", JSON.stringify(queries));
    
    // Fetch patients from the database
    const patients = await databases.listDocuments(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      queries
    );
    
    // Count total patients for pagination
    let totalPatients = patients.total;
    
    console.log(`Found ${totalPatients} patients matching criteria`);
    
    return {
      patients: patients.documents,
      totalPatients,
      totalPages: Math.ceil(totalPatients / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching patients:", error);
    return {
      patients: [],
      totalPatients: 0,
      totalPages: 0,
      currentPage: page,
    };
  }
};

export async function updatePatientPersonalInfo({
  patientId,
  name,
  email,
  phone,
  birthDate,
  gender,
  address,
  emergencyContactName,
  emergencyContactNumber,
  identificationType,
  identificationNumber,
}: {
  patientId: string;
  name: string;
  email: string;
  phone: string;
  birthDate?: Date;
  gender: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactNumber?: string;
  identificationType?: string;
  identificationNumber?: string;
}) {
  try {
    const updatedPatient = await databases.updateDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId,
      {
        name,
        email,
        phone,
        ...(birthDate && { birthDate: birthDate.toISOString() }),
        // Keep original case for gender - don't lowercase
        gender,
        ...(address && { address }),
        ...(emergencyContactName && { emergencyContactName }),
        ...(emergencyContactNumber && { emergencyContactNumber }),
        ...(identificationType && { identificationType }),
        ...(identificationNumber && { identificationNumber }),
      }
    );

    return {
      status: "success",
      message: "Personal information updated successfully",
      patient: updatedPatient,
    };
  } catch (error) {
    console.error("Error updating personal information:", error);
    return {
      status: "error",
      message: "Failed to update personal information",
    };
  }
}

export async function updatePatientMedical({
  patientId,
  bloodType,
  allergies,
  medication,
  pastMedicalHistory,
  familyHistory,
  symptoms,
  lifestyleHabits,
  smoker,
  alcoholConsumption,
  height,
  weight,
  currentMedication,
  familyMedicalHistory,
  signsSymptoms,
}: {
  patientId: string;
  bloodType?: string;
  allergies?: string;
  medication?: string;
  pastMedicalHistory?: string;
  familyHistory?: string;
  symptoms?: string;
  lifestyleHabits?: string;
  smoker?: boolean;
  alcoholConsumption?: string;
  height?: string;
  weight?: string;
  currentMedication?: string;
  familyMedicalHistory?: string;
  signsSymptoms?: string;
}) {
  try {
    const updatedData: Record<string, any> = {};

    // Only include fields that have values
    if (bloodType !== undefined) updatedData.bloodType = bloodType;
    if (allergies !== undefined) updatedData.allergies = allergies;
    if (medication !== undefined) updatedData.medication = medication;
    if (pastMedicalHistory !== undefined) updatedData.pastMedicalHistory = pastMedicalHistory;
    if (familyHistory !== undefined) updatedData.familyHistory = familyHistory;
    if (symptoms !== undefined) updatedData.symptoms = symptoms;
    if (lifestyleHabits !== undefined) updatedData.lifestyleHabits = lifestyleHabits;
    if (smoker !== undefined) updatedData.smoker = smoker;
    if (alcoholConsumption !== undefined) updatedData.alcoholConsumption = alcoholConsumption;
    if (height !== undefined) updatedData.height = height;
    if (weight !== undefined) updatedData.weight = weight;
    if (currentMedication !== undefined) updatedData.currentMedication = currentMedication;
    if (familyMedicalHistory !== undefined) updatedData.familyMedicalHistory = familyMedicalHistory;
    if (signsSymptoms !== undefined) updatedData.signsSymptoms = signsSymptoms;

    // Update the patient document
    const response = await databases.updateDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId,
      updatedData
    );

    // Revalidate the patient page to reflect the changes
    revalidatePath(`/patients/${(response as Patient).$id}`);

    if (response) {
      return {
        status: "success",
        message: "Medical information updated successfully",
        data: response,
      };
    } else {
      return {
        status: "error",
        message: "Failed to update medical information",
      };
    }
  } catch (error) {
    console.error("Error updating patient medical information:", error);
    return {
      status: "error",
      message: (error as Error).message || "An error occurred while updating the medical information",
    };
  }
}

/**
 * Safely deletes a patient and handles all related data
 * @param patientId The ID of the patient document to delete
 * @returns Object with success status and message
 */
export const safeDeletePatient = async (patientId: string) => {
  try {
    // Get the patient to access related files
    const patient = await databases.getDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId
    ) as unknown as Patient;

    // Delete avatar if it exists
    if (patient.avatarId) {
      try {
        await storage.deleteFile(BUCKET_ID!, patient.avatarId);
        console.log("Deleted avatar file:", patient.avatarId);
      } catch (error) {
        console.error("Error deleting avatar file:", error);
        // Continue even if avatar deletion fails
      }
    }

    // Mark the patient as archived
    const updatedPatient = await databases.updateDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId,
      {
          archived: true,
        archivedAt: new Date().toISOString()
      }
    );

    console.log("Patient archived successfully:", patientId);
    return parseStringify(updatedPatient);
  } catch (error) {
    console.error("Error archiving patient:", error);
    throw error;
  }
};

// Verify passkey against ID number using Appwrite database
export const verifyPatientPasskey = async (idNumber: string, passkey: string): Promise<boolean> => {
  try {
    console.log(`Verifying passkey for ID: ${idNumber}`);
    
    if (!DATABASE_ID) {
      throw new Error("Database configuration missing");
    }
    
    // Query the passkey collection for this ID number
    const response = await databases.listDocuments(
      DATABASE_ID,
      PASSKEY_COLLECTION_ID,
      [Query.equal("idNumber", idNumber)]
    );
    
    // If no passkey found for this ID
    if (!response.documents.length) {
      console.log("ID not found in passkey database");
      
      // For development/testing only - allow any 6-digit passkey for IDs not in our database
      // Remove this in production!
      if (process.env.NODE_ENV !== 'production') {
        return passkey.length === 6 && /^\d{6}$/.test(passkey);
      }
      
      return false;
    }
    
    // Get the stored hashed passkey
    const passkeyDoc = response.documents[0] as Passkey;
    const hashedPasskey = passkeyDoc.passkey;
    
    // Use bcrypt.compare to securely compare the provided passkey with the stored hash
    const isValid = await bcrypt.compare(passkey, hashedPasskey);
    console.log(`Passkey validation result: ${isValid}`);
    
    return isValid;
  } catch (error) {
    console.error("Error validating passkey:", error);
    throw new Error("Failed to validate passkey. Please try again.");
  }
};

// Add or update a passkey in the database
export const setPatientPasskey = async (idNumber: string, passkey: string): Promise<boolean> => {
  try {
    if (!DATABASE_ID) {
      throw new Error("Database configuration missing");
    }
    
    // Validate input
    if (!idNumber || !passkey) {
      throw new Error("ID number and passkey are required");
    }
    
    // Validate passkey format (6 digits)
    if (!/^\d{6}$/.test(passkey)) {
      throw new Error("Passkey must be 6 digits");
    }
    
    // Generate salt and hash the passkey
    const salt = await bcrypt.genSalt(10);
    const hashedPasskey = await bcrypt.hash(passkey, salt);
    
    // Check if a passkey already exists for this ID
    const existingPasskeys = await databases.listDocuments(
      DATABASE_ID,
      PASSKEY_COLLECTION_ID,
      [Query.equal("idNumber", idNumber)]
    );
    
    if (existingPasskeys.documents.length > 0) {
      // Update existing passkey
      const existingDoc = existingPasskeys.documents[0] as Passkey;
      
      await databases.updateDocument(
        DATABASE_ID,
        PASSKEY_COLLECTION_ID,
        existingDoc.$id,
        {
          passkey: hashedPasskey,
          updatedAt: new Date().toISOString()
        }
      );
      
      console.log(`Updated passkey for ID: ${idNumber}`);
    } else {
      // Create new passkey document
      await databases.createDocument(
        DATABASE_ID,
        PASSKEY_COLLECTION_ID,
        ID.unique(),
        {
          idNumber: idNumber,
          passkey: hashedPasskey,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );
      
      console.log(`Created new passkey for ID: ${idNumber}`);
    }
    
    return true;
  } catch (error) {
    console.error("Error setting passkey:", error);
    throw new Error(`Failed to set passkey: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Initialize default passkeys for testing (use only in development)
export const initializeDefaultPasskeys = async (): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    console.log("Skipping passkey initialization in production");
    return;
  }
  
  try {
    const defaultPasskeys = [
      { idNumber: "2023-0456", passkey: "123456" },
      { idNumber: "EMP-0123", passkey: "654321" },
      { idNumber: "2023-1234", passkey: "111111" },
      { idNumber: "2022-5678", passkey: "222222" },
      { idNumber: "2021-9012", passkey: "333333" }
    ];
    
    console.log("Initializing default passkeys for testing...");
    
    for (const entry of defaultPasskeys) {
      await setPatientPasskey(entry.idNumber, entry.passkey);
    }
    
    console.log("Default passkeys initialized successfully");
  } catch (error) {
    console.error("Error initializing default passkeys:", error);
  }
};
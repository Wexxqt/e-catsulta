"use server";

import { ID, InputFile, Query } from "node-appwrite";
import { revalidatePath } from "next/cache";

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
import { Patient } from "@/types/appwrite.types";

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
  identificationDocument?: any;
  profilePictureUrl?: string;
  privacyConsent: boolean;
}

// Define the collection ID for patient notes
const PATIENT_NOTES_COLLECTION_ID = process.env.PATIENT_NOTES_COLLECTION_ID || "patient_notes";

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
export const registerPatient = async ({
  identificationDocument,
  ...patient
}: RegisterUserParams) => {
  try {
    // Validate critical environment variables first
    if (!DATABASE_ID || !PATIENT_COLLECTION_ID || !BUCKET_ID) {
      console.error("Missing critical environment variables:", {
        DATABASE_ID: Boolean(DATABASE_ID),
        PATIENT_COLLECTION_ID: Boolean(PATIENT_COLLECTION_ID),
        BUCKET_ID: Boolean(BUCKET_ID)
      });
      throw new Error("Server configuration error. Please contact support.");
    }

    // Handle multiple document files
    let fileIds = [];
    let fileUrls = [];
    let primaryFileId = null;
    let primaryFileUrl = null;
    
    if (identificationDocument && 
        typeof identificationDocument !== 'string' && 
        'get' in identificationDocument) {
      
      try {
        console.log("Processing file upload in registerPatient");
        
        // Check if we're using the new multi-file format
        const fileCountStr = identificationDocument.get("fileCount") as string;
        const fileCount = fileCountStr ? parseInt(fileCountStr, 10) : 0;
        
        console.log("File count from request:", fileCount);
        
        // Process using the appropriate method
        if (fileCount > 0) {
          // Use the new multi-file format
          console.log("Using new multi-file format");
          
          // Process each file
          for (let i = 0; i < fileCount; i++) {
            const fileObject = identificationDocument.get(`file${i}`) as Blob;
            const fileName = identificationDocument.get(`fileName${i}`) as string;
            
            // Verify we have both parts
            if (!fileObject || !fileName) {
              console.log(`Missing data for file ${i}`);
              continue;
            }
            
            console.log(`Processing file ${i}:`, fileName);
            
            try {
              const inputFile = InputFile.fromBlob(fileObject, fileName);
              
              const file = await storage.createFile(BUCKET_ID!, ID.unique(), inputFile);
              const fileUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`;
              
              fileIds.push(file.$id);
              fileUrls.push(fileUrl);
              
              // Set the first file as the primary one for backward compatibility
              if (i === 0) {
                primaryFileId = file.$id;
                primaryFileUrl = fileUrl;
              }
              
              console.log(`File ${i} uploaded successfully:`, file.$id);
            } catch (fileError) {
              console.error(`Error uploading file ${i}:`, fileError);
              // Continue with other files instead of completely failing
            }
          }
        } else {
          // Check for the single file format first
          const singleFile = identificationDocument.get("file") as Blob;
          const singleFileName = identificationDocument.get("fileName") as string;
          
          if (singleFile && singleFileName) {
            // We have a single file in the new format
            console.log("Processing single file upload");
            
            try {
              const inputFile = InputFile.fromBlob(singleFile, singleFileName);
              
              const file = await storage.createFile(BUCKET_ID!, ID.unique(), inputFile);
              const fileUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`;
              
              fileIds.push(file.$id);
              fileUrls.push(fileUrl);
              primaryFileId = file.$id;
              primaryFileUrl = fileUrl;
              
              console.log("Single file uploaded successfully:", file.$id);
            } catch (fileError) {
              console.error("Error uploading single file:", fileError);
              throw new Error("Failed to upload identification document. Please try again.");
            }
          } else {
            // Try the legacy format as last resort
            console.log("Trying legacy file format (blobFile)");
            const blobFiles = identificationDocument.getAll("blobFile") as Blob[];
            const fileNames = identificationDocument.getAll("fileName") as string[];
            
            if (blobFiles.length && fileNames.length) {
              console.log("Found files using legacy format:", blobFiles.length);
              
              // Upload each file
              for (let i = 0; i < blobFiles.length; i++) {
                try {
                  const inputFile = InputFile.fromBlob(
                    blobFiles[i],
                    fileNames[i]
                  );
  
                  const file = await storage.createFile(BUCKET_ID!, ID.unique(), inputFile);
                  const fileUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`;
                  
                  fileIds.push(file.$id);
                  fileUrls.push(fileUrl);
                  
                  // Set the first file as the primary one for backward compatibility
                  if (i === 0) {
                    primaryFileId = file.$id;
                    primaryFileUrl = fileUrl;
                  }
                } catch (fileError) {
                  console.error("Error uploading legacy format file:", fileError);
                  // Continue with next file instead of failing completely
                }
              }
            } else {
              console.error("No valid file data found in any format");
              throw new Error("No valid file data found. Please try uploading your documents again.");
            }
          }
        }
        
        // Verify we got at least some files
        if (fileIds.length === 0) {
          console.warn("No files were successfully uploaded");
          // Continue registration without files instead of failing completely
        } else {
          console.log(`Successfully uploaded ${fileIds.length} files`);
        }
      } catch (formDataError) {
        console.error("Error processing form data:", formDataError);
        throw new Error("Problem with the uploaded files. Please try again with different files.");
      }
    } else {
      console.log("No identification document provided or not in FormData format");
    }

    // Prepare document data with error handling
    const documentData = {
      // Keep the original single file fields for backward compatibility
      identificationDocumentId: primaryFileId,
      identificationDocumentUrl: primaryFileUrl,
      // Add the new array fields for multiple files
      identificationDocumentIds: fileIds.length > 0 ? JSON.stringify(fileIds) : null,
      identificationDocumentUrls: fileUrls.length > 0 ? JSON.stringify(fileUrls) : null,
      ...patient,
    };

    // Validate required fields
    if (!documentData.userId) {
      throw new Error("User ID is required");
    }

    // Create new patient document with retry logic
    let retryCount = 0;
    const maxRetries = 2;
    let newPatient;
    
    while (retryCount <= maxRetries) {
      try {
        newPatient = await databases.createDocument(
          DATABASE_ID!,
          PATIENT_COLLECTION_ID!,
          ID.unique(),
          documentData
        );
        break; // Success, exit the loop
      } catch (dbError) {
        retryCount++;
        console.error(`Database error (attempt ${retryCount}/${maxRetries+1}):`, dbError);
        
        if (retryCount > maxRetries) {
          // We've exhausted retries, rethrow the error
          throw dbError;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
      }
    }

    console.log("Patient registered successfully:", newPatient?.$id);
    return parseStringify(newPatient);
  } catch (error) {
    console.error("An error occurred while creating a new patient:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        patientData: {
          userId: patient.userId,
          name: patient.name,
          email: patient.email
        }
      });
    }
    // Return null explicitly so we can check for this in the component
    return null;
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
    if (!patientId || !updatedData) {
      throw new Error("Missing required parameters: patientId or updatedData");
    }

    // Create a clean copy of updatedData for the database update
    const dbUpdateData: Record<string, any> = {};
    
    // Copy all non-FormData fields to dbUpdateData
    for (const [key, value] of Object.entries(updatedData)) {
      // Skip FormData fields - they'll be handled separately
      if (
        value && 
        (typeof value !== 'object' || 
        (typeof value === 'object' && !('get' in value)))
      ) {
        dbUpdateData[key] = value;
      }
    }
    
    // Always make sure we have at least one field to update
    if (Object.keys(dbUpdateData).length === 0) {
      dbUpdateData.avatarUpdateTimestamp = new Date().toISOString();
    }
    
    // Check for FormData objects
    const hasAvatarUpload = updatedData.avatarDocument && 
                          typeof updatedData.avatarDocument !== 'string' && 
                          'get' in updatedData.avatarDocument;
    
    const hasIdDocUpload = updatedData.identificationDocument && 
                         typeof updatedData.identificationDocument !== 'string' && 
                         'get' in updatedData.identificationDocument;
    
    // First, update the document with the clean data
    console.log("Updating document with fields:", Object.keys(dbUpdateData));
    let updatedPatient;
    
    try {
      updatedPatient = await databases.updateDocument(
        DATABASE_ID!,
        PATIENT_COLLECTION_ID!,
        patientId,
        dbUpdateData
      );
    } catch (updateError) {
      console.error("Error updating patient document:", updateError);
      // If update fails, just fetch the current patient
      updatedPatient = await databases.getDocument(
        DATABASE_ID!,
        PATIENT_COLLECTION_ID!,
        patientId
      );
    }
    
    // Handle avatar upload if provided
    if (hasAvatarUpload) {
      try {
        const avatarFormData = updatedData.avatarDocument as FormData;
        const inputFile = InputFile.fromBlob(
          avatarFormData.get("blobFile") as Blob,
          avatarFormData.get("fileName") as string
        );

        console.log("Uploading avatar file to storage...");
        const file = await storage.createFile(BUCKET_ID!, ID.unique(), inputFile);
        
        // Create a properly formatted URL with public access
        const avatarUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`;
        
        // Update the patient document with the new avatar ID and URL
        await databases.updateDocument(
          DATABASE_ID!,
          PATIENT_COLLECTION_ID!,
          patientId,
          {
            avatarId: file.$id,
            avatarUrl: avatarUrl
          }
        );
        
        console.log("Avatar uploaded successfully:", file.$id);
      } catch (avatarError) {
        console.error("Error uploading avatar:", avatarError);
      }
    }
    
    // Handle identification document upload if provided
    if (hasIdDocUpload) {
      try {
        const idFormData = updatedData.identificationDocument as FormData;
        const inputFile = InputFile.fromBlob(
          idFormData.get("blobFile") as Blob,
          idFormData.get("fileName") as string
        );

        const file = await storage.createFile(BUCKET_ID!, ID.unique(), inputFile);
        
        // Create a properly formatted URL with public access
        const identificationDocumentUrl = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`;
        
        // Update the patient document with the new file ID and URL
        await databases.updateDocument(
          DATABASE_ID!,
          PATIENT_COLLECTION_ID!,
          patientId,
          {
            identificationDocumentId: file.$id,
            identificationDocumentUrl: identificationDocumentUrl
          }
        );
        
        console.log("Identification document uploaded successfully:", file.$id);
      } catch (docError) {
        console.error("Error uploading identification document:", docError);
      }
    }

    // Revalidate the patient page to reflect the changes
    revalidatePath(`/patients/${(updatedPatient as Patient).$id}`);

    return parseStringify(updatedPatient);
  } catch (error) {
    console.error("Error updating patient information:", error);
    throw error;
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

    // If the patient has an identification document, delete it
    if ((patient as any).identificationDocumentId) {
      try {
        await storage.deleteFile(
          BUCKET_ID!,
          (patient as any).identificationDocumentId
        );
      } catch (fileError) {
        console.error("Error deleting identification document:", fileError);
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
    // Update patient information in the database
    const updatedPatient = await databases.updateDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId,
      {
        name,
        email,
        phone,
        birthDate: birthDate ? birthDate.toISOString() : undefined,
        gender,
        address,
        emergencyContactName,
        emergencyContactNumber,
        identificationType,
        identificationNumber,
      }
    );

    if (!updatedPatient) {
      throw Error;
    }

    // Revalidate the patient page to reflect the changes
    revalidatePath(`/patients/${(updatedPatient as Patient).$id}`);

    return { status: "success" };
  } catch (error) {
    console.error("Error updating patient personal information:", error);
    return { status: "error", message: "Error updating patient information" };
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
    // Validate patient ID
    if (!patientId) {
      return {
        success: false,
        message: "No patient ID provided"
      };
    }

    // Step 1: Get the patient document to get userId
    const patient = await databases.getDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId
    ) as Patient;

    const userId = patient.userId;

    // Step 2: Get all appointments for this patient
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.equal("userId", userId)]
    );

    // Step 3: Update all appointments to remove patient reference
    // This is safer than deleting appointments as it preserves history
    const updatePromises = appointments.documents.map(appointment => 
      databases.updateDocument(
        DATABASE_ID!,
        APPOINTMENT_COLLECTION_ID!,
        appointment.$id,
        { 
          // Mark as archived 
          archived: true,
          // Add deletion info in the note field if it exists
          note: (appointment as any).hasOwnProperty('note') && (appointment as any).note
            ? `${(appointment as any).note}\n[Patient data removed]` 
            : "[Patient data removed]",
        }
      )
    );

    // Step 4: Get all notes for this patient
    const notes = await databases.listDocuments(
      DATABASE_ID!,
      PATIENT_NOTES_COLLECTION_ID,
      [Query.equal("patientId", patientId)]
    );

    // Step 5: Delete all notes
    const deleteNotePromises = notes.documents.map(note => 
      databases.deleteDocument(
        DATABASE_ID!,
        PATIENT_NOTES_COLLECTION_ID,
        note.$id
      )
    );

    // Step 6: Delete any files associated with this patient
    if (patient.identificationDocumentId) {
      try {
        await storage.deleteFile(
          BUCKET_ID!,
          patient.identificationDocumentId
        );
      } catch (fileError) {
        console.error("Error deleting patient ID document:", fileError);
        // Continue with deletion even if file removal fails
      }
    }

    if (patient.avatarId) {
      try {
        await storage.deleteFile(
          BUCKET_ID!,
          patient.avatarId
        );
      } catch (fileError) {
        console.error("Error deleting patient avatar:", fileError);
        // Continue with deletion even if file removal fails
      }
    }

    // Wait for all updates and deletions to complete
    await Promise.all([
      ...updatePromises, 
      ...deleteNotePromises
    ]);

    // Step 7: Finally, delete the patient document
    await databases.deleteDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId
    );

    // Revalidate relevant paths
    revalidatePath(`/admin`);
    
    return { 
      success: true, 
      message: "Patient deleted successfully",
      appointmentsUpdated: appointments.documents.length,
      notesDeleted: notes.documents.length
    };
  } catch (error) {
    console.error("Error safely deleting patient:", error);
    return { 
      success: false, 
      message: "Failed to delete patient",
      error: String(error)
    };
  }
};
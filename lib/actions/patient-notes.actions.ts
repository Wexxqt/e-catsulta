"use server";

import { ID, Query } from "node-appwrite";
import { databases, DATABASE_ID, PATIENT_NOTES_COLLECTION_ID } from "../appwrite.config";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";

// No longer need to define PATIENT_NOTES_COLLECTION_ID here since we import it

export const createPatientNote = async (note: {
  patientId: string;
  doctorId: string;
  note: string;
}) => {
  try {
    if (!DATABASE_ID) {
      throw new Error("Database ID is not defined");
    }
    
    if (!PATIENT_NOTES_COLLECTION_ID) {
      throw new Error("Patient notes collection ID is not defined");
    }
    
    const newNote = await databases.createDocument(
      DATABASE_ID!,
      PATIENT_NOTES_COLLECTION_ID!,
      ID.unique(),
      {
        ...note,
        createdAt: new Date(),
        updateAt: new Date(),
      }
    );

    return parseStringify(newNote);
  } catch (error) {
    console.error("Error creating patient note:", error);
    throw error;
  }
};

export const getPatientNotes = async (patientId: string) => {
  try {
    if (!DATABASE_ID) {
      console.error("Database ID is not defined");
      return [];
    }
    
    if (!PATIENT_NOTES_COLLECTION_ID) {
      console.error("Patient notes collection ID is not defined");
      return [];
    }
    
    console.log("Fetching patient notes with:", {
      databaseId: DATABASE_ID,
      collectionId: PATIENT_NOTES_COLLECTION_ID,
      patientId
    });
    
    const notes = await databases.listDocuments(
      DATABASE_ID!,
      PATIENT_NOTES_COLLECTION_ID!,
      [Query.equal("patientId", patientId), Query.orderDesc("createdAt")]
    );

    // Filter out archived notes
    const activeNotes = notes.documents.filter((note: any) => !note.archived);

    return parseStringify(activeNotes);
  } catch (error) {
    console.error("Error fetching patient notes:", error);
    return [];
  }
};

// CLEAR PATIENT NOTES HISTORY
export const clearPatientNotesHistory = async (patientId: string) => {
  try {
    if (!DATABASE_ID) {
      throw new Error("Database ID is not defined");
    }
    
    if (!PATIENT_NOTES_COLLECTION_ID) {
      throw new Error("Patient notes collection ID is not defined");
    }
    
    // First, get all notes for this patient
    const notes = await databases.listDocuments(
      DATABASE_ID!,
      PATIENT_NOTES_COLLECTION_ID!,
      [Query.equal("patientId", patientId)]
    );

    // Instead of deleting, mark each note as archived
    const updatePromises = notes.documents.map(note => 
      databases.updateDocument(
        DATABASE_ID!,
        PATIENT_NOTES_COLLECTION_ID!,
        note.$id,
        { 
          archived: true // This hides from patient view but preserves the record
        }
      )
    );

    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    // Revalidate the patient dashboard path
    revalidatePath(`/patients/${patientId}/dashboard`);
    
    return { success: true, count: notes.documents.length };
  } catch (error) {
    console.error("Error clearing patient notes history:", error);
    return { success: false, error: String(error) };
  }
};

// DELETE SPECIFIC NOTE
export const deletePatientNote = async (noteId: string) => {
  try {
    if (!DATABASE_ID) {
      throw new Error("Database ID is not defined");
    }
    
    if (!PATIENT_NOTES_COLLECTION_ID) {
      throw new Error("Patient notes collection ID is not defined");
    }
    
    await databases.deleteDocument(
      DATABASE_ID!,
      PATIENT_NOTES_COLLECTION_ID!,
      noteId
    );
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting patient note:", error);
    return { success: false, error: String(error) };
  }
};
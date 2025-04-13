"use server";

import { ID, Query } from "node-appwrite";
import { databases, DATABASE_ID } from "../appwrite.config";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";

const { PATIENT_NOTES_COLLECTION_ID } = process.env;

export const createPatientNote = async (note: {
  patientId: string;
  doctorId: string;
  note: string;
}) => {
  try {
    const newNote = await databases.createDocument(
      DATABASE_ID,
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
    const notes = await databases.listDocuments(
      DATABASE_ID,
      PATIENT_NOTES_COLLECTION_ID!,
      [Query.equal("patientId", patientId), Query.orderDesc("createdAt")]
    );

    return parseStringify(notes.documents);
  } catch (error) {
    console.error("Error fetching patient notes:", error);
    return [];
  }
};

// CLEAR PATIENT NOTES HISTORY
export const clearPatientNotesHistory = async (patientId: string) => {
  try {
    // First, get all notes for this patient
    const notes = await databases.listDocuments(
      DATABASE_ID,
      PATIENT_NOTES_COLLECTION_ID!,
      [Query.equal("patientId", patientId)]
    );

    // Delete each note
    const deletePromises = notes.documents.map(note => 
      databases.deleteDocument(
        DATABASE_ID,
        PATIENT_NOTES_COLLECTION_ID!,
        note.$id
      )
    );

    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
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
    await databases.deleteDocument(
      DATABASE_ID,
      PATIENT_NOTES_COLLECTION_ID!,
      noteId
    );
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting patient note:", error);
    return { success: false, error: String(error) };
  }
};
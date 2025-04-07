"use server";

import { ID, Query } from "node-appwrite";
import { databases, DATABASE_ID } from "../appwrite.config";
import { parseStringify } from "../utils";

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
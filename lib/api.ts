// Add this to lib/api.ts

import { Client, Databases, Query } from "appwrite";

const client = new Client();
client
  .setEndpoint(process.env.NEXT_PUBLIC_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.PROJECT_ID || "676eecb00010826361f7");

const databases = new Databases(client);

export const fetchDoctorAvailability = async (doctorId: string) => {
  try {
    const response = await databases.listDocuments(
      process.env.DATABASE_ID || "676eecb00010826361f7",
      process.env.AVAILABILITY_COLLECTION_ID || "67ea1bee00157b9de16e",
      [Query.equal("doctorId", doctorId)]
    );

    if (response.documents.length > 0) {
      return response.documents[0].availability;
    } else {
      return { dates: [], times: [] };
    }
  } catch (error) {
    console.error("Failed to fetch doctor availability:", error);
    return { dates: [], times: [] };
  }
};

// New function to fetch all booked appointments for a doctor
export const fetchDoctorAppointments = async (doctorId: string) => {
  try {
    const response = await databases.listDocuments(
      process.env.NEXT_PUBLIC_DATABASE_ID || "676eed6f0007da27da19",
      process.env.APPOINTMENT_COLLECTION_ID || "",
      [
        Query.equal("primaryPhysician", doctorId),
        Query.equal("status", "scheduled"), // Only get confirmed appointments
        Query.greaterThan("schedule", new Date().toISOString()), // Only future appointments
      ]
    );
    
    return response.documents;
  } catch (error) {
    console.error("Failed to fetch doctor appointments:", error);
    return [];
  }
};
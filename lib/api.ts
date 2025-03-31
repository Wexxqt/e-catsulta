import { Client, Databases } from "appwrite";

const client = new Client();
client
  .setEndpoint(process.env.NEXT_PUBLIC_ENDPOINT || "https://cloud.appwrite.io/v1") // Your API Endpoint
  .setProject(process.env.PROJECT_ID || "676eecb00010826361f7"); // Your project ID

const databases = new Databases(client);

export const fetchDoctorAvailability = async (doctorId: string) => {
  try {
    const response = await databases.listDocuments(
      process.env.DATABASE_ID || "676eecb00010826361f7",
      process.env.AVAILABILITY_COLLECTION_ID || "67ea1bee00157b9de16e",
      [`equal("doctorId", "${doctorId}")`]
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
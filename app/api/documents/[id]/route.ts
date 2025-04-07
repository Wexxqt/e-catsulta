import { NextResponse } from "next/server";
import { Client, Storage } from "node-appwrite";

// Get environment variables
const ENDPOINT = process.env.NEXT_PUBLIC_ENDPOINT;
const PROJECT_ID = process.env.PROJECT_ID;
const API_KEY = process.env.API_KEY;
const BUCKET_ID = process.env.NEXT_PUBLIC_BUCKET_ID;

// Initialize the Appwrite client for this API route
const client = new Client();

// Set up the client with required configuration
if (ENDPOINT) client.setEndpoint(ENDPOINT);
if (PROJECT_ID) client.setProject(PROJECT_ID);
if (API_KEY) client.setKey(API_KEY);

const storage = new Storage(client);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the document ID from the URL parameters
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    if (!BUCKET_ID) {
      console.error("BUCKET_ID is missing from environment variables");
      return NextResponse.json(
        { error: "Storage configuration is missing" },
        { status: 500 }
      );
    }

    if (!PROJECT_ID) {
      console.error("PROJECT_ID is missing from environment variables");
      return NextResponse.json(
        { error: "Project configuration is missing" },
        { status: 500 }
      );
    }

    if (!API_KEY) {
      console.error("API_KEY is missing from environment variables");
      return NextResponse.json(
        { error: "API key is missing" },
        { status: 500 }
      );
    }

    console.log('Attempting to get file download for:', { 
      bucketId: BUCKET_ID, 
      fileId: id,
      projectId: PROJECT_ID 
    });

    try {
      // Construct the file view URL with authentication
      const url = `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${id}/view?project=${PROJECT_ID}`;
      
      // Get the file details to ensure it exists and we have access
      await storage.getFile(BUCKET_ID, id);
      
      return NextResponse.json({ 
        url,
        filename: id 
      });
    } catch (storageError: any) {
      console.error("Error accessing file:", {
        message: storageError.message,
        type: storageError.type,
        code: storageError.code
      });
      
      return NextResponse.json(
        { 
          error: storageError.message || "Failed to access file",
          type: storageError.type,
          code: storageError.code 
        },
        { status: storageError.code || 500 }
      );
    }

  } catch (error: any) {
    console.error("Error handling document request:", {
      message: error.message,
      type: error.type,
      code: error.code
    });
    
    return NextResponse.json(
      { 
        error: error.message || "Failed to generate document URL",
        type: error.type,
        code: error.code 
      },
      { status: error.code || 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import { setPatientPasskey } from "@/lib/actions/patient.actions";
import { DATABASE_ID, databases } from "@/lib/appwrite.config";

// PASSKEY_COLLECTION_ID is defined in patient.actions.ts, but we can use the same constant here
const PASSKEY_COLLECTION_ID = process.env.PASSKEY_COLLECTION_ID || "passkeys";

// GET all passkeys
export async function GET() {
  try {
    if (!DATABASE_ID) {
      throw new Error("Database configuration missing");
    }
    
    // Fetch all passkeys from the database
    const response = await databases.listDocuments(
      DATABASE_ID,
      PASSKEY_COLLECTION_ID
    );
    
    return NextResponse.json({
      success: true,
      passkeys: response.documents
    });
  } catch (error) {
    console.error("Error fetching passkeys:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch passkeys", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// POST to add or update a passkey
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { idNumber, passkey } = body;
    
    // Validate required fields
    if (!idNumber || !passkey) {
      return NextResponse.json(
        { success: false, message: "ID number and passkey are required" },
        { status: 400 }
      );
    }

    // Set the passkey
    await setPatientPasskey(idNumber, passkey);
    
    return NextResponse.json({
      success: true,
      message: "Passkey updated successfully"
    });
  } catch (error) {
    console.error("Error setting passkey:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to set passkey", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 
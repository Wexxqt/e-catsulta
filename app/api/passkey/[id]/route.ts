import { NextRequest, NextResponse } from "next/server";
import { DATABASE_ID, databases } from "@/lib/appwrite.config";

// PASSKEY_COLLECTION_ID is defined in patient.actions.ts, but we can use the same constant here
const PASSKEY_COLLECTION_ID = process.env.PASSKEY_COLLECTION_ID || "passkeys";

// DELETE a passkey by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!DATABASE_ID) {
      throw new Error("Database configuration missing");
    }
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Passkey ID is required" },
        { status: 400 }
      );
    }
    
    // Delete the passkey document
    await databases.deleteDocument(
      DATABASE_ID,
      PASSKEY_COLLECTION_ID,
      id
    );
    
    return NextResponse.json({
      success: true,
      message: "Passkey deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting passkey:", error);
    
    // Handle document not found error (404)
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Passkey not found", 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to delete passkey", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 
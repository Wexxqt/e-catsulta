import { NextResponse } from "next/server";
import { initializeDefaultPasskeys } from "@/lib/actions/patient.actions";

export async function GET() {
  // Only allow this in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, message: "This endpoint is not available in production" },
      { status: 403 }
    );
  }

  try {
    await initializeDefaultPasskeys();
    
    return NextResponse.json({
      success: true,
      message: "Default passkeys initialized successfully"
    });
  } catch (error) {
    console.error("Error initializing passkeys:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to initialize passkeys", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 
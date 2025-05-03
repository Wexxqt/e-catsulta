import { NextRequest, NextResponse } from "next/server";
import { verifyPatientPasskey } from "@/lib/actions/patient.actions";

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

    // Verify the passkey
    const isValid = await verifyPatientPasskey(idNumber, passkey);

    return NextResponse.json({
      success: true,
      isValid,
    });
  } catch (error) {
    console.error("Error verifying passkey:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify passkey",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

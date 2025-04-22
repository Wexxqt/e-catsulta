import { NextRequest, NextResponse } from "next/server";
import { databases, DATABASE_ID, APPOINTMENT_COLLECTION_ID } from "@/lib/appwrite.config";

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, status } = await req.json();

    if (!appointmentId || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update the appointment in Appwrite
    const updatedAppointment = await databases.updateDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId,
      { status }
    );

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update appointment status" },
      { status: 500 }
    );
  }
} 
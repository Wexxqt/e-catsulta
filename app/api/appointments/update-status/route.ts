import { NextRequest, NextResponse } from "next/server";
import { databases, DATABASE_ID, APPOINTMENT_COLLECTION_ID } from "@/lib/appwrite.config";

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { appointmentId, status } = body;

    // Validate required parameters
    if (!appointmentId || !status) {
      return NextResponse.json(
        { success: false, error: "Appointment ID and status are required" },
        { status: 400 }
      );
    }

    // Validate that status is one of the allowed values
    const allowedStatuses = ["scheduled", "pending", "cancelled", "completed"];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Update the appointment in the database
    const updatedAppointment = await databases.updateDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId,
      { status }
    );

    return NextResponse.json({
      success: true,
      message: "Appointment status updated successfully",
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update appointment status" },
      { status: 500 }
    );
  }
} 
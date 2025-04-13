import { NextResponse } from "next/server";
import { clearDoctorAppointmentHistory } from "@/lib/actions/appointment.actions";

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { doctorName, action, preservePatientData = false } = body;

    if (!doctorName) {
      return NextResponse.json(
        { error: "Doctor name is required" },
        { status: 400 }
      );
    }

    // Currently we only support 'archive' action
    if (action !== 'archive') {
      return NextResponse.json(
        { error: "Invalid action specified" },
        { status: 400 }
      );
    }

    // Call the server action to clear the appointments
    const result = await clearDoctorAppointmentHistory(doctorName, preservePatientData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to clear appointment history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully archived ${result.count} appointments for Dr. ${doctorName}`,
      count: result.count,
      preservedPatientData: preservePatientData
    });

  } catch (error: any) {
    console.error("Error clearing appointment history:", {
      message: error.message,
      type: error.type,
      code: error.code
    });
    
    return NextResponse.json(
      { 
        error: error.message || "Failed to clear appointment history",
        type: error.type,
        code: error.code 
      },
      { status: error.code || 500 }
    );
  }
} 
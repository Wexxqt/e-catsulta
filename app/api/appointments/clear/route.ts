import { NextRequest, NextResponse } from "next/server";
import { clearDoctorAppointmentHistory, archiveSingleAppointment } from "@/lib/actions/appointment.actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // For clearing all doctor appointments
    if (body.action === "archive" && body.doctorName) {
      const preservePatientData = body.preservePatientData === true;
      const result = await clearDoctorAppointmentHistory(body.doctorName, preservePatientData);
      
      return NextResponse.json({ 
        message: "Successfully archived appointments",
        ...result
      });
    }
    
    // For archiving a single appointment
    if (body.action === "archiveSingle" && body.appointmentId) {
      const result = await archiveSingleAppointment(body.appointmentId);
      
      return NextResponse.json({
        success: true,
        message: "Successfully archived the appointment",
        data: result
      });
    }
    
    return NextResponse.json(
      { error: "Invalid request. Missing required parameters." }, 
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in appointment archive API route:", error);
    return NextResponse.json(
      { error: "Failed to archive appointment(s)" },
      { status: 500 }
    );
  }
} 
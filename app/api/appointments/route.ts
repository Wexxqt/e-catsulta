import { NextRequest, NextResponse } from "next/server";
import { getDoctorAppointments } from "@/lib/actions/appointment.actions";

export async function GET(request: NextRequest) {
  try {
    // Get the doctor name from query parameter
    const searchParams = request.nextUrl.searchParams;
    const doctorName = searchParams.get("doctor");

    if (!doctorName) {
      return NextResponse.json(
        { error: "Doctor name parameter is required" },
        { status: 400 }
      );
    }

    // Fetch appointments for this doctor
    const appointments = await getDoctorAppointments(doctorName);

    // Return the appointments
    return NextResponse.json({ documents: appointments });
  } catch (error) {
    console.error("Error in appointments API route:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
} 
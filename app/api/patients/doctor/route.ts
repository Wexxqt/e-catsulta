import { NextResponse } from "next/server";
import { databases, DATABASE_ID, APPOINTMENT_COLLECTION_ID } from "@/lib/appwrite.config";
import { Query } from "node-appwrite";

export async function GET(request: Request) {
  try {
    // Get the doctor name from the URL query parameter
    const url = new URL(request.url);
    const doctorName = url.searchParams.get('name');

    if (!doctorName) {
      return NextResponse.json(
        { error: "Doctor name is required" },
        { status: 400 }
      );
    }

    // Get ALL appointments for this doctor including archived ones
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.equal("primaryPhysician", doctorName)]
    );

    // Create a unique patients object
    const uniquePatients: { [patientId: string]: any } = {};
    
    appointments.documents.forEach((appointment: any) => {
      if (appointment.patient && appointment.patient.$id) {
        const patientId = appointment.patient.$id;
        
        // If we don't have this patient yet, or this appointment is more recent
        if (!uniquePatients[patientId] || 
            new Date(appointment.schedule) > new Date(uniquePatients[patientId].schedule)) {
          uniquePatients[patientId] = appointment;
        }
      }
    });

    return NextResponse.json({
      success: true,
      patients: uniquePatients,
      count: Object.keys(uniquePatients).length
    });

  } catch (error: any) {
    console.error("Error fetching patients:", {
      message: error.message,
      type: error.type,
      code: error.code
    });
    
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch patients",
        type: error.type,
        code: error.code 
      },
      { status: error.code || 500 }
    );
  }
} 
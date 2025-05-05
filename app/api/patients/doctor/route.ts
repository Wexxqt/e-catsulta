import { NextResponse } from "next/server";
import {
  databases,
  DATABASE_ID,
  APPOINTMENT_COLLECTION_ID,
  PATIENT_COLLECTION_ID,
} from "@/lib/appwrite.config";
import { Query } from "node-appwrite";

export async function GET(request: Request) {
  try {
    // Get the doctor name from the URL query parameter
    const url = new URL(request.url);
    const doctorName = url.searchParams.get("name");

    if (!doctorName) {
      return NextResponse.json(
        { error: "Doctor name is required" },
        { status: 400 }
      );
    }

    console.log(`API: Fetching appointments for doctor: ${doctorName}`);

    // Get ALL appointments for this doctor INCLUDING archived ones
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [
        Query.equal("primaryPhysician", doctorName),
        Query.limit(1000), // Increase limit to ensure we get all appointments
      ]
    );

    console.log(
      `API: Found ${appointments.total} appointments for doctor ${doctorName}`
    );

    // Create a unique patients object
    const uniquePatients: { [patientId: string]: any } = {};
    const patientIds = new Set<string>();

    appointments.documents.forEach((appointment: any) => {
      // Check if both patient exists and has an ID
      if (
        appointment.patient &&
        typeof appointment.patient === "object" &&
        appointment.patient.$id
      ) {
        const patientId = appointment.patient.$id;
        patientIds.add(patientId);

        // If we don't have this patient yet, or this appointment is more recent
        if (
          !uniquePatients[patientId] ||
          new Date(appointment.schedule) >
            new Date(uniquePatients[patientId].schedule)
        ) {
          uniquePatients[patientId] = appointment;
        }
      } else if (appointment.userId) {
        // Fallback to userId if patient object is missing
        const userId = appointment.userId;
        patientIds.add(userId);

        // Create a placeholder patient object
        if (!uniquePatients[userId]) {
          appointment.patient = {
            $id: userId,
            name: "Unknown Patient",
            email: "",
            phone: "",
          };
          uniquePatients[userId] = appointment;
        }
      }
    });

    console.log(`API: Extracted ${patientIds.size} unique patient IDs`);
    console.log(
      `API: Created ${Object.keys(uniquePatients).length} unique patient entries`
    );

    // Fetch direct patient data for all patient IDs we found
    // This ensures we have the patient data even if all appointments are archived
    if (patientIds.size > 0) {
      console.log(
        `API: Fetching direct patient data for ${patientIds.size} patients`
      );

      // Convert the Set to an Array before iterating to fix TypeScript error
      for (const patientId of Array.from(patientIds)) {
        try {
          // Check if we already have this patient in uniquePatients
          if (
            uniquePatients[patientId] &&
            uniquePatients[patientId].patient &&
            uniquePatients[patientId].patient.$id === patientId
          ) {
            // Already have this patient with good data, skip fetching
            continue;
          }

          // Try to find the patient by ID
          const patientResponse = await databases.listDocuments(
            DATABASE_ID!,
            PATIENT_COLLECTION_ID!,
            [Query.equal("$id", patientId)]
          );

          if (patientResponse.total > 0) {
            const patient = patientResponse.documents[0];
            // Create a mock appointment with the actual patient data
            uniquePatients[patientId] = {
              $id: `patient_${patientId}`,
              patient: patient,
              schedule: new Date().toISOString(),
              status: "historical",
              archived: false, // Important: mark this as not archived so it shows up
            };
          }
        } catch (err) {
          console.error(
            `API: Error fetching patient with ID ${patientId}:`,
            err
          );
        }
      }
    }

    // If we have no patients, try to fetch all patients who ever had an appointment with this doctor
    if (Object.keys(uniquePatients).length === 0) {
      console.log(
        "API: No patients found in appointments, trying to fetch patients directly"
      );

      try {
        // Get all patients who have had appointments with this doctor, including archived ones
        const patientAppointments = await databases.listDocuments(
          DATABASE_ID!,
          APPOINTMENT_COLLECTION_ID!,
          [Query.equal("primaryPhysician", doctorName), Query.limit(1000)]
        );

        console.log(
          `API: Found ${patientAppointments.total} appointment records`
        );

        // Extract unique patient IDs
        const userIds = new Set<string>();
        patientAppointments.documents.forEach((appointment: any) => {
          if (appointment.userId) {
            userIds.add(appointment.userId);
          }
        });

        console.log(`API: Found ${userIds.size} unique user IDs`);

        // For each userId, try to find the patient record
        for (const userId of Array.from(userIds)) {
          try {
            const patients = await databases.listDocuments(
              DATABASE_ID!,
              PATIENT_COLLECTION_ID!,
              [Query.equal("$id", userId)]
            );

            if (patients.total > 0) {
              const patient = patients.documents[0];
              // Create a mock appointment to match the expected format
              uniquePatients[userId] = {
                $id: `mock_${userId}`,
                patient: patient,
                schedule: new Date().toISOString(),
                status: "historical",
                archived: false, // Important: mark this as not archived
              };
            }
          } catch (err) {
            console.error(
              `API: Error fetching patient with ID ${userId}:`,
              err
            );
          }
        }

        console.log(
          `API: After direct fetch, have ${Object.keys(uniquePatients).length} patients`
        );
      } catch (err) {
        console.error("API: Error in direct patient fetch:", err);
      }
    }

    return NextResponse.json({
      success: true,
      patients: uniquePatients,
      count: Object.keys(uniquePatients).length,
    });
  } catch (error: any) {
    console.error("Error fetching patients:", {
      message: error.message,
      type: error.type,
      code: error.code,
    });

    return NextResponse.json(
      {
        error: error.message || "Failed to fetch patients",
        type: error.type,
        code: error.code,
      },
      { status: error.code || 500 }
    );
  }
}

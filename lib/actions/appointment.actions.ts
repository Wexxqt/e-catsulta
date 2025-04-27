"use server";

import { revalidatePath } from "next/cache";
import { ID, Query, Permission, Role } from "node-appwrite";

import { Appointment, DoctorSettings } from "@/types/appwrite.types";

import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  DOCTOR_SETTINGS_COLLECTION_ID,
  databases,
  messaging,
  PATIENT_COLLECTION_ID,
} from "../appwrite.config";
import {
  formatDateTime,
  parseStringify,
  generateAppointmentCode,
} from "../utils";
import { Doctors } from "@/constants";

/**
 * Validates and sanitizes appointment data to prevent errors from deleted patients
 */
const validateAppointmentData = (appointment: any): any => {
  try {
    // If the appointment doesn't exist, return null
    if (!appointment) return null;

    // Check if patient property exists and is an object
    if (!appointment.patient || typeof appointment.patient !== "object") {
      // Create a placeholder patient object to prevent errors
      appointment.patient = {
        name: "Deleted Patient",
        $id: appointment.userId || "unknown",
        email: null,
        phone: "N/A",
      };
    }

    return appointment;
  } catch (error) {
    console.error("Error validating appointment data:", error);
    return null;
  }
};

//  CREATE APPOINTMENT
export const createAppointment = async (
  appointment: CreateAppointmentParams
) => {
  try {
    // === AVAILABILITY CHECK START ===
    // Find the doctor by name
    const doctor = Doctors.find(
      (doc) => doc.name === appointment.primaryPhysician
    );

    // First check for availability in the database
    let doctorAvailability = await getDoctorAvailability(doctor?.id || "");

    // If not found in database, fallback to the default from Doctors constant
    if (!doctorAvailability && doctor) {
      doctorAvailability = doctor.availability;
    }

    // Validate that the doctor is available
    if (
      !doctorAvailability ||
      !doctorAvailability.days ||
      doctorAvailability.days.length === 0
    ) {
      throw new Error("Doctor is not available for appointments at this time.");
    }
    // === AVAILABILITY CHECK END ===

    // Generate appointment code
    const appointmentCode = generateAppointmentCode(
      ID.unique(),
      appointment.userId
    );

    const newAppointment = await databases.createDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      ID.unique(),
      {
        ...appointment,
        appointmentCode,
      }
    );

    revalidatePath("/admin");
    return parseStringify(newAppointment);
  } catch (error) {
    console.error("An error occurred while creating a new appointment:", error);
    throw error;
  }
};

//  GET RECENT APPOINTMENTS
export const getRecentAppointmentList = async () => {
  try {
    // Fetch appointments
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.orderDesc("$createdAt"), Query.limit(10)]
    );

    // Count appointments by status
    const [scheduledCount, pendingCount, cancelledCount] = await Promise.all([
      databases
        .listDocuments(DATABASE_ID!, APPOINTMENT_COLLECTION_ID!, [
          Query.equal("status", "scheduled"),
        ])
        .then((res) => res.total),

      databases
        .listDocuments(DATABASE_ID!, APPOINTMENT_COLLECTION_ID!, [
          Query.equal("status", "pending"),
        ])
        .then((res) => res.total),

      databases
        .listDocuments(DATABASE_ID!, APPOINTMENT_COLLECTION_ID!, [
          Query.equal("status", "cancelled"),
        ])
        .then((res) => res.total),
    ]);

    // Get today's date (start and end)
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    // Count today's appointments
    const todayAppointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [
        Query.greaterThanEqual("schedule", startOfDay),
        Query.lessThanEqual("schedule", endOfDay),
        Query.equal("status", "scheduled"),
      ]
    );
    const todayCount = todayAppointments.total;

    // Count patients by category
    const [studentCount, employeeCount] = await Promise.all([
      databases
        .listDocuments(DATABASE_ID!, PATIENT_COLLECTION_ID!, [
          Query.equal("category", "Student"),
        ])
        .then((res) => res.total),

      databases
        .listDocuments(DATABASE_ID!, PATIENT_COLLECTION_ID!, [
          Query.equal("category", "Employee"),
        ])
        .then((res) => res.total),
    ]);

    return {
      scheduledCount,
      pendingCount,
      cancelledCount,
      todayCount,
      studentCount,
      employeeCount,
      totalCount: appointments.total,
      documents: appointments.documents,
    };
  } catch (error) {
    console.error("Error fetching appointments:", error);
    throw error;
  }
};

//  SEND SMS NOTIFICATION
export const sendSMSNotification = async (userId: string, content: string) => {
  try {
    // https://appwrite.io/docs/references/1.5.x/server-nodejs/messaging#createSms
    const message = await messaging.createSms(
      ID.unique(),
      content,
      [],
      [userId]
    );
    return parseStringify(message);
  } catch (error) {
    console.error("An error occurred while sending sms:", error);
  }
};

//  UPDATE APPOINTMENT
export const updateAppointment = async ({
  appointmentId,
  userId,
  timeZone,
  appointment,
  type,
}: UpdateAppointmentParams) => {
  try {
    // Update appointment to scheduled -> https://appwrite.io/docs/references/cloud/server-nodejs/databases#updateDocument
    const updatedAppointment = await databases.updateDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId,
      appointment
    );

    if (!updatedAppointment) throw Error;

    const smsMessage = `E-CatSulta. ${
      type === "schedule"
        ? `Your appointment is on ${formatDateTime(appointment.schedule!, timeZone).dateTime}. See you!`
        : `We regret to inform that your appointment for ${formatDateTime(appointment.schedule!, timeZone).dateTime} is cancelled. Reason:  ${appointment.cancellationReason}`
    }.`;
    await sendSMSNotification(userId, smsMessage);

    revalidatePath("/admin");
    return parseStringify(updatedAppointment);
  } catch (error) {
    console.error("An error occurred while scheduling an appointment:", error);
  }
};

// GET APPOINTMENT
export const getAppointment = async (appointmentId: string) => {
  try {
    const appointment = await databases.getDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId
    );

    // If appointment doesn't have a code, generate one and save it to database
    const typedAppointment = appointment as any;
    if (!typedAppointment.appointmentCode) {
      const newCode = generateAppointmentCode(
        appointmentId,
        typedAppointment.userId || ""
      );
      typedAppointment.appointmentCode = newCode;

      // Save the generated code to the database
      await databases.updateDocument(
        DATABASE_ID!,
        APPOINTMENT_COLLECTION_ID!,
        appointmentId,
        { appointmentCode: newCode }
      );
    }

    return parseStringify(validateAppointmentData(typedAppointment));
  } catch (error) {
    console.error(
      "An error occurred while retrieving the existing patient:",
      error
    );
    return null;
  }
};

// GET APPOINTMENT BY CODE
export const getAppointmentByCode = async (code: string) => {
  try {
    // Check if code is a valid appointment ID first (direct lookup)
    try {
      const directAppointment = await databases.getDocument(
        DATABASE_ID!,
        APPOINTMENT_COLLECTION_ID!,
        code
      );

      if (directAppointment) {
        return parseStringify(validateAppointmentData(directAppointment));
      }
    } catch (directError) {
      // Not a direct ID, continue to search by code
      console.log("Not a direct appointment ID, searching by code...");
    }

    // Search for appointment with matching code
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.equal("appointmentCode", code)]
    );

    if (appointments.total === 0) {
      console.log("No appointment found with code:", code);
      return null;
    }

    // Get the first matching appointment
    const appointment = appointments.documents[0];
    return parseStringify(validateAppointmentData(appointment));
  } catch (error) {
    console.error("Error finding appointment by code:", error);
    return null;
  }
};

// GET DOCTOR APPOINTMENTS
export const getDoctorAppointments = async (doctorName: string) => {
  try {
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [
        Query.equal("primaryPhysician", doctorName),
        Query.equal("status", ["scheduled", "completed", "cancelled"]),
      ]
    );

    // Filter out archived appointments AND sanitize the data
    const filteredDocuments = appointments.documents
      .filter((doc: any) => !doc.archived)
      .map((doc: any) => validateAppointmentData(doc))
      .filter((doc) => doc !== null); // Remove any null results

    return parseStringify(filteredDocuments);
  } catch (error) {
    console.error(
      "An error occurred while retrieving doctor appointments:",
      error
    );
    return [];
  }
};

// GET PATIENT APPOINTMENTS
export const getPatientAppointments = async (patientId: string) => {
  try {
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.equal("userId", patientId), Query.orderDesc("schedule")]
    );

    // Filter out archived appointments AND sanitize the data
    const validatedAppointments = appointments.documents
      .filter((doc: any) => !doc.archived) // Exclude archived appointments
      .map((doc: any) => validateAppointmentData(doc))
      .filter((doc) => doc !== null); // Remove any null results

    return parseStringify(validatedAppointments);
  } catch (error) {
    console.error(
      "An error occurred while retrieving patient appointments:",
      error
    );
    return [];
  }
};

// CLEAR PATIENT APPOINTMENT HISTORY
export const clearPatientAppointmentHistory = async (patientId: string) => {
  try {
    // First, get all appointments for this patient
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.equal("userId", patientId)]
    );

    // Instead of deleting, mark each appointment as archived
    const updatePromises = appointments.documents.map((appointment) =>
      databases.updateDocument(
        DATABASE_ID!,
        APPOINTMENT_COLLECTION_ID!,
        appointment.$id,
        {
          archived: true, // This hides from patient view but preserves the record
        }
      )
    );

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    // Revalidate the patient dashboard path
    revalidatePath(`/patients/${patientId}/dashboard`);

    return { success: true, count: appointments.documents.length };
  } catch (error) {
    console.error("Error clearing patient appointment history:", error);
    return { success: false, error: String(error) };
  }
};

// CLEAR DOCTOR APPOINTMENT HISTORY
export const clearDoctorAppointmentHistory = async (
  doctorName: string,
  preservePatientData: boolean = false
) => {
  try {
    // Get all appointments for this doctor
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.equal("primaryPhysician", doctorName)]
    );

    // Keep track of unique patients if preservePatientData is true
    const uniquePatientIds = new Set<string>();

    if (preservePatientData) {
      appointments.documents.forEach((doc: any) => {
        if (doc.userId) {
          uniquePatientIds.add(doc.userId);
        }
      });
    }

    // For each appointment, update it to mark as "archived" only
    // This is better than deletion as it keeps records but hides them from the doctor view
    const updatePromises = appointments.documents.map((appointment) =>
      databases.updateDocument(
        DATABASE_ID!,
        APPOINTMENT_COLLECTION_ID!,
        appointment.$id,
        {
          archived: true,
          // We can't add fields that don't exist in the database schema
        }
      )
    );

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    // Revalidate the doctor dashboard path
    revalidatePath(`/doctor`);

    return {
      success: true,
      count: appointments.documents.length,
      preservedPatientCount: uniquePatientIds.size,
    };
  } catch (error) {
    console.error("Error clearing doctor appointment history:", error);
    return { success: false, error: String(error) };
  }
};

// Add this new function for chart data
export const getAppointmentChartData = async (timeRange = 7) => {
  try {
    // Calculate the start date based on timeRange (7 or 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);

    // Format dates for query
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Fetch appointments within date range
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [
        Query.greaterThanEqual("schedule", startISO),
        Query.lessThanEqual("schedule", endISO),
        Query.limit(1000), // Increase limit to get all data
      ]
    );

    // Process the data for chart
    interface CountMap {
      [key: string]: number;
    }

    const medicalCounts: CountMap = {}; // Track medical appointments by date
    const dentalCounts: CountMap = {}; // Track dental appointments by date
    const dateLabels: string[] = []; // Store all unique dates

    // Generate all dates in the range for consistent data
    for (let i = 0; i < timeRange; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
      dateLabels.push(dateStr);
      medicalCounts[dateStr] = 0;
      dentalCounts[dateStr] = 0;
    }

    // Count appointments by date and category
    appointments.documents.forEach((appointment: any) => {
      // Extract the date part only (YYYY-MM-DD)
      const appointmentDate = new Date(appointment.schedule)
        .toISOString()
        .split("T")[0];

      // Skip if not in our date range
      if (!dateLabels.includes(appointmentDate)) return;

      // Check appointment category (medical or dental)
      if (
        appointment.primaryPhysician &&
        appointment.primaryPhysician.includes("Abundo")
      ) {
        // Dr. Abundo is Medical
        medicalCounts[appointmentDate] =
          (medicalCounts[appointmentDate] || 0) + 1;
      } else if (
        appointment.primaryPhysician &&
        appointment.primaryPhysician.includes("De Castro")
      ) {
        // Dr. De Castro is Dental
        dentalCounts[appointmentDate] =
          (dentalCounts[appointmentDate] || 0) + 1;
      }
    });

    // Format data for chart
    interface ChartDataPoint {
      date: string;
      Medical: number;
      Dental: number;
      Total: number;
    }

    const chartData: ChartDataPoint[] = dateLabels.map((date) => ({
      date,
      Medical: medicalCounts[date] || 0,
      Dental: dentalCounts[date] || 0,
      Total: (medicalCounts[date] || 0) + (dentalCounts[date] || 0),
    }));

    return {
      chartData,
      totalMedical: Object.values(medicalCounts).reduce(
        (sum: number, count: number) => sum + count,
        0
      ),
      totalDental: Object.values(dentalCounts).reduce(
        (sum: number, count: number) => sum + count,
        0
      ),
    };
  } catch (error) {
    console.error("Error fetching appointment chart data:", error);
    throw error;
  }
};

// Get All Appointments for Admin
export const getAllAppointments = async ({
  searchQuery = "",
  status = "",
  doctor = "",
  startDate = "",
  endDate = "",
  sortField = "schedule",
  sortOrder = "desc",
  limit = 50,
  page = 1,
}: {
  searchQuery?: string;
  status?: string;
  doctor?: string;
  startDate?: string;
  endDate?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  page?: number;
}) => {
  try {
    const queries: any[] = [];

    // Add status filter if specified
    if (status) {
      queries.push(Query.equal("status", status));
    }

    // Add doctor filter if specified
    if (doctor) {
      queries.push(Query.equal("primaryPhysician", doctor));
    }

    // Add date range filter if specified
    if (startDate) {
      queries.push(Query.greaterThanEqual("schedule", startDate));
    }
    if (endDate) {
      queries.push(Query.lessThanEqual("schedule", endDate));
    }

    // Add search query if specified
    if (searchQuery && searchQuery.trim() !== "") {
      // Note: For Appwrite, ideally we'd search in the patient name,
      // but since that's within a nested object, we're limited.
      // This would be better handled by a custom API or advanced search.
      queries.push(Query.search("note", searchQuery));
    }

    // Add sorting (default to sorting by schedule date)
    if (sortField && sortOrder) {
      if (sortField === "schedule" || sortField === "$createdAt") {
        queries.push(
          sortOrder === "asc"
            ? Query.orderAsc(sortField)
            : Query.orderDesc(sortField)
        );
      }
    }

    // Add pagination
    const offset = (page - 1) * limit;
    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));

    console.log("Appointment queries:", JSON.stringify(queries));

    // Fetch appointments from the database
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      queries
    );

    // Validate appointment data to handle deleted patients
    const validatedAppointments = appointments.documents
      .map((doc: any) => validateAppointmentData(doc))
      .filter((doc) => doc !== null);

    // Count total appointments for pagination (without pagination limit)
    let totalCount = appointments.total;

    return {
      appointments: validatedAppointments,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return {
      appointments: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: page,
    };
  }
};

// GET DOCTOR ARCHIVED APPOINTMENTS
export const getArchivedDoctorAppointments = async (doctorName: string) => {
  try {
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [
        Query.equal("primaryPhysician", doctorName),
        Query.equal("archived", true),
        Query.orderDesc("$updatedAt"),
      ]
    );

    // Sanitize the data
    const validatedAppointments = appointments.documents
      .map((doc: any) => validateAppointmentData(doc))
      .filter((doc) => doc !== null); // Remove any null results

    return parseStringify(validatedAppointments);
  } catch (error) {
    console.error(
      "An error occurred while retrieving archived doctor appointments:",
      error
    );
    return [];
  }
};

// ARCHIVE SINGLE APPOINTMENT
export const archiveSingleAppointment = async (appointmentId: string) => {
  try {
    if (!appointmentId) {
      throw new Error("Missing required parameter: appointmentId");
    }

    // Update the appointment to mark it as archived
    const updatedAppointment = await databases.updateDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId,
      {
        archived: true,
      }
    );

    console.log("Appointment archived successfully:", appointmentId);
    return parseStringify(updatedAppointment);
  } catch (error) {
    console.error("Error archiving appointment:", error);
    throw error;
  }
};

// Add this function
export const ensureDoctorSettingsCollection = async () => {
  try {
    // Try to list documents from the collection to see if it exists
    await databases.listDocuments(DATABASE_ID!, DOCTOR_SETTINGS_COLLECTION_ID!);
    console.log("Doctor settings collection exists");
    return true;
  } catch (error: any) {
    // If the error is "Collection not found", create it
    if (error?.code === 404) {
      try {
        console.log("Creating doctor settings collection");
        await databases.createCollection(
          DATABASE_ID!,
          DOCTOR_SETTINGS_COLLECTION_ID!,
          "Doctor Settings",
          [Permission.read(Role.any()), Permission.write(Role.any())]
        );

        // Create attributes
        await databases.createStringAttribute(
          DATABASE_ID!,
          DOCTOR_SETTINGS_COLLECTION_ID!,
          "doctorId",
          36,
          true
        );

        await databases.createStringAttribute(
          DATABASE_ID!,
          DOCTOR_SETTINGS_COLLECTION_ID!,
          "availability",
          10000,
          true
        );

        await databases.createStringAttribute(
          DATABASE_ID!,
          DOCTOR_SETTINGS_COLLECTION_ID!,
          "createdAt",
          30,
          true
        );

        await databases.createStringAttribute(
          DATABASE_ID!,
          DOCTOR_SETTINGS_COLLECTION_ID!,
          "updatedAt",
          30,
          true
        );

        // Create index for doctorId
        await databases.createIndex(
          DATABASE_ID!,
          DOCTOR_SETTINGS_COLLECTION_ID!,
          "doctorId_idx",
          "key",
          ["doctorId"],
          true
        );

        console.log("Doctor settings collection created successfully");
        return true;
      } catch (createError) {
        console.error(
          "Error creating doctor settings collection:",
          createError
        );
        return false;
      }
    } else {
      console.error("Error checking doctor settings collection:", error);
      return false;
    }
  }
};

// Function to save doctor availability to database
export const saveDoctorAvailability = async (
  doctorIdOrName: string,
  availability: any
) => {
  try {
    console.log(`Saving availability for doctor: ${doctorIdOrName}`);

    // Handle when doctorIdOrName is not provided
    if (!doctorIdOrName) {
      console.error("No doctor ID or name provided");
      return { success: false, error: "No doctor ID provided" };
    }

    // Lookup to standardize the doctor ID
    let standardDoctorId = doctorIdOrName;

    // Check if doctorIdOrName is actually a doctor name
    if (doctorIdOrName.includes(" ")) {
      // This is likely a doctor name, not an ID
      // Import Doctors without causing circular dependencies
      const { Doctors } = await import("@/constants");
      const doctorByName = Doctors.find((doc) => doc.name === doctorIdOrName);

      if (doctorByName) {
        console.log(
          `Found doctor by name: ${doctorIdOrName} -> ID: ${doctorByName.id}`
        );
        standardDoctorId = doctorByName.id;
      } else {
        console.log(`Doctor not found with name: ${doctorIdOrName}`);
      }
    }

    // First, ensure the collection exists
    await ensureDoctorSettingsCollection();

    // Use the collection ID from appwrite.config.ts
    console.log(`Using collection ID: ${DOCTOR_SETTINGS_COLLECTION_ID}`);

    // Check if settings already exist for this doctor
    console.log(
      `Checking for existing settings in database: ${DATABASE_ID}, collection: ${DOCTOR_SETTINGS_COLLECTION_ID}, doctorId: ${standardDoctorId}`
    );
    const existingSettings = await databases.listDocuments(
      DATABASE_ID!,
      DOCTOR_SETTINGS_COLLECTION_ID!,
      [Query.equal("doctorId", standardDoctorId)]
    );

    console.log(`Found ${existingSettings.total} existing settings documents`);

    if (existingSettings.total > 0) {
      // Update existing settings
      console.log(
        `Updating existing settings document: ${existingSettings.documents[0].$id}`
      );
      await databases.updateDocument(
        DATABASE_ID!,
        DOCTOR_SETTINGS_COLLECTION_ID!,
        existingSettings.documents[0].$id,
        {
          availability: JSON.stringify(availability),
          updatedAt: new Date().toISOString(),
        }
      );
      console.log(`Successfully updated settings document`);
    } else {
      // Create new settings document
      console.log(
        `Creating new settings document for doctorId: ${standardDoctorId}`
      );
      const newDoc = await databases.createDocument(
        DATABASE_ID!,
        DOCTOR_SETTINGS_COLLECTION_ID!,
        ID.unique(),
        {
          doctorId: standardDoctorId,
          availability: JSON.stringify(availability),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      );
      console.log(`Successfully created new settings document: ${newDoc.$id}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving doctor availability:", error);
    console.error("Full error details:", JSON.stringify(error));
    return { success: false, error: String(error) };
  }
};

// New function to get doctor availability from database
export const getDoctorAvailability = async (doctorIdOrName: string) => {
  try {
    console.log(`Getting availability for doctor: ${doctorIdOrName}`);

    // Handle when doctorIdOrName is not provided
    if (!doctorIdOrName) {
      console.log("No doctor ID or name provided");
      return null;
    }

    // Lookup to standardize the doctor ID
    let standardDoctorId = doctorIdOrName;

    // Check if doctorIdOrName is actually a doctor name
    if (doctorIdOrName.includes(" ")) {
      // This is likely a doctor name, not an ID
      // Import Doctors without causing circular dependencies
      const { Doctors } = await import("@/constants");
      const doctorByName = Doctors.find((doc) => doc.name === doctorIdOrName);

      if (doctorByName) {
        console.log(
          `Found doctor by name: ${doctorIdOrName} -> ID: ${doctorByName.id}`
        );
        standardDoctorId = doctorByName.id;
      } else {
        console.log(`Doctor not found with name: ${doctorIdOrName}`);
      }
    }

    // Use the collection ID from appwrite.config.ts
    console.log(`Using collection ID: ${DOCTOR_SETTINGS_COLLECTION_ID}`);

    // Query for doctor settings
    console.log(
      `Querying database: ${DATABASE_ID}, collection: ${DOCTOR_SETTINGS_COLLECTION_ID}, doctorId: ${standardDoctorId}`
    );
    const settings = await databases.listDocuments(
      DATABASE_ID!,
      DOCTOR_SETTINGS_COLLECTION_ID!,
      [Query.equal("doctorId", standardDoctorId)]
    );

    console.log(`Query results: found ${settings.total} settings documents`);

    if (settings.total > 0) {
      // Parse stored JSON availability
      const document = settings.documents[0] as DoctorSettings;
      console.log(
        `Found availability in database: ${document.availability.substring(0, 50)}...`
      );
      return JSON.parse(document.availability);
    }

    console.log(
      `No availability found in database for doctorId: ${standardDoctorId}`
    );
    // Return null if no settings found
    return null;
  } catch (error) {
    console.error("Error getting doctor availability:", error);
    return null;
  }
};

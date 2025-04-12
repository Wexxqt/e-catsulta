"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";

import { Appointment } from "@/types/appwrite.types";

import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  databases,
  messaging,
} from "../appwrite.config";
import { formatDateTime, parseStringify } from "../utils";

//  CREATE APPOINTMENT
export const createAppointment = async (
  appointment: CreateAppointmentParams
) => {
  try {
    const newAppointment = await databases.createDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      ID.unique(),
      appointment
    );

    revalidatePath("/admin");
    return parseStringify(newAppointment);
  } catch (error) {
    console.error("An error occurred while creating a new appointment:", error);
  }
};

//  GET RECENT APPOINTMENTS
export const getRecentAppointmentList = async () => {
  try {
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.orderDesc("$createdAt")]
    );

    // const scheduledAppointments = (
    //   appointments.documents as Appointment[]
    // ).filter((appointment) => appointment.status === "scheduled");

    // const pendingAppointments = (
    //   appointments.documents as Appointment[]
    // ).filter((appointment) => appointment.status === "pending");

    // const cancelledAppointments = (
    //   appointments.documents as Appointment[]
    // ).filter((appointment) => appointment.status === "cancelled");

    // const data = {
    //   totalCount: appointments.total,
    //   scheduledCount: scheduledAppointments.length,
    //   pendingCount: pendingAppointments.length,
    //   cancelledCount: cancelledAppointments.length,
    //   documents: appointments.documents,
    // };

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (appointments.documents as Appointment[]).reduce(
      (acc, appointment) => {
        switch (appointment.status) {
          case "scheduled":
            acc.scheduledCount++;
            break;
          case "pending":
            acc.pendingCount++;
            break;
          case "cancelled":
            acc.cancelledCount++;
            break;
        }
        return acc;
      },
      initialCounts
    );

    const data = {
      totalCount: appointments.total,
      ...counts,
      documents: appointments.documents,
    };

    return parseStringify(data);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the recent appointments:",
      error
    );
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

    const smsMessage = `E-CatSulta. ${type === "schedule" 
      ? `Your appointment is on ${formatDateTime(appointment.schedule!, timeZone).dateTime}. See you!`
      : `We regret to inform that your appointment for ${formatDateTime(appointment.schedule!, timeZone).dateTime} is cancelled. Reason:  ${appointment.cancellationReason}`}.`;
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

    return parseStringify(appointment);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the existing patient:",
      error
    );
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
        Query.equal("status", "scheduled")
      ]
    );

    return parseStringify(appointments.documents);
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
      [
        Query.equal("userId", patientId),
        Query.orderDesc("schedule")
      ]
    );

    return parseStringify(appointments.documents);
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

    // Delete each appointment
    const deletePromises = appointments.documents.map(appointment => 
      databases.deleteDocument(
        DATABASE_ID!,
        APPOINTMENT_COLLECTION_ID!,
        appointment.$id
      )
    );

    // Wait for all deletions to complete
    await Promise.all(deletePromises);
    
    // Revalidate the patient dashboard path
    revalidatePath(`/patients/${patientId}/dashboard`);
    
    return { success: true, count: appointments.documents.length };
  } catch (error) {
    console.error("Error clearing patient appointment history:", error);
    return { success: false, error: String(error) };
  }
};
"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

import { formatDateTime } from "@/lib/utils";
import { Appointment } from "@/types/appwrite.types";

import { AppointmentModal } from "../AppointmentModal";
import { StatusBadge } from "../StatusBadge";

export const columns: ColumnDef<Appointment>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "patient",
    header: "Patient",
    cell: ({ row }) => {
      const appointment = row.original;
      return <p className="text-14-medium">{appointment.patient.name}</p>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <div className="min-w-[115px]">
          <StatusBadge status={appointment.status} />
        </div>
      );
    },
  },
  {
    accessorKey: "schedule",
    header: "Appointment Date",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <p className="text-14-regular min-w-[100px]">
          {formatDateTime(appointment.schedule).dateTime}
        </p>
      );
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <p className="text-14-regular max-w-[200px] truncate" title={appointment.reason}>
          {appointment.reason}
        </p>
      );
    },
  },
  {
    accessorKey: "patientDetails",
    header: "Patient Details",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <div className="space-y-1">
          <p className="text-14-medium">Phone: {appointment.patient.phone}</p>
          <p className="text-14-regular text-gray-600">Email: {appointment.patient.email}</p>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="pl-4">Actions</div>,
    cell: ({ row }) => {
      const appointment = row.original;

      return (
        <div className="flex gap-1">
          <PatientDetailModal patient={appointment.patient} />
          <AppointmentModal
            patientId={appointment.patient.$id}
            userId={appointment.userId}
            appointment={appointment}
            type="schedule"
            title="Update Appointment"
            description="Update appointment details or add notes."
          />
          {appointment.status !== "cancelled" && (
            <AppointmentModal
              patientId={appointment.patient.$id}
              userId={appointment.userId}
              appointment={appointment}
              type="cancel"
              title="Cancel Appointment"
              description="Are you sure you want to cancel this appointment?"
            />
          )}
        </div>
      );
    },
  },
];

// Updated modal component with student number
const PatientDetailModal = ({ patient }: { patient: any }) => {
  return (
    <div className="inline-flex">
      <button
        className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
        onClick={() => {
          // Get student ID from identificationNumber if category is Student
          const studentNumber = patient.category === "Student" ? 
            `Student Number: ${patient.identificationNumber || 'Not provided'}` : 
            '';
          
          alert(`
            Patient: ${patient.name}
            ${studentNumber}
            Gender: ${patient.gender || 'Not specified'}
            Birth Date: ${patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : 'Not specified'}
            Category: ${patient.category || 'Not specified'}
            Signs/Symptoms: ${patient.signsSymptoms || 'None reported'}
            Allergies: ${patient.allergies || 'None reported'}
            Current Medication: ${patient.currentMedication || 'None reported'}
            Family Medical History: ${patient.familyMedicalHistory || 'None reported'}
            Past Medical History: ${patient.pastMedicalHistory || 'None reported'}
          `);
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </button>
    </div>
  );
};
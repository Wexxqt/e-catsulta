"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { useState } from "react";
import { Clipboard, Check } from "lucide-react";

import { Doctors } from "@/constants";
import { formatDateTime, getGravatarUrl } from "@/lib/utils";
import { Appointment } from "@/types/appwrite.types";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "../StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Helper function to safely handle potentially deleted patient data
const safePatientAccess = (appointment: Appointment) => {
  try {
    // First verify the patient object exists
    if (!appointment.patient || typeof appointment.patient !== "object") {
      return {
        name: "Deleted Patient",
        email: null,
        $id: appointment.userId || "unknown",
      };
    }

    // Return the patient data
    return appointment.patient;
  } catch (error) {
    console.error("Error accessing patient data:", error);
    return {
      name: "Deleted Patient",
      email: null,
      $id: appointment.userId || "unknown",
    };
  }
};

// Function to generate appointment code
const generateAppointmentCode = (appointment: Appointment) => {
  if (appointment.appointmentCode) {
    return appointment.appointmentCode;
  }

  try {
    // Import actual implementation from utils
    const { generateAppointmentCode } = require("@/lib/utils");

    // Use the actual implementation from utils
    const patientId =
      appointment.patient?.$id || appointment.userId || "UNKNOWN";
    const appointmentId = appointment.$id || "UNKNOWN";

    return generateAppointmentCode(appointmentId, patientId);
  } catch (error) {
    // Fallback to a basic format
    return `TEMP-${appointment.$id?.substring(0, 6) || "UNKNOWN"}`;
  }
};

// Appointment Code Modal Component
const AppointmentCodeModal = ({
  appointment,
}: {
  appointment: Appointment;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = generateAppointmentCode(appointment);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center bg-blue-500/15 hover:bg-blue-500/30 text-blue-500 rounded-md px-2.5 py-1.5 transition-colors"
        title="View Appointment Code"
      >
        <Clipboard size={18} className="mr-1.5" />
        <span className="text-xs font-medium">Code</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Appointment Code</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="text-2xl font-bold text-blue-500">{code}</div>
              <p className="text-sm text-gray-400 text-center">
                This is a unique code for this appointment. Patient can use this
                code for check-in.
              </p>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Clipboard size={16} />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

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
      const patient = safePatientAccess(appointment);

      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={
                patient.email
                  ? getGravatarUrl(patient.email, 40)
                  : getGravatarUrl(
                      "",
                      40,
                      "robohash",
                      patient.$id || patient.userId
                    )
              }
              alt={patient.name || "Patient"}
            />
            <AvatarFallback className="bg-gradient-to-br from-dark-300 to-dark-400 text-xs">
              {patient.name ? patient.name.substring(0, 2).toUpperCase() : "PT"}
            </AvatarFallback>
          </Avatar>
          <p className="text-14-medium">{patient.name}</p>
        </div>
      );
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
    header: "Appointment",
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
    accessorKey: "primaryPhysician",
    header: "Doctor",
    cell: ({ row }) => {
      const appointment = row.original;

      const doctor = Doctors.find(
        (doctor) => doctor.name === appointment.primaryPhysician
      );

      return (
        <div className="flex items-center gap-3">
          <Image
            src={doctor?.image || "/assets/images/default-doctor.png"}
            alt="doctor"
            width={100}
            height={100}
            className="size-8"
          />
          <p className="whitespace-nowrap">Dr. {doctor?.name}</p>
        </div>
      );
    },
  },
  {
    accessorKey: "appointmentCode",
    header: "Code",
    cell: ({ row }) => {
      const appointment = row.original;
      return <AppointmentCodeModal appointment={appointment} />;
    },
  },
];

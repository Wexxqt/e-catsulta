"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Doctors } from "@/constants";
import { formatDateTime, getGravatarUrl } from "@/lib/utils";
import Image from "next/image";
import { Appointment } from "@/types/appwrite.types";

import { AppointmentModal } from "../AppointmentModal";
import { StatusBadge } from "../StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const columns: ColumnDef<Appointment>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium ">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "patient",
    header: "Patient",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={appointment.patient?.email ? getGravatarUrl(appointment.patient.email, 40) : undefined} 
              alt={appointment.patient?.name || 'Patient'} 
            />
            <AvatarFallback className="bg-gradient-to-br from-dark-300 to-dark-400 text-xs">
              {appointment.patient?.name ? appointment.patient.name.substring(0, 2).toUpperCase() : 'PT'}
            </AvatarFallback>
          </Avatar>
          <p className="text-14-medium">{appointment.patient?.name || 'Deleted Patient'}</p>
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
    id: "actions",
    header: () => <div className="pl-4">Actions</div>,
    cell: ({ row }) => {
      const appointment = row.original;

      return (
        <div className="flex gap-1">
          {appointment.status !== "cancelled" && (
            <AppointmentModal
              patientId={appointment.patient?.$id || ''}
              userId={appointment.userId}
              appointment={appointment}
              type="cancel"
              title="Cancel Appointment"
              description="Are you sure you want to cancel your appointment?"
            />
          )}
        </div>
      );
    },
  },
];

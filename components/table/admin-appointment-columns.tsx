"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { useState } from "react";
import {
  Calendar,
  Clipboard,
  Check,
  X,
  MoreHorizontal,
  CalendarClock,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  UserRound,
} from "lucide-react";

import { Doctors } from "@/constants";
import { formatDateTime, getGravatarUrl } from "@/lib/utils";
import { Appointment } from "@/types/appwrite.types";
import { updateAppointment } from "@/lib/actions/appointment.actions";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "../StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenuItem,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

// Appointment Code Modal
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
        className="flex items-center justify-center bg-blue-100 dark:bg-blue-500/15 hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-500 rounded-md px-2.5 py-1.5 transition-colors"
        title="View Appointment Code"
      >
        <Clipboard size={18} className="mr-1.5" />
        <span className="text-xs font-medium">Code</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-dark-400 text-gray-900 dark:text-white border-gray-200 dark:border-dark-500">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Appointment Code
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-500">
                {code}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                This is a unique code for this appointment. Patient can use this
                code for check-in.
              </p>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="flex items-center gap-2 bg-white dark:bg-dark-300 text-gray-900 dark:text-white border-gray-200 dark:border-dark-500"
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

// Cancel Appointment Modal
const CancelAppointmentModal = ({
  appointment,
  onCancel,
  open,
  onOpenChange,
}: {
  appointment: Appointment;
  onCancel: (reason: string) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await onCancel(reason);
      setReason(""); // Reset the reason after successful cancel
    } catch (error) {
      console.error("Error cancelling appointment:", error);
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white dark:bg-dark-400 text-gray-900 dark:text-white border-gray-200 dark:border-dark-500">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900 dark:text-white">
            Cancel Appointment
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
            This action cannot be undone. The patient will be notified about
            this cancellation.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <label className="text-sm text-gray-500 dark:text-gray-400 mb-2 block">
            Cancellation Reason:
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a reason for cancellation..."
            className="w-full bg-white dark:bg-dark-300 text-gray-900 dark:text-white border-gray-200 dark:border-dark-500"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isLoading}
            className="hover:bg-gray-100 dark:hover:bg-dark-400 text-gray-900 dark:text-white border border-gray-200 dark:border-dark-500"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleCancel();
            }}
            disabled={isLoading || !reason.trim()}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {isLoading ? "Processing..." : "Confirm Cancellation"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Reschedule Modal
const RescheduleModal = ({
  appointment,
  open,
  onOpenChange,
  onReschedule,
}: {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReschedule: (newDate: Date) => Promise<void>;
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    appointment.schedule ? new Date(appointment.schedule) : undefined
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleReschedule = async () => {
    if (!selectedDate) return;

    setIsLoading(true);
    try {
      await onReschedule(selectedDate);
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  // Determine if this is a reactivation or regular reschedule
  const isReactivation = appointment.status === "cancelled";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-dark-400 text-gray-900 dark:text-white border-gray-200 dark:border-dark-500">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            {isReactivation
              ? "Reactivate Appointment"
              : "Reschedule Appointment"}
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            {isReactivation
              ? "Select a new date and time to reactivate this cancelled appointment."
              : "Select a new date and time for this appointment."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm mb-4 text-gray-600 dark:text-gray-300">
            {isReactivation
              ? `Previously cancelled appointment was on: ${formatDateTime(appointment.schedule, "Asia/Manila").dateTime}`
              : `Current appointment: ${formatDateTime(appointment.schedule, "Asia/Manila").dateTime}`}
          </p>

          <div className="space-y-4">
            <div className="grid w-full gap-1.5">
              <label htmlFor="date" className="text-sm text-gray-400">
                {isReactivation
                  ? "New Appointment Date and Time"
                  : "New Appointment Date and Time"}
              </label>
              <input
                type="datetime-local"
                id="date"
                className="flex h-10 w-full rounded-md border border-dark-500 bg-dark-400 px-3 py-2 text-sm text-white"
                value={
                  selectedDate ? selectedDate.toISOString().slice(0, 16) : ""
                }
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDate(new Date(e.target.value));
                  }
                }}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="bg-white dark:bg-dark-300 text-gray-900 dark:text-white border-gray-200 dark:border-dark-500"
          >
            Cancel
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={isLoading || !selectedDate}
            className="bg-blue-500 text-white hover:bg-blue-600"
          >
            {isLoading
              ? "Processing..."
              : isReactivation
                ? "Reactivate"
                : "Reschedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Change Doctor Modal
const ChangeDoctorModal = ({
  appointment,
  open,
  onOpenChange,
  onChangeDoctor,
}: {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangeDoctor: (doctorName: string) => Promise<void>;
}) => {
  const [selectedDoctor, setSelectedDoctor] = useState<string>(
    appointment.primaryPhysician
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleChangeDoctor = async () => {
    if (!selectedDoctor || selectedDoctor === appointment.primaryPhysician)
      return;

    setIsLoading(true);
    try {
      await onChangeDoctor(selectedDoctor);
    } catch (error) {
      console.error("Error changing doctor:", error);
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-dark-400 text-gray-900 dark:text-white border-gray-200 dark:border-dark-500">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            Change Doctor
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            Assign this appointment to a different doctor.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm mb-4 text-gray-600 dark:text-gray-300">
            Current doctor: {appointment.primaryPhysician || "Not assigned"}
          </p>

          <div className="space-y-4">
            <div className="grid w-full gap-1.5">
              <label className="text-sm text-gray-400">New Doctor</label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a doctor" />
                </SelectTrigger>
                <SelectContent>
                  {Doctors.map((doctor) => (
                    <SelectItem
                      key={doctor.id}
                      value={doctor.name}
                      disabled={doctor.name === appointment.primaryPhysician}
                    >
                      Dr. {doctor.name.split(" ")[0]} (
                      {doctor.displayName.includes("Medical")
                        ? "Medical"
                        : "Dental"}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleChangeDoctor}
            disabled={
              isLoading ||
              !selectedDoctor ||
              selectedDoctor === appointment.primaryPhysician
            }
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? "Processing..." : "Change Doctor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Appointment Reason Modal
const AppointmentReasonModal = ({
  appointment,
}: {
  appointment: Appointment;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const reason = appointment.reason || "No reason provided";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center bg-teal-500/15 hover:bg-teal-500/30 text-teal-500 rounded-md p-1.5 transition-colors"
        title="Click to view appointment reason"
      >
        <AlertCircle size={18} />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-dark-400 text-gray-900 dark:text-white border-gray-200 dark:border-dark-500">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Appointment Details
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Patient's reason for booking this appointment
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-dark-300 p-4 rounded-lg border border-dark-500 whitespace-pre-wrap">
              {reason}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Cancellation Reason Modal
const CancellationReasonModal = ({
  appointment,
}: {
  appointment: Appointment;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const reason = appointment.cancellationReason || "No reason provided";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center bg-red-500/15 hover:bg-red-500/30 text-red-500 rounded-md p-1.5 transition-colors ml-2"
        title="View cancellation reason"
      >
        <AlertCircle size={18} />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white dark:bg-dark-400 text-gray-900 dark:text-white border-gray-200 dark:border-dark-500">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Cancellation Reason
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              This appointment was cancelled with the following reason
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-dark-300 p-4 rounded-lg border border-dark-500 whitespace-pre-wrap text-red-300">
              {reason}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Action Menu Component
const AppointmentActionMenu = ({
  appointment,
  onRefresh,
}: {
  appointment: Appointment;
  onRefresh: () => void;
}) => {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [changeDoctorDialogOpen, setChangeDoctorDialogOpen] = useState(false);

  const handleCancel = async (reason: string) => {
    try {
      await updateAppointment({
        appointmentId: appointment.$id,
        userId: appointment.userId,
        timeZone: "Asia/Manila",
        appointment: {
          status: "cancelled",
          cancellationReason: reason,
        },
        type: "cancel",
      });

      // Refresh the table data
      onRefresh();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleReschedule = async (newDate: Date) => {
    try {
      // Set status to 'scheduled' regardless of current status
      // This will reactivate cancelled appointments
      await updateAppointment({
        appointmentId: appointment.$id,
        userId: appointment.userId,
        timeZone: "Asia/Manila",
        appointment: {
          schedule: newDate,
          status: "scheduled", // Always set to scheduled (reactivates cancelled appointments)
          cancellationReason:
            appointment.status === "cancelled"
              ? null
              : appointment.cancellationReason,
          // Clear cancellation reason if appointment was cancelled
        },
        type: "schedule",
      });

      // Refresh the table data
      onRefresh();
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleChangeDoctor = async (doctorName: string) => {
    try {
      await updateAppointment({
        appointmentId: appointment.$id,
        userId: appointment.userId,
        timeZone: "Asia/Manila",
        appointment: {
          primaryPhysician: doctorName,
        },
        type: "schedule", // Use schedule type to send confirmation
      });

      // Refresh the table data
      onRefresh();
    } catch (error) {
      console.error("Error changing doctor:", error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleConfirmAppointment = async () => {
    try {
      await updateAppointment({
        appointmentId: appointment.$id,
        userId: appointment.userId,
        timeZone: "Asia/Manila",
        appointment: {
          status: "scheduled",
        },
        type: "schedule",
      });

      // Refresh the table data
      onRefresh();
    } catch (error) {
      console.error("Error confirming appointment:", error);
    }
  };

  // New function to mark an appointment as missed
  const handleMarkMissed = async () => {
    try {
      await updateAppointment({
        appointmentId: appointment.$id,
        userId: appointment.userId,
        timeZone: "Asia/Manila",
        appointment: {
          status: "missed",
        },
        type: "schedule",
      });

      // Refresh the table data
      onRefresh();
    } catch (error) {
      console.error("Error marking appointment as missed:", error);
    }
  };

  // New function to mark an appointment as completed
  const handleMarkCompleted = async () => {
    try {
      await updateAppointment({
        appointmentId: appointment.$id,
        userId: appointment.userId,
        timeZone: "Asia/Manila",
        appointment: {
          status: "completed",
        },
        type: "schedule", // Using schedule type since this is an administrative action
      });

      // Refresh the table data
      onRefresh();
    } catch (error) {
      console.error("Error marking appointment as completed:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="data-[state=open]:bg-gray-50 dark:data-[state=open]:bg-dark-400"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500"
      >
        <DropdownMenuLabel className="text-xs text-gray-500 dark:text-gray-400">
          Actions
        </DropdownMenuLabel>

        {/* Actions based on appointment status */}
        {appointment.status === "pending" && (
          <DropdownMenuItem
            className="text-green-600 dark:text-green-400 cursor-pointer"
            onClick={handleConfirmAppointment}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            <span>Confirm Appointment</span>
          </DropdownMenuItem>
        )}

        {appointment.status === "scheduled" && (
          <>
            <DropdownMenuItem
              className="text-gray-700 dark:text-gray-200 cursor-pointer"
              onClick={() => setRescheduleDialogOpen(true)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span>Reschedule</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-gray-700 dark:text-gray-200 cursor-pointer"
              onClick={() => setChangeDoctorDialogOpen(true)}
            >
              <UserRound className="mr-2 h-4 w-4" />
              <span>Change Doctor</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-green-600 dark:text-green-400 cursor-pointer"
              onClick={handleMarkCompleted}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              <span>Mark as Completed</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-amber-600 dark:text-amber-400 cursor-pointer"
              onClick={handleMarkMissed}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              <span>Mark as Missed</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 dark:text-red-400 cursor-pointer"
              onClick={() => setCancelDialogOpen(true)}
            >
              <XCircle className="mr-2 h-4 w-4" />
              <span>Cancel</span>
            </DropdownMenuItem>
          </>
        )}

        {(appointment.status === "cancelled" ||
          appointment.status === "completed" ||
          appointment.status === "missed") && (
          <DropdownMenuItem
            className="text-gray-700 dark:text-gray-200 cursor-pointer"
            onClick={() => setRescheduleDialogOpen(true)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>Reschedule</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>

      {/* Dialogs/Modals */}
      <CancelAppointmentModal
        appointment={appointment}
        onCancel={handleCancel}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
      />

      <RescheduleModal
        appointment={appointment}
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        onReschedule={handleReschedule}
      />

      <ChangeDoctorModal
        appointment={appointment}
        open={changeDoctorDialogOpen}
        onOpenChange={setChangeDoctorDialogOpen}
        onChangeDoctor={handleChangeDoctor}
      />
    </DropdownMenu>
  );
};

export const createAdminAppointmentColumns = (
  onRefresh: () => void
): ColumnDef<Appointment>[] => [
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
                  : getGravatarUrl("", 40, "robohash", patient.$id || "")
              }
              alt={patient.name || "Patient"}
            />
            <AvatarFallback className="bg-gradient-to-br from-dark-300 to-dark-400 text-xs">
              {patient.name ? patient.name.substring(0, 2).toUpperCase() : "PT"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-14-medium">{patient.name}</p>
            {patient.email && (
              <p className="text-12-regular text-gray-400">{patient.email}</p>
            )}
          </div>
        </div>
      );
    },
    meta: {
      className: "min-w-[180px]",
    },
  },
  {
    accessorKey: "schedule",
    header: ({ column }) => {
      return (
        <div
          className="flex items-center cursor-pointer hover:text-primary"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <Calendar className="mr-1 h-4 w-4" />
          <span>Date & Time</span>
        </div>
      );
    },
    cell: ({ row }) => {
      const appointment = row.original;
      const formatted = formatDateTime(appointment.schedule, "Asia/Manila");
      return (
        <div className="min-w-[120px]">
          <p className="text-14-medium">{formatted.dateOnly}</p>
          <p className="text-12-regular text-gray-400">{formatted.timeOnly}</p>
        </div>
      );
    },
    meta: {
      className: "min-w-[140px]",
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
            className="size-8 rounded-full"
          />
          <div>
            <p className="text-14-medium whitespace-nowrap">
              Dr. {appointment.primaryPhysician}
            </p>
            <p className="text-12-regular text-gray-400">
              {doctor?.displayName.includes("Medical") ? "Medical" : "Dental"}
            </p>
          </div>
        </div>
      );
    },
    meta: {
      className: "min-w-[200px]",
    },
  },
  {
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => {
      const appointment = row.original;
      return <AppointmentReasonModal appointment={appointment} />;
    },
    meta: {
      className: "w-[80px] text-center",
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <div className="min-w-[115px] flex items-center">
          <StatusBadge status={appointment.status} />
          {appointment.status === "cancelled" &&
            appointment.cancellationReason && (
              <CancellationReasonModal appointment={appointment} />
            )}
        </div>
      );
    },
    meta: {
      className: "min-w-[130px]",
    },
  },
  {
    accessorKey: "appointmentCode",
    header: "Code",
    cell: ({ row }) => {
      const appointment = row.original;
      return <AppointmentCodeModal appointment={appointment} />;
    },
    meta: {
      className: "min-w-[100px]",
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <AppointmentActionMenu
          appointment={appointment}
          onRefresh={onRefresh}
        />
      );
    },
    meta: {
      className: "min-w-[160px]",
    },
  },
];

"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, FileText, User2, CreditCard } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { formatDateTime, getGravatarUrl } from "@/lib/utils";
import { Appointment } from "@/types/appwrite.types";
import { createPatientNote, getPatientNotes, deletePatientNote } from "@/lib/actions/patient-notes.actions";
import { getRecentAppointmentList } from "@/lib/actions/appointment.actions";

import { AppointmentModal } from "../AppointmentModal";
import { StatusBadge } from "../StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PatientNote } from "@/types/appwrite.types";
import { Doctors } from "@/constants";

// Extended Appointment type for the patient management view
interface ExtendedAppointment extends Appointment {
  appointmentCount?: number;
  patientNotes?: string;
  comments?: string;
}

// Component for rendering the reason cell with proper state management
const AppointmentReasonCell = ({ appointment }: { appointment: ExtendedAppointment }) => {
  const [showFullReason, setShowFullReason] = useState(false);
  
  return (
    <div className="max-w-[200px]">
      {appointment.reason || appointment.note ? (
        <button 
          onClick={() => setShowFullReason(true)}
          className="doctor-table-icon"
          title="View Reason & Notes"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      ) : (
        <span className="text-gray-400 text-sm">N/A</span>
      )}
      
      {showFullReason && (
        <Dialog open={showFullReason} onOpenChange={setShowFullReason}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
            </DialogHeader>
            
            {/* Reason Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-16-semibold">Reason for Appointment</h3>
                <div className="mt-2 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  {appointment.reason || 'No reason provided'}
                </div>
              </div>
              
              {/* Patient Notes/Comments Section */}
              {appointment.note && (
                <div>
                  <h3 className="text-16-semibold">Patient Notes</h3>
                  <div className="mt-2 whitespace-pre-wrap bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                    {appointment.note}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Add this function after the AppointmentReasonCell component
const generateAppointmentCode = (appointment: Appointment) => {
  if (appointment.appointmentCode) {
    return appointment.appointmentCode;
  }
  
  try {
    // Import actual implementation from utils
    const { generateAppointmentCode } = require('@/lib/utils');
    
    // Use the actual implementation from utils
    const patientId = appointment.patient?.$id || 'UNKNOWN';
    const appointmentId = appointment.$id || 'UNKNOWN';
    
    return generateAppointmentCode(appointmentId, patientId);
  } catch (error) {
    // Fallback to a basic format
    return `TEMP-${appointment.$id?.substring(0, 6) || 'UNKNOWN'}`;
  }
};

// Helper function to safely handle potentially deleted patient data
const safePatientAccess = (appointment: ExtendedAppointment) => {
  try {
    // First verify the patient object exists
    if (!appointment.patient || typeof appointment.patient !== 'object') {
      return {
        name: 'Deleted Patient',
        email: null,
        $id: appointment.userId || 'unknown',
        phone: 'N/A'
      };
    }
    
    // Return the patient data
    return appointment.patient;
  } catch (error) {
    console.error("Error accessing patient data:", error);
    return {
      name: 'Deleted Patient',
      email: null,
      $id: appointment.userId || 'unknown',
      phone: 'N/A'
    };
  }
};

export const columns: ColumnDef<ExtendedAppointment>[] = [
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
      return <p className="text-14-medium">{patient.name}</p>;
    },
  },
  {
    accessorKey: "appointmentCode",
    header: "Code",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <p className="text-14-medium text-blue-500 font-medium">
          {generateAppointmentCode(appointment)}
        </p>
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
      return <AppointmentReasonCell appointment={row.original} />;
    },
  },
  {
    accessorKey: "patientDetails",
    header: "Details",
    cell: ({ row }) => {
      const appointment = row.original;
      const patient = safePatientAccess(appointment);
      
      return (
        <div>
          {patient.$id !== 'unknown' ? (
            <PatientDetailModal patient={patient} />
          ) : (
            <span className="text-gray-500">Patient data unavailable</span>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="pl-4">Actions</div>,
    cell: ({ row }) => {
      const appointment = row.original;
      const patient = safePatientAccess(appointment);

      return (
        <div className="flex gap-1">
          {appointment.status !== "cancelled" && (
            <AppointmentModal
              patientId={patient.$id}
              userId={appointment.userId}
              appointment={appointment}
              type="cancel"
              buttonVariant="destructive"
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
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState<string | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [activeDocument, setActiveDocument] = useState("");
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotes();
      loadPatientAppointments();
    }
  }, [isOpen, patient.$id]);

  const loadNotes = async () => {
    try {
      if (!patient || !patient.$id) {
        setError("Patient data not available");
        return;
      }
      
      const patientNotes = await getPatientNotes(patient.$id);
      setNotes(patientNotes);
    } catch (err) {
      console.error("Error loading notes:", err);
      setError("Failed to load patient notes");
    }
  };

  const loadPatientAppointments = async () => {
    try {
      if (!patient || !patient.$id) {
        setError("Patient data not available");
        return;
      }
      
      // This implementation is simplified for testing
      // In a real app, you would call a server action or API endpoint
      // to get patient-specific appointments
      const doctorName = localStorage.getItem("doctorName");
      
      if (!doctorName) {
        throw new Error("Not authenticated as doctor");
      }

      // For now, we'll just display a placeholder
      setPatientAppointments([]);
      console.log("Would load appointments for patient ID:", patient.$id);
      
      // This function needs proper implementation with your API
      /*
      const patientAppointments = await getPatientAppointmentsForDoctor(
        patient.$id,
        doctorName
      );
      setPatientAppointments(patientAppointments);
      */
    } catch (error) {
      console.error("Error loading patient appointments:", error);
      setError("Failed to load patient appointments");
    }
  };

  const handleSubmitNote = async () => {
    if (!newNote.trim()) return;
    if (!patient || !patient.$id) {
      setError("Cannot add notes: Patient data not available");
      return;
    }

    setSubmitting(true);
    try {
      // Get doctor information from localStorage
      const doctorKey = localStorage.getItem("doctorAccessKey");
      const doctorName = localStorage.getItem("doctorName");
      
      if (!doctorKey || !doctorName) {
        throw new Error("Not authenticated as doctor");
      }

      // Find the doctor info from constants
      const doctor = Doctors.find((d: { name: string; id: string }) => d.name === doctorName);
      const formattedDoctorName = doctor ? doctor.name : doctorName;

      await createPatientNote({
        patientId: patient.$id,
        doctorId: formattedDoctorName, // Use the formatted doctor name
        note: newNote.trim(),
      });

      setNewNote("");
      await loadNotes();
    } catch (error) {
      console.error("Error submitting note:", error);
      setError("Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      setIsDeletingNote(noteId);
      const result = await deletePatientNote(noteId);
      
      if (result.success) {
        // Update local notes state by filtering out the deleted note
        setNotes(prevNotes => prevNotes.filter(note => note.$id !== noteId));
      } else {
        console.error("Failed to delete note:", result.error);
        setError("Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      setError("Failed to delete note");
    } finally {
      setIsDeletingNote(null);
    }
  };

  // If the patient data is not valid, don't render a button
  if (!patient || patient.$id === 'unknown') {
    return <span className="text-gray-500">Patient data unavailable</span>;
  }

  return (
    <>
      <button
        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
        onClick={() => setIsOpen(true)}
        title="View Patient Details"
      >
        <User2 size={18} className="stroke-current" />
        <span className="text-xs font-medium">Profile</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="doctor-detail-modal">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Patient Information</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6">
            {/* Personal Information */}
            <div className="doctor-detail-section">
              <h3 className="doctor-detail-header">Personal Details</h3>
              
              {/* Add avatar at the top */}
              <div className="flex justify-center mb-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-300">
                  <Image 
                    src={getGravatarUrl(patient.email, 200)}
                    alt={patient.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              </div>
              
              {/* Patient ID */}
              <div className="flex justify-center mb-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900 rounded-md">
                  <CreditCard className="text-blue-600 dark:text-blue-400" size={18} />
                  <p className="text-blue-700 dark:text-blue-300 font-medium">
                    ID: {patient.identificationNumber || patient.idNumber || patient.nationalId || patient.studentId || patient.employeeId || 'Not available'}
                  </p>
                </div>
              </div>
              
              <div className="doctor-detail-grid">
                <div>
                  <p className="doctor-detail-label">Full Name</p>
                  <p className="doctor-detail-value">{patient.name}</p>
                </div>
                <div>
                  <p className="doctor-detail-label">Gender</p>
                  <p className="doctor-detail-value">{patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'Not specified'}</p>
                </div>
                <div>
                  <p className="doctor-detail-label">Birth Date</p>
                  <p className="doctor-detail-value">{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : 'Not specified'}</p>
                </div>
                <div>
                  <p className="doctor-detail-label">Category</p>
                  <p className="doctor-detail-value">{patient.category || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="doctor-detail-section">
              <h3 className="doctor-detail-header">Contact Information</h3>
              <div className="doctor-detail-grid">
                <div>
                  <p className="doctor-detail-label">Email</p>
                  <p className="doctor-detail-value">{patient.email}</p>
                </div>
                <div>
                  <p className="doctor-detail-label">Phone</p>
                  <p className="doctor-detail-value">{patient.phone}</p>
                </div>
                <div>
                  <p className="doctor-detail-label">Address</p>
                  <p className="doctor-detail-value">{patient.address || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="doctor-detail-section">
              <h3 className="doctor-detail-header">Medical Information</h3>
              <div className="grid gap-4">
                <div>
                  <p className="doctor-detail-label">Current Signs & Symptoms</p>
                  <p className="doctor-detail-value">{patient.signsSymptoms || 'None reported'}</p>
                </div>
                <div>
                  <p className="doctor-detail-label">Allergies</p>
                  <p className="doctor-detail-value">{patient.allergies || 'None reported'}</p>
                </div>
                <div>
                  <p className="doctor-detail-label">Current Medication</p>
                  <p className="doctor-detail-value">{patient.currentMedication || 'None reported'}</p>
                </div>
                <div>
                  <p className="doctor-detail-label">Family Medical History</p>
                  <p className="doctor-detail-value">{patient.familyMedicalHistory || 'None reported'}</p>
                </div>
                <div>
                  <p className="doctor-detail-label">Past Medical History</p>
                  <p className="doctor-detail-value">{patient.pastMedicalHistory || 'None reported'}</p>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="doctor-detail-section">
              <h3 className="doctor-detail-header">Emergency Contact</h3>
              <div className="doctor-detail-grid">
                <div>
                  <p className="doctor-detail-label">Name</p>
                  <p className="doctor-detail-value">{patient.emergencyContactName || 'Not specified'}</p>
                </div>
                <div>
                  <p className="doctor-detail-label">Phone</p>
                  <p className="doctor-detail-value">{patient.emergencyContactNumber || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Patient Appointments Section */}
            <div className="doctor-detail-section">
              <h3 className="doctor-detail-header">Appointments History</h3>
              
              {patientAppointments.length === 0 ? (
                <p className="text-gray-500">No appointment records found.</p>
              ) : (
                <div className="space-y-3">
                  {patientAppointments.map((apt) => (
                    <div key={apt.$id} className="doctor-appointment-card">
                      <div className="doctor-appointment-row">
                        <div>
                          <p className="doctor-detail-label">Date & Time</p>
                          <p className="doctor-detail-value">{formatDateTime(apt.schedule).dateTime}</p>
                        </div>
                        <div>
                          <p className="doctor-detail-label">Status</p>
                          <StatusBadge status={apt.status} />
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="doctor-detail-label">Appointment Code</p>
                        <p className="text-base text-blue-500 font-medium">{generateAppointmentCode(apt)}</p>
                      </div>
                      <div className="mt-2">
                        <p className="doctor-detail-label">Reason</p>
                        <p className="doctor-detail-value">{apt.reason || 'No reason provided'}</p>
                      </div>
                      {apt.note && (
                        <div className="mt-2">
                          <p className="doctor-detail-label">Note</p>
                          <p className="doctor-detail-value">{apt.note}</p>
                        </div>
                      )}
                      {apt.status === 'cancelled' && apt.cancellationReason && (
                        <div className="mt-2">
                          <p className="doctor-detail-label">Cancellation Reason</p>
                          <p className="doctor-detail-value">{apt.cancellationReason}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Doctor Notes Section */}
            <div className="doctor-detail-section">
              <h3 className="doctor-detail-header">Doctor Notes</h3>
              
              {/* Add New Note */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a new note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[100px] p-3"
                />
                <Button
                  onClick={handleSubmitNote}
                  disabled={submitting || !newNote.trim()}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  {submitting ? "Adding Note..." : "Add Note"}
                </Button>
              </div>

              {/* Notes List */}
              <div className="space-y-4 mt-4">
                {notes.map((note) => (
                  <div key={note.$id} className="doctor-note-container">
                    <div className="doctor-note-header">
                      <p className="doctor-note-timestamp">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="doctor-note-delete"
                            disabled={isDeletingNote === note.$id}
                          >
                            <Trash2 size={16} />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Note</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this note? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="hover:bg-gray-100 hover:border-gray-300 transition-colors">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 text-white hover:bg-red-700"
                              onClick={() => handleDeleteNote(note.$id)}
                            >
                              {isDeletingNote === note.$id ? "Deleting..." : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <p className="doctor-note-content">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
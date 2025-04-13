"use client";

import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
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

import { AppointmentModal } from "../AppointmentModal";
import { StatusBadge } from "../StatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PatientNote } from "@/types/appwrite.types";
import { Doctors } from "@/constants";

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
      return <p className="text-14-medium">{appointment.patient?.name || 'Unknown Patient'}</p>;
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
          <p className="text-14-medium">Phone: {appointment.patient?.phone || 'N/A'}</p>
          <p className="text-14-regular text-gray-600">Email: {appointment.patient?.email || 'N/A'}</p>
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
          {appointment.patient ? (
            <PatientDetailModal patient={appointment.patient} />
          ) : (
            <span className="text-gray-500">Patient data unavailable</span>
          )}
          {appointment.status !== "cancelled" && (
            <AppointmentModal
              patientId={appointment.patient?.$id || ''}
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
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingNote, setIsDeletingNote] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotes();
    }
  }, [isOpen, patient.$id]);

  const loadNotes = async () => {
    const patientNotes = await getPatientNotes(patient.$id);
    setNotes(patientNotes);
  };

  const handleSubmitNote = async () => {
    if (!newNote.trim()) return;

    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    } finally {
      setIsDeletingNote(null);
    }
  };

  return (
    <>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
        onClick={() => setIsOpen(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Patient Information</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Personal Details</h3>
              
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="text-base">{patient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="text-base">{patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Birth Date</p>
                  <p className="text-base">{patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="text-base">{patient.category || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-base">{patient.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-base">{patient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-base">{patient.address || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Identification */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Identification</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">ID Type</p>
                  <p className="text-base">{patient.identificationType || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ID Number</p>
                  <p className="text-base">{patient.identificationNumber || 'Not specified'}</p>
                </div>
                {patient.identificationDocumentId && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">ID Document</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button 
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/documents/${patient.identificationDocumentId}`);
                            if (!response.ok) {
                              throw new Error('Failed to get document URL');
                            }
                            const data = await response.json();
                            
                            // Open the URL in a new tab
                            window.open(data.url, '_blank');
                          } catch (error) {
                            console.error('Error viewing document:', error);
                            alert('Unable to view document. Please try again later.');
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        View ID Document
                      </button>
                      <span className="text-xs text-gray-500">(Opens in new tab)</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Medical Information</h3>
              <div className="grid gap-4">
                <div>
                  <p className="text-sm text-gray-500">Current Signs & Symptoms</p>
                  <p className="text-base">{patient.signsSymptoms || 'None reported'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Allergies</p>
                  <p className="text-base">{patient.allergies || 'None reported'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Medication</p>
                  <p className="text-base">{patient.currentMedication || 'None reported'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Family Medical History</p>
                  <p className="text-base">{patient.familyMedicalHistory || 'None reported'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Past Medical History</p>
                  <p className="text-base">{patient.pastMedicalHistory || 'None reported'}</p>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-base">{patient.emergencyContactName || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-base">{patient.emergencyContactNumber || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {/* Doctor Notes Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Doctor Notes</h3>
              
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
                  disabled={isSubmitting || !newNote.trim()}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  {isSubmitting ? "Adding Note..." : "Add Note"}
                </Button>
              </div>

              {/* Notes List */}
              <div className="space-y-4 mt-4">
                {notes.map((note) => (
                  <div key={note.$id} className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-gray-500">
                        {new Date(note.createdAt).toLocaleString()}
                      </p>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
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
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
                    <p className="text-gray-700 whitespace-pre-wrap">{note.note}</p>
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
"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/table/DataTable";
import { columns } from "@/components/table/doctor-columns";
import {
  getRecentAppointmentList,
  getDoctorAppointments,
  getDoctorAvailability,
  saveDoctorAvailability,
} from "@/lib/actions/appointment.actions";
import {
  createPatientNote,
  getPatientNotes,
} from "@/lib/actions/patient-notes.actions";
import { Doctors } from "@/constants";
import { Appointment, Patient, PatientNote } from "@/types/appwrite.types";
import {
  decryptKey,
  encryptKey,
  formatDateTime,
  broadcastAvailabilityChange,
} from "@/lib/utils";
import { validatePasskey } from "@/lib/utils/validatePasskey";

// Import the UI components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Add import for the AppointmentCalendar component
import AppointmentCalendar from "@/components/AppointmentCalendar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Settings, LogOut, Archive } from "lucide-react";

interface AppointmentState {
  documents: Appointment[];
  scheduledCount: number;
  pendingCount: number;
  cancelledCount: number;
  completedCount: number;
  missedCount: number;
  totalCount: number;
}

interface AppointmentListResponse {
  documents: any[];
  scheduledCount: number;
  pendingCount: number;
  cancelledCount: number;
  todayCount: number;
  studentCount: number;
  employeeCount: number;
  totalCount: number;
}

interface AvailabilitySettings {
  days: number[];
  startTime: number;
  endTime: number;
  holidays: Date[];
  bookingStartDate: string;
  bookingEndDate: string;
  maxAppointmentsPerDay: number;
  blockedTimeSlots: Array<{
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }>;
  newBlockedSlot?: {
    date?: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
  };
}

const DoctorDashboard = () => {
  const [allAppointments, setAllAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] =
    useState<AppointmentState>({
      documents: [],
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      completedCount: 0,
      missedCount: 0,
      totalCount: 0,
    });
  const [allDoctorAppointments, setAllDoctorAppointments] = useState<
    Appointment[]
  >([]);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingAllAppointments, setLoadingAllAppointments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentDoctor, setCurrentDoctor] = useState("");
  const [currentDoctorId, setCurrentDoctorId] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  // Add a ref to track modal state
  const modalOpenRef = useRef(false);

  // Calendar state
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [availabilitySettings, setAvailabilitySettings] =
    useState<AvailabilitySettings>({
      days: [1, 2, 3, 4, 5],
      startTime: 8,
      endTime: 17,
      holidays: [],
      bookingStartDate: "",
      bookingEndDate: "",
      maxAppointmentsPerDay: 10,
      blockedTimeSlots: [],
    });

  // Patient state
  const [patientSearch, setPatientSearch] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>(
    []
  );
  const [uniquePatients, setUniquePatients] = useState<{
    [patientId: string]: Appointment;
  }>({});

  // Clear history state
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  // Function to get doctor ID from name
  const getDoctorIdFromName = (name: string) => {
    const doctor = Doctors.find((doc) => doc.name === name);
    return doctor ? doctor.id : "default";
  };

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const encryptedKey =
        typeof window !== "undefined"
          ? window.localStorage.getItem("doctorAccessKey")
          : null;

      const doctorName = localStorage.getItem("doctorName");
      const hasValidKey =
        encryptedKey &&
        doctorName &&
        Doctors.some((doc) => doc.name === doctorName);

      if (!hasValidKey) {
        setShowAuthModal(true);
        return false;
      }

      setCurrentDoctor(doctorName);
      setCurrentDoctorId(getDoctorIdFromName(doctorName));
      return true;
    };

    const isAuthenticated = checkAuth();

    if (isAuthenticated) {
      // Fetch appointments
      fetchAppointments();
      fetchAllDoctorAppointments();

      // Load doctor availability settings
      const doctor = Doctors.find(
        (doc) => doc.name === localStorage.getItem("doctorName")
      );
      if (doctor) {
        setAvailabilitySettings({
          days: doctor.availability.days,
          startTime: doctor.availability.startTime,
          endTime: doctor.availability.endTime,
          holidays: doctor.availability.holidays || [],
          bookingStartDate: doctor.availability.bookingStartDate || "",
          bookingEndDate: doctor.availability.bookingEndDate || "",
          maxAppointmentsPerDay:
            doctor.availability.maxAppointmentsPerDay || 10,
          blockedTimeSlots: doctor.availability.blockedTimeSlots || [],
        });
      } else {
        // Fallback to default availability from the first doctor in the list
        const defaultDoctor = Doctors[0];
        setAvailabilitySettings({
          days: defaultDoctor.availability.days,
          startTime: defaultDoctor.availability.startTime,
          endTime: defaultDoctor.availability.endTime,
          holidays: defaultDoctor.availability.holidays || [],
          bookingStartDate: defaultDoctor.availability.bookingStartDate || "",
          bookingEndDate: defaultDoctor.availability.bookingEndDate || "",
          maxAppointmentsPerDay:
            defaultDoctor.availability.maxAppointmentsPerDay || 10,
          blockedTimeSlots: defaultDoctor.availability.blockedTimeSlots || [],
        });
      }
    }

    // Cleanup function to reset modal states when component unmounts
    return () => {
      setShowAuthModal(false);
      setShowClearHistoryDialog(false);
      setShowAvailabilityModal(false);
    };
  }, []);

  // Watch for passkey changes and auto-submit when length is correct
  useEffect(() => {
    if (passkey.length === 6) {
      validatePasskey();
    }
  }, [passkey]);

  // Add useEffect for tab switching
  useEffect(() => {
    // If we're on the patients tab with no data OR clear history was just performed
    if (activeTab === "patients" && Object.keys(uniquePatients).length === 0) {
      // Use our dedicated patients API endpoint instead
      fetchPatients();
    }

    // If we're on the all-appointments tab, fetch all doctor appointments
    if (
      activeTab === "all-appointments" &&
      allDoctorAppointments.length === 0
    ) {
      fetchAllDoctorAppointments();
    }
  }, [activeTab, uniquePatients]);

  const fetchAppointments = async () => {
    const doctorName = localStorage.getItem("doctorName");
    if (!doctorName) return;

    setLoading(true);
    try {
      const appointments = (await getDoctorAppointments(
        doctorName
      )) as Appointment[];

      if (appointments && appointments.length > 0) {
        // Filter out archived appointments
        const nonArchivedAppointments = appointments.filter(
          (apt) => !apt.archived
        );

        // Process appointments to check for missed ones
        const processedAppointments = nonArchivedAppointments.map(
          (appointment: Appointment) => {
            if (appointment.status === "scheduled") {
              const appointmentDate = new Date(appointment.schedule);
              const currentDate = new Date();

              // Check if the appointment is 5 hours past the scheduled time
              const timeDifference =
                currentDate.getTime() - appointmentDate.getTime();
              const hoursPassed = timeDifference / (1000 * 60 * 60);

              if (hoursPassed > 5) {
                return { ...appointment, status: "missed" as Status };
              }
            }
            return appointment;
          }
        );

        // Calculate counts
        const scheduledCount = processedAppointments.filter(
          (apt) => apt.status === "scheduled"
        ).length;
        const pendingCount = processedAppointments.filter(
          (apt) => apt.status === "pending"
        ).length;
        const cancelledCount = processedAppointments.filter(
          (apt) => apt.status === "cancelled"
        ).length;
        const completedCount = processedAppointments.filter(
          (apt) => apt.status === "completed"
        ).length;
        const missedCount = processedAppointments.filter(
          (apt) => apt.status === "missed"
        ).length;

        // Create unique patients object
        const uniquePatientsObj: { [patientId: string]: Appointment } = {};

        appointments.forEach((appointment: Appointment) => {
          if (appointment.patient && appointment.patient.$id) {
            const patientId = appointment.patient.$id;

            // If we don't have this patient yet, or this appointment is more recent
            if (
              !uniquePatientsObj[patientId] ||
              new Date(appointment.schedule) >
                new Date(uniquePatientsObj[patientId].schedule)
            ) {
              uniquePatientsObj[patientId] = appointment;
            }
          }
        });

        setUniquePatients(uniquePatientsObj);

        // Set appointment state
        setFilteredAppointments({
          documents: processedAppointments,
          scheduledCount,
          pendingCount,
          cancelledCount,
          completedCount,
          missedCount,
          totalCount: processedAppointments.length,
        });
      } else {
        setFilteredAppointments({
          documents: [],
          scheduledCount: 0,
          pendingCount: 0,
          cancelledCount: 0,
          completedCount: 0,
          missedCount: 0,
          totalCount: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      setFilteredAppointments({
        documents: [],
        scheduledCount: 0,
        pendingCount: 0,
        cancelledCount: 0,
        completedCount: 0,
        missedCount: 0,
        totalCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const doctorName = localStorage.getItem("doctorName");
      if (!doctorName) return;

      // Call our new API endpoint to get all patients
      const response = await fetch(
        `/api/patients/doctor?name=${encodeURIComponent(doctorName)}`
      );

      if (!response.ok) {
        console.error("Failed to fetch patients");
        return;
      }

      const data = await response.json();

      if (data.success && data.patients) {
        // Set the uniquePatients state with this data
        setUniquePatients(data.patients);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  // Add function to fetch all doctor appointments
  const fetchAllDoctorAppointments = async () => {
    const doctorName = localStorage.getItem("doctorName");
    if (!doctorName) return;

    setLoadingAllAppointments(true);
    try {
      const appointments = await getDoctorAppointments(doctorName);

      if (appointments && appointments.length > 0) {
        // Filter out archived appointments (though the API should already do this)
        const nonArchivedAppointments = appointments.filter(
          (apt: Appointment) => !apt.archived
        );

        // Process appointments to check for missed ones
        const processedAppointments = nonArchivedAppointments.map(
          (appointment: Appointment) => {
            if (appointment.status === "scheduled") {
              const appointmentDate = new Date(appointment.schedule);
              const currentDate = new Date();

              // Check if the appointment is 5 hours past the scheduled time
              const timeDifference =
                currentDate.getTime() - appointmentDate.getTime();
              const hoursPassed = timeDifference / (1000 * 60 * 60);

              if (hoursPassed > 5) {
                return { ...appointment, status: "missed" as Status };
              }
            }
            return appointment;
          }
        );

        setAllDoctorAppointments(processedAppointments);
      }
    } catch (error) {
      console.error("Error fetching all doctor appointments:", error);
    } finally {
      setLoadingAllAppointments(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("doctorAccessKey");
    localStorage.removeItem("doctorName");
    router.push("/");
  };

  // Validate passkey
  const validatePasskey = async () => {
    if (isSubmitting) return;

    if (!selectedDoctor) {
      setError("Please select a doctor first.");
      return;
    }

    const doctor = Doctors.find((doc) => doc.name === selectedDoctor);
    if (!doctor) {
      setError("Invalid doctor selection.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Determine which doctor type to validate
      let doctorType: "dr_abundo" | "dr_decastro";

      /* cspell:disable-next-line */
      if (doctor.id === "dr-abundo") {
        doctorType = "dr_abundo";
      } else if (doctor.id === "dr-decastro") {
        doctorType = "dr_decastro";
      } else {
        setError("Doctor not configured properly.");
        setIsSubmitting(false);
        return;
      }

      // Validate passkey through API
      const isValid = await validatePasskey(passkey, doctorType);

      if (isValid) {
        const encryptedKey = encryptKey(passkey);
        localStorage.setItem("doctorAccessKey", encryptedKey);
        localStorage.setItem("doctorName", selectedDoctor);

        setShowAuthModal(false);
        setCurrentDoctor(selectedDoctor);
        setCurrentDoctorId(getDoctorIdFromName(selectedDoctor));

        // Fetch appointments after successful authentication
        fetchAppointments();
        fetchAllDoctorAppointments();
      } else {
        setError("Invalid passkey. Please try again.");
        setPasskey(""); // Clear the passkey on error
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      setPasskey(""); // Clear the passkey on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save availability settings
  const saveAvailabilitySettings = async () => {
    try {
      const doctorName = localStorage.getItem("doctorName");
      if (!doctorName) {
        throw new Error("Doctor not authenticated");
      }

      // Show loading state
      const saveBtn = document.querySelector(".save-availability-btn");
      if (saveBtn) {
        saveBtn.textContent = "Saving...";
        saveBtn.setAttribute("disabled", "true");
      }

      // Find the doctor in the constants
      const doctor = Doctors.find((doc) => doc.name === doctorName);
      if (!doctor) {
        throw new Error("Doctor not found");
      }

      // Create a new availability object with the current settings
      const updatedAvailability = {
        days: availabilitySettings.days,
        startTime: availabilitySettings.startTime,
        endTime: availabilitySettings.endTime,
        holidays: availabilitySettings.holidays || [],
        bookingStartDate: availabilitySettings.bookingStartDate,
        bookingEndDate: availabilitySettings.bookingEndDate,
        maxAppointmentsPerDay: availabilitySettings.maxAppointmentsPerDay,
        blockedTimeSlots: availabilitySettings.blockedTimeSlots || [],
      };

      // Save to localStorage for immediate feedback
      localStorage.setItem(
        `doctorAvailability_${doctor.id}`,
        JSON.stringify(updatedAvailability)
      );

      // Update the doctor object in memory
      doctor.availability = updatedAvailability;

      // Save to the backend database using the API
      const result = await saveDoctorAvailability(
        doctor.id,
        updatedAvailability
      );

      if (!result.success) {
        throw new Error(
          result.error || "Failed to save availability to database"
        );
      }

      // Broadcast the availability change for real-time updates
      broadcastAvailabilityChange(doctor.id, updatedAvailability);

      // Success notification
      toast({
        title: "Success",
        description: "Availability settings updated successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving availability settings:", error);
      toast({
        title: "Error",
        description: "Failed to save availability settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Reset button state
      const saveBtn = document.querySelector(".save-availability-btn");
      if (saveBtn) {
        saveBtn.textContent = "Save Availability Settings";
        saveBtn.removeAttribute("disabled");
      }
    }
  };

  // Add a useEffect to load saved availability settings from localStorage
  useEffect(() => {
    const loadSavedAvailability = async () => {
      const doctorName = localStorage.getItem("doctorName");
      if (!doctorName) return;

      const doctor = Doctors.find((doc) => doc.name === doctorName);
      if (!doctor) return;

      try {
        // First try to get availability from the backend database
        const dbAvailability = await getDoctorAvailability(doctor.id);

        if (dbAvailability) {
          // Use the database settings if available
          setAvailabilitySettings({
            days: dbAvailability.days || [1, 2, 3, 4, 5],
            startTime: dbAvailability.startTime || 8,
            endTime: dbAvailability.endTime || 17,
            holidays: dbAvailability.holidays || [],
            bookingStartDate: dbAvailability.bookingStartDate || "",
            bookingEndDate: dbAvailability.bookingEndDate || "",
            maxAppointmentsPerDay: dbAvailability.maxAppointmentsPerDay || 10,
            blockedTimeSlots: dbAvailability.blockedTimeSlots || [],
          });

          // Also update the doctor object with these settings
          doctor.availability = dbAvailability;

          // Save to localStorage as a backup
          localStorage.setItem(
            `doctorAvailability_${doctor.id}`,
            JSON.stringify(dbAvailability)
          );

          console.log("Loaded doctor availability from database");
          return;
        }

        // If no database settings, check for saved settings in localStorage
        const savedSettings = localStorage.getItem(
          `doctorAvailability_${doctor.id}`
        );

        if (savedSettings) {
          try {
            const parsedSettings = JSON.parse(savedSettings);
            setAvailabilitySettings({
              days: parsedSettings.days || [1, 2, 3, 4, 5],
              startTime: parsedSettings.startTime || 8,
              endTime: parsedSettings.endTime || 17,
              holidays: parsedSettings.holidays || [],
              bookingStartDate: parsedSettings.bookingStartDate || "",
              bookingEndDate: parsedSettings.bookingEndDate || "",
              maxAppointmentsPerDay: parsedSettings.maxAppointmentsPerDay || 10,
              blockedTimeSlots: parsedSettings.blockedTimeSlots || [],
            });

            // Also update the doctor object with these settings
            doctor.availability = parsedSettings;

            // Save to database for future use
            await saveDoctorAvailability(doctor.id, parsedSettings);
            console.log("Saved local availability to database");
          } catch (err) {
            console.error("Error parsing saved availability settings:", err);
          }
        } else if (doctor.availability) {
          // Use the doctor's default availability from constants
          setAvailabilitySettings({
            days: doctor.availability.days,
            startTime: doctor.availability.startTime,
            endTime: doctor.availability.endTime,
            holidays: doctor.availability.holidays || [],
            bookingStartDate: doctor.availability.bookingStartDate || "",
            bookingEndDate: doctor.availability.bookingEndDate || "",
            maxAppointmentsPerDay:
              doctor.availability.maxAppointmentsPerDay || 10,
            blockedTimeSlots: doctor.availability.blockedTimeSlots || [],
          });

          // Save default settings to database for future use
          await saveDoctorAvailability(doctor.id, doctor.availability);
          console.log("Saved default availability to database");
        }
      } catch (error) {
        console.error("Error loading doctor availability:", error);
      }
    };

    if (currentDoctor) {
      loadSavedAvailability();
    }
  }, [currentDoctor]);

  // Clear appointment history
  const clearAppointmentHistory = async () => {
    setClearingHistory(true);
    try {
      const doctorName = localStorage.getItem("doctorName");
      if (!doctorName) {
        throw new Error("Doctor not authenticated");
      }
      // Store the current uniquePatients before clearing
      const currentPatients = uniquePatients;
      // Call to backend to clear/archive appointments for this doctor
      const response = await fetch("/api/appointments/clear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorName,
          action: "archive", // We'll archive rather than delete
          preservePatientData: true, // This indicates we want to keep patient data
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to clear appointment history"
        );
      }
      setFilteredAppointments({
        documents: [],
        scheduledCount: 0,
        pendingCount: 0,
        cancelledCount: 0,
        completedCount: 0,
        missedCount: 0,
        totalCount: 0,
      });
      setAllDoctorAppointments([]);
      await fetchPatients();
      setShowClearHistoryDialog(false);
      toast({
        title: "Success",
        description: "Appointment history cleared successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error("Error clearing appointment history:", error);
      toast({
        title: "Error",
        description: "Failed to clear appointment history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClearingHistory(false);
    }
  };

  // Add cleanup effect for modal
  useEffect(() => {
    const cleanup = () => {
      // Force cleanup of any modal artifacts
      const bodyElement = document.body;
      bodyElement.classList.remove("overflow-hidden");
      bodyElement.style.pointerEvents = "";

      // Remove any stray overlay elements
      const overlays = document.querySelectorAll("[data-radix-portal]");
      overlays.forEach((overlay) => {
        if (overlay.getAttribute("aria-hidden") === "true") {
          overlay.remove();
        }
      });
    };

    if (!showAvailabilityModal && modalOpenRef.current) {
      // Modal was open and is now closed, perform cleanup
      cleanup();
      modalOpenRef.current = false;
    }

    if (showAvailabilityModal) {
      modalOpenRef.current = true;
    }

    // Also clean up on component unmount
    return cleanup;
  }, [showAvailabilityModal]);

  return (
    <>
      {/* Authentication Modal */}
      <AlertDialog
        open={showAuthModal}
        onOpenChange={(isOpen) => {
          // Allow the dialog to close normally, and handle auth state separately
          setShowAuthModal(isOpen);

          // If user is trying to close without auth, redirect to home page
          if (!isOpen && !localStorage.getItem("doctorAccessKey")) {
            router.push("/");
          }
        }}
      >
        <AlertDialogContent className="shad-alert-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-start justify-between">
              Doctor Access Verification
              <Image
                src="/assets/icons/close.svg"
                alt="close"
                width={20}
                height={20}
                onClick={() => router.push("/")}
                className="cursor-pointer"
              />
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please select your name and enter your passkey to access the
              dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="doctor-select"
                className="text-sm font-medium text-gray-700"
              ></label>
              <select
                id="doctor-select"
                value={selectedDoctor}
                onChange={(e) => {
                  setSelectedDoctor(e.target.value);
                  setError("");
                  setPasskey(""); // Clear passkey when doctor changes
                }}
                className="shad-input w-full"
                disabled={isSubmitting}
              >
                <option value="">Select a doctor...</option>
                {Doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.name}>
                    Dr. {doctor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <InputOTP
                maxLength={6}
                value={passkey}
                onChange={(value) => {
                  setPasskey(value);
                  setError("");
                }}
                disabled={!selectedDoctor || isSubmitting}
              >
                <InputOTPGroup className="shad-otp">
                  <InputOTPSlot className="shad-otp-slot" index={0} />
                  <InputOTPSlot className="shad-otp-slot" index={1} />
                  <InputOTPSlot className="shad-otp-slot" index={2} />
                  <InputOTPSlot className="shad-otp-slot" index={3} />
                  <InputOTPSlot className="shad-otp-slot" index={4} />
                  <InputOTPSlot className="shad-otp-slot" index={5} />
                </InputOTPGroup>
              </InputOTP>

              {error && (
                <p className="shad-error text-14-regular mt-4 flex justify-center">
                  {error}
                </p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={validatePasskey}
              className="shad-primary-btn w-full"
              disabled={!selectedDoctor || passkey.length !== 6 || isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Enter Doctor Passkey"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear History Confirmation Dialog */}
      <AlertDialog
        open={showClearHistoryDialog}
        onOpenChange={setShowClearHistoryDialog}
      >
        <AlertDialogContent className="z-50">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Appointment History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your appointment history? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearHistoryDialog(false)}
              disabled={clearingHistory}
            >
              Cancel
            </Button>
            <Button
              className="shad-danger-btn"
              onClick={clearAppointmentHistory}
              disabled={clearingHistory}
            >
              {clearingHistory ? "Clearing..." : "Clear History"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Availability Settings Modal */}
      <Dialog
        open={showAvailabilityModal}
        onOpenChange={(open) => {
          setShowAvailabilityModal(open);
          if (!open) {
            // Immediately force cleanup when closed
            document.body.style.pointerEvents = "";
            document.body.classList.remove("overflow-hidden");

            // Add a small delay to ensure the modal is fully closed
            setTimeout(() => {
              const overlays = document.querySelectorAll('[role="dialog"]');
              overlays.forEach((overlay) => {
                if (overlay.getAttribute("aria-hidden") === "true") {
                  overlay.remove();
                }
              });
            }, 100);
          }
        }}
      >
        <DialogContent className="sm:max-w-[900px] z-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Availability Settings
            </DialogTitle>
            <DialogDescription>
              Configure your working hours and time off
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-16-medium font-semibold">Working Hours</h3>
              <div className="dashboard-card p-4 space-y-4">
                <div className="space-y-2">
                  <h4 className="text-16-medium">Working Days</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { day: 0, label: "Sun" },
                      { day: 1, label: "Mon" },
                      { day: 2, label: "Tue" },
                      { day: 3, label: "Wed" },
                      { day: 4, label: "Thu" },
                      { day: 5, label: "Fri" },
                      { day: 6, label: "Sat" },
                    ].map(({ day, label }) => (
                      <Button
                        key={day}
                        type="button"
                        variant={
                          availabilitySettings.days.includes(day)
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        className={cn(
                          "h-9",
                          availabilitySettings.days.includes(day)
                            ? "bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900"
                            : "bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
                        )}
                        onClick={() => {
                          const newDays = availabilitySettings.days.includes(
                            day
                          )
                            ? availabilitySettings.days.filter((d) => d !== day)
                            : [...availabilitySettings.days, day].sort();
                          setAvailabilitySettings({
                            ...availabilitySettings,
                            days: newDays,
                          });
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-16-medium">Start Time</h4>
                    <Select
                      value={availabilitySettings.startTime.toString()}
                      onValueChange={(value) => {
                        setAvailabilitySettings((prev) => ({
                          ...prev,
                          startTime: parseInt(value),
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Select start time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => i + 7).map(
                          (hour) => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour === 0
                                ? "12:00 AM"
                                : hour < 12
                                  ? `${hour}:00 AM`
                                  : hour === 12
                                    ? "12:00 PM"
                                    : `${hour - 12}:00 PM`}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-16-medium">End Time</h4>
                    <Select
                      value={availabilitySettings.endTime.toString()}
                      onValueChange={(value) => {
                        setAvailabilitySettings((prev) => ({
                          ...prev,
                          endTime: parseInt(value),
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Select end time" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 13 }, (_, i) => i + 12).map(
                          (hour) => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour === 0
                                ? "12:00 AM"
                                : hour < 12
                                  ? `${hour}:00 AM`
                                  : hour === 12
                                    ? "12:00 PM"
                                    : `${hour - 12}:00 PM`}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-16-medium">Appointment Booking Range</h4>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex flex-col">
                      <label className="text-sm mb-1">Start Date</label>
                      <Input
                        type="date"
                        value={availabilitySettings.bookingStartDate}
                        onChange={(e) =>
                          setAvailabilitySettings((prev) => ({
                            ...prev,
                            bookingStartDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-sm mb-1">End Date</label>
                      <Input
                        type="date"
                        value={availabilitySettings.bookingEndDate}
                        min={availabilitySettings.bookingStartDate}
                        onChange={(e) =>
                          setAvailabilitySettings((prev) => ({
                            ...prev,
                            bookingEndDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Patients can only book appointments within this date range.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-16-medium">Max Appointments Per Day</h4>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={availabilitySettings.maxAppointmentsPerDay}
                    onChange={(e) =>
                      setAvailabilitySettings((prev) => ({
                        ...prev,
                        maxAppointmentsPerDay: Math.max(
                          1,
                          Math.min(100, Number(e.target.value) || 1)
                        ),
                      }))
                    }
                    className="w-32"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Patients can only book up to this number of appointments per
                    day.
                  </p>
                </div>

                {/* Blocked Time Slots Section */}
                <div className="space-y-2 mt-6">
                  <h4 className="text-16-medium">Blocked Time Slots</h4>
                  <p className="text-xs text-gray-500">
                    Block specific time slots that should not be available for
                    appointments.
                  </p>

                  {/* Add new blocked time slot */}
                  <div className="border rounded-md p-3 space-y-3">
                    <h5 className="text-sm font-medium">
                      Add New Blocked Time Slot
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm block mb-1">Date</label>
                        <Input
                          type="date"
                          className="w-full"
                          onChange={(e) => {
                            setAvailabilitySettings((prev) => ({
                              ...prev,
                              newBlockedSlot: {
                                ...(prev.newBlockedSlot || {}),
                                date: e.target.value,
                              },
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm block mb-1">Start Time</label>
                        <Input
                          type="time"
                          className="w-full"
                          onChange={(e) => {
                            setAvailabilitySettings((prev) => ({
                              ...prev,
                              newBlockedSlot: {
                                ...(prev.newBlockedSlot || {}),
                                startTime: e.target.value,
                              },
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm block mb-1">End Time</label>
                        <Input
                          type="time"
                          className="w-full"
                          onChange={(e) => {
                            setAvailabilitySettings((prev) => ({
                              ...prev,
                              newBlockedSlot: {
                                ...(prev.newBlockedSlot || {}),
                                endTime: e.target.value,
                              },
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm block mb-1">Reason</label>
                        <Input
                          type="text"
                          placeholder="Lunch, Meeting, etc."
                          className="w-full"
                          onChange={(e) => {
                            setAvailabilitySettings((prev) => ({
                              ...prev,
                              newBlockedSlot: {
                                ...(prev.newBlockedSlot || {}),
                                reason: e.target.value,
                              },
                            }));
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full mt-2"
                      onClick={() => {
                        // Add new blocked slot to the list
                        if (
                          availabilitySettings.newBlockedSlot?.date &&
                          availabilitySettings.newBlockedSlot?.startTime &&
                          availabilitySettings.newBlockedSlot?.endTime
                        ) {
                          const newSlot = {
                            date: format(
                              new Date(
                                availabilitySettings.newBlockedSlot.date
                              ),
                              "MMM dd, yyyy"
                            ),
                            startTime:
                              availabilitySettings.newBlockedSlot.startTime,
                            endTime:
                              availabilitySettings.newBlockedSlot.endTime,
                            reason:
                              availabilitySettings.newBlockedSlot.reason ||
                              "Unavailable",
                          };

                          setAvailabilitySettings((prev) => ({
                            ...prev,
                            blockedTimeSlots: [
                              ...prev.blockedTimeSlots,
                              newSlot,
                            ],
                            newBlockedSlot: undefined,
                          }));
                        }
                      }}
                    >
                      Add Blocked Time Slot
                    </Button>
                  </div>

                  {/* List of blocked time slots */}
                  <div className="mt-4">
                    <h5 className="text-sm font-medium mb-2">
                      Current Blocked Time Slots
                    </h5>

                    {!availabilitySettings.blockedTimeSlots ||
                    availabilitySettings.blockedTimeSlots.length === 0 ? (
                      <p className="text-14-regular text-dark-600 dark:text-gray-400">
                        No time slots blocked
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {availabilitySettings.blockedTimeSlots.map(
                          (slot, i) => (
                            <div
                              key={i}
                              className="rounded-md border border-gray-200 dark:border-dark-500 bg-white dark:bg-dark-400 shadow-sm overflow-hidden"
                            >
                              <div className="bg-gray-50 dark:bg-dark-300 px-3 py-2 flex justify-between items-center border-b border-gray-200 dark:border-dark-500">
                                <span className="font-medium text-sm text-gray-900 dark:text-white">
                                  {slot.date}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setAvailabilitySettings((prev) => ({
                                      ...prev,
                                      blockedTimeSlots:
                                        prev.blockedTimeSlots.filter(
                                          (_, index) => index !== i
                                        ),
                                    }));
                                  }}
                                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </Button>
                              </div>
                              <div className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Time:
                                  </span>
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                    {slot.startTime} - {slot.endTime}
                                  </span>
                                </div>
                                <div className="flex items-start">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Reason:
                                  </span>
                                  <span className="text-sm ml-1 flex-1 text-gray-700 dark:text-gray-200">
                                    {slot.reason}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-16-medium font-semibold">
                Holidays/Time Off
              </h3>
              <div className="dashboard-card p-4">
                <div className="border rounded-md p-3 mb-3">
                  <p className="text-sm text-dark-600 dark:text-gray-300 mb-2">
                    Select dates to mark as holidays:
                  </p>
                  <Input
                    type="date"
                    className="mb-2 bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
                    onChange={(e) => {
                      const selectedDate = new Date(e.target.value);
                      if (!isNaN(selectedDate.getTime())) {
                        // Check if date already exists
                        const exists = selectedDates.some(
                          (date) =>
                            date.toDateString() === selectedDate.toDateString()
                        );
                        if (!exists) {
                          setSelectedDates((prev) => [...prev, selectedDate]);
                        }
                      }
                    }}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <h4 className="text-16-medium">Selected Dates</h4>
                  <div className="max-h-40 overflow-y-auto">
                    {selectedDates.length === 0 ? (
                      <p className="text-14-regular text-dark-600 dark:text-gray-400">
                        No dates selected
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDates.map((date, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center bg-gray-50 dark:bg-dark-400 p-2 rounded-md"
                          >
                            <span className="text-gray-900 dark:text-white">
                              {format(date, "MMM dd, yyyy")}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedDates((prev) =>
                                  prev.filter(
                                    (d) => d.getTime() !== date.getTime()
                                  )
                                );
                              }}
                              className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <Button
                    onClick={() => {
                      setAvailabilitySettings((prev) => ({
                        ...prev,
                        holidays: [...selectedDates],
                      }));
                      toast({
                        title: "Success",
                        description:
                          "Holidays added to your availability settings!",
                        variant: "default",
                      });
                    }}
                    className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900 w-full"
                    disabled={selectedDates.length === 0}
                  >
                    Add Selected Dates as Holidays
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAvailabilityModal(false)}
              className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-500"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveAvailabilitySettings();
                setShowAvailabilityModal(false);
              }}
              className="save-availability-btn bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900"
            >
              Save Availability Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dashboard Content */}
      <div className="mx-auto max-w-7xl flex flex-col space-y-8 px-4 sm:px-6 lg:px-8">
        <header className="flex justify-between items-center py-4">
          <Link href="/" className="cursor-pointer">
            <Image
              src="/assets/icons/logo-full.svg"
              height={32}
              width={162}
              alt="logo"
              className="h-8"
            />
          </Link>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2 rounded-full overflow-hidden border-2 border-dark-500 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-dark-300 transition-all duration-200">
                  <Avatar className="h-10 w-10 cursor-pointer">
                    <AvatarImage
                      src={`/assets/images/doctors/${currentDoctorId || "default"}.jpg`}
                      alt={`Dr. ${currentDoctor}`}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500/80 to-blue-700/80 text-white">
                      {currentDoctor
                        ? currentDoctor.substring(0, 2).toUpperCase()
                        : "DR"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">Dr. {currentDoctor}</span>
                    <span className="text-xs text-gray-400">Doctor</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowAvailabilityModal(true)}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Availability Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/doctor/archived")}
                  className="cursor-pointer"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Archived Appointments</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-500 cursor-pointer focus:text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="admin-main">
          <section className="space-y-4 w-full">
            <h1 className="text-3xl font-semibold">
              Good to see you again, Dr.{" "}
              <span className="text-blue-600 font-bold dark:text-blue-400 dark:drop-shadow-glow">
                {currentDoctor}
              </span>
              !
            </h1>
            <p className="text-14-regular text-dark-700">
              Manage your appointments, patient information, and more
            </p>

            {/* Navigation Tabs */}
            <Tabs
              defaultValue="overview"
              className="w-full"
              onValueChange={setActiveTab}
            >
              <TabsList className="grid grid-cols-1 md:grid-cols-4 mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="all-appointments">Appointments</TabsTrigger>
                <TabsTrigger
                  value="patients"
                  onClick={() => {
                    if (Object.keys(uniquePatients).length === 0) {
                      fetchPatients();
                    }
                  }}
                >
                  Patients
                </TabsTrigger>
                <TabsTrigger value="schedule">Calendar</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                  <StatCard
                    type="appointments"
                    count={filteredAppointments.scheduledCount}
                    label="Scheduled appointments"
                    icon={"/assets/icons/scheduled.svg"}
                  />
                  <StatCard
                    type="cancelled"
                    count={filteredAppointments.cancelledCount}
                    label="Cancelled appointments"
                    icon={"/assets/icons/cancelled.svg"}
                  />
                  <StatCard
                    type="appointments"
                    count={
                      filteredAppointments.scheduledCount > 0
                        ? filteredAppointments.documents.filter(
                            (apt: Appointment) =>
                              new Date(apt.schedule).toDateString() ===
                                new Date().toDateString() &&
                              apt.status === "scheduled"
                          ).length
                        : 0
                    }
                    label="Today's appointments"
                    icon={"/assets/icons/today.svg"}
                  />
                  <StatCard
                    type="completed"
                    count={filteredAppointments.completedCount}
                    label="Completed appointments"
                    icon={"/assets/icons/check.svg"}
                  />
                  <StatCard
                    type="missed"
                    count={filteredAppointments.missedCount}
                    label="Missed appointments"
                    icon={"/assets/icons/missed.svg"}
                  />
                </section>

                {loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-lg font-medium">
                      Loading appointments...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">
                        Recent Appointments
                      </h2>
                    </div>
                    <DataTable
                      columns={columns}
                      data={filteredAppointments.documents.slice(0, 10)}
                    />
                  </div>
                )}
              </TabsContent>

              {/* All Appointments Tab */}
              <TabsContent value="all-appointments" className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">All Appointments</h2>
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="Search appointments..."
                        className="w-60"
                        value={appointmentSearch}
                        onChange={(e) => setAppointmentSearch(e.target.value)}
                      />
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:bg-blue-50"
                        onClick={() => {
                          setAppointmentSearch("");
                          setStatusFilter("all");
                        }}
                        disabled={
                          !appointmentSearch &&
                          (!statusFilter || statusFilter === "all")
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <path d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"></path>
                        </svg>
                        Reset Filters
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-700 hover:bg-red-50"
                        onClick={() => setShowClearHistoryDialog(true)}
                        disabled={allDoctorAppointments.length === 0}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        Clear History
                      </Button>
                    </div>
                  </div>
                  {loadingAllAppointments ? (
                    <div className="flex h-40 items-center justify-center">
                      <p className="text-lg font-medium">
                        Loading appointments...
                      </p>
                    </div>
                  ) : (
                    <DataTable
                      columns={columns}
                      data={allDoctorAppointments.filter((appointment) => {
                        // Apply status filter
                        if (
                          statusFilter &&
                          statusFilter !== "all" &&
                          appointment.status !== statusFilter
                        ) {
                          return false;
                        }

                        // If no search query, return all appointments that match the status filter
                        if (!appointmentSearch) {
                          return true;
                        }

                        // Apply search filter
                        const searchLower = appointmentSearch.toLowerCase();

                        // Search in patient name
                        if (
                          appointment.patient?.name &&
                          appointment.patient.name
                            .toLowerCase()
                            .includes(searchLower)
                        ) {
                          return true;
                        }
                        // Search in appointment code
                        if (
                          appointment.appointmentCode &&
                          appointment.appointmentCode
                            .toLowerCase()
                            .includes(searchLower)
                        ) {
                          return true;
                        }
                        // Search in reason
                        if (
                          appointment.reason &&
                          appointment.reason.toLowerCase().includes(searchLower)
                        ) {
                          return true;
                        }

                        return false;
                      })}
                    />
                  )}
                </div>
              </TabsContent>

              {/* Patients Tab */}
              <TabsContent value="patients" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Patient Management</h2>
                  <Input
                    placeholder="Search patients..."
                    className="max-w-xs"
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                </div>

                {loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-lg font-medium">
                      Loading patient data...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-16-medium">
                      Total Unique Patients:{" "}
                      {Object.keys(uniquePatients).length}
                    </h3>
                    <DataTable
                      columns={columns.filter(
                        (col) =>
                          "accessorKey" in col &&
                          (col.accessorKey === "patient" ||
                            col.accessorKey === "patientDetails")
                      )}
                      data={Object.values(uniquePatients).filter(
                        (appointment) =>
                          !patientSearch ||
                          (appointment.patient?.name &&
                            appointment.patient.name
                              .toLowerCase()
                              .includes(patientSearch.toLowerCase())) ||
                          (appointment.patient?.email &&
                            appointment.patient.email
                              .toLowerCase()
                              .includes(patientSearch.toLowerCase()))
                      )}
                    />
                  </div>
                )}
              </TabsContent>

              {/* Schedule Tab - New Calendar View */}
              <TabsContent value="schedule" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">
                    Appointments Calendar
                  </h2>
                </div>

                {loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-lg font-medium">
                      Loading appointments...
                    </p>
                  </div>
                ) : (
                  <AppointmentCalendar
                    appointments={filteredAppointments.documents}
                  />
                )}
              </TabsContent>
            </Tabs>
          </section>
        </main>
      </div>
    </>
  );
};

export default DoctorDashboard;

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
import { validatePasskey as validatePasskeyAPI } from "@/lib/utils/validatePasskey";

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
import { type } from "os";

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
  }>;
  newBlockedSlot?: {
    date?: string;
    startTime?: string;
    endTime?: string;
  };
  blockingDateRange?: {
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
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
  const [patientCategoryFilter, setPatientCategoryFilter] = useState("all");

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

      // Show a loading state or indicator
      console.log(`Fetching patients for doctor: ${doctorName}`);

      // Call our new API endpoint to get all patients
      const response = await fetch(
        `/api/patients/doctor?name=${encodeURIComponent(doctorName)}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to fetch patients. Status: ${response.status}`,
          errorText
        );
        toast({
          title: "Error",
          description: "Failed to load patient data. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();
      console.log(
        `Patient data response: Success=${data.success}, Count=${data.count || "N/A"}`
      );

      if (data.success && data.patients) {
        const patientCount = Object.keys(data.patients).length;
        console.log(`Setting ${patientCount} patients to state`);

        // Set the uniquePatients state with this data
        setUniquePatients(data.patients);

        // Log some information about the first patient to verify data structure
        if (patientCount > 0) {
          const firstPatientKey = Object.keys(data.patients)[0];
          const firstPatient = data.patients[firstPatientKey];
          console.log("Sample patient data structure:", {
            hasPatientObject: !!firstPatient.patient,
            patientId: firstPatient.patient?.$id || "missing",
            patientProperties: firstPatient.patient
              ? Object.keys(firstPatient.patient)
              : [],
          });
        }
      } else {
        console.error("API returned success=false or no patients", data);
        toast({
          title: "Warning",
          description:
            "No patient data found. This could be your first time using the system.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast({
        title: "Error",
        description: "Failed to load patient data due to an unexpected error.",
        variant: "destructive",
      });
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
      const isValid = await validatePasskeyAPI(passkey, doctorType);

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
      doctor.availability = updatedAvailability as any;

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
      const currentPatients = { ...uniquePatients };

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

      // Clear the appointment displays
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

      // Preserve the patient data by manually refreshing patient list
      // This ensures patients remain visible even when all appointments are archived
      console.log("Refreshing patient data after clearing appointments");
      await fetchPatients();

      // If patients were lost during the clear, restore them from our stored copy
      if (
        Object.keys(uniquePatients).length === 0 &&
        Object.keys(currentPatients).length > 0
      ) {
        console.log("Restoring patient data from stored copy");
        setUniquePatients(currentPatients);
      }

      setShowClearHistoryDialog(false);
      toast({
        title: "Success",
        description:
          "Appointment history cleared successfully! Patient data preserved.",
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

  // Helper function to convert 24-hour format to 12-hour format
  const formatTo12Hour = (time24: string): string => {
    if (!time24) return "";

    const [hourStr, minute] = time24.split(":");
    const hour = parseInt(hourStr, 10);

    if (isNaN(hour)) return time24;

    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

    return `${hour12}:${minute} ${period}`;
  };

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
        <DialogContent className="sm:max-w-[900px] xl:max-w-[1200px] 2xl:max-w-[1400px] z-50 bg-white dark:bg-dark-300 border border-gray-100 dark:border-gray-700 shadow-xl">
          <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Availability Settings
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Configure your working hours and time off
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 xl:gap-8">
            <div className="col-span-1 space-y-4">
              <h3 className="text-16-medium font-semibold text-gray-800 dark:text-gray-100">
                Working Hours
              </h3>
              <div className="dashboard-card p-4 xl:p-6 space-y-5 h-full bg-white dark:bg-dark-400 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Set your regular working days and hours when patients can book
                  appointments.
                </div>

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
                          "h-9 w-12",
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
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setAvailabilitySettings({
                          ...availabilitySettings,
                          days: [1, 2, 3, 4, 5], // Mon-Fri
                        });
                      }}
                    >
                      Weekdays
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setAvailabilitySettings({
                          ...availabilitySettings,
                          days: [0, 6], // Sat-Sun
                        });
                      }}
                    >
                      Weekends
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        setAvailabilitySettings({
                          ...availabilitySettings,
                          days: [0, 1, 2, 3, 4, 5, 6], // All days
                        });
                      }}
                    >
                      All Days
                    </Button>
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

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setAvailabilitySettings({
                        ...availabilitySettings,
                        startTime: 8,
                        endTime: 17,
                      });
                    }}
                  >
                    8AM - 5PM
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setAvailabilitySettings({
                        ...availabilitySettings,
                        startTime: 9,
                        endTime: 18,
                      });
                    }}
                  >
                    9AM - 6PM
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setAvailabilitySettings({
                        ...availabilitySettings,
                        startTime: 10,
                        endTime: 19,
                      });
                    }}
                  >
                    10AM - 7PM
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-16-medium">Appointment Booking Range</h4>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex flex-col">
                      <label className="text-sm mb-1 text-gray-700 dark:text-gray-300">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        className="w-full text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
                      <label className="text-sm mb-1 text-gray-700 dark:text-gray-300">
                        End Date
                      </label>
                      <Input
                        type="date"
                        className="w-full text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
                    Leave empty for no restrictions.
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
              </div>
            </div>

            {/* Blocked Time Slots - Now in its own column */}
            <div className="col-span-1 space-y-4">
              <h3 className="text-16-medium font-semibold text-gray-800 dark:text-gray-100">
                Blocked Time Slots
              </h3>
              <div className="dashboard-card p-4 xl:p-6 space-y-5 h-full bg-white dark:bg-dark-400 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Block specific times when you're unavailable for appointments,
                  such as lunch breaks or meetings.
                </div>

                {/* Add new blocked time slot */}
                <div className="border rounded-md p-3 space-y-3 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-500/30">
                  <h5 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Add New Blocked Time
                  </h5>

                  <div className="flex space-x-2 mb-3">
                    <Tabs defaultValue="single" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-3 bg-gray-100 dark:bg-dark-600 p-1 rounded-md">
                        <TabsTrigger
                          value="single"
                          className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-dark-400 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
                        >
                          Single Day
                        </TabsTrigger>
                        <TabsTrigger
                          value="range"
                          className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-dark-400 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
                        >
                          Date Range
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="single" className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm block mb-1">Date</label>
                            <Input
                              type="date"
                              className="w-full text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
                            <label className="text-sm block mb-1">
                              Start Time
                            </label>
                            <Input
                              type="time"
                              className="w-full text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
                            <label className="text-sm block mb-1">
                              End Time
                            </label>
                            <Input
                              type="time"
                              className="w-full text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
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
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {/* Preset buttons removed */}
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
                          Add Single Day Block
                        </Button>
                      </TabsContent>

                      <TabsContent value="range" className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm block mb-1">
                              Start Date
                            </label>
                            <Input
                              type="date"
                              className="w-full text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                              onChange={(e) => {
                                setAvailabilitySettings((prev) => ({
                                  ...prev,
                                  blockingDateRange: {
                                    ...(prev.blockingDateRange || {}),
                                    startDate: e.target.value,
                                  },
                                }));
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-sm block mb-1">
                              End Date
                            </label>
                            <Input
                              type="date"
                              className="w-full text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                              onChange={(e) => {
                                setAvailabilitySettings((prev) => ({
                                  ...prev,
                                  blockingDateRange: {
                                    ...(prev.blockingDateRange || {}),
                                    endDate: e.target.value,
                                  },
                                }));
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-sm block mb-1">
                              Start Time
                            </label>
                            <Input
                              type="time"
                              className="w-full text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                              onChange={(e) => {
                                setAvailabilitySettings((prev) => ({
                                  ...prev,
                                  blockingDateRange: {
                                    ...(prev.blockingDateRange || {}),
                                    startTime: e.target.value,
                                  },
                                }));
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-sm block mb-1">
                              End Time
                            </label>
                            <Input
                              type="time"
                              className="w-full text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                              onChange={(e) => {
                                setAvailabilitySettings((prev) => ({
                                  ...prev,
                                  blockingDateRange: {
                                    ...(prev.blockingDateRange || {}),
                                    endTime: e.target.value,
                                  },
                                }));
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              // Set for next week, all day
                              const today = new Date();
                              const nextMonday = new Date(today);
                              nextMonday.setDate(
                                today.getDate() + ((8 - today.getDay()) % 7)
                              );
                              const nextFriday = new Date(nextMonday);
                              nextFriday.setDate(nextMonday.getDate() + 4);

                              setAvailabilitySettings((prev) => ({
                                ...prev,
                                blockingDateRange: {
                                  startDate: nextMonday
                                    .toISOString()
                                    .split("T")[0],
                                  endDate: nextFriday
                                    .toISOString()
                                    .split("T")[0],
                                  startTime: "08:00",
                                  endTime: "17:00",
                                },
                              }));
                            }}
                          >
                            Next Week
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              // Set for lunch hours (12-1) for the next 5 days
                              const today = new Date();
                              const fiveDaysLater = new Date(today);
                              fiveDaysLater.setDate(today.getDate() + 4);

                              setAvailabilitySettings((prev) => ({
                                ...prev,
                                blockingDateRange: {
                                  startDate: today.toISOString().split("T")[0],
                                  endDate: fiveDaysLater
                                    .toISOString()
                                    .split("T")[0],
                                  startTime: "12:00",
                                  endTime: "13:00",
                                },
                              }));
                            }}
                          >
                            Lunch This Week
                          </Button>
                        </div>

                        <Button
                          className="w-full mt-2 text-white dark:text-gray-900"
                          onClick={() => {
                            // Generate a series of blocked slots for each day in the range
                            if (
                              availabilitySettings.blockingDateRange
                                ?.startDate &&
                              availabilitySettings.blockingDateRange?.endDate &&
                              availabilitySettings.blockingDateRange
                                ?.startTime &&
                              availabilitySettings.blockingDateRange?.endTime
                            ) {
                              const startDate = new Date(
                                availabilitySettings.blockingDateRange.startDate
                              );
                              const endDate = new Date(
                                availabilitySettings.blockingDateRange.endDate
                              );
                              const newSlots: Array<{
                                date: string;
                                startTime: string;
                                endTime: string;
                              }> = [];

                              // Create a slot for each day in the range
                              const currentDate = new Date(startDate);
                              while (currentDate <= endDate) {
                                newSlots.push({
                                  date: format(
                                    new Date(currentDate),
                                    "MMM dd, yyyy"
                                  ),
                                  startTime:
                                    availabilitySettings.blockingDateRange
                                      .startTime,
                                  endTime:
                                    availabilitySettings.blockingDateRange
                                      .endTime,
                                });

                                // Move to next day
                                currentDate.setDate(currentDate.getDate() + 1);
                              }

                              // Add all the new slots
                              setAvailabilitySettings((prev) => ({
                                ...prev,
                                blockedTimeSlots: [
                                  ...prev.blockedTimeSlots,
                                  ...newSlots,
                                ],
                                blockingDateRange: undefined,
                              }));

                              toast({
                                title: "Date Range Blocked",
                                description: `Blocked ${newSlots.length} days from ${format(startDate, "MMM dd")} to ${format(endDate, "MMM dd")}`,
                                variant: "default",
                              });
                            }
                          }}
                        >
                          Add Date Range Block
                        </Button>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>

                {/* Display of the blocked time slots */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-sm font-medium">
                      Current Blocked Time Slots
                    </h5>
                    {availabilitySettings.blockedTimeSlots &&
                      availabilitySettings.blockedTimeSlots.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          onClick={() => {
                            setAvailabilitySettings((prev) => ({
                              ...prev,
                              blockedTimeSlots: [],
                            }));
                            toast({
                              title: "Cleared All Blocks",
                              description:
                                "All blocked time slots have been removed",
                              variant: "default",
                            });
                          }}
                        >
                          Clear All
                        </Button>
                      )}
                  </div>

                  {!availabilitySettings.blockedTimeSlots ||
                  availabilitySettings.blockedTimeSlots.length === 0 ? (
                    <div className="text-center p-4 bg-gray-50 dark:bg-dark-500/20 rounded-md">
                      <p className="text-14-regular text-gray-600 dark:text-gray-400">
                        No time slots blocked
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Add blocked times using the form above
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-[350px] xl:max-h-[400px] overflow-y-auto pr-1">
                      {availabilitySettings.blockedTimeSlots.map((slot, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 shadow-sm overflow-hidden hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all duration-200"
                        >
                          <div className="bg-gray-50 dark:bg-dark-500 px-3 py-2 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
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
                              className="h-6 w-6 p-0 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
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
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Time:
                              </span>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {formatTo12Hour(slot.startTime)} -{" "}
                                {formatTo12Hour(slot.endTime)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-1 space-y-4">
              <h3 className="text-16-medium font-semibold">
                Holidays/Time Off
              </h3>
              <div className="dashboard-card p-4 xl:p-6 h-full space-y-5 bg-white dark:bg-dark-400 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Set full days when you're unavailable for appointments, such
                  as holidays or vacation days.
                </div>

                <div className="border rounded-md p-3 mb-3">
                  <p className="text-sm text-dark-600 dark:text-gray-300 mb-2">
                    Select dates to mark as holidays:
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      className="mb-2 bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        if (!isNaN(selectedDate.getTime())) {
                          // Check if date already exists
                          const exists = selectedDates.some(
                            (date) =>
                              date.toDateString() ===
                              selectedDate.toDateString()
                          );
                          if (!exists) {
                            setSelectedDates((prev) => [...prev, selectedDate]);
                          }
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        // Add today
                        const today = new Date();
                        const exists = selectedDates.some(
                          (date) => date.toDateString() === today.toDateString()
                        );
                        if (!exists) {
                          setSelectedDates((prev) => [...prev, today]);
                        }
                      }}
                    >
                      Today
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      // Add next weekend
                      const today = new Date();
                      const nextSaturday = new Date(today);
                      nextSaturday.setDate(
                        today.getDate() + ((6 - today.getDay()) % 7)
                      );
                      const nextSunday = new Date(nextSaturday);
                      nextSunday.setDate(nextSaturday.getDate() + 1);

                      // Check if dates already exist
                      const satExists = selectedDates.some(
                        (date) =>
                          date.toDateString() === nextSaturday.toDateString()
                      );
                      const sunExists = selectedDates.some(
                        (date) =>
                          date.toDateString() === nextSunday.toDateString()
                      );

                      setSelectedDates((prev) => [
                        ...prev,
                        ...(!satExists ? [nextSaturday] : []),
                        ...(!sunExists ? [nextSunday] : []),
                      ]);
                    }}
                  >
                    Next Weekend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      // Clear selected dates
                      setSelectedDates([]);
                    }}
                  >
                    Clear Selection
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-16-medium">Selected Dates</h4>
                    <span className="text-xs text-gray-500">
                      {selectedDates.length} date(s) selected
                    </span>
                  </div>
                  <div className="max-h-[350px] xl:max-h-[400px] overflow-y-auto">
                    {selectedDates.length === 0 ? (
                      <div className="text-center p-4 bg-gray-50 dark:bg-dark-500/20 rounded-md">
                        <p className="text-14-regular text-dark-600 dark:text-gray-400">
                          No dates selected
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Select dates using the calendar above
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedDates
                          .sort((a, b) => a.getTime() - b.getTime())
                          .map((date, i) => (
                            <div
                              key={i}
                              className="flex justify-between items-center bg-gray-50 dark:bg-dark-400 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-300 transition-colors"
                            >
                              <span className="text-gray-900 dark:text-white">
                                {format(date, "EEE, MMM dd, yyyy")}
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

          <DialogFooter className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setShowAvailabilityModal(false)}
              className="bg-white dark:bg-dark-500 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-600"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                saveAvailabilitySettings();
                setShowAvailabilityModal(false);
              }}
              className="save-availability-btn bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
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
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
              Good to see you again, Dr.{" "}
              <span className="text-blue-600 font-bold dark:text-blue-400 dark:drop-shadow-glow">
                {currentDoctor}
              </span>
              !
            </h1>
            <p className="text-14-regular text-dark-700 dark:text-dark-700">
              Manage your appointments, patient information, and more
            </p>

            {/* Navigation Tabs */}
            <Tabs
              defaultValue="overview"
              className="w-full"
              onValueChange={setActiveTab}
            >
              <TabsList className="grid grid-cols-1 md:grid-cols-4 mb-4 text-gray-700 dark:text-gray-300">
                <TabsTrigger
                  value="overview"
                  className="text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 data-[state=active]:dark:text-white"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="all-appointments"
                  className="text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 data-[state=active]:dark:text-white"
                >
                  Appointments
                </TabsTrigger>
                <TabsTrigger
                  value="patients"
                  className="text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 data-[state=active]:dark:text-white"
                  onClick={() => {
                    if (Object.keys(uniquePatients).length === 0) {
                      fetchPatients();
                    }
                  }}
                >
                  Patients
                </TabsTrigger>
                <TabsTrigger
                  value="schedule"
                  className="text-gray-700 dark:text-gray-300 data-[state=active]:text-gray-900 data-[state=active]:dark:text-white"
                >
                  Calendar
                </TabsTrigger>
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
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
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
                        className="w-60 text-gray-900 dark:text-white"
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
                          <SelectItem value="missed">Missed</SelectItem>
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
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
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
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Patient Management
                  </h2>
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Search patients..."
                      className="max-w-xs text-gray-900 dark:text-white"
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                    <Select
                      value={patientCategoryFilter}
                      onValueChange={setPatientCategoryFilter}
                    >
                      <SelectTrigger className="w-[180px] text-gray-900 dark:text-white">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500">
                        <SelectItem
                          value="all"
                          className="text-gray-900 dark:text-white"
                        >
                          All Categories
                        </SelectItem>
                        <SelectItem
                          value="student"
                          className="text-gray-900 dark:text-white"
                        >
                          Students
                        </SelectItem>
                        <SelectItem
                          value="employee"
                          className="text-gray-900 dark:text-white"
                        >
                          Employees
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                      onClick={() => {
                        setPatientSearch("");
                        setPatientCategoryFilter("all");
                      }}
                      disabled={
                        !patientSearch &&
                        (!patientCategoryFilter ||
                          patientCategoryFilter === "all")
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
                  </div>
                </div>

                {loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                      Loading patient data...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-16-medium text-gray-800 dark:text-gray-100">
                        Total Unique Patients:{" "}
                        {Object.keys(uniquePatients).length}
                      </h3>
                      {patientCategoryFilter !== "all" && (
                        <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1.5 rounded-md text-sm text-blue-700 dark:text-blue-300">
                          Showing{" "}
                          {patientCategoryFilter === "student"
                            ? "Students"
                            : "Employees"}{" "}
                          only
                        </div>
                      )}
                    </div>
                    <DataTable
                      columns={columns.filter(
                        (col) =>
                          "accessorKey" in col &&
                          (col.accessorKey === "patient" ||
                            col.accessorKey === "patientDetails")
                      )}
                      data={(() => {
                        // Start with all patients
                        const allPatients = Object.values(uniquePatients);
                        console.log(
                          `Total patients before filtering: ${allPatients.length}`
                        );

                        // Apply filters
                        const filteredPatients = allPatients.filter(
                          (appointment) => {
                            // Validate patient object exists
                            if (!appointment || !appointment.patient) {
                              console.log(
                                "Found appointment without patient object:",
                                appointment
                              );
                              return false;
                            }

                            // Apply category filter
                            if (patientCategoryFilter !== "all") {
                              const patientCategory =
                                appointment.patient?.category?.toLowerCase() ||
                                "";
                              if (
                                patientCategoryFilter === "student" &&
                                !patientCategory.includes("student")
                              ) {
                                return false;
                              }
                              if (
                                patientCategoryFilter === "employee" &&
                                !patientCategory.includes("employee")
                              ) {
                                return false;
                              }
                            }

                            // Apply search filter
                            if (!patientSearch) {
                              return true;
                            }

                            const searchLower = patientSearch.toLowerCase();
                            return (
                              (appointment.patient?.name &&
                                appointment.patient.name
                                  .toLowerCase()
                                  .includes(searchLower)) ||
                              (appointment.patient?.email &&
                                appointment.patient.email
                                  .toLowerCase()
                                  .includes(searchLower)) ||
                              (appointment.patient?.phone &&
                                appointment.patient.phone
                                  .toLowerCase()
                                  .includes(searchLower)) ||
                              (appointment.patient?.category &&
                                appointment.patient.category
                                  .toLowerCase()
                                  .includes(searchLower))
                            );
                          }
                        );

                        console.log(
                          `Patients after filtering: ${filteredPatients.length}`
                        );
                        return filteredPatients;
                      })()}
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
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
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

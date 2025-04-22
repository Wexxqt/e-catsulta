"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/table/DataTable";
import { columns } from "@/components/table/doctor-columns";
import { getRecentAppointmentList, getDoctorAppointments } from "@/lib/actions/appointment.actions";
import { createPatientNote, getPatientNotes } from "@/lib/actions/patient-notes.actions";
import { Doctors } from "@/constants";
import { Appointment, Patient, PatientNote } from "@/types/appwrite.types";
import { decryptKey, encryptKey, formatDateTime } from "@/lib/utils";

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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Add import for the AppointmentCalendar component
import AppointmentCalendar from "@/components/AppointmentCalendar";

interface AppointmentState {
  documents: Appointment[];
  scheduledCount: number;
  pendingCount: number;
  cancelledCount: number;
  completedCount: number;
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

const DoctorDashboard = () => {
  const [allAppointments, setAllAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentState>({
    documents: [],
    scheduledCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
    completedCount: 0,
    totalCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentDoctor, setCurrentDoctor] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Calendar state
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [availabilitySettings, setAvailabilitySettings] = useState({
    days: [1, 2, 3, 4, 5], // Monday to Friday by default
    startTime: 8,
    endTime: 17,
    holidays: [] as Date[]
  });
  
  // Patient state
  const [patientSearch, setPatientSearch] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [uniquePatients, setUniquePatients] = useState<{[patientId: string]: Appointment}>({});
  
  // Clear history state
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  
  const router = useRouter();

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const encryptedKey = typeof window !== "undefined" 
        ? window.localStorage.getItem("doctorAccessKey") 
        : null;
      
      const doctorName = localStorage.getItem("doctorName");
      const hasValidKey = encryptedKey && doctorName && Doctors.some(doc => doc.name === doctorName);
      
      if (!hasValidKey) {
        setShowAuthModal(true);
        return false;
      }
      
      setCurrentDoctor(doctorName);
      return true;
    };
    
    const isAuthenticated = checkAuth();
    
    if (isAuthenticated) {
      // Fetch appointments
      fetchAppointments();
      
      // Load doctor availability settings
      const doctor = Doctors.find(doc => doc.name === localStorage.getItem("doctorName"));
      if (doctor) {
        setAvailabilitySettings({
          days: doctor.availability.days,
          startTime: doctor.availability.startTime,
          endTime: doctor.availability.endTime,
          holidays: doctor.availability.holidays || []
        });
      }
    }
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
  }, [activeTab, uniquePatients]);

  const fetchAppointments = async () => {
    const doctorName = localStorage.getItem("doctorName");
    if (!doctorName) return;
    
    setLoading(true);
    try {
      const appointments = await getRecentAppointmentList() as AppointmentListResponse;
      
      if (appointments && appointments.documents) {
        // Filter appointments for the current doctor and exclude archived
        const doctorAppointments = appointments.documents
          .filter((doc: any) => 
            doc.primaryPhysician === doctorName && 
            !doc.archived
          ) as Appointment[];
        
        // Count appointments by status
        const counts = doctorAppointments.reduce(
          (acc: {scheduledCount: number, pendingCount: number, cancelledCount: number, completedCount: number}, 
           appointment: Appointment) => {
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
              case "completed":
                acc.completedCount++;
                break;
            }
            return acc;
          },
          { scheduledCount: 0, pendingCount: 0, cancelledCount: 0, completedCount: 0 }
        );

        // For the patient management tab, we need ALL appointments including archived ones
        // to create a complete patient list
        const allDoctorAppointments = appointments.documents
          .filter((doc: any) => doc.primaryPhysician === doctorName) as Appointment[];
        
        // Create unique patients object from ALL appointments
        const uniquePatientsObj: {[patientId: string]: Appointment} = {};
        
        allDoctorAppointments.forEach((appointment: Appointment) => {
          if (appointment.patient && appointment.patient.$id) {
            const patientId = appointment.patient.$id;
            
            // If we don't have this patient yet, or this appointment is more recent
            if (!uniquePatientsObj[patientId] || 
                new Date(appointment.schedule) > new Date(uniquePatientsObj[patientId].schedule)) {
              uniquePatientsObj[patientId] = appointment;
            }
          }
        });
        
        setUniquePatients(uniquePatientsObj);

        setFilteredAppointments({
          documents: doctorAppointments,
          scheduledCount: counts.scheduledCount,
          pendingCount: counts.pendingCount,
          cancelledCount: counts.cancelledCount,
          completedCount: counts.completedCount,
          totalCount: doctorAppointments.length
        });
      } else {
        console.error("Failed to fetch appointments");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const doctorName = localStorage.getItem("doctorName");
      if (!doctorName) return;
      
      // Call our new API endpoint to get all patients
      const response = await fetch(`/api/patients/doctor?name=${encodeURIComponent(doctorName)}`);
      
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

    const doctor = Doctors.find(doc => doc.name === selectedDoctor);
    if (!doctor) {
      setError("Invalid doctor selection.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simplified access to doctor passkeys
      let doctorPasskey = "";
      
      // Temporary hard-coded passkeys for testing
      if (doctor.id === "dr-abundo") {
        doctorPasskey = "123456"; // Replace with your actual passkey
      } else if (doctor.id === "dr-decastro") {
        doctorPasskey = "654321"; // Replace with your actual passkey 
      }
      
      if (passkey === doctorPasskey) {
        const encryptedKey = encryptKey(passkey);
        localStorage.setItem("doctorAccessKey", encryptedKey);
        localStorage.setItem("doctorName", selectedDoctor);

        setShowAuthModal(false);
        setCurrentDoctor(selectedDoctor);
        
        // Fetch appointments after successful authentication
        fetchAppointments();
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
      const saveBtn = document.querySelector('.save-availability-btn');
      if (saveBtn) {
        saveBtn.textContent = 'Saving...';
        saveBtn.setAttribute('disabled', 'true');
      }
      
      // Find the doctor in the constants
      const doctor = Doctors.find(doc => doc.name === doctorName);
      if (!doctor) {
        throw new Error("Doctor not found");
      }
      
      // Create API request to update doctor availability
      // In this case, we're using localStorage as intermediate storage
      // since we don't have a proper backend implementation yet
      
      // Create a new availability object with the current settings
      const updatedAvailability = {
        days: availabilitySettings.days,
        startTime: availabilitySettings.startTime,
        endTime: availabilitySettings.endTime,
        holidays: availabilitySettings.holidays || []
      };
      
      // Save to localStorage 
      localStorage.setItem(`doctorAvailability_${doctor.id}`, JSON.stringify(updatedAvailability));
      
      // Update the doctor object in memory
      doctor.availability = updatedAvailability;
      
      // Success notification
      alert("Availability settings updated successfully!");
    } catch (error) {
      console.error("Error saving availability settings:", error);
      alert("Failed to save availability settings. Please try again.");
    } finally {
      // Reset button state
      const saveBtn = document.querySelector('.save-availability-btn');
      if (saveBtn) {
        saveBtn.textContent = 'Save Availability Settings';
        saveBtn.removeAttribute('disabled');
      }
    }
  };

  // Add a useEffect to load saved availability settings from localStorage
  useEffect(() => {
    const loadSavedAvailability = () => {
      const doctorName = localStorage.getItem("doctorName");
      if (!doctorName) return;
      
      const doctor = Doctors.find(doc => doc.name === doctorName);
      if (!doctor) return;
      
      // Check for saved settings in localStorage
      const savedSettings = localStorage.getItem(`doctorAvailability_${doctor.id}`);
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          setAvailabilitySettings({
            days: parsedSettings.days || [1, 2, 3, 4, 5],
            startTime: parsedSettings.startTime || 8,
            endTime: parsedSettings.endTime || 17,
            holidays: parsedSettings.holidays || []
          });
          
          // Also update the doctor object with these settings
          doctor.availability = parsedSettings;
        } catch (err) {
          console.error("Error parsing saved availability settings:", err);
        }
      } else if (doctor.availability) {
        // Use the doctor's default availability from constants
        setAvailabilitySettings(doctor.availability);
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
      const response = await fetch('/api/appointments/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          doctorName,
          action: 'archive', // We'll archive rather than delete
          preservePatientData: true // This indicates we want to keep patient data
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear appointment history');
      }
      
      // Only update the appointments list, NOT the uniquePatients
      setFilteredAppointments({
        documents: [],
        scheduledCount: 0,
        pendingCount: 0,
        cancelledCount: 0,
        completedCount: 0,
        totalCount: 0
      });
      
      // Fetch patients again to ensure we have the most up-to-date data
      await fetchPatients();
      
      setShowClearHistoryDialog(false);
      alert("Appointment history cleared successfully!");
    } catch (error) {
      console.error("Error clearing appointment history:", error);
      alert("Failed to clear appointment history. Please try again.");
    } finally {
      setClearingHistory(false);
    }
  };

  return (
    <>
      {/* Authentication Modal */}
      <AlertDialog open={showAuthModal} onOpenChange={(isOpen) => {
        // Only allow closing via the close button or successful authentication
        if (!isOpen && !localStorage.getItem("doctorAccessKey")) {
          setShowAuthModal(true);
        } else {
          setShowAuthModal(isOpen);
        }
      }}>
        <AlertDialogContent className="shad-alert-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-start justify-between">
              Doctor Access Verification
              <Image
                src="/assets/icons/close.svg"
                alt="close"
                width={20}
                height={20}
                onClick={() => setShowAuthModal(false)}
                className="cursor-pointer"
              />
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please select your name and enter your passkey to access the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="doctor-select" className="text-sm font-medium text-gray-700">
                
              </label>
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
      <AlertDialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Appointment History</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your appointment history? This action cannot be undone.
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
            <button 
              onClick={handleLogout} 
              className="text-lg font-semibold"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="admin-main">
          <section className="space-y-4 w-full">
          <h1 className="text-3xl font-semibold">
    Good to see you again, Dr.{" "}
    <span className="text-blue-600 font-bold dark:text-blue-400 dark:drop-shadow-glow">
      {currentDoctor}
              </span>!
  </h1>
            <p className="text-14-regular text-dark-700">Manage your appointments, patient information, and more</p>
            
            {/* Navigation Tabs */}
            <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-1 md:grid-cols-4 mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
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
                <TabsTrigger value="availability">Availability</TabsTrigger>
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  type="appointments"
                  count={filteredAppointments.scheduledCount}
                  label="Scheduled appointments"
                  icon={"/assets/icons/appointments.svg"}
                />
                <StatCard
                  type="cancelled"
                  count={filteredAppointments.cancelledCount}
                  label="Cancelled appointments"
                  icon={"/assets/icons/cancelled.svg"}
                />
                  <StatCard
                    type="appointments"
                    count={filteredAppointments.scheduledCount > 0 ? 
                      filteredAppointments.documents.filter((apt: Appointment) => 
                        new Date(apt.schedule).toDateString() === new Date().toDateString() && 
                        apt.status === 'scheduled'
                      ).length : 0}
                    label="Today's appointments"
                    icon={"/assets/icons/today.svg"}
                />
                <StatCard
                  type="completed"
                  count={filteredAppointments.completedCount}
                  label="Completed appointments"
                  icon={"/assets/icons/check.svg"}
                />
              </section>

              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-lg font-medium">Loading appointments...</p>
                </div>
              ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Recent Appointments</h2>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-700 hover:bg-red-50"
                        onClick={() => setShowClearHistoryDialog(true)}
                        disabled={filteredAppointments.documents.length === 0}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        Clear History
                      </Button>
                    </div>
                <DataTable 
                  columns={columns} 
                  data={filteredAppointments.documents} 
                />
                  </div>
                )}
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
                    <p className="text-lg font-medium">Loading patient data...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-16-medium">
                      Total Unique Patients: {Object.keys(uniquePatients).length}
                    </h3>
                    <DataTable 
                      columns={columns.filter(col => 
                        ('accessorKey' in col && (
                          col.accessorKey === 'patient' || 
                          col.accessorKey === 'patientDetails'
                        ))
                      )} 
                      data={Object.values(uniquePatients)
                        .filter(appointment => 
                          !patientSearch || 
                          (appointment.patient?.name && 
                            appointment.patient.name.toLowerCase().includes(patientSearch.toLowerCase())) ||
                          (appointment.patient?.email && 
                            appointment.patient.email.toLowerCase().includes(patientSearch.toLowerCase()))
                        )} 
                    />
                  </div>
                )}
              </TabsContent>
              
              {/* Schedule Tab - New Calendar View */}
              <TabsContent value="schedule" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Appointments Calendar</h2>
                </div>
                
                {loading ? (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-lg font-medium">Loading appointments...</p>
                  </div>
                ) : (
                  <AppointmentCalendar appointments={filteredAppointments.documents} />
                )}
              </TabsContent>
              
              {/* Availability Tab */}
              <TabsContent value="availability" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold">Set Your Availability</h2>
                    <div className="dashboard-card p-4 space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-16-medium">Working Days</h3>
                        <div className="flex flex-wrap gap-2">
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                            <div key={day} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`day-${index}`} 
                                checked={availabilitySettings.days.includes(index)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setAvailabilitySettings(prev => ({
                                      ...prev,
                                      days: [...prev.days, index].sort()
                                    }));
                                  } else {
                                    setAvailabilitySettings(prev => ({
                                      ...prev,
                                      days: prev.days.filter(d => d !== index)
                                    }));
                                  }
                                }}
                              />
                              <Label htmlFor={`day-${index}`}>{day}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h3 className="text-16-medium">Start Time</h3>
                          <Select
                            value={availabilitySettings.startTime.toString()}
                            onValueChange={(value) => {
                              setAvailabilitySettings(prev => ({
                                ...prev,
                                startTime: parseInt(value)
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select start time" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...Array(24)].map((_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-16-medium">End Time</h3>
                          <Select
                            value={availabilitySettings.endTime.toString()}
                            onValueChange={(value) => {
                              setAvailabilitySettings(prev => ({
                                ...prev,
                                endTime: parseInt(value)
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select end time" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...Array(24)].map((_, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          onClick={saveAvailabilitySettings}
                          className="save-availability-btn shad-primary-btn w-full sm:w-auto"
                        >
                          Save Availability Settings
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Add Holidays/Time Off</h2>
                    <div className="dashboard-card p-4">
                      <div className="border rounded-md p-3 mb-3">
                        <p className="text-sm text-dark-600 mb-2">Select dates to mark as holidays:</p>
                        <Input 
                          type="date"
                          className="mb-2"
                          onChange={(e) => {
                            const selectedDate = new Date(e.target.value);
                            if (!isNaN(selectedDate.getTime())) {
                              setSelectedDates(prev => [...prev, selectedDate]);
                            }
                          }}
                        />
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <h3 className="text-16-medium">Selected Dates</h3>
                        <div className="max-h-40 overflow-y-auto">
                          {selectedDates.length === 0 ? (
                            <p className="text-14-regular text-dark-600">No dates selected</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedDates.map((date, i) => (
                                <div key={i} className="flex justify-between items-center">
                                  <span>{format(date, 'MMM dd, yyyy')}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedDates(prev => prev.filter((d) => d.getTime() !== date.getTime()));
                                    }}
                                  >
                                    <Image src="/assets/icons/close.svg" alt="remove" width={16} height={16} />
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
                            setAvailabilitySettings(prev => ({
                              ...prev,
                              holidays: [...selectedDates]
                            }));
                            alert("Holidays added to your availability settings!");
                          }}
                          className="shad-primary-btn w-full"
                          disabled={selectedDates.length === 0}
                        >
                          Add Selected Dates as Holidays
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </main>
      </div>
    </>
  );
};

export default DoctorDashboard;
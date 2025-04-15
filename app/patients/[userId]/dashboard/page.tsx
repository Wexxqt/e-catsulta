"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, parse } from "date-fns";
import { ChevronDown, ChevronUp, Search, Calendar, User, Plus, Clock, Trash2, Edit, Pencil, Users, X, Filter, Check, LogOut, Eye, Clipboard } from "lucide-react";
import ReactDatePicker from "react-datepicker";
import Image from "next/image";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import { getPatient, updatePatientPersonalInfo, updatePatientMedical } from "@/lib/actions/patient.actions";
import { getPatientAppointments, clearPatientAppointmentHistory } from "@/lib/actions/appointment.actions";
import { getPatientNotes, clearPatientNotesHistory } from "@/lib/actions/patient-notes.actions";
import { formatDateTime, getGravatarUrl } from "@/lib/utils";
import { Patient, Appointment, PatientNote } from "@/types/appwrite.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { logout } from "@/lib/auth.service";
import { getCurrentUser } from "@/lib/auth.service";

import "react-datepicker/dist/react-datepicker.css";

// Personal info form schema
const personalInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  birthDate: z.date().optional(),
  gender: z.enum(["Male", "Female", "Other", "Prefer not to say"], {
    required_error: "Please select a gender",
  }),
  address: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  identificationType: z.string().optional(),
  identificationNumber: z.string().optional(),
});

// Medical info form schema
const medicalInfoSchema = z.object({
  allergies: z.string().optional(),
  currentMedication: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  familyMedicalHistory: z.string().optional(),
  signsSymptoms: z.string().optional(),
});

const PatientDashboard = () => {
  const { userId } = useParams();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isMedicalInfoOpen, setIsMedicalInfoOpen] = useState(true);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [showPersonalInfoDialog, setShowPersonalInfoDialog] = useState(false);
  const [showMedicalInfoDialog, setShowMedicalInfoDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<string[]>([]);
  const [openMobileTabs, setOpenMobileTabs] = useState<{[key: string]: boolean}>({});
  const [clearingNotes, setClearingNotes] = useState(false);

  // Function to toggle mobile tab accordions
  const toggleMobileTab = (id: string) => {
    setOpenMobileTabs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          console.log("User not authenticated, redirecting to home");
          window.location.href = "/";
          return;
        }
        
        // Fetch patient data
        const patientData = await getPatient(userId as string);
        if (patientData) {
          setPatient(patientData as unknown as Patient);

          // Fetch patient appointments
          const appointmentsData = await getPatientAppointments(userId as string);
          setAppointments(appointmentsData || []);

          // Extract unique doctor names from appointments
          if (appointmentsData && appointmentsData.length > 0) {
            const uniqueDoctorNames = Array.from(
              new Set(appointmentsData.map((app: Appointment) => app.primaryPhysician))
            ) as string[];
            setDoctors(uniqueDoctorNames);
          }

          // Fetch patient notes
          const notesData = await getPatientNotes(patientData.$id);
          setNotes(notesData || []);
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
    
    // Also add an event listener to check auth when user navigates back to this page
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const user = await getCurrentUser();
        if (!user) {
          window.location.href = "/";
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  // Clean up doctor notes for display when they load
  useEffect(() => {
    if (notes.length > 0) {
      // Make a copy to avoid modifying the original data
      const processedNotes = notes.map(note => {
        // For historical notes that have "current-doctor-id"
        if (note.doctorId === "current-doctor-id") {
          return { ...note, doctorId: "Your Doctor" };
        }
        return note;
      });
      
      setNotes(processedNotes);
    }
  }, [notes.length]);

  // Personal info form
  const personalInfoForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      name: patient?.name || "",
      email: patient?.email || "",
      phone: patient?.phone || "",
      birthDate: patient?.birthDate ? new Date(patient.birthDate) : undefined,
      gender: patient?.gender || "Prefer not to say",
      address: patient?.address || "",
      emergencyContactName: patient?.emergencyContactName || "",
      emergencyContactNumber: patient?.emergencyContactNumber || "",
      identificationType: patient?.identificationType || "",
      identificationNumber: patient?.identificationNumber || "",
    },
  });

  // Medical info form
  const medicalInfoForm = useForm<z.infer<typeof medicalInfoSchema>>({
    resolver: zodResolver(medicalInfoSchema),
    defaultValues: {
      allergies: patient?.allergies || "",
      currentMedication: patient?.currentMedication || "",
      pastMedicalHistory: patient?.pastMedicalHistory || "",
      familyMedicalHistory: patient?.familyMedicalHistory || "",
      signsSymptoms: patient?.signsSymptoms || "",
    },
  });

  // Update form values when patient data changes
  useEffect(() => {
    if (patient) {
      personalInfoForm.reset({
        name: patient.name || "",
        email: patient.email || "",
        phone: patient.phone || "",
        birthDate: patient.birthDate ? new Date(patient.birthDate) : undefined,
        gender: patient.gender || "Prefer not to say",
        address: patient.address || "",
        emergencyContactName: patient.emergencyContactName || "",
        emergencyContactNumber: patient.emergencyContactNumber || "",
        identificationType: patient.identificationType || "",
        identificationNumber: patient.identificationNumber || "",
      });

      medicalInfoForm.reset({
        allergies: patient.allergies || "",
        currentMedication: patient.currentMedication || "",
        pastMedicalHistory: patient.pastMedicalHistory || "",
        familyMedicalHistory: patient.familyMedicalHistory || "",
        signsSymptoms: patient.signsSymptoms || "",
      });
    }
  }, [patient, personalInfoForm, medicalInfoForm]);

  // Filter appointments based on search query and selected doctor
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    
    // First filter by selected doctor if any
    if (selectedDoctor) {
      filtered = filtered.filter(appointment => 
        appointment.primaryPhysician === selectedDoctor
      );
    }
    
    // Then filter by search query if any
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      
      // Special keyword mapping to specific doctors
      if (lowerQuery === "medical") {
        // Show only Dr. Abegail's appointments
        return filtered.filter(appointment => 
          appointment.primaryPhysician.toLowerCase().includes("abegail")
        );
      } else if (lowerQuery === "dental") {
        // Show only Dr. Genevieve's appointments
        return filtered.filter(appointment => 
          appointment.primaryPhysician.toLowerCase().includes("genevieve")
        );
      }
      
      // Standard text search
      filtered = filtered.filter(appointment => 
        appointment.primaryPhysician.toLowerCase().includes(lowerQuery) ||
        formatDateTime(appointment.schedule).dateTime.toLowerCase().includes(lowerQuery) ||
        appointment.reason.toLowerCase().includes(lowerQuery) ||
        appointment.status.toLowerCase().includes(lowerQuery)
      );
    }
    
    return filtered;
  }, [appointments, searchQuery, selectedDoctor]);

  // Generate initials for avatar fallback
  const getInitials = (name?: string): string => {
    if (!name) return "PT";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Navigate to new appointment page
  const handleNewAppointment = () => {
    router.push(`/patients/${userId}/new-appointment`);
  };

  // Function to handle clearing appointment history
  const handleClearHistory = async () => {
    try {
      setClearingHistory(true);
      const result = await clearPatientAppointmentHistory(userId as string);
      
      if (result.success) {
        setAppointments([]);
        setSearchQuery("");
      } else {
        console.error("Failed to clear appointment history:", result.error);
      }
    } catch (error) {
      console.error("Error clearing appointment history:", error);
    } finally {
      setClearingHistory(false);
    }
  };

  // Handle personal info submit
  const onPersonalInfoSubmit = async (data: z.infer<typeof personalInfoSchema>) => {
    if (!patient) return;
    setIsSubmitting(true);
    
    try {
      const response = await updatePatientPersonalInfo({
        patientId: patient.$id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        birthDate: data.birthDate,
        gender: data.gender.toLowerCase() as any,
        address: data.address,
        emergencyContactName: data.emergencyContactName,
        emergencyContactNumber: data.emergencyContactNumber,
        identificationType: data.identificationType,
        identificationNumber: data.identificationNumber
      });
      
      if (response.status === "success") {
        // Refetch patient data to update the UI
        const patientData = await getPatient(userId as string);
        if (patientData) {
          setPatient(patientData as unknown as Patient);
        }
        setShowPersonalInfoDialog(false);
      } else {
        console.error("Error updating personal info:", response.message);
      }
    } catch (error) {
      console.error("Error submitting personal info form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle medical info submit
  const onMedicalInfoSubmit = async (data: z.infer<typeof medicalInfoSchema>) => {
    if (!patient) return;
    setIsSubmitting(true);
    
    try {
      const response = await updatePatientMedical({
        patientId: patient.$id,
        allergies: data.allergies,
        currentMedication: data.currentMedication,
        pastMedicalHistory: data.pastMedicalHistory,
        familyMedicalHistory: data.familyMedicalHistory,
        signsSymptoms: data.signsSymptoms
      });
      
      if (response.status === "success") {
        // Refetch patient data to update the UI
        const patientData = await getPatient(userId as string);
        if (patientData) {
          setPatient(patientData as unknown as Patient);
        }
        setShowMedicalInfoDialog(false);
      } else {
        console.error("Error updating medical info:", response.message);
      }
    } catch (error) {
      console.error("Error submitting medical info form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear doctor filter
  const clearDoctorFilter = () => {
    setSelectedDoctor(null);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      console.log("Attempting to logout...");
      
      try {
        // Try to delete the session on the server
        await logout();
        console.log("Session deleted successfully");
      } catch (error) {
        // If server-side logout fails, just log it but continue with client-side logout
        console.log("Server-side logout failed, continuing with client-side logout", error);
      }
      
      // Clear any local storage or session storage data
      localStorage.clear();
      sessionStorage.clear();
      
      // Always redirect to home page regardless of server-side logout success
      console.log("Redirecting to home page...");
      
      // Replace the current history entry instead of adding a new one
      // This prevents users from navigating back to the dashboard using the browser back button
      window.location.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
      // If all else fails, just try direct navigation
      window.location.replace("/");
    }
  };

  // Function to handle clearing notes history
  const handleClearNotesHistory = async () => {
    if (!patient) return;
    
    try {
      setClearingNotes(true);
      const result = await clearPatientNotesHistory(patient.$id);
      
      if (result.success) {
        setNotes([]);
      } else {
        console.error("Failed to clear notes history:", result.error);
      }
    } catch (error) {
      console.error("Error clearing notes history:", error);
    } finally {
      setClearingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center min-h-screen">
        <p className="text-16-medium text-light-200">Loading patient information...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex-center flex-col min-h-screen">
        <p className="text-16-medium text-light-200 mb-4">Patient information not found.</p>
        <Button 
          className="shad-primary-btn" 
          onClick={() => router.push("/")}
        >
          Register as Patient
        </Button>
      </div>
    );
  }

  const medicalTabs = [
    { id: "allergies", label: "Allergies", content: patient.allergies || "No known allergies" },
    { id: "medication", label: "Medication", content: patient.currentMedication || "Not taking any medication" },
    { id: "past-history", label: "Past History", content: patient.pastMedicalHistory || "No past medical history recorded" },
    { id: "family-history", label: "Family History", content: patient.familyMedicalHistory || "No family medical history recorded" },
    { id: "symptoms", label: "Symptoms", content: patient.signsSymptoms || "No signs or symptoms recorded" }
  ];

  return (
    <div className="container mx-auto py-4 sm:py-6 lg:py-8 relative">
      {/* Calendar styles are now in globals.css */}
      
      {/* Desktop Logout Button */}
      <div className="hidden sm:flex justify-end mb-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="text-red-500 border-red-500 hover:bg-red-500/10 h-9"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="shad-alert-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-light-200">Logout Confirmation</AlertDialogTitle>
              <AlertDialogDescription className="text-dark-700">
                Are you sure you want to logout? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLogout}
                className="bg-red-700 text-white hover:bg-red-800"
              >
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      <div className="dashboard-layout">
        {/* Patient Profile Section */}
        <div className="col-span-1 dashboard-card">
          <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <div className="flex flex-1 items-center min-w-0 max-w-full overflow-hidden">
              <div className="relative mr-3 sm:mr-4 flex-shrink-0">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 border-2 border-dark-500">
                  <AvatarImage src={getGravatarUrl(patient.email, 200)} alt={patient.name} />
                  <AvatarFallback className="bg-gradient-to-br from-dark-300 to-dark-400">
                    {getInitials(patient.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col min-w-0 max-w-[calc(100%-80px)] sm:max-w-[calc(100%-90px)] md:max-w-[calc(100%-100px)]">
                <h1 className="text-16-semibold sm:text-18-bold text-light-200 truncate mb-0.5">{patient.name}</h1>
                <p className="text-12-regular sm:text-14-regular text-dark-600 truncate">
                  {patient.identificationType === "employee" 
                    ? `Employee No. ${patient.identificationNumber || "N/A"}`
                    : patient.identificationType === "student"
                      ? `Student No. ${patient.identificationNumber || "N/A"}`
                      : `ID: ${patient.$id.substring(0, 8)}`}
                </p>
              </div>
            </div>
            
            <Dialog open={showPersonalInfoDialog} onOpenChange={setShowPersonalInfoDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-light-200 hover:bg-dark-500 group transition duration-200 flex-shrink-0 whitespace-nowrap"
                >
                  <Pencil className="h-4 w-4 mr-2 group-hover:text-green-500" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="shad-dialog sm:max-w-md md:max-w-lg lg:max-w-2xl w-[95%] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader className="mb-4 sm:mb-6">
                  <DialogTitle className="text-16-semibold sm:text-18-bold text-light-200">Edit Personal Information</DialogTitle>
                </DialogHeader>
                
                <Form {...personalInfoForm}>
                  <form onSubmit={personalInfoForm.handleSubmit(onPersonalInfoSubmit)} className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      {/* Name */}
                      <FormField
                        control={personalInfoForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-200 text-14-medium">Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your full name" 
                                className="bg-dark-300 border-dark-500 text-light-200 h-10 sm:h-11"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                          </FormItem>
                        )}
                      />

                      {/* Email */}
                      <FormField
                        control={personalInfoForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-200 text-14-medium">Email</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your email" 
                                className="bg-dark-300 border-dark-500 text-light-200 h-10 sm:h-11"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                          </FormItem>
                        )}
                      />

                      {/* Phone */}
                      <FormField
                        control={personalInfoForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-200 text-14-medium">Phone Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your phone number" 
                                className="bg-dark-300 border-dark-500 text-light-200 h-10 sm:h-11"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                          </FormItem>
                        )}
                      />

                      {/* Birth Date */}
                      <FormField
                        control={personalInfoForm.control}
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem className="mb-2 sm:mb-0">
                            <FormLabel className="text-light-200 text-14-medium">Date of Birth</FormLabel>
                            <FormControl>
                              <div className="flex rounded-md border border-dark-500 bg-dark-300 h-10 sm:h-11 overflow-hidden">
                                <ReactDatePicker
                                  selected={field.value}
                                  onChange={(date: Date) => field.onChange(date)}
                                  className="bg-dark-300 text-light-200 w-full p-2 border-0 focus:outline-none"
                                  placeholderText="Select date of birth"
                                  dateFormat="MM/dd/yyyy"
                                  showMonthDropdown
                                  showYearDropdown
                                  dropdownMode="select"
                                  maxDate={new Date()}
                                  wrapperClassName="w-full"
                                  popperClassName="react-datepicker-responsive"
                                  popperPlacement="bottom-start"
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                          </FormItem>
                        )}
                      />

                      {/* Gender */}
                      <FormField
                        control={personalInfoForm.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-200 text-14-medium">Gender</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-dark-300 border-dark-500 text-light-200 h-10 sm:h-11">
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-dark-400 border-dark-500 text-light-200">
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                          </FormItem>
                        )}
                      />

                      {/* Identification */}
                      <FormField
                        control={personalInfoForm.control}
                        name="identificationType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-200 text-14-medium">Identification Type</FormLabel>
                            <FormControl>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-dark-300 border-dark-500 text-light-200 h-10 sm:h-11">
                                    <SelectValue placeholder="Select identification type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-dark-400 border-dark-500 text-light-200">
                                  <SelectItem value="employee">Employee</SelectItem>
                                  <SelectItem value="student">Student</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                          </FormItem>
                        )}
                      />

                      {/* Identification Number */}
                      <FormField
                        control={personalInfoForm.control}
                        name="identificationNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-200 text-14-medium">Identification Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter identification number" 
                                className="bg-dark-300 border-dark-500 text-light-200 h-10 sm:h-11"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                          </FormItem>
                        )}
                      />

                      {/* Address */}
                      <FormField
                        control={personalInfoForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem className="col-span-1 sm:col-span-2">
                            <FormLabel className="text-light-200 text-14-medium">Address</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter your address"
                                className="resize-none bg-dark-300 border-dark-500 text-light-200 min-h-[70px] sm:min-h-[80px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                          </FormItem>
                        )}
                      />

                      {/* Emergency Contact Name */}
                      <FormField
                        control={personalInfoForm.control}
                        name="emergencyContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-200 text-14-medium">Emergency Contact Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter emergency contact name" 
                                className="bg-dark-300 border-dark-500 text-light-200 h-10 sm:h-11"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                          </FormItem>
                        )}
                      />

                      {/* Emergency Contact Number */}
                      <FormField
                        control={personalInfoForm.control}
                        name="emergencyContactNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-light-200 text-14-medium">Emergency Contact Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter emergency contact number" 
                                className="bg-dark-300 border-dark-500 text-light-200 h-10 sm:h-11"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <DialogFooter className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-4 sm:justify-end">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="border-dark-500 bg-dark-300 text-light-200 w-full sm:w-auto order-2 sm:order-1"
                        onClick={() => setShowPersonalInfoDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="shad-primary-btn w-full sm:w-auto order-1 sm:order-2"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-16-medium text-light-200 mb-2">Personal Information</h2>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                <div className="col-span-full">
                  <p className="text-14-regular text-dark-600">Email</p>
                  <p className="text-14-medium text-light-200 break-words">{patient.email}</p>
                </div>
                <div>
                  <p className="text-14-regular text-dark-600">Phone</p>
                  <p className="text-14-medium text-light-200">{patient.phone}</p>
                </div>
                <div>
                  <p className="text-14-regular text-dark-600">Date of Birth</p>
                  <p className="text-14-medium text-light-200">
                    {patient.birthDate ? format(new Date(patient.birthDate), 'MM/dd/yyyy') : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-14-regular text-dark-600">Gender</p>
                  <p className="text-14-medium text-light-200">
                    {patient.gender ? 
                      patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) 
                      : 'N/A'}
                  </p>
                </div>
                <div className="col-span-full">
                  <p className="text-14-regular text-dark-600">Address</p>
                  <p className="text-14-medium text-light-200">{patient.address}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-dark-500" />

            <div>
              <h2 className="text-16-medium text-light-200 mb-2">Emergency Contact</h2>
              <div className="space-y-2">
                <div>
                  <p className="text-14-regular text-dark-600">Name</p>
                  <p className="text-14-medium text-light-200">{patient.emergencyContactName}</p>
                </div>
                <div>
                  <p className="text-14-regular text-dark-600">Phone</p>
                  <p className="text-14-medium text-light-200">{patient.emergencyContactNumber}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Medical History Section - Tabbed Interface */}
        <div className="dashboard-card-wide dashboard-card z-10">
          <Collapsible 
            open={isMedicalInfoOpen} 
            onOpenChange={setIsMedicalInfoOpen}
            className="w-full"
          >
            <div className="p-4 sm:p-6 flex justify-between items-center">
              <h2 className="text-16-semibold text-light-200">Medical Information</h2>
              <div className="flex items-center">
                <Dialog open={showMedicalInfoDialog} onOpenChange={setShowMedicalInfoDialog}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-light-200 hover:bg-dark-500 mr-2">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="shad-dialog sm:max-w-md md:max-w-lg lg:max-w-2xl w-[95%] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader className="mb-4 sm:mb-6">
                      <DialogTitle className="text-16-semibold sm:text-18-bold text-light-200">Edit Medical Information</DialogTitle>
                    </DialogHeader>
                    
                    <Form {...medicalInfoForm}>
                      <form onSubmit={medicalInfoForm.handleSubmit(onMedicalInfoSubmit)} className="space-y-4 sm:space-y-6">
                        <FormField
                          control={medicalInfoForm.control}
                          name="allergies"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-light-200 text-14-medium">Allergies</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Please list any allergies you have"
                                  className="resize-none bg-dark-300 border-dark-500 text-light-200 min-h-[70px] sm:min-h-[80px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={medicalInfoForm.control}
                          name="currentMedication"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-light-200 text-14-medium">Current Medications</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Please list any medications you are currently taking"
                                  className="resize-none bg-dark-300 border-dark-500 text-light-200 min-h-[70px] sm:min-h-[80px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={medicalInfoForm.control}
                          name="pastMedicalHistory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-light-200 text-14-medium">Past Medical History</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Please provide details about your medical history"
                                  className="resize-none bg-dark-300 border-dark-500 text-light-200 min-h-[70px] sm:min-h-[80px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={medicalInfoForm.control}
                          name="familyMedicalHistory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-light-200 text-14-medium">Family Medical History</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Please provide details about your family's medical history"
                                  className="resize-none bg-dark-300 border-dark-500 text-light-200 min-h-[70px] sm:min-h-[80px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={medicalInfoForm.control}
                          name="signsSymptoms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-light-200 text-14-medium">Signs & Symptoms</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Please describe any current symptoms you are experiencing"
                                  className="resize-none bg-dark-300 border-dark-500 text-light-200 min-h-[70px] sm:min-h-[80px]" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage className="text-red-500 text-12-regular sm:text-14-regular" />
                            </FormItem>
                          )}
                        />

                        <DialogFooter className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-4 sm:justify-end">
                          <Button 
                            type="button" 
                            variant="outline"
                            className="border-dark-500 bg-dark-300 text-light-200 w-full sm:w-auto order-2 sm:order-1"
                            onClick={() => setShowMedicalInfoDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            className="shad-primary-btn w-full sm:w-auto order-1 sm:order-2"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 h-7 w-7">
                    {isMedicalInfoOpen ? 
                      <ChevronUp className="h-5 w-5 text-light-200" /> : 
                      <ChevronDown className="h-5 w-5 text-light-200" />
                    }
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            
            <CollapsibleContent className="px-4 sm:px-6 pb-6">
              {/* Hidden on mobile, visible on larger screens */}
              <div className="hidden sm:block">
                <Tabs defaultValue={medicalTabs[0].id} className="w-full">
                  <TabsList className="mb-2">
                    {medicalTabs.map((tab, index) => (
                      <TabsTrigger 
                        key={tab.id} 
                        value={tab.id}
                        onClick={() => setSelectedTabIndex(index)}
                        className={selectedTabIndex === index ? "bg-dark-500" : ""}
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {medicalTabs.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="text-14-regular text-dark-700 mt-4">
                      {tab.content}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
              
              {/* Mobile-friendly accordion layout */}
              <div className="block sm:hidden">
                <div className="space-y-3">
                  {medicalTabs.map((tab, index) => (
                    <Collapsible 
                      key={tab.id} 
                      className="border border-dark-500 rounded-md overflow-hidden"
                      open={openMobileTabs[tab.id]}
                      onOpenChange={() => toggleMobileTab(tab.id)}
                    >
                      <CollapsibleTrigger className="flex justify-between items-center w-full p-3 bg-dark-300 hover:bg-dark-500 transition-colors duration-200">
                        <span className="text-14-medium text-light-200">{tab.label}</span>
                        <div className={`rotate-chevron ${openMobileTabs[tab.id] ? 'open' : ''}`}>
                          <ChevronDown className="h-4 w-4 text-light-200" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-3 bg-dark-400 text-14-regular text-dark-700">
                        {tab.content}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Appointment History Section */}
        <div className="dashboard-card-full dashboard-card relative z-10">
          <div className="dashboard-header">
            <h2 className="text-16-semibold text-light-200">Appointment History</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="dashboard-search-container">
                <div className="dashboard-search-input-wrapper">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-dark-600" />
                  <Input
                    placeholder="Search appointments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="dashboard-search-input"
                  />
                </div>
                
                {/* Doctor Filter Dropdown */}
                {doctors.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="dashboard-filter-btn">
                        <Filter className="h-4 w-4" />
                        {selectedDoctor ? 'Doctor' : 'Filter by Doctor'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 bg-dark-400 border-dark-500 p-0 z-50">
                      <Command className="bg-dark-400">
                        <CommandInput placeholder="Search doctor..." className="h-9 bg-dark-300 text-light-200" />
                        <CommandEmpty>No doctor found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {doctors.map((doctor) => (
                            <CommandItem
                              key={doctor}
                              onSelect={() => setSelectedDoctor(doctor)}
                              className="flex items-center gap-2 py-2 hover:bg-dark-500 text-light-200"
                            >
                              <User className="h-4 w-4" />
                              <span>{doctor}</span>
                              {selectedDoctor === doctor && <Check className="h-4 w-4 ml-auto" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              
              <div className="dashboard-actions-container">
                {/* Doctor Filter Badge - shows when a doctor is selected */}
                {selectedDoctor && (
                  <div className="dashboard-filter-badge">
                    <User className="h-3.5 w-3.5" />
                    <span className="text-14-medium truncate max-w-[120px]">{selectedDoctor}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 w-5 p-0 rounded-full hover:bg-dark-500"
                      onClick={clearDoctorFilter}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                {/* Clear History Button with Confirmation */}
                {appointments.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 border-red-500 hover:bg-red-500/10 h-9"
                        disabled={clearingHistory}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hide History
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="shad-alert-dialog">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-light-200">Hide Appointment History</AlertDialogTitle>
                        <AlertDialogDescription className="text-dark-700">
                          This will hide all your appointments from your dashboard view. Your appointment records will still 
                          be available to your doctor and clinic staff. This action clears your view only.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleClearHistory}
                          className="bg-red-700 text-white hover:bg-red-800"
                        >
                          {clearingHistory ? "Clearing..." : "Hide Appointments"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                <Button className="shad-primary-btn h-9" onClick={handleNewAppointment}>New Appointment</Button>
              </div>
            </div>
          </div>
          
          {filteredAppointments.length === 0 ? (
            <p className="text-14-regular text-dark-600 text-center py-6 sm:py-8">
              {appointments.length === 0 
                ? loading 
                  ? "Loading appointments..."
                  : "No appointment history found." 
                : selectedDoctor 
                  ? `No appointments with Dr. ${selectedDoctor}.` 
                  : "No appointments match your search."}
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-4">
                {filteredAppointments.map((appointment) => (
                  <div 
                    key={appointment.$id} 
                    className="bg-dark-300 border border-dark-500 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-16-medium text-light-200 mb-1">{appointment.primaryPhysician}</h3>
                        <p className="text-14-regular text-dark-600">{formatDateTime(appointment.schedule).dateTime}</p>
                      </div>
                      <StatusBadge status={appointment.status} />
                    </div>
                    
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full text-light-200 bg-dark-400 border-dark-500 hover:bg-dark-500"
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] overflow-y-auto pb-10">
                        <SheetHeader className="sticky top-0 bg-dark-400 pb-2 z-10">
                          <SheetTitle>Appointment Details</SheetTitle>
                        </SheetHeader>
                        {selectedAppointment && (
                          <div className="space-y-4 mt-4 px-1">
                            <div className="grid grid-cols-1 gap-5">
                              <div>
                                <p className="text-14-regular text-dark-600">Date & Time</p>
                                <p className="text-16-medium text-light-200">
                                  {formatDateTime(selectedAppointment.schedule).dateTime}
                                </p>
                                
                                {/* Calendar view for mobile - moved below date & time */}
                                <div className="appointment-calendar mt-2 bg-dark-300 p-3 rounded-lg">
                                  <p className="text-14-regular text-dark-600 mb-2 text-center">Appointment Date</p>
                                  <div className="flex justify-center">
                                    <ReactDatePicker
                                      selected={new Date(selectedAppointment.schedule)}
                                      onChange={() => {}} // Read-only
                                      inline
                                      disabled={true}
                                      readOnly={true}
                                      dayClassName={() => "cursor-default"}
                                      showMonthDropdown={false}
                                      showYearDropdown={false}
                                      renderCustomHeader={({ date }) => (
                                        <div className="text-center px-2 py-1">
                                          <div className="text-14-medium text-light-200">
                                            {date.toLocaleString("default", {
                                              month: "long",
                                              year: "numeric",
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    />
                                  </div>
                                  
                                  {/* Time indicator below calendar */}
                                  <div className="flex items-center justify-center mt-2 text-light-200 bg-dark-400 py-2 px-4 rounded-lg">
                                    <Clock className="h-4 w-4 mr-2 text-green-500" />
                                    <span className="text-14-medium">
                                      {format(new Date(selectedAppointment.schedule), 'h:mm a')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <p className="text-14-regular text-dark-600">Appointment Code</p>
                                <p className="text-14-medium font-mono bg-blue-950/30 text-blue-400 p-3 rounded-md mt-1 border border-blue-500/30 flex items-center justify-between">
                                  <span className="tracking-wider">{selectedAppointment.appointmentCode || "No code available"}</span>
                                  {selectedAppointment.appointmentCode && (
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(selectedAppointment.appointmentCode);
                                        // Add visual feedback (could be improved with a proper toast)
                                        alert("Appointment code copied to clipboard!");
                                      }}
                                      className="ml-2 text-xs bg-blue-500/20 hover:bg-blue-500/30 transition-colors p-1 rounded"
                                    >
                                      <Clipboard className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-14-regular text-dark-600">Doctor</p>
                                <p className="text-16-medium text-light-200">{selectedAppointment.primaryPhysician}</p>
                              </div>
                              
                              <div>
                                <p className="text-14-regular text-dark-600">Status</p>
                                <StatusBadge status={selectedAppointment.status} />
                              </div>
                              
                              <div>
                                <p className="text-14-regular text-dark-600">Reason for Appointment</p>
                                <p className="text-14-regular text-light-200">{selectedAppointment.reason || "No reason provided"}</p>
                              </div>
                              
                              <div>
                                <p className="text-14-regular text-dark-600">Notes</p>
                                <p className="text-14-regular text-light-200">{selectedAppointment.note || "No notes available"}</p>
                              </div>
                              
                              {selectedAppointment.status === "cancelled" && (
                                <div>
                                  <p className="text-14-regular text-dark-600">Cancellation Reason</p>
                                  <p className="text-14-regular text-light-200">{selectedAppointment.cancellationReason}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </SheetContent>
                    </Sheet>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block data-table overflow-x-auto">
                <Table className="shad-table w-full">
                  <TableHeader>
                    <TableRow className="shad-table-row-header">
                      <TableHead className="text-14-medium w-[180px]">Date & Time</TableHead>
                      <TableHead className="text-14-medium">Doctor</TableHead>
                      <TableHead className="text-14-medium">Status</TableHead>
                      <TableHead className="text-14-medium text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((appointment) => (
                      <TableRow key={appointment.$id} className="shad-table-row hover:bg-dark-500">
                        <TableCell className="text-14-regular">
                          {formatDateTime(appointment.schedule).dateTime}
                        </TableCell>
                        <TableCell className="text-14-regular">{appointment.primaryPhysician}</TableCell>
                        <TableCell className="text-14-regular">
                          <StatusBadge status={appointment.status} />
                        </TableCell>
                        <TableCell className="text-14-regular text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-light-200 hover:bg-dark-500"
                                onClick={() => setSelectedAppointment(appointment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="shad-dialog sm:max-w-md md:max-w-lg lg:max-w-xl w-[95%] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="text-16-semibold text-light-200">Appointment Details</DialogTitle>
                              </DialogHeader>
                              {selectedAppointment && (
                                <div className="space-y-4 mt-4 px-1">
                                  <div className="grid grid-cols-1 gap-5">
                                    <div>
                                      <p className="text-14-regular text-dark-600">Date & Time</p>
                                      <p className="text-16-medium text-light-200">
                                        {formatDateTime(selectedAppointment.schedule).dateTime}
                                      </p>
                                      
                                      {/* Calendar view for mobile - moved below date & time */}
                                      <div className="appointment-calendar mt-2 bg-dark-300 p-3 rounded-lg">
                                        <p className="text-14-regular text-dark-600 mb-2 text-center">Appointment Date</p>
                                        <div className="flex justify-center">
                                          <ReactDatePicker
                                            selected={new Date(selectedAppointment.schedule)}
                                            onChange={() => {}} // Read-only
                                            inline
                                            disabled={true}
                                            readOnly={true}
                                            dayClassName={() => "cursor-default"}
                                            showMonthDropdown={false}
                                            showYearDropdown={false}
                                            renderCustomHeader={({ date }) => (
                                              <div className="text-center px-2 py-1">
                                                <div className="text-14-medium text-light-200">
                                                  {date.toLocaleString("default", {
                                                    month: "long",
                                                    year: "numeric",
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          />
                                        </div>
                                        
                                        {/* Time indicator below calendar */}
                                        <div className="flex items-center justify-center mt-2 text-light-200 bg-dark-400 py-2 px-4 rounded-lg">
                                          <Clock className="h-4 w-4 mr-2 text-green-500" />
                                          <span className="text-14-medium">
                                            {format(new Date(selectedAppointment.schedule), 'h:mm a')}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <p className="text-14-regular text-dark-600">Appointment Code</p>
                                      <p className="text-14-medium font-mono bg-blue-950/30 text-blue-400 p-3 rounded-md mt-1 border border-blue-500/30 flex items-center justify-between">
                                        <span className="tracking-wider">{selectedAppointment.appointmentCode || "No code available"}</span>
                                        {selectedAppointment.appointmentCode && (
                                          <button 
                                            onClick={() => {
                                              navigator.clipboard.writeText(selectedAppointment.appointmentCode);
                                              // Add visual feedback (could be improved with a proper toast)
                                              alert("Appointment code copied to clipboard!");
                                            }}
                                            className="ml-2 text-xs bg-blue-500/20 hover:bg-blue-500/30 transition-colors p-1 rounded"
                                          >
                                            <Clipboard className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                      </p>
                                    </div>
                                    
                                    <div>
                                      <p className="text-14-regular text-dark-600">Doctor</p>
                                      <p className="text-16-medium text-light-200">{selectedAppointment.primaryPhysician}</p>
                                    </div>
                                    
                                    <div>
                                      <p className="text-14-regular text-dark-600">Status</p>
                                      <StatusBadge status={selectedAppointment.status} />
                                    </div>
                                    
                                    <div>
                                      <p className="text-14-regular text-dark-600">Reason for Appointment</p>
                                      <p className="text-14-regular text-light-200">{selectedAppointment.reason || "No reason provided"}</p>
                                    </div>
                                    
                                    <div>
                                      <p className="text-14-regular text-dark-600">Notes</p>
                                      <p className="text-14-regular text-light-200">{selectedAppointment.note || "No notes available"}</p>
                                    </div>
                                    
                                    {selectedAppointment.status === "cancelled" && (
                                      <div>
                                        <p className="text-14-regular text-dark-600">Cancellation Reason</p>
                                        <p className="text-14-regular text-light-200">{selectedAppointment.cancellationReason}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        {/* Doctor Notes Section - Collapsible */}
        <div className="dashboard-card-full dashboard-card relative z-10 mt-4 sm:mt-0">
          <Collapsible 
            open={isNotesOpen} 
            onOpenChange={setIsNotesOpen}
            className="w-full"
          >
            <div className="p-4 sm:p-6 flex justify-between items-center">
              <h2 className="text-16-semibold text-light-200">Doctor Notes</h2>
              <div className="flex items-center gap-2">
                {notes.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 border-red-500 hover:bg-red-500/10 h-7"
                        disabled={clearingNotes}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hide Notes
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="shad-alert-dialog">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-light-200">Hide Doctor Notes</AlertDialogTitle>
                        <AlertDialogDescription className="text-dark-700">
                          This will hide all doctor notes from your dashboard view. Your medical notes will still 
                          be available to your doctor and clinic staff. This action clears your view only.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={handleClearNotesHistory}
                          className="bg-red-700 text-white hover:bg-red-800"
                        >
                          {clearingNotes ? "Clearing..." : "Hide Notes"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 h-7 w-7">
                    {isNotesOpen ? 
                      <ChevronUp className="h-5 w-5 text-light-200" /> : 
                      <ChevronDown className="h-5 w-5 text-light-200" />
                    }
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            
            <CollapsibleContent className="px-4 sm:px-6 pb-6">
              {notes.length === 0 ? (
                <p className="text-14-regular text-dark-600 text-center py-6">No doctor notes available.</p>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {notes.map((note) => (
                    <div key={note.$id} className="p-3 sm:p-4 border border-dark-500 rounded-md bg-dark-300">
                      <div className="flex flex-col sm:flex-between sm:flex-row gap-1 sm:gap-0 mb-2">
                        <p className="text-14-medium text-light-200">
                          {note.doctorId === "current-doctor-id" 
                            ? "Doctor" 
                            : note.doctorId.startsWith("Dr. ") 
                              ? note.doctorId 
                              : `Dr. ${note.doctorId}`}
                        </p>
                        <p className="text-12-regular text-dark-600">
                          {format(new Date(note.createdAt), 'MM/dd/yyyy hh:mm a')}
                        </p>
                      </div>
                      <p className="text-14-regular text-dark-700">{note.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Sticky Mobile Action Buttons */}
      <div className="dashboard-mobile-fab">
        {/* Logout Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              className="dashboard-fab-button bg-red-500 hover:bg-red-600" 
            >
              <LogOut className="h-6 w-6" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="shad-alert-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-light-200">Logout Confirmation</AlertDialogTitle>
              <AlertDialogDescription className="text-dark-700">
                Are you sure you want to logout? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleLogout}
                className="bg-red-700 text-white hover:bg-red-800"
              >
                Logout
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Appointment Button */}
        <Button 
          className="dashboard-fab-button bg-green-500 hover:bg-green-600" 
          onClick={handleNewAppointment}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default PatientDashboard;

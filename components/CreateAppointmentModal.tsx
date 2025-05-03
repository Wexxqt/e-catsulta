"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Doctors } from "@/constants";
import { createAppointment } from "@/lib/actions/appointment.actions";
import { getAllPatients } from "@/lib/actions/patient.actions";
import { useToast } from "@/components/ui/use-toast";
import { Status } from "@/types/appwrite.types";

// Create a schema for appointment creation
const createAppointmentSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  doctorName: z.string().min(1, "Please select a doctor"),
  appointmentDate: z.date({
    required_error: "Please select a date",
  }),
  appointmentTime: z.string().min(1, "Please select a time"),
  reason: z.string().min(3, "Reason must be at least 3 characters"),
  notes: z.string().optional(),
});

type CreateAppointmentFormValues = z.infer<typeof createAppointmentSchema>;

// Update the status type to use the enum from appwrite.types
const appointmentStatus: Status = "scheduled";

export function CreateAppointmentModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const { toast } = useToast();

  // Time slots for the appointment
  const timeSlots: string[] = [];
  for (let hour = 8; hour <= 17; hour++) {
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? "AM" : "PM";
    timeSlots.push(`${formattedHour}:00 ${period}`);
    if (hour !== 17) {
      // Don't add :30 for the last hour
      timeSlots.push(`${formattedHour}:30 ${period}`);
    }
  }

  // Initialize form
  const form = useForm<CreateAppointmentFormValues>({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      patientId: "",
      doctorName: "",
      appointmentDate: undefined,
      appointmentTime: "",
      reason: "",
      notes: "",
    },
  });

  // Fetch patients when the modal opens
  useEffect(() => {
    if (open) {
      const fetchPatients = async () => {
        setIsLoadingPatients(true);
        try {
          const result = await getAllPatients({
            limit: 100, // Get a larger number of patients
          });
          if (result.patients) {
            setPatients(result.patients);
            setFilteredPatients(result.patients);
          }
        } catch (error) {
          console.error("Error fetching patients:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load patients. Please try again.",
          });
        } finally {
          setIsLoadingPatients(false);
        }
      };

      fetchPatients();
    }
  }, [open, toast]);

  // Filter patients when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPatients(patients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = patients.filter(
        (patient) =>
          patient.name.toLowerCase().includes(query) ||
          patient.email.toLowerCase().includes(query) ||
          patient.identificationNumber.toLowerCase().includes(query)
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patients]);

  // Handle form submission
  const onSubmit = async (data: CreateAppointmentFormValues) => {
    setIsSubmitting(true);

    try {
      // Find the selected patient
      const patient = patients.find((p) => p.$id === data.patientId);

      if (!patient) {
        throw new Error("Selected patient not found");
      }

      // Parse the time string (e.g., "2:30 PM") into hours and minutes
      const timeParts = data.appointmentTime.split(/[:\s]/);
      let hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const isPM = data.appointmentTime.toLowerCase().includes("pm");

      // Convert 12-hour format to 24-hour
      if (isPM && hours < 12) {
        hours += 12;
      } else if (!isPM && hours === 12) {
        hours = 0;
      }

      // Create a new date with the selected date and time
      const scheduleDate = new Date(data.appointmentDate);
      scheduleDate.setHours(hours, minutes, 0, 0);

      // Create the appointment object
      const appointment = {
        userId: patient.userId || patient.$id,
        patient: patient.$id,
        primaryPhysician: data.doctorName,
        schedule: scheduleDate,
        reason: data.reason,
        status: appointmentStatus,
        note: data.notes || "",
        cancellationReason: null,
      };

      // Submit the appointment
      const newAppointment = await createAppointment(appointment);

      if (newAppointment) {
        toast({
          title: "Appointment Created",
          description: `Appointment successfully created for ${patient.name} with ${data.doctorName}`,
        });

        // Reset form and close modal
        form.reset();
        onOpenChange(false);

        // Call the success callback if provided
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create appointment. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col bg-white dark:bg-dark-300 text-gray-900 dark:text-white border-gray-200 dark:border-dark-500">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Create New Appointment
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            Schedule a new appointment for a patient
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 overflow-y-auto flex-1 pr-1"
          >
            {/* Patient Selection */}
            <div className="space-y-2">
              <FormLabel className="text-gray-700 dark:text-gray-300">
                Search Patient
              </FormLabel>
              <Input
                placeholder="Search by name, email, or ID number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
              />
            </div>

            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-300">
                    Select Patient
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Select a patient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingPatients ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                          <span className="ml-2">Loading patients...</span>
                        </div>
                      ) : filteredPatients.length === 0 ? (
                        <div className="p-2 text-center text-gray-500">
                          No patients found
                        </div>
                      ) : (
                        filteredPatients.map((patient) => (
                          <SelectItem key={patient.$id} value={patient.$id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {patient.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {patient.identificationNumber}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Doctor Selection */}
            <FormField
              control={form.control}
              name="doctorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-300">
                    Doctor
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Select a doctor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.name}>
                          <div className="flex items-center gap-2">
                            <Image
                              src={doctor.image}
                              width={32}
                              height={32}
                              alt={doctor.name}
                              className="rounded-full object-cover"
                            />
                            <span>{doctor.displayName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Selection */}
            <FormField
              control={form.control}
              name="appointmentDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-gray-700 dark:text-gray-300">
                    Date
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Selection */}
            <FormField
              control={form.control}
              name="appointmentTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-300">
                    Time
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-300">
                    Reason for Appointment
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Annual checkup, Consultation"
                      className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 dark:text-gray-300">
                    Additional Notes
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information"
                      className="min-h-[80px] bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sticky bottom-0 pt-4 pb-2 bg-white dark:bg-dark-300 mt-6 flex flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-500 w-full sm:w-auto"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900 w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Appointment"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

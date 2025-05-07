/* eslint-disable no-unused-vars */
import { E164Number } from "libphonenumber-js/core";
import Image from "next/image";
import ReactDatePicker from "react-datepicker";
import { Control } from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Doctors } from "@/constants";
import { Checkbox } from "./ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { getDoctorAppointments } from "@/lib/actions/appointment.actions";
import { useRealtime } from "@/contexts/RealtimeContext";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

import "react-datepicker/dist/react-datepicker.css";

export enum FormFieldType {
  INPUT = "input",
  TEXTAREA = "textarea",
  PHONE_INPUT = "phoneInput",
  CHECKBOX = "checkbox",
  DATE_PICKER = "datePicker",
  SELECT = "select",
  SKELETON = "skeleton",
}

// Add a cache for doctor availability
const availabilityCache = new Map<
  string,
  {
    data: any;
    timestamp: number;
    expiresAt: number;
  }
>();

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

interface CustomProps {
  control: Control<any>;
  name: string;
  label?: string;
  placeholder?: string;
  iconSrc?: string;
  iconAlt?: string;
  disabled?: boolean;
  dateFormat?: string;
  showTimeSelect?: boolean;
  children?: React.ReactNode;
  renderSkeleton?: (field: any) => React.ReactNode;
  fieldType: FormFieldType;
  reservedDates?: { startDate: Date; endDate: Date }[];
  doctorId?: string;
}

// Integrated appointment date picker component with dialog
const AppointmentDatePicker = ({
  field,
  doctorId,
  dateFormat = "MM/dd/yyyy h:mm aa",
}: {
  field: any;
  doctorId?: string;
  dateFormat?: string;
}) => {
  const { subscribeToAppointments, subscribeToAvailabilityChanges } =
    useRealtime();
  const [availability, setAvailability] = useState<{
    days: number[];
    startTime: number;
    endTime: number;
    holidays: Date[];
    maxAppointmentsPerDay?: number;
    bookingStartDate?: string;
    bookingEndDate?: string;
    blockedTimeSlots?: {
      date: string;
      startTime: string;
      endTime: string;
      reason: string;
    }[];
  }>({
    days: [],
    startTime: 8,
    endTime: 17,
    holidays: [],
    blockedTimeSlots: [],
  });

  const [availableTimes, setAvailableTimes] = useState<Date[]>([]);
  const [bookedSlots, setBookedSlots] = useState<
    { date: Date; slots: Date[]; count: number }[]
  >([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    field.value ?? null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateSelectionError, setDateSelectionError] = useState("");
  const [subscriptionsSet, setSubscriptionsSet] = useState(false);

  // Added ref to prevent state updates during unmount
  const isMounted = useRef(true);
  // Ref to control dialog open state to avoid loops
  const dialogOpenRef = useRef(dialogOpen);

  // Add logic to extract bookingStartDate and bookingEndDate from doctor availability
  const [bookingRange, setBookingRange] = useState<{
    min: Date | null;
    max: Date | null;
  }>({ min: null, max: null });

  // Set up cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Force cleanup when unmounting
      setSubscriptionsSet(false);
    };
  }, []);

  // Update ref when dialogOpen changes only if necessary
  useEffect(() => {
    if (dialogOpenRef.current !== dialogOpen) {
      dialogOpenRef.current = dialogOpen;
    }
  }, [dialogOpen]);

  // Define utility functions at the top to avoid reference errors
  const isSameDay = useCallback((date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }, []);

  // Helper function to convert time strings to minutes for comparison
  const timeToMinutes = useCallback((timeString: string): number => {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours * 60 + minutes;
  }, []);

  // Define generateTimeSlots first, before processAvailabilityData
  const generateTimeSlots = useCallback((doctor: any) => {
    if (!doctor || !doctor.availability) return;

    const times: Date[] = [];
    const availability = doctor.availability;

    // Create time slots in 30-minute increments
    for (
      let hour = availability.startTime;
      hour < availability.endTime;
      hour++
    ) {
      // Skip lunch time (12:00 PM to 1:00 PM)
      if (hour !== 12) {
        times.push(new Date(0, 0, 0, hour, 0));
        times.push(new Date(0, 0, 0, hour, 30));
      }
    }

    setAvailableTimes(times);
  }, []);

  // Extract the processing logic into a separate function
  const processAvailabilityData = useCallback(
    (doctorAvailability: any) => {
      const newAvailability = {
        days: doctorAvailability.days || [1, 2, 3, 4, 5],
        startTime: doctorAvailability.startTime || 8,
        endTime: doctorAvailability.endTime || 17,
        holidays: doctorAvailability.holidays || [],
        maxAppointmentsPerDay: doctorAvailability.maxAppointmentsPerDay || 10,
        blockedTimeSlots: doctorAvailability.blockedTimeSlots || [],
      };

      // Set booking range if present
      let min = null,
        max = null;
      if (doctorAvailability.bookingStartDate)
        min = new Date(doctorAvailability.bookingStartDate);
      if (doctorAvailability.bookingEndDate)
        max = new Date(doctorAvailability.bookingEndDate);
      setBookingRange({ min, max });

      // Only update state if values have changed
      if (JSON.stringify(availability) !== JSON.stringify(newAvailability)) {
        setAvailability(newAvailability);
        generateTimeSlots({ availability: newAvailability });
      }

      if (!dialogOpen && !selectedDate) {
        setSelectedDate(null);
        field.onChange(null);
      }
    },
    [availability, dialogOpen, selectedDate, field, generateTimeSlots]
  );

  // Optimize fetchDoctorAvailability with caching
  const fetchDoctorAvailability = useCallback(async () => {
    if (!doctorId) return;

    // Find doctor by name
    const doctor = Doctors.find((doc) => doc.name === doctorId);
    if (!doctor) return;

    // Check if we have a valid cache entry
    const cacheKey = `doctor-availability-${doctor.id}`;
    const now = Date.now();
    const cachedData = availabilityCache.get(cacheKey);

    if (cachedData && cachedData.expiresAt > now) {
      console.log(
        `Using cached availability for ${doctor.name} (ID: ${doctor.id})`
      );

      // Use cached data
      const doctorAvailability = cachedData.data;
      processAvailabilityData(doctorAvailability);
      return;
    }

    console.log(
      `Fetching fresh availability for ${doctor.name} (ID: ${doctor.id})`
    );
    setIsLoading(true);

    try {
      // Get availability from server
      const { getDoctorAvailability } = await import(
        "@/lib/actions/appointment.actions"
      );
      const serverAvailability = await getDoctorAvailability(doctor.id);

      // If server has availability, use it; otherwise use default from Doctors constant
      const doctorAvailability = serverAvailability || doctor.availability;

      // Cache the availability data
      availabilityCache.set(cacheKey, {
        data: doctorAvailability,
        timestamp: now,
        expiresAt: now + CACHE_TTL,
      });

      // Process the data
      processAvailabilityData(doctorAvailability);
    } catch (error) {
      console.error("Error fetching doctor availability:", error);
      // Fallback to default availability from Doctors constant
      processAvailabilityData(doctor.availability);
    } finally {
      setIsLoading(false);
    }
  }, [doctorId]);

  // Optimize the fetchBookedAppointments function
  const fetchBookedAppointments = useCallback(async (doctorName: string) => {
    if (!doctorName) return;

    // Find the doctor by name to get the ID
    const doctor = Doctors.find((doc) => doc.name === doctorName);
    if (!doctor) {
      console.log(`Doctor not found with name: ${doctorName}`);
      return;
    }

    // Check if we have a valid cache entry
    const cacheKey = `doctor-appointments-${doctor.id}`;
    const now = Date.now();
    const cachedData = availabilityCache.get(cacheKey);

    if (cachedData && cachedData.expiresAt > now) {
      console.log(`Using cached appointments for ${doctorName}`);
      setBookedSlots(cachedData.data);
      return;
    }

    console.log(`Fetching fresh appointments for ${doctorName}`);
    setIsLoading(true);

    try {
      // Use doctorName for this function since that's how appointments are stored
      const appointments = await getDoctorAppointments(doctorName);

      // Process appointments in batches for better performance
      const batchSize = 50;
      const bookedByDate: { date: Date; slots: Date[]; count: number }[] = [];

      for (let i = 0; i < appointments.length; i += batchSize) {
        const batch = appointments.slice(i, i + batchSize);

        // Process this batch
        batch.forEach((appointment: any) => {
          const appointmentDate = new Date(appointment.schedule);

          // Find if we already have this date in our accumulator
          const existingDateIndex = bookedByDate.findIndex((item) =>
            isSameDay(item.date, appointmentDate)
          );

          if (existingDateIndex >= 0) {
            // Add this time to existing date's slots
            bookedByDate[existingDateIndex].slots.push(appointmentDate);
            bookedByDate[existingDateIndex].count += 1;
          } else {
            // Create new date entry with this slot
            bookedByDate.push({
              date: appointmentDate,
              slots: [appointmentDate],
              count: 1,
            });
          }
        });

        // Allow UI to breathe if we have many appointments
        if (i + batchSize < appointments.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // Cache the processed data
      availabilityCache.set(cacheKey, {
        data: bookedByDate,
        timestamp: now,
        expiresAt: now + CACHE_TTL,
      });

      setBookedSlots(bookedByDate);
    } catch (error) {
      console.error("Error fetching booked appointments:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update useEffect that initializes doctor availability:
  useEffect(() => {
    if (!doctorId) return;

    // Find doctor by name (the doctorId param is actually the doctor's name)
    const doctor = Doctors.find((doc) => doc.name === doctorId);
    if (!doctor) return;

    console.log("Doctor found in CustomFormField:", {
      name: doctor.name,
      id: doctor.id,
    });

    fetchDoctorAvailability();
    fetchBookedAppointments(doctorId);
  }, [doctorId]);

  // Separate effect for setting up subscriptions
  useEffect(() => {
    if (!doctorId || subscriptionsSet) return;

    // Find the doctor by name (the doctorId param is actually the doctor's name)
    const doctor = Doctors.find((doc) => doc.name === doctorId);
    if (!doctor) return;

    console.log("Setting up subscriptions for doctor:", doctor.id);

    // Always use doctor.id NOT doctor.name for consistency
    const unsubscribeAvailability = subscribeToAvailabilityChanges(
      doctor.id, // <-- Use doctor.id here
      (newAvailability) => {
        const updatedAvailability = {
          days: newAvailability.days || [1, 2, 3, 4, 5],
          startTime: newAvailability.startTime || 8,
          endTime: newAvailability.endTime || 17,
          holidays: newAvailability.holidays || [],
          maxAppointmentsPerDay: newAvailability.maxAppointmentsPerDay || 10,
          blockedTimeSlots: newAvailability.blockedTimeSlots || [],
        };

        if (
          JSON.stringify(availability) !== JSON.stringify(updatedAvailability)
        ) {
          setAvailability(updatedAvailability);
          generateTimeSlots({ availability: updatedAvailability });
        }
      }
    );

    const unsubscribeAppointments = subscribeToAppointments(
      (updatedAppointment) => {
        if (updatedAppointment.primaryPhysician === doctorId) {
          fetchBookedAppointments(doctorId);
        }
      }
    );

    setSubscriptionsSet(true);

    return () => {
      unsubscribeAvailability();
      unsubscribeAppointments();
      setSubscriptionsSet(false);
    };
  }, [doctorId, subscribeToAppointments, subscribeToAvailabilityChanges]);

  // Update the form field value when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      field.onChange(selectedDate);
    }
  }, [selectedDate]);

  // First, add the isTimeBlocked function before it's used in the dependency array
  // Function to check if a time is within a blocked time slot
  const isTimeBlocked = useCallback(
    (date: Date, timeString: string): boolean => {
      if (
        !availability?.blockedTimeSlots ||
        availability.blockedTimeSlots.length === 0
      ) {
        return false;
      }

      // Get blocked time slots for the specific date
      const formattedDate = format(date, "MMM dd, yyyy");
      const blockedSlotsForDate = availability.blockedTimeSlots.filter(
        (slot) => slot.date === formattedDate
      );

      if (blockedSlotsForDate.length === 0) {
        return false;
      }

      // Convert time strings to minutes for easier comparison
      const checkTimeString = timeString;
      const checkTimeMinutes = timeToMinutes(checkTimeString);

      return blockedSlotsForDate.some(
        (slot: { startTime: string; endTime: string }) => {
          const startMinutes = timeToMinutes(slot.startTime);
          const endMinutes = timeToMinutes(slot.endTime);
          return (
            checkTimeMinutes >= startMinutes && checkTimeMinutes < endMinutes
          );
        }
      );
    },
    [availability]
  );

  // Add the hasBookedSlots and isDateFullyBooked functions before they're used
  // Function to check if a date has any booked slots
  const hasBookedSlots = useCallback(
    (date: Date): boolean => {
      return bookedSlots.some((slot) => isSameDay(slot.date, date));
    },
    [bookedSlots, isSameDay]
  );

  // Function to check if a date has reached max appointments
  const isDateFullyBooked = useCallback(
    (date: Date): boolean => {
      if (!availability) return false;

      const maxAppointments = availability.maxAppointmentsPerDay || 10;
      const dateBookings = bookedSlots.filter((slot) =>
        isSameDay(slot.date, date)
      ).length;

      return dateBookings >= maxAppointments;
    },
    [availability, bookedSlots, isSameDay]
  );

  // Use useCallback for expensive time slot filtering operations
  const getAvailableTimesForDate = useCallback(
    (date: Date) => {
      if (!date || !availability) return [];

      const day = date.getDay();
      const isAvailable = availability.days.includes(day);

      if (!isAvailable) return [];

      // Check if the date falls on a holiday
      const isHoliday = availability.holidays?.some((holiday) =>
        isSameDay(new Date(holiday), date)
      );

      if (isHoliday) return [];

      return availableTimes.filter((time) => {
        // Skip if time is blocked in doctor's settings
        if (isTimeBlocked(date, format(time, "HH:mm"))) {
          return false;
        }

        // Combine date and time
        const dateTime = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          time.getHours(),
          time.getMinutes()
        );

        // Skip times in the past
        if (dateTime < new Date()) return false;

        // Skip if slot is already booked
        return !bookedSlots.some((bookedDate) => {
          return bookedDate.slots.some((bookedTime) => {
            const timeObj = new Date(bookedTime);
            return (
              isSameDay(timeObj, date) &&
              timeObj.getHours() === time.getHours() &&
              timeObj.getMinutes() === time.getMinutes()
            );
          });
        });
      });
    },
    [bookedSlots, isTimeBlocked, isSameDay, availability, availableTimes]
  );

  // Replace the isDateAvailable function with this version that doesn't reference itself in the dependency array
  const isDateAvailable = useCallback(
    (date: Date): boolean => {
      if (!date || !availability) return false;

      // Check if date falls within the doctor's booking range
      if (availability.bookingStartDate && availability.bookingEndDate) {
        const bookingStart = new Date(availability.bookingStartDate);
        const bookingEnd = new Date(availability.bookingEndDate);
        bookingStart.setHours(0, 0, 0, 0);
        bookingEnd.setHours(23, 59, 59, 999);

        if (date < bookingStart || date > bookingEnd) {
          return false;
        }
      }

      // Check if it's a working day
      const day = date.getDay();
      if (!availability.days.includes(day)) return false;

      // Check if it's a holiday
      const isHoliday = availability.holidays?.some((holiday) =>
        isSameDay(new Date(holiday), date)
      );
      if (isHoliday) return false;

      // Check if the date is fully booked
      if (isDateFullyBooked(date)) return false;

      // Make sure there are available time slots
      return getAvailableTimesForDate(date).length > 0;
    },
    [
      hasBookedSlots,
      getAvailableTimesForDate,
      isDateFullyBooked,
      availability,
      isSameDay,
    ]
  );

  // Optimize isTimeBooked with useCallback
  const isTimeBooked = useCallback(
    (date: Date) => {
      // First check if time is blocked - this is faster to check
      if (isTimeBlocked(date, format(date, "HH:mm"))) return true;

      // Check if it falls on a booked time slot
      return bookedSlots.some((bookedDate) => {
        return bookedDate.slots.some((slot) => {
          const slotDate = new Date(slot);
          return (
            date.getHours() === slotDate.getHours() &&
            date.getMinutes() === slotDate.getMinutes() &&
            isSameDay(date, slotDate)
          );
        });
      });
    },
    [bookedSlots, isTimeBlocked, isSameDay]
  );

  // Optimize the renderDayContents function with useCallback
  const renderDayContents = useCallback(
    (day: number, date: Date) => {
      const hasBookings = hasBookedSlots(date);
      const isFullyBooked = isDateFullyBooked(date);

      return (
        <div
          className={cn("w-full h-full flex items-center justify-center", {
            "bg-red-100 dark:bg-red-900/20": isFullyBooked,
            "bg-yellow-50 dark:bg-yellow-900/10": hasBookings && !isFullyBooked,
            "text-gray-400": !isDateAvailable(date),
          })}
        >
          {day}
        </div>
      );
    },
    [hasBookedSlots, isDateAvailable, isDateFullyBooked]
  );

  // Handle date selection in dialog
  const handleDateChange = (date: Date) => {
    setTempSelectedDate(date);
    setDateSelectionError("");

    // Check if time is selected (hours and minutes are not 0)
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
    if (!hasTime) {
      setDateSelectionError("Please select both a date and time");
    }
  };

  // Confirm date selection from dialog
  const confirmDateSelection = () => {
    if (!tempSelectedDate) {
      setDateSelectionError("Please select both a date and time");
      return;
    }
    // Check if time is selected
    const hasTime =
      tempSelectedDate.getHours() !== 0 || tempSelectedDate.getMinutes() !== 0;
    if (!hasTime) {
      setDateSelectionError("Please select both a date and time");
      return;
    }
    setSelectedDate(tempSelectedDate);
    field.onChange(tempSelectedDate);
    setDialogOpen(false);
    setDateSelectionError("");
  };

  // Format date for display
  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "Select date and time";
    return (
      date.toLocaleDateString() +
      " - " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <div className="flex flex-col">
      {/* Date/Time Display and Trigger */}
      <div
        className="flex rounded-md border border-dark-500 bg-dark-400 cursor-pointer"
        onClick={() => doctorId && setDialogOpen(true)}
      >
        <Image
          src="/assets/icons/calendar.svg"
          height={24}
          width={24}
          alt="calendar"
          className="ml-2"
        />
        <div className="flex-1 p-2 text-sm">
          {isLoading
            ? "Loading availability..."
            : formatDateDisplay(selectedDate)}
        </div>
      </div>

      {/* DatePicker Dialog - Memoized to prevent re-renders */}
      {doctorId && (
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDialogOpen(false);
              setTempSelectedDate(null);
              setDateSelectionError("");
            } else {
              setDialogOpen(true);
            }
          }}
        >
          <DialogContent className="sm:max-w-md md:max-w-lg backdrop-blur-lg bg-white/60 dark:bg-zinc-900/60 rounded-2xl shadow-2xl border border-white/20 dark:border-zinc-700/40 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Appointment Date & Time</DialogTitle>
              <DialogDescription>
                Please select a date and time for your appointment from the
                available slots.
              </DialogDescription>
              {isLoading && (
                <p className="text-sm text-gray-500">
                  Loading real-time availability...
                </p>
              )}
              {doctorId && availability.days.length === 0 && (
                <div className="flex items-center gap-2 p-3 mt-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-yellow-600 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm">
                    This doctor is currently not available for appointments.
                    Please check back later or contact the clinic.
                  </span>
                </div>
              )}
            </DialogHeader>

            <div className="py-4 overflow-y-auto flex justify-center w-full">
              <style jsx global>{`
                /* Responsive adjustments for date and time picker */
                @media (max-width: 640px) {
                  .react-datepicker {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 100% !important;
                    max-width: 320px;
                  }

                  .react-datepicker__time-container {
                    width: 100% !important;
                    max-width: 280px;
                    margin-top: 1rem;
                    border-left: none !important;
                    border-top: 1px solid #363d36 !important;
                    padding-top: 1rem;
                  }

                  .react-datepicker__time-list-container {
                    width: 100% !important;
                    display: flex;
                    justify-content: center;
                  }

                  .react-datepicker__time-list {
                    width: auto !important;
                    max-width: 200px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                  }

                  .react-datepicker__time-list-item {
                    width: 100%;
                    text-align: center;
                  }
                }
                
                /* Styling for booked time slots with strikethrough */
                .react-datepicker__time-list-item--booked {
                  text-decoration: line-through !important;
                  color: #808080 !important;
                  font-weight: bold !important;
                  background-color: rgba(128, 128, 128, 0.2) !important;
                  pointer-events: none !important;
                  opacity: 0.7 !important;
                }
                
                /* Override any hover effects on booked slots */
                .react-datepicker__time-list-item--booked:hover {
                  background-color: rgba(128, 128, 128, 0.2) !important;
                  cursor: not-allowed !important;
                }
                
                /* Enhanced styling for current date (today) */
                .react-datepicker__day--today {
                  border: 2px solid #3b82f6 !important;
                  background-color: rgba(59, 130, 246, 0.15) !important;
                  border-radius: 4px !important;
                  font-weight: bold !important;
                  position: relative !important;
                }
                
                /* Add "TODAY" label on top of today's date */
                .react-datepicker__day--today::after {
                  content: "TODAY";
                  position: absolute;
                  top: -8px;
                  left: 50%;
                  transform: translateX(-50%);
                  font-size: 8px;
                  background-color: #3b82f6;
                  color: white;
                  padding: 1px 3px;
                  border-radius: 2px;
                  font-weight: bold;
                  letter-spacing: 0.5px;
                  z-index: 1;
                }
              `}</style>
              <ReactDatePicker
                selected={tempSelectedDate}
                onChange={handleDateChange}
                showTimeSelect
                inline={true}
                timeInputLabel="Time:"
                dateFormat={dateFormat}
                filterDate={isDateAvailable}
                includeTimes={
                  tempSelectedDate
                    ? getAvailableTimesForDate(tempSelectedDate)
                    : []
                }
                minDate={bookingRange.min}
                maxDate={bookingRange.max}
                placeholderText="Select date and time"
                timeFormat="h:mm aa"
                timeIntervals={30}
                timeCaption="Time"
                renderDayContents={renderDayContents}
                timeClassName={(time) => {
                  // Add class to booked time slots that are not selectable but should be displayed with strikethrough
                  if (tempSelectedDate) {
                    const dateTime = new Date(
                      tempSelectedDate.getFullYear(),
                      tempSelectedDate.getMonth(),
                      tempSelectedDate.getDate(),
                      time.getHours(),
                      time.getMinutes()
                    );
                    
                    // Check if this time is booked
                    const isBooked = bookedSlots.some(slot => 
                      slot.slots.some(bookedTime => {
                        const bookedDate = new Date(bookedTime);
                        return isSameDay(bookedDate, tempSelectedDate) && 
                               bookedDate.getHours() === time.getHours() && 
                               bookedDate.getMinutes() === time.getMinutes();
                      })
                    );
                    
                    if (isBooked) {
                      return 'react-datepicker__time-list-item--booked';
                    }
                  }
                  return '';
                }}
                renderCustomHeader={({
                  date,
                  decreaseMonth,
                  increaseMonth,
                }) => (
                  <div className="flex justify-between px-2 py-2">
                    <button
                      onClick={decreaseMonth}
                      type="button"
                      className="bg-dark-400 rounded-full p-1 text-white hover:bg-dark-500"
                    >
                      {"<"}
                    </button>
                    <div className="font-medium">
                      {date.toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <button
                      onClick={increaseMonth}
                      type="button"
                      className="bg-dark-400 rounded-full p-1 text-white hover:bg-dark-500"
                    >
                      {">"}
                    </button>
                  </div>
                )}
              />
            </div>

            {/* Error message */}
            {dateSelectionError && (
              <p className="text-sm text-red-500 font-medium text-center">
                {dateSelectionError}
              </p>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-2 text-12-regular justify-center">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-700 opacity-90 mr-1"></div>
                <span>Fully Booked</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-500 mr-1"></div>
                <span>Holiday/Off</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 line-through mr-1">Time</span>
                <span>Booked Slot</span>
              </div>
            </div>

            {/* Action buttons - Fixed at bottom */}
            <div className="sticky bottom-0 mt-4 flex justify-end gap-3 bg-white/60 dark:bg-zinc-900/60 py-4 border-t border-white/20 dark:border-zinc-700/40">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setTempSelectedDate(null);
                  setDateSelectionError("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDateSelection}
                disabled={
                  !tempSelectedDate || isLoading || !!dateSelectionError
                }
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Helper text */}
      {doctorId ? (
        selectedDate ? (
          <p className="text-12-regular text-green-500 mt-1">
            Appointment set for {selectedDate.toLocaleDateString()} at{" "}
            {selectedDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        ) : (
          <p className="text-12-regular text-dark-600 mt-1">
            {isLoading
              ? "Loading availability..."
              : availability.days.length === 0
                ? "Click to select a date and time (note: doctor availability may be limited)"
                : "Please select an available date and time"}
          </p>
        )
      ) : (
        <p className="text-12-regular text-dark-600 mt-1">
          Select a doctor first to view available slots
        </p>
      )}
    </div>
  );
};

const RenderInput = ({ field, props }: { field: any; props: CustomProps }) => {
  switch (props.fieldType) {
    case FormFieldType.INPUT:
      return (
        <div className="flex rounded-md border border-dark-500 bg-dark-400">
          {props.iconSrc && (
            <Image
              src={props.iconSrc}
              height={24}
              width={24}
              alt={props.iconAlt || "icon"}
              className="ml-2"
            />
          )}
          <FormControl>
            <Input
              placeholder={props.placeholder}
              {...field}
              className="shad-input border-0"
            />
          </FormControl>
        </div>
      );
    case FormFieldType.TEXTAREA:
      return (
        <FormControl>
          <Textarea
            placeholder={props.placeholder}
            {...field}
            className="shad-textArea"
            disabled={props.disabled}
          />
        </FormControl>
      );
    case FormFieldType.PHONE_INPUT:
      return (
        <FormControl>
          <PhoneInput
            defaultCountry="PH"
            placeholder={props.placeholder}
            international
            withCountryCallingCode
            value={field.value as E164Number | undefined}
            onChange={field.onChange}
            className="input-phone"
          />
        </FormControl>
      );
    case FormFieldType.CHECKBOX:
      return (
        <FormControl>
          <div className="flex items-center gap-4">
            <Checkbox
              id={props.name}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <label htmlFor={props.name} className="checkbox-label">
              {props.label}
            </label>
          </div>
        </FormControl>
      );
    case FormFieldType.DATE_PICKER:
      return (
        <FormControl>
          <AppointmentDatePicker
            field={field}
            doctorId={props.doctorId}
            dateFormat={props.dateFormat}
          />
        </FormControl>
      );
    case FormFieldType.SELECT:
      return (
        <FormControl>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <SelectTrigger className="shad-select-trigger">
              <SelectValue placeholder={props.placeholder} />
            </SelectTrigger>
            <SelectContent className="shad-select-content">
              {props.children}
            </SelectContent>
          </Select>
        </FormControl>
      );
    case FormFieldType.SKELETON:
      return props.renderSkeleton ? props.renderSkeleton(field) : null;
    default:
      return null;
  }
};

const CustomFormField = (props: CustomProps) => {
  const { control, name, label } = props;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex-1">
          {props.fieldType !== FormFieldType.CHECKBOX && label && (
            <FormLabel className="shad-input-label">{label}</FormLabel>
          )}
          <RenderInput field={field} props={props} />

          <FormMessage className="shad-error" />
        </FormItem>
      )}
    />
  );
};

export default CustomFormField;

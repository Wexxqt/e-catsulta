/* eslint-disable no-unused-vars */
import { E164Number } from "libphonenumber-js/core";
import Image from "next/image";
import ReactDatePicker from "react-datepicker";
import { Control } from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import { useState, useEffect, useRef } from "react";
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
  }>({ days: [], startTime: 8, endTime: 17, holidays: [] });

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

  // Function to fetch booked appointments - moved outside the effect
  const fetchBookedAppointments = async (doctorId: string) => {
    if (!doctorId) return;

    setIsLoading(true);
    try {
      const appointments = await getDoctorAppointments(doctorId);

      // Group appointments by date
      const bookedByDate = appointments.reduce(
        (
          acc: { date: Date; slots: Date[]; count: number }[],
          appointment: any
        ) => {
          const appointmentDate = new Date(appointment.schedule);

          // Find if we already have this date in our accumulator
          const existingDateIndex = acc.findIndex((item) =>
            isSameDay(item.date, appointmentDate)
          );

          if (existingDateIndex >= 0) {
            // Add this time to existing date's slots
            acc[existingDateIndex].slots.push(appointmentDate);
            acc[existingDateIndex].count += 1;
          } else {
            // Create new date entry with this slot
            acc.push({
              date: appointmentDate,
              slots: [appointmentDate],
              count: 1,
            });
          }

          return acc;
        },
        []
      );

      setBookedSlots(bookedByDate);
    } catch (error) {
      console.error("Error fetching booked appointments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate available time slots - moved outside the effect
  const generateTimeSlots = (doctor: any) => {
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
  };

  // Update useEffect that initializes doctor availability:
  useEffect(() => {
    if (!doctorId) return;

    const doctor = Doctors.find((doc) => doc.name === doctorId);
    if (!doctor) return;

    console.log("Doctor found in CustomFormField:", {
      name: doctor.name,
      id: doctor.id,
    });

    const savedSettings = localStorage.getItem(
      `doctorAvailability_${doctor.id}`
    );
    let doctorAvailability;

    if (savedSettings) {
      try {
        doctorAvailability = JSON.parse(savedSettings);
        console.log("Found saved availability in localStorage:", {
          doctorId: doctor.id,
          hasData: !!doctorAvailability,
        });
      } catch (err) {
        doctorAvailability = doctor.availability;
      }
    } else {
      doctorAvailability = doctor.availability;
    }

    const newAvailability = {
      days: doctorAvailability.days || [1, 2, 3, 4, 5],
      startTime: doctorAvailability.startTime || 8,
      endTime: doctorAvailability.endTime || 17,
      holidays: doctorAvailability.holidays || [],
    };

    // Set booking range if present
    let min = null,
      max = null;
    if (doctorAvailability.bookingStartDate)
      min = new Date(doctorAvailability.bookingStartDate);
    if (doctorAvailability.bookingEndDate)
      max = new Date(doctorAvailability.bookingEndDate);
    setBookingRange({ min, max });

    if (JSON.stringify(availability) !== JSON.stringify(newAvailability)) {
      setAvailability(newAvailability);
    }

    if (!dialogOpen && !selectedDate) {
      setSelectedDate(null);
      field.onChange(null);
    }

    generateTimeSlots({ availability: newAvailability });
    fetchBookedAppointments(doctorId);
  }, [doctorId]);

  // Separate effect for setting up subscriptions
  useEffect(() => {
    if (!doctorId || subscriptionsSet) return;

    const doctor = Doctors.find((doc) => doc.name === doctorId);
    if (!doctor) return;

    const unsubscribeAvailability = subscribeToAvailabilityChanges(
      doctor.id,
      (newAvailability) => {
        const updatedAvailability = {
          days: newAvailability.days || [1, 2, 3, 4, 5],
          startTime: newAvailability.startTime || 8,
          endTime: newAvailability.endTime || 17,
          holidays: newAvailability.holidays || [],
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

  // Check if a date is available based on doctor's working days and holidays
  const isDateAvailable = (date: Date) => {
    const day = date.getDay();
    const now = new Date();

    // Check if the date is in the past
    if (date < now) return false;

    // Check if it's today but past working hours
    if (isSameDay(date, now)) {
      const currentHour = now.getHours();
      if (currentHour >= availability.endTime) return false;
    }

    // Check if it's a holiday
    const isHoliday = availability.holidays?.some((holiday) =>
      isSameDay(new Date(holiday), date)
    );
    if (isHoliday) return false;

    // Check if date has reached the daily booking limit (10 patients per day)
    const bookedDay = bookedSlots.find((slot) => isSameDay(slot.date, date));
    if (bookedDay && bookedDay.count >= 10) return false;

    // Check if it's a working day
    return availability.days.includes(day);
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Check if a specific date and time slot is booked
  const isTimeBooked = (date: Date) => {
    if (!date) return false;

    const bookedDay = bookedSlots.find((slot) => isSameDay(slot.date, date));
    if (!bookedDay) return false;

    return bookedDay.slots.some(
      (bookedTime) =>
        bookedTime.getHours() === date.getHours() &&
        bookedTime.getMinutes() === date.getMinutes()
    );
  };

  // Get available time slots for a specific date
  const getAvailableTimesForDate = (date: Date) => {
    if (!isDateAvailable(date)) return [];

    // Check if we're at the 10-patient limit for this day
    const bookedDay = bookedSlots.find((slot) => isSameDay(slot.date, date));
    if (bookedDay && bookedDay.count >= 10) return [];

    const now = new Date();
    const isToday = isSameDay(date, now);

    return availableTimes.filter((time) => {
      const slotDateTime = new Date(date);
      slotDateTime.setHours(time.getHours(), time.getMinutes());

      // For today, only show future time slots with a 30-minute buffer
      if (isToday) {
        // Add a 30-minute buffer to current time
        const bufferTime = new Date(now);
        bufferTime.setMinutes(bufferTime.getMinutes() + 30);

        if (slotDateTime <= bufferTime) return false;
      }

      // Exclude lunch time (12:00 PM to 1:00 PM)
      if (time.getHours() === 12) return false;

      // Check if the slot is booked
      return !isTimeBooked(slotDateTime);
    });
  };

  // Custom day renderer to apply specific classes to days
  const renderDayContents = (day: number, date: Date) => {
    // Check if this date is fully booked (10 appointments)
    const fullyBooked = isDateFullyBooked(date);
    if (fullyBooked) {
      return <div className="fully-booked">{day}</div>;
    }
    // No longer adding special styling for days with bookings that aren't fully booked
    return day;
  };

  // Function to customize time slots display
  const renderTimeListItem = ({
    time,
    date,
    handleClick,
    isSelected,
    disabled,
  }: any) => {
    // Check if this time slot is booked
    const timeDate = new Date(date);
    const hour = parseInt(time.split(":")[0]);
    const minute = time.includes("30") ? 30 : 0;
    timeDate.setHours(hour, minute);

    const isBooked = isTimeBooked(timeDate);

    const className = isBooked
      ? "react-datepicker__time-list-item--booked"
      : isSelected
        ? "react-datepicker__time-list-item--selected"
        : disabled
          ? "react-datepicker__time-list-item--disabled"
          : "";

    return (
      <li
        onClick={isBooked || disabled ? undefined : handleClick}
        className={`react-datepicker__time-list-item ${className}`}
      >
        {time}
      </li>
    );
  };

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

  // Check if a date has any booked slots
  const hasBookedSlots = (date: Date) => {
    return bookedSlots.some((slot) => isSameDay(slot.date, date));
  };

  // Check if a date is fully booked (10 appointments)
  const isDateFullyBooked = (date: Date) => {
    const bookedDay = bookedSlots.find((slot) => isSameDay(slot.date, date));
    return bookedDay && bookedDay.count >= 10;
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
      {/* Doctor unavailable warning */}
      {doctorId && availability.days.length === 0 && (
        <div className="flex items-center gap-2 p-3 mb-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-yellow-600"
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
          <span>
            This doctor is currently not available for appointments. Please
            check back later or contact the clinic.
          </span>
        </div>
      )}
      {/* Date/Time Display and Trigger */}
      <div
        className={`flex rounded-md border border-dark-500 bg-dark-400 ${availability.days.length === 0 ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
        onClick={() =>
          doctorId && availability.days.length > 0 && setDialogOpen(true)
        }
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
          <DialogContent className="sm:max-w-md md:max-w-lg backdrop-blur-lg bg-white/60 dark:bg-zinc-900/60 rounded-2xl shadow-2xl border border-white/20 dark:border-zinc-700/40">
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
            </DialogHeader>

            <div className="py-4">
              <style jsx global>{`
                /* Remove the booked-day class that applies red styling to days with any bookings */

                /* Style for fully booked days (10 patients reached) */
                .fully-booked-day,
                .fully-booked {
                  background-color: rgba(220, 0, 0, 0.8) !important;
                  border-radius: 0.2rem;
                  color: white !important;
                  font-weight: bold;
                  text-decoration: line-through;
                  cursor: not-allowed !important;
                }

                /* Style for booked time slots in the time picker */
                .react-datepicker__time-list-item--disabled {
                  color: #ccc !important;
                  text-decoration: line-through;
                }

                /* Add CSS for individual time slots that are booked */
                .react-datepicker__time-list-item--booked {
                  background-color: rgba(255, 0, 0, 0.3) !important;
                  color: white !important;
                  font-weight: bold;
                  text-decoration: line-through;
                  cursor: not-allowed !important;
                }

                /* Add CSS class for days that have reached the 10 patient limit */
                ${bookedSlots
                  .map((slot) => {
                    const date = new Date(slot.date);
                    const month = date.getMonth();
                    const day = date.getDate();
                    const year = date.getFullYear();

                    // Only apply styling for fully booked days (10 patient limit)
                    if (slot.count >= 10) {
                      return `
                    .react-datepicker__day[aria-label*="${month + 1}/${day}/${year}"] {
                      background-color: rgba(220, 0, 0, 0.8) !important;
                      border-radius: 0.2rem;
                      color: white !important;
                      font-weight: bold;
                      text-decoration: line-through;
                      cursor: not-allowed !important;
                    }
                  `;
                    }

                    // Don't apply special styling for days with some bookings but not fully booked
                    return "";
                  })
                  .join("")}

                /* Style for booked time slots */
              ${bookedSlots
                  .flatMap((slot) =>
                    slot.slots.map((bookedTime) => {
                      const hours = bookedTime.getHours();
                      const minutes = bookedTime.getMinutes();

                      // Create a more robust selector
                      return `
                    .react-datepicker__time-list-item[aria-disabled="false"]:nth-child(${hours * 2 + (minutes === 30 ? 2 : 1)}) {
                      background-color: rgba(255, 0, 0, 0.3) !important;
                      color: white !important;
                      font-weight: bold;
                      text-decoration: line-through;
                      pointer-events: none;
                    }
                  `;
                    })
                  )
                  .join("")}
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
                <span>Fully Booked (10/day)</span>
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

            {/* Action buttons */}
            <div className="mt-4 flex justify-end gap-3">
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

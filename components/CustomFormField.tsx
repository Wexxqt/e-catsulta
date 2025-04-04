/* eslint-disable no-unused-vars */
import { E164Number } from "libphonenumber-js/core";
import Image from "next/image";
import ReactDatePicker from "react-datepicker";
import { Control } from "react-hook-form";
import PhoneInput from "react-phone-number-input";
import { useState, useEffect } from "react";
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

// Integrated appointment date picker component
const AppointmentDatePicker = ({ field, doctorId, dateFormat = "MM/dd/yyyy h:mm aa" }: { 
  field: any;
  doctorId?: string;
  dateFormat?: string;
}) => {
  const [availability, setAvailability] = useState<{ 
    days: number[], 
    startTime: number, 
    endTime: number 
  }>({ days: [], startTime: 8, endTime: 17 });
  
  const [availableTimes, setAvailableTimes] = useState<Date[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(field.value || null);

  useEffect(() => {
    if (doctorId) {
      const doctor = Doctors.find(doc => doc.name === doctorId);
      if (doctor) {
        setAvailability({
          days: doctor.availability.days,
          startTime: doctor.availability.startTime,
          endTime: doctor.availability.endTime,
        });

        // Reset selected date when doctor changes
        setSelectedDate(null);
        field.onChange(null);
        
        // Generate available time slots
        generateTimeSlots(doctor);
      }
    }
  }, [doctorId]);

  // Generate available time slots for the selected doctor
  const generateTimeSlots = (doctor: any) => {
    const times: Date[] = [];
    const booked: Date[] = [];
    
    // Create time slots in 30-minute increments
    for (let hour = doctor.availability.startTime; hour < doctor.availability.endTime; hour++) {
      times.push(new Date(0, 0, 0, hour, 0));
      times.push(new Date(0, 0, 0, hour, 30));
      
      // For demo purposes - mark some slots as booked
      if (Math.random() > 0.7) {
        booked.push(new Date(0, 0, 0, hour, 0));
      }
      if (Math.random() > 0.7) {
        booked.push(new Date(0, 0, 0, hour, 30));
      }
    }
    
    setAvailableTimes(times);
    setBookedSlots(booked);
  };

  // Check if a date is available based on doctor's working days
  const isDateAvailable = (date: Date) => {
    const day = date.getDay();
    // Only show future dates
    const isInFuture = date >= new Date();
    return availability.days.includes(day) && isInFuture;
  };

  // Check if a time slot is booked
  const isTimeBooked = (time: Date) => {
    if (!time) return false;
    
    return bookedSlots.some(
      bookedTime => 
        bookedTime.getHours() === time.getHours() && 
        bookedTime.getMinutes() === time.getMinutes()
    );
  };

  // Handle date selection
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    field.onChange(date);
  };

  return (
    <div className="flex flex-col">
      <div className="flex rounded-md border border-dark-500 bg-dark-400">
        <Image
          src="/assets/icons/calendar.svg"
          height={24}
          width={24}
          alt="calendar"
          className="ml-2"
        />
        <ReactDatePicker
          showTimeSelect
          selected={selectedDate}
          onChange={handleDateChange}
          timeInputLabel="Time:"
          dateFormat={dateFormat}
          wrapperClassName="date-picker"
          filterDate={isDateAvailable}
          includeTimes={availableTimes}
          minDate={new Date()}
          placeholderText="Select date and time"
          timeFormat="h:mm aa"
          timeIntervals={30}
          timeCaption="Time"
          inline={false}
          renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
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
      
      {/* Legend */}
      <div className="flex gap-4 mt-2 text-12-regular justify-end">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-700 mr-1"></div>
          <span>Booked</span>
        </div>
      </div>
      
      {/* Helper text */}
      {doctorId ? (
        selectedDate ? (
          <p className="text-12-regular text-green-500 mt-1">
            Appointment set for {selectedDate.toLocaleDateString()} at {selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : (
          <p className="text-12-regular text-dark-600 mt-1">
            Please select an available date and time
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
            <FormControl>
              <SelectTrigger className="shad-select-trigger">
                <SelectValue placeholder={props.placeholder} />
              </SelectTrigger>
            </FormControl>
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
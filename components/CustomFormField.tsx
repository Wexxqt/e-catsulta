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

const RenderInput = ({ field, props }: { field: any; props: CustomProps }) => {
  const [availability, setAvailability] = useState<{ days: number[], startTime: number, endTime: number }>({ days: [], startTime: 8, endTime: 17 });
  const [availableTimes, setAvailableTimes] = useState<Date[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Date[]>([]);

  useEffect(() => {
    if (props.doctorId) {
      const doctor = Doctors.find(doc => doc.id === props.doctorId);
      if (doctor) {
        setAvailability({
          days: doctor.availability.days,
          startTime: doctor.availability.startTime,
          endTime: doctor.availability.endTime,
        });

        // Compute available times
        const times: Date[] = [];
        // Simulate some booked slots for demonstration
        const booked: Date[] = [];
        
        for (let hour = doctor.availability.startTime; hour < doctor.availability.endTime; hour++) {
          times.push(new Date(0, 0, 0, hour, 0)); // Adding on-the-hour times
          times.push(new Date(0, 0, 0, hour, 30)); // Adding half-hour times
          
          // Randomly mark some slots as booked (for demonstration)
          if (Math.random() > 0.8) {
            booked.push(new Date(0, 0, 0, hour, 0));
          }
          if (Math.random() > 0.8) {
            booked.push(new Date(0, 0, 0, hour, 30));
          }
        }
        
        setAvailableTimes(times);
        setBookedSlots(booked);
      }
    }
  }, [props.doctorId]);

  const isDateAvailable = (date: Date) => {
    const day = date.getDay();
    return availability.days.includes(day);
  };

  // Function to check if a time slot is booked
  const isTimeBooked = (time: Date) => {
    if (!time) return false;
    
    return bookedSlots.some(
      bookedTime => 
        bookedTime.getHours() === time.getHours() && 
        bookedTime.getMinutes() === time.getMinutes()
    );
  };

  // Add legend component for date picker
  const DatePickerLegend = () => (
    <div className="flex justify-end mt-2 gap-4 text-12-regular">
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
        <span>Available</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-red-700 mr-1"></div>
        <span>Booked</span>
      </div>
    </div>
  );

  // Custom time component to show available/booked status
  const renderTimeListItem = (time: Date, selected: boolean, onClick: () => void) => {
    const isBooked = isTimeBooked(time);
    return (
      <li
        onClick={onClick}
        className={`${
          selected ? "react-datepicker__time-list-item--selected" : "react-datepicker__time-list-item"
        } ${isBooked ? "bg-red-700/20" : "hover:bg-green-500/20"}`}
      >
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        <span className="ml-2">
          {isBooked ? "🔴" : "🟢"}
        </span>
      </li>
    );
  };

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
        <div className="flex flex-col">
          <div className="flex rounded-md border border-dark-500 bg-dark-400">
            <Image
              src="/assets/icons/calendar.svg"
              height={24}
              width={24}
              alt="calendar"
              className="ml-2"
            />
            <FormControl>
              <ReactDatePicker
                showTimeSelect
                selected={field.value}
                onChange={(date: Date) => field.onChange(date)}
                timeInputLabel="Time:"
                dateFormat={props.dateFormat ?? "MM/dd/yyyy h:mm aa"}
                wrapperClassName="date-picker"
                filterDate={isDateAvailable}
                includeTimes={availableTimes}
                renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
                  <div className="flex justify-between px-2 py-2">
                    <button
                      onClick={decreaseMonth}
                      type="button"
                      className="bg-dark-400 rounded-full p-1"
                    >
                      {"<"}
                    </button>
                    <div>
                      {date.toLocaleString("default", {
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <button
                      onClick={increaseMonth}
                      type="button"
                      className="bg-dark-400 rounded-full p-1"
                    >
                      {">"}
                    </button>
                  </div>
                )}
              />
            </FormControl>
          </div>
          <DatePickerLegend />
        </div>
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
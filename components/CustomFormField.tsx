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

  useEffect(() => {
    if (props.doctorId) {
      const doctor = Doctors.find(doc => doc.id === props.doctorId);
      if (doctor) {
        setAvailability({
          days: doctor.availability.days,
          startTime: doctor.availability.startTime,
          endTime: doctor.availability.endTime,
        });
      } else {
        // Default if doctor not found
        setAvailability({ days: [0, 1, 2, 3, 4, 5, 6], startTime: 8, endTime: 17 });
      }
    } else {
      // Default if no doctor selected
      setAvailability({ days: [0, 1, 2, 3, 4, 5, 6], startTime: 8, endTime: 17 });
    }
  }, [props.doctorId]);

  const isDateAvailable = (date: Date) => {
    // Only filter by day of week if a doctor is selected
    if (props.doctorId) {
      const day = date.getDay();
      return availability.days.includes(day);
    }
    return true; // Allow all days if no doctor is selected
  };

  // Generate time slots
  const generateTimeSlots = () => {
    const times: Date[] = [];
    const currentDate = new Date();
    
    for (let hour = availability.startTime; hour < availability.endTime; hour++) {
      // On the hour
      const hourTime = new Date(currentDate);
      hourTime.setHours(hour, 0, 0, 0);
      times.push(hourTime);
      
      // Half past the hour
      const halfHourTime = new Date(currentDate);
      halfHourTime.setHours(hour, 30, 0, 0);
      times.push(halfHourTime);
    }
    
    return times;
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
        <div className="flex rounded-md border border-dark-500 bg-dark-400">
          <Image
            src="/assets/icons/calendar.svg"
            height={24}
            width={24}
            alt="user"
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
              minTime={new Date(0, 0, 0, availability.startTime)}
              maxTime={new Date(0, 0, 0, availability.endTime - 1, 30)}
              timeIntervals={30}
            />
          </FormControl>
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
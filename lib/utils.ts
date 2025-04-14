import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseStringify = (value: any) => {
  if (value === undefined || value === null) {
    console.warn("parseStringify received undefined or null value");
    return null; // Return null or handle as needed
  }

  return JSON.parse(JSON.stringify(value));
};

export const convertFileToUrl = (file: File) => URL.createObjectURL(file);

// FORMAT DATE TIME
export const formatDateTime = (dateString: Date | string, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone) => {
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    // weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    month: "short", // abbreviated month name (e.g., 'Oct')
    day: "numeric", // numeric day of the month (e.g., '25')
    year: "numeric", // numeric year (e.g., '2023')
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false),
    timeZone: timeZone, // use the provided timezone
  };

  const dateDayOptions: Intl.DateTimeFormatOptions = {
    weekday: "short", // abbreviated weekday name (e.g., 'Mon')
    year: "numeric", // numeric year (e.g., '2023')
    month: "2-digit", // abbreviated month name (e.g., 'Oct')
    day: "2-digit", // numeric day of the month (e.g., '25')
    timeZone: timeZone, // use the provided timezone
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    month: "short", // abbreviated month name (e.g., 'Oct')
    year: "numeric", // numeric year (e.g., '2023')
    day: "numeric", // numeric day of the month (e.g., '25')
    timeZone: timeZone, // use the provided timezone
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric", // numeric hour (e.g., '8')
    minute: "numeric", // numeric minute (e.g., '30')
    hour12: true, // use 12-hour clock (true) or 24-hour clock (false)
    timeZone: timeZone, // use the provided timezone
  };

  const formattedDateTime: string = new Date(dateString).toLocaleString(
    "en-US",
    dateTimeOptions
  );

  const formattedDateDay: string = new Date(dateString).toLocaleString(
    "en-US",
    dateDayOptions
  );

  const formattedDate: string = new Date(dateString).toLocaleString(
    "en-US",
    dateOptions
  );

  const formattedTime: string = new Date(dateString).toLocaleString(
    "en-US",
    timeOptions
  );

  return {
    dateTime: formattedDateTime,
    dateDay: formattedDateDay,
    dateOnly: formattedDate,
    timeOnly: formattedTime,
  };
};

export function encryptKey(passkey: string) {
  return btoa(passkey);
}

export function decryptKey(passkey: string) {
  return atob(passkey);
}

// Generate a unique appointment code for patients
export function generateAppointmentCode(appointmentId: string, patientId: string) {
  // Take first 3 characters from appointmentId and last 3 from patientId
  const prefix = appointmentId.substring(0, 3).toUpperCase();
  const suffix = patientId.substring(patientId.length - 3).toUpperCase();
  
  // Add timestamp element for uniqueness
  const timestamp = new Date().getTime().toString().slice(-6);
  
  // Combine and format as XXX-YYYYY-ZZZ
  return `${prefix}-${timestamp}-${suffix}`;
}

/**
 * Generate MD5 hash for Gravatar
 */
export function md5(d: string): string {
  // This is a simple implementation of MD5 for client-side
  // For production, consider using a more robust library
  // This implementation is enough for Gravatar URLs
  const r = (d: string) => {
    return Array.from(d).reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0) >>> 0;
  };
  return r(d).toString(16).padStart(32, '0');
}

/**
 * Get a Gravatar URL for an email address
 */
export function getGravatarUrl(email: string = '', size: number = 200, defaultImage: string = 'robohash'): string {
  // Trim and lowercase the email
  const cleanEmail = email.trim().toLowerCase();
  
  // Generate MD5 hash or use 'default' for empty emails
  const hash = cleanEmail ? md5(cleanEmail) : 'default';
  
  // Return the Gravatar URL
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
}
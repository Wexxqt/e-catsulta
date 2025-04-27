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
export const formatDateTime = (
  dateString: Date | string,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
) => {
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
export function generateAppointmentCode(
  appointmentId: string,
  patientId: string
) {
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
    return (
      Array.from(d).reduce((a, c) => (a << 5) - a + c.charCodeAt(0), 0) >>> 0
    );
  };
  return r(d).toString(16).padStart(32, "0");
}

/**
 * Get a Gravatar URL for an email address
 */
export function getGravatarUrl(
  email: string = "",
  size: number = 200,
  defaultImage: string = "robohash"
): string {
  // Trim and lowercase the email if it exists, otherwise use empty string
  const cleanEmail = email ? email.trim().toLowerCase() : "";

  // Generate MD5 hash or use 'default' for empty emails
  const hash = cleanEmail ? md5(cleanEmail) : "default";

  // Return the Gravatar URL
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=${defaultImage}`;
}

/**
 * Detects if the current device is a low-end device based on available
 * hardware capabilities, browser features, and user agent information
 */
export function isLowEndDevice(): boolean {
  if (typeof window === "undefined") return false;

  // Check for device memory (available in Chrome)
  const lowMemory =
    "deviceMemory" in navigator && (navigator as any).deviceMemory < 2;

  // Check for hardware concurrency (available in most browsers)
  const lowConcurrency = navigator.hardwareConcurrency < 4;

  // Check for known low-end device user agents (iPhone 6/6s, older Android phones)
  const userAgent = navigator.userAgent;
  const isOlderPhone =
    /iPhone\s(5|6|7|8|SE)/i.test(userAgent) ||
    /Android\s[4-7]/i.test(userAgent) ||
    /Windows\sPhone/i.test(userAgent);

  // Check for connection type if available
  const connection = (navigator as any).connection;
  const slowConnection =
    connection &&
    (connection.effectiveType === "2g" ||
      connection.effectiveType === "slow-2g");

  // Device is considered low-end if it meets any of these criteria
  return lowMemory || lowConcurrency || isOlderPhone || slowConnection;
}

/**
 * Gets the optimized image quality based on the device and connection
 */
export function getOptimizedImageQuality(): number {
  if (typeof window === "undefined") return 75; // Default quality

  const connection = (navigator as any).connection;

  if (isLowEndDevice()) {
    return 50; // Lower quality for low-end devices
  } else if (
    connection &&
    (connection.effectiveType === "2g" ||
      connection.effectiveType === "slow-2g")
  ) {
    return 40; // Even lower for slow connections
  } else if (connection && connection.saveData) {
    return 40; // Respect data saver mode
  }

  return 75; // Default quality for normal devices
}

/**
 * Broadcasts doctor availability changes to other tabs/windows and saves to database
 * This is used to implement real-time updates when a doctor changes their availability
 */
export function broadcastAvailabilityChange(
  doctorId: string,
  availability: any
) {
  try {
    console.log(
      `Broadcasting availability change for doctorId: ${doctorId}`,
      availability
    );

    // Make sure we're using consistent doctor ID format
    // This is important because the ID might be passed as a name in some places
    const actualDoctorId = doctorId?.trim();
    if (!actualDoctorId) {
      console.error("Invalid doctorId provided to broadcastAvailabilityChange");
      return;
    }

    // Save the previous value to compare
    const previousValue = localStorage.getItem(
      `doctorAvailability_${actualDoctorId}`
    );

    // Only proceed if the value actually changed to prevent loops
    if (previousValue) {
      try {
        const previousAvailability = JSON.parse(previousValue);

        // Simple deep comparison for objects
        const isEqual =
          JSON.stringify(previousAvailability) === JSON.stringify(availability);
        if (isEqual) {
          // If the values are identical, no need to broadcast
          console.log("Availability unchanged, skipping broadcast");
          return;
        }
      } catch (err) {
        // Continue if parsing failed
        console.error("Error parsing previous availability:", err);
      }
    }

    // First - Store in localStorage for backwards compatibility
    localStorage.setItem(
      `doctorAvailability_${actualDoctorId}`,
      JSON.stringify(availability)
    );

    // Second - Save to database for persistent storage (will work across all clients)
    // Import is done dynamically to avoid circular dependencies
    import("./actions/appointment.actions").then(
      ({ saveDoctorAvailability }) => {
        saveDoctorAvailability(actualDoctorId, availability)
          .then(() =>
            console.log(
              `Saved availability to database for doctor ${actualDoctorId}`
            )
          )
          .catch((error) =>
            console.error("Error saving availability to database:", error)
          );
      }
    );

    // Third - Use custom events for immediate real-time updates within the same browser
    try {
      // Create the custom event with correct typing
      const customEvent = new CustomEvent("availabilityChange", {
        detail: {
          doctorId: actualDoctorId,
          value: availability,
          timestamp: new Date().toISOString(),
        },
        bubbles: false,
        cancelable: false,
      });

      // Dispatch on window - wrapped in try/catch for safety
      window.dispatchEvent(customEvent);

      console.log(
        `Broadcasted availability change for doctor ${actualDoctorId}`
      );
    } catch (eventError) {
      console.error("Error broadcasting availability event:", eventError);
    }
  } catch (error) {
    console.error("Error in broadcastAvailabilityChange:", error);
  }
}

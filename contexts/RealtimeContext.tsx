"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { Models } from "appwrite";
import {
  subscribe,
  DATABASE_ID,
  APPOINTMENT_COLLECTION_ID,
} from "@/lib/appwrite-client";
import { getDoctorAvailability } from "@/lib/actions/appointment.actions";

interface RealtimeContextType {
  subscribeToAppointments: (callback: (appointment: any) => void) => () => void;
  subscribeToAvailabilityChanges: (
    doctorId: string,
    callback: (availability: any) => void
  ) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined
);

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const [unsubscribeCallbacks, setUnsubscribeCallbacks] = useState<
    (() => void)[]
  >([]);
  // Ref to keep track of active subscriptions by ID to prevent duplicates
  const activeSubscriptions = useRef<{ [key: string]: boolean }>({});
  // Ref to track if the component is mounted
  const isMounted = useRef(true);

  // Clean up all subscriptions when component unmounts
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;

    return () => {
      // Mark as unmounted to prevent state updates
      isMounted.current = false;

      // Clean up all subscriptions
      unsubscribeCallbacks.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          console.error("Error cleaning up subscription:", error);
        }
      });

      // Clear active subscriptions
      activeSubscriptions.current = {};
    };
  }, []);

  // Safe way to update state only if component is mounted
  const safeSetUnsubscribeCallbacks = (
    updater: (prev: (() => void)[]) => (() => void)[]
  ) => {
    if (isMounted.current) {
      setUnsubscribeCallbacks(updater);
    }
  };

  // Subscribe to appointment changes
  const subscribeToAppointments = (callback: (appointment: any) => void) => {
    const subscriptionId = `appointments-${Math.random().toString(36).substring(2, 9)}`;

    // If already subscribed, don't create a duplicate
    if (activeSubscriptions.current[subscriptionId]) {
      return () => {};
    }

    // Mark this subscription as active
    activeSubscriptions.current[subscriptionId] = true;

    // Create a subscription to appointment collection
    let unsubscribe: () => void;

    try {
      unsubscribe = subscribe(
        [
          `databases.${DATABASE_ID}.collections.${APPOINTMENT_COLLECTION_ID}.documents`,
        ],
        (response: any) => {
          // Only process if the subscription is still active and component is mounted
          if (
            !activeSubscriptions.current[subscriptionId] ||
            !isMounted.current
          )
            return;

          // Check if this is an appointment-related event
          if (
            response.events.some((event: string) =>
              event.includes(
                `databases.${DATABASE_ID}.collections.${APPOINTMENT_COLLECTION_ID}`
              )
            )
          ) {
            // Pass the updated appointment data to the callback
            try {
              callback(response.payload);
            } catch (error) {
              console.error("Error processing appointment update:", error);
            }
          }
        }
      );
    } catch (error) {
      console.error("Error creating appointment subscription:", error);
      // Return a no-op function if subscription fails
      return () => {};
    }

    // Add unsubscribe callback to state
    safeSetUnsubscribeCallbacks((prev) => [...prev, unsubscribe]);

    // Return a cleanup function
    return () => {
      // Mark subscription as inactive
      activeSubscriptions.current[subscriptionId] = false;
      try {
        unsubscribe();
      } catch (error) {
        console.error("Error unsubscribing from appointments:", error);
      }
    };
  };

  // Subscribe to doctor availability changes
  const subscribeToAvailabilityChanges = (
    doctorId: string,
    callback: (availability: any) => void
  ) => {
    const subscriptionId = `availability-${doctorId}-${Math.random().toString(36).substring(2, 9)}`;

    // If already subscribed, don't create a duplicate
    if (activeSubscriptions.current[subscriptionId]) {
      return () => {};
    }

    // Mark this subscription as active
    activeSubscriptions.current[subscriptionId] = true;

    // Get initial availability from the database, not localStorage
    const fetchInitialAvailability = async () => {
      try {
        const availability = await getDoctorAvailability(doctorId);

        // If we found availability in the database and component is still mounted
        if (availability && isMounted.current) {
          callback(availability);
        } else {
          // Fallback to localStorage for backwards compatibility during transition
          const currentSettings = localStorage.getItem(
            `doctorAvailability_${doctorId}`
          );
          if (currentSettings && isMounted.current) {
            const availabilityFromLS = JSON.parse(currentSettings);
            callback(availabilityFromLS);
          }
        }
      } catch (error) {
        console.error("Error getting initial availability:", error);
      }
    };

    // Call the function to fetch initial availability
    fetchInitialAvailability();

    // Create a subscription to doctor settings collection
    let unsubscribe: () => void;

    try {
      // Use Appwrite DB settings collection for subscriptions
      const DOCTOR_SETTINGS_COLLECTION_ID =
        process.env.NEXT_PUBLIC_DOCTOR_SETTINGS_COLLECTION_ID ||
        "doctor_settings";

      unsubscribe = subscribe(
        [
          `databases.${DATABASE_ID}.collections.${DOCTOR_SETTINGS_COLLECTION_ID}.documents`,
        ],
        async (response: any) => {
          // Only process if the subscription is still active and component is mounted
          if (
            !activeSubscriptions.current[subscriptionId] ||
            !isMounted.current
          )
            return;

          // Check if this update is for our doctor
          if (response.payload?.doctorId === doctorId) {
            try {
              // Fetch latest availability
              const availability = await getDoctorAvailability(doctorId);
              if (availability && isMounted.current) {
                callback(availability);
              }
            } catch (error) {
              console.error("Error processing availability changes:", error);
            }
          }
        }
      );
    } catch (error) {
      console.error("Error creating availability subscription:", error);
      // Return a no-op function if subscription fails
      return () => {};
    }

    // Add unsubscribe callback to state
    safeSetUnsubscribeCallbacks((prev) => [...prev, unsubscribe]);

    // Keep the custom event handler for backward compatibility
    const handleAvailabilityChange = (event: CustomEvent) => {
      // Only process if the subscription is still active and component is mounted
      if (!activeSubscriptions.current[subscriptionId] || !isMounted.current)
        return;

      const { doctorId: eventDoctorId, value } = event.detail;

      // Only process if this event is for our doctor
      if (eventDoctorId === doctorId && value) {
        try {
          callback(value);
        } catch (error) {
          console.error("Error processing availability changes:", error);
        }
      }
    };

    // Add event listener for custom events
    window.addEventListener(
      "availabilityChange",
      handleAvailabilityChange as EventListener
    );

    // Return cleanup function
    return () => {
      // Mark subscription as inactive
      activeSubscriptions.current[subscriptionId] = false;
      try {
        window.removeEventListener(
          "availabilityChange",
          handleAvailabilityChange as EventListener
        );
        unsubscribe();
      } catch (error) {
        console.error("Error removing availability event listener:", error);
      }
    };
  };

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(
    () => ({
      subscribeToAppointments,
      subscribeToAvailabilityChanges,
    }),
    []
  );

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
};

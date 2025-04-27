'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Models } from 'appwrite';
import { subscribe, DATABASE_ID, APPOINTMENT_COLLECTION_ID } from '@/lib/appwrite-client';

interface RealtimeContextType {
  subscribeToAppointments: (callback: (appointment: any) => void) => () => void;
  subscribeToAvailabilityChanges: (doctorId: string, callback: (availability: any) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const [unsubscribeCallbacks, setUnsubscribeCallbacks] = useState<(() => void)[]>([]);

  // Clean up all subscriptions when component unmounts
  useEffect(() => {
    return () => {
      unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    };
  }, [unsubscribeCallbacks]);

  // Subscribe to appointment changes
  const subscribeToAppointments = (callback: (appointment: any) => void) => {
    // Create a subscription to appointment collection
    const unsubscribe = subscribe(
      [`databases.${DATABASE_ID}.collections.${APPOINTMENT_COLLECTION_ID}.documents`],
      (response: any) => {
        // Check if this is an appointment-related event
        if (response.events.some((event: string) => 
          event.includes(`databases.${DATABASE_ID}.collections.${APPOINTMENT_COLLECTION_ID}`)
        )) {
          // Pass the updated appointment data to the callback
          callback(response.payload);
        }
      }
    );

    // Add unsubscribe callback to state
    setUnsubscribeCallbacks(prev => [...prev, unsubscribe]);

    // Return a cleanup function
    return unsubscribe;
  };

  // Subscribe to doctor availability changes
  const subscribeToAvailabilityChanges = (doctorId: string, callback: (availability: any) => void) => {
    // For now we'll use localStorage for doctor availability
    // This will be replaced with a proper database subscription when implemented
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === `doctorAvailability_${doctorId}` && event.newValue) {
        try {
          const availability = JSON.parse(event.newValue);
          callback(availability);
        } catch (error) {
          console.error('Error parsing availability changes:', error);
        }
      }
    };

    // Add event listener for local storage changes
    window.addEventListener('storage', handleStorageChange);

    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  };

  return (
    <RealtimeContext.Provider value={{ 
      subscribeToAppointments,
      subscribeToAvailabilityChanges
    }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}; 
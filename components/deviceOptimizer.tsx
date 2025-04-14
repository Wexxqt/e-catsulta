"use client";

import React, { useEffect, useState } from "react";
import { isLowEndDevice } from "../lib/utils";

interface DeviceOptimizerProps {
  children: React.ReactNode;
  lowEndFallback?: React.ReactNode;
  forceLowEnd?: boolean;
  pageType?: 'register' | 'regular'; // Add pageType prop to identify specific optimization needs
}

/**
 * A component that provides device-specific optimizations
 * It can render alternative content for low-end devices
 */
export function DeviceOptimizer({
  children,
  lowEndFallback,
  forceLowEnd = false,
  pageType = 'regular',
}: DeviceOptimizerProps) {
  const [isLowEnd, setIsLowEnd] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    setIsLowEnd(isLowEndDevice() || forceLowEnd);
    
    // Apply global optimizations
    if (isLowEndDevice() || forceLowEnd) {
      // Disable animations and complex visual effects
      document.documentElement.classList.add("reduced-motion");
      document.documentElement.classList.add("low-quality-images");
      document.documentElement.classList.add("simplified-ui");
      
      // Special handling for registration page
      if (pageType === 'register') {
        // Add specific class for registration page
        document.documentElement.classList.add("simplified-registration");
        
        // Reduce image quality further for registration uploads
        window.localStorage.setItem('useReducedImageQuality', 'true');
      }
      
      // Remove any heavy listeners or observers
      const cleanupHeavyListeners = () => {
        // Find and disable non-critical scroll listeners or observers
        const scrollHandlers = (window as any).__SCROLL_HANDLERS__;
        if (scrollHandlers && Array.isArray(scrollHandlers)) {
          scrollHandlers.forEach(handler => {
            if (handler && typeof handler.disable === 'function') {
              handler.disable();
            }
          });
        }
      };
      
      // Cleanup unnecessary resources
      window.addEventListener('load', () => {
        // Delay optimization to ensure the page is loaded
        setTimeout(() => {
          cleanupHeavyListeners();
          
          // Remove non-critical event listeners
          const nonCriticalElements = document.querySelectorAll('.non-critical');
          nonCriticalElements.forEach(el => {
            // Clone and replace to remove event listeners
            const newEl = el.cloneNode(true);
            if (el.parentNode) {
              el.parentNode.replaceChild(newEl, el);
            }
          });
          
          // If registration page, add special optimizations
          if (pageType === 'register') {
            // Find and simplify all file upload components
            document.querySelectorAll('.file-upload').forEach(el => {
              el.classList.add('simplified-upload');
            });
            
            // Simplify form interactions
            document.querySelectorAll('form').forEach(form => {
              form.classList.add('low-end-form');
            });
          }
          
          console.log(`🔧 Low-end device optimizations applied${pageType === 'register' ? ' for registration form' : ''}`);
        }, 2000);
      });
    }
  }, [forceLowEnd, pageType]);
  
  // For server-side rendering, always render the main content
  if (!isClient) {
    return <>{children}</>;
  }
  
  // For low-end devices, render the fallback if provided
  if (isLowEnd && lowEndFallback) {
    return <>{lowEndFallback}</>;
  }
  
  // Otherwise, render the normal content
  return <>{children}</>;
}

/**
 * Hook to check if the current device is low-end
 */
export function useLowEndDevice() {
  const [isLowEnd, setIsLowEnd] = useState(false);
  
  useEffect(() => {
    setIsLowEnd(isLowEndDevice());
  }, []);
  
  return isLowEnd;
}

export const clearDoctorAppointmentHistory = async (doctorName: string, preservePatientData: boolean = false) => {
  try {
    // Get all appointments for this doctor
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.equal("primaryPhysician", doctorName)]
    );

    // Keep track of unique patients if preservePatientData is true
    const uniquePatientIds = new Set<string>();
    
    if (preservePatientData) {
      appointments.documents.forEach((doc: any) => {
        if (doc.userId) {
          uniquePatientIds.add(doc.userId);
        }
      });
    }

    // Handle each appointment differently based on patient existence
    const updatePromises = appointments.documents.map(async appointment => {
      try {
        // Check if patient reference exists (handle deleted patients)
        const patientExists = appointment.patient && appointment.patient.$id 
          ? await checkIfPatientExists(appointment.patient.$id)
          : false;

        // If patient exists, update the appointment
        if (patientExists) {
          return databases.updateDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            appointment.$id,
            { archived: true }
          );
        } else {
          // Handle deleted patient cases - options:
          
          // Option 1: For deleted patients, just mark as archived with null reference
          return databases.updateDocument(
            DATABASE_ID!,
            APPOINTMENT_COLLECTION_ID!,
            appointment.$id,
            { 
              archived: true,
              // Set patient relationship to null if patient is deleted
              patient: null  
            }
          );
          
          // Option 2: For deleted patients, delete the appointment entirely
          // return databases.deleteDocument(
          //   DATABASE_ID!,
          //   APPOINTMENT_COLLECTION_ID!,
          //   appointment.$id
          // );
        }
      } catch (error) {
        console.error(`Error processing appointment ${appointment.$id}:`, error);
        return null; // Skip this appointment if there's an error
      }
    });

    // Wait for all updates to complete, filtering out null values (skipped appointments)
    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter(result => result !== null);
    
    // Revalidate the doctor dashboard path
    revalidatePath(`/doctor`);
    
    return { 
      success: true, 
      count: successfulUpdates.length,
      preservedPatientCount: uniquePatientIds.size
    };
  } catch (error) {
    console.error("Error clearing doctor appointment history:", error);
    return { success: false, error: String(error) };
  }
};

// Helper function to check if a patient exists
const checkIfPatientExists = async (patientId: string) => {
  try {
    await databases.getDocument(
      DATABASE_ID!,
      PATIENT_COLLECTION_ID!,
      patientId
    );
    return true;
  } catch (error) {
    // If the patient doesn't exist, Appwrite will throw an error
    return false;
  }
}; 
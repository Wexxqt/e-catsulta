"use client";

import { useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { isLowEndDevice } from "@/lib/utils";

// Create a context to share device optimization state across the app
import { createContext, useContext } from "react";

interface DeviceContextType {
  isLowEndDevice: boolean;
  isReducedMotion: boolean;
  prefersReducedData: boolean;
  isLoading: boolean;
}

const DeviceContext = createContext<DeviceContextType>({
  isLowEndDevice: false,
  isReducedMotion: false,
  prefersReducedData: false,
  isLoading: true,
});

export const useDeviceOptimization = () => useContext(DeviceContext);

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [deviceState, setDeviceState] = useState<DeviceContextType>({
    isLowEndDevice: false,
    isReducedMotion: false,
    prefersReducedData: false,
    isLoading: true,
  });

  useEffect(() => {
    // Only run on client
    if (typeof window !== "undefined") {
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      
      // Check for data saver mode
      const connection = (navigator as any).connection;
      const prefersReducedData = connection ? connection.saveData : false;
      
      // Set device optimization state
      setDeviceState({
        isLowEndDevice: isLowEndDevice(),
        isReducedMotion: prefersReducedMotion,
        prefersReducedData: prefersReducedData,
        isLoading: false,
      });

      // Apply optimizations for low-end devices
      if (isLowEndDevice() || prefersReducedData) {
        // Disable non-essential animations
        document.documentElement.classList.add("reduced-motion");
        
        // Set low-quality images flag
        document.documentElement.classList.add("low-quality-images");
        
        // Reduce UI complexity
        document.documentElement.classList.add("simplified-ui");
        
        console.log("🔧 Performance optimizations applied for low-end device");
      }
    }
  }, []);

  return (
    <DeviceContext.Provider value={deviceState}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </DeviceContext.Provider>
  );
}

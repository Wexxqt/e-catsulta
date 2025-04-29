"use client";

import React, { useEffect, useState } from "react";
import { isLowEndDevice } from "../lib/utils";

interface DeviceOptimizerProps {
  children: React.ReactNode;
  lowEndFallback?: React.ReactNode;
  forceLowEnd?: boolean;
  pageType?: "register" | "regular"; // Add pageType prop to identify specific optimization needs
}

/**
 * A component that provides device-specific optimizations
 * It can render alternative content for low-end devices
 */
export function DeviceOptimizer({
  children,
  lowEndFallback,
  forceLowEnd = false,
  pageType = "regular",
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
      if (pageType === "register") {
        // Add specific class for registration page
        document.documentElement.classList.add("simplified-registration");

        // Reduce image quality further for registration uploads
        window.localStorage.setItem("useReducedImageQuality", "true");
      }

      // Remove any heavy listeners or observers
      const cleanupHeavyListeners = () => {
        // Find and disable non-critical scroll listeners or observers
        const scrollHandlers = (window as any).__SCROLL_HANDLERS__;
        if (scrollHandlers && Array.isArray(scrollHandlers)) {
          scrollHandlers.forEach((handler) => {
            if (handler && typeof handler.disable === "function") {
              handler.disable();
            }
          });
        }
      };

      // Cleanup unnecessary resources
      window.addEventListener("load", () => {
        // Delay optimization to ensure the page is loaded
        setTimeout(() => {
          cleanupHeavyListeners();

          // Remove non-critical event listeners
          const nonCriticalElements =
            document.querySelectorAll(".non-critical");
          nonCriticalElements.forEach((el) => {
            // Clone and replace to remove event listeners
            const newEl = el.cloneNode(true);
            if (el.parentNode) {
              el.parentNode.replaceChild(newEl, el);
            }
          });

          // If registration page, add special optimizations
          if (pageType === "register") {
            // Find and simplify all file upload components
            document.querySelectorAll(".file-upload").forEach((el) => {
              el.classList.add("simplified-upload");
            });

            // Simplify form interactions
            document.querySelectorAll("form").forEach((form) => {
              form.classList.add("low-end-form");
            });
          }

          console.log(
            `🔧 Low-end device optimizations applied${pageType === "register" ? " for registration form" : ""}`
          );
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

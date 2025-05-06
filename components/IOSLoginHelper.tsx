"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export const IOSLoginHelper = () => {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if we're on iOS
    const userAgent = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent));
  }, []);

  if (!isIOS) return null;

  return (
    <Alert className="mb-4 bg-blue-50 border-blue-200">
      <InfoIcon className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800 font-medium">
        iOS Device Detected
      </AlertTitle>
      <AlertDescription className="text-blue-700">
        <p>
          If you're having trouble logging in with Google, please ensure you're
          allowing pop-ups in your browser settings.
        </p>
        <p className="mt-2">
          We've added a special login path for iOS devices that should work
          better with Safari.
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default IOSLoginHelper;

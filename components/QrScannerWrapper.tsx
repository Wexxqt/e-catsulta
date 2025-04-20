"use client";

import { useEffect, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

interface QrScannerWrapperProps {
  onScan: (result: any) => void;
}

// For typings
interface IDetectedBarcode {
  rawValue?: string;
  text?: string;
  format?: string;
  cornerPoints?: number[][];
}

const QrScannerWrapper = ({ onScan }: QrScannerWrapperProps) => {
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackConstraints, setUsingFallbackConstraints] = useState(false);

  // Function to handle scanner errors and try fallback options
  const handleScannerError = (err: unknown) => {
    console.error('QR Scanner error:', err);
    
    // If we get an OverconstrainedError and we haven't already tried fallback constraints
    if (!usingFallbackConstraints && err instanceof Error && err.name === 'OverconstrainedError') {
      console.log('Trying fallback camera constraints');
      setUsingFallbackConstraints(true);
    } else {
      // For other errors or if fallback already tried
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // More flexible video constraints
  const videoConstraints = usingFallbackConstraints 
    ? { facingMode: "user" } // fallback to front camera if back camera fails
    : { 
        facingMode: { ideal: "environment" }, // prefer back camera but don't require it
        width: { ideal: 1280 },
        height: { ideal: 720 }
      };

  try {
    // The Scanner component might have different props in different versions
    return (
      <div className="w-full h-full">
        {/* Use a div wrapper to handle any errors from the scanner */}
        <div style={{ width: '100%', height: '100%' }}>
          {/* @ts-ignore - Ignoring type issues since Scanner has inconsistent typings */}
          <Scanner
            // @ts-ignore - The onScan prop has different types in different versions
            onScan={(result) => {
              console.log('QR Scanner onScan result:', result);
              if (result) onScan(result);
            }}
            // @ts-ignore - The onDecode prop has different types in different versions
            onDecode={(result) => {
              console.log('QR Scanner onDecode result:', result);
              if (result) onScan(result);
            }}
            // @ts-ignore - The onResult prop has different types in different versions
            onResult={(result) => {
              console.log('QR Scanner onResult result:', result);
              if (result) onScan(result);
            }}
            onError={handleScannerError}
            delay={500}
            scanDelay={500}
            style={{ width: '100%', height: '100%' }}
            containerStyle={{ width: '100%', height: '100%' }}
            videoConstraints={videoConstraints}
            constraints={videoConstraints}
          />
        </div>
        {error && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 text-center">
            {error}
          </div>
        )}
        {usingFallbackConstraints && !error && (
          <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-xs p-1 text-center">
            Using front camera (fallback mode)
          </div>
        )}
      </div>
    );
  } catch (e) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="text-center p-4">
          <p className="text-red-500 font-medium mb-2">Scanner Error</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {e instanceof Error ? e.message : 'Could not initialize scanner'}
          </p>
        </div>
      </div>
    );
  }
};

export default QrScannerWrapper; 
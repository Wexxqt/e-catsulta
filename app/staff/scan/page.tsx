"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Use a dynamic import to handle QR scanner library that needs client-side only rendering
const DynamicQrScanner = dynamic(() => import('@/components/QrScannerWrapper'), {
  ssr: false,
  loading: () => (
    <div className="aspect-square w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  )
});

const QRScannerPage = () => {
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check for secure context (required for camera API)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCameraPermission(false);
      setError('Camera access requires HTTPS. Please use this app on a secure connection.');
      return;
    }

    // Check for camera permission with more flexible constraints
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      // Try with more flexible constraints
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: "environment" } 
        } 
      })
        .then(() => {
          setCameraPermission(true);
        })
        .catch((err) => {
          console.error('Camera permission error:', err);
          // If first attempt fails, try a fallback with any camera
          if (err.name === 'OverconstrainedError') {
            console.log('Trying fallback camera constraints');
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(() => {
                setCameraPermission(true);
              })
              .catch((fallbackErr) => {
                console.error('Fallback camera permission error:', fallbackErr);
                setCameraPermission(false);
                setError('Camera access denied. Please allow camera access to scan QR codes.');
              });
          } else {
            setCameraPermission(false);
            setError('Camera access denied. Please allow camera access to scan QR codes.');
          }
        });
    } else {
      setCameraPermission(false);
      setError('Your browser does not support camera access.');
    }
  }, []);

  const handleScan = (result: any) => {
    if (!result) return;
    
    console.log('Raw QR scan result:', result);
    
    // Normalize the result - scanner might return object, array, or string
    let resultText: string;
    
    // Handle array of results (common with ZXing-based scanners)
    if (Array.isArray(result)) {
      console.log('Scan result is an array');
      if (result.length > 0 && result[0].rawValue) {
        resultText = result[0].rawValue;
      } else {
        resultText = JSON.stringify(result);
      }
    }
    // Handle object result
    else if (typeof result === 'object' && result !== null) {
      console.log('Scan result is an object');
      if (result.text) {
        resultText = result.text;
      } else if (result.data) {
        resultText = result.data;
      } else if (result.rawValue) {
        resultText = result.rawValue;
      } else {
        // If we can't find a standard field, stringify the object
        console.warn('Unrecognized QR code result format:', result);
        resultText = JSON.stringify(result);
      }
    } 
    // Handle string result
    else if (typeof result === 'string') {
      resultText = result;
    } 
    // Fallback for any other type
    else {
      console.error('Unexpected QR result type:', typeof result);
      resultText = String(result);
    }
    
    setScannedData(resultText);
    setScanning(false);
    
    console.log('Scanned data (normalized):', resultText);
    
    // Extract code from URL if the scanned data is a URL
    let codeToUse = resultText;
    
    try {
      // First check if it contains a code parameter directly
      if (resultText.includes('code=')) {
        const codeMatch = resultText.match(/code=([^&"\s]+)/);
        if (codeMatch && codeMatch[1]) {
          codeToUse = codeMatch[1];
          console.log('Extracted code from parameter string:', codeToUse);
        }
      } 
      // Then try to parse as URL if it looks like a URL
      else if (resultText.startsWith('http') || resultText.startsWith('https') || resultText.includes('://')) {
        const url = new URL(resultText);
        const codeParam = url.searchParams.get('code');
        if (codeParam) {
          codeToUse = codeParam;
          console.log('Extracted code from URL:', codeToUse);
        }
      }
      // If it matches the appointment code format directly (XXX-XXXXXX-XXX), use it as is
      else if (/^[A-Z0-9]{3}-\d{6}-[A-Z0-9]{3}$/.test(resultText)) {
        console.log('Scanned data is already in appointment code format');
      }
      else {
        console.log('Using raw scanned data, does not match expected formats');
      }
    } catch (error) {
      console.error('Error parsing URL:', error);
      console.log('Using raw scanned data');
    }
    
    // Redirect with the code
    router.push(`/staff?code=${encodeURIComponent(codeToUse)}`);
  };

  const restartScanner = () => {
    setScannedData(null);
    setError(null);
    setScanning(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow py-3 sm:py-4 px-4 sm:px-6">
        <div className="flex justify-between items-center">
          <div className="w-20 sm:w-24 invisible">
            {/* Spacer to balance the layout */}
          </div>
          
          <div className="flex justify-center">
            <Link href="/staff">
              <Image
                src="/assets/icons/logo-full.svg"
                width={130}
                height={32}
                alt="E-CatSulta Logo"
                className="h-9 sm:h-11 w-auto"
              />
            </Link>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            className="w-16 sm:w-20 h-8 text-xs font-medium"
            asChild
          >
            <Link href="/staff">Back</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-lg mx-auto">
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Scan Appointment QR Code</CardTitle>
              <CardDescription className="text-sm">
                Position the QR code within the camera view to scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cameraPermission === false ? (
                <div className="text-center p-6 sm:p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-red-500" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-red-700 dark:text-red-300 font-medium mb-2">Camera Access Denied</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Please allow camera access in your browser settings to scan QR codes.
                  </p>
                  <div className="mt-4 text-left bg-red-100 dark:bg-red-900/30 p-3 rounded text-xs">
                    <p className="font-medium mb-1">Troubleshooting tips:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Make sure you're using HTTPS (required for camera access)</li>
                      <li>Check your browser permissions for camera access</li>
                      <li>Try using Chrome or Safari on mobile devices</li>
                      <li>Allow camera permission when prompted</li>
                    </ul>
                  </div>
                </div>
              ) : scanning ? (
                <div className="relative aspect-square w-full max-w-md mx-auto overflow-hidden rounded-lg">
                  <div className="absolute inset-0 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg pointer-events-none z-10"></div>
                  {cameraPermission === true && (
                    <DynamicQrScanner onScan={handleScan} />
                  )}
                </div>
              ) : (
                <div className="text-center p-6 sm:p-8 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-green-500" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <p className="text-green-700 dark:text-green-300 font-medium mb-2">QR Code Detected</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Redirecting to appointment verification...
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2 justify-between">
              <Button 
                variant="outline" 
                onClick={restartScanner}
                disabled={cameraPermission === false || scanning}
                className="w-full sm:w-auto"
              >
                Restart Scanner
              </Button>
              <Button 
                variant="outline" 
                asChild
                className="w-full sm:w-auto"
              >
                <Link href="/staff">Back to Dashboard</Link>
              </Button>
            </CardFooter>
          </Card>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Having trouble scanning? You can also enter the code manually on the dashboard.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QRScannerPage; 
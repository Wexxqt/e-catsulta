"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { StaffPasskeyModal } from "@/components/StaffPasskeyModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { getAppointmentByCode } from "@/lib/actions/appointment.actions";
import { formatDateTime, decryptKey } from "@/lib/utils";
import { Doctors } from "@/constants";
import { StatusBadge } from "@/components/StatusBadge";

const StaffDashboard = () => {
  const [searchCode, setSearchCode] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [verifiedAppointment, setVerifiedAppointment] = useState<any>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<any>(null);
  const [authenticated, setAuthenticated] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = () => {
      const encryptedKey = typeof window !== "undefined" 
        ? window.localStorage.getItem("staffAccessKey") 
        : null;
      
      const hasValidKey = encryptedKey && decryptKey(encryptedKey) === process.env.NEXT_PUBLIC_STAFF_PASSKEY;
      
      if (!hasValidKey) {
        setAuthenticated(false);
        return false;
      }
      
      setAuthenticated(true);
      return true;
    };
    
    if (checkAuth()) {
      // Check if we have a code in the URL from the scanner
      const code = searchParams.get('code');
      if (code) {
        setSearchCode(code);
        verifyAppointment(code);
      }
    }
  }, [searchParams]);

  const verifyAppointment = async (codeToVerify?: any) => {
    const rawCodeValue = codeToVerify || searchCode;
    
    if (!rawCodeValue) {
      setSearchError("Please enter an appointment code");
      return;
    }
    
    try {
      setSearchLoading(true);
      setSearchError("");
      
      // Extract a clean code value
      let codeValue = '';
      
      // Handle array results from QR scanner (ZXing format)
      if (Array.isArray(rawCodeValue)) {
        console.log("Input is an array:", rawCodeValue);
        
        // Get the first result if available
        const firstResult = rawCodeValue[0];
        if (firstResult && typeof firstResult === 'object') {
          // ZXing format has rawValue property
          if (firstResult.rawValue) {
            codeValue = firstResult.rawValue;
          } else if (firstResult.text) {
            codeValue = firstResult.text;
          } else {
            codeValue = JSON.stringify(firstResult);
          }
        } else {
          codeValue = String(rawCodeValue);
        }
      }
      // If the input is an object, try to extract the text property
      else if (typeof rawCodeValue === 'object' && rawCodeValue !== null) {
        console.log("Input is an object:", rawCodeValue);
        
        if ('text' in rawCodeValue) {
          codeValue = rawCodeValue.text;
        } else if ('data' in rawCodeValue) {
          codeValue = rawCodeValue.data;
        } else if ('rawValue' in rawCodeValue) {
          codeValue = rawCodeValue.rawValue;
        } else {
          // Last resort - stringify it
          codeValue = JSON.stringify(rawCodeValue);
        }
      } else {
        codeValue = String(rawCodeValue).trim();
      }
      
      // Try to extract code from URL if needed
      if (codeValue.includes('code=')) {
        const codeMatch = codeValue.match(/code=([^&"\s]+)/);
        if (codeMatch && codeMatch[1]) {
          codeValue = codeMatch[1];
          console.log('Extracted code from URL parameter:', codeValue);
        }
      }
      
      console.log("Attempting to verify appointment with code:", codeValue);
      
      const appointment = await getAppointmentByCode(codeValue);
      
      if (!appointment) {
        console.log("No appointment found for code:", codeValue);
        setSearchError("Appointment not found");
        return;
      }
      
      console.log("Appointment found:", appointment.appointmentCode);
      setVerifiedAppointment(appointment);
      
      // Find doctor info
      const docInfo = Doctors.find(
        (doc) => doc.name === appointment.primaryPhysician
      );
      setDoctorInfo(docInfo);
      
      setShowVerifyDialog(true);
    } catch (error) {
      console.error("Error verifying appointment:", error);
      setSearchError("Error verifying appointment");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleScanQR = () => {
    router.push("/staff/scan");
  };
  
  const handleLogout = () => {
    localStorage.removeItem("staffAccessKey");
    setAuthenticated(false);
    router.push('/'); // Redirect to home page after logout
  };

  // If not authenticated, show the passkey modal
  if (!authenticated) {
    return <StaffPasskeyModal onSuccess={() => { setAuthenticated(true); }} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Responsive header with improved mobile layout */}
      <header className="bg-white dark:bg-gray-800 shadow py-3 sm:py-4 px-4 sm:px-6">
        <div className="flex justify-between items-center">
          <div className="w-20 sm:w-24 invisible">
            {/* Spacer to balance the layout */}
          </div>
          
          <div className="flex justify-center">
            <Image
              src="/assets/icons/logo-full.svg"
              width={130}
              height={32}
              alt="E-CatSulta Logo"
              className="h-9 sm:h-11 w-auto"
            />
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            className="w-16 sm:w-20 h-8 text-xs font-medium"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Appointment Verification</h2>
            <div className="grid grid-cols-1 gap-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl">Verify Appointment</CardTitle>
                  <CardDescription className="text-sm">Enter appointment code or scan QR code</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        placeholder="Enter appointment code"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        className="flex-1 h-10 sm:h-11"
                      />
                      <Button 
                        onClick={() => verifyAppointment()}
                        disabled={searchLoading}
                        className="whitespace-nowrap h-10 sm:h-11 min-w-[110px]"
                      >
                        {searchLoading ? "Verifying..." : "Verify Code"}
                      </Button>
                    </div>
                    
                    {searchError && (
                      <p className="text-red-500 text-sm">{searchError}</p>
                    )}
                    
                    <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-4 sm:p-6 bg-gray-50 dark:bg-gray-800">
                      <div className="text-center">
                        <Button 
                          variant="outline" 
                          onClick={handleScanQR} 
                          className="mb-2 h-10 sm:h-11"
                        >
                          <Image
                            src="/assets/icons/scan.svg"
                            width={20}
                            height={20}
                            alt="Scan"
                            className="mr-2"
                          />
                          <span className="text-sm sm:text-base">Scan QR Code</span>
                        </Button>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Scan patient appointment QR code
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Responsive Appointment Verification Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-lg">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl">Appointment Verification</DialogTitle>
            <DialogDescription className="text-sm">
              Verify the appointment details below
            </DialogDescription>
          </DialogHeader>
          
          {verifiedAppointment && (
            <div className="mt-3 sm:mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-4 text-gray-700 dark:text-gray-300">Patient Information</h3>
                  <dl className="space-y-2">
                    <div className="flex flex-col">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Name</dt>
                      <dd className="font-medium text-sm sm:text-base break-words">{verifiedAppointment.patient?.name || "Unknown"}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">ID Number</dt>
                      <dd className="font-medium text-sm sm:text-base break-words">{verifiedAppointment.patient?.identificationNumber || "N/A"}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Contact</dt>
                      <dd className="font-medium text-sm sm:text-base break-words">{verifiedAppointment.patient?.phone || "N/A"}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold text-base sm:text-lg mb-2 sm:mb-4 text-gray-700 dark:text-gray-300 mt-4 md:mt-0">Appointment Information</h3>
                  <dl className="space-y-2">
                    <div className="flex flex-col">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Appointment Code</dt>
                      <dd className="font-mono font-medium text-sm sm:text-base break-words">{verifiedAppointment.appointmentCode}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Date & Time</dt>
                      <dd className="font-medium text-sm sm:text-base break-words">{formatDateTime(verifiedAppointment.schedule).dateTime}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Healthcare Provider</dt>
                      <dd className="font-medium text-sm sm:text-base flex items-center gap-2">
                        {doctorInfo && (
                          <Image
                            src={doctorInfo.image}
                            alt={doctorInfo.name}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        )}
                        <span className="break-words">Dr. {verifiedAppointment.primaryPhysician}</span>
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Status</dt>
                      <dd className="font-medium text-sm sm:text-base">
                        <StatusBadge status={verifiedAppointment.status} />
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 mt-4 sm:mt-6">
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="w-full sm:w-auto h-10 sm:h-11">Close</Button>
            </DialogClose>
            
            {verifiedAppointment && verifiedAppointment.status === "scheduled" && (
              <div className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                <div className="rounded-full bg-green-100 h-3 w-3 animate-pulse"></div>
                <span className="text-green-600 text-sm font-medium">
                  Verified ✓
                </span>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffDashboard; 
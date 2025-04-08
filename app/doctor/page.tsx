"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { StatCard } from "@/components/StatCard";
import { columns } from "@/components/table/doctor-columns";
import { DataTable } from "@/components/table/DataTable";
import { getRecentAppointmentList } from "@/lib/actions/appointment.actions";
import { Doctors } from "@/constants";
import { Appointment } from "@/types/appwrite.types";
import { decryptKey, encryptKey } from "@/lib/utils";

// Import the UI components for the authentication modal
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const DoctorDashboard = () => {
  const [allAppointments, setAllAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState({
    documents: [],
    scheduledCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
    totalCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentDoctor, setCurrentDoctor] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const encryptedKey = typeof window !== "undefined" 
        ? window.localStorage.getItem("doctorAccessKey") 
        : null;
      
      const doctorName = localStorage.getItem("doctorName");
      const hasValidKey = encryptedKey && doctorName && Doctors.some(doc => doc.name === doctorName);
      
      if (!hasValidKey) {
        setShowAuthModal(true);
        return false;
      }
      
      setCurrentDoctor(doctorName);
      return true;
    };
    
    const isAuthenticated = checkAuth();
    
    if (isAuthenticated) {
      fetchAppointments();
    }
  }, []);

  const fetchAppointments = async () => {
    const doctorName = localStorage.getItem("doctorName");
    if (!doctorName) return;
    
    setLoading(true);
    const appointments = await getRecentAppointmentList();
    
    if (appointments) {
      // Filter appointments for the current doctor
      const doctorAppointments = appointments.documents.filter(
        (appointment: Appointment) => appointment.primaryPhysician === doctorName
      );
      
      // Count appointments by status
      const counts = doctorAppointments.reduce(
        (acc: any, appointment: Appointment) => {
          switch (appointment.status) {
            case "scheduled":
              acc.scheduledCount++;
              break;
            case "pending":
              acc.pendingCount++;
              break;
            case "cancelled":
              acc.cancelledCount++;
              break;
          }
          return acc;
        },
        { scheduledCount: 0, pendingCount: 0, cancelledCount: 0 }
      );

      setFilteredAppointments({
        documents: doctorAppointments,
        scheduledCount: counts.scheduledCount,
        pendingCount: counts.pendingCount,
        cancelledCount: counts.cancelledCount,
        totalCount: doctorAppointments.length
      });
    } else {
      console.error("Failed to fetch appointments");
    }
    setLoading(false);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("doctorAccessKey");
    localStorage.removeItem("doctorName");
    router.push("/");
  };

  // Validate passkey
  const validatePasskey = async () => {
    if (isSubmitting) return;
    
    if (!selectedDoctor) {
      setError("Please select a doctor first.");
      return;
    }

    const doctor = Doctors.find(doc => doc.name === selectedDoctor);
    if (!doctor) {
      setError("Invalid doctor selection.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simplified access to doctor passkeys
      let doctorPasskey = "";
      
      // Temporary hard-coded passkeys for testing
      if (doctor.id === "dr-abundo") {
        doctorPasskey = "123456"; // Replace with your actual passkey
      } else if (doctor.id === "dr-decastro") {
        doctorPasskey = "654321"; // Replace with your actual passkey 
      }
      
      if (passkey === doctorPasskey) {
        const encryptedKey = encryptKey(passkey);
        localStorage.setItem("doctorAccessKey", encryptedKey);
        localStorage.setItem("doctorName", selectedDoctor);

        setShowAuthModal(false);
        setCurrentDoctor(selectedDoctor);
        
        // Fetch appointments after successful authentication
        fetchAppointments();
      } else {
        setError("Invalid passkey. Please try again.");
        setPasskey(""); // Clear the passkey on error
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      setPasskey(""); // Clear the passkey on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Watch for passkey changes and auto-submit when length is correct
  useEffect(() => {
    if (passkey.length === 6) {
      validatePasskey();
    }
  }, [passkey]);

  return (
    <>
      {/* Authentication Modal */}
      <AlertDialog open={showAuthModal} onOpenChange={(isOpen) => {
        // Only allow closing via the close button or successful authentication
        if (!isOpen && !localStorage.getItem("doctorAccessKey")) {
          setShowAuthModal(true);
        } else {
          setShowAuthModal(isOpen);
        }
      }}>
        <AlertDialogContent className="shad-alert-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-start justify-between">
              Doctor Access Verification
              <Image
                src="/assets/icons/close.svg"
                alt="close"
                width={20}
                height={20}
                onClick={() => setShowAuthModal(false)}
                className="cursor-pointer"
              />
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please select your name and enter your passkey to access the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="doctor-select" className="text-sm font-medium text-gray-700">
                
              </label>
              <select
                id="doctor-select"
                value={selectedDoctor}
                onChange={(e) => {
                  setSelectedDoctor(e.target.value);
                  setError("");
                  setPasskey(""); // Clear passkey when doctor changes
                }}
                className="shad-input w-full"
                disabled={isSubmitting}
              >
                <option value="">Select a doctor...</option>
                {Doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.name}>
                    Dr. {doctor.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <InputOTP
                maxLength={6}
                value={passkey}
                onChange={(value) => {
                  setPasskey(value);
                  setError("");
                }}
                disabled={!selectedDoctor || isSubmitting}
              >
                <InputOTPGroup className="shad-otp">
                  <InputOTPSlot className="shad-otp-slot" index={0} />
                  <InputOTPSlot className="shad-otp-slot" index={1} />
                  <InputOTPSlot className="shad-otp-slot" index={2} />
                  <InputOTPSlot className="shad-otp-slot" index={3} />
                  <InputOTPSlot className="shad-otp-slot" index={4} />
                  <InputOTPSlot className="shad-otp-slot" index={5} />
                </InputOTPGroup>
              </InputOTP>

              {error && (
                <p className="shad-error text-14-regular mt-4 flex justify-center">
                  {error}
                </p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={validatePasskey}
              className="shad-primary-btn w-full"
              disabled={!selectedDoctor || passkey.length !== 6 || isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Enter Doctor Passkey"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dashboard Content */}
      <div className="mx-auto max-w-7xl flex flex-col space-y-14 px-4 sm:px-6 lg:px-8">
        <header className="flex justify-between items-center py-4">
          <Link href="/" className="cursor-pointer">
            <Image
              src="/assets/icons/logo-full.svg"
              height={32}
              width={162}
              alt="logo"
              className="h-8"
            />
          </Link>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogout} 
              className="text-lg font-semibold"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="admin-main">
          <section className="space-y-4">
          <h1 className="text-3xl font-semibold">
    Good to see you again, Dr.{" "}
    <span className="text-blue-600 font-bold dark:text-blue-400 dark:drop-shadow-glow">
      {currentDoctor}
    </span>
    !
  </h1>
            <p className="text-14-regular text-dark-700">View and manage your appointments</p>
          </section>

          {(filteredAppointments.documents.length > 0 || loading) ? (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <StatCard
                  type="appointments"
                  count={filteredAppointments.scheduledCount}
                  label="Scheduled appointments"
                  icon={"/assets/icons/appointments.svg"}
                />
                <StatCard
                  type="pending"
                  count={filteredAppointments.pendingCount}
                  label="Pending appointments"
                  icon={"/assets/icons/pending.svg"}
                />
                <StatCard
                  type="cancelled"
                  count={filteredAppointments.cancelledCount}
                  label="Cancelled appointments"
                  icon={"/assets/icons/cancelled.svg"}
                />
              </section>

              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-lg font-medium">Loading appointments...</p>
                </div>
              ) : (
                <DataTable 
                  columns={columns} 
                  data={filteredAppointments.documents} 
                />
              )}
            </>
          ) : (
            <div className="flex h-40 items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-lg font-medium text-gray-500">
                No appointments available.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default DoctorDashboard;
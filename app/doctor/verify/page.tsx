"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAppointment, getAppointmentByCode } from "@/lib/actions/appointment.actions";
import { formatDateTime } from "@/lib/utils";
import { Doctors } from "@/constants";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

const AppointmentVerificationPage = () => {
  const searchParams = useSearchParams();
  const appointmentCode = searchParams.get("code");
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    const verifyAppointment = async () => {
      try {
        setLoading(true);
        if (!appointmentCode) {
          setError("No appointment code provided");
          setLoading(false);
          return;
        }

        // Use the new function to find appointment by code
        const appointmentData = await getAppointmentByCode(appointmentCode);
        if (!appointmentData) {
          setError("Appointment not found");
          setLoading(false);
          return;
        }

        setAppointment(appointmentData);
        
        // Find doctor info
        const docInfo = Doctors.find(
          (doc) => doc.name === appointmentData.primaryPhysician
        );
        setDoctor(docInfo);
        
      } catch (error) {
        console.error("Error verifying appointment:", error);
        setError("Failed to verify appointment");
      } finally {
        setLoading(false);
      }
    };

    verifyAppointment();
  }, [appointmentCode]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Verifying appointment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Button asChild>
            <Link href="/doctor">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow py-4 px-6">
        <div className="flex items-center justify-between">
          <Link href="/doctor">
            <div className="flex items-center">
              <Image
                src="/assets/icons/logo-full.svg"
                width={150}
                height={40}
                alt="E-CatSulta Logo"
                className="h-10 w-auto"
              />
            </div>
          </Link>
          <h1 className="text-xl font-bold">Appointment Verification</h1>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Appointment Details</h2>
              <StatusBadge status={appointment.status} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-4 text-gray-700 dark:text-gray-300">Patient Information</h3>
                <dl className="space-y-2">
                  <div className="flex flex-col">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
                    <dd className="font-medium">{appointment.patient?.name || "Unknown"}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">ID Number</dt>
                    <dd className="font-medium">{appointment.patient?.identificationNumber || "N/A"}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Contact</dt>
                    <dd className="font-medium">{appointment.patient?.phone || "N/A"}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="font-medium">{appointment.patient?.email || "N/A"}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-4 text-gray-700 dark:text-gray-300">Appointment Information</h3>
                <dl className="space-y-2">
                  <div className="flex flex-col">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Appointment Code</dt>
                    <dd className="font-mono font-medium">{appointment.appointmentCode}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Date & Time</dt>
                    <dd className="font-medium">{formatDateTime(appointment.schedule).dateTime}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Healthcare Provider</dt>
                    <dd className="font-medium flex items-center gap-2">
                      {doctor && (
                        <Image
                          src={doctor.image}
                          alt={doctor.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      Dr. {appointment.primaryPhysician}
                    </dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Reason for Visit</dt>
                    <dd className="font-medium">{appointment.reason || "Not specified"}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {appointment.note && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2 text-gray-700 dark:text-gray-300">Additional Notes</h3>
                <p className="bg-gray-50 dark:bg-gray-700 p-4 rounded">{appointment.note}</p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href="/doctor">Return to Dashboard</Link>
                </Button>
                {appointment.status === "scheduled" && (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                      Verified ✓
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppointmentVerificationPage; 
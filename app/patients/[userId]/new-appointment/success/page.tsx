"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, Client } from "appwrite";

import { Button } from "@/components/ui/button";
import { Doctors } from "@/constants";
import { getAppointment } from "@/lib/actions/appointment.actions";
import { formatDateTime, generateAppointmentCode } from "@/lib/utils";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.PROJECT_ID || "676eecb00010826361f7");

const account = new Account(client);

const RequestSuccess = ({ searchParams, params }: any) => {
  const [appointment, setAppointment] = useState<any>(null);
  const [doctor, setDoctor] = useState<any>(null);
  const [appointmentCode, setAppointmentCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const { userId } = params;
  const appointmentId = (searchParams?.appointmentId as string) || "";
  
  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        setLoading(true);
        const session = await account.get();
        
        // Verify the session userId matches the URL userId
        if (session.$id !== userId) {
          console.log("User ID mismatch or not authorized");
          router.push("/");
          return;
        }
        
        setAuthenticated(true);
        
        // Fetch appointment data
        const appointmentData = await getAppointment(appointmentId);
        if (!appointmentData) {
          router.push(`/patients/${userId}/dashboard`);
          return;
        }
        
        setAppointment(appointmentData);
        
        // Find the doctor
        const docInfo = Doctors.find(
          (doc) => doc.name === appointmentData.primaryPhysician
        );
        setDoctor(docInfo);
        
        // Generate appointment code
        const code = generateAppointmentCode(appointmentId, appointmentData.patient.$id);
        setAppointmentCode(code);
      } catch (error) {
        console.error("Authentication error:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [userId, appointmentId, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Loading appointment details...</p>
      </div>
    );
  }

  if (!authenticated || !appointment) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="flex h-screen max-h-screen px-[10%]">
      <div className="success-img">
        <Link href={`/patients/${userId}/dashboard`}>
          <Image
            src="/assets/icons/logo-full.svg"
            height={1000}
            width={1000}
            alt="logo"
            className="h-16 w-fit"
          />
        </Link>

        <section className="flex flex-col items-center">
          <Image
            src="/assets/gifs/success.gif"
            height={300}
            width={280}
            alt="success"
            unoptimized //
          />
          <h2 className="header mb-6 max-w-[600px] text-center">
            Your <span className="text-green-500">appointment</span> has
            been successfully scheduled!
          </h2>
          <p>Please save your appointment code for reference.</p>
          
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Your Appointment Code
            </p>
            <p className="text-xl font-bold tracking-wider text-gray-800 dark:text-white">
              {appointmentCode}
            </p>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-md max-w-[500px] mx-auto">
            <div className="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">Appointment Verification</p>
                <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                  Please save your appointment code for reference. Take a screenshot of the code and present it at the clinic to confirm your booking.
                </p>
                <p className="text-amber-700 dark:text-amber-400 text-sm mt-2 border-t border-amber-200 dark:border-amber-700/50 pt-2">
                  You will receive an SMS notification if your appointment is cancelled.
                </p>
              </div>
            </div>
          </div>

        </section>

        <section className="my-5 flex flex-col gap-3 rounded-xl border border-dark-400 bg-dark-300 p-4">
          <p>Scheduled appointment details: </p>
          <div className="flex items-center gap-3">
            <Image
              src={doctor?.image!}
              alt="doctor"
              width={100}
              height={100}
              className="size-6"
            />
            <p className="whitespace-nowrap">Dr. {doctor?.name}</p>
          </div>
          <div className="flex gap-2">
            <Image
              src="/assets/icons/calendar.svg"
              height={24}
              width={24}
              alt="calendar"
            />
            <p> {formatDateTime(appointment.schedule).dateTime}</p>
          </div>
        </section>

        <Button variant="outline" className="shad-primary-btn" asChild>
          <Link href={`/patients/${userId}/new-appointment`}>
            New Appointment
          </Link>
        </Button>

        <p className="copyright">© 2025 E-CatSulta</p>
      </div>
    </div>
  );
};

export default RequestSuccess;
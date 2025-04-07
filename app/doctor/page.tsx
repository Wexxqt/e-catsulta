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
import { decryptKey } from "@/lib/utils";

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
  const router = useRouter();

  useEffect(() => {
    // Verify doctor authentication
    const encryptedKey = typeof window !== "undefined" 
      ? window.localStorage.getItem("doctorAccessKey") 
      : null;
    
    if (!encryptedKey) {
      router.push("/?doctor=true");
      return;
    }

    const accessKey = decryptKey(encryptedKey);
    const doctorName = localStorage.getItem("doctorName");

    if (!doctorName || !Doctors.some(doc => doc.name === doctorName)) {
      localStorage.removeItem("doctorAccessKey");
      localStorage.removeItem("doctorName");
      router.push("/?doctor=true");
      return;
    }

    setCurrentDoctor(doctorName);

    const fetchAppointments = async () => {
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

    fetchAppointments();
  }, [router]);

  return (
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
          <a 
            href="/" 
            className="text-lg font-semibold"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("doctorAccessKey");
                localStorage.removeItem("doctorName");
              }
            }}
          >
            Logout
          </a>
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
  );
};

export default DoctorDashboard;
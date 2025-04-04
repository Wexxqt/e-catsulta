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
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [allAppointments, setAllAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState({
    documents: [],
    scheduledCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
    totalCount: 0
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verify doctor authentication
    const encryptedKey = typeof window !== "undefined" 
      ? window.localStorage.getItem("doctorAccessKey") 
      : null;
    
    const accessKey = encryptedKey && decryptKey(encryptedKey);

    if (accessKey !== process.env.NEXT_PUBLIC_DOCTOR_PASSKEY!.toString()) {
      router.push("/?doctor=true");
      return;
    }

    const fetchAppointments = async () => {
      setLoading(true);
      const appointments = await getRecentAppointmentList();
      
      if (appointments) {
        // Store all appointments in a separate state
        setAllAppointments(appointments.documents);
        setFilteredAppointments(appointments);
      } else {
        console.error("Failed to fetch appointments");
      }
      setLoading(false);
    };

    fetchAppointments();
  }, [router]);

  // This effect runs when selectedDoctor changes
  useEffect(() => {
    if (selectedDoctor && allAppointments.length > 0) {
      // Filter appointments for the selected doctor from the original list
      const doctorAppointments = allAppointments.filter(
        (appointment: Appointment) => appointment.primaryPhysician === selectedDoctor
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
    } else if (!selectedDoctor && allAppointments.length > 0) {
      // If no doctor is selected, show all appointments
      const counts = allAppointments.reduce(
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
        documents: allAppointments,
        scheduledCount: counts.scheduledCount,
        pendingCount: counts.pendingCount,
        cancelledCount: counts.cancelledCount,
        totalCount: allAppointments.length
      });
    }
  }, [selectedDoctor, allAppointments]);

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

        <a 
          href="/" 
          className="text-lg font-semibold"
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem("doctorAccessKey");
            }
          }}
        >
          Logout
        </a>
      </header>

      <main className="admin-main">
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold">Doctor Dashboard 👨‍⚕️</h1>
          <p className="text-gray-700">View and manage your appointments</p>
        </section>

        <section className="mb-6">
          <div className="flex items-center space-x-4">
            <label htmlFor="doctor-select" className="text-lg font-semibold">
              Select Doctor:
            </label>
            <select
              id="doctor-select"
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Doctors</option>
              {Doctors.map((doctor) => (
                <option key={doctor.name} value={doctor.name}>
                  Dr. {doctor.name}
                </option>
              ))}
            </select>
          </div>
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
              {selectedDoctor 
                ? "No appointments available for the selected doctor." 
                : "No appointments available."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StatCard } from "@/components/StatCard";
import { columns } from "@/components/table/columns";
import { DataTable } from "@/components/table/DataTable";
import { getRecentAppointmentList } from "@/lib/actions/appointment.actions";
import { decryptKey } from "@/lib/utils";

// Define the type for appointments data
interface AppointmentsData {
  scheduledCount: number;
  pendingCount: number;
  cancelledCount: number;
  totalCount: number;
  documents: any[];
}

const AdminPage = () => {
  const [appointments, setAppointments] = useState<AppointmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verify admin authentication
    const encryptedKey = typeof window !== "undefined" 
      ? window.localStorage.getItem("accessKey") 
      : null;
    
    if (!encryptedKey) {
      router.push("/?admin=true");
      return;
    }

    const accessKey = decryptKey(encryptedKey);
    
    // Fetch appointments
    const fetchAppointments = async () => {
      setLoading(true);
      const data = await getRecentAppointmentList();
      setAppointments(data);
      setLoading(false);
    };

    fetchAppointments();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("accessKey");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col space-y-14">
      <header className="admin-header">
        <Link href="/" className="cursor-pointer">
          <Image
            src="/assets/icons/logo-full.svg"
            height={32}
            width={162}
            alt="logo"
            className="h-8 w-fit"
          />
        </Link>

        <button onClick={handleLogout} className="text-16-semibold">Logout</button>
      </header>

      <main className="admin-main">
        <section className="w-full space-y-4">
          <h1 className="header">Welcome 👋</h1>
          <p className="text-dark-700">
            Start the day with managing new appointments
          </p>
        </section>

        <section className="admin-stat">
          <StatCard
            type="appointments"
            count={appointments?.scheduledCount || 0}
            label="Scheduled appointments"
            icon={"/assets/icons/appointments.svg"}
          />
          <StatCard
            type="pending"
            count={appointments?.pendingCount || 0}
            label="Pending appointments"
            icon={"/assets/icons/pending.svg"}
          />
          <StatCard
            type="cancelled"
            count={appointments?.cancelledCount || 0}
            label="Cancelled appointments"
            icon={"/assets/icons/cancelled.svg"}
          />
        </section>

        <DataTable columns={columns} data={appointments?.documents || []} />
      </main>
      
    </div>
  );
};

export default AdminPage;

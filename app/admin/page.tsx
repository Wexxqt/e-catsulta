"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Calendar, X } from "lucide-react";

import { columns } from "@/components/table/columns";
import { DataTable } from "@/components/table/DataTable";
import AppointmentChart from "@/components/AppointmentChart";
import { getRecentAppointmentList } from "@/lib/actions/appointment.actions";
import { decryptKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define the type for appointments data
interface AppointmentsData {
  scheduledCount: number;
  pendingCount: number;
  cancelledCount: number;
  totalCount: number;
  documents: any[];
  todayCount: number;
  studentCount: number;
  employeeCount: number;
}

const AdminPage = () => {
  const [appointments, setAppointments] = useState<AppointmentsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Verify admin authentication
    const encryptedKey =
      typeof window !== "undefined"
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <main className="transition-all duration-300 py-6 w-full px-4 lg:px-3 xl:px-4 max-w-full">
      <section className="w-full mb-8">
        <h1 className="text-32-bold text-white">Dashboard</h1>
      </section>

      <section
        className={cn(
          "w-full grid transition-all duration-300",
          "grid-cols-1 sm:grid-cols-2 gap-3",
          "lg:grid-cols-2 xl:grid-cols-4 lg:gap-2 xl:gap-3",
          "max-w-full"
        )}
      >
        {/* Total Patients */}
        <div className="bg-dark-300 rounded-lg p-5 shadow hover:shadow-md transition-shadow border border-dark-400 w-full h-full flex-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Patients</p>
              <h3 className="text-2xl sm:text-3xl font-bold mt-2 text-white">
                {(appointments?.studentCount || 0) +
                  (appointments?.employeeCount || 0)}
              </h3>
              <div className="flex flex-col sm:flex-row sm:gap-2 mt-1">
                <span className="text-blue-400 text-xs font-medium">
                  Students: {appointments?.studentCount || 0}
                </span>
                <span className="text-purple-400 text-xs font-medium">
                  Employees: {appointments?.employeeCount || 0}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-700/20 shadow-inner">
              <Users className="text-blue-400 h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-dark-300 rounded-lg p-5 shadow hover:shadow-md transition-shadow border border-dark-400 w-full h-full flex-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Today's Appointments</p>
              <h3 className="text-2xl sm:text-3xl font-bold mt-2 text-white">
                {appointments?.todayCount || 0}
              </h3>
              {appointments?.pendingCount ? (
                <p className="text-yellow-400 text-xs font-medium mt-1">
                  {appointments.pendingCount} pending confirmation
                </p>
              ) : (
                <p className="text-gray-400 text-xs font-medium mt-1">
                  No pending appointments
                </p>
              )}
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-700/20 shadow-inner">
              <Calendar className="text-yellow-400 h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Scheduled Appointments */}
        <div className="bg-dark-300 rounded-lg p-5 shadow hover:shadow-md transition-shadow border border-dark-400 w-full h-full flex-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Scheduled Appointments</p>
              <h3 className="text-2xl sm:text-3xl font-bold mt-2 text-white">
                {appointments?.scheduledCount || 0}
              </h3>
              <p className="text-green-400 text-xs font-medium mt-1">
                Confirmed appointments
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-700/20 shadow-inner">
              <Calendar className="text-green-400 h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Cancelled Appointments */}
        <div className="bg-dark-300 rounded-lg p-5 shadow hover:shadow-md transition-shadow border border-dark-400 w-full h-full flex-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Cancelled Appointments</p>
              <h3 className="text-2xl sm:text-3xl font-bold mt-2 text-white">
                {appointments?.cancelledCount || 0}
              </h3>
              <p className="text-red-400 text-xs font-medium mt-1">
                Total cancelled
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-red-500/20 to-red-700/20 shadow-inner">
              <X className="text-red-400 h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 w-full">
        <AppointmentChart className="mb-8" />

        <div className="bg-dark-300 p-4 sm:p-6 rounded-lg border border-dark-400 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h3 className="text-lg font-semibold text-white">
              Upcoming Appointments
            </h3>

            <div className="flex items-center space-x-2 bg-dark-400 rounded-md p-1 self-end">
              <Button
                variant="default"
                onClick={() => {}}
                size="sm"
                className="text-xs py-1 h-7"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                onClick={() => {}}
                size="sm"
                className="text-xs py-1 h-7"
              >
                Next 3 Days
              </Button>
              <Button
                variant="ghost"
                onClick={() => {}}
                size="sm"
                className="text-xs py-1 h-7"
              >
                All
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={(appointments?.documents || []).slice(0, 10)}
          />
        </div>
      </section>
    </main>
  );
};

export default AdminPage;

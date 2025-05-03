"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Calendar,
  X,
  AlertTriangle,
  TrendingUp,
  Activity,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import AppointmentChart from "@/components/AppointmentChart";
import { getRecentAppointmentList } from "@/lib/actions/appointment.actions";
import { decryptKey } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  missedCount?: number;
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
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-gray-500 dark:text-muted-foreground">
            Loading data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Overview
        </h1>
        <p className="text-gray-500 dark:text-muted-foreground">
          Dashboard and statistics for your clinic management system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Total Patients */}
        <Card className="bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-400 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-muted-foreground">
              Total Patients
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-gradient-to-br dark:from-blue-500/20 dark:to-blue-700/20 shadow-inner">
              <Users className="text-blue-600 dark:text-blue-400 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {(appointments?.studentCount || 0) +
                (appointments?.employeeCount || 0)}
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="text-blue-600 dark:text-blue-400 text-xs font-medium flex items-center">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 mr-1"></span>
                Students: {appointments?.studentCount || 0}
              </span>
              <span className="text-purple-600 dark:text-purple-400 text-xs font-medium flex items-center">
                <span className="inline-block h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-400 mr-1"></span>
                Employees: {appointments?.employeeCount || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        <Card className="bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-400 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-muted-foreground">
              Today's Appointments
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-gradient-to-br dark:from-yellow-500/20 dark:to-yellow-700/20 shadow-inner">
              <Calendar className="text-yellow-600 dark:text-yellow-400 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {appointments?.todayCount || 0}
            </div>
            {appointments?.pendingCount ? (
              <p className="text-yellow-600 dark:text-yellow-400 text-xs font-medium mt-1 flex items-center">
                <Activity className="h-3 w-3 mr-1" />
                {appointments.pendingCount} pending confirmation
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Scheduled Appointments */}
        <Card className="bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-400 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-muted-foreground">
              Scheduled Appointments
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-gradient-to-br dark:from-green-500/20 dark:to-green-700/20 shadow-inner">
              <Calendar className="text-green-600 dark:text-green-400 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {appointments?.scheduledCount || 0}
            </div>
            <p className="text-green-600 dark:text-green-400 text-xs font-medium mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              Confirmed appointments
            </p>
          </CardContent>
        </Card>

        {/* Cancelled Appointments */}
        <Card className="bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-400 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-muted-foreground">
              Cancelled Appointments
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-gradient-to-br dark:from-red-500/20 dark:to-red-700/20 shadow-inner">
              <X className="text-red-600 dark:text-red-400 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {appointments?.cancelledCount || 0}
            </div>
            <p className="text-red-600 dark:text-red-400 text-xs font-medium mt-1">
              Total cancelled
            </p>
          </CardContent>
        </Card>

        {/* Missed Appointments */}
        <Card className="bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-400 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-muted-foreground">
              Missed Appointments
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-gradient-to-br dark:from-purple-500/20 dark:to-purple-700/20 shadow-inner">
              <AlertTriangle className="text-purple-600 dark:text-purple-400 h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {appointments?.missedCount || 0}
            </div>
            <p className="text-purple-600 dark:text-purple-400 text-xs font-medium mt-1">
              No-show appointments
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-7 bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-400 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">
              Appointment Analytics
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              Appointment trends and statistics over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppointmentChart className="w-full aspect-[4/1] max-h-[350px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPage;

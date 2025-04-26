"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

import { DataTable } from "@/components/table/DataTable";
import { columns } from "@/components/table/doctor-columns";
import { getArchivedDoctorAppointments } from "@/lib/actions/appointment.actions";
import { Doctors } from "@/constants";
import { Appointment } from "@/types/appwrite.types";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, LogOut, ChevronLeft, Search, Calendar, Download } from "lucide-react";

const ArchivedAppointmentsPage = () => {
  const [archivedAppointments, setArchivedAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDoctor, setCurrentDoctor] = useState("");
  const [currentDoctorId, setCurrentDoctorId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [dateFilter, setDateFilter] = useState("all");
  
  const router = useRouter();

  // Function to get doctor ID from name
  const getDoctorIdFromName = (name: string) => {
    const doctor = Doctors.find((doc) => doc.name === name);
    return doctor ? doctor.id : "default";
  };

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const encryptedKey =
        typeof window !== "undefined"
          ? window.localStorage.getItem("doctorAccessKey")
          : null;

      const doctorName = localStorage.getItem("doctorName");
      const hasValidKey =
        encryptedKey &&
        doctorName &&
        Doctors.some((doc) => doc.name === doctorName);

      if (!hasValidKey) {
        router.push("/doctor");
        return false;
      }

      setCurrentDoctor(doctorName);
      setCurrentDoctorId(getDoctorIdFromName(doctorName));
      return true;
    };

    const isAuthenticated = checkAuth();

    if (isAuthenticated) {
      fetchArchivedAppointments();
    }
  }, [router]);

  // Filter appointments based on search and date filters
  useEffect(() => {
    let filtered = archivedAppointments;
    
    // First apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;
      
      switch (dateFilter) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          filtered = filtered.filter(appointment => 
            new Date(appointment.$updatedAt || appointment.$createdAt) >= startDate
          );
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 7);
          filtered = filtered.filter(appointment => 
            new Date(appointment.$updatedAt || appointment.$createdAt) >= startDate
          );
          break;
        case "month":
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 1);
          filtered = filtered.filter(appointment => 
            new Date(appointment.$updatedAt || appointment.$createdAt) >= startDate
          );
          break;
        case "year":
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          filtered = filtered.filter(appointment => 
            new Date(appointment.$updatedAt || appointment.$createdAt) >= startDate
          );
          break;
      }
    }
    
    // Then apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(appointment => {
        // Check various fields for the search term
        return (
          appointment.primaryPhysician.toLowerCase().includes(query) ||
          (appointment.patient?.name?.toLowerCase().includes(query) || false) ||
          (appointment.status.toLowerCase().includes(query)) ||
          (appointment.reason?.toLowerCase().includes(query) || false) ||
          (appointment.note?.toLowerCase().includes(query) || false)
        );
      });
    }

    setFilteredAppointments(filtered);
  }, [searchQuery, dateFilter, archivedAppointments]);

  const fetchArchivedAppointments = async () => {
    const doctorName = localStorage.getItem("doctorName");
    if (!doctorName) return;

    setLoading(true);
    try {
      const appointments = await getArchivedDoctorAppointments(doctorName);
      
      if (appointments && appointments.length > 0) {
        setArchivedAppointments(appointments);
        setFilteredAppointments(appointments);
      } else {
        setArchivedAppointments([]);
        setFilteredAppointments([]);
      }
    } catch (error) {
      console.error("Error fetching archived appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("doctorAccessKey");
    localStorage.removeItem("doctorName");
    router.push("/");
  };

  // Go back to dashboard
  const handleBackToDashboard = () => {
    router.push("/doctor");
  };

  // Export to Excel function
  const exportToExcel = () => {
    if (filteredAppointments.length === 0) return;
    
    // Filter only completed appointments
    const completedAppointments = filteredAppointments.filter(apt => 
      apt.status.toLowerCase() === "completed"
    );
    
    if (completedAppointments.length === 0) {
      alert("No completed appointments to export.");
      return;
    }
    
    // Get current month and year for report title
    const currentDate = new Date();
    const monthYear = format(currentDate, "MMMM yyyy");
    
    // Create worksheet data with specific required fields
    const worksheetData = completedAppointments.map(apt => ({
      "Patient Name": apt.patient?.name || "Unknown Patient",
      "Appointment Date": format(new Date(apt.schedule), "MM/dd/yyyy"),
      "Appointment Time": format(new Date(apt.schedule), "h:mm a"),
      "ID Number": apt.patient?.identificationNumber || apt.patient?.userId || "N/A",
      "Appointment Code": apt.appointmentCode || "N/A",
      "Reason": apt.reason || "N/A",
      "Category": apt.patient?.category || "N/A",
      "Phone Number": apt.patient?.phone || "N/A",
      "Doctor Name": `Dr. ${apt.primaryPhysician}` || "N/A"
    }));
    
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    
    // Add column widths for better readability
    const columnWidths = [
      { wch: 25 }, // Patient Name
      { wch: 15 }, // Appointment Date
      { wch: 15 }, // Appointment Time
      { wch: 15 }, // ID Number
      { wch: 15 }, // Appointment Code
      { wch: 30 }, // Reason
      { wch: 12 }, // Category
      { wch: 15 }, // Phone Number
      { wch: 20 }  // Doctor Name
    ];
    
    worksheet['!cols'] = columnWidths;
    
    // Add worksheet to workbook with a title including the month/year
    XLSX.utils.book_append_sheet(workbook, worksheet, `Appointments ${monthYear}`);
    
    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `Completed_Appointments_${format(currentDate, "yyyy-MM")}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-300">
      <div className="mx-auto max-w-7xl flex flex-col space-y-8 px-4 sm:px-6 lg:px-8">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2 rounded-full overflow-hidden border-2 border-dark-500 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-dark-300 transition-all duration-200">
                  <Avatar className="h-10 w-10 cursor-pointer">
                    <AvatarImage
                      src={`/assets/images/doctors/${currentDoctorId || "default"}.jpg`}
                      alt={`Dr. ${currentDoctor}`}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500/80 to-blue-700/80 text-white">
                      {currentDoctor
                        ? currentDoctor.substring(0, 2).toUpperCase()
                        : "DR"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">Dr. {currentDoctor}</span>
                    <span className="text-xs text-gray-400">Doctor</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/doctor")}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Back to Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-500 cursor-pointer focus:text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="admin-main">
          <section className="space-y-4 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  className="mr-2 h-9 px-2"
                  onClick={handleBackToDashboard}
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="ml-1">Back to Dashboard</span>
                </Button>
                <h1 className="text-2xl font-semibold">Archived Appointments</h1>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Calendar className="h-4 w-4 text-dark-600" />
                  <Select 
                    value={dateFilter} 
                    onValueChange={setDateFilter}
                  >
                    <SelectTrigger className="h-10 w-full sm:w-36">
                      <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 days</SelectItem>
                      <SelectItem value="month">Last 30 days</SelectItem>
                      <SelectItem value="year">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-dark-600" />
                  <Input
                    placeholder="Search archived records..."
                    className="pl-9 h-10 w-full bg-white dark:bg-dark-400 border-dark-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Button
                  variant="outline"
                  className="h-10 w-full sm:w-auto"
                  onClick={exportToExcel}
                  disabled={!filteredAppointments.some(apt => apt.status.toLowerCase() === "completed")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Monthly Report
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <p>Loading archived appointments...</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border border-dashed border-dark-500 rounded-lg bg-white dark:bg-dark-400">
                <p className="text-lg text-gray-500 mb-2">No archived appointments found</p>
                <p className="text-sm text-gray-400 text-center max-w-md">
                  {archivedAppointments.length > 0 
                    ? "No appointments match your search criteria. Try changing your filters." 
                    : "When you clear your appointment history, they will appear here"}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleBackToDashboard}
                >
                  Back to Dashboard
                </Button>
              </div>
            ) : (
              <div className="dashboard-card">
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm text-gray-500">
                      Showing {filteredAppointments.length} of {archivedAppointments.length} archived appointments
                    </p>
                  </div>
                  <div className="rounded-md border">
                    <DataTable 
                      columns={columns} 
                      data={filteredAppointments} 
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default ArchivedAppointmentsPage; 
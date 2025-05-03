"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Calendar,
  Filter,
  Search,
  X,
  CalendarClock,
  Plus,
} from "lucide-react";

import { getAllAppointments } from "@/lib/actions/appointment.actions";
import { Appointment } from "@/types/appwrite.types";
import { DataTable } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Doctors } from "@/constants";
import { createAdminAppointmentColumns } from "@/components/table/admin-appointment-columns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CreateAppointmentModal } from "@/components/CreateAppointmentModal";

interface AppointmentsPageProps {
  searchParams: {
    search?: string;
    status?: string;
    doctor?: string;
    startDate?: string;
    endDate?: string;
    sort?: string;
    order?: string;
    page?: string;
  };
}

const AppointmentsPage = ({ searchParams }: AppointmentsPageProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Search and filter state
  const [searchValue, setSearchValue] = useState(searchParams.search || "");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.status || "all"
  );
  const [doctorFilter, setDoctorFilter] = useState(
    searchParams.doctor || "all"
  );
  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.startDate ? new Date(searchParams.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.endDate ? new Date(searchParams.endDate) : undefined
  );
  const [sortField] = useState(searchParams.sort || "schedule");
  const [sortOrder] = useState(searchParams.order || "desc");

  const router = useRouter();
  const pathname = usePathname();
  const searchParamsObj = useSearchParams();

  // Fetch appointments when search params change
  useEffect(() => {
    async function fetchAppointments() {
      setLoading(true);

      const data = await getAllAppointments({
        searchQuery: searchParams.search || "",
        status:
          searchParams.status && searchParams.status !== "all"
            ? searchParams.status
            : "",
        doctor:
          searchParams.doctor && searchParams.doctor !== "all"
            ? searchParams.doctor
            : "",
        startDate: searchParams.startDate
          ? new Date(searchParams.startDate).toISOString()
          : "",
        endDate: searchParams.endDate
          ? new Date(searchParams.endDate).toISOString()
          : "",
        sortField: searchParams.sort || "schedule",
        sortOrder: (searchParams.order as "asc" | "desc") || "desc",
        page: searchParams.page ? parseInt(searchParams.page) : 1,
      });

      setAppointments(data.appointments as Appointment[]);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
      setTotalAppointments(data.totalCount);
      setLoading(false);
    }

    fetchAppointments();
  }, [searchParams]);

  // Construct columns with refresh callback
  const appointmentColumns = createAdminAppointmentColumns(() => {
    // Refresh current page data
    router.refresh();
  });

  // Handle search and filter submissions
  const handleApplyFilters = () => {
    const params = new URLSearchParams();

    if (searchValue && searchValue.trim() !== "") {
      params.set("search", searchValue.trim());
    }

    if (statusFilter && statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    if (doctorFilter && doctorFilter !== "all") {
      params.set("doctor", doctorFilter);
    }

    if (startDate) {
      params.set("startDate", startDate.toISOString());
    }

    if (endDate) {
      params.set("endDate", endDate.toISOString());
    }

    // Keep sorting if it exists
    if (searchParams.sort) {
      params.set("sort", searchParams.sort);
    }

    if (searchParams.order) {
      params.set("order", searchParams.order);
    }

    // Reset to page 1 when filtering
    params.delete("page");

    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  // Reset all filters
  const handleClearFilters = () => {
    setSearchValue("");
    setStatusFilter("all");
    setDoctorFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
    router.push(pathname);
  };

  return (
    <main className="w-full py-6 px-4 lg:px-3 xl:px-4">
      <section className="w-full mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-32-bold text-gray-900 dark:text-white">
            Appointments Management
          </h1>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900 font-medium"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Appointment
          </Button>
        </div>
      </section>

      {/* Filters section */}
      <div className="bg-white dark:bg-dark-300 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-dark-400 shadow-md mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
              <Input
                placeholder="Search appointments..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 h-9 bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500 w-full text-gray-900 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyFilters();
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Button
                variant="default"
                size="sm"
                onClick={handleApplyFilters}
                className="h-9"
              >
                <Search className="h-4 w-4 mr-1.5" />
                Search
              </Button>

              {(searchValue ||
                statusFilter !== "all" ||
                doctorFilter !== "all" ||
                startDate ||
                endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <div className="flex-1 min-w-[120px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Doctor Filter */}
            <div className="flex-1 min-w-[150px]">
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger className="h-9 bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <SelectValue placeholder="Doctor" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {Doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.name}>
                      Dr. {doctor.name.split(" ")[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[350px]">
              {/* Start Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`justify-start text-left font-normal h-9 bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500 ${
                      !startDate && "text-gray-500 dark:text-gray-400"
                    } ${startDate && "text-gray-900 dark:text-white"}`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {startDate
                      ? format(startDate, "MMM dd, yyyy")
                      : "Start Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-gray-500 dark:text-gray-400">to</span>

              {/* End Date */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`justify-start text-left font-normal h-9 bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500 ${
                      !endDate && "text-gray-500 dark:text-gray-400"
                    } ${endDate && "text-gray-900 dark:text-white"}`}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMM dd, yyyy") : "End Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => (startDate ? date < startDate : false)}
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyFilters}
                className="h-9 bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
              >
                <Filter className="h-4 w-4 mr-1.5" />
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table section */}
      <div className="bg-white dark:bg-dark-300 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-dark-400 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <CalendarClock className="h-5 w-5" />
            <p className="text-sm">
              Total: {totalAppointments} appointment
              {totalAppointments !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Active filters display */}
          {(searchValue ||
            statusFilter !== "all" ||
            doctorFilter !== "all" ||
            startDate ||
            endDate) && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500 dark:text-gray-400 hidden sm:flex items-center">
                Filters:
                {searchValue && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-dark-400 rounded-md text-xs text-gray-700 dark:text-gray-200">
                    "{searchValue}"
                  </span>
                )}
                {statusFilter !== "all" && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-dark-400 rounded-md text-xs text-gray-700 dark:text-gray-200">
                    Status: {statusFilter}
                  </span>
                )}
                {doctorFilter !== "all" && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-dark-400 rounded-md text-xs truncate max-w-[100px] text-gray-700 dark:text-gray-200">
                    Dr. {doctorFilter.split(" ")[0]}
                  </span>
                )}
                {startDate && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-dark-400 rounded-md text-xs text-gray-700 dark:text-gray-200">
                    From: {format(startDate, "MM/dd/yyyy")}
                  </span>
                )}
                {endDate && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-dark-400 rounded-md text-xs text-gray-700 dark:text-gray-200">
                    To: {format(endDate, "MM/dd/yyyy")}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <p className="text-gray-500 dark:text-gray-400">
              Loading appointments...
            </p>
          </div>
        ) : appointments.length > 0 ? (
          <DataTable columns={appointmentColumns} data={appointments} />
        ) : (
          <div className="flex flex-col justify-center items-center h-48 text-center">
            <CalendarClock className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No appointments found
            </p>
            {(searchValue ||
              statusFilter !== "all" ||
              doctorFilter !== "all" ||
              startDate ||
              endDate) && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Try adjusting your search criteria
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="mt-4 bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          // Refresh the list after creating an appointment
          router.refresh();
        }}
      />
    </main>
  );
};

export default AppointmentsPage;

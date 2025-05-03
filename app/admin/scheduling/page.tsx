"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Plus,
  X,
  Edit2,
  Calendar,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Stethoscope,
  User,
} from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/table/DataTable";
import { Doctors } from "@/constants";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveDoctorAvailability,
  getDoctorAvailability,
} from "@/lib/actions/appointment.actions";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types for the data
interface Doctor {
  id: string;
  name: string;
  displayName: string;
  image: string;
  specialty?: string;
  status?: "active" | "inactive";
  availability: {
    days: number[];
    startTime: number;
    endTime: number;
    holidays: Date[];
    bookingStartDate: string;
    bookingEndDate: string;
    maxAppointmentsPerDay: number;
  };
}

// Types for the doctor form
interface DoctorFormData {
  id: string;
  name: string;
  specialty: string;
  image: string;
  status: "active" | "inactive";
  passkey?: string;
}

// Interface for search params
interface DoctorsTableProps {
  searchParams: {
    search?: string;
    status?: string;
    page?: string;
  };
}

const DoctorsPage = ({ searchParams }: DoctorsTableProps) => {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchValue, setSearchValue] = useState(searchParams.search || "");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.status || "all"
  );
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.page) || 1
  );
  const [totalPages, setTotalPages] = useState(1);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [isEditDoctorOpen, setIsEditDoctorOpen] = useState(false);
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>({
    id: "",
    name: "",
    specialty: "",
    image: "",
    status: "active",
  });
  const [availabilityData, setAvailabilityData] = useState({
    days: [1, 2, 3, 4, 5],
    startTime: 8,
    endTime: 17,
    maxAppointmentsPerDay: 10,
  });

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // Convert searchParams to a URLSearchParams object for easier manipulation
  const searchParamsObj = new URLSearchParams(
    Object.entries(searchParams).filter(([_, value]) => value !== undefined)
  );

  // Fetch doctors with status
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        // We'll use the Doctors from constants for now, but in a real app this would be an API call
        const doctorsWithStatus = Doctors.map((doctor) => ({
          ...doctor,
          specialty: doctor.displayName.includes("Medical")
            ? "Medical"
            : "Dental",
          status:
            Math.random() > 0.2
              ? "active"
              : ("inactive" as "active" | "inactive"), // Cast to appropriate type
        }));

        // Apply filters
        let filteredDoctors = [...doctorsWithStatus];

        // Apply search filter
        if (searchValue) {
          filteredDoctors = filteredDoctors.filter((doctor) =>
            doctor.name.toLowerCase().includes(searchValue.toLowerCase())
          );
        }

        // Apply status filter
        if (statusFilter && statusFilter !== "all") {
          filteredDoctors = filteredDoctors.filter(
            (doctor) => doctor.status === statusFilter
          );
        }

        setDoctors(filteredDoctors as Doctor[]);
        setTotalPages(Math.ceil(filteredDoctors.length / 10)); // Assuming 10 per page
      } catch (error) {
        console.error("Error fetching doctors:", error);
        toast({
          title: "Error",
          description: "Failed to load doctors. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [searchValue, statusFilter, toast]);

  // Handle search
  const handleSearch = () => {
    const params = new URLSearchParams(searchParamsObj.toString());
    if (searchValue) {
      params.set("search", searchValue);
    } else {
      params.delete("search");
    }

    if (statusFilter && statusFilter !== "all") {
      params.set("status", statusFilter);
    } else {
      params.delete("status");
    }

    params.set("page", "1"); // Reset to first page on new search
    router.push(`${pathname}?${params.toString()}`);
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchValue("");
    setStatusFilter("all");
    router.push(pathname);
  };

  // Handle add/edit doctor submission
  const handleDoctorSubmit = async (isEdit: boolean) => {
    try {
      // In a real app, we would make an API call to save the doctor
      // If a passkey is provided, also save it
      if (formData.passkey && formData.passkey.trim() !== "") {
        try {
          // Call the passkey API to set the passkey
          const response = await fetch("/api/passkey", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idNumber: formData.id || formData.name, // Use ID or name as identifier
              passkey: formData.passkey,
            }),
          });

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || "Failed to set passkey");
          }
        } catch (passKeyError) {
          console.error("Error setting doctor passkey:", passKeyError);
          toast({
            title: "Warning",
            description: `Doctor saved but passkey could not be set: ${passKeyError}`,
            variant: "destructive",
          });
          // Continue with function even if passkey setting fails
        }
      }

      toast({
        title: `Doctor ${isEdit ? "updated" : "added"} successfully`,
        variant: "default",
      });

      // Close the dialog
      if (isEdit) {
        setIsEditDoctorOpen(false);
      } else {
        setIsAddDoctorOpen(false);
      }

      // Refresh the list
      handleSearch();
    } catch (error) {
      console.error(`Error ${isEdit ? "updating" : "adding"} doctor:`, error);
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? "update" : "add"} doctor. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Handle availability submission
  const handleAvailabilitySubmit = async () => {
    if (!selectedDoctor) return;

    try {
      // Save the availability
      const result = await saveDoctorAvailability(selectedDoctor.id, {
        ...selectedDoctor.availability,
        ...availabilityData,
      });

      if (result.success) {
        toast({
          title: "Availability updated",
          description: "Doctor's availability has been updated successfully.",
          variant: "default",
        });
        setIsAvailabilityOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Error updating availability:", error);
      toast({
        title: "Error",
        description: "Failed to update availability. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Load doctor availability when a doctor is selected
  useEffect(() => {
    const loadDoctorAvailability = async () => {
      if (!selectedDoctor) return;

      try {
        const availability = await getDoctorAvailability(selectedDoctor.id);
        if (availability) {
          setAvailabilityData({
            days: availability.days || [1, 2, 3, 4, 5],
            startTime: availability.startTime || 8,
            endTime: availability.endTime || 17,
            maxAppointmentsPerDay: availability.maxAppointmentsPerDay || 10,
          });
        } else {
          // Use default values from the doctor
          setAvailabilityData({
            days: selectedDoctor.availability.days || [1, 2, 3, 4, 5],
            startTime: selectedDoctor.availability.startTime || 8,
            endTime: selectedDoctor.availability.endTime || 17,
            maxAppointmentsPerDay:
              selectedDoctor.availability.maxAppointmentsPerDay || 10,
          });
        }
      } catch (error) {
        console.error("Error loading doctor availability:", error);
      }
    };

    loadDoctorAvailability();
  }, [selectedDoctor]);

  // Define table columns
  const doctorColumns = [
    {
      accessorKey: "name",
      header: "Doctor",
      cell: ({ row }: { row: any }) => {
        const doctor = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-dark-400">
              {doctor.image ? (
                <Image
                  src={doctor.image}
                  alt={doctor.name}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-14-medium text-gray-900 dark:text-white">
                {doctor.name}
              </p>
              <p className="text-12-regular text-gray-500 dark:text-gray-400">
                ID: {doctor.id}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "specialty",
      header: "Specialty",
      cell: ({ row }: { row: any }) => {
        const specialty = row.original.specialty;
        return (
          <div
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium w-fit",
              specialty === "Medical"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
                : "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400"
            )}
          >
            <span>{specialty}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "availability",
      header: "Availability",
      cell: ({ row }: { row: any }) => {
        const availability = row.original.availability;
        const days = availability.days
          .map((day: number) => {
            switch (day) {
              case 1:
                return "Mon";
              case 2:
                return "Tue";
              case 3:
                return "Wed";
              case 4:
                return "Thur";
              case 5:
                return "Fri";
              case 6:
                return "Sat";
              case 0:
                return "Sun";
              default:
                return "";
            }
          })
          .join(", ");

        return (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-900 dark:text-white">
              {days || "No days set"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {availability.startTime}:00 - {availability.endTime}:00
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Max: {availability.maxAppointmentsPerDay} appts/day
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: { row: any }) => {
        const status = row.original.status;
        return (
          <div
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium w-fit",
              status === "active"
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            )}
          >
            {status === "active" ? "Active" : "Inactive"}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => {
        const doctor = row.original;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 flex items-center gap-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-300 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-400"
              onClick={() => {
                setSelectedDoctor(doctor);
                setAvailabilityData({
                  days: doctor.availability.days,
                  startTime: doctor.availability.startTime,
                  endTime: doctor.availability.endTime,
                  maxAppointmentsPerDay:
                    doctor.availability.maxAppointmentsPerDay,
                });
                setIsAvailabilityOpen(true);
              }}
            >
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Availability</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500"
              >
                <DropdownMenuItem
                  className="text-gray-700 dark:text-gray-200 cursor-pointer"
                  onClick={() => {
                    setSelectedDoctor(doctor);
                    setFormData({
                      id: doctor.id,
                      name: doctor.name,
                      specialty: doctor.specialty || "",
                      image: doctor.image,
                      status: doctor.status || "active",
                      passkey: doctor.passkey || "",
                    });
                    setIsEditDoctorOpen(true);
                  }}
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  <span>Edit</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer",
                    doctor.status === "active"
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  )}
                  onClick={() => {
                    toast({
                      title: `Doctor ${doctor.status === "active" ? "deactivated" : "activated"}`,
                      description: `${doctor.name} has been ${doctor.status === "active" ? "deactivated" : "activated"} successfully.`,
                      variant: "default",
                    });
                  }}
                >
                  {doctor.status === "active" ? (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      <span>Deactivate</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      <span>Activate</span>
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <main className="w-full py-6 px-4 lg:px-3 xl:px-4">
      <section className="w-full mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <h1 className="text-32-bold text-gray-900 dark:text-white">
            Doctors Management
          </h1>
          <Button
            onClick={() => {
              setFormData({
                id: "",
                name: "",
                specialty: "",
                image: "",
                status: "active",
                passkey: "",
              });
              setIsAddDoctorOpen(true);
            }}
            className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900 font-medium"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Doctor
          </Button>
        </div>
      </section>

      <div className="bg-white dark:bg-dark-300 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-dark-400 shadow-md mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder="Search doctors..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 h-9 bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500 w-full text-gray-900 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                // Auto-apply the filter when status changes
                const params = new URLSearchParams(searchParamsObj.toString());

                if (value && value !== "all") {
                  params.set("status", value);
                } else {
                  params.delete("status");
                }

                if (searchValue) {
                  params.set("search", searchValue);
                }

                const queryString = params.toString();
                router.push(
                  `${pathname}${queryString ? `?${queryString}` : ""}`
                );
              }}
            >
              <SelectTrigger className="w-32 h-9 bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="default"
              size="sm"
              onClick={handleSearch}
              className="h-9 bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900"
            >
              <Search className="h-4 w-4 mr-1.5" />
              Search
            </Button>

            {(searchValue || (statusFilter && statusFilter !== "all")) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-300 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-dark-400 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Stethoscope className="h-5 w-5" />
            <p className="text-sm">
              Total: {doctors.length} doctor{doctors.length !== 1 ? "s" : ""}
            </p>
          </div>

          {(searchValue || (statusFilter && statusFilter !== "all")) && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Filters:
                {searchValue && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-dark-400 rounded-md text-xs text-gray-900 dark:text-gray-200">
                    "{searchValue}"
                  </span>
                )}
                {statusFilter && statusFilter !== "all" && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-dark-400 rounded-md text-xs text-gray-900 dark:text-gray-200">
                    {statusFilter}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <p className="text-gray-500 dark:text-gray-400">
              Loading doctors...
            </p>
          </div>
        ) : doctors.length > 0 ? (
          <DataTable columns={doctorColumns} data={doctors} />
        ) : (
          <div className="flex flex-col justify-center items-center h-48 text-center">
            <Stethoscope className="h-12 w-12 text-gray-500 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No doctors found</p>
            {(searchValue || statusFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="mt-4"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add Doctor Dialog */}
      <Dialog open={isAddDoctorOpen} onOpenChange={setIsAddDoctorOpen}>
        <DialogContent className="bg-white dark:bg-dark-300 text-gray-900 dark:text-white border-gray-200 dark:border-dark-400 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white text-xl font-semibold">
              Add New Doctor
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Fill in the details to add a new doctor to the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-gray-700 dark:text-gray-300"
              >
                Full Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
                placeholder="Enter doctor's full name"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="specialty"
                className="text-gray-700 dark:text-gray-300"
              >
                Specialty
              </Label>
              <Select
                value={formData.specialty}
                onValueChange={(value) =>
                  setFormData({ ...formData, specialty: value })
                }
              >
                <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Dental">Dental</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="passkey"
                className="text-gray-700 dark:text-gray-300"
              >
                Passkey (6-digit code)
              </Label>
              <Input
                id="passkey"
                value={formData.passkey || ""}
                onChange={(e) =>
                  setFormData({ ...formData, passkey: e.target.value })
                }
                className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
                placeholder="Enter 6-digit passkey"
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This passkey will be used by the doctor to access the system
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.status === "active"}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({
                      ...formData,
                      status: checked ? "active" : "inactive",
                    })
                  }
                />
                <Label className="text-gray-700 dark:text-gray-300">
                  {formData.status === "active" ? "Active" : "Inactive"}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddDoctorOpen(false)}
              className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-500"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleDoctorSubmit(false)}
              className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900"
            >
              Add Doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Doctor Dialog */}
      <Dialog open={isEditDoctorOpen} onOpenChange={setIsEditDoctorOpen}>
        <DialogContent className="bg-white dark:bg-dark-300 text-gray-900 dark:text-white border-gray-200 dark:border-dark-400 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white text-xl font-semibold">
              Edit Doctor
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Update the doctor's information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="edit-name"
                className="text-gray-700 dark:text-gray-300"
              >
                Full Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
                placeholder="Enter doctor's full name"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-specialty"
                className="text-gray-700 dark:text-gray-300"
              >
                Specialty
              </Label>
              <Select
                value={formData.specialty}
                onValueChange={(value) =>
                  setFormData({ ...formData, specialty: value })
                }
              >
                <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Dental">Dental</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-passkey"
                className="text-gray-700 dark:text-gray-300"
              >
                Passkey (6-digit code)
              </Label>
              <Input
                id="edit-passkey"
                value={formData.passkey || ""}
                onChange={(e) =>
                  setFormData({ ...formData, passkey: e.target.value })
                }
                className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
                placeholder="Enter new 6-digit passkey"
                maxLength={6}
                pattern="[0-9]*"
                inputMode="numeric"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Leave blank to keep the existing passkey
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.status === "active"}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({
                      ...formData,
                      status: checked ? "active" : "inactive",
                    })
                  }
                />
                <Label className="text-gray-700 dark:text-gray-300">
                  {formData.status === "active" ? "Active" : "Inactive"}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDoctorOpen(false)}
              className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-500"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleDoctorSubmit(true)}
              className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900"
            >
              Update Doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Availability Dialog */}
      <Dialog open={isAvailabilityOpen} onOpenChange={setIsAvailabilityOpen}>
        <DialogContent className="bg-white dark:bg-dark-300 text-gray-900 dark:text-white border-gray-200 dark:border-dark-400 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white text-xl font-semibold">
              Set Doctor Availability
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {selectedDoctor?.name} - Configure working hours and capacity.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">
                Working Days
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { day: 1, label: "Mon" },
                  { day: 2, label: "Tue" },
                  { day: 3, label: "Wed" },
                  { day: 4, label: "Thu" },
                  { day: 5, label: "Fri" },
                  { day: 6, label: "Sat" },
                  { day: 0, label: "Sun" },
                ].map(({ day, label }) => (
                  <Button
                    key={day}
                    type="button"
                    variant={
                      availabilityData.days.includes(day)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className={cn(
                      "h-9",
                      availabilityData.days.includes(day)
                        ? "bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900"
                        : "bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
                    )}
                    onClick={() => {
                      const newDays = availabilityData.days.includes(day)
                        ? availabilityData.days.filter((d) => d !== day)
                        : [...availabilityData.days, day].sort();
                      setAvailabilityData({
                        ...availabilityData,
                        days: newDays,
                      });
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="startTime"
                  className="text-gray-700 dark:text-gray-300"
                >
                  Start Time
                </Label>
                <Select
                  value={availabilityData.startTime.toString()}
                  onValueChange={(value) =>
                    setAvailabilityData({
                      ...availabilityData,
                      startTime: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => i + 7).map((hour) => (
                      <SelectItem key={hour} value={hour.toString()}>
                        {hour}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="endTime"
                  className="text-gray-700 dark:text-gray-300"
                >
                  End Time
                </Label>
                <Select
                  value={availabilityData.endTime.toString()}
                  onValueChange={(value) =>
                    setAvailabilityData({
                      ...availabilityData,
                      endTime: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 13 }, (_, i) => i + 12).map(
                      (hour) => (
                        <SelectItem key={hour} value={hour.toString()}>
                          {hour}:00
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="maxAppointments"
                className="text-gray-700 dark:text-gray-300"
              >
                Maximum Appointments Per Day
              </Label>
              <Select
                value={availabilityData.maxAppointmentsPerDay.toString()}
                onValueChange={(value) =>
                  setAvailabilityData({
                    ...availabilityData,
                    maxAppointmentsPerDay: parseInt(value),
                  })
                }
              >
                <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                  <SelectValue placeholder="Select max appointments" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }, (_, i) => i + 5).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} appointments
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAvailabilityOpen(false)}
              className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-500"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAvailabilitySubmit}
              className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900"
            >
              Save Availability
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default DoctorsPage;

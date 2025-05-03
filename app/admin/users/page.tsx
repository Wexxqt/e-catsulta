"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Eye,
  Search,
  Users,
  X,
  FileText,
  Edit,
  Save,
  Check,
  MessageSquare,
  Plus,
  UserMinus,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";

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
import {
  getAllPatients,
  updatePatientPersonalInfo,
  updatePatientMedical,
} from "@/lib/actions/patient.actions";
import { getPatientNotes } from "@/lib/actions/patient-notes.actions";
import { Patient, PatientNote } from "@/types/appwrite.types";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { getGravatarUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toast";
import { toast } from "@/components/ui/use-toast";

interface PatientsTableProps {
  searchParams: {
    search?: string;
    category?: string;
    page?: string;
  };
}

const PatientsPage = ({ searchParams }: PatientsTableProps) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState(searchParams.search || "");
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.category || "all"
  );
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [patientToDeactivate, setPatientToDeactivate] =
    useState<Patient | null>(null);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "";
    message: string;
  }>({ type: "", message: "" });

  const router = useRouter();
  const pathname = usePathname();
  const searchParamsObj = useSearchParams();

  useEffect(() => {
    async function fetchPatients() {
      setLoading(true);

      const data = await getAllPatients({
        searchQuery: searchParams.search || "",
        category:
          searchParams.category && searchParams.category !== "all"
            ? searchParams.category
            : "",
        page: searchParams.page ? parseInt(searchParams.page) : 1,
      });

      setPatients(data.patients as Patient[]);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
      setTotalPatients(data.totalPatients);
      setLoading(false);
    }

    fetchPatients();
  }, [searchParams]);

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (searchValue && searchValue.trim() !== "") {
      params.set("search", searchValue.trim());
    } else {
      params.delete("search");
    }

    if (categoryFilter && categoryFilter !== "all") {
      params.set("category", categoryFilter);
    } else {
      params.delete("category");
    }

    // Clear the page parameter when searching to start from the first page
    params.delete("page");

    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  const handleClearFilters = () => {
    setSearchValue("");
    setCategoryFilter("all");
    router.push(pathname);
  };

  const refreshPatientsList = (
    message?: string,
    type?: "success" | "error"
  ) => {
    // Show notification if provided
    if (message && type) {
      if (type === "success") {
        toast({
          title: "Success",
          description: message,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      }
    }

    // Refetch patients data
    const currentParams = new URLSearchParams(searchParamsObj.toString());
    router.push(`${pathname}?${currentParams.toString()}`);
  };

  const patientColumns: ColumnDef<Patient>[] = [
    {
      header: "#",
      cell: ({ row }) => {
        return <p className="text-14-medium">{row.index + 1}</p>;
      },
    },
    {
      accessorKey: "name",
      header: "Patient Name",
      cell: ({ row }) => {
        const patient: Patient = row.original;

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={
                  patient.email
                    ? getGravatarUrl(patient.email, 40)
                    : getGravatarUrl("", 40, "robohash", patient.$id)
                }
                alt={patient.name || "Patient"}
              />
              <AvatarFallback>
                {patient.name
                  ? patient.name.substring(0, 2).toUpperCase()
                  : "P"}
              </AvatarFallback>
            </Avatar>
            <p className="text-14-medium">{patient.name}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        return <p className="text-14-regular">{row.original.email}</p>;
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.original.category;
        return (
          <div
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium w-fit",
              category === "Student"
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
                : "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400"
            )}
          >
            {category}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const patient = row.original;
        // Check for archived property instead of isActive
        const isActive = patient.archived !== true;

        return (
          <div
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium w-fit",
              isActive
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            )}
          >
            {isActive ? "Active" : "Inactive"}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const patient = row.original;

        return (
          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 flex items-center gap-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-300 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-400"
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">View</span>
                </Button>
              </DialogTrigger>
              <PatientDetailsDialog
                isOpen={true}
                setIsOpen={() => {}}
                patient={patient}
              />
            </Dialog>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPatientToDeactivate(patient);
                setDeactivateDialogOpen(true);
              }}
              className="h-8 px-2 flex items-center gap-1 border-red-200 dark:border-red-900/30 bg-white dark:bg-dark-300 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <UserMinus className="h-4 w-4" />
              <span className="text-xs">Deactivate</span>
            </Button>
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
            Patients Management
          </h1>
          <Button
            onClick={() => setAddPatientOpen(true)}
            className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-gray-300 text-white dark:text-gray-900 font-medium"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
        </div>
      </section>

      <div className="bg-white dark:bg-dark-300 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-dark-400 shadow-md mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder="Search patients..."
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
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                // Auto-apply the filter when category changes
                const params = new URLSearchParams(searchParamsObj.toString());

                if (value && value !== "all") {
                  params.set("category", value);
                } else {
                  params.delete("category");
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
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="default"
              size="sm"
              onClick={handleSearch}
              className="h-9"
            >
              <Search className="h-4 w-4 mr-1.5" />
              Search
            </Button>

            {(searchValue || (categoryFilter && categoryFilter !== "all")) && (
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
            <Users className="h-5 w-5" />
            <p className="text-sm">
              Total: {totalPatients} patient{totalPatients !== 1 ? "s" : ""}
            </p>
          </div>

          {(searchValue || (categoryFilter && categoryFilter !== "all")) && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Filters:
                {searchValue && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-dark-400 rounded-md text-xs text-gray-900 dark:text-gray-200">
                    "{searchValue}"
                  </span>
                )}
                {categoryFilter && categoryFilter !== "all" && (
                  <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-dark-400 rounded-md text-xs text-gray-900 dark:text-gray-200">
                    {categoryFilter}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <p className="text-gray-500 dark:text-gray-400">
              Loading patients...
            </p>
          </div>
        ) : patients.length > 0 ? (
          <>
            <DataTable columns={patientColumns} data={patients} />

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const params = new URLSearchParams(
                      searchParamsObj.toString()
                    );
                    const prevPage = Math.max(currentPage - 1, 1);
                    params.set("page", prevPage.toString());

                    if (searchValue) params.set("search", searchValue);
                    if (categoryFilter && categoryFilter !== "all")
                      params.set("category", categoryFilter);

                    router.push(`${pathname}?${params.toString()}`);
                  }}
                  disabled={currentPage <= 1}
                  className="h-9"
                >
                  <Image
                    src="/assets/icons/arrow.svg"
                    width={18}
                    height={18}
                    alt="Previous page"
                    className="transform rotate-180"
                  />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const params = new URLSearchParams(
                      searchParamsObj.toString()
                    );
                    const nextPage = Math.min(currentPage + 1, totalPages);
                    params.set("page", nextPage.toString());

                    if (searchValue) params.set("search", searchValue);
                    if (categoryFilter && categoryFilter !== "all")
                      params.set("category", categoryFilter);

                    router.push(`${pathname}?${params.toString()}`);
                  }}
                  disabled={currentPage >= totalPages}
                  className="h-9"
                >
                  <Image
                    src="/assets/icons/arrow.svg"
                    width={18}
                    height={18}
                    alt="Next page"
                  />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col justify-center items-center h-48 text-center">
            <Users className="h-12 w-12 text-gray-500 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              No patients found
            </p>
            {(searchValue || (categoryFilter && categoryFilter !== "all")) && (
              <p className="text-sm text-gray-500 mt-1">
                Try adjusting your search criteria
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="mt-4"
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Render Dialogs */}
      <AddPatientDialog
        isOpen={addPatientOpen}
        setIsOpen={setAddPatientOpen}
        onSuccess={() =>
          refreshPatientsList("Patient added successfully", "success")
        }
      />

      <DeactivatePatientDialog
        isOpen={deactivateDialogOpen}
        setIsOpen={setDeactivateDialogOpen}
        patient={patientToDeactivate}
        onSuccess={() =>
          refreshPatientsList("Patient deactivated successfully", "success")
        }
      />

      <Toaster />
    </main>
  );
};

// DetailItem Component with edit mode support
const DetailItem = ({
  label,
  value,
  multiline = false,
  editMode = false,
  onChange,
  name,
}: {
  label: string;
  value: string | undefined | boolean | Date | null;
  multiline?: boolean;
  editMode?: boolean;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  name?: string;
}) => {
  let displayValue: string = "N/A";

  if (value !== undefined && value !== null && value !== "") {
    if (typeof value === "boolean") {
      displayValue = value ? "Yes" : "No";
    } else if (value instanceof Date) {
      displayValue = new Date(value).toLocaleDateString();
    } else if (
      typeof value === "string" &&
      ((value.includes("T") && value.includes("Z")) ||
        !isNaN(Date.parse(value)))
    ) {
      // Handle ISO date strings like "2002-10-30T16:00:00.000Z"
      displayValue = new Date(value).toLocaleDateString();
    } else {
      displayValue = String(value);
    }
  }

  if (editMode && name) {
    if (multiline) {
      return (
        <div className="space-y-1">
          <p className="text-gray-500 dark:text-gray-400 text-xs">{label}</p>
          <textarea
            name={name}
            value={typeof value === "string" ? value : displayValue}
            onChange={onChange}
            className="text-gray-900 dark:text-white text-sm bg-white dark:bg-dark-400 rounded-md p-2.5 min-h-[60px] w-full border border-gray-200 dark:border-dark-300 focus:border-primary focus:outline-none"
          />
        </div>
      );
    } else {
      return (
        <div className="space-y-1">
          <p className="text-gray-500 dark:text-gray-400 text-xs">{label}</p>
          <input
            type={typeof value === "boolean" ? "checkbox" : "text"}
            name={name}
            value={typeof value === "string" ? value : displayValue}
            checked={typeof value === "boolean" ? value : undefined}
            onChange={onChange}
            className="text-gray-900 dark:text-white text-sm bg-white dark:bg-dark-400 rounded-md p-2 w-full border border-gray-200 dark:border-dark-300 focus:border-primary focus:outline-none"
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-gray-500 dark:text-gray-400 text-xs">{label}</p>
      <div
        className={`text-gray-900 dark:text-white text-sm bg-gray-50 dark:bg-dark-400 rounded-md p-2.5 ${multiline ? "min-h-[60px] overflow-y-auto max-h-[120px]" : ""}`}
      >
        {displayValue}
      </div>
    </div>
  );
};

// Function to sanitize Appwrite URLs
const sanitizeAppwriteUrl = (url: string | undefined): string => {
  if (!url) return "";

  // Fix double v1 path issue
  if (url.includes("/v1/v1/")) {
    return url.replace("/v1/v1/", "/v1/");
  }

  return url;
};

// Patient Details Dialog Component
const PatientDetailsDialog = ({
  isOpen,
  setIsOpen,
  patient,
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  patient: Patient;
}) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [editMode, setEditMode] = useState(false);
  const [formState, setFormState] = useState({
    personal: {
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      birthDate: patient.birthDate,
      gender: patient.gender,
      address: patient.address,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactNumber: patient.emergencyContactNumber,
      identificationNumber: patient.identificationNumber,
      identificationType: patient.identificationType,
      category: patient.category,
    },
    medical: {
      signsSymptoms: patient.signsSymptoms,
      allergies: patient.allergies,
      currentMedication: patient.currentMedication,
      familyMedicalHistory: patient.familyMedicalHistory,
      pastMedicalHistory: patient.pastMedicalHistory,
    },
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [doctorNotes, setDoctorNotes] = useState<PatientNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Reset form state when patient changes
  useEffect(() => {
    setFormState({
      personal: {
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        birthDate: patient.birthDate,
        gender: patient.gender,
        address: patient.address,
        emergencyContactName: patient.emergencyContactName,
        emergencyContactNumber: patient.emergencyContactNumber,
        identificationNumber: patient.identificationNumber,
        identificationType: patient.identificationType,
        category: patient.category,
      },
      medical: {
        signsSymptoms: patient.signsSymptoms,
        allergies: patient.allergies,
        currentMedication: patient.currentMedication,
        familyMedicalHistory: patient.familyMedicalHistory,
        pastMedicalHistory: patient.pastMedicalHistory,
      },
    });
  }, [patient]);

  // Fetch patient notes when medical tab is active
  useEffect(() => {
    if (activeTab === "medical" && patient.$id) {
      fetchPatientNotes();
    }
  }, [activeTab, patient.$id]);

  // Function to fetch patient notes
  const fetchPatientNotes = async () => {
    setLoadingNotes(true);
    try {
      const notes = await getPatientNotes(patient.$id);
      setDoctorNotes(notes);
    } catch (error) {
      console.error("Error fetching patient notes:", error);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const section = activeTab === "personal" ? "personal" : "medical";

    setFormState((prev) => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [name]:
          type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      },
    }));
  };

  const saveChanges = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      if (activeTab === "personal") {
        const result = await updatePatientPersonalInfo({
          patientId: patient.$id,
          ...formState.personal,
        });

        if (result.status === "success") {
          setMessage({
            type: "success",
            text: "Personal information updated successfully",
          });
          setEditMode(false);
        } else {
          setMessage({
            type: "error",
            text: result.message || "Failed to update personal information",
          });
        }
      } else if (activeTab === "medical") {
        const result = await updatePatientMedical({
          patientId: patient.$id,
          ...formState.medical,
        });

        if (result.status === "success") {
          setMessage({
            type: "success",
            text: "Medical information updated successfully",
          });
          setEditMode(false);
        } else {
          setMessage({
            type: "error",
            text: result.message || "Failed to update medical information",
          });
        }
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while updating patient information",
      });
      console.error("Error updating patient:", error);
    } finally {
      setLoading(false);

      // Clear success message after 3 seconds
      if (message.type === "success") {
        setTimeout(() => {
          setMessage({ type: "", text: "" });
        }, 3000);
      }
    }
  };

  return (
    <DialogContent className="max-w-[800px] overflow-hidden flex flex-col bg-white dark:bg-dark-500 text-gray-900 dark:text-white border-gray-200 dark:border-dark-400">
      <DialogHeader>
        <div className="flex justify-between items-start">
          <div>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Patient Details
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Complete information about {patient.name}
            </DialogDescription>
          </div>
          <Button
            onClick={() => (editMode ? saveChanges() : setEditMode(true))}
            variant="ghost"
            className="h-9 text-sm"
            disabled={loading}
          >
            {editMode ? (
              <>
                <Save className="h-4 w-4 mr-2" /> Save
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </>
            )}
          </Button>
        </div>
      </DialogHeader>

      {message.text && (
        <div
          className={`px-3 py-2 rounded-md text-sm mb-2 ${message.type === "success" ? "bg-green-100 dark:bg-green-800/20 text-green-800 dark:text-green-400" : "bg-red-100 dark:bg-red-800/20 text-red-800 dark:text-red-400"}`}
        >
          {message.type === "success" ? (
            <Check className="h-4 w-4 inline-block mr-2" />
          ) : null}
          {message.text}
        </div>
      )}

      <div className="flex border-b border-gray-200 dark:border-dark-400 mb-4">
        <button
          className={`px-4 py-2 ${activeTab === "personal" ? "text-primary border-b-2 border-primary" : "text-gray-500 dark:text-gray-400"}`}
          onClick={() => {
            setActiveTab("personal");
            setEditMode(false);
          }}
        >
          Personal Information
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "medical" ? "text-primary border-b-2 border-primary" : "text-gray-500 dark:text-gray-400"}`}
          onClick={() => {
            setActiveTab("medical");
            setEditMode(false);
          }}
        >
          Medical History
        </button>
      </div>

      <div className="overflow-y-auto flex-grow pr-2 max-h-[60vh]">
        {activeTab === "personal" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 flex items-center gap-4 mb-2">
              <Avatar className="h-16 w-16">
                <AvatarImage
                  src={patient.avatarUrl || patient.profilePictureUrl || ""}
                />
                <AvatarFallback className="bg-primary text-white text-xl">
                  {patient.name
                    ? patient.name.substring(0, 2).toUpperCase()
                    : "PT"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {patient.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {patient.email}
                </p>
                {patient.userId && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {patient.userId}
                  </p>
                )}
              </div>
            </div>

            <DetailItem
              label="Name"
              value={editMode ? formState.personal.name : patient.name}
              editMode={editMode}
              onChange={handleInputChange}
              name="name"
            />
            <DetailItem
              label="Email"
              value={editMode ? formState.personal.email : patient.email}
              editMode={editMode}
              onChange={handleInputChange}
              name="email"
            />
            <DetailItem
              label="Phone"
              value={editMode ? formState.personal.phone : patient.phone}
              editMode={editMode}
              onChange={handleInputChange}
              name="phone"
            />
            <DetailItem
              label="Identification Number"
              value={
                editMode
                  ? formState.personal.identificationNumber
                  : patient.identificationNumber
              }
              editMode={editMode}
              onChange={handleInputChange}
              name="identificationNumber"
            />
            <DetailItem
              label="Identification Type"
              value={
                editMode
                  ? formState.personal.identificationType
                  : patient.identificationType
              }
              editMode={editMode}
              onChange={handleInputChange}
              name="identificationType"
            />
            <DetailItem
              label="Category"
              value={editMode ? formState.personal.category : patient.category}
              editMode={editMode}
              onChange={handleInputChange}
              name="category"
            />
            <DetailItem
              label="Birth Date"
              value={
                editMode ? formState.personal.birthDate : patient.birthDate
              }
              editMode={editMode}
              onChange={handleInputChange}
              name="birthDate"
            />
            <DetailItem
              label="Gender"
              value={editMode ? formState.personal.gender : patient.gender}
              editMode={editMode}
              onChange={handleInputChange}
              name="gender"
            />
            <DetailItem
              label="Address"
              value={editMode ? formState.personal.address : patient.address}
              multiline
              editMode={editMode}
              onChange={handleInputChange}
              name="address"
            />
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-dark-400 pb-2">
                Emergency Contact Information
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <DetailItem
                  label="Emergency Contact Name"
                  value={
                    editMode
                      ? formState.personal.emergencyContactName
                      : patient.emergencyContactName
                  }
                  editMode={editMode}
                  onChange={handleInputChange}
                  name="emergencyContactName"
                />
                <DetailItem
                  label="Emergency Contact Number"
                  value={
                    editMode
                      ? formState.personal.emergencyContactNumber
                      : patient.emergencyContactNumber
                  }
                  editMode={editMode}
                  onChange={handleInputChange}
                  name="emergencyContactNumber"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "medical" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <DetailItem
                label="Signs & Symptoms"
                value={
                  editMode
                    ? formState.medical.signsSymptoms
                    : patient.signsSymptoms
                }
                multiline
                editMode={editMode}
                onChange={handleInputChange}
                name="signsSymptoms"
              />
              <DetailItem
                label="Allergies"
                value={
                  editMode ? formState.medical.allergies : patient.allergies
                }
                multiline
                editMode={editMode}
                onChange={handleInputChange}
                name="allergies"
              />
              <DetailItem
                label="Current Medications"
                value={
                  editMode
                    ? formState.medical.currentMedication
                    : patient.currentMedication
                }
                multiline
                editMode={editMode}
                onChange={handleInputChange}
                name="currentMedication"
              />
              <DetailItem
                label="Family Medical History"
                value={
                  editMode
                    ? formState.medical.familyMedicalHistory
                    : patient.familyMedicalHistory
                }
                multiline
                editMode={editMode}
                onChange={handleInputChange}
                name="familyMedicalHistory"
              />
              <DetailItem
                label="Past Medical History"
                value={
                  editMode
                    ? formState.medical.pastMedicalHistory
                    : patient.pastMedicalHistory
                }
                multiline
                editMode={editMode}
                onChange={handleInputChange}
                name="pastMedicalHistory"
              />
            </div>

            {/* Doctor Notes Section */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-dark-400 pb-2 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Doctor Notes
              </h3>

              {loadingNotes ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-2">
                  Loading doctor notes...
                </p>
              ) : doctorNotes.length > 0 ? (
                <div className="space-y-4">
                  {doctorNotes.map((note) => (
                    <div
                      key={note.$id}
                      className="bg-gray-50 dark:bg-dark-400 rounded-md p-3 border border-gray-200 dark:border-dark-500"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-medium text-primary">
                            {note.doctorId}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(note.createdAt)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {note.note}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm py-2">
                  No doctor notes available for this patient.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="mt-4 flex gap-2">
        {editMode && (
          <Button
            onClick={() => setEditMode(false)}
            variant="outline"
            className="h-9 text-sm"
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={() => setIsOpen(false)}
          variant="outline"
          className="h-9 text-sm"
        >
          Close
        </Button>
        {editMode && (
          <Button
            onClick={saveChanges}
            variant="default"
            className="h-9 text-sm"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
};

// Add Patient Dialog Component
const AddPatientDialog = ({
  isOpen,
  setIsOpen,
  onSuccess,
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  onSuccess?: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      category: "Student",
      identificationNumber: "",
    },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError("");

    try {
      // In a real implementation, this would call a server action to create the patient
      console.log("Creating patient with data:", data);

      // Mock success response
      setTimeout(() => {
        setLoading(false);
        setIsOpen(false);
        form.reset();
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (error) {
      console.error("Error creating patient:", error);
      setError("Failed to create patient. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create patient. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-white dark:bg-dark-300 text-gray-900 dark:text-white border-gray-200 dark:border-dark-400 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white text-xl font-semibold">
            Add New Patient
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            Fill in the details to add a new patient to the system.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Full Name
            </label>
            <Input
              id="name"
              {...form.register("name", { required: "Name is required" })}
              className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
              placeholder="Enter patient's full name"
            />
            {form.formState.errors.name && (
              <p className="text-red-500 text-xs">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              {...form.register("email", { required: "Email is required" })}
              className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
              placeholder="Enter patient's email"
            />
            {form.formState.errors.email && (
              <p className="text-red-500 text-xs">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Phone Number
            </label>
            <Input
              id="phone"
              {...form.register("phone", {
                required: "Phone number is required",
              })}
              className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
              placeholder="Enter patient's phone number"
            />
            {form.formState.errors.phone && (
              <p className="text-red-500 text-xs">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="category"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Category
            </label>
            <Select
              {...form.register("category")}
              onValueChange={(value) => form.setValue("category", value)}
              defaultValue={form.getValues("category")}
            >
              <SelectTrigger className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-dark-300 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white">
                <SelectItem value="Student">Student</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="identificationNumber"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Identification Number
            </label>
            <Input
              id="identificationNumber"
              {...form.register("identificationNumber")}
              className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white"
              placeholder="Enter ID number (optional)"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-500"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {loading ? "Creating..." : "Create Patient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Deactivate Patient Dialog Component
const DeactivatePatientDialog = ({
  isOpen,
  setIsOpen,
  patient,
  onSuccess,
}: {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  patient: Patient | null;
  onSuccess?: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  const handleDeactivate = async () => {
    if (!patient) return;

    setLoading(true);
    try {
      // In a real implementation, this would call a server action to deactivate the patient
      console.log(`Deactivating patient ${patient.$id} with reason: ${reason}`);

      // Mock success response
      setTimeout(() => {
        setLoading(false);
        setIsOpen(false);
        setReason("");
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (error) {
      console.error("Error deactivating patient:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to deactivate patient. Please try again.",
      });
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="bg-white dark:bg-dark-300 text-gray-900 dark:text-white border-gray-200 dark:border-dark-400">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900 dark:text-white text-xl font-semibold">
            Deactivate Patient
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 dark:text-gray-400">
            Are you sure you want to deactivate {patient?.name}? This action
            will prevent them from scheduling new appointments.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4">
          <label
            htmlFor="deactivateReason"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Reason for Deactivation (Optional)
          </label>
          <Textarea
            id="deactivateReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for deactivating this patient"
            className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white resize-none min-h-[80px]"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-white dark:bg-dark-400 border-gray-200 dark:border-dark-500 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-500">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivate}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
          >
            {loading ? "Deactivating..." : "Deactivate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PatientsPage;

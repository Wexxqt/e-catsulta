"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, Search, Users, X, FileText, Edit, Save, Check, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";

import { DataTable } from "@/components/table/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { getAllPatients, updatePatientPersonalInfo, updatePatientMedical } from "@/lib/actions/patient.actions";
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
  DialogFooter
} from "@/components/ui/dialog";

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
  const [categoryFilter, setCategoryFilter] = useState(searchParams.category || "all");
  
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsObj = useSearchParams();

  useEffect(() => {
    async function fetchPatients() {
      setLoading(true);
      
      const data = await getAllPatients({
        searchQuery: searchParams.search || "",
        category: searchParams.category && searchParams.category !== "all" ? searchParams.category : "",
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
                src={patient.email ? getGravatarUrl(patient.email, 40) : undefined} 
                alt={patient.name} 
              />
              <AvatarFallback className="bg-gradient-to-br from-dark-300 to-dark-400 text-xs">
                {patient.name ? patient.name.substring(0, 2).toUpperCase() : 'PT'}
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
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-medium w-fit",
            category === "Student" ? "bg-blue-900/40 text-blue-400" : "bg-purple-900/40 text-purple-400"
          )}>
            {category}
          </div>
        );
      },
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const patient = row.original;
        
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-blue-900/30 hover:bg-blue-800/50 border-blue-800/50 text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors px-3"
              >
                <Eye className="h-4 w-4" />
                <span className="text-xs">View</span>
              </Button>
            </DialogTrigger>
            <PatientDetailsDialog isOpen={true} setIsOpen={() => {}} patient={patient} />
          </Dialog>
        );
      },
    },
  ];

  return (
    <main className="transition-all duration-300 py-6 w-full px-4 lg:px-3 xl:px-4 max-w-full">
      <section className="w-full mb-8">
        <h1 className="text-32-bold text-white">Patients</h1>
      </section>

      <div className="bg-dark-300 p-4 sm:p-6 rounded-lg border border-dark-400 shadow-md mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              placeholder="Search patients..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10 h-9 bg-dark-300 border-dark-500 w-full"
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
                router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
              }}
            >
              <SelectTrigger className="w-32 h-9 bg-dark-300 border-dark-500">
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
      
      <div className="bg-dark-300 p-4 sm:p-6 rounded-lg border border-dark-400 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="h-5 w-5" />
            <p className="text-sm">Total: {totalPatients} patient{totalPatients !== 1 ? 's' : ''}</p>
          </div>
          
          {(searchValue || (categoryFilter && categoryFilter !== "all")) && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-400">
                Filters:
                {searchValue && (
                  <span className="ml-2 px-2 py-1 bg-dark-400 rounded-md text-xs">
                    "{searchValue}"
                  </span>
                )}
                {categoryFilter && categoryFilter !== "all" && (
                  <span className="ml-2 px-2 py-1 bg-dark-400 rounded-md text-xs">
                    {categoryFilter}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <p className="text-gray-400">Loading patients...</p>
          </div>
        ) : patients.length > 0 ? (
          <>
            <DataTable 
              columns={patientColumns} 
              data={patients} 
            />
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const params = new URLSearchParams(searchParamsObj.toString());
                    const prevPage = Math.max(currentPage - 1, 1);
                    params.set("page", prevPage.toString());
                    
                    if (searchValue) params.set("search", searchValue);
                    if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
                    
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
                    const params = new URLSearchParams(searchParamsObj.toString());
                    const nextPage = Math.min(currentPage + 1, totalPages);
                    params.set("page", nextPage.toString());
                    
                    if (searchValue) params.set("search", searchValue);
                    if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
                    
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
            <Users className="h-12 w-12 text-gray-600 mb-3" />
            <p className="text-gray-400">No patients found</p>
            {(searchValue || (categoryFilter && categoryFilter !== "all")) && (
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search criteria</p>
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
  name
}: { 
  label: string; 
  value: string | undefined | boolean | Date | null; 
  multiline?: boolean;
  editMode?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  name?: string;
}) => {
  let displayValue: string = 'N/A';
  
  if (value !== undefined && value !== null && value !== '') {
    if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else if (value instanceof Date) {
      displayValue = new Date(value).toLocaleDateString();
    } else if (typeof value === 'string' && (value.includes('T') && value.includes('Z') || !isNaN(Date.parse(value)))) {
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
          <p className="text-gray-400 text-xs">{label}</p>
          <textarea
            name={name}
            value={typeof value === 'string' ? value : displayValue}
            onChange={onChange}
            className="text-white text-sm bg-dark-400 rounded-md p-2.5 min-h-[60px] w-full border border-dark-300 focus:border-primary focus:outline-none"
          />
        </div>
      );
    } else {
      return (
        <div className="space-y-1">
          <p className="text-gray-400 text-xs">{label}</p>
          <input
            type={typeof value === 'boolean' ? 'checkbox' : 'text'}
            name={name}
            value={typeof value === 'string' ? value : displayValue}
            checked={typeof value === 'boolean' ? value : undefined}
            onChange={onChange}
            className="text-white text-sm bg-dark-400 rounded-md p-2 w-full border border-dark-300 focus:border-primary focus:outline-none"
          />
        </div>
      );
    }
  }
                       
  return (
    <div className="space-y-1">
      <p className="text-gray-400 text-xs">{label}</p>
      <div className={`text-white text-sm bg-dark-400 rounded-md p-2.5 ${multiline ? 'min-h-[60px] overflow-y-auto max-h-[120px]' : ''}`}>
        {displayValue}
      </div>
    </div>
  );
};

// Function to sanitize Appwrite URLs
const sanitizeAppwriteUrl = (url: string | undefined): string => {
  if (!url) return '';
  
  // Fix double v1 path issue
  if (url.includes('/v1/v1/')) {
    return url.replace('/v1/v1/', '/v1/');
  }
  
  return url;
};

// Patient Details Dialog Component
const PatientDetailsDialog = ({ isOpen, setIsOpen, patient }: { isOpen: boolean; setIsOpen: (value: boolean) => void; patient: Patient }) => {
  const [activeTab, setActiveTab] = useState('personal');
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
      category: patient.category
    },
    medical: {
      signsSymptoms: patient.signsSymptoms,
      allergies: patient.allergies,
      currentMedication: patient.currentMedication,
      familyMedicalHistory: patient.familyMedicalHistory,
      pastMedicalHistory: patient.pastMedicalHistory
    }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
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
        category: patient.category
      },
      medical: {
        signsSymptoms: patient.signsSymptoms,
        allergies: patient.allergies,
        currentMedication: patient.currentMedication,
        familyMedicalHistory: patient.familyMedicalHistory,
        pastMedicalHistory: patient.pastMedicalHistory
      }
    });
  }, [patient]);
  
  // Fetch patient notes when medical tab is active
  useEffect(() => {
    if (activeTab === 'medical' && patient.$id) {
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
      console.error('Error fetching patient notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const section = activeTab === 'personal' ? 'personal' : 'medical';
    
    setFormState(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }
    }));
  };
  
  const saveChanges = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      if (activeTab === 'personal') {
        const result = await updatePatientPersonalInfo({
          patientId: patient.$id,
          ...formState.personal
        });
        
        if (result.status === 'success') {
          setMessage({ type: 'success', text: 'Personal information updated successfully' });
          setEditMode(false);
        } else {
          setMessage({ type: 'error', text: result.message || 'Failed to update personal information' });
        }
      } else if (activeTab === 'medical') {
        const result = await updatePatientMedical({
          patientId: patient.$id,
          ...formState.medical
        });
        
        if (result.status === 'success') {
          setMessage({ type: 'success', text: 'Medical information updated successfully' });
          setEditMode(false);
        } else {
          setMessage({ type: 'error', text: result.message || 'Failed to update medical information' });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating patient information' });
      console.error('Error updating patient:', error);
    } finally {
      setLoading(false);
      
      // Clear success message after 3 seconds
      if (message.type === 'success') {
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      }
    }
  };
  
  return (
    <DialogContent className="max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col bg-dark-500 text-white border-dark-400">
      <DialogHeader>
        <div className="flex justify-between items-start">
          <div>
            <DialogTitle className="text-xl font-semibold">Patient Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Complete information about {patient.name}
            </DialogDescription>
          </div>
          {activeTab !== 'documents' && (
            <Button 
              onClick={() => editMode ? saveChanges() : setEditMode(true)} 
              variant="ghost" 
              className="h-9 text-sm"
              disabled={loading}
            >
              {editMode ? (
                <><Save className="h-4 w-4 mr-2" /> Save</>
              ) : (
                <><Edit className="h-4 w-4 mr-2" /> Edit</>
              )}
            </Button>
          )}
        </div>
      </DialogHeader>
      
      {message.text && (
        <div className={`px-3 py-2 rounded-md text-sm mb-2 ${message.type === 'success' ? 'bg-green-800/20 text-green-400' : 'bg-red-800/20 text-red-400'}`}>
          {message.type === 'success' ? <Check className="h-4 w-4 inline-block mr-2" /> : null}
          {message.text}
        </div>
      )}
      
      <div className="flex border-b border-dark-400 mb-4">
        <button 
          className={`px-4 py-2 ${activeTab === 'personal' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
          onClick={() => {
            setActiveTab('personal');
            setEditMode(false);
          }}
        >
          Personal Information
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'medical' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
          onClick={() => {
            setActiveTab('medical');
            setEditMode(false);
          }}
        >
          Medical History
        </button>
        <button 
          className={`px-4 py-2 ${activeTab === 'documents' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'}`}
          onClick={() => {
            setActiveTab('documents');
            setEditMode(false);
          }}
        >
          Documents
        </button>
      </div>
      
      <div className="overflow-y-auto flex-grow pr-2">
        {activeTab === 'personal' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 flex items-center gap-4 mb-2">
              <Avatar className="h-16 w-16">
                <AvatarImage src={patient.avatarUrl || patient.profilePictureUrl || ''} />
                <AvatarFallback className="bg-primary text-white text-xl">
                  {patient.name ? patient.name.substring(0, 2).toUpperCase() : 'PT'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{patient.name}</h3>
                <p className="text-gray-400">{patient.email}</p>
                {patient.userId && <p className="text-xs text-gray-500">ID: {patient.userId}</p>}
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
              value={editMode ? formState.personal.identificationNumber : patient.identificationNumber} 
              editMode={editMode}
              onChange={handleInputChange}
              name="identificationNumber"
            />
            <DetailItem 
              label="Identification Type" 
              value={editMode ? formState.personal.identificationType : patient.identificationType} 
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
              value={editMode ? formState.personal.birthDate : patient.birthDate} 
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
              <h3 className="text-sm font-medium text-white mb-3 border-b border-dark-400 pb-2">Emergency Contact Information</h3>
              <div className="grid grid-cols-2 gap-6">
                <DetailItem 
                  label="Emergency Contact Name" 
                  value={editMode ? formState.personal.emergencyContactName : patient.emergencyContactName} 
                  editMode={editMode}
                  onChange={handleInputChange}
                  name="emergencyContactName"
                />
                <DetailItem 
                  label="Emergency Contact Number" 
                  value={editMode ? formState.personal.emergencyContactNumber : patient.emergencyContactNumber} 
                  editMode={editMode}
                  onChange={handleInputChange}
                  name="emergencyContactNumber"
                />
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'medical' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <DetailItem 
                label="Signs & Symptoms" 
                value={editMode ? formState.medical.signsSymptoms : patient.signsSymptoms} 
                multiline 
                editMode={editMode}
                onChange={handleInputChange}
                name="signsSymptoms"
              />
              <DetailItem 
                label="Allergies" 
                value={editMode ? formState.medical.allergies : patient.allergies} 
                multiline 
                editMode={editMode}
                onChange={handleInputChange}
                name="allergies"
              />
              <DetailItem 
                label="Current Medications" 
                value={editMode ? formState.medical.currentMedication : patient.currentMedication} 
                multiline 
                editMode={editMode}
                onChange={handleInputChange}
                name="currentMedication"
              />
              <DetailItem 
                label="Family Medical History" 
                value={editMode ? formState.medical.familyMedicalHistory : patient.familyMedicalHistory} 
                multiline 
                editMode={editMode}
                onChange={handleInputChange}
                name="familyMedicalHistory"
              />
              <DetailItem 
                label="Past Medical History" 
                value={editMode ? formState.medical.pastMedicalHistory : patient.pastMedicalHistory} 
                multiline 
                editMode={editMode}
                onChange={handleInputChange}
                name="pastMedicalHistory"
              />
            </div>
            
            {/* Doctor Notes Section */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-white mb-3 border-b border-dark-400 pb-2 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Doctor Notes
              </h3>
              
              {loadingNotes ? (
                <p className="text-gray-400 text-sm py-2">Loading doctor notes...</p>
              ) : doctorNotes.length > 0 ? (
                <div className="space-y-4">
                  {doctorNotes.map((note) => (
                    <div key={note.$id} className="bg-dark-400 rounded-md p-3 border border-dark-500">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-medium text-primary">{note.doctorId}</p>
                          <p className="text-xs text-gray-400">{formatDate(note.createdAt)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-white whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm py-2">No doctor notes available for this patient.</p>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-white mb-3 border-b border-dark-400 pb-2 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Identification Documents
              </h3>
              
              {(() => {
                // Handle multiple documents from JSON string array
                let docUrls: string[] = [];
                
                // First check for multiple documents
                if (patient.identificationDocumentUrls) {
                  try {
                    docUrls = JSON.parse(patient.identificationDocumentUrls);
                  } catch (e) {
                    console.error('Error parsing document URLs:', e);
                  }
                }
                
                // If no multiple documents found, use the single document URL
                if (docUrls.length === 0 && patient.identificationDocumentUrl) {
                  docUrls = [patient.identificationDocumentUrl];
                }
                
                if (docUrls.length > 0) {
                  return (
                    <div className="space-y-4">
                      {docUrls.map((url, index) => (
                        <div key={index} className="border border-dark-400 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-dark-400 p-2 rounded">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm text-white">ID Document {docUrls.length > 1 ? `#${index + 1}` : ''}</p>
                                <p className="text-xs text-gray-400">{patient.identificationType || "Identification Document"}</p>
                              </div>
                            </div>
                            <a 
                              href={sanitizeAppwriteUrl(url)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary text-xs hover:underline bg-dark-400 px-3 py-1.5 rounded-md flex items-center"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              View Document
                            </a>
                          </div>
                          
                          <div className="bg-dark-400 rounded-md overflow-hidden border border-dark-500">
                            {url.endsWith('.pdf') ? (
                              <div className="flex flex-col items-center justify-center p-6 gap-2">
                                <FileText className="h-10 w-10 text-gray-400" />
                                <p className="text-xs text-gray-400">PDF Document</p>
                              </div>
                            ) : (
                              <div className="relative w-full h-40 bg-dark-500 rounded-md overflow-hidden">
                                <Image 
                                  src={sanitizeAppwriteUrl(url)}
                                  alt={`Identification Document ${index + 1}`} 
                                  className="object-contain"
                                  fill
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  return <p className="text-gray-400 text-sm py-2">No identification documents uploaded.</p>;
                }
              })()}
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
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </DialogFooter>
    </DialogContent>
  );
};

export default PatientsPage; 
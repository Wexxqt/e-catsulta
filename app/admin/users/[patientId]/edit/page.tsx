"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getPatient } from "@/lib/actions/patient.actions";
import { Patient } from "@/types/appwrite.types";

const EditPatientPage = ({ params }: { params: { patientId: string } }) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchPatient() {
      if (!params.patientId) return;
      
      setLoading(true);
      const data = await getPatient(params.patientId);
      
      if (!data) {
        // Patient not found, redirect to patients list
        router.push("/admin/users");
        return;
      }
      
      setPatient(data as Patient);
      setLoading(false);
    }
    
    fetchPatient();
  }, [params.patientId, router]);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <p className="text-gray-400">Loading patient data...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <p className="text-gray-400">Patient not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link 
          href="/admin/users"
          className="flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Patients
        </Link>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-32-bold text-white">Edit Patient: {patient.name}</h1>
      </div>
      
      <div className="bg-dark-300 rounded-lg border border-dark-400 p-6">
        <p className="text-white">
          This is a placeholder for the patient edit form. In a real implementation, 
          this would contain a form for editing the patient's details.
        </p>
      </div>
    </div>
  );
};

export default EditPatientPage; 
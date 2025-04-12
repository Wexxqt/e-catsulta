"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updatePatientMedical } from "@/lib/actions/patient.actions";
import { Patient } from "@/types/appwrite.types";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { useToast } from "../ui/use-toast";
// Define the form schema
const formSchema = z.object({
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
  medication: z.string().optional(),
  pastMedicalHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  symptoms: z.string().optional(),
  lifestyleHabits: z.string().optional(),
  smoker: z.boolean().optional(),
  alcoholConsumption: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
});

type MedicalInfoFormProps = {
  patient: Patient;
  onSuccess?: () => void;
};

export default function PatientMedicalInfoForm({ patient, onSuccess }: MedicalInfoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Initialize the form with patient data
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bloodType: patient.bloodType || "",
      allergies: patient.allergies || "",
      medication: patient.medication || "",
      pastMedicalHistory: patient.pastMedicalHistory || "",
      familyHistory: patient.familyHistory || "",
      symptoms: patient.symptoms || "",
      lifestyleHabits: patient.lifestyleHabits || "",
      smoker: patient.smoker || false,
      alcoholConsumption: patient.alcoholConsumption || "",
      height: patient.height || "",
      weight: patient.weight || "",
    },
  });

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const result = await updatePatientMedical({
        patientId: patient.$id,
        ...values,
      });

      if (result.status === "success") {
        toast({
          title: "Success",
          description: "Medical information updated successfully",
          variant: "default",
        });
        if (onSuccess) onSuccess();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update information",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bloodType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Blood Type</FormLabel>
                <FormControl>
                  <Input placeholder="Enter blood type" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (cm)</FormLabel>
                  <FormControl>
                    <Input placeholder="Height" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg)</FormLabel>
                  <FormControl>
                    <Input placeholder="Weight" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="allergies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allergies</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Please list any allergies you have"
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="medication"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Medications</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Please list any medications you are currently taking"
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pastMedicalHistory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Past Medical History</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Please provide details about your medical history"
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="familyHistory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Family Medical History</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Please provide details about your family's medical history"
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="symptoms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Symptoms</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Please describe any current symptoms you are experiencing"
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="smoker"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Smoker</FormLabel>
                  <FormDescription>
                    Do you currently smoke?
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="alcoholConsumption"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alcohol Consumption</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Describe your alcohol consumption"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="lifestyleHabits"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lifestyle & Habits</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Please describe your lifestyle habits (exercise, diet, etc.)"
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Updating..." : "Update Medical Information"}
        </Button>
      </form>
    </Form>
  );
} 

import { NextRequest, NextResponse } from "next/server";
import { parse } from "papaparse";
import { setPatientPasskey } from "@/lib/actions/patient.actions";

export async function POST(request: NextRequest) {
  try {
    // Handle form data with file upload
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }
    
    // Check file type
    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (fileType !== 'csv') {
      return NextResponse.json(
        { success: false, message: "Only CSV files are supported" },
        { status: 400 }
      );
    }
    
    // Convert file to text
    const fileText = await file.text();
    
    // Parse CSV with PapaParse
    const { data, errors } = parse(fileText, {
      header: true,
      skipEmptyLines: true
    });
    
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Error parsing CSV file", 
          errors 
        },
        { status: 400 }
      );
    }
    
    // Validate CSV structure
    const records = data as any[];
    if (records.length === 0) {
      return NextResponse.json(
        { success: false, message: "CSV file is empty" },
        { status: 400 }
      );
    }
    
    // Check if required columns exist
    const firstRecord = records[0];
    if (!firstRecord.idNumber || !firstRecord.passkey) {
      return NextResponse.json(
        { 
          success: false, 
          message: "CSV must contain 'idNumber' and 'passkey' columns" 
        },
        { status: 400 }
      );
    }
    
    // Process records in batches to avoid timeouts
    const batchSize = 100;
    const results = {
      total: records.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as { idNumber: string; error: string }[]
    };
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      // Process each record in the batch
      for (const record of batch) {
        results.processed++;
        
        try {
          // Validate passkey format - ensure it's 6 digits
          if (!/^\d{6}$/.test(record.passkey)) {
            throw new Error("Passkey must be 6 digits");
          }
          
          // Set passkey using the existing function
          await setPatientPasskey(record.idNumber, record.passkey);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            idNumber: record.idNumber,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${results.successful} of ${results.total} passkeys successfully`,
      results
    });
    
  } catch (error) {
    console.error("Error importing passkeys:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to import passkeys", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 
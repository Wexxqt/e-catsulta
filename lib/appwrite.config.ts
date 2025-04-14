import * as sdk from "node-appwrite";

// Validate required environment variables
const validateEnvVariables = () => {
  const requiredVars = [
    'NEXT_PUBLIC_ENDPOINT',
    'PROJECT_ID',
    'API_KEY',
    'PATIENT_COLLECTION_ID',
    'APPOINTMENT_COLLECTION_ID',
    'NEXT_PUBLIC_BUCKET_ID',
    'DATABASE_ID'
  ];
  
  const missingVars = requiredVars.filter(
    varName => !process.env[varName]
  );
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    // In development, we'll log the error but not throw
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Configuration error: Missing environment variables`);
    }
  }
};

// Call validation function
validateEnvVariables();

export const {
  NEXT_PUBLIC_ENDPOINT: ENDPOINT,
  PROJECT_ID,
  API_KEY, 
  PATIENT_COLLECTION_ID,
  DOCTOR_COLLECTION_ID,
  APPOINTMENT_COLLECTION_ID,
  NEXT_PUBLIC_BUCKET_ID: BUCKET_ID,
  DATABASE_ID,
} = process.env;

const client = new sdk.Client();

client.setEndpoint(ENDPOINT!).setProject(PROJECT_ID!).setKey(API_KEY!);

export const databases = new sdk.Databases(client);
export const users = new sdk.Users(client);
export const messaging = new sdk.Messaging(client);
export const storage = new sdk.Storage(client);

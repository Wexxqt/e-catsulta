import { Client, Storage } from 'node-appwrite';

// Initialize the Appwrite client
const client = new Client();

// Set up the client with environment variables
client
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

// Initialize and export the storage service
export const serverStorage = new Storage(client); 
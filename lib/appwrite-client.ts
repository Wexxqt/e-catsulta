import { Client, Databases, Account } from 'appwrite';

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.NEXT_PUBLIC_PROJECT_ID || '');

// Initialize Appwrite services
export const databases = new Databases(client);
export const account = new Account(client);

// For Realtime, we just use the client's subscribe method directly
export const subscribe = (channels: string[], callback: (response: any) => void) => {
    return client.subscribe(channels, callback);
};

// Export Appwrite constants
export const DATABASE_ID = process.env.DATABASE_ID || '';
export const APPOINTMENT_COLLECTION_ID = process.env.APPOINTMENT_COLLECTION_ID || '';

// The client object is also exported for custom operations
export default client; 
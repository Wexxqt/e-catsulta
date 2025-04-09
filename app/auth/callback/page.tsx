'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Account, Client } from 'appwrite';
import { getPatient } from '@/lib/actions/patient.actions';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_ENDPOINT || "https://cloud.appwrite.io/v1")
  .setProject(process.env.PROJECT_ID || "676eecb00010826361f7");

const account = new Account(client);

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // Get the current user session
        const session = await account.get();
        console.log('Current session:', session);
        
        if (!session) {
          console.log('No session found, redirecting to login-failed');
          router.push('/login-failed');
          return;
        }

        // Check if user exists in our database
        const patient = await getPatient(session.$id);
        console.log('Fetched patient data:', patient);
        
        // Redirect based on whether the user exists
        if (patient) {
          console.log('Patient exists, redirecting to new-appointment');
          router.push(`/patients/${session.$id}/new-appointment`);
        } else {
          console.log('New patient, redirecting to register');
          router.push(`/patients/${session.$id}/register`);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/login-failed');
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Processing your login...</h2>
        <p className="text-gray-600">Please wait while we redirect you.</p>
      </div>
    </div>
  );
} 
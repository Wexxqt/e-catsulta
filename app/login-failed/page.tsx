"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function LoginFailed() {
  const router = useRouter();

  return (
    <div className="flex h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6">
          <Image
            src="/assets/icons/logo-full.svg"
            height={48}
            width={240}
            alt="E-CatSulta Logo"
            className="h-12 w-auto mx-auto"
          />
        </div>

        <div className="bg-dark-300 p-6 rounded-lg border border-dark-500">
          <h2 className="text-xl font-bold mb-4 text-light-200">Login Failed</h2>
          
          <p className="mb-6 text-gray-300">
            Please go back to the main page to login to your account.
          </p>
          
          <Button 
            onClick={() => router.push("/")}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-6"
          >
            Return to Login Page
          </Button>
        </div>
        
        <p className="mt-6 text-sm text-dark-600">
          © 2025 E-CatSulta
        </p>
      </div>
    </div>
  );
} 
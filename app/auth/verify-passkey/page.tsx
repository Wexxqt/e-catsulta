"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Key,
  LockKeyhole,
  Fingerprint,
  AlertCircle,
  ArrowRight,
  Check,
  Shield,
  ShieldCheck,
  X,
  Home,
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { getPatient } from "@/lib/actions/patient.actions";
import { validatePatientPasskey } from "@/lib/utils/validatePatientPasskey";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { getGravatarUrl } from "@/lib/utils";

export default function VerifyPasskey() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [passkey, setPasskey] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [success, setSuccess] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after component mounts
    setAnimateIn(true);
  }, []);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!userId) {
        router.push("/");
        return;
      }

      try {
        const patientData = await getPatient(userId);
        if (!patientData) {
          router.push("/");
          return;
        }
        setPatient(patientData);
      } catch (error) {
        console.error("Error fetching patient:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [userId, router]);

  const handleVerify = async () => {
    if (passkey.length !== 6) {
      setError("Please enter your 6-digit passkey");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      // Use the patient's ID number for verification
      const idNumber = patient.identificationNumber || "";
      if (!idNumber) {
        setError("Unable to verify passkey. ID number not found.");
        setVerifying(false);
        return;
      }

      const isValid = await validatePatientPasskey(idNumber, passkey);

      if (isValid) {
        // Show success animation before redirecting
        setSuccess(true);

        // Delay redirect to show the success state
        setTimeout(() => {
          router.push(`/patients/${userId}/dashboard`);
        }, 1000);
      } else {
        // Increment failed attempts
        setAttempts((prev) => prev + 1);
        setError("Invalid passkey. Please try again.");
        setPasskey("");
      }
    } catch (error) {
      console.error("Passkey verification error:", error);
      setError("An error occurred during verification. Please try again.");
    } finally {
      if (!success) {
        setVerifying(false);
      }
    }
  };

  // If too many failed attempts, provide a way to reset or go back
  const handleCancel = () => {
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <div className="text-center animate-fadeIn">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-1">
            Loading verification
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Please wait a moment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div
        className={`w-full max-w-md transition-all duration-300 ${animateIn ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"}`}
      >
        <Card className="border-0 shadow-xl bg-white dark:bg-gray-800 overflow-hidden">
          <CardHeader className="text-center relative pb-2">
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="h-8 w-8 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center">
              {success ? (
                <div className="animate-scaleIn">
                  <ShieldCheck className="h-8 w-8 text-green-500" />
                </div>
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
            </div>

            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              {success ? "Verification Complete" : "Two-Factor Authentication"}
            </CardTitle>

            <CardDescription className="text-gray-500 dark:text-gray-400 mt-1 px-6">
              {success
                ? "Redirecting you to your dashboard"
                : "Please enter your 6-digit passkey to complete login"}
            </CardDescription>
          </CardHeader>

          <div className="px-6 py-4">
            <div className="flex items-center justify-center">
              <div className="w-16 h-16 relative mr-3 flex-shrink-0">
                <div className="rounded-full overflow-hidden border-2 border-primary/20 shadow-md">
                  <Image
                    src={
                      patient?.email
                        ? getGravatarUrl(patient.email, 100)
                        : "/assets/icons/avatar-placeholder.png"
                    }
                    alt={patient?.name || "User"}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="text-left">
                <h3 className="font-medium text-lg text-gray-900 dark:text-white">
                  {patient?.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {patient?.email}
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-200 dark:bg-gray-700" />

          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 animate-fadeIn">
                <Alert
                  variant="destructive"
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                >
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertTitle className="text-red-600 dark:text-red-400 font-medium">
                    Error
                  </AlertTitle>
                  <AlertDescription className="text-red-600 dark:text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {success ? (
              <div className="py-4 flex flex-col items-center animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-green-600 dark:text-green-400 font-medium text-center">
                  Authentication successful!
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
                  Redirecting you to your dashboard...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    Enter Your Passkey
                  </label>
                  <InputOTP
                    maxLength={6}
                    value={passkey}
                    onChange={setPasskey}
                    autoFocus
                    className="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot
                        index={0}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-md"
                      />
                      <InputOTPSlot
                        index={1}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-md"
                      />
                      <InputOTPSlot
                        index={2}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-md"
                      />
                      <InputOTPSlot
                        index={3}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-md"
                      />
                      <InputOTPSlot
                        index={4}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-md"
                      />
                      <InputOTPSlot
                        index={5}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-md"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-2">
                    <LockKeyhole className="h-3 w-3" />
                    This 6-digit security code is required to access your
                    account
                  </p>
                </div>

                {attempts >= 3 && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-200 dark:border-amber-800 animate-fadeIn">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          Having trouble?
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Forgot your passkey? Please contact e-CatSUlta support
                          for assistance.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-2 pb-6">
            {!success && (
              <>
                <Button
                  onClick={handleVerify}
                  disabled={passkey.length !== 6 || verifying}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-6 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                >
                  {verifying ? (
                    <div className="flex items-center justify-center gap-2 animate-fadeIn">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Verify Passkey</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Home className="h-4 w-4 mr-2" />
                  <span>Return to Home</span>
                </Button>
              </>
            )}
          </CardFooter>
        </Card>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Secured by e-catsulta Two-Factor Authentication
          </p>
        </div>
      </div>
    </div>
  );
}

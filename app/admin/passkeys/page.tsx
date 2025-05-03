"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Passkey } from "@/types/appwrite.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import {
  Settings,
  Users,
  Key,
  Upload,
  Save,
  Trash2,
  Edit,
  RefreshCw,
  Lock,
  ShieldCheck,
  FileSpreadsheet,
  Info,
  AlertTriangle,
  BarChart,
  Download,
  Database,
  Wand2,
} from "lucide-react";

export default function PasskeyAdmin() {
  const [idNumber, setIdNumber] = useState("");
  const [passkey, setPasskey] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedPasskeyId, setSelectedPasskeyId] = useState("");
  const [showDeleteResult, setShowDeleteResult] = useState(false);
  const [deleteResultMessage, setDeleteResultMessage] = useState("");

  // New state for bulk import
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load passkeys on page load
  useEffect(() => {
    fetchPasskeys();
  }, []);

  const fetchPasskeys = async () => {
    setLoadingPasskeys(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/passkey");

      if (!response.ok) {
        throw new Error("Failed to fetch passkeys");
      }

      const data = await response.json();

      if (data.success) {
        setPasskeys(data.passkeys || []);
      } else {
        setErrorMessage(data.message || "Failed to load passkeys");
      }
    } catch (error) {
      console.error("Error fetching passkeys:", error);
      setErrorMessage("Failed to load passkeys. Please try again.");
    } finally {
      setLoadingPasskeys(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      // Validate inputs
      if (!idNumber || !passkey) {
        setMessage("Please enter both ID number and passkey");
        setIsLoading(false);
        return;
      }

      if (!/^\d{6}$/.test(passkey)) {
        setMessage("Passkey must be exactly 6 digits");
        setIsLoading(false);
        return;
      }

      // Submit to API
      const response = await fetch("/api/passkey", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idNumber, passkey }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ Success: Passkey set for ID ${idNumber}`);
        // Clear form
        setIdNumber("");
        setPasskey("");
        // Refresh the passkey list
        fetchPasskeys();
      } else {
        setMessage(`❌ Error: ${result.message || "Failed to set passkey"}`);
      }
    } catch (error) {
      console.error("Error setting passkey:", error);
      setMessage("❌ Error: Failed to set passkey");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitDefault = async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/init-passkeys");
      const result = await response.json();

      if (result.success) {
        setMessage("✅ Default test passkeys initialized successfully");
        // Refresh the passkey list
        fetchPasskeys();
      } else {
        setMessage(
          `❌ Error: ${result.message || "Failed to initialize default passkeys"}`
        );
      }
    } catch (error) {
      console.error("Error initializing passkeys:", error);
      setMessage("❌ Error: Failed to initialize default passkeys");
    } finally {
      setIsLoading(false);
    }
  };

  const prepareDelete = (passkeyId: string) => {
    setSelectedPasskeyId(passkeyId);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!selectedPasskeyId) return;

    setIsLoading(true);
    setShowDeleteConfirm(false);

    try {
      const response = await fetch(`/api/passkey/${selectedPasskeyId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setDeleteResultMessage("Passkey deleted successfully");
        // Refresh the passkey list
        fetchPasskeys();
      } else {
        setDeleteResultMessage(
          `Failed to delete passkey: ${result.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error deleting passkey:", error);
      setDeleteResultMessage("Failed to delete passkey. Please try again.");
    } finally {
      setIsLoading(false);
      setShowDeleteResult(true);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    }
  };

  // Trigger file input click
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle bulk import submission
  const handleBulkImport = async () => {
    if (!importFile) {
      setMessage("Please select a CSV file to import");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setMessage("");
    setImportResults(null);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append("file", importFile);

      // Start progress animation
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress > 90) {
          progress = 90; // Cap at 90% until complete
        }
        setImportProgress(progress);
      }, 1000);

      // Send file to API
      const response = await fetch("/api/import-passkeys", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to import passkeys");
      }

      const results = await response.json();
      setImportProgress(100);
      setImportResults(results);

      if (results.success) {
        setMessage(`✅ Success: ${results.message}`);
        // Show detailed results dialog
        setShowImportDialog(true);
        // Refresh the passkey list
        fetchPasskeys();
        // Reset file input
        setImportFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setMessage(`❌ Error: ${results.message}`);
      }
    } catch (error) {
      console.error("Error importing passkeys:", error);
      setMessage(
        `❌ Error: ${error instanceof Error ? error.message : "Failed to import passkeys"}`
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Passkey Management
        </h1>
        <p className="text-gray-500 dark:text-muted-foreground">
          Manage secure passkeys for patient authentication
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Add New Passkey */}
        <div className="bg-white dark:bg-dark-300 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Add New Passkey
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                htmlFor="idNumber"
              >
                ID Number
              </label>
              <div className="mt-1 relative rounded-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
                <Input
                  id="idNumber"
                  type="text"
                  placeholder="e.g., 2023-0456 or EMP-0123"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  maxLength={10}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                htmlFor="passkey"
              >
                Passkey (6 digits)
              </label>
              <div className="mt-2">
                <InputOTP
                  maxLength={6}
                  value={passkey}
                  onChange={(value) => setPasskey(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Must be exactly 6 digits. Will be securely hashed.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" />
                  <span>Add/Update Passkey</span>
                </div>
              )}
            </Button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded text-sm ${message.startsWith("✅") ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"}`}
            >
              {message}
            </div>
          )}
        </div>

        {/* Bulk Import */}
        <div className="bg-white dark:bg-dark-300 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Import
          </h2>

          <div className="space-y-4">
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Import Passkeys from CSV
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Upload a CSV file with ID numbers and passkeys for bulk import.
              Required headers:{" "}
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                idNumber
              </code>
              ,{" "}
              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                passkey
              </code>
            </p>

            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary dark:hover:border-primary transition-colors"
              onClick={handleBrowseClick}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".csv"
                disabled={isImporting}
              />
              <FileSpreadsheet className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-2" />
              <div className="text-center">
                {importFile ? (
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {importFile.name}
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Click to select CSV file
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      or drag and drop
                    </p>
                  </>
                )}
              </div>
            </div>

            {importFile && (
              <div className="space-y-4">
                {isImporting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Importing passkeys...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    onClick={() => {
                      setImportFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
                    onClick={handleBulkImport}
                    disabled={isImporting}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Import Passkeys</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {!importFile && (
              <Button
                className="w-full bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
                onClick={handleBrowseClick}
                disabled={isImporting}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Browse for CSV File</span>
              </Button>
            )}

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                <Info className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                CSV Format Example
              </h4>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2 max-h-40 overflow-y-auto">
                <pre className="text-xs text-gray-700 dark:text-gray-300">
                  idNumber,passkey
                  <br />
                  2023-0001,123456
                  <br />
                  EMP-1234,789012
                  <br />
                  2022-9876,456789
                  <br />
                  ...
                </pre>
              </div>
              <div className="mt-2">
                <a
                  href="/assets/sample-passkeys.csv"
                  download="sample-passkeys.csv"
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download sample CSV
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Security Information Card */}
        <div className="bg-white dark:bg-dark-300 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Security Information
          </h2>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Passkeys are securely managed and stored in the database with
              multiple security measures in place:
            </p>

            <ul className="space-y-3 pl-5">
              <li className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  All passkeys are{" "}
                  <span className="font-medium">securely hashed</span> using
                  bcrypt with unique salt values
                </span>
              </li>
              <li className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  Original passkey values are{" "}
                  <span className="font-medium">never stored</span> in plaintext
                </span>
              </li>
              <li className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  Bcrypt's slow algorithm naturally{" "}
                  <span className="font-medium">
                    prevents brute force attacks
                  </span>
                </span>
              </li>
              <li className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  Each passkey uses a{" "}
                  <span className="font-medium">unique salt</span>, ensuring
                  identical passkeys have different hashes
                </span>
              </li>
            </ul>

            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  These security measures ensure the confidentiality and
                  integrity of patient passkeys.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Passkey Database - Full Width */}
      <div className="bg-white dark:bg-dark-300 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Passkey Database
        </h2>

        {errorMessage && (
          <div className="mb-4 p-3 rounded bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {errorMessage}
          </div>
        )}

        {loadingPasskeys ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Loading passkeys...
            </p>
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400 flex flex-col items-center gap-2">
            <Database className="h-12 w-12 text-gray-400 dark:text-gray-600" />
            <p>No passkeys found. Add some passkeys using the form above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>
                <div className="flex items-center gap-2 justify-center">
                  <Info className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-500 dark:text-gray-400">
                    Showing all passkeys. The actual passkey values are securely
                    hashed.
                  </span>
                </div>
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passkeys.map((passkeyItem) => (
                  <TableRow key={passkeyItem.$id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      {passkeyItem.idNumber}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {new Date(passkeyItem.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {new Date(passkeyItem.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIdNumber(passkeyItem.idNumber);
                          setPasskey("");
                        }}
                        title="Edit"
                        className="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => prepareDelete(passkeyItem.$id)}
                        title="Delete"
                        className="text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-white dark:bg-dark-300 border-gray-200 dark:border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete this passkey?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              This will permanently delete this passkey. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Result Dialog */}
      <Dialog open={showDeleteResult} onOpenChange={setShowDeleteResult}>
        <DialogContent className="bg-white dark:bg-dark-300 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Delete Result
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {deleteResultMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteResult(false)}
              className="bg-primary hover:bg-primary/90"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Results Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-white dark:bg-dark-300 border-gray-200 dark:border-gray-800 max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" />
              Import Results
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Summary of the passkey import operation
            </DialogDescription>
          </DialogHeader>

          {importResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Total
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {importResults.results.total}
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Processed
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {importResults.results.processed}
                  </div>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-md">
                  <div className="text-sm font-medium text-green-700 dark:text-green-300">
                    Successful
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResults.results.successful}
                  </div>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-md">
                  <div className="text-sm font-medium text-red-700 dark:text-red-300">
                    Failed
                  </div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {importResults.results.failed}
                  </div>
                </div>
              </div>

              {importResults.results.failed > 0 && (
                <div>
                  <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Error Details
                  </h3>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-200 dark:bg-gray-700 text-sm">
                          <th className="py-2 px-3 text-left text-gray-700 dark:text-gray-300">
                            ID Number
                          </th>
                          <th className="py-2 px-3 text-left text-gray-700 dark:text-gray-300">
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.results.errors.map(
                          (error: any, index: number) => (
                            <tr
                              key={index}
                              className="border-t border-gray-300 dark:border-gray-700 text-xs"
                            >
                              <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                                {error.idNumber}
                              </td>
                              <td className="py-2 px-3 text-red-600 dark:text-red-400">
                                {error.error}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setShowImportDialog(false)}
              className="bg-primary hover:bg-primary/90"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

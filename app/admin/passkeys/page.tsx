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
    <div className="admin-main">
      <div className="flex-between w-full mb-6">
        <h1 className="header flex items-center gap-2">
          <Image
            src="/assets/icons/lock.svg"
            height={28}
            width={28}
            alt="passkey"
          />
          Passkey Management
        </h1>
        <Button
          onClick={fetchPasskeys}
          variant="outline"
          disabled={loadingPasskeys}
          className="flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={loadingPasskeys ? "animate-spin" : ""}
          >
            <path d="M21 2v6h-6"></path>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 12a9 9 0 0 0 15 6.7L21 16"></path>
            <path d="M21 22v-6h-6"></path>
          </svg>
          {loadingPasskeys ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="dashboard-layout w-full mb-8">
        <div className="dashboard-card">
          <h2 className="sub-header mb-4 flex items-center gap-2">
            <Image
              src="/assets/icons/plus.svg"
              height={20}
              width={20}
              alt="add"
            />
            Add New Passkey
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="shad-input-label" htmlFor="idNumber">
                ID Number
              </label>
              <div className="flex rounded-md border border-dark-500 bg-dark-400">
                <Image
                  src="/assets/icons/user.svg"
                  height={24}
                  width={24}
                  alt="id"
                  className="ml-2"
                />
                <Input
                  id="idNumber"
                  type="text"
                  placeholder="e.g., 2023-0456 or EMP-0123"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  maxLength={10}
                  required
                  className="shad-input border-0"
                />
              </div>
            </div>

            <div>
              <label className="shad-input-label" htmlFor="passkey">
                Passkey (6 digits)
              </label>
              <div className="mt-2">
                <InputOTP
                  maxLength={6}
                  value={passkey}
                  onChange={(value) => setPasskey(value)}
                >
                  <InputOTPGroup className="shad-otp">
                    <InputOTPSlot className="shad-otp-slot" index={0} />
                    <InputOTPSlot className="shad-otp-slot" index={1} />
                    <InputOTPSlot className="shad-otp-slot" index={2} />
                    <InputOTPSlot className="shad-otp-slot" index={3} />
                    <InputOTPSlot className="shad-otp-slot" index={4} />
                    <InputOTPSlot className="shad-otp-slot" index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <p className="text-12-regular text-dark-600 mt-1 flex items-center gap-1">
                  <Image
                    src="/assets/icons/info.svg"
                    height={14}
                    width={14}
                    alt="info"
                  />
                  Must be exactly 6 digits. Will be securely hashed before
                  storage.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="shad-primary-btn w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Image
                    src="/assets/icons/loader.svg"
                    alt="loader"
                    width={20}
                    height={20}
                    className="animate-spin"
                  />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Image
                    src="/assets/icons/save.svg"
                    alt="save"
                    width={18}
                    height={18}
                  />
                  <span>Add/Update Passkey</span>
                </div>
              )}
            </Button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded text-sm ${message.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
            >
              {message}
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <h2 className="sub-header mb-4 flex items-center gap-2">
            <Image
              src="/assets/icons/upload.svg"
              height={20}
              width={20}
              alt="upload"
            />
            Bulk Import
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-16-semibold mb-2 flex items-center gap-2">
                <Image
                  src="/assets/icons/database.svg"
                  height={16}
                  width={16}
                  alt="import"
                />
                Import Passkeys from CSV File
              </h3>
              <p className="text-14-regular text-dark-700 mb-3">
                Upload a CSV file with ID numbers and passkeys for bulk import.
                The file must have these column headers: <code>idNumber</code>,{" "}
                <code>passkey</code>
              </p>

              <div className="file-upload mb-4" onClick={handleBrowseClick}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".csv"
                  disabled={isImporting}
                />
                <Image
                  src="/assets/icons/csv.svg"
                  height={32}
                  width={32}
                  alt="csv"
                />
                <div className="file-upload_label">
                  {importFile ? (
                    <p>{importFile.name}</p>
                  ) : (
                    <>
                      <p className="text-14-medium">Click to select CSV file</p>
                      <p className="text-12-regular">or drag and drop</p>
                    </>
                  )}
                </div>
              </div>

              {importFile && (
                <div className="space-y-4">
                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-12-regular">
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
                      className="flex-1"
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
                      className="shad-primary-btn flex-1 flex items-center justify-center gap-2"
                      onClick={handleBulkImport}
                      disabled={isImporting}
                    >
                      {isImporting ? (
                        <>
                          <Image
                            src="/assets/icons/loader.svg"
                            alt="loader"
                            width={20}
                            height={20}
                            className="animate-spin"
                          />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <Image
                            src="/assets/icons/upload.svg"
                            alt="import"
                            width={18}
                            height={18}
                          />
                          <span>Import Passkeys</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {!importFile && (
                <Button
                  className="shad-primary-btn w-full flex items-center justify-center gap-2"
                  onClick={handleBrowseClick}
                  disabled={isImporting}
                >
                  <Image
                    src="/assets/icons/file.svg"
                    alt="browse"
                    width={18}
                    height={18}
                  />
                  <span>Browse for CSV File</span>
                </Button>
              )}

              <div className="mt-4">
                <h4 className="text-14-medium flex items-center gap-2 mb-2">
                  <Image
                    src="/assets/icons/info.svg"
                    height={14}
                    width={14}
                    alt="info"
                  />
                  CSV Format Example
                </h4>
                <div className="bg-dark-300 rounded-md max-h-60 overflow-y-auto">
                  <pre className="text-12-regular text-dark-700">
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
                <div className="mt-3">
                  <a
                    href="/assets/sample-passkeys.csv"
                    download="sample-passkeys.csv"
                    className="flex items-center gap-2 text-14-medium text-green-500 hover:text-green-400 transition-colors"
                  >
                    <Image
                      src="/assets/icons/download.svg"
                      height={16}
                      width={16}
                      alt="download"
                    />
                    Download sample CSV template
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h2 className="sub-header mb-4 flex items-center gap-2">
            <Image
              src="/assets/icons/settings.svg"
              height={20}
              width={20}
              alt="actions"
            />
            Quick Actions
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-16-semibold mb-2 flex items-center gap-2">
                <Image
                  src="/assets/icons/database.svg"
                  height={16}
                  width={16}
                  alt="initialize"
                />
                Initialize Test Passkeys
              </h3>
              <p className="text-14-regular text-dark-700 mb-3">
                This will add 5 test passkeys to the database with bcrypt
                hashing:
              </p>
              <ul className="text-12-regular text-dark-600 mb-4 space-y-1">
                <li className="flex items-center gap-2">
                  <Image
                    src="/assets/icons/key.svg"
                    height={12}
                    width={12}
                    alt="key"
                  />
                  ID: 2023-0456, Passkey: 123456
                </li>
                <li className="flex items-center gap-2">
                  <Image
                    src="/assets/icons/key.svg"
                    height={12}
                    width={12}
                    alt="key"
                  />
                  ID: EMP-0123, Passkey: 654321
                </li>
                <li className="flex items-center gap-2">
                  <Image
                    src="/assets/icons/key.svg"
                    height={12}
                    width={12}
                    alt="key"
                  />
                  ID: 2023-1234, Passkey: 111111
                </li>
                <li className="flex items-center gap-2">
                  <Image
                    src="/assets/icons/key.svg"
                    height={12}
                    width={12}
                    alt="key"
                  />
                  ID: 2022-5678, Passkey: 222222
                </li>
                <li className="flex items-center gap-2">
                  <Image
                    src="/assets/icons/key.svg"
                    height={12}
                    width={12}
                    alt="key"
                  />
                  ID: 2021-9012, Passkey: 333333
                </li>
              </ul>
              <Button
                className="shad-primary-btn w-full"
                onClick={handleInitDefault}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Image
                      src="/assets/icons/loader.svg"
                      alt="loader"
                      width={20}
                      height={20}
                      className="animate-spin"
                    />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Image
                      src="/assets/icons/magic.svg"
                      alt="initialize"
                      width={18}
                      height={18}
                    />
                    <span>Initialize Default Test Passkeys</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="mt-6">
              <h3 className="text-16-semibold mb-2 flex items-center gap-2">
                <Image
                  src="/assets/icons/shield.svg"
                  height={16}
                  width={16}
                  alt="security"
                />
                Security Information
              </h3>
              <ul className="text-12-regular text-dark-600 space-y-2">
                <li className="flex items-center gap-2">
                  <Image
                    src="/assets/icons/check.svg"
                    height={12}
                    width={12}
                    alt="check"
                  />
                  Passkeys are hashed using bcrypt with salting
                </li>
                <li className="flex items-center gap-2">
                  <Image
                    src="/assets/icons/check.svg"
                    height={12}
                    width={12}
                    alt="check"
                  />
                  Original passkeys are never stored in the database
                </li>
                <li className="flex items-center gap-2">
                  <Image
                    src="/assets/icons/check.svg"
                    height={12}
                    width={12}
                    alt="check"
                  />
                  Bcrypt's slow algorithm prevents brute force attacks
                </li>
                <li className="flex items-center gap-2">
                  <Image
                    src="/assets/icons/check.svg"
                    height={12}
                    width={12}
                    alt="check"
                  />
                  Each salt is unique, even for identical passkeys
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card-full dashboard-card w-full">
        <h2 className="sub-header mb-4 flex items-center gap-2">
          <Image
            src="/assets/icons/table.svg"
            height={20}
            width={20}
            alt="database"
          />
          Passkey Database
        </h2>

        {errorMessage && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-14-regular flex items-center gap-2">
            <Image
              src="/assets/icons/alert.svg"
              height={16}
              width={16}
              alt="error"
            />
            {errorMessage}
          </div>
        )}

        {loadingPasskeys ? (
          <div className="text-center py-8">
            <Image
              src="/assets/icons/loader.svg"
              alt="loader"
              width={32}
              height={32}
              className="mx-auto animate-spin"
            />
            <p className="mt-2 text-14-regular text-dark-600">
              Loading passkeys...
            </p>
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-8 text-14-regular text-dark-600 flex flex-col items-center gap-2">
            <Image
              src="/assets/icons/empty.svg"
              height={48}
              width={48}
              alt="empty"
            />
            <p>
              No passkeys found. Add some passkeys or initialize the default
              test passkeys.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="shad-table">
              <TableCaption>
                <div className="flex items-center gap-2 justify-center">
                  <Image
                    src="/assets/icons/info.svg"
                    height={14}
                    width={14}
                    alt="info"
                  />
                  <span>
                    List of passkeys in the database. The actual passkeys are
                    securely hashed.
                  </span>
                </div>
              </TableCaption>
              <TableHeader>
                <TableRow className="shad-table-row-header">
                  <TableHead>ID Number</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {passkeys.map((passkeyItem) => (
                  <TableRow key={passkeyItem.$id} className="shad-table-row">
                    <TableCell className="font-medium flex items-center gap-2">
                      <Image
                        src="/assets/icons/user-id.svg"
                        width={16}
                        height={16}
                        alt="ID"
                      />
                      {passkeyItem.idNumber}
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Image
                        src="/assets/icons/calendar.svg"
                        width={14}
                        height={14}
                        alt="Created"
                      />
                      {new Date(passkeyItem.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Image
                        src="/assets/icons/clock.svg"
                        width={14}
                        height={14}
                        alt="Updated"
                      />
                      {new Date(passkeyItem.updatedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right table-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIdNumber(passkeyItem.idNumber);
                          setPasskey("");
                        }}
                        title="Edit"
                        className="doctor-table-icon"
                      >
                        <Image
                          src="/assets/icons/edit.svg"
                          width={20}
                          height={20}
                          alt="Edit"
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => prepareDelete(passkeyItem.$id)}
                        title="Delete"
                        className="doctor-table-icon text-red-500"
                      >
                        <Image
                          src="/assets/icons/delete.svg"
                          width={20}
                          height={20}
                          alt="Delete"
                        />
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
        <AlertDialogContent className="shad-alert-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-18-bold flex items-center gap-2">
              <Image
                src="/assets/icons/warning.svg"
                width={20}
                height={20}
                alt="Warning"
              />
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-14-regular">
              This will permanently delete this passkey. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="flex items-center gap-1 hover:bg-gray-100 hover:border-gray-300 transition-colors">
              <Image
                src="/assets/icons/cancel.svg"
                width={16}
                height={16}
                alt="Cancel"
              />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="shad-danger-btn flex items-center gap-1"
            >
              <Image
                src="/assets/icons/delete.svg"
                width={16}
                height={16}
                alt="Delete"
              />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Result Dialog */}
      <Dialog open={showDeleteResult} onOpenChange={setShowDeleteResult}>
        <DialogContent className="shad-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image
                src="/assets/icons/info.svg"
                width={18}
                height={18}
                alt="Result"
              />
              Delete Result
            </DialogTitle>
            <DialogDescription>{deleteResultMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowDeleteResult(false)}
              className="shad-primary-btn flex items-center gap-1"
            >
              <Image
                src="/assets/icons/check.svg"
                width={16}
                height={16}
                alt="Ok"
              />
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Results Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="shad-dialog max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-18-bold flex items-center gap-2">
              <Image
                src="/assets/icons/chart.svg"
                width={20}
                height={20}
                alt="Result"
              />
              Import Results
            </DialogTitle>
            <DialogDescription>
              Summary of the passkey import operation
            </DialogDescription>
          </DialogHeader>

          {importResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-dark-300 p-3 rounded-md">
                  <div className="text-14-semibold">Total</div>
                  <div className="text-24-bold">
                    {importResults.results.total}
                  </div>
                </div>
                <div className="bg-dark-300 p-3 rounded-md">
                  <div className="text-14-semibold">Processed</div>
                  <div className="text-24-bold">
                    {importResults.results.processed}
                  </div>
                </div>
                <div className="bg-green-900/30 p-3 rounded-md">
                  <div className="text-14-semibold">Successful</div>
                  <div className="text-24-bold text-green-500">
                    {importResults.results.successful}
                  </div>
                </div>
                <div className="bg-red-900/30 p-3 rounded-md">
                  <div className="text-14-semibold">Failed</div>
                  <div className="text-24-bold text-red-500">
                    {importResults.results.failed}
                  </div>
                </div>
              </div>

              {importResults.results.failed > 0 && (
                <div>
                  <h3 className="text-16-semibold mb-2">Error Details</h3>
                  <div className="bg-dark-300 rounded-md max-h-60 overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-dark-500 text-14-medium">
                          <th className="py-2 px-3 text-left">ID Number</th>
                          <th className="py-2 px-3 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.results.errors.map(
                          (error: any, index: number) => (
                            <tr
                              key={index}
                              className="border-t border-dark-500 text-12-regular"
                            >
                              <td className="py-2 px-3">{error.idNumber}</td>
                              <td className="py-2 px-3 text-red-400">
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
              className="shad-primary-btn"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

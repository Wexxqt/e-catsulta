"use client";

import Image from "next/image";
import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";

import { convertFileToUrl } from "@/lib/utils";

type FileUploaderProps = {
  files: File[] | undefined;
  onChange: (files: File[]) => void;
  maxSizeInMB?: number;
  maxFiles?: number;
};

export const FileUploader = ({ 
  files, 
  onChange, 
  maxSizeInMB = 50,
  maxFiles = 2
}: FileUploaderProps) => {
  const [error, setError] = useState<string | null>(null);
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024; // Convert MB to bytes

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    
    // Check file size
    const isValidSize = acceptedFiles.every(file => file.size <= maxSizeInBytes);
    
    if (!isValidSize) {
      setError(`File size exceeds the ${maxSizeInMB}MB limit.`);
      return;
    }
    
    // Combine existing files with new files
    const currentFiles = files || [];
    const newFiles = [...currentFiles, ...acceptedFiles];
    
    // Check if total files don't exceed maxFiles
    if (newFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files.`);
      return;
    }
    
    onChange(newFiles);
  }, [maxSizeInBytes, onChange, maxSizeInMB, maxFiles, files]);

  const removeFile = (index: number) => {
    if (!files) return;
    
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
  };

  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop,
    maxSize: maxSizeInBytes,
    onDropRejected: () => {
      setError(`File size exceeds the ${maxSizeInMB}MB limit.`);
    }
  });

  return (
    <div className="flex flex-col">
      <div 
        {...getRootProps()} 
        className={`file-upload ${error ? 'border-red-500' : ''} ${files && files.length >= maxFiles ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        {files && files.length > 0 ? (
          <div className="flex items-center justify-center">
            {files.length >= maxFiles ? (
              <p className="text-14-regular">
                <span className="text-amber-500">Maximum files reached</span>
              </p>
            ) : (
              <p className="text-14-regular">
                <span className="text-green-500">Drop more files </span>
                or click to add more
              </p>
            )}
          </div>
        ) : (
          <>
            <Image
              src="/assets/icons/upload.svg"
              width={40}
              height={40}
              alt="upload"
            />
            <div className="file-upload_label">
              <p className="text-14-regular">
                <span className="text-green-500">Click to upload </span>
                or drag and drop
              </p>
              <p className="text-12-regular">
                Document files: PDF, DOC, PNG, JPG (max {maxSizeInMB}MB)
              </p>
            </div>
          </>
        )}
      </div>

      {/* Display uploaded files */}
      {files && files.length > 0 && (
        <div className="mt-4 space-y-4">
          <h4 className="text-sm font-medium">Uploaded files ({files.length}/{maxFiles})</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {files.map((file, index) => (
              <div key={index} className="relative border border-dark-500 rounded-md overflow-hidden">
                <Image
                  src={convertFileToUrl(file)}
                  width={400}
                  height={200}
                  alt={`uploaded file ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <p className="text-12-regular text-white truncate max-w-[calc(100%-30px)]">
                      {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}MB)
                    </p>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="bg-red-500 rounded-full p-1 text-white hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
      
      {files && files.length === 1 && (
        <p className="text-sm text-amber-500 mt-1">
          Please upload both front and back of your ID.
        </p>
      )}
    </div>
  );
};

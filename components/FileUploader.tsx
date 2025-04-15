"use client";

import NextImage from "next/image";
import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";

import { convertFileToUrl, isLowEndDevice } from "@/lib/utils";
import { useDeviceOptimization } from "./ThemeProvider";

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
  maxFiles = 2,
}: FileUploaderProps) => {
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isLowEnd, setIsLowEnd] = useState(false);
  const deviceOptimization = useDeviceOptimization?.() || { isLowEndDevice: false };
  
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024; // Convert MB to bytes
  
  // Check device capabilities
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lowEnd = isLowEndDevice() || 
                    deviceOptimization.isLowEndDevice ||
                    /iPhone\s(5|6|7|8|SE)/i.test(navigator.userAgent) ||
                    /(Android\s[4-7])/i.test(navigator.userAgent);
      setIsLowEnd(lowEnd);
    }
  }, [deviceOptimization.isLowEndDevice]);
  
  // Generate optimized previews
  useEffect(() => {
    if (!files) {
      setPreviews([]);
      return;
    }
    
    // For low-end devices, create smaller previews to avoid memory issues
    const createPreviews = async () => {
      const newPreviews: string[] = [];
      
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          if (isLowEnd) {
            try {
              // Create a smaller preview for low-end devices
              const preview = await createLowResPreview(file);
              newPreviews.push(preview);
            } catch (err) {
              // Fallback to simpler method if image processing fails
              newPreviews.push(convertFileToUrl(file));
            }
          } else {
            newPreviews.push(convertFileToUrl(file));
          }
        } else {
          // For non-image files (like PDFs), use a generic icon
          newPreviews.push('/assets/icons/document.svg');
        }
      }
      
      setPreviews(newPreviews);
    };
    
    createPreviews();
    
    // Cleanup URLs
    return () => {
      previews.forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [files, isLowEnd]);
  
  // Helper function to create low-res previews
  const createLowResPreview = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new window.Image() as HTMLImageElement;
        img.onload = () => {
          // Create a small canvas for the preview
          const canvas = document.createElement('canvas');
          // Limit size to max 150px either dimension to save memory
          const maxSize = 150;
          const ratio = Math.min(maxSize / img.width, maxSize / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Draw image at reduced size
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Get data URL with reduced quality
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = event.target?.result as string;
      };
      
      reader.onerror = () => {
        reject(reader.error);
      };
      
      reader.readAsDataURL(file);
    });
  };
  
  // Helper function to compress images before upload (for mobile devices)
  const compressImage = async (file: File): Promise<File> => {
    // If not an image or on a desktop, return original file
    if (!file.type.startsWith('image/') || !isLowEnd) {
      return file;
    }
    
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        
        // Set timeout to prevent hanging process
        const timeoutId = setTimeout(() => {
          console.log("Image compression timed out, using original file");
          resolve(file); // Fallback to original on timeout
        }, 10000); // 10 second timeout
        
        reader.onload = (event) => {
          try {
            const img = new window.Image() as HTMLImageElement;
            
            img.onload = () => {
              try {
                clearTimeout(timeoutId);
                
                // For very large images, scale them down more aggressively on low-end devices
                const maxDimension = isLowEnd ? 800 : 1200; // Lower max width/height for low-end devices
                
                let width = img.width;
                let height = img.height;
                
                if (width > maxDimension || height > maxDimension) {
                  if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                  } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                  }
                }
                
                // Create canvas for compression
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  console.log("Cannot get canvas context, using original file");
                  resolve(file); // Fallback to original
                  return;
                }
                
                // Draw image at reduced size
                ctx.drawImage(img, 0, 0, width, height);
                
                // Use lower quality for low-end devices
                const quality = isLowEnd ? 0.5 : 0.7;
                
                // Convert to blob with compression
                canvas.toBlob(
                  (blob) => {
                    if (!blob) {
                      console.log("Failed to create blob, using original file");
                      resolve(file); // Fallback to original
                      return;
                    }
                    
                    // Create new file with same name but compressed
                    const compressedFile = new File([blob], file.name, {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    });
                    
                    // If compression doesn't reduce size significantly, use original
                    if (compressedFile.size > file.size * 0.8) {
                      console.log(`Compression ineffective for ${file.name}, using original`);
                      resolve(file);
                      return;
                    }
                    
                    console.log(`Compressed ${file.name} from ${Math.round(file.size/1024)}KB to ${Math.round(compressedFile.size/1024)}KB`);
                    resolve(compressedFile);
                  },
                  'image/jpeg', 
                  quality
                );
              } catch (err) {
                console.error("Error in image processing:", err);
                resolve(file); // Fallback to original
              }
            };
            
            img.onerror = () => {
              console.log("Image loading error, using original file"); 
              clearTimeout(timeoutId);
              resolve(file); // Fallback to original
            };
            
            img.src = event.target?.result as string;
          } catch (err) {
            console.error("Error in reader onload handler:", err);
            clearTimeout(timeoutId);
            resolve(file); // Fallback to original
          }
        };
        
        reader.onerror = () => {
          console.log("FileReader error, using original file");
          clearTimeout(timeoutId);
          resolve(file); // Fallback to original
        }
        
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Critical error in compressImage:", err);
        resolve(file); // Fallback to original
      }
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    
    // Check file size
    const isValidSize = acceptedFiles.every(file => file.size <= maxSizeInBytes);
    
    if (!isValidSize) {
      setError(`File size exceeds the ${maxSizeInMB}MB limit.`);
      return;
    }
    
    // Combine existing files with new files
    const currentFiles = files || [];
    let newFiles = [...currentFiles];
    
    // Process and add new files with compression for mobile devices
    for (const file of acceptedFiles) {
      try {
        // Compress images if on a mobile device
        const processedFile = await compressImage(file);
        newFiles.push(processedFile);
      } catch (err) {
        // If compression fails, use original file
        newFiles.push(file);
      }
    }
    
    // Check if total files don't exceed maxFiles
    if (newFiles.length > maxFiles) {
      // Only keep the most recent maxFiles
      newFiles = newFiles.slice(-maxFiles);
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
            <NextImage
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
              {isLowEnd && (
                <p className="text-12-regular text-amber-400 mt-1">
                  For better performance, please use smaller images
                </p>
              )}
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
                {isLowEnd ? (
                  // For low-end devices, use a simpler preview
                  <div 
                    className="w-full h-32 bg-dark-400 flex items-center justify-center"
                    style={{
                      backgroundImage: previews[index] ? `url(${previews[index]})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {!previews[index] && (
                      <div className="animate-pulse bg-dark-500 w-full h-full"></div>
                    )}
                  </div>
                ) : (
                  // For normal devices, use Image component
                  <NextImage
                    src={previews[index] || convertFileToUrl(file)}
                    width={400}
                    height={200}
                    alt={`uploaded file ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                )}
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
      
      {files && files.length === 1 && maxFiles > 1 && (
        <p className="text-sm text-amber-500 mt-1">
          {isLowEnd ? 
            "Please upload at least one clear ID document." : 
            "Please upload both the front and back of your ID for verification."}
        </p>
      )}
      
      {files && files.length === 2 && maxFiles >= 2 && (
        <p className="text-sm text-green-500 mt-1">
          Perfect! Both sides of your ID are uploaded.
        </p>
      )}
    </div>
  );
};

import { useState, useRef, DragEvent, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MessageAttachment } from "@shared/schema";

interface DragDropFileZoneProps {
  onAttachmentsAdded: (attachments: MessageAttachment[]) => void;
  clientId: string;
  currentAttachmentCount: number;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "video/mp4",
  "video/quicktime",
];

export function DragDropFileZone({
  onAttachmentsAdded,
  clientId,
  currentAttachmentCount,
  maxFiles = 5,
  maxFileSize = 25 * 1024 * 1024,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  children,
  className = "",
  disabled = false,
}: DragDropFileZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dragCounter = useRef(0);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return `File type "${file.type}" is not allowed`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(0);
      return `File size exceeds ${maxSizeMB} MB limit`;
    }

    return null;
  };

  const uploadFile = async (file: File): Promise<MessageAttachment | null> => {
    try {
      // Get upload URL
      const uploadRes = await apiRequest("POST", "/api/attachments/upload", {});
      const uploadData: { uploadURL: string } = await uploadRes.json();

      // Upload file to object storage
      await fetch(uploadData.uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      // Save attachment metadata
      const saveRes = await apiRequest("POST", "/api/attachments/save", {
        objectURL: uploadData.uploadURL,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        clientId,
      });
      const saveData: { attachment: MessageAttachment } = await saveRes.json();

      return saveData.attachment;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    if (disabled || isUploading) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);

    if (files.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file first
    files.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    // Show validation errors if any
    if (errors.length > 0) {
      toast({
        title: "Invalid Files",
        description: errors.join("; "),
        variant: "destructive",
      });
    }

    // Check total attachments (current + valid new files) against max limit
    const totalAfterUpload = currentAttachmentCount + validFiles.length;
    if (totalAfterUpload > maxFiles) {
      const remaining = maxFiles - currentAttachmentCount;
      toast({
        title: "Too Many Files",
        description: remaining > 0 
          ? `You can only upload ${remaining} more file(s). Total limit is ${maxFiles} files.`
          : `You've already reached the maximum of ${maxFiles} files. Remove some attachments first.`,
        variant: "destructive",
      });
      return;
    }

    // Upload valid files
    if (validFiles.length > 0) {
      setIsUploading(true);

      try {
        const uploadPromises = validFiles.map((file) => uploadFile(file));
        const results = await Promise.all(uploadPromises);

        const successfulAttachments = results.filter(
          (att): att is MessageAttachment => att !== null
        );

        if (successfulAttachments.length > 0) {
          onAttachmentsAdded(successfulAttachments);
          toast({
            title: "Files Attached",
            description: `${successfulAttachments.length} file(s) ready to send`,
          });
        }

        const failedCount = validFiles.length - successfulAttachments.length;
        if (failedCount > 0) {
          toast({
            title: "Upload Failed",
            description: `${failedCount} file(s) failed to upload`,
            variant: "destructive",
          });
        }
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative ${className}`}
    >
      {isDragging && !disabled && !isUploading && (
        <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary rounded-lg z-10 flex items-center justify-center pointer-events-none">
          <p className="text-sm font-medium text-primary">Drop files here</p>
        </div>
      )}
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 rounded-lg z-10 flex items-center justify-center pointer-events-none">
          <p className="text-sm font-medium text-foreground">Uploading files...</p>
        </div>
      )}
      {children}
    </div>
  );
}

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2, X, FileText, Image as ImageIcon, Video, FileAudio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MessageAttachment } from "@shared/schema";

interface InlineFileAttachmentProps {
  onAttachmentsAdded: (attachments: MessageAttachment[]) => void;
  clientId: string;
  currentAttachmentCount: number;
  maxFiles?: number;
  maxFileSize?: number;
  allowedTypes?: string[];
  disabled?: boolean;
  className?: string;
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

const DEFAULT_MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const DEFAULT_MAX_FILES = 5;

export function InlineFileAttachment({
  onAttachmentsAdded,
  clientId,
  currentAttachmentCount,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  disabled = false,
  className = "",
}: InlineFileAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    if (isUploading) {
      toast({
        title: "Upload in Progress",
        description: "Please wait for the current upload to complete",
        variant: "destructive",
      });
      return;
    }

    // Immediately clear file input to prevent showing selected files
    const fileArray = Array.from(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file first
    fileArray.forEach((file) => {
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

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={allowedTypes.join(",")}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        data-testid="input-file-hidden"
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className={className}
        data-testid="button-attach-file"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Paperclip className="w-4 h-4" />
        )}
      </Button>
    </>
  );
}

interface AttachmentPreviewTrayProps {
  attachments: MessageAttachment[];
  onRemove: (attachmentId: string) => void;
}

export function AttachmentPreviewTray({
  attachments,
  onRemove,
}: AttachmentPreviewTrayProps) {
  if (attachments.length === 0) return null;

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type.startsWith("video/")) return Video;
    if (type.startsWith("audio/")) return FileAudio;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-md border">
      {attachments.map((attachment) => {
        const Icon = getFileIcon(attachment.fileType);
        const isImage = attachment.fileType.startsWith("image/");

        return (
          <div
            key={attachment.id}
            className="flex items-center gap-2 p-2 bg-background rounded-md border max-w-xs"
            data-testid={`pending-attachment-${attachment.id}`}
          >
            {isImage ? (
              <div className="w-10 h-10 flex items-center justify-center bg-muted rounded flex-shrink-0">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              </div>
            ) : (
              <div className="w-10 h-10 flex items-center justify-center bg-muted rounded flex-shrink-0">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {attachment.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.fileSize)}
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onRemove(attachment.id)}
              className="flex-shrink-0 h-8 w-8"
              data-testid={`button-remove-attachment-${attachment.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

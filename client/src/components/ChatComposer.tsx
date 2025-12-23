import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Paperclip, Smile, Send, Loader2, X, FileText, Image as ImageIcon, Video, FileAudio } from "lucide-react";

const EMOJI_LIST = [
  "😀", "😊", "😂", "🥰", "😍", "🤩", "😎", "🤔",
  "👍", "👏", "💪", "🙌", "❤️", "🔥", "⭐", "✨",
  "🎉", "🎊", "💯", "✅", "🏃", "🏋️", "🥗", "💤",
  "💧", "🌟", "👋", "🙏", "💬", "📸", "🥳", "😴"
];

export interface PendingAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  objectPath?: string;
}

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttachmentsAdded?: (attachments: PendingAttachment[]) => void;
  pendingAttachments?: PendingAttachment[];
  onRemoveAttachment?: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isSending?: boolean;
  isUploading?: boolean;
  clientId?: string;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string;
  showEmoji?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentIcon(fileType: string) {
  if (fileType.startsWith("image/")) return ImageIcon;
  if (fileType.startsWith("video/")) return Video;
  if (fileType.startsWith("audio/")) return FileAudio;
  return FileText;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onAttachmentsAdded,
  pendingAttachments = [],
  onRemoveAttachment,
  placeholder = "Type a message...",
  disabled = false,
  isSending = false,
  isUploading = false,
  clientId,
  maxFiles = 5,
  maxFileSize = 25 * 1024 * 1024,
  acceptedFileTypes = "*/*",
  showEmoji = true,
  className = "",
}: ChatComposerProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [localUploading, setLocalUploading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = (value.trim().length > 0 || pendingAttachments.length > 0) && !disabled && !isSending && !isUploading && !localUploading;
  const isProcessing = isSending || isUploading || localUploading;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const scrollHeight = inputRef.current.scrollHeight;
      const maxHeight = 120;
      inputRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = value.slice(0, start) + emoji + value.slice(end);
      onChange(newValue);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      onChange(value + emoji);
    }
    setShowEmojiPicker(false);
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !clientId || !onAttachmentsAdded) return;

    const remainingSlots = maxFiles - pendingAttachments.length;
    if (remainingSlots <= 0) {
      return;
    }

    const validFiles: File[] = [];
    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      if (file.size <= maxFileSize) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    setLocalUploading(true);
    const uploadedAttachments: PendingAttachment[] = [];

    try {
      for (const file of validFiles) {
        try {
          const uploadRes = await fetch("/api/attachments/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
            credentials: "include",
          });
          
          if (!uploadRes.ok) continue;
          
          const uploadData: { uploadURL: string } = await uploadRes.json();

          await fetch(uploadData.uploadURL, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "application/octet-stream" },
          });

          const saveRes = await fetch("/api/attachments/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              objectURL: uploadData.uploadURL,
              fileName: file.name,
              fileType: file.type || "application/octet-stream",
              fileSize: file.size,
              clientId,
            }),
            credentials: "include",
          });

          if (saveRes.ok) {
            const saveData = await saveRes.json();
            uploadedAttachments.push(saveData.attachment);
          }
        } catch (error) {
          console.error("Error uploading file:", error);
        }
      }

      if (uploadedAttachments.length > 0) {
        onAttachmentsAdded(uploadedAttachments);
      }
    } finally {
      setLocalUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={`flex-shrink-0 ${className}`}>
      {pendingAttachments.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment) => {
            const Icon = getAttachmentIcon(attachment.fileType);
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
                data-testid={`pending-attachment-${attachment.id}`}
              >
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate max-w-[120px]">{attachment.fileName}</span>
                <span className="text-xs text-muted-foreground">({formatFileSize(attachment.fileSize)})</span>
                {onRemoveAttachment && (
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(attachment.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`button-remove-attachment-${attachment.id}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2 px-4 py-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFileTypes}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          data-testid="input-file-hidden"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing || pendingAttachments.length >= maxFiles}
          className="flex-shrink-0 rounded-full w-10 h-10 text-muted-foreground hover:text-foreground"
          data-testid="button-attach-file"
        >
          {localUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </Button>

        <div className="flex-1 flex items-center bg-muted/60 dark:bg-muted/40 rounded-full border border-border/50 px-4 py-2 min-h-[44px]">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isProcessing}
            rows={1}
            className="flex-1 bg-transparent border-0 resize-none focus:outline-none text-sm placeholder:text-muted-foreground min-h-[24px] max-h-[120px] py-0"
            style={{ lineHeight: "1.5" }}
            data-testid="input-message"
          />

          {showEmoji && (
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={disabled || isProcessing}
                  className="ml-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  data-testid="button-emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end" side="top">
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className="p-1.5 text-lg hover:bg-muted rounded transition-colors"
                      data-testid={`emoji-${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <Button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          size="icon"
          className="flex-shrink-0 rounded-full w-10 h-10 bg-primary hover:bg-primary/90"
          data-testid="button-send-message"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

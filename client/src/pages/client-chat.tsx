import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, MessageSquare, X, FileText, Image as ImageIcon, Video, FileAudio, Download, Paperclip } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Message, InsertMessage, MessageAttachment } from "@shared/schema";

function AttachmentDisplay({ 
  attachment, 
  isCoach 
}: { 
  attachment: MessageAttachment; 
  isCoach: boolean;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImage = attachment.fileType.startsWith("image/");
  
  const getAttachmentIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return ImageIcon;
    if (fileType.startsWith("video/")) return Video;
    if (fileType.startsWith("audio/")) return FileAudio;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const Icon = getAttachmentIcon(attachment.fileType);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch("/api/attachments/download-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectPath: attachment.objectPath }),
        });

        if (!response.ok) {
          throw new Error("Failed to load file");
        }

        const data = await response.json();
        setSignedUrl(data.signedUrl);
      } catch (err) {
        setError("Failed to load");
        console.error("Error fetching signed URL:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignedUrl();
  }, [attachment.objectPath]);

  if (isLoading) {
    return (
      <div className={`rounded-md p-3 flex items-center gap-2 ${
        !isCoach ? "bg-white/10 border border-white/20" : "bg-muted border"
      }`}>
        <Loader2 className={`w-4 h-4 animate-spin ${!isCoach ? "text-white/70" : "text-muted-foreground"}`} />
        <span className={`text-xs ${!isCoach ? "text-white/70" : "text-muted-foreground"}`}>
          Loading...
        </span>
      </div>
    );
  }

  if (error || !signedUrl) {
    return (
      <div className={`rounded-md p-3 flex items-center gap-2 ${
        !isCoach ? "bg-white/10 border border-white/20" : "bg-muted border"
      }`}>
        <Icon className={`w-4 h-4 ${!isCoach ? "text-white/70" : "text-muted-foreground"}`} />
        <span className={`text-xs ${!isCoach ? "text-white/60" : "text-muted-foreground"}`}>
          {attachment.fileName} ({formatFileSize(attachment.fileSize)})
        </span>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className={`rounded-md overflow-hidden ${
        !isCoach ? "bg-white/10 border border-white/20" : "bg-muted border"
      }`}>
        <a
          href={signedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover-elevate"
        >
          <img
            src={signedUrl}
            alt={attachment.fileName}
            className="max-w-full h-auto rounded-md"
            loading="lazy"
          />
        </a>
      </div>
    );
  }

  return (
    <div className={`rounded-md overflow-hidden ${
      !isCoach ? "bg-white/10 border border-white/20" : "bg-muted border"
    }`}>
      <a
        href={signedUrl}
        download={attachment.fileName}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 hover-elevate"
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${
          !isCoach ? "text-white/70" : "text-muted-foreground"
        }`} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${
            !isCoach ? "text-white" : "text-foreground"
          }`}>
            {attachment.fileName}
          </p>
          <p className={`text-xs ${
            !isCoach ? "text-white/60" : "text-muted-foreground"
          }`}>
            {formatFileSize(attachment.fileSize)}
          </p>
        </div>
        <Download className={`w-4 h-4 flex-shrink-0 ${
          !isCoach ? "text-white/70" : "text-muted-foreground"
        }`} />
      </a>
    </div>
  );
}

export default function ClientChat() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoadRef = useRef(true);
  const { toast } = useToast();

  useEffect(() => {
    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
      setLocation("/client/login");
      return;
    }

    loadClient();
  }, []);

  const loadClient = async () => {
    try {
      const response = await apiRequest("GET", "/api/client-auth/me");
      const data = await response.json();
      
      if (!data.client) {
        localStorage.removeItem("clientId");
        localStorage.removeItem("clientEmail");
        setLocation("/client/login");
        return;
      }

      setClientData(data.client);
    } catch (error) {
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientEmail");
      setLocation("/client/login");
    } finally {
      setIsVerifying(false);
    }
  };

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: !!clientData,
    refetchInterval: 5000,
  });

  const { data: coachInfo } = useQuery<{ name: string; email: string | null; phone: string | null }>({
    queryKey: ["/api/coach/info"],
    enabled: !!clientData,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setMessageText("");
      setPendingAttachments([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest("PATCH", `/api/messages/${messageId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  useEffect(() => {
    if (!clientData) return;

    const unreadMessages = messages.filter(
      (m) => m.sender === "coach" && !m.read
    );

    unreadMessages.forEach((msg) => {
      markAsReadMutation.mutate(msg.id);
    });
  }, [messages, clientData]);

  useEffect(() => {
    if (messages.length > 0) {
      // On initial load, scroll instantly to bottom. On subsequent updates, scroll smoothly.
      const behavior = isInitialLoadRef.current ? "instant" : "smooth";
      messagesEndRef.current?.scrollIntoView({ behavior: behavior as ScrollBehavior });
      isInitialLoadRef.current = false;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!clientData) {
      return;
    }

    if (!messageText.trim() && pendingAttachments.length === 0) {
      return;
    }

    const newMessage: InsertMessage = {
      clientId: clientData.id,
      clientName: clientData.name,
      content: messageText.trim() || "(File attachment)",
      sender: "client",
      timestamp: new Date().toISOString(),
      read: false,
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
    };

    sendMessageMutation.mutate(newMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });
  };

  const handleFileUpload = async (files: FileList, imagesOnly: boolean = false) => {
    if (!clientData) return;
    
    const maxFiles = 5;
    const maxFileSize = 25 * 1024 * 1024;
    
    if (pendingAttachments.length + files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    for (const file of Array.from(files)) {
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 25MB limit`,
          variant: "destructive",
        });
        continue;
      }

      if (imagesOnly && !file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        continue;
      }

      try {
        // Step 1: Get upload URL from backend
        const uploadUrlResponse = await fetch("/api/attachments/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (!uploadUrlResponse.ok) {
          const errorData = await uploadUrlResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to get upload URL");
        }

        const { uploadURL } = await uploadUrlResponse.json();

        // Step 2: Upload file directly to cloud storage
        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to storage");
        }

        // Get the object URL (remove query params from signed URL)
        const objectURL = uploadURL.split("?")[0];

        // Step 3: Save attachment metadata
        const saveResponse = await fetch("/api/attachments/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectURL,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            clientId: clientData.id,
          }),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to save attachment");
        }

        const { attachment } = await saveResponse.json();
        setPendingAttachments((prev) => [...prev, attachment]);
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : `Failed to upload ${file.name}`,
          variant: "destructive",
        });
      }
    }
    
    setIsUploading(false);
  };

  const removeAttachment = (attachmentId: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const getAttachmentIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return ImageIcon;
    if (fileType.startsWith("video/")) return Video;
    if (fileType.startsWith("audio/")) return FileAudio;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isVerifying || messagesLoading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  const clientMessages = messages
    .filter((m) => m.clientId === clientData.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const coachName = coachInfo?.name || "Your Coach";
  const coachInitials = coachName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "C";

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-shrink-0 p-4 sm:p-6 border-b bg-background">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 bg-green-500">
            <AvatarFallback className="bg-green-500 text-white font-medium">
              {coachInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-semibold text-foreground" data-testid="text-chat-title">
              {coachName}
            </h1>
            <p className="text-sm text-muted-foreground">Your personal coach</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {clientMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <MessageSquare className="w-16 h-16 text-muted-foreground/50" />
            <div>
              <p className="text-lg font-medium text-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start a conversation with your coach
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {clientMessages.map((message) => {
              const isCoach = message.sender === "coach";
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isCoach ? "justify-start" : "justify-end"}`}
                  data-testid={`message-${message.id}`}
                >
                  <div className={`max-w-[80%] sm:max-w-[60%]`}>
                    <div
                      className={`p-4 shadow-sm ${
                        isCoach
                          ? "bg-card border rounded-2xl rounded-tl-sm"
                          : "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} data-testid={`attachment-${attachment.id}`}>
                              <AttachmentDisplay 
                                attachment={attachment} 
                                isCoach={isCoach}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        isCoach ? "text-muted-foreground" : "text-muted-foreground text-right"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t p-4 bg-background">
        {pendingAttachments.length > 0 && (
          <div className="mb-3 space-y-2">
            {pendingAttachments.map((attachment) => {
              const Icon = getAttachmentIcon(attachment.fileType);
              return (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-2 bg-muted rounded-md"
                  data-testid={`pending-attachment-${attachment.id}`}
                >
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{attachment.fileName}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeAttachment(attachment.id)}
                    className="flex-shrink-0"
                    data-testid={`button-remove-attachment-${attachment.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          data-testid="input-file-upload"
        />
        <input
          type="file"
          ref={imageInputRef}
          className="hidden"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files, true)}
          data-testid="input-image-upload"
        />
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || sendMessageMutation.isPending}
            data-testid="button-attach-file"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Paperclip className="w-5 h-5" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploading || sendMessageMutation.isPending}
            data-testid="button-attach-image"
          >
            <ImageIcon className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Write a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={sendMessageMutation.isPending}
              className="w-full px-4 py-3 rounded-full border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-150"
              data-testid="input-message"
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={(!messageText.trim() && pendingAttachments.length === 0) || sendMessageMutation.isPending || isUploading}
            size="icon"
            className="rounded-full w-11 h-11 flex-shrink-0"
            data-testid="button-send"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

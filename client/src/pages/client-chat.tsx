import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, Paperclip, X, FileText, Image as ImageIcon, Video, FileAudio, Download } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Message, InsertMessage, MessageAttachment } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

export default function ClientChat() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
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
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      return await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setMessageText("");
      toast({
        title: "Message sent",
        description: "Your message has been sent to your coach",
      });
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

  // Auto-mark coach messages as read when chat page loads
  useEffect(() => {
    if (!clientData) return;

    const unreadMessages = messages.filter(
      (m) => m.sender === "coach" && !m.read
    );

    unreadMessages.forEach((msg) => {
      markAsReadMutation.mutate(msg.id);
    });
  }, [messages, clientData]);

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
    setPendingAttachments([]); // Clear attachments after sending
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
      hour12: true,
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
  };

  const handleFileUpload = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      const successful = result.successful?.[0];
      if (!successful) {
        toast({
          title: "Upload Failed",
          description: "No file was uploaded successfully",
          variant: "destructive",
        });
        return;
      }

      const objectURL = (successful.uploadURL as string) || successful.response?.uploadURL;
      if (!objectURL) {
        toast({
          title: "Upload Failed",
          description: "Failed to get upload URL",
          variant: "destructive",
        });
        return;
      }

      if (!clientData) {
        toast({
          title: "Upload Failed",
          description: "Client data not loaded",
          variant: "destructive",
        });
        return;
      }

      const res = await apiRequest("POST", "/api/attachments/save", {
        objectURL,
        fileName: successful.name,
        fileType: successful.type || "application/octet-stream",
        fileSize: successful.size,
        clientId: clientData.id,
      });
      const data: { attachment: MessageAttachment } = await res.json();

      setPendingAttachments((prev) => [...prev, data.attachment]);
      toast({
        title: "File Attached",
        description: `${successful.name} is ready to send`,
      });
    } catch (error) {
      console.error("Error handling file upload:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to process uploaded file",
        variant: "destructive",
      });
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
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

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-chat-title">Chat with Coach</h1>
          <p className="text-muted-foreground mt-1">Message your coach for support and guidance</p>
        </div>

        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Messages</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                clientMessages.map((message, index) => {
                  const showDate =
                    index === 0 ||
                    formatDate(message.timestamp) !== formatDate(clientMessages[index - 1].timestamp);

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="flex justify-center mb-4">
                          <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                            {formatDate(message.timestamp)}
                          </div>
                        </div>
                      )}
                      <div
                        className={`flex ${
                          message.sender === "client" ? "justify-end" : "justify-start"
                        }`}
                        data-testid={`message-${message.id}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender === "client"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          
                          {/* Display attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {message.attachments.map((attachment) => {
                                const Icon = getAttachmentIcon(attachment.fileType);
                                const isImage = attachment.fileType.startsWith("image/");
                                
                                return (
                                  <div
                                    key={attachment.id}
                                    className={`rounded-md overflow-hidden ${
                                      message.sender === "client"
                                        ? "bg-white/10 border border-white/20"
                                        : "bg-background border"
                                    }`}
                                    data-testid={`attachment-${attachment.id}`}
                                  >
                                    {isImage ? (
                                      <a
                                        href={attachment.objectPath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block hover-elevate"
                                      >
                                        <img
                                          src={attachment.objectPath}
                                          alt={attachment.fileName}
                                          className="max-w-full h-auto rounded-md"
                                        />
                                      </a>
                                    ) : (
                                      <a
                                        href={attachment.objectPath}
                                        download={attachment.fileName}
                                        className="flex items-center gap-2 p-2 hover-elevate"
                                      >
                                        <Icon className={`w-4 h-4 flex-shrink-0 ${
                                          message.sender === "client" ? "text-white/70" : "text-muted-foreground"
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-xs font-medium truncate ${
                                            message.sender === "client" ? "text-white" : "text-foreground"
                                          }`}>
                                            {attachment.fileName}
                                          </p>
                                          <p className={`text-xs ${
                                            message.sender === "client" ? "text-white/60" : "text-muted-foreground"
                                          }`}>
                                            {formatFileSize(attachment.fileSize)}
                                          </p>
                                        </div>
                                        <Download className={`w-4 h-4 flex-shrink-0 ${
                                          message.sender === "client" ? "text-white/70" : "text-muted-foreground"
                                        }`} />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          <p
                            className={`text-xs mt-1 ${
                              message.sender === "client"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t p-4 space-y-3">
              {/* Pending attachments display */}
              {pendingAttachments.length > 0 && (
                <div className="space-y-2">
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
                          <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeAttachment(attachment.id)}
                          className="flex-shrink-0 h-8 w-8"
                          data-testid={`button-remove-attachment-${attachment.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
                <div className="flex gap-2">
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    maxFileSize={52428800}
                    onGetUploadParameters={async () => {
                      const res = await apiRequest("POST", "/api/attachments/upload", {});
                      const data: { uploadURL: string } = await res.json();
                      return {
                        method: "PUT" as const,
                        url: data.uploadURL,
                      };
                    }}
                    onComplete={handleFileUpload}
                    buttonVariant="ghost"
                    buttonSize="icon"
                  >
                    <Paperclip className="w-4 h-4" />
                  </ObjectUploader>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!messageText.trim() && pendingAttachments.length === 0) || sendMessageMutation.isPending}
                    data-testid="button-send"
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

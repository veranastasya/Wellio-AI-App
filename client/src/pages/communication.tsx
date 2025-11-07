import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, Search, Paperclip, X, FileText, Image as ImageIcon, Video, FileAudio, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Message, Client, InsertMessage, MessageAttachment } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

export default function Communication() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [validationError, setValidationError] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const { toast } = useToast();

  const { data: clients = [], isLoading: clientsLoading, isError: clientsError } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: messages = [], isLoading: messagesLoading, isError: messagesError } = useQuery<Message[]>({
    queryKey: ["/api/coach/messages"],
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      return await apiRequest("POST", "/api/coach/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/messages"] });
      setMessageText("");
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest("PATCH", `/api/coach/messages/${messageId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/messages"] });
    },
  });

  // Helper functions - must be defined before use
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getLastMessage = (clientId: string) => {
    const clientMsgs = messages.filter((m) => m.clientId === clientId);
    if (clientMsgs.length === 0) return null;
    return clientMsgs[clientMsgs.length - 1];
  };

  const getUnreadCount = (clientId: string) => {
    return messages.filter(
      (m) => m.clientId === clientId && m.sender === "client" && !m.read
    ).length;
  };

  // Computed values using helper functions
  const filteredClients = clients
    .filter((client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by unread count first (clients with unread messages at top)
      const unreadA = getUnreadCount(a.id);
      const unreadB = getUnreadCount(b.id);
      if (unreadA !== unreadB) {
        return unreadB - unreadA; // Higher unread count first
      }
      
      // Then sort by most recent message
      const lastMsgA = getLastMessage(a.id);
      const lastMsgB = getLastMessage(b.id);
      if (lastMsgA && lastMsgB) {
        return new Date(lastMsgB.timestamp).getTime() - new Date(lastMsgA.timestamp).getTime();
      }
      if (lastMsgA) return -1; // A has messages, B doesn't
      if (lastMsgB) return 1; // B has messages, A doesn't
      
      // Finally sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  
  const clientMessages = selectedClientId
    ? messages
        .filter((m) => m.clientId === selectedClientId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  // Mark messages as read when coach opens a conversation or new messages arrive
  useEffect(() => {
    if (selectedClientId) {
      const unreadMessages = messages.filter(
        (m) => m.clientId === selectedClientId && m.sender === "client" && !m.read
      );
      
      unreadMessages.forEach((msg) => {
        markAsReadMutation.mutate(msg.id);
      });
    }
  }, [selectedClientId, messages]);

  const handleSendMessage = () => {
    setValidationError("");
    
    if (!selectedClientId || !selectedClient) {
      setValidationError("Please select a client first");
      return;
    }
    
    if (!messageText.trim() && pendingAttachments.length === 0) {
      setValidationError("Please enter a message or attach a file");
      return;
    }

    const newMessage: InsertMessage = {
      clientId: selectedClientId,
      clientName: selectedClient.name,
      content: messageText || "(File attachment)",
      sender: "coach",
      timestamp: new Date().toISOString(),
      read: false,
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
    };

    sendMessageMutation.mutate(newMessage);
    setPendingAttachments([]); // Clear attachments after sending
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
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

      if (!selectedClientId) {
        toast({
          title: "Upload Failed",
          description: "Please select a client first",
          variant: "destructive",
        });
        return;
      }

      const res = await apiRequest("POST", "/api/attachments/save", {
        objectURL,
        fileName: successful.name,
        fileType: successful.type || "application/octet-stream",
        fileSize: successful.size,
        clientId: selectedClientId,
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

  if (clientsLoading || messagesLoading) {
    return (
      <div className="bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Communication</h1>
            <p className="text-muted-foreground mt-1">Loading conversations...</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="h-6 bg-muted rounded animate-pulse w-32" />
              </CardHeader>
              <CardContent>
                <div className="h-96 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (clientsError || messagesError) {
    return (
      <div className="bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <Card className="border-destructive">
            <CardContent className="py-16 text-center">
              <p className="text-lg font-medium text-foreground">Failed to load conversations</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please try refreshing the page
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-communication-title">Communication</h1>
          <p className="text-muted-foreground mt-1">Message your clients and manage conversations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card data-testid="card-client-list">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Clients</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-conversations"
                />
              </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-1">
                  {filteredClients.map((client, index) => {
                    const lastMsg = getLastMessage(client.id);
                    const unreadCount = getUnreadCount(client.id);
                    return (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClientId(client.id)}
                        className={`w-full text-left p-3 rounded-lg transition-colors hover-elevate ${
                          selectedClientId === client.id
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : ""
                        }`}
                        data-testid={`button-client-conversation-${index}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-full ${
                              index % 2 === 0
                                ? "bg-primary text-white"
                                : "bg-accent text-accent-foreground"
                            } flex items-center justify-center flex-shrink-0`}
                          >
                            <span className="text-sm font-semibold">{getInitials(client.name)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{client.name}</p>
                              {unreadCount > 0 && (
                                <Badge 
                                  className="bg-primary text-white h-5 min-w-5 px-1.5"
                                  data-testid={`badge-unread-count-${index}`}
                                >
                                  {unreadCount}
                                </Badge>
                              )}
                            </div>
                            {lastMsg && (
                              <p className="text-xs text-muted-foreground truncate">
                                {lastMsg.content}
                              </p>
                            )}
                          </div>
                          {lastMsg && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(lastMsg.timestamp)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {filteredClients.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No clients found
                    </p>
                  )}
                </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2" data-testid="card-messages">
            {selectedClient ? (
              <>
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                      <span className="text-sm font-semibold">
                        {getInitials(selectedClient.name)}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{selectedClient.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="space-y-4">
                      {clientMessages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No messages yet. Start the conversation!
                        </p>
                      ) : (
                        clientMessages.map((msg, index) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender === "coach" ? "justify-end" : "justify-start"
                            }`}
                            data-testid={`message-${index}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                msg.sender === "coach"
                                  ? "bg-primary text-white"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              
                              {/* Display attachments */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {msg.attachments.map((attachment) => {
                                    const Icon = getAttachmentIcon(attachment.fileType);
                                    const isImage = attachment.fileType.startsWith("image/");
                                    
                                    return (
                                      <div
                                        key={attachment.id}
                                        className={`rounded-md overflow-hidden ${
                                          msg.sender === "coach"
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
                                              msg.sender === "coach" ? "text-white/70" : "text-muted-foreground"
                                            }`} />
                                            <div className="flex-1 min-w-0">
                                              <p className={`text-xs font-medium truncate ${
                                                msg.sender === "coach" ? "text-white" : "text-foreground"
                                              }`}>
                                                {attachment.fileName}
                                              </p>
                                              <p className={`text-xs ${
                                                msg.sender === "coach" ? "text-white/60" : "text-muted-foreground"
                                              }`}>
                                                {formatFileSize(attachment.fileSize)}
                                              </p>
                                            </div>
                                            <Download className={`w-4 h-4 flex-shrink-0 ${
                                              msg.sender === "coach" ? "text-white/70" : "text-muted-foreground"
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
                                  msg.sender === "coach" ? "text-white/70" : "text-muted-foreground"
                                }`}
                              >
                                {formatTime(msg.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                </CardContent>
                <div className="p-4 border-t space-y-3">
                  {validationError && (
                    <p className="text-sm text-destructive mb-2">{validationError}</p>
                  )}
                  
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
                    <Textarea
                      placeholder="Type your message..."
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        if (validationError) setValidationError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="min-h-12 max-h-32 resize-none"
                      data-testid="input-message"
                    />
                    <div className="flex flex-col gap-2">
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
                        disabled={sendMessageMutation.isPending}
                        size="icon"
                        className="flex-shrink-0"
                        data-testid="button-send-message"
                      >
                        {sendMessageMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground">Select a client</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose a client from the list to start messaging
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

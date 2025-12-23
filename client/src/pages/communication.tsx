import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, Search, X, FileText, Image as ImageIcon, Video, FileAudio, Download, ArrowLeft, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Message, Client, InsertMessage, MessageAttachment, Coach, SupportedLanguage } from "@shared/schema";
import { COACH_UI_TRANSLATIONS } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InlineFileAttachment } from "@/components/InlineFileAttachment";
import { DragDropFileZone } from "@/components/DragDropFileZone";
import { AISuggestionsStrip } from "@/components/AISuggestionsStrip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Communication() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [validationError, setValidationError] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const lastSelectedClientRef = useRef<string | null>(null);
  const { toast } = useToast();

  const { data: coachProfile } = useQuery<Coach>({
    queryKey: ["/api/coach/profile"],
  });

  const lang = (coachProfile?.preferredLanguage || "en") as SupportedLanguage;
  const t = COACH_UI_TRANSLATIONS;

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

  // Auto-scroll to bottom when messages change or client selection changes
  useEffect(() => {
    if (!selectedClientId) return;
    
    // Check if this is a new client selection
    const isNewClientSelection = lastSelectedClientRef.current !== selectedClientId;
    if (isNewClientSelection) {
      lastSelectedClientRef.current = selectedClientId;
      isInitialLoadRef.current = true;
    }
    
    // Use instant scroll on initial load / new client selection, smooth for updates
    const behavior = isInitialLoadRef.current ? "instant" : "smooth";
    
    // Small delay to ensure DOM is rendered before scrolling
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: behavior as ScrollBehavior });
      isInitialLoadRef.current = false;
    }, 50);
    
    return () => clearTimeout(timer);
  }, [clientMessages.length, selectedClientId]);

  const handleSendMessage = () => {
    setValidationError("");
    
    if (!selectedClientId || !selectedClient) {
      setValidationError(t.communication.selectClientFirst[lang]);
      return;
    }
    
    if (!messageText.trim() && pendingAttachments.length === 0) {
      setValidationError(t.communication.enterMessageOrFile[lang]);
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
      hour12: false,
    });
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleAttachmentsAdded = (newAttachments: MessageAttachment[]) => {
    setPendingAttachments((prev) => [...prev, ...newAttachments]);
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
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t.communication.title[lang]}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">{t.communication.loadingConversations[lang]}</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <Card className="border-destructive">
            <CardContent className="py-12 sm:py-16 text-center">
              <p className="text-lg font-medium text-foreground">{t.communication.failedToLoad[lang]}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.communication.refreshPage[lang]}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background h-[100dvh] lg:h-full overflow-hidden">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 h-full flex flex-col overflow-hidden">
        {/* Header - hide on mobile when viewing chat (use CSS for reliability) */}
        <div className={`mb-4 sm:mb-6 flex-shrink-0 ${selectedClientId ? 'hidden lg:block' : ''}`}>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-chat-title">{t.communication.title[lang]}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">{t.communication.subtitle[lang]}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Client list - hide on mobile when chat is selected */}
          <div 
            data-testid="card-client-list" 
            className={`lg:max-h-[calc(100vh-200px)] h-full flex flex-col bg-card rounded-lg border ${selectedClientId ? 'hidden lg:flex' : 'flex'}`}
          >
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-foreground mb-3">{t.communication.messages[lang]}</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t.communication.searchClients[lang]}
                  className="pl-10 h-10 bg-muted/50 border-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-conversations"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-2">
                {filteredClients.map((client, index) => {
                  const lastMsg = getLastMessage(client.id);
                  const unreadCount = getUnreadCount(client.id);
                  const avatarColors = [
                    "bg-primary",
                    "bg-amber-500",
                    "bg-rose-500",
                    "bg-violet-500",
                    "bg-emerald-500",
                    "bg-cyan-500",
                  ];
                  const avatarColor = avatarColors[index % avatarColors.length];
                  
                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors hover-elevate ${
                        selectedClientId === client.id
                          ? "bg-muted"
                          : ""
                      }`}
                      data-testid={`button-client-conversation-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className={`w-10 h-10 ${avatarColor}`}>
                          <AvatarFallback className={`${avatarColor} text-white font-medium text-sm`}>
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm text-foreground">{client.name}</p>
                            <div className="flex items-center gap-2">
                              {lastMsg && (
                                <span className="text-xs text-muted-foreground">
                                  {formatRelativeTime(lastMsg.timestamp)}
                                </span>
                              )}
                              {unreadCount > 0 && (
                                <Badge 
                                  className="bg-primary text-white h-5 min-w-5 px-1.5 rounded-full"
                                  data-testid={`badge-unread-count-${index}`}
                                >
                                  {unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {lastMsg && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {lastMsg.content}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredClients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t.communication.noClientsFound[lang]}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Chat panel - show on mobile only when client selected, always show on desktop */}
          <div 
            className={`lg:col-span-2 flex flex-col bg-card rounded-lg border overflow-hidden h-full ${selectedClientId ? 'flex' : 'hidden lg:flex'}`} 
            data-testid="card-messages"
          >
            {selectedClient ? (
              <>
                <div className="p-3 sm:p-4 border-b flex items-center gap-3 flex-shrink-0 sticky top-0 bg-card z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedClientId(null)}
                    className="flex-shrink-0 lg:hidden"
                    data-testid="button-back-to-list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-10 h-10 bg-primary flex-shrink-0">
                    <AvatarFallback className="bg-primary text-white font-medium text-sm">
                      {getInitials(selectedClient.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground truncate">{selectedClient.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-xs text-muted-foreground">{t.communication.online[lang]}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* AI Suggestions Strip - shows when relevant insights exist */}
                    {selectedClientId && selectedClient && (
                      <AISuggestionsStrip 
                        clientId={selectedClientId}
                        clientName={selectedClient.name}
                      />
                    )}
                    
                    <div className="space-y-6 flex-1 overflow-y-auto p-3 sm:p-4">
                      {clientMessages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {t.communication.noMessages[lang]}
                        </p>
                      ) : (
                        clientMessages.map((msg, index) => (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${
                              msg.sender === "coach" ? "items-end" : "items-start"
                            }`}
                            data-testid={`message-${index}`}
                          >
                            <div
                              className={`max-w-[75%] px-4 py-2.5 shadow-sm ${
                                msg.sender === "coach"
                                  ? "bg-primary text-white rounded-2xl rounded-tr-sm"
                                  : "bg-muted text-foreground rounded-2xl rounded-tl-sm"
                              }`}
                            >
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                              
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
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 px-1">
                              {formatTime(msg.timestamp)}
                            </p>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                </div>
                <DragDropFileZone
                  onAttachmentsAdded={handleAttachmentsAdded}
                  clientId={selectedClientId || ""}
                  currentAttachmentCount={pendingAttachments.length}
                  disabled={!selectedClientId || sendMessageMutation.isPending}
                  maxFiles={5}
                  maxFileSize={25 * 1024 * 1024}
                  className="flex-shrink-0"
                >
                  <div className="p-3 sm:p-4 border-t space-y-3">
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
                    
                    <div className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-2">
                      <InlineFileAttachment
                        onAttachmentsAdded={handleAttachmentsAdded}
                        clientId={selectedClientId || ""}
                        currentAttachmentCount={pendingAttachments.length}
                        disabled={!selectedClientId || sendMessageMutation.isPending}
                        maxFiles={5}
                        maxFileSize={25 * 1024 * 1024}
                      />
                      <Input
                        placeholder={t.communication.typeMessage[lang]}
                        value={messageText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setMessageText(e.target.value);
                          if (validationError) setValidationError("");
                        }}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
                        data-testid="input-message"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sendMessageMutation.isPending}
                        size="icon"
                        className="flex-shrink-0 rounded-full bg-primary hover:bg-primary/90"
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
                </DragDropFileZone>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-medium text-foreground">{t.communication.selectClient[lang]}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

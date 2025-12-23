import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, Search, X, FileText, Image as ImageIcon, Video, FileAudio, Download, ArrowLeft, Paperclip, Smile, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Message, Client, InsertMessage, MessageAttachment, Coach, SupportedLanguage } from "@shared/schema";
import { COACH_UI_TRANSLATIONS } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InlineFileAttachment } from "@/components/InlineFileAttachment";
import { DragDropFileZone } from "@/components/DragDropFileZone";
import { AISuggestionsStrip } from "@/components/AISuggestionsStrip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Common emojis for quick access
const EMOJI_LIST = [
  "😊", "😄", "😃", "🙂", "😉", "😍", "🥰", "😘",
  "👍", "👏", "💪", "🎉", "🔥", "⭐", "❤️", "💯",
  "✅", "🏃", "🏋️", "🥗", "🍎", "💧", "😴", "🧘",
  "📈", "🎯", "💡", "🙌", "👊", "✨", "🌟", "💚",
];

export default function Communication() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [validationError, setValidationError] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const lastSelectedClientRef = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
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

  // Handle emoji selection - insert at cursor position
  const handleEmojiSelect = (emoji: string) => {
    const input = messageInputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newText = messageText.slice(0, start) + emoji + messageText.slice(end);
      setMessageText(newText);
      // Set cursor position after the inserted emoji
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setMessageText((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  // Handle image upload
  const handleImageSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedClientId) return;
    
    const allowedImageTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp", 
      "image/heic", "image/heif"
    ];
    
    setIsImageUploading(true);
    const fileArray = Array.from(files);
    
    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    fileArray.forEach((file) => {
      if (!allowedImageTypes.includes(file.type.toLowerCase())) {
        errors.push(`${file.name}: Invalid image format`);
      } else if (file.size > 25 * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max 25MB)`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (errors.length > 0) {
      toast({
        title: "Invalid Images",
        description: errors.join("; "),
        variant: "destructive",
      });
    }
    
    if (validFiles.length === 0) {
      setIsImageUploading(false);
      return;
    }
    
    try {
      const uploadedAttachments: MessageAttachment[] = [];
      
      for (const file of validFiles) {
        try {
          // Get upload URL
          const uploadRes = await apiRequest("POST", "/api/attachments/upload", {});
          const uploadData: { uploadURL: string } = await uploadRes.json();
          
          // Upload file
          await fetch(uploadData.uploadURL, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
          
          // Save attachment metadata
          const saveRes = await apiRequest("POST", "/api/attachments/save", {
            objectURL: uploadData.uploadURL,
            fileName: file.name,
            fileType: file.type || "image/jpeg",
            fileSize: file.size,
            clientId: selectedClientId,
          });
          const saveData: { attachment: MessageAttachment } = await saveRes.json();
          uploadedAttachments.push(saveData.attachment);
        } catch (error) {
          console.error("Error uploading image:", error);
          errors.push(`${file.name}: Upload failed`);
        }
      }
      
      if (uploadedAttachments.length > 0) {
        handleAttachmentsAdded(uploadedAttachments);
        toast({
          title: "Images Attached",
          description: `${uploadedAttachments.length} image(s) ready to send`,
        });
      }
      
      if (errors.length > 0) {
        toast({
          title: "Some Images Failed",
          description: errors.join("; "),
          variant: "destructive",
        });
      }
    } finally {
      setIsImageUploading(false);
    }
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
    <div className="h-full flex bg-background overflow-hidden">
      {/* Client List Sidebar */}
      <div 
        data-testid="card-client-list" 
        className={`${selectedClientId ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 bg-card border-r flex-col flex-shrink-0`}
      >
        <div className="p-4 border-b flex-shrink-0">
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
                className={`w-full text-left p-4 flex items-start gap-3 hover-elevate transition-colors border-b border-border/50 ${
                  selectedClientId === client.id ? "bg-primary/10" : ""
                }`}
                data-testid={`button-client-conversation-${index}`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className={`w-12 h-12 ${avatarColor}`}>
                    <AvatarFallback className={`${avatarColor} text-white font-medium`}>
                      {getInitials(client.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator dot */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-foreground truncate">{client.name}</p>
                    {lastMsg && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatRelativeTime(lastMsg.timestamp)}
                      </span>
                    )}
                  </div>
                  {lastMsg && (
                    <p className="text-xs text-muted-foreground truncate">
                      {lastMsg.content}
                    </p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs" data-testid={`badge-unread-count-${index}`}>
                      {unreadCount}
                    </span>
                  </div>
                )}
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

      {/* Chat Panel */}
      <div 
        className={`${selectedClientId ? 'flex' : 'hidden lg:flex'} flex-1 flex-col min-w-0`}
        data-testid="card-messages"
      >
        {selectedClient ? (
          <>
            {/* Fixed Chat Header */}
            <div className="bg-card border-b p-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                {/* Back button - mobile only */}
                <button
                  onClick={() => setSelectedClientId(null)}
                  className="lg:hidden p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                  data-testid="button-back-to-list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar className="w-10 h-10 bg-primary">
                  <AvatarFallback className="bg-primary text-white font-medium text-sm">
                    {getInitials(selectedClient.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold text-foreground">{selectedClient.name}</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    Online
                  </p>
                </div>
              </div>
            </div>

            {/* AI Suggestions Strip */}
            {selectedClientId && selectedClient && (
              <AISuggestionsStrip 
                clientId={selectedClientId}
                clientName={selectedClient.name}
              />
            )}

            {/* Scrollable Messages Area - ONLY this scrolls */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {clientMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t.communication.noMessages[lang]}
                </p>
              ) : (
                clientMessages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={`flex w-full ${msg.sender === "coach" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${index}`}
                  >
                    <div
                      className={`max-w-[65%] ${
                        msg.sender === "coach"
                          ? "bg-primary text-white rounded-2xl rounded-br-md"
                          : "bg-white dark:bg-card text-foreground border border-border/50 rounded-2xl rounded-bl-md"
                      } px-4 py-2.5`}
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
                      <p className={`text-xs mt-1 ${
                        msg.sender === "coach" ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Fixed Input Area at Bottom */}
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
                    
                    <div className="flex items-center gap-3">
                      {/* Hidden image input */}
                      <input
                        ref={imageInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
                        onChange={(e) => handleImageSelect(e.target.files)}
                        className="hidden"
                        data-testid="input-image-hidden"
                      />
                      
                      {/* Attachment icon */}
                      <InlineFileAttachment
                        onAttachmentsAdded={handleAttachmentsAdded}
                        clientId={selectedClientId || ""}
                        currentAttachmentCount={pendingAttachments.length}
                        disabled={!selectedClientId || sendMessageMutation.isPending}
                        maxFiles={5}
                        maxFileSize={25 * 1024 * 1024}
                      />
                      
                      {/* Image icon - now functional */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            disabled={isImageUploading || !selectedClientId}
                            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                            data-testid="button-add-image"
                          >
                            {isImageUploading ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <ImageIcon className="w-5 h-5" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Add image</TooltipContent>
                      </Tooltip>
                      
                      {/* Input field */}
                      <div className="flex-1 flex items-center bg-muted/50 rounded-full px-4 py-2">
                        <Input
                          ref={messageInputRef}
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
                          className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                          data-testid="input-message"
                        />
                      </div>
                      
                      {/* Emoji picker */}
                      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
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
                      
                      {/* Send button */}
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
  );
}

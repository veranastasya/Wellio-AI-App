import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Message, Client, InsertMessage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Communication() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [validationError, setValidationError] = useState("");
  const { toast } = useToast();

  const { data: clients = [], isLoading: clientsLoading, isError: clientsError } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: messages = [], isLoading: messagesLoading, isError: messagesError } = useQuery<Message[]>({
    queryKey: ["/api/coach/messages"],
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

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  
  const clientMessages = selectedClientId
    ? messages
        .filter((m) => m.clientId === selectedClientId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

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

  // Mark messages as read when coach opens a conversation
  useEffect(() => {
    if (selectedClientId) {
      const unreadMessages = messages.filter(
        (m) => m.clientId === selectedClientId && m.sender === "client" && !m.read
      );
      
      unreadMessages.forEach((msg) => {
        markAsReadMutation.mutate(msg.id);
      });
    }
  }, [selectedClientId]);

  const handleSendMessage = () => {
    setValidationError("");
    
    if (!selectedClientId || !selectedClient) {
      setValidationError("Please select a client first");
      return;
    }
    
    if (!messageText.trim()) {
      setValidationError("Please enter a message");
      return;
    }

    const newMessage: InsertMessage = {
      clientId: selectedClientId,
      clientName: selectedClient.name,
      content: messageText,
      sender: "coach",
      timestamp: new Date().toISOString(),
      read: false,
    };

    sendMessageMutation.mutate(newMessage);
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
                <div className="p-4 border-t">
                  {validationError && (
                    <p className="text-sm text-destructive mb-2">{validationError}</p>
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

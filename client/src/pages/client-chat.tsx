import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Message, InsertMessage } from "@shared/schema";

export default function ClientChat() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [messageText, setMessageText] = useState("");
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

  const handleSendMessage = () => {
    if (!clientData || !messageText.trim()) {
      return;
    }

    const newMessage: InsertMessage = {
      clientId: clientData.id,
      clientName: clientData.name,
      content: messageText.trim(),
      sender: "client",
      timestamp: new Date().toISOString(),
      read: false,
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
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || sendMessageMutation.isPending}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

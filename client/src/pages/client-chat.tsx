import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

export default function ClientChat() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("clientToken");
    if (!token) {
      setLocation("/client/onboard");
      return;
    }

    verifyAndLoadClient(token);
  }, []);

  const verifyAndLoadClient = async (token: string) => {
    try {
      const response = await apiRequest("POST", "/api/client-auth/verify", { token });
      const data = response as any;
      
      if (!data.client) {
        setLocation("/client/onboard?token=" + token);
        return;
      }

      setClientData(data.client);
    } catch (error) {
      setLocation("/client/onboard");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

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
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <MessageSquare className="w-16 h-16 text-muted-foreground/50" />
                <div>
                  <p className="text-lg font-medium text-foreground">Chat Coming Soon</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Real-time messaging with your coach will be available soon
                  </p>
                </div>
              </div>
            </div>
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  disabled
                  data-testid="input-message"
                />
                <Button disabled data-testid="button-send">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

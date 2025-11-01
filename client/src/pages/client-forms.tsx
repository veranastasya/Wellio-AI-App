import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

export default function ClientForms() {
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
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-forms-title">My Forms</h1>
          <p className="text-muted-foreground mt-1">View and complete questionnaires from your coach</p>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Completed Forms</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">Onboarding Complete!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You've completed your initial questionnaire
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Available Forms</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <FileText className="w-16 h-16 text-muted-foreground/50" />
              <div>
                <p className="text-lg font-medium text-foreground">No New Forms</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your coach hasn't assigned any new questionnaires yet
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

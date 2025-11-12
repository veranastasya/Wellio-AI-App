import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, Download, Calendar, Target, CheckCircle2, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client, ClientPlan } from "@shared/schema";

export default function ClientPlan() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    const storedClientId = localStorage.getItem("clientId");
    if (!storedClientId) {
      setLocation("/client/login");
      return;
    }
    setClientId(storedClientId);
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

  const { data: plans, isLoading: isLoadingPlans } = useQuery<ClientPlan[]>({
    queryKey: ["/api/client-plans/my-plans"],
    enabled: !!clientId,
  });

  if (isVerifying || isLoadingPlans) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" data-testid="loader-plans" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  // Plans are already filtered to only shared plans by the API
  const sharedPlans = plans || [];

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2" data-testid="text-plan-title">
              <Sparkles className="w-8 h-8" />
              My Wellness Plans
            </h1>
            <p className="text-muted-foreground mt-1">View your personalized plans from your coach</p>
          </div>
          {sharedPlans.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-sm">
                {sharedPlans.length} {sharedPlans.length === 1 ? "Plan" : "Plans"}
              </Badge>
            </div>
          )}
        </div>

        {sharedPlans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Plans Available Yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Your coach hasn't shared any wellness plans with you yet. Check back soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {sharedPlans.map((plan) => {
              const planMessages = (plan.planContent as any).messages || [];
              const assistantMessages = planMessages.filter((msg: any) => msg.role === "assistant");
              
              return (
                <Card key={plan.id} data-testid={`plan-${plan.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{plan.planName}</CardTitle>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Created {new Date(plan.createdAt).toLocaleDateString()}
                          </div>
                          <Badge variant="outline">
                            {plan.status}
                          </Badge>
                        </div>
                      </div>
                      {plan.pdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(plan.pdfUrl!, "_blank")}
                          data-testid="button-download-pdf"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {assistantMessages.length > 0 ? (
                          assistantMessages.map((message: any, idx: number) => (
                            <div key={idx} className="space-y-2">
                              <div className="prose prose-sm max-w-none dark:prose-invert">
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {message.content}
                                </div>
                              </div>
                              {idx < assistantMessages.length - 1 && (
                                <div className="border-t border-border my-4" />
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm italic">
                            No plan content available
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Overall Progress</h3>
                </div>
                <div className="text-3xl font-bold">{clientData.progressScore}%</div>
                <p className="text-sm text-muted-foreground">
                  Keep up the great work!
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Status</h3>
                </div>
                <Badge variant={clientData.status === "active" ? "default" : "secondary"} className="text-base">
                  {clientData.status}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Member since {new Date(clientData.joinedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

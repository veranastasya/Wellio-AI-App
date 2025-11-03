import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client, Response, Questionnaire } from "@shared/schema";

export default function ClientForms() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

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

  const { data: responses = [], isLoading: responsesLoading } = useQuery<Response[]>({
    queryKey: ["/api/responses"],
    enabled: !!clientData,
  });

  const { data: questionnaires = [], isLoading: questionnairesLoading } = useQuery<Questionnaire[]>({
    queryKey: ["/api/questionnaires"],
    enabled: !!clientData,
  });

  if (isVerifying || responsesLoading || questionnairesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  const getQuestionnaireName = (questionnaireId: string) => {
    const questionnaire = questionnaires.find((q) => q.id === questionnaireId);
    return questionnaire?.name || "Unknown Form";
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-forms-title">My Forms</h1>
          <p className="text-muted-foreground mt-1">View and complete questionnaires from your coach</p>
        </div>

        <Card>
          <CardHeader className="border-b gap-1 space-y-0 pb-2">
            <CardTitle className="text-lg">Completed Forms</CardTitle>
            <p className="text-sm text-muted-foreground">
              {responses.length} form{responses.length !== 1 ? "s" : ""} completed
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {responses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <FileText className="w-16 h-16 text-muted-foreground/50" />
                <div>
                  <p className="text-lg font-medium text-foreground">No Completed Forms</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    You haven't completed any questionnaires yet
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {responses.map((response) => (
                  <Card key={response.id} className="hover-elevate">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="bg-primary/10 p-2 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">
                              {getQuestionnaireName(response.questionnaireId)}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              Completed {new Date(response.submittedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">Completed</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b gap-1 space-y-0 pb-2">
            <CardTitle className="text-lg">Available Forms</CardTitle>
            <p className="text-sm text-muted-foreground">
              New questionnaires from your coach
            </p>
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

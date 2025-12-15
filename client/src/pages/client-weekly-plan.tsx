import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, FileText, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client, ClientPlan } from "@shared/schema";

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-lg font-bold text-foreground mt-4 mb-2">
          {line.substring(4)}
        </h3>
      );
      i++;
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-xl font-bold text-foreground mt-5 mb-3">
          {line.substring(3)}
        </h2>
      );
      i++;
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-2xl font-bold text-foreground mt-6 mb-3">
          {line.substring(2)}
        </h1>
      );
      i++;
    } else if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      elements.push(
        <div key={`hr-${i}`} className="border-t border-border my-4" />
      );
      i++;
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-3 text-sm leading-relaxed text-foreground ml-2">
          <span className="text-primary mt-0.5">•</span>
          <span>{line.trim().substring(2)}</span>
        </div>
      );
      i++;
    } else if (/^\d+\. /.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\. (.*)$/);
      if (match) {
        elements.push(
          <div key={`ol-${i}`} className="flex gap-3 text-sm leading-relaxed text-foreground ml-2">
            <span className="text-primary font-semibold min-w-fit">{match[1]}.</span>
            <span>{match[2]}</span>
          </div>
        );
      }
      i++;
    } else {
      elements.push(
        <p key={`text-${i}`} className="text-sm leading-relaxed text-foreground">
          {line}
        </p>
      );
      i++;
    }
  }

  return <div className="space-y-2">{elements}</div>;
}

function getContentFromPlan(plan: ClientPlan): string {
  if (!plan.planContent) return '';
  
  if (typeof plan.planContent === 'string') {
    return plan.planContent;
  }
  
  if (typeof plan.planContent === 'object') {
    const content = (plan.planContent as any).content;
    if (content && typeof content === 'string') {
      return content;
    }
    
    const sections = (plan.planContent as any).sections;
    if (sections && Array.isArray(sections)) {
      return sections.map((section: any) => {
        let text = '';
        if (section.heading) {
          text += `## ${section.heading}\n\n`;
        }
        if (section.content) {
          text += `${section.content}\n\n`;
        }
        return text;
      }).join('\n');
    }
  }
  
  return '';
}

export default function ClientWeeklyPlan() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const storedClientId = localStorage.getItem("clientId");
    if (!storedClientId) {
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

  const { data: plans = [], isLoading: plansLoading } = useQuery<ClientPlan[]>({
    queryKey: ["/api/client-plans/my-plans"],
    enabled: !!clientData,
  });

  const activePlan = plans.find(p => p.status === 'active' && p.shared);
  const planContent = activePlan ? getContentFromPlan(activePlan) : '';

  if (isVerifying || plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" data-testid="loader-weekly-plan" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  if (!activePlan) {
    return (
      <div className="bg-background min-h-screen">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="text-weekly-plan-title">
              <Calendar className="w-7 h-7 text-primary" />
              My Weekly Program
            </h1>
            <p className="text-muted-foreground mt-1">Your personalized wellness plan</p>
          </div>

          <Card className="border-dashed" data-testid="card-no-plan">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Plan Assigned Yet</h2>
              <p className="text-muted-foreground max-w-md">
                Your coach hasn't assigned a wellness plan to you yet. Once they do, you'll see your personalized program here.
              </p>
              <Button 
                variant="outline" 
                className="mt-6"
                onClick={() => setLocation("/client/chat")}
                data-testid="button-contact-coach"
              >
                Message Your Coach
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="text-weekly-plan-title">
              <Calendar className="w-7 h-7 text-primary" />
              My Weekly Program
            </h1>
            <p className="text-muted-foreground mt-1">Your personalized wellness plan</p>
          </div>
          <Button 
            variant="outline"
            onClick={() => setLocation("/client/my-plan")}
            data-testid="button-view-full-plan"
          >
            <FileText className="w-4 h-4 mr-2" />
            View Full Plan
          </Button>
        </div>

        <Card data-testid="card-plan-content">
          <CardHeader className="border-b bg-primary/5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{activePlan.planName}</CardTitle>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Assigned {new Date(activePlan.createdAt).toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {planContent ? (
              <MarkdownRenderer content={planContent} />
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Plan content is not available. Please contact your coach.
              </p>
            )}
          </CardContent>
        </Card>

        {activePlan.pdfUrl && (
          <Card data-testid="card-download-pdf">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Download PDF Version</p>
                  <p className="text-xs text-muted-foreground">Save a copy for offline access</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`/objects/${activePlan.pdfUrl}`, '_blank')}
                data-testid="button-download-pdf"
              >
                Download
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

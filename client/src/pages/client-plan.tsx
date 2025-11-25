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

// Render markdown content with beautiful formatting
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Skip empty lines but preserve spacing
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Heading levels
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
    }
    // Horizontal rule
    else if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      elements.push(
        <div key={`hr-${i}`} className="border-t border-border my-4" />
      );
      i++;
    }
    // Sub-headers: lines starting with "- " and ending with ":" (e.g., "- Movement Sessions:")
    else if ((line.trim().startsWith('- ') || line.trim().startsWith('* ')) && line.trim().endsWith(':')) {
      const headerText = line.trim().substring(2); // Remove "- " or "* " prefix
      elements.push(
        <h4 key={`subheader-${i}`} className="text-base font-semibold text-primary mt-4 mb-2">
          {renderInlineFormatting(headerText)}
        </h4>
      );
      i++;
    }
    // Bold text (must handle inline)
    else if (line.includes('**')) {
      elements.push(
        <p key={`p-${i}`} className="text-sm leading-relaxed text-foreground">
          {renderInlineFormatting(line)}
        </p>
      );
      i++;
    }
    // Bullet points
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
      elements.push(
        <div key={`li-${i}`} className="flex gap-3 text-sm leading-relaxed text-foreground ml-2">
          <span className="text-primary mt-0.5">•</span>
          <span>{renderInlineFormatting(line.trim().substring(2))}</span>
        </div>
      );
      i++;
    }
    // Numbered lists
    else if (/^\d+\. /.test(line.trim())) {
      const match = line.trim().match(/^(\d+)\. (.*)$/);
      if (match) {
        elements.push(
          <div key={`ol-${i}`} className="flex gap-3 text-sm leading-relaxed text-foreground ml-2">
            <span className="text-primary font-semibold min-w-fit">{match[1]}.</span>
            <span>{renderInlineFormatting(match[2])}</span>
          </div>
        );
      }
      i++;
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={`text-${i}`} className="text-sm leading-relaxed text-foreground">
          {renderInlineFormatting(line)}
        </p>
      );
      i++;
    }
  }

  return <div className="space-y-2">{elements}</div>;
}

// Render inline formatting (bold, italic)
function renderInlineFormatting(text: string): JSX.Element | string {
  const parts: (JSX.Element | string)[] = [];
  let lastIndex = 0;
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__(?!_)|_(.+?)_(?!_)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add formatted text
    const boldText = match[1]; // ** **
    const italicText = match[2]; // * *
    const boldText2 = match[3]; // __ __
    const italicText2 = match[4]; // _ _

    if (boldText) {
      parts.push(
        <strong key={`bold-${match.index}`} className="font-bold">
          {boldText}
        </strong>
      );
    } else if (italicText) {
      parts.push(
        <em key={`italic-${match.index}`} className="italic">
          {italicText}
        </em>
      );
    } else if (boldText2) {
      parts.push(
        <strong key={`bold2-${match.index}`} className="font-bold">
          {boldText2}
        </strong>
      );
    } else if (italicText2) {
      parts.push(
        <em key={`italic2-${match.index}`} className="italic">
          {italicText2}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length === 0 ? text : <>{parts}</>;
}

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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2" data-testid="text-plan-title">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8" />
              My Wellness Plans
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">View your personalized plans from your coach</p>
          </div>
          {sharedPlans.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs sm:text-sm">
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
              // Handle both new format { content: string } and old format { messages: [] }
              let contentText = '';
              const planContentObj = plan.planContent as any;
              
              if (planContentObj?.content && typeof planContentObj.content === 'string') {
                // New format: { content: string }
                contentText = planContentObj.content;
              } else if (planContentObj?.messages && Array.isArray(planContentObj.messages)) {
                // Old format: { messages: [] }
                const assistantMessages = planContentObj.messages.filter((msg: any) => msg.role === "assistant");
                contentText = assistantMessages.map((msg: any) => msg.content).join('\n\n');
              }
              
              return (
                <Card key={plan.id} data-testid={`plan-${plan.id}`}>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg sm:text-xl mb-2">{plan.planName}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            Created {new Date(plan.createdAt).toLocaleDateString()}
                          </div>
                          <Badge variant="outline" className="text-xs">
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
                          className="w-full sm:w-auto min-h-10"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <ScrollArea className="h-[300px] sm:h-[400px] pr-2 sm:pr-4">
                      <div className="space-y-4">
                        {contentText ? (
                          <MarkdownRenderer content={contentText} />
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
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Your Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
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

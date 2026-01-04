import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles, AlertTriangle, TrendingDown, Clock, MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertMessage, Coach, SupportedLanguage } from "@shared/schema";
import { COACH_UI_TRANSLATIONS } from "@shared/schema";

interface Trigger {
  id: string;
  clientId: string;
  type: string;
  severity: "High" | "Medium" | "Low";
  reason: string;
  recommendedAction: string;
  isResolved?: boolean;
  detectedAt?: string;
}

interface AIInsightsCardProps {
  clientId: string;
  clientName: string;
}

function getTriggerIcon(type: string) {
  switch (type) {
    case "inactivity":
      return Clock;
    case "declining_workouts":
    case "pattern_deviation":
      return TrendingDown;
    default:
      return AlertTriangle;
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "High":
      return "bg-red-500/10 text-red-600 border-red-500/30";
    case "Medium":
      return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    default:
      return "bg-blue-500/10 text-blue-600 border-blue-500/30";
  }
}

function generateMessage(trigger: Trigger, clientName: string): string {
  const firstName = clientName.split(" ")[0];
  
  switch (trigger.type) {
    case "inactivity":
      return `Hey ${firstName}! I noticed it's been a few days since we connected. How are things going? I'm here if you need any support!`;
    case "declining_workouts":
      return `Hi ${firstName}! Life gets busy sometimes - would you like to chat about any adjustments to your workout schedule?`;
    case "missed_meals":
      return `Hey ${firstName}! I noticed some gaps in your meal logging. Is there anything making it difficult to track?`;
    default:
      return `Hi ${firstName}! Just checking in to see how everything is going. Let me know if there's anything I can help with!`;
  }
}

export function AIInsightsCard({ clientId, clientName }: AIInsightsCardProps) {
  const { toast } = useToast();
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);
  const [messageText, setMessageText] = useState("");

  // Fetch coach profile for language preference
  const { data: coachProfile } = useQuery<Coach>({
    queryKey: ["/api/coach/profile"],
  });
  
  const lang = (coachProfile?.preferredLanguage || "en") as SupportedLanguage;
  const t = COACH_UI_TRANSLATIONS.aiInsights;

  useEffect(() => {
    if (!clientId) return;

    const loadTriggers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/engagement/triggers/${clientId}`);
        if (response.ok) {
          const data = await response.json();
          setTriggers(data.filter((t: Trigger) => !t.isResolved).slice(0, 3));
        }
      } catch (error) {
        console.error("[AIInsights] Failed to load triggers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTriggers();
  }, [clientId]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      return await apiRequest("POST", "/api/coach/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/messages"] });
      toast({
        title: t.messageSent[lang],
        description: `${t.checkInSentTo[lang]} ${clientName}`,
      });
      setMessageModalOpen(false);
      setSelectedTrigger(null);
      setMessageText("");
    },
    onError: () => {
      toast({
        title: COACH_UI_TRANSLATIONS.common.error[lang],
        description: t.failedToSend[lang],
        variant: "destructive",
      });
    },
  });

  const handleSendCheckIn = (trigger: Trigger) => {
    setSelectedTrigger(trigger);
    setMessageText(generateMessage(trigger, clientName));
    setMessageModalOpen(true);
  };

  const handleSend = () => {
    if (!messageText.trim()) return;

    const newMessage: InsertMessage = {
      clientId,
      clientName,
      content: messageText,
      sender: "coach",
      timestamp: new Date().toISOString(),
      read: false,
    };
    sendMessageMutation.mutate(newMessage);
  };

  if (isLoading) {
    return null;
  }

  if (triggers.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20" data-testid="card-ai-insights">
        <CardHeader className="pb-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full"
            data-testid="button-toggle-ai-insights"
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              {t.title[lang]}
              <Badge variant="outline" className="ml-2 text-xs">
                {triggers.length} {triggers.length === 1 ? t.alert[lang] : t.alerts[lang]}
              </Badge>
            </CardTitle>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="space-y-3 pt-2">
            {triggers.map((trigger) => {
              const Icon = getTriggerIcon(trigger.type);
              return (
                <div
                  key={trigger.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                  data-testid={`insight-${trigger.id}`}
                >
                  <div className={`p-2 rounded-md ${getSeverityColor(trigger.severity)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${getSeverityColor(trigger.severity)}`}>
                        {trigger.severity === "High" ? t.high[lang] : trigger.severity === "Medium" ? t.medium[lang] : t.low[lang]}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">
                      {trigger.reason}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendCheckIn(trigger)}
                    className="flex-shrink-0"
                    data-testid={`button-send-checkin-${trigger.id}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    {t.checkIn[lang]}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              {t.sendCheckIn[lang]}
            </DialogTitle>
            <DialogDescription>
              {t.sendPersonalizedMessage[lang]} {clientName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="min-h-[120px] resize-none"
              placeholder={t.enterMessage[lang]}
              data-testid="textarea-checkin-message"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageModalOpen(false)}>
              {t.cancel[lang]}
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              data-testid="button-send-checkin"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendMessageMutation.isPending ? t.sending[lang] : t.send[lang]}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

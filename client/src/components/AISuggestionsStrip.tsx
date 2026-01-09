import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Send, Pencil, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertMessage } from "@shared/schema";

interface Trigger {
  id: string;
  clientId: string;
  type: string;
  severity: "High" | "Medium" | "Low";
  reason: string;
  recommendedAction: string;
  isResolved?: boolean;
}

interface Recommendation {
  id: string;
  clientId: string;
  clientName?: string;
  message: string;
  reason: string;
  priority: "high" | "medium" | "low";
  status: string;
}

interface AISuggestionsStripProps {
  clientId: string;
  clientName: string;
  onMessageSent?: () => void;
}

function generateSuggestedMessage(trigger: Trigger, clientName: string): string {
  const firstName = clientName.split(" ")[0];
  
  switch (trigger.type) {
    case "inactivity":
      return `Hey ${firstName}! I noticed it's been a few days since we connected. How are things going? I'm here if you need any support or adjustments to your plan.`;
    case "declining_workouts":
      return `Hi ${firstName}! I've been reviewing your recent activity - life gets busy sometimes! Would you like to chat about any adjustments to your workout schedule?`;
    case "missed_meals":
      return `Hey ${firstName}! I noticed some gaps in your meal logging recently. Is there anything making it difficult to track? Happy to help simplify things!`;
    case "pattern_deviation":
      return `Hi ${firstName}! I noticed some changes in your patterns recently. Just checking in - is everything okay? Let me know if you'd like to adjust anything.`;
    default:
      return `Hi ${firstName}! Just checking in to see how everything is going. Let me know if there's anything I can help with!`;
  }
}

function formatReasonText(reason: string): string {
  if (!reason) return "";
  
  try {
    if (reason.startsWith("{") && reason.includes("templateKey")) {
      const parsed = JSON.parse(reason);
      const { templateKey, params } = parsed;
      
      switch (templateKey) {
        case "inactivityMediumReason":
          return `${params?.name || "Client"} hasn't logged any activity in ${params?.days || "several"} days.`;
        case "inactivityHighReason":
          return `${params?.name || "Client"} has been inactive for ${params?.days || "many"} days and may need attention.`;
        case "decliningWorkoutsReason":
          return `${params?.name || "Client"}'s workout frequency has declined recently.`;
        case "missedMealsReason":
          return `${params?.name || "Client"} has gaps in their meal logging.`;
        case "patternDeviationReason":
          return `${params?.name || "Client"}'s activity patterns have changed recently.`;
        default:
          return `${params?.name || "Client"} may need your attention.`;
      }
    }
  } catch {
    // Not JSON, return as-is
  }
  
  return reason;
}

export function AISuggestionsStrip({ clientId, clientName, onMessageSent }: AISuggestionsStripProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [triggersRes, recsRes] = await Promise.all([
          fetch(`/api/engagement/triggers/${clientId}`),
          fetch(`/api/engagement/recommendations/${clientId}`),
        ]);

        const triggersData = triggersRes.ok ? await triggersRes.json() : [];
        const recsData = recsRes.ok ? await recsRes.json() : [];

        setTriggers(triggersData.filter((t: Trigger) => !t.isResolved));
        setRecommendations(recsData.filter((r: Recommendation) => r.status === "pending"));
      } catch (error) {
        console.error("[AISuggestions] Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [clientId]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      return await apiRequest("POST", "/api/coach/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/messages"] });
      toast({
        title: "Message Sent",
        description: "Your AI-suggested message has been sent.",
      });
      setIsEditing(false);
      setEditedMessage("");
      onMessageSent?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = (message: string) => {
    const newMessage: InsertMessage = {
      clientId,
      clientName,
      content: message,
      sender: "coach",
      timestamp: new Date().toISOString(),
      read: false,
    };
    sendMessageMutation.mutate(newMessage);
  };

  const activeTrigger = triggers[0];
  const pendingRecommendation = recommendations[0];

  const suggestedMessage = pendingRecommendation?.message || 
    (activeTrigger ? generateSuggestedMessage(activeTrigger, clientName) : null);
  
  const insightText = pendingRecommendation?.reason || 
    activeTrigger?.reason || 
    null;

  if (!suggestedMessage || !insightText) {
    return null;
  }

  const currentMessage = isEditing ? editedMessage : suggestedMessage;

  return (
    <div 
      className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg mx-3 sm:mx-4 mt-3 sm:mt-4 overflow-hidden"
      data-testid="ai-suggestions-strip"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover-elevate"
        data-testid="button-toggle-ai-suggestions"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">AI Suggestion</span>
          <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">
            {activeTrigger?.severity || pendingRecommendation?.priority || "Medium"}
          </Badge>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            {formatReasonText(insightText)}
          </p>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                className="min-h-[80px] resize-none text-sm"
                placeholder="Edit your message..."
                data-testid="textarea-ai-suggestion-edit"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSend(editedMessage)}
                  disabled={!editedMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-edited-suggestion"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {sendMessageMutation.isPending ? "Sending..." : "Send"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedMessage("");
                  }}
                  data-testid="button-cancel-edit"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 bg-background/60 rounded-md border">
                <p className="text-sm text-foreground leading-relaxed">
                  "{currentMessage}"
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSend(suggestedMessage)}
                  disabled={sendMessageMutation.isPending}
                  data-testid="button-send-ai-suggestion"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {sendMessageMutation.isPending ? "Sending..." : "Send"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditedMessage(suggestedMessage);
                    setIsEditing(true);
                  }}
                  data-testid="button-edit-ai-suggestion"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

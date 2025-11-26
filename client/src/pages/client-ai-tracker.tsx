import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Send, 
  Loader2, 
  Scale, 
  Apple, 
  Dumbbell, 
  Moon, 
  Droplets,
  Smile,
  Bot,
  User,
  Sparkles
} from "lucide-react";
import type { SmartLog, AIClassification } from "@shared/schema";
import { format, parseISO } from "date-fns";

const quickActions = [
  { id: "workout", label: "Workout", icon: Dumbbell, prompt: "I did a workout: " },
  { id: "meal", label: "Meal", icon: Apple, prompt: "I had a meal: " },
  { id: "weight", label: "Weight", icon: Scale, prompt: "My weight today is " },
  { id: "sleep", label: "Sleep", icon: Moon, prompt: "I slept " },
  { id: "water", label: "Water", icon: Droplets, prompt: "I drank " },
  { id: "mood", label: "Mood", icon: Smile, prompt: "Feeling " },
];

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "weight": return Scale;
    case "nutrition": return Apple;
    case "workout": return Dumbbell;
    case "sleep": return Moon;
    case "checkin_mood": return Smile;
    default: return Sparkles;
  }
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case "weight": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "nutrition": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "workout": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "sleep": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "checkin_mood": return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function getEventLabel(eventType: string): string {
  switch (eventType) {
    case "weight": return "Weight";
    case "nutrition": return "Nutrition";
    case "workout": return "Workout";
    case "sleep": return "Sleep";
    case "checkin_mood": return "Mood";
    default: return "Log";
  }
}

export default function ClientAITracker() {
  const [inputText, setInputText] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const storedClientId = localStorage.getItem("clientId");
    if (storedClientId) {
      setClientId(storedClientId);
    }
  }, []);

  const { data: logs, isLoading } = useQuery<SmartLog[]>({
    queryKey: ["/api/smart-logs", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const response = await apiRequest("GET", `/api/smart-logs/${clientId}?limit=50`);
      return response.json();
    },
    enabled: !!clientId,
    refetchInterval: 5000,
  });

  const createLogMutation = useMutation({
    mutationFn: async (data: { clientId: string; rawText: string; localDateForClient: string }) => {
      const response = await apiRequest("POST", "/api/smart-logs", data);
      return response.json();
    },
    onSuccess: () => {
      setInputText("");
      queryClient.invalidateQueries({ queryKey: ["/api/smart-logs", clientId] });
      toast({
        title: "Logged!",
        description: "Your entry is being processed by AI",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your log. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!inputText.trim() || !clientId) return;
    
    const today = new Date().toISOString().split("T")[0];
    createLogMutation.mutate({
      clientId,
      rawText: inputText.trim(),
      localDateForClient: today,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInputText(prompt);
    inputRef.current?.focus();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const sortedLogs = [...(logs || [])].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-primary/5 to-background">
      <div className="flex-shrink-0 p-4 sm:p-6 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground" data-testid="text-ai-tracker-title">
              AI Progress Tracker
            </h1>
            <p className="text-sm text-muted-foreground">Track your achievements</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5 hover-elevate"
                onClick={() => handleQuickAction(action.prompt)}
                data-testid={`button-quick-${action.id}`}
              >
                <action.icon className="w-3.5 h-3.5" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {!clientId ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-3/4" />
            ))}
          </div>
        ) : sortedLogs.length === 0 ? (
          <div className="flex flex-col items-start max-w-md">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card border rounded-2xl rounded-tl-sm p-4 shadow-sm">
                <p className="text-sm text-foreground">
                  Hi! I'm your AI assistant for tracking progress. I'll help you log workouts, nutrition, weight, sleep, and other metrics.
                </p>
                <p className="text-sm text-foreground mt-2">
                  What would you like to add today?
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(), "HH:mm")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-start max-w-md mb-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border rounded-2xl rounded-tl-sm p-4 shadow-sm">
                  <p className="text-sm text-foreground">
                    Hi! I'm your AI assistant for tracking progress. I'll help you log workouts, nutrition, weight, sleep, and other metrics.
                  </p>
                  <p className="text-sm text-foreground mt-2">
                    What would you like to add today?
                  </p>
                </div>
              </div>
            </div>

            {sortedLogs.map((log, index) => {
              const classification = log.aiClassificationJson as AIClassification | null;
              const detectedEvents = classification?.detected_event_types || [];
              
              return (
                <div key={log.id} className="space-y-3">
                  <div className="flex flex-col items-end max-w-md ml-auto" data-testid={`log-entry-${index}`}>
                    <div className="flex gap-3">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm p-4 shadow-sm">
                        <p className="text-sm">{log.rawText}</p>
                        <p className="text-xs opacity-70 mt-2">
                          {format(parseISO(log.createdAt), "HH:mm")}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {detectedEvents.length > 0 && (
                    <div className="flex flex-col items-start max-w-md">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                        <div className="bg-card border rounded-2xl rounded-tl-sm p-4 shadow-sm">
                          <p className="text-sm text-foreground mb-2">
                            Got it! I detected:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {detectedEvents.map((eventType) => {
                              const Icon = getEventIcon(eventType);
                              return (
                                <Badge 
                                  key={eventType}
                                  variant="secondary"
                                  className={`text-xs py-0.5 px-2 ${getEventColor(eventType)}`}
                                >
                                  <Icon className="w-3 h-3 mr-1" />
                                  {getEventLabel(eventType)}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4 border-t bg-background">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your progress..."
            className="flex-1 px-4 py-3 rounded-full border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-150"
            disabled={createLogMutation.isPending}
            data-testid="input-smart-log"
          />
          <Button
            onClick={handleSubmit}
            disabled={!inputText.trim() || createLogMutation.isPending}
            size="icon"
            className="rounded-full w-12 h-12"
            data-testid="button-submit-smart-log"
          >
            {createLogMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

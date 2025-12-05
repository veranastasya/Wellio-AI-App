import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Send, 
  Loader2, 
  Scale, 
  Apple, 
  Dumbbell, 
  Footprints, 
  Moon, 
  Heart,
  FileText,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2
} from "lucide-react";
import type { SmartLog, AIClassification, AIParsedData } from "@shared/schema";
import { format, parseISO, isToday, isYesterday, differenceInDays } from "date-fns";

interface SmartLogInputProps {
  clientId: string;
  onSuccess?: () => void;
}

export function SmartLogInput({ clientId, onSuccess }: SmartLogInputProps) {
  const [logText, setLogText] = useState("");
  const { toast } = useToast();

  const createLogMutation = useMutation({
    mutationFn: async (data: { clientId: string; rawText: string; localDateForClient: string }) => {
      const response = await apiRequest("POST", "/api/smart-logs", data);
      return response.json();
    },
    onSuccess: () => {
      setLogText("");
      queryClient.invalidateQueries({ queryKey: ["/api/smart-logs", clientId] });
      toast({
        title: "Log saved",
        description: "Your entry is being processed",
      });
      onSuccess?.();
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
    if (!logText.trim()) return;
    
    const today = new Date().toISOString().split("T")[0];
    createLogMutation.mutate({
      clientId,
      rawText: logText.trim(),
      localDateForClient: today,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="border-primary/20 hover-elevate transition-all duration-150">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Log Your Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Textarea
            placeholder="What did you do today? e.g., 'Ran 3 miles, ate about 1800 calories, slept 7 hours last night, feeling good energy 8/10'..."
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] resize-none"
            data-testid="input-smart-log"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Just describe your day - we'll handle the rest
            </p>
            <Button
              onClick={handleSubmit}
              disabled={!logText.trim() || createLogMutation.isPending}
              size="sm"
              data-testid="button-submit-smart-log"
            >
              {createLogMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Log Entry
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SmartLogFeedProps {
  clientId: string;
  limit?: number;
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case "weight":
      return Scale;
    case "nutrition":
      return Apple;
    case "workout":
      return Dumbbell;
    case "steps":
      return Footprints;
    case "sleep":
      return Moon;
    case "checkin_mood":
      return Heart;
    default:
      return FileText;
  }
}

function getEventColor(eventType: string): string {
  switch (eventType) {
    case "weight":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "nutrition":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "workout":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "steps":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "sleep":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "checkin_mood":
      return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getEventLabel(eventType: string): string {
  switch (eventType) {
    case "weight":
      return "Weight";
    case "nutrition":
      return "Nutrition";
    case "workout":
      return "Workout";
    case "steps":
      return "Steps";
    case "sleep":
      return "Sleep";
    case "checkin_mood":
      return "Mood";
    case "note":
      return "Note";
    default:
      return "Other";
  }
}

function formatRelativeDate(dateStr: string): string {
  const date = parseISO(dateStr);
  
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  
  const daysAgo = differenceInDays(new Date(), date);
  if (daysAgo < 7) return `${daysAgo} days ago`;
  
  return format(date, "MMM d, yyyy");
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    case "processing":
      return <Loader2 className="w-3 h-3 text-primary animate-spin" />;
    case "failed":
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    default:
      return <Clock className="w-3 h-3 text-muted-foreground" />;
  }
}

function ParsedDataDisplay({ parsedData }: { parsedData: AIParsedData | null }) {
  if (!parsedData) return null;

  const { nutrition, workout, weight, sleep, mood } = parsedData;
  const hasData = nutrition || workout || weight || sleep || mood;
  if (!hasData) return null;

  return (
    <div className="mt-3 space-y-2">
      {nutrition && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
          {nutrition.food_description && (
            <p className="font-medium text-green-800 dark:text-green-300 mb-2">
              {nutrition.food_description}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(nutrition.calories ?? nutrition.calories_est) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Calories:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.calories ?? nutrition.calories_est ?? 0)} kcal
                </span>
              </div>
            )}
            {(nutrition.protein_g ?? nutrition.protein_est_g) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Protein:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.protein_g ?? nutrition.protein_est_g ?? 0)}g
                </span>
              </div>
            )}
            {(nutrition.carbs_g ?? nutrition.carbs_est_g) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Carbs:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.carbs_g ?? nutrition.carbs_est_g ?? 0)}g
                </span>
              </div>
            )}
            {(nutrition.fat_g ?? nutrition.fat_est_g) && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Fat:</span>
                <span className="font-medium text-foreground">
                  ~{Math.round(nutrition.fat_g ?? nutrition.fat_est_g ?? 0)}g
                </span>
              </div>
            )}
          </div>
          {nutrition.estimated && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              AI-estimated ({Math.round((nutrition.confidence || 0) * 100)}% confidence)
            </p>
          )}
        </div>
      )}

      {workout && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-sm">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="font-medium text-orange-800 dark:text-orange-300 capitalize">
              {workout.type} workout
            </span>
            {workout.duration_min && (
              <span className="text-muted-foreground">
                {workout.duration_min} min
              </span>
            )}
            {workout.intensity !== "unknown" && (
              <span className="text-muted-foreground capitalize">
                {workout.intensity} intensity
              </span>
            )}
          </div>
          {workout.body_focus && workout.body_focus.length > 0 && workout.body_focus[0] !== "unspecified" && (
            <p className="text-xs text-muted-foreground mt-1">
              Focus: {workout.body_focus.join(", ")}
            </p>
          )}
          {workout.notes && (
            <p className="text-xs text-foreground mt-1">{workout.notes}</p>
          )}
        </div>
      )}

      {weight && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300">
            Weight: {weight.value} {weight.unit}
          </p>
        </div>
      )}

      {sleep && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-sm">
          <p className="font-medium text-indigo-800 dark:text-indigo-300">
            Sleep: {sleep.hours} hours
            {sleep.quality && ` (${sleep.quality} quality)`}
          </p>
        </div>
      )}

      {mood && (
        <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 text-sm">
          <p className="font-medium text-pink-800 dark:text-pink-300">
            Mood: {mood.rating}/10
            {mood.notes && ` - ${mood.notes}`}
          </p>
        </div>
      )}
    </div>
  );
}

function SmartLogCard({ log }: { log: SmartLog }) {
  const classification = log.aiClassificationJson as AIClassification | null;
  const detectedEvents = classification?.detected_event_types || [];
  const parsedData = log.aiParsedJson as AIParsedData | null;

  return (
    <div className="p-4 rounded-lg border bg-card hover-elevate transition-all duration-150" data-testid={`smart-log-card-${log.id}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm text-foreground flex-1">{log.rawText}</p>
        {getStatusIcon(log.processingStatus)}
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-xs text-muted-foreground">
          {formatRelativeDate(log.localDateForClient)}
        </span>
        
        {detectedEvents.length > 0 && (
          <div className="flex flex-wrap gap-1">
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
        )}
        
        {log.processingStatus === "pending" && (
          <Badge variant="outline" className="text-xs py-0.5">
            <Clock className="w-3 h-3 mr-1" />
            Processing...
          </Badge>
        )}
      </div>
      
      <ParsedDataDisplay parsedData={parsedData} />
    </div>
  );
}

export function SmartLogFeed({ clientId, limit = 10 }: SmartLogFeedProps) {
  const { data: logs, isLoading } = useQuery<SmartLog[]>({
    queryKey: ["/api/smart-logs", clientId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/smart-logs/${clientId}?limit=${limit}`);
      return response.json();
    },
    refetchInterval: 5000, // Poll for updates
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No entries yet. Start logging your progress above!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log) => (
            <SmartLogCard key={log.id} log={log} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SmartLogWidget({ clientId }: { clientId: string }) {
  return (
    <div className="space-y-4">
      <SmartLogInput clientId={clientId} />
      <SmartLogFeed clientId={clientId} limit={5} />
    </div>
  );
}

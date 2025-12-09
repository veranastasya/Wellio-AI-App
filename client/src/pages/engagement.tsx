import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Bell,
  MessageSquare,
  Smartphone,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Utensils,
  Dumbbell,
  Moon,
  TrendingDown,
  Send,
  Edit3,
  X,
  ChevronRight,
  Zap,
  Bot,
  User,
  Activity,
} from "lucide-react";
import type { Client } from "@shared/schema";

type ActivityEvent = {
  id: string;
  type: "log" | "inactivity" | "missed_task";
  category: "nutrition" | "workout" | "sleep" | "general";
  title: string;
  description: string;
  timestamp: string;
};

type Trigger = {
  id: string;
  description: string;
  severity: "Low" | "Medium" | "High";
  detectedAt: string;
};

type Recommendation = {
  id: string;
  reason: string;
  suggestedMessage: string;
  priority: "low" | "medium" | "high";
};

type AutoSuggestion = {
  id: string;
  type: "trend" | "engagement" | "pattern";
  title: string;
  description: string;
};

const mockActivityEvents: ActivityEvent[] = [
  {
    id: "1",
    type: "log",
    category: "nutrition",
    title: "Logged breakfast",
    description: "Oatmeal with berries - 450 cal",
    timestamp: "2024-12-09T08:30:00",
  },
  {
    id: "2",
    type: "log",
    category: "workout",
    title: "Completed training task",
    description: "Upper body strength - 45 mins",
    timestamp: "2024-12-09T10:15:00",
  },
  {
    id: "3",
    type: "inactivity",
    category: "general",
    title: "No activity for 6 hours",
    description: "Last activity was at 10:15 AM",
    timestamp: "2024-12-09T16:15:00",
  },
  {
    id: "4",
    type: "missed_task",
    category: "nutrition",
    title: "Task not completed: Log lunch",
    description: "Expected by 2:00 PM",
    timestamp: "2024-12-09T14:00:00",
  },
  {
    id: "5",
    type: "log",
    category: "sleep",
    title: "Sleep logged",
    description: "7.5 hours - Quality: Good",
    timestamp: "2024-12-09T07:00:00",
  },
];

const mockTriggers: Trigger[] = [
  {
    id: "1",
    description: "Missing lunch log - no meal entry since 8:30 AM",
    severity: "Medium",
    detectedAt: "2024-12-09T14:30:00",
  },
  {
    id: "2",
    description: "No login for 8+ hours (unusual pattern)",
    severity: "High",
    detectedAt: "2024-12-09T18:30:00",
  },
  {
    id: "3",
    description: "Deviation from workout routine this week",
    severity: "Low",
    detectedAt: "2024-12-09T12:00:00",
  },
];

const mockRecommendations: Recommendation[] = [
  {
    id: "1",
    reason: "Client has not logged lunch",
    suggestedMessage: "Hey! Just checking in - how did lunch go today? Don't forget to log it when you get a chance!",
    priority: "medium",
  },
  {
    id: "2",
    reason: "No activity in 8 hours",
    suggestedMessage: "Hope your day is going well! Haven't seen you in a bit - everything okay?",
    priority: "high",
  },
  {
    id: "3",
    reason: "Missed 2 workouts this week",
    suggestedMessage: "I noticed the workouts have been lighter this week. Want to chat about adjusting your schedule?",
    priority: "low",
  },
];

const mockAutoSuggestions: AutoSuggestion[] = [
  {
    id: "1",
    type: "trend",
    title: "Sleep quality declining",
    description: "Average sleep quality dropped 15% over the past week. Consider discussing sleep habits.",
  },
  {
    id: "2",
    type: "engagement",
    title: "Engagement drop detected",
    description: "Logging frequency decreased by 40% compared to last week.",
  },
  {
    id: "3",
    type: "pattern",
    title: "Weekend pattern identified",
    description: "Client consistently misses logging on Saturdays. Consider weekend check-in.",
  },
];

const quickActions = [
  { id: "checkin", label: "Send Check-In", icon: MessageSquare, message: "Hey! Just wanted to check in and see how you're doing today. How are you feeling?" },
  { id: "meals", label: "Ask About Meals", icon: Utensils, message: "How's your nutrition going today? Remember to log your meals when you get a chance!" },
  { id: "training", label: "Prompt Training Log", icon: Dumbbell, message: "Did you get a workout in today? Don't forget to log it so we can track your progress!" },
];

function getEventIcon(category: string) {
  switch (category) {
    case "nutrition":
      return Utensils;
    case "workout":
      return Dumbbell;
    case "sleep":
      return Moon;
    default:
      return Activity;
  }
}

function getEventColor(type: string) {
  switch (type) {
    case "log":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "inactivity":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "missed_task":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "Low":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "Medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "High":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "low":
      return "border-l-blue-500";
    case "medium":
      return "border-l-amber-500";
    case "high":
      return "border-l-red-500";
    default:
      return "border-l-muted";
  }
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function ClientActivityTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Client Engagement Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[280px]">
          <div className="px-4 pb-4 space-y-3">
            {events.map((event) => {
              const Icon = getEventIcon(event.category);
              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 p-3 rounded-lg ${getEventColor(event.type)}`}
                  data-testid={`activity-event-${event.id}`}
                >
                  <div className="mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <span className="text-xs opacity-75 shrink-0">{formatTime(event.timestamp)}</span>
                    </div>
                    <p className="text-xs opacity-80 mt-0.5">{event.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AITriggerDetection({ triggers, onGenerateReminder }: { triggers: Trigger[]; onGenerateReminder: (trigger: Trigger) => void }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4" />
          AI Trigger Detection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {triggers.map((trigger) => (
          <div
            key={trigger.id}
            className="p-3 rounded-lg border bg-card"
            data-testid={`trigger-${trigger.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm">{trigger.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={getSeverityColor(trigger.severity)}>
                    {trigger.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(trigger.detectedAt)}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onGenerateReminder(trigger)}
                data-testid={`button-generate-reminder-${trigger.id}`}
              >
                <Bell className="w-3 h-3 mr-1" />
                Generate
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ReminderSettings() {
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [frequency, setFrequency] = useState([3]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Reminder Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">SMS</span>
            </div>
            <Switch
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
              data-testid="toggle-sms"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Web Push</span>
            </div>
            <Switch
              checked={pushEnabled}
              onCheckedChange={setPushEnabled}
              data-testid="toggle-push"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">In-App</span>
            </div>
            <Switch
              checked={inAppEnabled}
              onCheckedChange={setInAppEnabled}
              data-testid="toggle-inapp"
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Nudge Frequency</span>
            <span className="text-xs text-muted-foreground">Max {frequency[0]} per day</span>
          </div>
          <Slider
            value={frequency}
            onValueChange={setFrequency}
            min={1}
            max={10}
            step={1}
            className="w-full"
            data-testid="slider-frequency"
          />
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Next reminder in: <strong>3 hours</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}

function AIRecommendations({
  recommendations,
  onSend,
  onEdit,
  onDismiss,
}: {
  recommendations: Recommendation[];
  onSend: (rec: Recommendation) => void;
  onEdit: (rec: Recommendation) => void;
  onDismiss: (rec: Recommendation) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Bot className="w-4 h-4" />
          AI Recommendations for Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`p-3 rounded-lg border border-l-4 bg-card ${getPriorityColor(rec.priority)}`}
            data-testid={`recommendation-${rec.id}`}
          >
            <p className="text-xs text-muted-foreground mb-1">{rec.reason}</p>
            <p className="text-sm mb-3">{rec.suggestedMessage}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onSend(rec)}
                data-testid={`button-send-${rec.id}`}
              >
                <Send className="w-3 h-3 mr-1" />
                Send
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(rec)}
                data-testid={`button-edit-${rec.id}`}
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(rec)}
                data-testid={`button-dismiss-${rec.id}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function QuickActions({ onAction }: { onAction: (action: typeof quickActions[0]) => void }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => onAction(action)}
              data-testid={`button-quick-action-${action.id}`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {action.label}
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AutoSuggestions({ suggestions }: { suggestions: AutoSuggestion[] }) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "trend":
        return TrendingDown;
      case "engagement":
        return Activity;
      case "pattern":
        return Clock;
      default:
        return AlertTriangle;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "trend":
        return "text-amber-600 dark:text-amber-400";
      case "engagement":
        return "text-red-600 dark:text-red-400";
      case "pattern":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Auto-Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => {
          const Icon = getTypeIcon(suggestion.type);
          return (
            <div
              key={suggestion.id}
              className="p-3 rounded-lg border bg-card"
              data-testid={`suggestion-${suggestion.id}`}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-4 h-4 mt-0.5 ${getTypeColor(suggestion.type)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ChannelSimulation() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Channel Simulation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">SMS Preview</p>
          <div className="bg-muted rounded-2xl rounded-bl-sm p-3 max-w-[250px]">
            <p className="text-sm">Hey! Just checking in - how did lunch go today?</p>
          </div>
        </div>
        
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Web Push Preview</p>
          <div className="border rounded-lg p-3 flex items-start gap-3 max-w-[300px]">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Wellio</p>
              <p className="text-xs text-muted-foreground truncate">Coach sent you a message</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">In-App Notification</p>
          <div className="border rounded-lg p-3 bg-card flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">New message from Coach</p>
              <p className="text-xs text-muted-foreground">Just now</p>
            </div>
            <Badge variant="default">New</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RightPanelContent({
  recommendations,
  suggestions,
  onSendRecommendation,
  onEditRecommendation,
  onDismissRecommendation,
  onQuickAction,
}: {
  recommendations: Recommendation[];
  suggestions: AutoSuggestion[];
  onSendRecommendation: (rec: Recommendation) => void;
  onEditRecommendation: (rec: Recommendation) => void;
  onDismissRecommendation: (rec: Recommendation) => void;
  onQuickAction: (action: typeof quickActions[0]) => void;
}) {
  return (
    <div className="space-y-4">
      <AIRecommendations
        recommendations={recommendations}
        onSend={onSendRecommendation}
        onEdit={onEditRecommendation}
        onDismiss={onDismissRecommendation}
      />
      <QuickActions onAction={onQuickAction} />
      <AutoSuggestions suggestions={suggestions} />
      <ChannelSimulation />
    </div>
  );
}

export default function Engagement() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleGenerateReminder = (trigger: Trigger) => {
    setModalTitle("Generated Reminder");
    setCurrentMessage(`Hi ${selectedClient?.name || "there"}! ${trigger.description.includes("lunch") ? "Just a friendly reminder to log your lunch when you get a chance!" : "Just checking in to see how things are going!"}`);
    setMessageModalOpen(true);
  };

  const handleSendRecommendation = (rec: Recommendation) => {
    setModalTitle("Send Message");
    setCurrentMessage(rec.suggestedMessage);
    setMessageModalOpen(true);
  };

  const handleEditRecommendation = (rec: Recommendation) => {
    setModalTitle("Edit Message");
    setCurrentMessage(rec.suggestedMessage);
    setMessageModalOpen(true);
  };

  const handleDismissRecommendation = (rec: Recommendation) => {
    console.log("Dismissed recommendation:", rec.id);
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    setModalTitle(action.label);
    setCurrentMessage(action.message);
    setMessageModalOpen(true);
  };

  const handleSendMessage = () => {
    console.log("Sending message:", currentMessage);
    setMessageModalOpen(false);
    setCurrentMessage("");
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="heading-engagement">
            Engagement
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            AI-powered reminders and client activity monitoring
          </p>
        </div>

        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-full sm:w-64" data-testid="select-client">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedClientId ? (
        <Card className="p-8 text-center">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Client</h3>
          <p className="text-muted-foreground">
            Choose a client from the dropdown above to view their engagement data and AI recommendations.
          </p>
        </Card>
      ) : (
        <>
          <div className="hidden lg:grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <ClientActivityTimeline events={mockActivityEvents} />
              <AITriggerDetection
                triggers={mockTriggers}
                onGenerateReminder={handleGenerateReminder}
              />
              <ReminderSettings />
            </div>
            <div>
              <RightPanelContent
                recommendations={mockRecommendations}
                suggestions={mockAutoSuggestions}
                onSendRecommendation={handleSendRecommendation}
                onEditRecommendation={handleEditRecommendation}
                onDismissRecommendation={handleDismissRecommendation}
                onQuickAction={handleQuickAction}
              />
            </div>
          </div>

          <div className="lg:hidden space-y-4">
            <ClientActivityTimeline events={mockActivityEvents} />
            <AITriggerDetection
              triggers={mockTriggers}
              onGenerateReminder={handleGenerateReminder}
            />
            <ReminderSettings />
            
            <Sheet>
              <SheetTrigger asChild>
                <Button className="w-full" data-testid="button-open-coach-panel">
                  <Bot className="w-4 h-4 mr-2" />
                  Coach Recommendations
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Coach Recommendation Panel
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(85vh-60px)] mt-4">
                  <div className="pr-4">
                    <RightPanelContent
                      recommendations={mockRecommendations}
                      suggestions={mockAutoSuggestions}
                      onSendRecommendation={handleSendRecommendation}
                      onEditRecommendation={handleEditRecommendation}
                      onDismissRecommendation={handleDismissRecommendation}
                      onQuickAction={handleQuickAction}
                    />
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </>
      )}

      <Dialog open={messageModalOpen} onOpenChange={setMessageModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Enter your message..."
              className="min-h-[120px]"
              data-testid="textarea-message"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Sending to: {selectedClient?.name || "Client"}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} data-testid="button-send-message">
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

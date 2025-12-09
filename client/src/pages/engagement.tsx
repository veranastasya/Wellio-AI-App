import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Client } from "@shared/schema";

import {
  ActivityTimeline,
  TriggerList,
  ReminderSettings,
  RecommendationCard,
  QuickActions,
  AutoSuggestions,
  NotificationPreview,
  EditMessageModal,
  type ActivityEvent,
  type Trigger,
  type Recommendation,
  type AutoSuggestion,
  type QuickActionItem,
} from "@/components/engagement";

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
  {
    id: "6",
    type: "log",
    category: "nutrition",
    title: "Logged dinner",
    description: "Grilled chicken with vegetables - 680 cal",
    timestamp: "2024-12-08T19:30:00",
  },
  {
    id: "7",
    type: "log",
    category: "workout",
    title: "Morning run",
    description: "5K run - 28 mins",
    timestamp: "2024-12-08T07:00:00",
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
  onQuickAction: (action: QuickActionItem) => void;
}) {
  return (
    <div className="space-y-4">
      <RecommendationCard
        recommendations={recommendations}
        onSend={onSendRecommendation}
        onEdit={onEditRecommendation}
        onDismiss={onDismissRecommendation}
      />
      <QuickActions onAction={onQuickAction} />
      <AutoSuggestions suggestions={suggestions} />
      <NotificationPreview />
    </div>
  );
}

export default function Engagement() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [dismissedRecommendations, setDismissedRecommendations] = useState<string[]>([]);

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const filteredRecommendations = mockRecommendations.filter(
    (rec) => !dismissedRecommendations.includes(rec.id)
  );

  const handleSendMessage = (message: string) => {
    toast({
      title: "Message Sent",
      description: `Your message to ${selectedClient?.name || "the client"} has been sent successfully.`,
    });
    setMessageModalOpen(false);
  };

  const handleSendReminder = (trigger: Trigger, message: string) => {
    toast({
      title: "Reminder Sent",
      description: `Reminder sent to ${selectedClient?.name || "the client"}.`,
    });
  };

  const handleSendRecommendation = (rec: Recommendation) => {
    setModalTitle("Send Recommendation");
    setCurrentMessage(rec.suggestedMessage);
    setMessageModalOpen(true);
  };

  const handleEditRecommendation = (rec: Recommendation) => {
    setModalTitle("Edit Message");
    setCurrentMessage(rec.suggestedMessage);
    setMessageModalOpen(true);
  };

  const handleDismissRecommendation = (rec: Recommendation) => {
    setDismissedRecommendations((prev) => [...prev, rec.id]);
    toast({
      title: "Recommendation Dismissed",
      description: "The recommendation has been dismissed.",
    });
  };

  const handleQuickAction = (action: QuickActionItem) => {
    setModalTitle(action.label);
    setCurrentMessage(action.message);
    setMessageModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
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
              <SelectItem key={client.id} value={client.id} data-testid={`select-client-${client.id}`}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedClientId ? (
        <Card className="p-12 text-center border-dashed">
          <User className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Select a Client</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Choose a client from the dropdown above to view their engagement data, 
            activity timeline, and AI-powered recommendations.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-2">
            <h2 className="text-lg font-semibold text-foreground">Client Activity</h2>
            <p className="text-sm text-muted-foreground">Recent activity and trigger detection</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <ActivityTimeline events={mockActivityEvents} />
              <TriggerList
                triggers={mockTriggers}
                clientName={selectedClient?.name}
                onSendReminder={handleSendReminder}
              />
              <ReminderSettings />
            </div>
            
            <div className="space-y-4">
              <div className="hidden lg:block">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Coach Tools</h2>
                  <p className="text-sm text-muted-foreground">AI recommendations and quick actions</p>
                </div>
                <RightPanelContent
                  recommendations={filteredRecommendations}
                  suggestions={mockAutoSuggestions}
                  onSendRecommendation={handleSendRecommendation}
                  onEditRecommendation={handleEditRecommendation}
                  onDismissRecommendation={handleDismissRecommendation}
                  onQuickAction={handleQuickAction}
                />
              </div>
              
              <div className="lg:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button className="w-full" size="lg" data-testid="button-open-coach-panel">
                      <Bot className="w-5 h-5 mr-2" />
                      Open Coach Recommendations
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh]">
                    <SheetHeader className="pb-4 border-b">
                      <SheetTitle className="flex items-center gap-2 text-lg">
                        <Bot className="w-5 h-5 text-primary" />
                        Coach Recommendation Panel
                      </SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(85vh-80px)] mt-4">
                      <div className="pr-4 pb-4">
                        <RightPanelContent
                          recommendations={filteredRecommendations}
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
            </div>
          </div>
        </>
      )}

      <EditMessageModal
        open={messageModalOpen}
        onOpenChange={setMessageModalOpen}
        title={modalTitle}
        initialMessage={currentMessage}
        recipientName={selectedClient?.name || "Client"}
        onSend={handleSendMessage}
      />
    </div>
  );
}

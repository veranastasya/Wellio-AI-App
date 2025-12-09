import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User } from "lucide-react";
import type { Client } from "@shared/schema";

import { useEngagement } from "@/context/EngagementContext";
import {
  ActivityTimeline,
  TriggerList,
  ReminderSettings,
  RecommendationCard,
  QuickActions,
  AutoSuggestions,
  NotificationPreview,
  EditMessageModal,
  type QuickActionItem,
  type AutoSuggestion,
} from "@/components/engagement";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
  onQuickAction,
}: {
  onQuickAction: (action: QuickActionItem) => void;
}) {
  const {
    recommendations,
    sendRecommendation,
    dismissRecommendation,
  } = useEngagement();

  const pendingRecommendations = recommendations
    .filter(r => r.status === 'pending')
    .map(r => ({
      id: r.id,
      reason: r.reason,
      suggestedMessage: r.message,
      priority: r.priority,
    }));

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState("");
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSend = (rec: { id: string }) => {
    sendRecommendation(rec.id);
  };

  const handleEdit = (rec: { id: string; suggestedMessage: string }) => {
    setEditingRecId(rec.id);
    setEditingMessage(rec.suggestedMessage);
    setEditModalOpen(true);
  };

  const handleDismiss = (rec: { id: string }) => {
    dismissRecommendation(rec.id);
  };

  const handleEditSend = (message: string) => {
    if (editingRecId) {
      console.log(`[Engagement] Sending edited message for recommendation ${editingRecId}: "${message.substring(0, 50)}..."`);
      sendRecommendation(editingRecId);
    }
    setEditModalOpen(false);
    setEditingRecId(null);
  };

  return (
    <div className="space-y-4">
      <RecommendationCard
        recommendations={pendingRecommendations}
        onSend={handleSend}
        onEdit={handleEdit}
        onDismiss={handleDismiss}
      />
      <QuickActions onAction={onQuickAction} />
      <AutoSuggestions suggestions={mockAutoSuggestions} />
      <NotificationPreview />
      
      <EditMessageModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title="Edit Message"
        initialMessage={editingMessage}
        recipientName="Client"
        onSend={handleEditSend}
      />
    </div>
  );
}

export default function Engagement() {
  const { toast } = useToast();
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");

  const {
    activityFeed,
    triggers,
    notificationPreferences,
    selectedClientId,
    isLoading: engagementLoading,
    selectClient,
    sendRecommendation,
  } = useEngagement();

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const isLoading = clientsLoading || engagementLoading;

  useEffect(() => {
    if (selectedClientId) {
      console.log(`[Engagement] Client selected: ${selectedClientId}`);
    }
  }, [selectedClientId]);

  const handleClientChange = (clientId: string) => {
    selectClient(clientId);
  };

  const handleSendMessage = (message: string) => {
    console.log(`[Engagement] Sending message: "${message.substring(0, 50)}..."`);
    toast({
      title: "Message Sent",
      description: `Your message to ${selectedClient?.name || "the client"} has been sent successfully.`,
    });
    setMessageModalOpen(false);
  };

  const handleSendReminder = (trigger: { id: string; description: string }, message: string) => {
    console.log(`[Engagement] Reminder sent for trigger ${trigger.id}: "${message.substring(0, 50)}..."`);
    toast({
      title: "Reminder Sent",
      description: `Reminder sent to ${selectedClient?.name || "the client"}.`,
    });
  };

  const handleQuickAction = (action: QuickActionItem) => {
    console.log(`[Engagement] Quick action triggered: ${action.label}`);
    setModalTitle(action.label);
    setCurrentMessage(action.message);
    setMessageModalOpen(true);
  };

  const timelineEvents = activityFeed.map(event => ({
    id: event.id,
    type: event.type,
    category: event.category,
    title: event.title,
    description: event.description,
    timestamp: event.timestamp,
  }));

  const triggerListItems = triggers.map(trigger => ({
    id: trigger.id,
    description: trigger.reason,
    severity: trigger.severity,
    detectedAt: trigger.detectedAt,
  }));

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

        <Select value={selectedClientId || ""} onValueChange={handleClientChange}>
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
            <p className="text-sm text-muted-foreground">
              Recent activity and trigger detection for {selectedClient?.name || 'this client'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <ActivityTimeline events={timelineEvents} />
              <TriggerList
                triggers={triggerListItems}
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
                <RightPanelContent onQuickAction={handleQuickAction} />
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
                        <RightPanelContent onQuickAction={handleQuickAction} />
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

import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User } from "lucide-react";
import type { Client, InsertMessage } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { useEngagement } from "@/context/EngagementContext";
import {
  ActivityTimeline,
  TriggerList,
  RecommendationCard,
  QuickActions,
  EditMessageModal,
  type QuickActionItem,
} from "@/components/engagement";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

  // Limit to max 3 pending recommendations for cleaner UI
  const pendingRecommendations = recommendations
    .filter(r => r.status === 'pending')
    .slice(0, 3)
    .map(r => ({
      id: r.id,
      reason: r.reason,
      suggestedMessage: r.message,
      priority: r.priority,
    }));

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState("");
  const [editingRecId, setEditingRecId] = useState<string | null>(null);

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
  const [isSendingTrigger, setIsSendingTrigger] = useState(false);
  const [triggerSendSuccess, setTriggerSendSuccess] = useState(false);

  const {
    activityFeed,
    triggers,
    selectedClientId,
    isLoading: engagementLoading,
    selectClient,
  } = useEngagement();

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const isLoading = clientsLoading || engagementLoading;

  // Mutation to send real messages via the API (for Quick Actions)
  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      return await apiRequest("POST", "/api/coach/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/messages"] });
      toast({
        title: "Message Sent",
        description: `Your message to ${selectedClient?.name || "the client"} has been sent successfully.`,
      });
      setMessageModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation for trigger reminders (separate so we can track sending state for TriggerList)
  const sendTriggerMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      return await apiRequest("POST", "/api/coach/messages", data);
    },
    onMutate: () => {
      setIsSendingTrigger(true);
      setTriggerSendSuccess(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/messages"] });
      toast({
        title: "Reminder Sent",
        description: `Your reminder to ${selectedClient?.name || "the client"} has been sent.`,
      });
      setIsSendingTrigger(false);
      setTriggerSendSuccess(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reminder. Please try again.",
        variant: "destructive",
      });
      setIsSendingTrigger(false);
      // Don't set success to true - keep modal open for retry
    },
  });

  useEffect(() => {
    if (selectedClientId) {
      console.log(`[Engagement] Client selected: ${selectedClientId}`);
    }
  }, [selectedClientId]);

  const handleClientChange = (clientId: string) => {
    selectClient(clientId);
  };

  const handleSendMessage = (message: string) => {
    if (!selectedClientId || !selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }

    const newMessage: InsertMessage = {
      clientId: selectedClientId,
      clientName: selectedClient.name,
      content: message,
      sender: "coach",
      timestamp: new Date().toISOString(),
      read: false,
    };

    sendMessageMutation.mutate(newMessage);
  };

  const handleSendReminder = (trigger: { id: string; description: string }, message: string) => {
    if (!selectedClientId || !selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client first",
        variant: "destructive",
      });
      return;
    }

    const newMessage: InsertMessage = {
      clientId: selectedClientId,
      clientName: selectedClient.name,
      content: message,
      sender: "coach",
      timestamp: new Date().toISOString(),
      read: false,
    };

    sendTriggerMutation.mutate(newMessage);
  };

  const handleQuickAction = (action: QuickActionItem) => {
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
            Monitor activity and take action
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
            Choose a client from the dropdown to view their activity and AI recommendations.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: What happened? */}
          <div className="space-y-4">
            <div className="mb-2">
              <h2 className="text-base font-semibold text-foreground">What happened?</h2>
              <p className="text-sm text-muted-foreground">
                Activity & alerts for {selectedClient?.name}
              </p>
            </div>
            <ActivityTimeline events={timelineEvents} />
            <TriggerList
              triggers={triggerListItems}
              clientName={selectedClient?.name}
              onSendReminder={handleSendReminder}
              isSending={isSendingTrigger}
              onSendSuccess={triggerSendSuccess}
            />
          </div>
          
          {/* RIGHT: What should coach do? */}
          <div className="space-y-4">
            <div className="hidden lg:block">
              <div className="mb-2">
                <h2 className="text-base font-semibold text-foreground">What to do?</h2>
                <p className="text-sm text-muted-foreground">AI recommendations & quick actions</p>
              </div>
              <RightPanelContent onQuickAction={handleQuickAction} />
            </div>
            
            {/* Mobile: Bottom sheet for coach tools */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="w-full" size="lg" data-testid="button-open-coach-panel">
                    <Bot className="w-5 h-5 mr-2" />
                    View Recommendations
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[70vh]">
                  <SheetHeader className="pb-4 border-b">
                    <SheetTitle className="flex items-center gap-2 text-lg">
                      <Bot className="w-5 h-5 text-primary" />
                      What to do?
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(70vh-80px)] mt-4">
                    <div className="pr-4 pb-4">
                      <RightPanelContent onQuickAction={handleQuickAction} />
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      )}

      <EditMessageModal
        open={messageModalOpen}
        onOpenChange={setMessageModalOpen}
        title={modalTitle}
        initialMessage={currentMessage}
        recipientName={selectedClient?.name || "Client"}
        onSend={handleSendMessage}
        isSending={sendMessageMutation.isPending}
      />
    </div>
  );
}

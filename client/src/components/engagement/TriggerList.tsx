import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Bell, AlertTriangle, AlertCircle, Info, Send, Sparkles } from "lucide-react";
import type { Trigger } from "./types";
import { format, parseISO } from "date-fns";

interface TriggerListProps {
  triggers: Trigger[];
  clientName?: string;
  onSendReminder?: (trigger: Trigger, message: string) => void;
  isSending?: boolean;
  onSendSuccess?: boolean;
}

function getSeverityStyles(severity: string) {
  switch (severity) {
    case "High":
      return {
        icon: AlertTriangle,
        badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
        iconColor: "text-red-500",
        border: "border-l-red-500",
        glow: "shadow-red-500/10",
      };
    case "Medium":
      return {
        icon: AlertCircle,
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        iconColor: "text-amber-500",
        border: "border-l-amber-500",
        glow: "shadow-amber-500/10",
      };
    case "Low":
      return {
        icon: Info,
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        iconColor: "text-blue-500",
        border: "border-l-blue-500",
        glow: "shadow-blue-500/10",
      };
    default:
      return {
        icon: Info,
        badge: "bg-muted text-muted-foreground border-border",
        iconColor: "text-muted-foreground",
        border: "border-l-muted",
        glow: "",
      };
  }
}

function formatTime(timestamp: string) {
  return format(parseISO(timestamp), "h:mm a");
}

function generateReminderMessage(trigger: Trigger, clientName: string): string {
  const name = clientName || "there";
  
  if (trigger.description.toLowerCase().includes("lunch") || trigger.description.toLowerCase().includes("meal")) {
    return `Hi ${name}! Just a friendly reminder to log your lunch when you get a chance. Tracking your meals helps us keep your nutrition on point! 🍽️`;
  }
  if (trigger.description.toLowerCase().includes("login") || trigger.description.toLowerCase().includes("hours")) {
    return `Hey ${name}! Haven't seen you in a bit - hope everything's going well! Just wanted to check in and see how you're doing today.`;
  }
  if (trigger.description.toLowerCase().includes("workout") || trigger.description.toLowerCase().includes("routine")) {
    return `Hi ${name}! I noticed your training routine has been a bit different this week. No worries - just wanted to check in. Want to chat about adjusting your schedule?`;
  }
  return `Hi ${name}! Just checking in to see how things are going. Let me know if you need any support!`;
}

export function TriggerList({ triggers, clientName = "Client", onSendReminder, isSending = false, onSendSuccess = false }: TriggerListProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const prevSuccessRef = useRef(onSendSuccess);
  
  // Close modal only when send succeeds (onSendSuccess goes from false to true)
  useEffect(() => {
    if (!prevSuccessRef.current && onSendSuccess && modalOpen) {
      setModalOpen(false);
      setSelectedTrigger(null);
      setReminderMessage("");
    }
    prevSuccessRef.current = onSendSuccess;
  }, [onSendSuccess, modalOpen]);

  const handleGenerateReminder = (trigger: Trigger) => {
    setSelectedTrigger(trigger);
    setReminderMessage(generateReminderMessage(trigger, clientName));
    setModalOpen(true);
  };

  const handleSendReminder = () => {
    if (selectedTrigger && onSendReminder && reminderMessage.trim()) {
      onSendReminder(selectedTrigger, reminderMessage);
    }
  };
  
  const handleCloseModal = () => {
    if (!isSending) {
      setModalOpen(false);
      setSelectedTrigger(null);
      setReminderMessage("");
    }
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            AI Trigger Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {triggers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No triggers detected</p>
            </div>
          ) : (
            triggers.map((trigger) => {
              const styles = getSeverityStyles(trigger.severity);
              const SeverityIcon = styles.icon;
              
              return (
                <div
                  key={trigger.id}
                  className={`p-4 rounded-lg border border-l-4 bg-card hover-elevate transition-all ${styles.border} ${styles.glow}`}
                  data-testid={`trigger-${trigger.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${styles.iconColor}`}>
                      <SeverityIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{trigger.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className={`text-xs ${styles.badge}`}>
                          {trigger.severity} Priority
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Detected at {formatTime(trigger.detectedAt)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateReminder(trigger)}
                      className="shrink-0"
                      data-testid={`button-generate-reminder-${trigger.id}`}
                    >
                      <Bell className="w-3.5 h-3.5 mr-1.5" />
                      Generate
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI-Generated Reminder
            </DialogTitle>
            <DialogDescription>
              Review and customize the AI-generated reminder before sending.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedTrigger && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs font-medium text-muted-foreground mb-1">Trigger</p>
                <p className="text-sm">{selectedTrigger.description}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message Preview</label>
              <Textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                className="min-h-[120px] resize-none"
                data-testid="textarea-reminder-message"
              />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm">
                Sending to: <strong>{clientName}</strong>
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCloseModal} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={handleSendReminder} disabled={isSending || !reminderMessage.trim()} data-testid="button-send-reminder">
              <Send className="w-4 h-4 mr-2" />
              {isSending ? "Sending..." : "Send Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

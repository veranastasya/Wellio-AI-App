import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, ChevronRight, MessageSquare, Utensils, Dumbbell } from "lucide-react";
import type { QuickActionItem } from "./types";

const defaultQuickActions: QuickActionItem[] = [
  {
    id: "checkin",
    label: "Send Check-In",
    icon: MessageSquare,
    message: "Hey! Just wanted to check in and see how you're doing today. How are you feeling?",
  },
  {
    id: "meals",
    label: "Ask About Meals",
    icon: Utensils,
    message: "How's your nutrition going today? Remember to log your meals when you get a chance!",
  },
  {
    id: "training",
    label: "Prompt Training Log",
    icon: Dumbbell,
    message: "Did you get a workout in today? Don't forget to log it so we can track your progress!",
  },
];

interface QuickActionsProps {
  actions?: QuickActionItem[];
  onAction: (action: QuickActionItem) => void;
}

export function QuickActions({ actions = defaultQuickActions, onAction }: QuickActionsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              className="w-full justify-start h-auto py-3 px-4 hover-elevate"
              onClick={() => onAction(action)}
              data-testid={`button-quick-action-${action.id}`}
            >
              <div className="p-2 rounded-lg bg-primary/10 mr-3">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium">{action.label}</span>
              <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}

export { defaultQuickActions };

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Bell, MessageSquare, User } from "lucide-react";

interface NotificationPreviewProps {
  message?: string;
  coachName?: string;
}

export function NotificationPreview({
  message = "Hey! Just checking in - how did lunch go today?",
  coachName = "Your Coach",
}: NotificationPreviewProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          Channel Simulation
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
              SMS
            </Badge>
          </div>
          <div className="relative">
            <div className="bg-emerald-500 text-white rounded-2xl rounded-bl-sm p-3 max-w-[280px] shadow-sm">
              <p className="text-sm leading-relaxed">{message}</p>
            </div>
            <div className="absolute -bottom-1 left-0 w-2 h-2 bg-emerald-500 transform rotate-45" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">
              Web Push
            </Badge>
          </div>
          <div className="border rounded-lg p-3 flex items-start gap-3 max-w-[320px] bg-card shadow-sm">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Wellio</p>
                <span className="text-[10px] text-muted-foreground">now</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {coachName} sent you a message
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">
              In-App
            </Badge>
          </div>
          <div className="border rounded-lg p-3 bg-card flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">New message from {coachName}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Just now</p>
            </div>
            <Badge variant="default" className="shrink-0">New</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

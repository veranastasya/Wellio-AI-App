import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Utensils,
  Dumbbell,
  Moon,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { ActivityEvent } from "./types";
import { format, parseISO, isToday, isYesterday } from "date-fns";

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

function getEventIcon(category: string, type: string) {
  if (type === "inactivity") return Clock;
  if (type === "missed_task") return XCircle;
  
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

function getEventTypeIcon(type: string) {
  switch (type) {
    case "log":
      return CheckCircle2;
    case "inactivity":
      return AlertCircle;
    case "missed_task":
      return XCircle;
    default:
      return Activity;
  }
}

function getCategoryStyles(category: string) {
  switch (category) {
    case "nutrition":
      return {
        bg: "bg-emerald-100 dark:bg-emerald-900/30",
        text: "text-emerald-700 dark:text-emerald-400",
        badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
      };
    case "workout":
      return {
        bg: "bg-orange-100 dark:bg-orange-900/30",
        text: "text-orange-700 dark:text-orange-400",
        badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
      };
    case "sleep":
      return {
        bg: "bg-indigo-100 dark:bg-indigo-900/30",
        text: "text-indigo-700 dark:text-indigo-400",
        badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
      };
    default:
      return {
        bg: "bg-muted",
        text: "text-muted-foreground",
        badge: "bg-muted text-muted-foreground border-border",
      };
  }
}

function getEventTypeStyles(type: string) {
  switch (type) {
    case "log":
      return "border-l-emerald-500";
    case "inactivity":
      return "border-l-amber-500";
    case "missed_task":
      return "border-l-red-500";
    default:
      return "border-l-muted";
  }
}

function formatTime(timestamp: string) {
  return format(parseISO(timestamp), "h:mm a");
}

function formatDateHeader(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
}

function groupEventsByDate(events: ActivityEvent[]) {
  const groups: Record<string, ActivityEvent[]> = {};
  
  events.forEach((event) => {
    const dateKey = event.timestamp.split("T")[0];
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
  });

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, events]) => ({
      date,
      events: events.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    }));
}

function getCategoryLabel(category: string) {
  switch (category) {
    case "nutrition":
      return "Meals";
    case "workout":
      return "Training";
    case "sleep":
      return "Sleep";
    default:
      return "General";
  }
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  const groupedEvents = groupEventsByDate(events);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Client Engagement Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[340px]">
          <div className="p-4 space-y-4">
            {groupedEvents.map((group) => (
              <div key={group.date} data-testid={`timeline-group-${group.date}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground px-2">
                    {formatDateHeader(group.date)}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                
                <div className="space-y-2">
                  {group.events.map((event) => {
                    const Icon = getEventIcon(event.category, event.type);
                    const TypeIcon = getEventTypeIcon(event.type);
                    const categoryStyles = getCategoryStyles(event.category);
                    const typeStyles = getEventTypeStyles(event.type);
                    
                    return (
                      <div
                        key={event.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border border-l-4 bg-card hover-elevate transition-all ${typeStyles}`}
                        data-testid={`activity-event-${event.id}`}
                      >
                        <div className={`p-2 rounded-lg ${categoryStyles.bg}`}>
                          <Icon className={`w-4 h-4 ${categoryStyles.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{event.title}</p>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] px-1.5 py-0 h-5 ${categoryStyles.badge}`}
                              >
                                {getCategoryLabel(event.category)}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {formatTime(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

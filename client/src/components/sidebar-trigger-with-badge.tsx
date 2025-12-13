import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import type { Message } from "@shared/schema";

interface SidebarTriggerWithBadgeProps {
  role: "coach" | "client";
  testId?: string;
}

export function SidebarTriggerWithBadge({ role, testId = "button-sidebar-toggle" }: SidebarTriggerWithBadgeProps) {
  // Fetch messages based on role with polling for real-time updates
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: role === "coach" ? ["/api/coach/messages"] : ["/api/messages"],
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });

  // Count unread messages
  const unreadCount = messages.filter((m) => {
    if (role === "coach") {
      return m.sender === "client" && !m.read;
    } else {
      return m.sender === "coach" && !m.read;
    }
  }).length;

  const hasUnread = unreadCount > 0;
  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <div className="relative">
      <SidebarTrigger data-testid={testId} />
      {hasUnread && (
        <div 
          className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center border-2 border-background"
          data-testid="indicator-global-unread"
          aria-live="polite"
          aria-label={`${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`}
        >
          {displayCount}
        </div>
      )}
    </div>
  );
}

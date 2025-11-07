import { SidebarTrigger } from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import type { Message } from "@shared/schema";

interface SidebarTriggerWithBadgeProps {
  role: "coach" | "client";
  testId?: string;
}

export function SidebarTriggerWithBadge({ role, testId = "button-sidebar-toggle" }: SidebarTriggerWithBadgeProps) {
  // Fetch messages based on role
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: role === "coach" ? ["/api/coach/messages"] : ["/api/messages"],
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

  return (
    <div className="relative">
      <SidebarTrigger data-testid={testId} />
      {hasUnread && (
        <div 
          className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
          data-testid="indicator-global-unread"
          aria-live="polite"
          aria-label={`${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`}
        />
      )}
    </div>
  );
}

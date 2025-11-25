import { Home, MessageSquare, FileText, TrendingUp, User, ClipboardList } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import logoImage from "@assets/Group 626535_1761099357468.png";
import type { Message } from "@shared/schema";

const navigationItems = [
  {
    title: "Home",
    url: "/client/dashboard",
    icon: Home,
  },
  {
    title: "Forms",
    url: "/client/forms",
    icon: FileText,
  },
  {
    title: "Chat",
    url: "/client/chat",
    icon: MessageSquare,
    showUnreadBadge: true,
  },
  {
    title: "Plan",
    url: "/client/plan",
    icon: TrendingUp,
  },
  {
    title: "Progress",
    url: "/client/progress",
    icon: ClipboardList,
  },
  {
    title: "Profile",
    url: "/client/profile",
    icon: User,
  },
];

export function ClientSidebar() {
  const [location] = useLocation();

  // Fetch messages to count unread
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  // Count unread messages from coach
  const unreadCount = messages.filter(
    (m) => m.sender === "coach" && !m.read
  ).length;

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img 
            src={logoImage} 
            alt="Wellio Logo" 
            className="w-10 h-10 rounded-lg"
            data-testid="logo-image"
          />
          <span className="text-xl font-bold text-foreground">Wellio</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-3 py-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                      {item.showUnreadBadge && unreadCount > 0 && (
                        <Badge 
                          variant="default" 
                          className="ml-auto bg-primary text-primary-foreground"
                          data-testid="badge-chat-unread"
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

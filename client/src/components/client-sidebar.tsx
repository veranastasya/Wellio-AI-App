import { Home, MessageSquare, FileText, TrendingUp, User, Bot, LogOut, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import logoImage from "@assets/Group 626535_1761099357468.png";
import type { Message } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/client/dashboard",
    icon: Home,
  },
  {
    title: "Profile",
    url: "/client/profile",
    icon: User,
  },
  {
    title: "Weekly Program",
    url: "/client/weekly-plan",
    icon: Calendar,
  },
  {
    title: "My Plan",
    url: "/client/plan",
    icon: TrendingUp,
  },
  {
    title: "Coach Chat",
    url: "/client/chat",
    icon: MessageSquare,
    showUnreadBadge: true,
  },
  {
    title: "AI Tracker",
    url: "/client/ai-tracker",
    icon: Bot,
  },
];

export function ClientSidebar() {
  const [location, setLocation] = useLocation();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const unreadCount = messages.filter(
    (m) => m.sender === "coach" && !m.read
  ).length;

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/client-auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientEmail");
      setLocation("/client/login");
    }
  };

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
          <span className="text-xl font-bold text-primary">Wellio</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
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
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

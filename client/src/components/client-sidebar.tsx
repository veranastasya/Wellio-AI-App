import { Home, MessageSquare, FileText, TrendingUp, User, Bot, LogOut, Calendar, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
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

export const navigationItems = [
  {
    title: "Dashboard",
    url: "/client/dashboard",
    icon: Home,
    tourStep: 1,
    tourTitle: "Your Dashboard 🏠",
    tourDescription: "Quick overview of your weekly stats and achievements. Check here daily for motivation!",
  },
  {
    title: "My Progress",
    url: "/client/my-progress",
    icon: BarChart3,
    tourStep: 2,
    tourTitle: "Track Your Progress 📈",
    tourDescription: "See all your metrics, weight trends, and progress photos in one place. This is what your coach sees too!",
  },
  {
    title: "My Plan",
    url: "/client/plan",
    icon: TrendingUp,
    tourStep: 3,
    tourTitle: "Your Personalized Plan 📋",
    tourDescription: "View weekly programs your coach created just for you - workouts, meals, habits, and tasks.",
  },
  {
    title: "Coach Chat",
    url: "/client/chat",
    icon: MessageSquare,
    showUnreadBadge: true,
    tourStep: 4,
    tourTitle: "Message Your Coach 💬",
    tourDescription: "Get personalized support, ask questions, and stay accountable with direct coach messaging.",
  },
  {
    title: "AI Tracker",
    url: "/client/ai-tracker",
    icon: Bot,
    tourStep: 5,
    tourTitle: "AI Tracker 🤖",
    tourDescription: "Just chat naturally! Log meals, workouts, and how you feel. AI automatically tracks everything for you.",
  },
  {
    title: "Weekly Program",
    url: "/client/weekly-plan",
    icon: Calendar,
  },
  {
    title: "Profile",
    url: "/client/profile",
    icon: User,
  },
];

interface ClientSidebarProps {
  activeTourStep?: number | null;
  onTourElementRef?: (step: number, element: HTMLElement | null) => void;
}

export function ClientSidebar({ activeTourStep, onTourElementRef }: ClientSidebarProps) {
  const [location, setLocation] = useLocation();
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Fetch messages with polling for real-time updates
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000,
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

  // Report the element ref when tour step changes
  useEffect(() => {
    if (activeTourStep !== null && activeTourStep !== undefined && onTourElementRef) {
      const element = itemRefs.current.get(activeTourStep);
      if (element) {
        onTourElementRef(activeTourStep, element);
      }
    }
  }, [activeTourStep, onTourElementRef]);

  const setItemRef = (tourStep: number | undefined, element: HTMLElement | null) => {
    if (tourStep !== undefined && element) {
      itemRefs.current.set(tourStep, element);
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
              {navigationItems.map((item) => {
                const isHighlighted = activeTourStep !== null && activeTourStep !== undefined && item.tourStep === activeTourStep;
                
                return (
                  <SidebarMenuItem 
                    key={item.title}
                    ref={(el) => setItemRef(item.tourStep, el)}
                    className={isHighlighted ? "relative z-[60]" : ""}
                    data-tour-step={item.tourStep}
                  >
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      className={isHighlighted ? "ring-2 ring-primary rounded-md shadow-[0_0_12px_rgba(40,160,174,0.4)]" : ""}
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
                );
              })}
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

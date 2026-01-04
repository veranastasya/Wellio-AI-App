import { useState, useEffect } from "react";
import { Home, MessageSquare, TrendingUp, User, Bot, LogOut, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { useTour } from "@/contexts/tour-context";
import logoImage from "@assets/Group 626535_1761099357468.png";
import type { Message, SupportedLanguage } from "@shared/schema";
import { CLIENT_NAV_TRANSLATIONS } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { syncLanguage } from "@/lib/i18n";

type NavItemKey = "dashboard" | "myProgress" | "myPlan" | "coachChat" | "aiTracker" | "profile";

const navigationItemsBase = [
  {
    titleKey: "dashboard" as NavItemKey,
    url: "/client/dashboard",
    icon: Home,
    tourId: "dashboard",
  },
  {
    titleKey: "myProgress" as NavItemKey,
    url: "/client/my-progress",
    icon: BarChart3,
    tourId: "progress",
  },
  {
    titleKey: "myPlan" as NavItemKey,
    url: "/client/plan",
    icon: TrendingUp,
    tourId: "plan",
    showPlanBadge: true,
  },
  {
    titleKey: "coachChat" as NavItemKey,
    url: "/client/chat",
    icon: MessageSquare,
    showUnreadBadge: true,
    tourId: "coach-chat",
  },
  {
    titleKey: "aiTracker" as NavItemKey,
    url: "/client/ai-tracker",
    icon: Bot,
    tourId: "ai-chat",
  },
  {
    titleKey: "profile" as NavItemKey,
    url: "/client/profile",
    icon: User,
  },
];

function getNavigationItems(lang: SupportedLanguage) {
  return navigationItemsBase.map(item => ({
    ...item,
    title: CLIENT_NAV_TRANSLATIONS[item.titleKey][lang],
  }));
}

export const navigationItems = getNavigationItems("en");

export function ClientSidebar() {
  const [location, setLocation] = useLocation();
  const { isActive: isTourActive, currentTourTarget } = useTour();
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>("en");

  // Fetch client's preferred language and sync with i18next
  useEffect(() => {
    const fetchClientLanguage = async () => {
      try {
        const response = await apiRequest("GET", "/api/client-auth/me");
        const data = await response.json();
        if (data.client?.preferredLanguage) {
          const lang = data.client.preferredLanguage as SupportedLanguage;
          setPreferredLanguage(lang);
          syncLanguage(lang);
        }
      } catch (error) {
        console.error("Failed to fetch client language preference:", error);
      }
    };
    fetchClientLanguage();
  }, []);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 5000,
  });

  const { data: unreadPlans } = useQuery<{ count: number }>({
    queryKey: ["/api/client-plans/unread-count"],
    refetchInterval: 30000,
  });

  const unreadCount = messages.filter(
    (m) => m.sender === "coach" && !m.read
  ).length;

  const unreadPlanCount = unreadPlans?.count || 0;
  
  const navItems = getNavigationItems(preferredLanguage);

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
              {navItems.map((item) => {
                const isTourHighlighted = isTourActive && item.tourId === currentTourTarget;
                return (
                <SidebarMenuItem 
                  key={item.titleKey}
                  data-tour={item.tourId}
                  className={isTourHighlighted ? "ring-2 ring-[#28A0AE] ring-offset-2 ring-offset-sidebar rounded-md animate-pulse" : ""}
                >
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.titleKey.toLowerCase().replace(/\s+/g, "-")}`}
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
                      {item.showPlanBadge && unreadPlanCount > 0 && (
                        <Badge 
                          variant="default" 
                          className="ml-auto bg-[#E2F9AD] text-[#28A0AE]"
                          data-testid="badge-plan-new"
                        >
                          {CLIENT_NAV_TRANSLATIONS.newPlanBadge[preferredLanguage]}
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
          <span>{CLIENT_NAV_TRANSLATIONS.logOut[preferredLanguage]}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

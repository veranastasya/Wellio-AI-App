import { Home, Users, TrendingUp, Calendar, MessageSquare, LineChart, Lock, ClipboardList, Brain, FileText, Settings, Bell } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useTour } from "@/contexts/tour-context";
import logoImage from "@assets/Group 626535_1761099357468.png";
import type { Message, SupportedLanguage } from "@shared/schema";
import { COACH_UI_TRANSLATIONS } from "@shared/schema";

interface AppSidebarProps {
  lang?: SupportedLanguage;
}

// Navigation items with translation keys
const navigationItems = [
  {
    titleKey: "dashboard" as const,
    url: "/",
    icon: Home,
    locked: false,
    tourId: "dashboard",
  },
  {
    titleKey: "clientManagement" as const,
    url: "/clients",
    icon: Users,
    locked: false,
    tourId: "clients",
  },
  {
    titleKey: "questionnaires" as const,
    url: "/questionnaires",
    icon: ClipboardList,
    locked: false,
    tourId: "questionnaires",
  },
  {
    titleKey: "progressAnalytics" as const,
    url: "/analytics",
    icon: TrendingUp,
    locked: false,
    hidden: true,
    tourId: "analytics",
  },
  {
    titleKey: "calendar" as const,
    url: "/scheduling",
    icon: Calendar,
    locked: false,
  },
  {
    titleKey: "chat" as const,
    url: "/communication",
    icon: MessageSquare,
    locked: false,
    showUnreadBadge: true,
    tourId: "communication",
  },
  {
    titleKey: "engagement" as const,
    url: "/engagement",
    icon: Bell,
    locked: false,
    hidden: true,
  },
  {
    titleKey: "aiInsights" as const,
    url: "/ai-insights",
    icon: Brain,
    locked: false,
    hidden: true,
  },
  {
    titleKey: "clientDataLogs" as const,
    url: "/client-logs",
    icon: FileText,
    locked: false,
    hidden: true,
  },
  {
    titleKey: "predictiveAnalytics" as const,
    url: "#",
    icon: LineChart,
    locked: true,
    hidden: true,
  },
  {
    titleKey: "settings" as const,
    url: "/settings",
    icon: Settings,
    locked: false,
  },
];

export function AppSidebar({ lang = "en" }: AppSidebarProps) {
  const t = COACH_UI_TRANSLATIONS;
  const [location] = useLocation();
  const { isActive: isTourActive, currentTourTarget } = useTour();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/coach/messages"],
    refetchInterval: 5000,
  });

  const unreadCount = messages.filter(
    (m) => m.sender === "client" && !m.read
  ).length;

  // Helper to get translated title
  const getTitle = (titleKey: keyof typeof t.nav) => t.nav[titleKey][lang];

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
            {t.nav.navigation[lang]}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.filter(item => !item.hidden).map((item) => {
                const isTourHighlighted = isTourActive && item.tourId === currentTourTarget;
                const title = getTitle(item.titleKey);
                return (
                <SidebarMenuItem 
                  key={item.titleKey} 
                  data-tour={item.tourId}
                  className={isTourHighlighted ? "ring-2 ring-[#28A0AE] ring-offset-2 ring-offset-sidebar rounded-md animate-pulse" : ""}
                >
                  {item.locked ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          className="cursor-not-allowed opacity-60"
                          data-testid={`nav-${item.titleKey.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{title}</span>
                          <Lock className="w-3 h-3 ml-auto text-muted-foreground" />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{t.nav.comingSoon[lang]}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={`nav-${item.titleKey.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-5 h-5" />
                        <span>{title}</span>
                        {item.showUnreadBadge && unreadCount > 0 && (
                          <Badge 
                            variant="default" 
                            className="ml-auto bg-primary text-primary-foreground"
                            data-testid="badge-communication-unread"
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

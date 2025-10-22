import { Home, Users, TrendingUp, Calendar, MessageSquare, LineChart, Lock, ClipboardList } from "lucide-react";
import { Link, useLocation } from "wouter";
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
import logoImage from "@assets/Group 626535_1761099357468.png";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    locked: false,
  },
  {
    title: "Client Management",
    url: "/clients",
    icon: Users,
    locked: false,
  },
  {
    title: "Questionnaires",
    url: "/questionnaires",
    icon: ClipboardList,
    locked: false,
  },
  {
    title: "Progress Analytics",
    url: "/analytics",
    icon: TrendingUp,
    locked: false,
  },
  {
    title: "Smart Scheduling",
    url: "/scheduling",
    icon: Calendar,
    locked: false,
  },
  {
    title: "Communication",
    url: "/communication",
    icon: MessageSquare,
    locked: false,
  },
  {
    title: "Predictive Analytics",
    url: "#",
    icon: LineChart,
    locked: true,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

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
                  {item.locked ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          className="cursor-not-allowed opacity-60"
                          data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                          <Lock className="w-3 h-3 ml-auto text-muted-foreground" />
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Coming soon</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

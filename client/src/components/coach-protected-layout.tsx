import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useCoachAuth } from "@/contexts/coach-auth-context";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarTriggerWithBadge } from "@/components/sidebar-trigger-with-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2 } from "lucide-react";

interface CoachProtectedLayoutProps {
  children: ReactNode;
}

function SidebarAutoClose({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  // Auto-close sidebar on mobile when navigation occurs
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile]);

  return <>{children}</>;
}

export function CoachProtectedLayout({ children }: CoachProtectedLayoutProps) {
  const { isAuthenticated, isLoading } = useCoachAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/coach/login", { replace: true });
    }
  }, [isLoading, isAuthenticated, setLocation]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect will happen in useEffect)
  if (!isAuthenticated) {
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <SidebarAutoClose>
        <div className="flex min-h-screen h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1 min-h-0 h-full">
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background flex-shrink-0">
              <SidebarTriggerWithBadge role="coach" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
              {children}
            </main>
          </div>
        </div>
      </SidebarAutoClose>
    </SidebarProvider>
  );
}

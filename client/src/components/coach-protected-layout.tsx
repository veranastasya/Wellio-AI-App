import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useCoachAuth } from "@/contexts/coach-auth-context";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarTriggerWithBadge } from "@/components/sidebar-trigger-with-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { TourProvider, useTour } from "@/contexts/tour-context";
import { Loader2 } from "lucide-react";

interface CoachProtectedLayoutProps {
  children: ReactNode;
}

function SidebarAutoClose({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { isActive: isTourActive } = useTour();

  useEffect(() => {
    if (isMobile && !isTourActive) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile, isTourActive]);

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
    <TourProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <SidebarAutoClose>
          <div className="flex h-screen-safe w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background flex-shrink-0">
                <SidebarTriggerWithBadge role="coach" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 safe-area-bottom">
                {children}
              </main>
            </div>
          </div>
        </SidebarAutoClose>
      </SidebarProvider>
    </TourProvider>
  );
}

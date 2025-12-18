import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/components/client-sidebar";
import { SidebarTriggerWithBadge } from "@/components/sidebar-trigger-with-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { TourProvider, useTour } from "@/contexts/tour-context";

interface ClientProtectedLayoutProps {
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

function LayoutContent({ children }: { children: ReactNode }) {
  const { activeTourStep } = useTour();

  return (
    <div className="flex h-screen-safe w-full">
      <ClientSidebar activeTourStep={activeTourStep} />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background flex-shrink-0">
          <SidebarTriggerWithBadge role="client" />
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 safe-area-bottom">
          {children}
        </main>
      </div>
    </div>
  );
}

export function ClientProtectedLayout({ children }: ClientProtectedLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <TourProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <SidebarAutoClose>
          <LayoutContent>{children}</LayoutContent>
        </SidebarAutoClose>
      </SidebarProvider>
    </TourProvider>
  );
}

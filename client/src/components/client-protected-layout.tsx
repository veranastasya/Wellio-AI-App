import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/components/client-sidebar";
import { SidebarTriggerWithBadge } from "@/components/sidebar-trigger-with-badge";
import { ThemeToggle } from "@/components/theme-toggle";

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

export function ClientProtectedLayout({ children }: ClientProtectedLayoutProps) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <SidebarAutoClose>
        <div className="flex h-screen w-full">
          <ClientSidebar />
          <div className="flex flex-col flex-1 min-h-screen max-h-screen">
            <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
              <SidebarTriggerWithBadge role="client" />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              {children}
            </main>
          </div>
        </div>
      </SidebarAutoClose>
    </SidebarProvider>
  );
}

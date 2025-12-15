import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { ClientSidebar } from "@/components/client-sidebar";
import { SidebarTriggerWithBadge } from "@/components/sidebar-trigger-with-badge";
import { ThemeToggle } from "@/components/theme-toggle";

// Hook to set client-specific manifest for PWA
function useClientManifest() {
  useEffect(() => {
    const existingLink = document.querySelector('link[rel="manifest"]');
    if (existingLink) {
      existingLink.setAttribute('href', '/client-manifest.json');
    }
    
    return () => {
      // Reset to default manifest when leaving client pages
      if (existingLink) {
        existingLink.setAttribute('href', '/manifest.json');
      }
    };
  }, []);
}

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
  // Use client-specific manifest for PWA home screen
  useClientManifest();
  
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <SidebarAutoClose>
        <div className="flex h-screen-safe w-full">
          <ClientSidebar />
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
      </SidebarAutoClose>
    </SidebarProvider>
  );
}

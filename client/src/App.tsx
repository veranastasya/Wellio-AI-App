import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { ClientLayout } from "@/components/client-layout";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Communication from "@/pages/communication";
import Analytics from "@/pages/analytics";
import Scheduling from "@/pages/scheduling";
import Questionnaires from "@/pages/questionnaires";
import QuestionnaireBuilder from "@/pages/questionnaire-builder";
import QuestionnairePreview from "@/pages/questionnaire-preview";
import AIInsights from "@/pages/ai-insights";
import ClientLogs from "@/pages/client-logs";
import ClientOnboard from "@/pages/client-onboard";
import ClientPasswordSetup from "@/pages/client-password-setup";
import ClientLogin from "@/pages/client-login";
import ClientDashboard from "@/pages/client-dashboard";
import ClientProfile from "@/pages/client-profile";
import ClientChat from "@/pages/client-chat";
import ClientForms from "@/pages/client-forms";
import NotFound from "@/pages/not-found";

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          {/* Client Authentication - No layout */}
          <Route path="/client/onboard" component={ClientOnboard} />
          <Route path="/client/setup-password" component={ClientPasswordSetup} />
          <Route path="/client/login" component={ClientLogin} />
          
          {/* Client Portal Routes - Client Layout */}
          <Route path="/client/dashboard">
            <ClientLayout>
              <ClientDashboard />
            </ClientLayout>
          </Route>
          <Route path="/client/profile">
            <ClientLayout>
              <ClientProfile />
            </ClientLayout>
          </Route>
          <Route path="/client/chat">
            <ClientLayout>
              <ClientChat />
            </ClientLayout>
          </Route>
          <Route path="/client/forms">
            <ClientLayout>
              <ClientForms />
            </ClientLayout>
          </Route>

          {/* Coach Routes - Sidebar Layout */}
          <Route path="/">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Dashboard />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>
          <Route path="/clients">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Clients />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>
          <Route path="/questionnaires">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Questionnaires />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>
          <Route path="/questionnaires/new">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <QuestionnaireBuilder />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>
          <Route path="/questionnaires/:id/edit">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <QuestionnaireBuilder />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>
          <Route path="/questionnaires/:id/preview">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <QuestionnairePreview />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>
          <Route path="/analytics">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Analytics />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>
          <Route path="/scheduling">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Scheduling />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>
          <Route path="/communication">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Communication />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>
          <Route path="/ai-insights">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <AIInsights />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>
          <Route path="/client-logs">
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-h-screen max-h-screen">
                  <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <ClientLogs />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </Route>

          {/* 404 Not Found */}
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

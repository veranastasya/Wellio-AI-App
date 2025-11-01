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
import ClientDashboard from "@/pages/client-dashboard";
import ClientProfile from "@/pages/client-profile";
import ClientChat from "@/pages/client-chat";
import ClientForms from "@/pages/client-forms";
import NotFound from "@/pages/not-found";

function CoachRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/clients" component={Clients} />
      <Route path="/questionnaires" component={Questionnaires} />
      <Route path="/questionnaires/new" component={QuestionnaireBuilder} />
      <Route path="/questionnaires/:id/edit" component={QuestionnaireBuilder} />
      <Route path="/questionnaires/:id/preview" component={QuestionnairePreview} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/scheduling" component={Scheduling} />
      <Route path="/communication" component={Communication} />
      <Route path="/ai-insights" component={AIInsights} />
      <Route path="/client-logs" component={ClientLogs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClientRouter() {
  return (
    <ClientLayout>
      <Switch>
        <Route path="/client/dashboard" component={ClientDashboard} />
        <Route path="/client/profile" component={ClientProfile} />
        <Route path="/client/chat" component={ClientChat} />
        <Route path="/client/forms" component={ClientForms} />
        <Route component={NotFound} />
      </Switch>
    </ClientLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/client/onboard" component={ClientOnboard} />
      <Route path="/client/:rest*">
        {() => <ClientRouter />}
      </Route>
      <Route path="/:rest*">
        {() => <CoachRouter />}
      </Route>
    </Switch>
  );
}

function CoachLayout() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-h-screen max-h-screen">
          <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <CoachRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/client/onboard" component={ClientOnboard} />
          <Route path="/client/:rest*">
            {() => <ClientRouter />}
          </Route>
          <Route path="/:rest*">
            {() => <CoachLayout />}
          </Route>
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CoachAuthProvider } from "@/contexts/coach-auth-context";
import { CoachProtectedLayout } from "@/components/coach-protected-layout";
import { ClientProtectedLayout } from "@/components/client-protected-layout";
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
import PlanBuilder from "@/pages/plan-builder";
import ClientOnboard from "@/pages/client-onboard";
import ClientPasswordSetup from "@/pages/client-password-setup";
import ClientLogin from "@/pages/client-login";
import ClientDashboard from "@/pages/client-dashboard";
import ClientProfile from "@/pages/client-profile";
import ClientChat from "@/pages/client-chat";
import ClientForms from "@/pages/client-forms";
import ClientPlan from "@/pages/client-plan";
import CoachLogin from "@/pages/coach-login";
import CoachClientDetail from "@/pages/coach-client-detail";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CoachAuthProvider>
          <Switch>
            {/* Coach Authentication - No layout */}
            <Route path="/coach/login" component={CoachLogin} />
            
            {/* Client Authentication - No layout */}
            <Route path="/client/onboard" component={ClientOnboard} />
            <Route path="/client/setup-password" component={ClientPasswordSetup} />
            <Route path="/client/login" component={ClientLogin} />
          
            {/* Client Portal Routes - Protected Layout */}
            <Route path="/client/dashboard">
              <ClientProtectedLayout>
                <ClientDashboard />
              </ClientProtectedLayout>
            </Route>
            <Route path="/client/profile">
              <ClientProtectedLayout>
                <ClientProfile />
              </ClientProtectedLayout>
            </Route>
            <Route path="/client/chat">
              <ClientProtectedLayout>
                <ClientChat />
              </ClientProtectedLayout>
            </Route>
            <Route path="/client/forms">
              <ClientProtectedLayout>
                <ClientForms />
              </ClientProtectedLayout>
            </Route>
            <Route path="/client/plan">
              <ClientProtectedLayout>
                <ClientPlan />
              </ClientProtectedLayout>
            </Route>

          {/* Coach Routes - Protected Layout */}
          <Route path="/">
            <CoachProtectedLayout>
              <Dashboard />
            </CoachProtectedLayout>
          </Route>
          <Route path="/clients">
            <CoachProtectedLayout>
              <Clients />
            </CoachProtectedLayout>
          </Route>
          <Route path="/coach/clients/:clientId">
            <CoachProtectedLayout>
              <CoachClientDetail />
            </CoachProtectedLayout>
          </Route>
          <Route path="/questionnaires">
            <CoachProtectedLayout>
              <Questionnaires />
            </CoachProtectedLayout>
          </Route>
          <Route path="/questionnaires/new">
            <CoachProtectedLayout>
              <QuestionnaireBuilder />
            </CoachProtectedLayout>
          </Route>
          <Route path="/questionnaires/:id/edit">
            <CoachProtectedLayout>
              <QuestionnaireBuilder />
            </CoachProtectedLayout>
          </Route>
          <Route path="/questionnaires/:id/preview">
            <CoachProtectedLayout>
              <QuestionnairePreview />
            </CoachProtectedLayout>
          </Route>
          <Route path="/analytics">
            <CoachProtectedLayout>
              <Analytics />
            </CoachProtectedLayout>
          </Route>
          <Route path="/scheduling">
            <CoachProtectedLayout>
              <Scheduling />
            </CoachProtectedLayout>
          </Route>
          <Route path="/communication">
            <CoachProtectedLayout>
              <Communication />
            </CoachProtectedLayout>
          </Route>
          <Route path="/ai-insights">
            <CoachProtectedLayout>
              <AIInsights />
            </CoachProtectedLayout>
          </Route>
          <Route path="/coach/plan-builder/:clientId">
            <CoachProtectedLayout>
              <PlanBuilder />
            </CoachProtectedLayout>
          </Route>
          <Route path="/client-logs">
            <CoachProtectedLayout>
              <ClientLogs />
            </CoachProtectedLayout>
          </Route>

            {/* 404 Not Found */}
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </CoachAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, MessageSquare, FileText, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";
import { getGoalTypeLabel } from "@shared/schema";
import { SmartLogWidget } from "@/components/smart-log";

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const clientId = localStorage.getItem("clientId");
    if (!clientId) {
      setLocation("/client/login");
      return;
    }

    loadClient();
  }, []);

  const loadClient = async () => {
    try {
      const response = await apiRequest("GET", "/api/client-auth/me");
      const data = await response.json();
      
      if (!data.client) {
        localStorage.removeItem("clientId");
        localStorage.removeItem("clientEmail");
        setLocation("/client/login");
        return;
      }

      setClientData(data.client);
    } catch (error) {
      localStorage.removeItem("clientId");
      localStorage.removeItem("clientEmail");
      setLocation("/client/login");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return null;
  }

  const quickActions = [
    {
      title: "My Profile",
      description: "View and update your information",
      icon: User,
      path: "/client/profile",
      color: "text-primary",
    },
    {
      title: "Chat with Coach",
      description: "Message your coach",
      icon: MessageSquare,
      path: "/client/chat",
      color: "text-accent",
    },
    {
      title: "My Forms",
      description: "Complete questionnaires",
      icon: FileText,
      path: "/client/forms",
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-dashboard-title">
            Welcome back, {clientData.name.split(" ")[0]}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Here's your coaching dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Progress Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clientData.progressScore}%</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <TrendingUp className="w-4 h-4" />
                Tracking your journey
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold capitalize">{clientData.status}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Member since {new Date(clientData.joinedDate).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>

          {clientData.goalType && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{getGoalTypeLabel(clientData.goalType, clientData.goalDescription)}</div>
                <div className="text-sm text-muted-foreground mt-1">Stay focused!</div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-3 sm:gap-4">
              {quickActions.map((action) => (
                <Card key={action.title} className="hover-elevate cursor-pointer min-h-10" onClick={() => setLocation(action.path)}>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className={`${action.color}`}>
                        <action.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-sm sm:text-base">{action.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Track Your Progress</h2>
            <SmartLogWidget clientId={clientData.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

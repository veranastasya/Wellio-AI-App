import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, User, MessageSquare, FileText, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("clientToken");
    if (!token) {
      setLocation("/client/onboard");
      return;
    }

    verifyAndLoadClient(token);
  }, []);

  const verifyAndLoadClient = async (token: string) => {
    try {
      const response = await apiRequest("POST", "/api/client-auth/verify", { token });
      const data = response as any;
      
      if (!data.client) {
        setLocation("/client/onboard?token=" + token);
        return;
      }

      setClientData(data.client);
    } catch (error) {
      setLocation("/client/onboard");
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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-dashboard-title">
            Welcome back, {clientData.name.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">Here's your coaching dashboard</p>
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
                <div className="text-xl font-bold">{clientData.goalType}</div>
                <div className="text-sm text-muted-foreground mt-1">Stay focused!</div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Card key={action.title} className="hover-elevate cursor-pointer" onClick={() => setLocation(action.path)}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`${action.color}`}>
                      <action.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{action.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

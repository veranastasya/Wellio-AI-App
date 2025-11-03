import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Target, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

export default function ClientPlan() {
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

  const goals = [
    {
      id: "1",
      title: "Improve Overall Fitness",
      description: "Build strength and endurance through consistent training",
      progress: clientData.progressScore || 0,
      target: 100,
      status: "in_progress" as const,
    },
    {
      id: "2",
      title: "Maintain Healthy Nutrition",
      description: "Follow balanced meal plans and track macros",
      progress: 75,
      target: 100,
      status: "in_progress" as const,
    },
    {
      id: "3",
      title: "Build Healthy Habits",
      description: "Establish consistent workout and sleep routines",
      progress: 60,
      target: 100,
      status: "in_progress" as const,
    },
  ];

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-plan-title">
            My Progress & Plan
          </h1>
          <p className="text-muted-foreground mt-1">Track your goals and progress</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clientData.progressScore}%</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <TrendingUp className="w-4 h-4" />
                On track
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{goals.length}</div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Target className="w-4 h-4" />
                Goals in progress
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={clientData.status === "active" ? "default" : "secondary"} className="text-base">
                {clientData.status}
              </Badge>
              <div className="text-sm text-muted-foreground mt-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Since {new Date(clientData.joinedDate).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {goals.map((goal) => (
              <div key={goal.id} className="space-y-3" data-testid={`goal-${goal.id}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{goal.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {goal.status === "in_progress" ? "In Progress" : "Completed"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{goal.progress}%</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress value={goal.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{goal.progress}/{goal.target}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium text-foreground">Completed Initial Assessment</p>
                <p className="text-sm text-muted-foreground">You've successfully completed your onboarding questionnaire</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(clientData.joinedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-medium text-foreground">Started Your Journey</p>
                <p className="text-sm text-muted-foreground">Welcome to your personalized coaching experience</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(clientData.joinedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

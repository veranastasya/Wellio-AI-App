import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Activity, Brain, Sparkles, Target, Apple, Dumbbell, TrendingUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface TrendAnalysis {
  category: "nutrition" | "activity" | "consistency" | "progress";
  trend: "improving" | "declining" | "stable" | "plateau";
  confidence: number;
  description: string;
  recommendation?: string;
}

interface ClientInsight {
  id: string;
  clientId: string;
  clientName: string;
  insights: TrendAnalysis[];
  summary: string;
  generatedAt: string;
}

interface Client {
  id: string;
  name: string;
  status: string;
}

export default function AIInsights() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const activeClients = clients?.filter(c => c.status === "active") || [];

  const { data: insights, isLoading: insightsLoading, error } = useQuery<ClientInsight>({
    queryKey: ["/api/insights", selectedClientId],
    enabled: !!selectedClientId,
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-5 h-5 text-green-600" data-testid="icon-trending-up" />;
      case "declining":
        return <TrendingDown className="w-5 h-5 text-red-600" data-testid="icon-trending-down" />;
      case "plateau":
        return <Activity className="w-5 h-5 text-yellow-600" data-testid="icon-activity" />;
      default:
        return <Activity className="w-5 h-5 text-blue-600" data-testid="icon-stable" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "declining":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "plateau":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "nutrition":
        return <Apple className="w-5 h-5 text-green-600" />;
      case "activity":
        return <Dumbbell className="w-5 h-5 text-blue-600" />;
      case "progress":
        return <TrendingUpDown className="w-5 h-5 text-purple-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-6 border-b border-border bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="heading-ai-insights">AI Insights</h1>
              <p className="text-sm text-muted-foreground">AI-powered client analytics and recommendations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card data-testid="card-client-selector">
            <CardHeader>
              <CardTitle className="text-lg">Select Client</CardTitle>
              <CardDescription>Choose a client to view their AI-generated insights</CardDescription>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <Skeleton className="h-10 w-full" data-testid="skeleton-client-select" />
              ) : (
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClients.map((client) => (
                      <SelectItem key={client.id} value={client.id} data-testid={`client-option-${client.id}`}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertDescription>
                Failed to generate insights. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          {insightsLoading && selectedClientId && (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" data-testid="skeleton-insights" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}

          {insights && !insightsLoading && (
            <>
              <Card className="bg-gradient-to-br from-primary/5 to-accent/5" data-testid="card-ai-summary">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">AI Summary</CardTitle>
                  </div>
                  <CardDescription>Generated insights for {insights.clientName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed" data-testid="text-summary">
                    {insights.summary}
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Generated {new Date(insights.generatedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {insights.insights.map((trend, index) => (
                  <Card key={index} className="hover-elevate" data-testid={`card-trend-${index}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(trend.category)}
                          <CardTitle className="text-base capitalize">{trend.category}</CardTitle>
                        </div>
                        {getTrendIcon(trend.trend)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getTrendColor(trend.trend)} data-testid={`badge-trend-${trend.trend}`}>
                          {trend.trend}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {(trend.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-foreground" data-testid={`text-description-${index}`}>
                        {trend.description}
                      </p>
                      {trend.recommendation && (
                        <div className="mt-3 p-3 rounded-lg bg-accent/20 border border-accent/30">
                          <div className="flex items-start gap-2">
                            <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-foreground" data-testid={`text-recommendation-${index}`}>
                              <strong>Recommendation:</strong> {trend.recommendation}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {insights.insights.length === 0 && (
                <Card data-testid="card-no-data">
                  <CardContent className="py-12">
                    <div className="text-center space-y-2">
                      <Brain className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                      <p className="text-muted-foreground">
                        Not enough data to generate insights yet.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Add nutrition logs, workout logs, and check-ins to unlock AI-powered analytics.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!selectedClientId && !insightsLoading && (
            <Card data-testid="card-select-prompt">
              <CardContent className="py-12">
                <div className="text-center space-y-2">
                  <Brain className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-muted-foreground">
                    Select a client above to view their AI-powered insights
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

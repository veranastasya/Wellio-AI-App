import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, Clock, Flag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Goal } from "@shared/schema";
import { Link } from "wouter";

export function GoalsDashboardWidget() {
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const totalGoals = goals.length;
  const completionRate = totalGoals > 0 ? Math.round((completedGoals.length / totalGoals) * 100) : 0;

  const calculateProgress = (current: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getDaysRemaining = (deadline: string): number => {
    return Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  const topPriorityGoals = activeGoals
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    })
    .slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Active Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading goals...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Active Goals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold text-foreground">{activeGoals.length}</div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold text-foreground">{completedGoals.length}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-2xl font-bold text-foreground">{completionRate}%</div>
              <div className="text-xs text-muted-foreground">Success Rate</div>
            </div>
          </div>

          {topPriorityGoals.length === 0 ? (
            <div className="text-center py-6">
              <Target className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No active goals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topPriorityGoals.map((goal) => {
                const progress = calculateProgress(goal.currentValue, goal.targetValue);
                const daysRemaining = getDaysRemaining(goal.deadline);
                const isOverdue = daysRemaining < 0;

                return (
                  <Link href="/client-logs" key={goal.id}>
                    <div className="p-3 rounded-lg border border-border bg-card hover-elevate active-elevate-2" data-testid={`goal-widget-${goal.id}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-foreground truncate">{goal.title}</h4>
                            {goal.priority === "high" && (
                              <Flag className="w-3 h-3 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{goal.clientName}</p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {goal.goalType.replace("_", " ")}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {goal.currentValue} / {goal.targetValue} {goal.unit}
                          </span>
                          <span className="font-semibold text-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>

                      <div className="flex items-center gap-1 mt-2 text-xs">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className={isOverdue ? "text-destructive" : "text-muted-foreground"}>
                          {isOverdue 
                            ? `${Math.abs(daysRemaining)} days overdue` 
                            : `${daysRemaining} days left`
                          }
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {activeGoals.length > 5 && (
            <Link href="/client-logs">
              <button className="w-full text-sm text-primary hover:underline pt-2" data-testid="link-view-all-goals">
                View all {activeGoals.length} active goals →
              </button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

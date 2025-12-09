import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Edit3, X, Sparkles } from "lucide-react";
import type { Recommendation } from "./types";

interface RecommendationCardProps {
  recommendations: Recommendation[];
  onSend: (rec: Recommendation) => void;
  onEdit: (rec: Recommendation) => void;
  onDismiss: (rec: Recommendation) => void;
}

function getPriorityStyles(priority: string) {
  switch (priority) {
    case "high":
      return {
        border: "border-l-red-500",
        badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
        label: "High Priority",
      };
    case "medium":
      return {
        border: "border-l-amber-500",
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        label: "Medium Priority",
      };
    case "low":
      return {
        border: "border-l-blue-500",
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        label: "Low Priority",
      };
    default:
      return {
        border: "border-l-muted",
        badge: "bg-muted text-muted-foreground border-border",
        label: "Normal",
      };
  }
}

export function RecommendationCard({
  recommendations,
  onSend,
  onEdit,
  onDismiss,
}: RecommendationCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          AI Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {recommendations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recommendations at this time</p>
          </div>
        ) : (
          recommendations.map((rec) => {
            const styles = getPriorityStyles(rec.priority);
            
            return (
              <div
                key={rec.id}
                className={`p-4 rounded-lg border border-l-4 bg-card hover-elevate transition-all ${styles.border}`}
                data-testid={`recommendation-${rec.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${styles.badge}`}>
                    {styles.label}
                  </Badge>
                </div>
                <p className="text-sm mb-4 leading-relaxed">{rec.suggestedMessage}</p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onSend(rec)}
                    data-testid={`button-send-${rec.id}`}
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Send
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(rec)}
                    data-testid={`button-edit-${rec.id}`}
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDismiss(rec)}
                    className="ml-auto"
                    data-testid={`button-dismiss-${rec.id}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

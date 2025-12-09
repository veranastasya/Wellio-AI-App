import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingDown, Activity, Clock, Sparkles } from "lucide-react";
import type { AutoSuggestion } from "./types";

interface AutoSuggestionsProps {
  suggestions: AutoSuggestion[];
}

function getSuggestionStyles(type: string) {
  switch (type) {
    case "trend":
      return {
        icon: TrendingDown,
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        iconBg: "bg-amber-100 dark:bg-amber-900/30",
        iconColor: "text-amber-600 dark:text-amber-400",
        label: "Trend",
      };
    case "engagement":
      return {
        icon: Activity,
        badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
        iconBg: "bg-red-100 dark:bg-red-900/30",
        iconColor: "text-red-600 dark:text-red-400",
        label: "Engagement",
      };
    case "pattern":
      return {
        icon: Clock,
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        iconBg: "bg-blue-100 dark:bg-blue-900/30",
        iconColor: "text-blue-600 dark:text-blue-400",
        label: "Pattern",
      };
    default:
      return {
        icon: Lightbulb,
        badge: "bg-muted text-muted-foreground border-border",
        iconBg: "bg-muted",
        iconColor: "text-muted-foreground",
        label: "Insight",
      };
  }
}

export function AutoSuggestions({ suggestions }: AutoSuggestionsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          Auto-Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {suggestions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No suggestions at this time</p>
          </div>
        ) : (
          suggestions.map((suggestion) => {
            const styles = getSuggestionStyles(suggestion.type);
            const Icon = styles.icon;
            
            return (
              <div
                key={suggestion.id}
                className="p-4 rounded-lg border bg-card hover-elevate transition-all"
                data-testid={`suggestion-${suggestion.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${styles.iconBg}`}>
                    <Icon className={`w-4 h-4 ${styles.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{suggestion.title}</p>
                      <Badge variant="outline" className={`text-[10px] ${styles.badge}`}>
                        {styles.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

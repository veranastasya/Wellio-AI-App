import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ClientAttentionIndicatorProps {
  clientId: string;
}

export function ClientAttentionIndicator({ clientId }: ClientAttentionIndicatorProps) {
  const [hasAttention, setHasAttention] = useState(false);
  const [triggerCount, setTriggerCount] = useState(0);
  const [highestSeverity, setHighestSeverity] = useState<"High" | "Medium" | "Low" | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const checkAttention = async () => {
      try {
        const response = await fetch(`/api/engagement/triggers/${clientId}`);
        if (response.ok) {
          const triggers = await response.json();
          const unresolvedTriggers = triggers.filter((t: { isResolved?: boolean }) => !t.isResolved);
          
          if (unresolvedTriggers.length > 0) {
            setHasAttention(true);
            setTriggerCount(unresolvedTriggers.length);
            
            const severities = unresolvedTriggers.map((t: { severity: string }) => t.severity);
            if (severities.includes("High")) {
              setHighestSeverity("High");
            } else if (severities.includes("Medium")) {
              setHighestSeverity("Medium");
            } else {
              setHighestSeverity("Low");
            }
          } else {
            setHasAttention(false);
          }
        }
      } catch (error) {
        console.error("[AttentionIndicator] Failed to check attention:", error);
      }
    };

    checkAttention();
  }, [clientId]);

  if (!hasAttention) {
    return null;
  }

  const getSeverityColor = () => {
    switch (highestSeverity) {
      case "High":
        return "text-red-500 bg-red-500/10";
      case "Medium":
        return "text-amber-500 bg-amber-500/10";
      default:
        return "text-blue-500 bg-blue-500/10";
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`p-1.5 rounded-full ${getSeverityColor()} cursor-pointer`}
          data-testid={`indicator-attention-${clientId}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">
          {triggerCount} alert{triggerCount !== 1 ? "s" : ""} need{triggerCount === 1 ? "s" : ""} attention
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

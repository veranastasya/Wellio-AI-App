export type ActivityEvent = {
  id: string;
  type: "log" | "inactivity" | "missed_task" | "milestone" | "alert";
  category: "nutrition" | "workout" | "sleep" | "hydration" | "mood" | "general";
  title: string;
  description: string;
  timestamp: string;
};

export type Trigger = {
  id: string;
  description: string;
  severity: "Low" | "Medium" | "High";
  detectedAt: string;
};

export type Recommendation = {
  id: string;
  reason: string;
  suggestedMessage: string;
  priority: "low" | "medium" | "high";
};

export type AutoSuggestion = {
  id: string;
  type: "trend" | "engagement" | "pattern";
  title: string;
  description: string;
};

export type QuickActionItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  message: string;
};

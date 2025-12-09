export type ActivityEventType = 'log' | 'inactivity' | 'missed_task' | 'milestone' | 'alert';
export type ActivityCategory = 'nutrition' | 'workout' | 'sleep' | 'hydration' | 'mood' | 'general';
export type TriggerSeverity = 'High' | 'Medium' | 'Low';
export type TriggerType = 'inactivity' | 'missed_log' | 'pattern_deviation' | 'goal_at_risk' | 'engagement_drop';
export type RecommendationStatus = 'pending' | 'sent' | 'dismissed' | 'scheduled';
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type NotificationChannel = 'sms' | 'webPush' | 'inApp';
export type ReminderFrequency = 'minimal' | 'moderate' | 'active' | 'aggressive';

export interface ClientActivityEvent {
  id: string;
  clientId: string;
  timestamp: string;
  type: ActivityEventType;
  category: ActivityCategory;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface Trigger {
  id: string;
  clientId: string;
  type: TriggerType;
  severity: TriggerSeverity;
  detectedAt: string;
  reason: string;
  recommendedAction: string;
  isResolved: boolean;
}

export interface Recommendation {
  id: string;
  clientId: string;
  triggerId?: string;
  message: string;
  reason: string;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  createdAt: string;
  sentAt?: string;
  sentVia?: string;
}

export interface NotificationPreference {
  clientId: string;
  sms: boolean;
  webPush: boolean;
  inApp: boolean;
  frequency: ReminderFrequency;
  dailyLimit: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  template: string;
  category: 'checkin' | 'meals' | 'training' | 'motivation';
}

export interface EngagementState {
  activityFeed: ClientActivityEvent[];
  triggers: Trigger[];
  recommendations: Recommendation[];
  notificationPreferences: NotificationPreference | null;
  selectedClientId: string | null;
  isLoading: boolean;
}

export interface EngagementActions {
  loadActivityFeed: (clientId: string) => void;
  detectTriggers: () => void;
  generateRecommendations: () => void;
  sendRecommendation: (recommendationId: string) => Promise<void>;
  dismissRecommendation: (recommendationId: string) => void;
  updateNotificationPreferences: (preferences: Partial<NotificationPreference>) => void;
  sendTestNotification: () => Promise<void>;
  selectClient: (clientId: string) => void;
  reset: () => void;
}

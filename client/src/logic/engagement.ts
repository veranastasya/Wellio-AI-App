import type {
  ClientActivityEvent,
  Trigger,
  Recommendation,
  NotificationPreference,
  QuickAction,
  TriggerType,
  TriggerSeverity,
  RecommendationPriority,
} from '@/models/engagement';

const generateId = () => Math.random().toString(36).substring(2, 15);

export function detectTriggers(activityFeed: ClientActivityEvent[], clientId: string): Trigger[] {
  const triggers: Trigger[] = [];
  const now = new Date();
  
  console.log(`[Engagement] Detecting triggers for ${activityFeed.length} activity events`);
  
  const missedTasks = activityFeed.filter(e => e.type === 'missed_task');
  missedTasks.forEach(event => {
    const trigger: Trigger = {
      id: generateId(),
      clientId,
      type: 'missed_log',
      severity: 'Medium',
      detectedAt: now.toISOString(),
      reason: event.title,
      recommendedAction: `Send a gentle reminder about ${event.description}`,
      isResolved: false,
    };
    triggers.push(trigger);
    console.log(`[Engagement] Trigger detected: ${trigger.type} - ${trigger.reason}`);
  });
  
  const inactivityEvents = activityFeed.filter(e => e.type === 'inactivity');
  inactivityEvents.forEach(event => {
    const hours = parseInt(event.title.match(/\d+/)?.[0] || '0');
    const severity: TriggerSeverity = hours >= 8 ? 'High' : hours >= 4 ? 'Medium' : 'Low';
    
    const trigger: Trigger = {
      id: generateId(),
      clientId,
      type: 'inactivity',
      severity,
      detectedAt: now.toISOString(),
      reason: event.title,
      recommendedAction: 'Check in with client to ensure they are doing well',
      isResolved: false,
    };
    triggers.push(trigger);
    console.log(`[Engagement] Trigger detected: ${trigger.type} - ${trigger.severity} severity`);
  });
  
  const workoutLogs = activityFeed.filter(e => e.category === 'workout' && e.type === 'log');
  if (workoutLogs.length < 2) {
    const trigger: Trigger = {
      id: generateId(),
      clientId,
      type: 'pattern_deviation',
      severity: 'Low',
      detectedAt: now.toISOString(),
      reason: 'Deviation from workout routine this week',
      recommendedAction: 'Discuss schedule adjustments with client',
      isResolved: false,
    };
    triggers.push(trigger);
    console.log(`[Engagement] Trigger detected: ${trigger.type} - low workout frequency`);
  }
  
  console.log(`[Engagement] Total triggers detected: ${triggers.length}`);
  return triggers;
}

export function generateRecommendation(trigger: Trigger): Recommendation {
  const messageTemplates: Record<TriggerType, string[]> = {
    missed_log: [
      "Hey! Just checking in - how did things go today? Don't forget to log when you get a chance!",
      "Quick reminder to log your meals - it really helps us track your progress together!",
      "Noticed you haven't logged in a bit. Everything okay? I'm here if you need anything!",
    ],
    inactivity: [
      "Hope your day is going well! Haven't seen you in a bit - everything okay?",
      "Just wanted to check in and see how you're doing. Let me know if you need anything!",
      "Hey! Thinking of you - how's the week going so far?",
    ],
    pattern_deviation: [
      "I noticed the workouts have been lighter this week. Want to chat about adjusting your schedule?",
      "Looks like your routine has shifted a bit - totally normal! Let's connect and see what's working for you.",
      "Hey! I see some changes in your patterns. Want to discuss any adjustments to your plan?",
    ],
    goal_at_risk: [
      "I want to make sure we stay on track with your goals. Let's chat about what might help!",
      "Your goal deadline is approaching - let's review your progress and make any needed adjustments.",
      "Hey! Just a friendly check on your goals. How can I help you stay motivated?",
    ],
    engagement_drop: [
      "I've missed hearing from you! Is there anything I can do to help you stay engaged?",
      "Hey! I notice we haven't connected much lately. Everything okay on your end?",
      "Just reaching out to see how you're doing. I'm here to support you however I can!",
    ],
  };
  
  const templates = messageTemplates[trigger.type] || messageTemplates.inactivity;
  const message = templates[Math.floor(Math.random() * templates.length)];
  
  const priorityMap: Record<TriggerSeverity, RecommendationPriority> = {
    High: 'high',
    Medium: 'medium',
    Low: 'low',
  };
  
  const recommendation: Recommendation = {
    id: generateId(),
    clientId: trigger.clientId,
    triggerId: trigger.id,
    message,
    reason: trigger.reason,
    priority: priorityMap[trigger.severity],
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  
  console.log(`[Engagement] Recommendation generated for trigger ${trigger.id}: "${message.substring(0, 50)}..."`);
  
  return recommendation;
}

export async function simulateNotificationSend(
  recommendation: Recommendation,
  preferences: NotificationPreference
): Promise<{ success: boolean; channels: string[]; error?: string }> {
  console.log(`[Engagement] Sending notification for recommendation ${recommendation.id}`);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const channels: string[] = [];
  if (preferences.inApp) channels.push('inApp');
  if (preferences.webPush) channels.push('webPush');
  if (preferences.sms) channels.push('sms');
  
  if (channels.length === 0) {
    console.warn(`[Engagement] No notification channels enabled for client ${recommendation.clientId}`);
    return { success: false, channels: [], error: 'No notification channels enabled' };
  }
  
  console.log(`[Engagement] Notification sent via: ${channels.join(', ')}`);
  console.log(`[Engagement] Message: "${recommendation.message.substring(0, 50)}..."`);
  
  return { success: true, channels };
}

export function getQuickActions(): QuickAction[] {
  return [
    {
      id: 'checkin',
      label: 'Send Check-In',
      icon: 'MessageSquare',
      template: "Hey! Just checking in - how are you feeling today? Anything I can help with?",
      category: 'checkin',
    },
    {
      id: 'meals',
      label: 'Ask About Meals',
      icon: 'Utensils',
      template: "Quick question - how have your meals been going this week? Any challenges with nutrition?",
      category: 'meals',
    },
    {
      id: 'training',
      label: 'Prompt Training Log',
      icon: 'Dumbbell',
      template: "Don't forget to log your workout when you finish! It helps us track your awesome progress.",
      category: 'training',
    },
    {
      id: 'motivation',
      label: 'Send Motivation',
      icon: 'Zap',
      template: "Just wanted to say you're doing amazing! Keep up the great work - I believe in you!",
      category: 'motivation',
    },
  ];
}

export function analyzeEngagementTrends(activityFeed: ClientActivityEvent[]): {
  loggingFrequency: number;
  topCategory: string;
  averageLogsPerDay: number;
  engagementScore: number;
} {
  const logs = activityFeed.filter(e => e.type === 'log');
  const days = new Set(logs.map(e => e.timestamp.split('T')[0])).size || 1;
  
  const categoryCount: Record<string, number> = {};
  logs.forEach(log => {
    categoryCount[log.category] = (categoryCount[log.category] || 0) + 1;
  });
  
  const topCategory = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
  
  const averageLogsPerDay = logs.length / days;
  const engagementScore = Math.min(100, Math.round(averageLogsPerDay * 20));
  
  return {
    loggingFrequency: logs.length,
    topCategory,
    averageLogsPerDay: Math.round(averageLogsPerDay * 10) / 10,
    engagementScore,
  };
}

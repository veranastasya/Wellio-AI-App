import bcrypt from "bcrypt";
import {
  type Coach,
  type InsertCoach,
  type Client,
  type InsertClient,
  type Session,
  type InsertSession,
  type Message,
  type InsertMessage,
  type Activity,
  type InsertActivity,
  type Questionnaire,
  type InsertQuestionnaire,
  type Response,
  type InsertResponse,
  type NutritionLog,
  type InsertNutritionLog,
  type WorkoutLog,
  type InsertWorkoutLog,
  type CheckIn,
  type InsertCheckIn,
  type DeviceConnection,
  type InsertDeviceConnection,
  type ConnectionRequest,
  type InsertConnectionRequest,
  type ClientToken,
  type InsertClientToken,
  type ClientInvite,
  type InsertClientInvite,
  type ClientPlan,
  type InsertClientPlan,
  type Goal,
  type InsertGoal,
  type ClientDataLog,
  type InsertClientDataLog,
  type SmartLog,
  type InsertSmartLog,
  type ProgressEvent,
  type InsertProgressEvent,
  type WeeklyReport,
  type InsertWeeklyReport,
  type PlanTargetsRecord,
  type InsertPlanTargets,
  type PlanSession,
  type InsertPlanSession,
  type PlanMessage,
  type InsertPlanMessage,
  type EngagementTrigger,
  type InsertEngagementTrigger,
  type EngagementRecommendation,
  type InsertEngagementRecommendation,
  type EngagementNotificationPreferences,
  type InsertEngagementNotificationPreferences,
  type InAppNotification,
  type InsertInAppNotification,
  type PushSubscription,
  type InsertPushSubscription,
  type CoachPushSubscription,
  type InsertCoachPushSubscription,
  type ClientReminderSettings,
  type InsertClientReminderSettings,
  type SentReminder,
  type InsertSentReminder,
  type ProgressPhoto,
  type InsertProgressPhoto,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  coaches,
  clients,
  sessions,
  messages,
  activities,
  questionnaires,
  responses,
  nutritionLogs,
  workoutLogs,
  checkIns,
  deviceConnections,
  connectionRequests,
  clientTokens,
  clientInvites,
  clientPlans,
  goals,
  clientDataLogs,
  smartLogs,
  progressEvents,
  weeklyReports,
  planTargets,
  planSessions,
  planMessages,
  engagementTriggers,
  engagementRecommendations,
  engagementNotificationPreferences,
  inAppNotifications,
  pushSubscriptions,
  coachPushSubscriptions,
  clientReminderSettings,
  sentReminders,
  progressPhotos,
  passwordResetTokens,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte, inArray, ne } from "drizzle-orm";

export interface IStorage {
  // Coaches
  getCoach(id: string): Promise<Coach | undefined>;
  getCoachByEmail(email: string): Promise<Coach | undefined>;
  getCoachByOAuthId(oauthId: string): Promise<Coach | undefined>;
  getDefaultCoach(): Promise<Coach | undefined>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach | undefined>;

  // Clients
  getClients(coachId?: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  getClientByEmail(email: string, coachId?: string): Promise<Client | undefined>;
  getClientByOAuthId(oauthId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Sessions
  getSessions(coachId?: string): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, session: Partial<InsertSession>): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;

  // Messages
  getMessages(coachId?: string): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, message: Partial<InsertMessage>): Promise<Message | undefined>;

  // Activities
  getActivities(coachId?: string): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Questionnaires
  getQuestionnaires(coachId?: string): Promise<Questionnaire[]>;
  getQuestionnaire(id: string): Promise<Questionnaire | undefined>;
  createQuestionnaire(questionnaire: InsertQuestionnaire): Promise<Questionnaire>;
  updateQuestionnaire(id: string, questionnaire: Partial<InsertQuestionnaire>): Promise<Questionnaire | undefined>;
  deleteQuestionnaire(id: string): Promise<boolean>;
  incrementQuestionnaireUsage(id: string): Promise<void>;
  publishQuestionnaire(id: string): Promise<Questionnaire | undefined>;
  archiveQuestionnaire(id: string): Promise<Questionnaire | undefined>;
  restoreQuestionnaire(id: string): Promise<Questionnaire | undefined>;

  // Responses
  getResponses(): Promise<Response[]>;
  getResponse(id: string): Promise<Response | undefined>;
  createResponse(response: InsertResponse): Promise<Response>;
  getResponsesByClient(clientId: string): Promise<Response[]>;
  toggleResponsePin(responseId: string, pinned: boolean): Promise<Response | undefined>;

  // Nutrition Logs
  getNutritionLogs(): Promise<NutritionLog[]>;
  getNutritionLog(id: string): Promise<NutritionLog | undefined>;
  createNutritionLog(nutritionLog: InsertNutritionLog): Promise<NutritionLog>;

  // Workout Logs
  getWorkoutLogs(): Promise<WorkoutLog[]>;
  getWorkoutLog(id: string): Promise<WorkoutLog | undefined>;
  createWorkoutLog(workoutLog: InsertWorkoutLog): Promise<WorkoutLog>;

  // Check-ins
  getCheckIns(): Promise<CheckIn[]>;
  getCheckIn(id: string): Promise<CheckIn | undefined>;
  createCheckIn(checkIn: InsertCheckIn): Promise<CheckIn>;

  // Device Connections
  getDeviceConnections(): Promise<DeviceConnection[]>;
  getDeviceConnectionsByClient(clientId: string): Promise<DeviceConnection[]>;
  getDeviceConnection(id: string): Promise<DeviceConnection | undefined>;
  createDeviceConnection(deviceConnection: InsertDeviceConnection): Promise<DeviceConnection>;
  updateDeviceConnection(id: string, deviceConnection: Partial<InsertDeviceConnection>): Promise<DeviceConnection | undefined>;
  deleteDeviceConnection(id: string): Promise<boolean>;

  // Connection Requests
  getConnectionRequests(): Promise<ConnectionRequest[]>;
  getConnectionRequestsByClient(clientId: string): Promise<ConnectionRequest[]>;
  getPendingConnectionRequestByEmail(email: string): Promise<ConnectionRequest | undefined>;
  getConnectionRequestByInviteCode(code: string): Promise<ConnectionRequest | undefined>;
  getConnectionRequest(id: string): Promise<ConnectionRequest | undefined>;
  createConnectionRequest(request: InsertConnectionRequest): Promise<ConnectionRequest>;
  updateConnectionRequest(id: string, request: Partial<InsertConnectionRequest>): Promise<ConnectionRequest | undefined>;
  deleteConnectionRequest(id: string): Promise<boolean>;

  // Client Tokens
  getClientTokens(): Promise<ClientToken[]>;
  getClientToken(id: string): Promise<ClientToken | undefined>;
  getClientTokenByToken(token: string): Promise<ClientToken | undefined>;
  getClientTokenByEmail(email: string): Promise<ClientToken | undefined>;
  createClientToken(clientToken: InsertClientToken): Promise<ClientToken>;
  updateClientToken(id: string, clientToken: Partial<InsertClientToken>): Promise<ClientToken | undefined>;
  deleteClientToken(id: string): Promise<boolean>;

  // Client Invites
  getClientInvites(): Promise<ClientInvite[]>;
  getClientInvite(id: string): Promise<ClientInvite | undefined>;
  getClientInviteByEmail(email: string): Promise<ClientInvite | undefined>;
  getClientInviteByEmailAndCoach(email: string, coachId: string): Promise<ClientInvite | undefined>;
  getClientInviteByClientId(clientId: string): Promise<ClientInvite | undefined>;
  getClientInvitesByCoachId(coachId: string): Promise<ClientInvite[]>;
  createClientInvite(clientInvite: InsertClientInvite): Promise<ClientInvite>;
  updateClientInvite(id: string, clientInvite: Partial<InsertClientInvite>): Promise<ClientInvite | undefined>;
  deleteClientInvite(id: string): Promise<boolean>;

  // Password Reset Tokens
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;

  // Client Plans
  getClientPlans(): Promise<ClientPlan[]>;
  getClientPlan(id: string): Promise<ClientPlan | undefined>;
  getClientPlansByClientId(clientId: string): Promise<ClientPlan[]>;
  getActiveClientPlan(clientId: string): Promise<ClientPlan | undefined>;
  createClientPlan(clientPlan: InsertClientPlan): Promise<ClientPlan>;
  updateClientPlan(id: string, clientPlan: Partial<InsertClientPlan>): Promise<ClientPlan | undefined>;
  deleteClientPlan(id: string): Promise<boolean>;
  archiveActivePlan(clientId: string): Promise<ClientPlan | undefined>;
  archiveActivePlanExcept(clientId: string, excludePlanId: string): Promise<number>;
  // Plan type-specific methods
  getClientLongTermPlan(clientId: string): Promise<ClientPlan | undefined>;
  getClientWeeklyPlans(clientId: string): Promise<ClientPlan[]>;
  getCurrentWeeklyPlan(clientId: string): Promise<ClientPlan | undefined>;

  // Plan Sessions (AI Plan Builder chat history)
  getPlanSessions(coachId?: string): Promise<PlanSession[]>;
  getPlanSession(id: string): Promise<PlanSession | undefined>;
  getPlanSessionsByClientId(clientId: string): Promise<PlanSession[]>;
  getActivePlanSession(clientId: string): Promise<PlanSession | undefined>;
  createPlanSession(session: InsertPlanSession): Promise<PlanSession>;
  updatePlanSession(id: string, session: Partial<InsertPlanSession>): Promise<PlanSession | undefined>;
  deletePlanSession(id: string): Promise<boolean>;

  // Plan Messages (chat messages within a session)
  getPlanMessages(sessionId: string): Promise<PlanMessage[]>;
  createPlanMessage(message: InsertPlanMessage): Promise<PlanMessage>;
  deletePlanMessages(sessionId: string): Promise<boolean>;

  // Goals
  getGoals(coachId?: string): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  getGoalsByClientId(clientId: string): Promise<Goal[]>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<boolean>;

  // Client Data Logs (unified progress tracking)
  getClientDataLogs(): Promise<ClientDataLog[]>;
  getClientDataLog(id: string): Promise<ClientDataLog | undefined>;
  getClientDataLogsByClientId(clientId: string, options?: { startDate?: string; endDate?: string; type?: string }): Promise<ClientDataLog[]>;
  createClientDataLog(log: InsertClientDataLog): Promise<ClientDataLog>;
  updateClientDataLog(id: string, log: Partial<InsertClientDataLog>): Promise<ClientDataLog | undefined>;
  deleteClientDataLog(id: string): Promise<boolean>;

  // Smart Logs (AI-powered progress tracking)
  getSmartLogs(): Promise<SmartLog[]>;
  getSmartLog(id: string): Promise<SmartLog | undefined>;
  getSmartLogsByClientId(clientId: string, options?: { startDate?: string; endDate?: string; limit?: number }): Promise<SmartLog[]>;
  createSmartLog(log: InsertSmartLog): Promise<SmartLog>;
  updateSmartLog(id: string, log: Partial<InsertSmartLog>): Promise<SmartLog | undefined>;
  deleteSmartLog(id: string): Promise<boolean>;
  getPendingSmartLogs(limit?: number): Promise<SmartLog[]>;

  // Progress Events (normalized metrics)
  getProgressEvents(): Promise<ProgressEvent[]>;
  getProgressEvent(id: string): Promise<ProgressEvent | undefined>;
  getProgressEventsByClientId(clientId: string, options?: { startDate?: string; endDate?: string; eventType?: string }): Promise<ProgressEvent[]>;
  createProgressEvent(event: InsertProgressEvent): Promise<ProgressEvent>;
  updateProgressEvent(id: string, event: Partial<InsertProgressEvent>): Promise<ProgressEvent | undefined>;
  deleteProgressEvent(id: string): Promise<boolean>;
  getProgressEventsBySmartLogId(smartLogId: string): Promise<ProgressEvent[]>;

  // Weekly Reports
  getWeeklyReports(): Promise<WeeklyReport[]>;
  getWeeklyReport(id: string): Promise<WeeklyReport | undefined>;
  getWeeklyReportsByClientId(clientId: string, options?: { limit?: number }): Promise<WeeklyReport[]>;
  getWeeklyReportByWeek(clientId: string, weekStart: string): Promise<WeeklyReport | undefined>;
  createWeeklyReport(report: InsertWeeklyReport): Promise<WeeklyReport>;
  updateWeeklyReport(id: string, report: Partial<InsertWeeklyReport>): Promise<WeeklyReport | undefined>;
  deleteWeeklyReport(id: string): Promise<boolean>;

  // Plan Targets
  getPlanTargets(): Promise<PlanTargetsRecord[]>;
  getPlanTarget(id: string): Promise<PlanTargetsRecord | undefined>;
  getPlanTargetsByClientId(clientId: string): Promise<PlanTargetsRecord[]>;
  getActivePlanTarget(clientId: string): Promise<PlanTargetsRecord | undefined>;
  createPlanTarget(target: InsertPlanTargets): Promise<PlanTargetsRecord>;
  updatePlanTarget(id: string, target: Partial<InsertPlanTargets>): Promise<PlanTargetsRecord | undefined>;
  deletePlanTarget(id: string): Promise<boolean>;

  // Engagement Triggers
  getEngagementTriggers(clientId: string, coachId: string): Promise<EngagementTrigger[]>;
  getEngagementTrigger(id: string): Promise<EngagementTrigger | undefined>;
  createEngagementTrigger(trigger: InsertEngagementTrigger): Promise<EngagementTrigger>;
  updateEngagementTrigger(id: string, trigger: Partial<InsertEngagementTrigger>): Promise<EngagementTrigger | undefined>;
  resolveEngagementTrigger(id: string): Promise<EngagementTrigger | undefined>;

  // Engagement Recommendations
  getEngagementRecommendations(clientId: string, coachId: string): Promise<EngagementRecommendation[]>;
  getEngagementRecommendation(id: string): Promise<EngagementRecommendation | undefined>;
  createEngagementRecommendation(recommendation: InsertEngagementRecommendation): Promise<EngagementRecommendation>;
  updateEngagementRecommendation(id: string, recommendation: Partial<InsertEngagementRecommendation>): Promise<EngagementRecommendation | undefined>;

  // Engagement Notification Preferences
  getEngagementNotificationPreferences(coachId: string, clientId?: string): Promise<EngagementNotificationPreferences | undefined>;
  upsertEngagementNotificationPreferences(preferences: InsertEngagementNotificationPreferences): Promise<EngagementNotificationPreferences>;

  // In-App Notifications
  getInAppNotifications(clientId: string): Promise<InAppNotification[]>;
  getUnreadInAppNotifications(clientId: string): Promise<InAppNotification[]>;
  createInAppNotification(notification: InsertInAppNotification): Promise<InAppNotification>;
  markInAppNotificationRead(id: string): Promise<InAppNotification | undefined>;

  // Push Subscriptions (multi-device support)
  getPushSubscription(clientId: string): Promise<PushSubscription | undefined>;
  getAllPushSubscriptions(clientId: string): Promise<PushSubscription[]>;
  getPushSubscriptionsByClientIds(clientIds: string[]): Promise<PushSubscription[]>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  updatePushSubscription(clientId: string, subscription: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined>;
  deletePushSubscription(clientId: string): Promise<boolean>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean>;

  // Coach Push Subscriptions (multi-device support)
  getCoachPushSubscription(coachId: string): Promise<CoachPushSubscription | undefined>;
  getAllCoachPushSubscriptions(coachId: string): Promise<CoachPushSubscription[]>;
  createCoachPushSubscription(subscription: InsertCoachPushSubscription): Promise<CoachPushSubscription>;
  deleteCoachPushSubscription(coachId: string): Promise<boolean>;
  deleteCoachPushSubscriptionByEndpoint(endpoint: string): Promise<boolean>;

  // Progress Photos
  getProgressPhotos(clientId: string): Promise<ProgressPhoto[]>;
  getProgressPhotosSharedWithCoach(clientId: string): Promise<ProgressPhoto[]>;
  getProgressPhoto(id: string): Promise<ProgressPhoto | undefined>;
  createProgressPhoto(photo: InsertProgressPhoto): Promise<ProgressPhoto>;
  updateProgressPhoto(id: string, photo: Partial<InsertProgressPhoto>): Promise<ProgressPhoto | undefined>;
  deleteProgressPhoto(id: string): Promise<boolean>;

  // Seeding
  seedData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async seedData() {
    const existingClients = await db.select().from(clients);
    if (existingClients.length > 0) {
      return;
    }

    // Hash default password for all seeded clients
    const defaultPasswordHash = await bcrypt.hash("password", 10);

    const sampleClients: InsertClient[] = [
      {
        name: "Sarah Wilson",
        email: "sarah.wilson@example.com",
        passwordHash: defaultPasswordHash,
        phone: "+1 (555) 123-4567",
        status: "active",
        goalType: "gain_muscle_strength",
        progressScore: 87,
        joinedDate: "2024-01-15",
        lastSession: "2024-10-12",
        notes: "Excellent progress, very motivated",
      },
      {
        name: "Alex Thompson",
        email: "alex.thompson@example.com",
        passwordHash: defaultPasswordHash,
        phone: "+1 (555) 234-5678",
        status: "active",
        goalType: "improve_fitness_endurance",
        progressScore: 72,
        joinedDate: "2024-02-20",
        lastSession: "2024-10-13",
        notes: "Working on endurance goals",
      },
      {
        name: "Lisa Chen",
        email: "lisa.chen@example.com",
        passwordHash: defaultPasswordHash,
        phone: "+1 (555) 345-6789",
        status: "active",
        goalType: "eat_healthier",
        progressScore: 65,
        joinedDate: "2024-03-10",
        lastSession: "2024-10-10",
        notes: "Focus on meal planning",
      },
      {
        name: "Michael Brown",
        email: "michael.brown@example.com",
        phone: "+1 (555) 456-7890",
        status: "active",
        goalType: "lose_weight",
        progressScore: 58,
        joinedDate: "2024-04-05",
        lastSession: "2024-10-11",
        notes: "Making steady progress",
      },
      {
        name: "Emma Davis",
        email: "emma.davis@example.com",
        passwordHash: defaultPasswordHash,
        phone: "+1 (555) 567-8901",
        status: "active",
        goalType: "improve_health",
        progressScore: 91,
        joinedDate: "2024-01-20",
        lastSession: "2024-10-14",
        notes: "Advanced student, great dedication",
      },
    ];

    const insertedClients = await db.insert(clients).values(sampleClients).returning();
    const clientIds = insertedClients.map((c) => c.id);

    const sampleSessions: InsertSession[] = [
      {
        clientId: clientIds[0],
        clientName: "Sarah Wilson",
        sessionType: "Strength Training",
        date: "2024-10-14",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        status: "scheduled",
        notes: "Focus on upper body",
      },
      {
        clientId: clientIds[1],
        clientName: "Alex Thompson",
        sessionType: "Cardio Session",
        date: "2024-10-14",
        startTime: "11:30 AM",
        endTime: "12:30 PM",
        status: "scheduled",
        notes: "HIIT workout",
      },
      {
        clientId: clientIds[2],
        clientName: "Lisa Chen",
        sessionType: "Nutrition Consultation",
        date: "2024-10-14",
        startTime: "2:00 PM",
        endTime: "3:00 PM",
        status: "scheduled",
        notes: "Weekly meal prep review",
      },
      {
        clientId: clientIds[0],
        clientName: "Sarah Wilson",
        sessionType: "Strength Training",
        date: "2024-10-12",
        startTime: "9:00 AM",
        endTime: "10:00 AM",
        status: "completed",
        notes: "Great session",
      },
    ];

    await db.insert(sessions).values(sampleSessions);

    const sampleActivities: InsertActivity[] = [
      {
        clientId: clientIds[0],
        clientName: "Sarah Wilson",
        activityType: "workout",
        description: "completed workout session",
        timestamp: "2024-10-13T14:30:00Z",
        status: "completed",
      },
      {
        clientId: clientIds[1],
        clientName: "Alex Thompson",
        activityType: "milestone",
        description: "reached 5K running goal",
        timestamp: "2024-10-13T10:15:00Z",
        status: "completed",
      },
      {
        clientId: clientIds[2],
        clientName: "Lisa Chen",
        activityType: "check-in",
        description: "submitted weekly progress photos",
        timestamp: "2024-10-12T16:45:00Z",
        status: "completed",
      },
    ];

    await db.insert(activities).values(sampleActivities);

    const sampleMessages: InsertMessage[] = [
      {
        clientId: clientIds[0],
        clientName: "Sarah Wilson",
        content: "Hi! I have a question about my workout plan.",
        sender: "client",
        timestamp: "2024-10-13T09:00:00Z",
        read: true,
      },
      {
        clientId: clientIds[0],
        clientName: "Sarah Wilson",
        content: "Of course! What would you like to know?",
        sender: "coach",
        timestamp: "2024-10-13T09:05:00Z",
        read: true,
      },
      {
        clientId: clientIds[1],
        clientName: "Alex Thompson",
        content: "Thanks for the great session today!",
        sender: "client",
        timestamp: "2024-10-13T13:30:00Z",
        read: false,
      },
    ];

    await db.insert(messages).values(sampleMessages);

    const sampleNutritionLogs: InsertNutritionLog[] = [
      {
        clientId: clientIds[0],
        clientName: "Sarah Wilson",
        date: "2024-10-13",
        calories: 2100,
        protein: 140,
        carbs: 200,
        fats: 70,
        notes: "On track with macros",
        createdAt: "2024-10-13T08:00:00Z",
      },
      {
        clientId: clientIds[0],
        clientName: "Sarah Wilson",
        date: "2024-10-12",
        calories: 2050,
        protein: 135,
        carbs: 210,
        fats: 65,
        notes: "Slightly lower protein",
        createdAt: "2024-10-12T08:00:00Z",
      },
      {
        clientId: clientIds[1],
        clientName: "Alex Thompson",
        date: "2024-10-13",
        calories: 2400,
        protein: 150,
        carbs: 250,
        fats: 80,
        notes: "High energy day",
        createdAt: "2024-10-13T08:00:00Z",
      },
    ];

    await db.insert(nutritionLogs).values(sampleNutritionLogs);

    const sampleWorkoutLogs: InsertWorkoutLog[] = [
      {
        clientId: clientIds[0],
        clientName: "Sarah Wilson",
        date: "2024-10-12",
        workoutType: "Strength Training",
        duration: 60,
        intensity: "High",
        exercises: JSON.stringify([
          { name: "Squats", sets: 4, reps: 8, weight: 135 },
          { name: "Bench Press", sets: 4, reps: 8, weight: 95 },
          { name: "Deadlifts", sets: 3, reps: 6, weight: 185 },
        ]),
        notes: "Great session, increased weight on squats",
        createdAt: "2024-10-12T10:30:00Z",
      },
      {
        clientId: clientIds[1],
        clientName: "Alex Thompson",
        date: "2024-10-13",
        workoutType: "Cardio",
        duration: 45,
        intensity: "Medium",
        exercises: JSON.stringify([
          { name: "Running", distance: "5K", time: "28:15" },
          { name: "Rowing", distance: "1000m", time: "4:20" },
        ]),
        notes: "PR on 5K time!",
        createdAt: "2024-10-13T06:30:00Z",
      },
    ];

    await db.insert(workoutLogs).values(sampleWorkoutLogs);

    const sampleCheckIns: InsertCheckIn[] = [
      {
        clientId: clientIds[0],
        clientName: "Sarah Wilson",
        date: "2024-10-07",
        weight: 145,
        bodyFat: 22,
        measurements: JSON.stringify({
          chest: 36,
          waist: 28,
          hips: 38,
          arms: 12,
        }),
        photos: JSON.stringify([]),
        mood: "Excellent",
        energy: "High",
        notes: "Feeling strong and energized",
        createdAt: "2024-10-07T09:00:00Z",
      },
      {
        clientId: clientIds[0],
        clientName: "Sarah Wilson",
        date: "2024-09-30",
        weight: 147,
        bodyFat: 23,
        measurements: JSON.stringify({
          chest: 36.5,
          waist: 28.5,
          hips: 38.5,
          arms: 12,
        }),
        photos: JSON.stringify([]),
        mood: "Good",
        energy: "Medium",
        notes: "Making progress",
        createdAt: "2024-09-30T09:00:00Z",
      },
      {
        clientId: clientIds[1],
        clientName: "Alex Thompson",
        date: "2024-10-01",
        weight: 172,
        bodyFat: 18,
        measurements: JSON.stringify({
          chest: 40,
          waist: 32,
          hips: 38,
          arms: 14,
        }),
        photos: JSON.stringify([]),
        mood: "Great",
        energy: "High",
        notes: "Cardio is improving",
        createdAt: "2024-10-01T09:00:00Z",
      },
    ];

    await db.insert(checkIns).values(sampleCheckIns);

    // Seed sample weekly plans with real content
    const now = new Date();
    const getMonday = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff));
    };
    const getSunday = (monday: Date) => {
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return sunday;
    };
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    
    const thisMonday = getMonday(now);
    const thisSunday = getSunday(thisMonday);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(lastMonday.getDate() - 7);
    const lastSunday = getSunday(lastMonday);

    const weeklyPlanContent = {
      content: `# Weekly Wellness Plan

## This Week's Focus
Building consistency with your workout routine while maintaining balanced nutrition.

## Workout Schedule

**Monday:** Upper body strength training (45 min)
- Bench press: 4 sets x 10 reps
- Dumbbell rows: 3 sets x 12 reps
- Shoulder press: 3 sets x 10 reps
- Bicep curls: 3 sets x 12 reps

**Wednesday:** Lower body & core (45 min)
- Squats: 4 sets x 10 reps
- Romanian deadlifts: 3 sets x 10 reps
- Lunges: 3 sets x 12 reps (each leg)
- Plank: 3 sets x 45 seconds

**Friday:** Full body circuit (40 min)
- Burpees: 3 sets x 10 reps
- Kettlebell swings: 3 sets x 15 reps
- Push-ups: 3 sets x 15 reps
- Mountain climbers: 3 sets x 20 reps

## Nutrition Guidelines

**Daily Targets:**
- Calories: 2000-2200 kcal
- Protein: 130-150g
- Carbohydrates: 200-250g
- Healthy fats: 60-70g

**Meal Timing:**
- Breakfast: Within 1 hour of waking
- Pre-workout: 1-2 hours before training
- Post-workout: Within 45 minutes of training
- Dinner: 2-3 hours before bed

## Recovery & Wellness
- Aim for 7-8 hours of sleep each night
- Stay hydrated: drink 8-10 glasses of water daily
- Take 10 minutes daily for stretching or mobility work
- Practice stress management: 5 min breathing exercises

## Weekly Goals
1. Complete all 3 scheduled workouts
2. Log your meals daily using the AI Tracker
3. Hit your protein target at least 5 days this week
4. Get at least 7 hours of sleep each night`
    };

    const pastWeekPlanContent = {
      content: `# Weekly Wellness Plan

## Last Week's Focus
Introduction to consistent training and meal logging habits.

## Workout Schedule

**Monday:** Cardio & mobility (30 min)
- Brisk walking or light jogging: 20 min
- Dynamic stretching: 10 min

**Wednesday:** Full body basics (35 min)
- Bodyweight squats: 3 sets x 15 reps
- Push-ups (or modified): 3 sets x 10 reps
- Dumbbell rows: 3 sets x 10 reps
- Plank: 3 sets x 30 seconds

**Friday:** Active recovery
- Light yoga or stretching: 30 min
- Foam rolling: 10 min

## Nutrition Guidelines

**Focus Areas:**
- Start logging all meals
- Increase vegetable intake
- Reduce processed foods
- Drink more water`
    };

    // Create weekly plans for the first two clients
    const sampleWeeklyPlans: InsertClientPlan[] = [
      {
        clientId: clientIds[0],
        coachId: "default-coach",
        planName: `Week of ${formatDate(thisMonday)} - ${formatDate(thisSunday)}`,
        planContent: weeklyPlanContent,
        status: "active",
        shared: true,
        planType: "weekly",
        weekStartDate: formatDate(thisMonday),
        weekEndDate: formatDate(thisSunday),
      },
      {
        clientId: clientIds[0],
        coachId: "default-coach",
        planName: `Week of ${formatDate(lastMonday)} - ${formatDate(lastSunday)}`,
        planContent: pastWeekPlanContent,
        status: "archived",
        shared: true,
        planType: "weekly",
        weekStartDate: formatDate(lastMonday),
        weekEndDate: formatDate(lastSunday),
      },
      {
        clientId: clientIds[1],
        coachId: "default-coach",
        planName: `Week of ${formatDate(thisMonday)} - ${formatDate(thisSunday)}`,
        planContent: weeklyPlanContent,
        status: "active",
        shared: true,
        planType: "weekly",
        weekStartDate: formatDate(thisMonday),
        weekEndDate: formatDate(thisSunday),
      },
    ];

    const nowIso = now.toISOString();
    for (const plan of sampleWeeklyPlans) {
      await db.insert(clientPlans).values({
        ...plan,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  // Coach methods
  async getCoach(id: string): Promise<Coach | undefined> {
    const result = await db.select().from(coaches).where(eq(coaches.id, id));
    return result[0];
  }

  async getCoachByEmail(email: string): Promise<Coach | undefined> {
    const result = await db.select().from(coaches).where(eq(coaches.email, email));
    return result[0];
  }

  async getCoachByOAuthId(oauthId: string): Promise<Coach | undefined> {
    const result = await db.select().from(coaches).where(eq(coaches.oauthId, oauthId));
    return result[0];
  }

  async getDefaultCoach(): Promise<Coach | undefined> {
    const result = await db.select().from(coaches).limit(1);
    return result[0];
  }

  async createCoach(coach: InsertCoach): Promise<Coach> {
    const result = await db.insert(coaches).values(coach).returning();
    return result[0];
  }

  async updateCoach(id: string, coach: Partial<InsertCoach>): Promise<Coach | undefined> {
    const result = await db.update(coaches).set(coach).where(eq(coaches.id, id)).returning();
    return result[0];
  }

  // Client methods
  async getClients(coachId?: string): Promise<Client[]> {
    if (coachId) {
      return await db.select().from(clients).where(eq(clients.coachId, coachId));
    }
    return await db.select().from(clients);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientByEmail(email: string, coachId?: string): Promise<Client | undefined> {
    if (coachId) {
      const [client] = await db.select().from(clients).where(
        and(eq(clients.email, email), eq(clients.coachId, coachId))
      );
      return client || undefined;
    }
    const [client] = await db.select().from(clients).where(eq(clients.email, email));
    return client || undefined;
  }

  async getClientByOAuthId(oauthId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.oauthId, oauthId));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set(data)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient || undefined;
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Session methods
  async getSessions(coachId?: string): Promise<Session[]> {
    if (coachId) {
      // Get sessions for clients belonging to this coach
      const coachClientIds = db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.coachId, coachId));
      
      return await db
        .select()
        .from(sessions)
        .where(inArray(sessions.clientId, coachClientIds));
    }
    return await db.select().from(sessions);
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(insertSession).returning();
    return session;
  }

  async updateSession(id: string, updateData: Partial<InsertSession>): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set(updateData)
      .where(eq(sessions.id, id))
      .returning();
    return session || undefined;
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Message methods
  async getMessages(coachId?: string): Promise<Message[]> {
    if (coachId) {
      // Get messages for clients belonging to this coach
      const coachClientIds = db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.coachId, coachId));
      
      return await db
        .select()
        .from(messages)
        .where(inArray(messages.clientId, coachClientIds));
    }
    return await db.select().from(messages);
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async updateMessage(id: string, updateData: Partial<InsertMessage>): Promise<Message | undefined> {
    const [updatedMessage] = await db
      .update(messages)
      .set(updateData)
      .where(eq(messages.id, id))
      .returning();
    return updatedMessage || undefined;
  }

  // Activity methods
  async getActivities(coachId?: string): Promise<Activity[]> {
    if (coachId) {
      // Get activities for clients belonging to this coach
      const coachClientIds = db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.coachId, coachId));
      
      return await db
        .select()
        .from(activities)
        .where(inArray(activities.clientId, coachClientIds));
    }
    return await db.select().from(activities);
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  // Questionnaire methods
  async getQuestionnaires(coachId?: string): Promise<Questionnaire[]> {
    if (coachId) {
      return await db.select().from(questionnaires).where(eq(questionnaires.coachId, coachId));
    }
    return await db.select().from(questionnaires);
  }

  async getQuestionnaire(id: string): Promise<Questionnaire | undefined> {
    const [questionnaire] = await db.select().from(questionnaires).where(eq(questionnaires.id, id));
    return questionnaire || undefined;
  }

  async createQuestionnaire(insertQuestionnaire: InsertQuestionnaire): Promise<Questionnaire> {
    const [questionnaire] = await db.insert(questionnaires).values(insertQuestionnaire).returning();
    return questionnaire;
  }

  async updateQuestionnaire(id: string, data: Partial<InsertQuestionnaire>): Promise<Questionnaire | undefined> {
    const [updatedQuestionnaire] = await db
      .update(questionnaires)
      .set(data)
      .where(eq(questionnaires.id, id))
      .returning();
    return updatedQuestionnaire || undefined;
  }

  async deleteQuestionnaire(id: string): Promise<boolean> {
    const result = await db.delete(questionnaires).where(eq(questionnaires.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async incrementQuestionnaireUsage(id: string): Promise<void> {
    await db
      .update(questionnaires)
      .set({ usageCount: sql`${questionnaires.usageCount} + 1` })
      .where(eq(questionnaires.id, id));
  }

  async publishQuestionnaire(id: string): Promise<Questionnaire | undefined> {
    const [published] = await db
      .update(questionnaires)
      .set({ status: 'published', updatedAt: new Date().toISOString() })
      .where(eq(questionnaires.id, id))
      .returning();
    return published || undefined;
  }

  async archiveQuestionnaire(id: string): Promise<Questionnaire | undefined> {
    const [archived] = await db
      .update(questionnaires)
      .set({ 
        status: 'archived', 
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString() 
      })
      .where(eq(questionnaires.id, id))
      .returning();
    return archived || undefined;
  }

  async restoreQuestionnaire(id: string): Promise<Questionnaire | undefined> {
    const [restored] = await db
      .update(questionnaires)
      .set({ 
        status: 'published', 
        deletedAt: null,
        updatedAt: new Date().toISOString() 
      })
      .where(eq(questionnaires.id, id))
      .returning();
    return restored || undefined;
  }

  // Response methods
  async getResponses(): Promise<Response[]> {
    return await db.select().from(responses);
  }

  async getResponse(id: string): Promise<Response | undefined> {
    const [response] = await db.select().from(responses).where(eq(responses.id, id));
    return response || undefined;
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const [response] = await db.insert(responses).values(insertResponse).returning();
    return response;
  }

  async getResponsesByClient(clientId: string): Promise<Response[]> {
    return await db.select()
      .from(responses)
      .where(eq(responses.clientId, clientId))
      .orderBy(desc(responses.submittedAt));
  }

  async toggleResponsePin(responseId: string, pinned: boolean): Promise<Response | undefined> {
    const [updatedResponse] = await db
      .update(responses)
      .set({ pinnedForAI: pinned })
      .where(eq(responses.id, responseId))
      .returning();
    return updatedResponse || undefined;
  }

  // Nutrition Log methods
  async getNutritionLogs(): Promise<NutritionLog[]> {
    return await db.select().from(nutritionLogs);
  }

  async getNutritionLog(id: string): Promise<NutritionLog | undefined> {
    const [nutritionLog] = await db.select().from(nutritionLogs).where(eq(nutritionLogs.id, id));
    return nutritionLog || undefined;
  }

  async createNutritionLog(insertNutritionLog: InsertNutritionLog): Promise<NutritionLog> {
    const dataWithTimestamp = {
      ...insertNutritionLog,
      createdAt: new Date().toISOString(),
    };
    const [nutritionLog] = await db.insert(nutritionLogs).values(dataWithTimestamp).returning();
    return nutritionLog;
  }

  // Workout Log methods
  async getWorkoutLogs(): Promise<WorkoutLog[]> {
    return await db.select().from(workoutLogs);
  }

  async getWorkoutLog(id: string): Promise<WorkoutLog | undefined> {
    const [workoutLog] = await db.select().from(workoutLogs).where(eq(workoutLogs.id, id));
    return workoutLog || undefined;
  }

  async createWorkoutLog(insertWorkoutLog: InsertWorkoutLog): Promise<WorkoutLog> {
    const dataWithTimestamp = {
      ...insertWorkoutLog,
      createdAt: new Date().toISOString(),
    };
    const [workoutLog] = await db.insert(workoutLogs).values(dataWithTimestamp).returning();
    return workoutLog;
  }

  // Check-in methods
  async getCheckIns(): Promise<CheckIn[]> {
    return await db.select().from(checkIns);
  }

  async getCheckIn(id: string): Promise<CheckIn | undefined> {
    const [checkIn] = await db.select().from(checkIns).where(eq(checkIns.id, id));
    return checkIn || undefined;
  }

  async createCheckIn(insertCheckIn: InsertCheckIn): Promise<CheckIn> {
    const dataWithTimestamp = {
      ...insertCheckIn,
      createdAt: new Date().toISOString(),
    };
    const [checkIn] = await db.insert(checkIns).values(dataWithTimestamp).returning();
    return checkIn;
  }

  // Device Connection methods
  async getDeviceConnections(): Promise<DeviceConnection[]> {
    return await db.select().from(deviceConnections);
  }

  async getDeviceConnectionsByClient(clientId: string): Promise<DeviceConnection[]> {
    return await db.select().from(deviceConnections).where(eq(deviceConnections.clientId, clientId));
  }

  async getDeviceConnection(id: string): Promise<DeviceConnection | undefined> {
    const [deviceConnection] = await db.select().from(deviceConnections).where(eq(deviceConnections.id, id));
    return deviceConnection || undefined;
  }

  async createDeviceConnection(insertDeviceConnection: InsertDeviceConnection): Promise<DeviceConnection> {
    const [deviceConnection] = await db.insert(deviceConnections).values(insertDeviceConnection).returning();
    return deviceConnection;
  }

  async updateDeviceConnection(id: string, updateData: Partial<InsertDeviceConnection>): Promise<DeviceConnection | undefined> {
    const [deviceConnection] = await db.update(deviceConnections)
      .set(updateData)
      .where(eq(deviceConnections.id, id))
      .returning();
    return deviceConnection || undefined;
  }

  async deleteDeviceConnection(id: string): Promise<boolean> {
    const result = await db.delete(deviceConnections).where(eq(deviceConnections.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Connection Request methods
  async getConnectionRequests(): Promise<ConnectionRequest[]> {
    return await db.select().from(connectionRequests);
  }

  async getConnectionRequestsByClient(clientId: string): Promise<ConnectionRequest[]> {
    return await db.select().from(connectionRequests).where(eq(connectionRequests.clientId, clientId));
  }

  async getPendingConnectionRequestByEmail(email: string): Promise<ConnectionRequest | undefined> {
    const [request] = await db.select()
      .from(connectionRequests)
      .where(eq(connectionRequests.clientEmail, email))
      .orderBy(connectionRequests.requestedAt);
    return request || undefined;
  }

  async getConnectionRequestByInviteCode(code: string): Promise<ConnectionRequest | undefined> {
    const [request] = await db.select()
      .from(connectionRequests)
      .where(eq(connectionRequests.inviteCode, code));
    return request || undefined;
  }

  async getConnectionRequest(id: string): Promise<ConnectionRequest | undefined> {
    const [request] = await db.select().from(connectionRequests).where(eq(connectionRequests.id, id));
    return request || undefined;
  }

  async createConnectionRequest(insertRequest: InsertConnectionRequest): Promise<ConnectionRequest> {
    const requestedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    const inviteCode = Math.random().toString(36).substring(2, 15).toUpperCase();
    
    const dataWithDefaults = {
      ...insertRequest,
      requestedAt,
      expiresAt,
      inviteCode,
    };
    
    const [request] = await db.insert(connectionRequests).values(dataWithDefaults).returning();
    return request;
  }

  async updateConnectionRequest(id: string, updateData: Partial<InsertConnectionRequest>): Promise<ConnectionRequest | undefined> {
    const [request] = await db.update(connectionRequests)
      .set({
        ...updateData,
        respondedAt: updateData.status ? new Date().toISOString() : undefined,
      })
      .where(eq(connectionRequests.id, id))
      .returning();
    return request || undefined;
  }

  async deleteConnectionRequest(id: string): Promise<boolean> {
    const result = await db.delete(connectionRequests).where(eq(connectionRequests.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Client Tokens
  async getClientTokens(): Promise<ClientToken[]> {
    return await db.select().from(clientTokens);
  }

  async getClientToken(id: string): Promise<ClientToken | undefined> {
    const [token] = await db.select().from(clientTokens).where(eq(clientTokens.id, id));
    return token || undefined;
  }

  async getClientTokenByToken(token: string): Promise<ClientToken | undefined> {
    const [clientToken] = await db.select().from(clientTokens).where(eq(clientTokens.token, token));
    return clientToken || undefined;
  }

  async getClientTokenByEmail(email: string): Promise<ClientToken | undefined> {
    const [token] = await db.select().from(clientTokens).where(eq(clientTokens.email, email));
    return token || undefined;
  }

  async createClientToken(insertToken: InsertClientToken): Promise<ClientToken> {
    const createdAt = new Date().toISOString();
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    const dataWithDefaults = {
      ...insertToken,
      createdAt,
      token,
    };
    
    const [clientToken] = await db.insert(clientTokens).values(dataWithDefaults).returning();
    return clientToken;
  }

  async updateClientToken(id: string, updateData: Partial<InsertClientToken>): Promise<ClientToken | undefined> {
    const [token] = await db.update(clientTokens)
      .set(updateData)
      .where(eq(clientTokens.id, id))
      .returning();
    return token || undefined;
  }

  async deleteClientToken(id: string): Promise<boolean> {
    const result = await db.delete(clientTokens).where(eq(clientTokens.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Client Invites
  async getClientInvites(): Promise<ClientInvite[]> {
    return await db.select().from(clientInvites);
  }

  async getClientInvite(id: string): Promise<ClientInvite | undefined> {
    const [invite] = await db.select().from(clientInvites).where(eq(clientInvites.id, id));
    return invite || undefined;
  }

  async getClientInviteByEmail(email: string): Promise<ClientInvite | undefined> {
    const [invite] = await db.select().from(clientInvites).where(eq(clientInvites.email, email));
    return invite || undefined;
  }

  async getClientInviteByClientId(clientId: string): Promise<ClientInvite | undefined> {
    const [invite] = await db.select().from(clientInvites).where(eq(clientInvites.clientId, clientId));
    return invite || undefined;
  }

  async getClientInviteByEmailAndCoach(email: string, coachId: string): Promise<ClientInvite | undefined> {
    const [invite] = await db.select().from(clientInvites)
      .where(and(
        eq(clientInvites.email, email),
        eq(clientInvites.coachId, coachId)
      ));
    return invite || undefined;
  }

  async getClientInvitesByCoachId(coachId: string): Promise<ClientInvite[]> {
    return await db.select().from(clientInvites).where(eq(clientInvites.coachId, coachId));
  }

  async createClientInvite(insertInvite: InsertClientInvite): Promise<ClientInvite> {
    const sentAt = new Date().toISOString();
    
    const dataWithDefaults = {
      ...insertInvite,
      sentAt,
    };
    
    const [invite] = await db.insert(clientInvites).values(dataWithDefaults).returning();
    return invite;
  }

  async updateClientInvite(id: string, updateData: Partial<InsertClientInvite>): Promise<ClientInvite | undefined> {
    const [invite] = await db.update(clientInvites)
      .set(updateData)
      .where(eq(clientInvites.id, id))
      .returning();
    return invite || undefined;
  }

  async deleteClientInvite(id: string): Promise<boolean> {
    const result = await db.delete(clientInvites).where(eq(clientInvites.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Password Reset Tokens
  async createPasswordResetToken(insertToken: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const dataWithDefaults = {
      ...insertToken,
      createdAt: new Date().toISOString(),
    };
    const [token] = await db.insert(passwordResetTokens).values(dataWithDefaults).returning();
    return token;
  }

  async getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | undefined> {
    const [result] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return result || undefined;
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(passwordResetTokens.id, id));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    const now = new Date().toISOString();
    await db.delete(passwordResetTokens).where(lte(passwordResetTokens.expiresAt, now));
  }

  // Client Plans
  async getClientPlans(): Promise<ClientPlan[]> {
    return await db.select().from(clientPlans);
  }

  async getClientPlan(id: string): Promise<ClientPlan | undefined> {
    const [plan] = await db.select().from(clientPlans).where(eq(clientPlans.id, id));
    return plan || undefined;
  }

  async getClientPlansByClientId(clientId: string): Promise<ClientPlan[]> {
    return await db.select().from(clientPlans).where(eq(clientPlans.clientId, clientId));
  }

  async getActiveClientPlan(clientId: string): Promise<ClientPlan | undefined> {
    const plans = await db.select()
      .from(clientPlans)
      .where(eq(clientPlans.clientId, clientId));
    const [plan] = plans.filter(p => p.status === 'active');
    return plan || undefined;
  }

  async createClientPlan(insertPlan: InsertClientPlan): Promise<ClientPlan> {
    const now = new Date().toISOString();
    
    const dataWithDefaults = {
      ...insertPlan,
      createdAt: now,
      updatedAt: now,
    };
    
    const [plan] = await db.insert(clientPlans).values(dataWithDefaults).returning();
    return plan;
  }

  async updateClientPlan(id: string, updateData: Partial<InsertClientPlan>): Promise<ClientPlan | undefined> {
    const [plan] = await db.update(clientPlans)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(clientPlans.id, id))
      .returning();
    return plan || undefined;
  }

  async deleteClientPlan(id: string): Promise<boolean> {
    const result = await db.delete(clientPlans).where(eq(clientPlans.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async archiveActivePlan(clientId: string): Promise<ClientPlan | undefined> {
    const activePlan = await this.getActiveClientPlan(clientId);
    if (!activePlan) {
      return undefined;
    }
    
    const [archivedPlan] = await db.update(clientPlans)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(clientPlans.id, activePlan.id))
      .returning();
    
    return archivedPlan || undefined;
  }

  async archiveActivePlanExcept(clientId: string, excludePlanId: string): Promise<number> {
    // Archive all active plans for this client EXCEPT the one being assigned
    const result = await db.update(clientPlans)
      .set({
        status: 'archived',
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(clientPlans.clientId, clientId),
        eq(clientPlans.status, 'active'),
        ne(clientPlans.id, excludePlanId)
      ));
    
    return result.rowCount || 0;
  }

  async getClientLongTermPlan(clientId: string): Promise<ClientPlan | undefined> {
    const [plan] = await db.select()
      .from(clientPlans)
      .where(and(
        eq(clientPlans.clientId, clientId),
        eq(clientPlans.planType, 'long_term'),
        eq(clientPlans.shared, true)
      ))
      .orderBy(desc(clientPlans.createdAt))
      .limit(1);
    return plan || undefined;
  }

  async getClientWeeklyPlans(clientId: string): Promise<ClientPlan[]> {
    return await db.select()
      .from(clientPlans)
      .where(and(
        eq(clientPlans.clientId, clientId),
        eq(clientPlans.planType, 'weekly'),
        eq(clientPlans.shared, true)
      ))
      .orderBy(desc(clientPlans.weekStartDate));
  }

  async getCurrentWeeklyPlan(clientId: string): Promise<ClientPlan | undefined> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const [plan] = await db.select()
      .from(clientPlans)
      .where(and(
        eq(clientPlans.clientId, clientId),
        eq(clientPlans.planType, 'weekly'),
        eq(clientPlans.shared, true),
        lte(clientPlans.weekStartDate, today),
        gte(clientPlans.weekEndDate, today)
      ))
      .limit(1);
    return plan || undefined;
  }

  // Plan Sessions (AI Plan Builder chat history)
  async getPlanSessions(coachId?: string): Promise<PlanSession[]> {
    if (coachId) {
      // Only return sessions for clients belonging to this coach
      const coachClientIds = db.select({ id: clients.id }).from(clients).where(eq(clients.coachId, coachId));
      return await db.select()
        .from(planSessions)
        .where(inArray(planSessions.clientId, coachClientIds))
        .orderBy(desc(planSessions.createdAt));
    }
    return await db.select().from(planSessions).orderBy(desc(planSessions.createdAt));
  }

  async getPlanSession(id: string): Promise<PlanSession | undefined> {
    const [session] = await db.select().from(planSessions).where(eq(planSessions.id, id));
    return session || undefined;
  }

  async getPlanSessionsByClientId(clientId: string): Promise<PlanSession[]> {
    return await db.select()
      .from(planSessions)
      .where(eq(planSessions.clientId, clientId))
      .orderBy(desc(planSessions.createdAt));
  }

  async getActivePlanSession(clientId: string): Promise<PlanSession | undefined> {
    // Get most recent non-assigned session (IN_PROGRESS status)
    const [session] = await db.select()
      .from(planSessions)
      .where(and(
        eq(planSessions.clientId, clientId),
        eq(planSessions.status, 'IN_PROGRESS')
      ))
      .orderBy(desc(planSessions.createdAt))
      .limit(1);
    
    if (session) return session;
    
    // If no in-progress session, check for any session (may be ASSIGNED)
    const [anySession] = await db.select()
      .from(planSessions)
      .where(eq(planSessions.clientId, clientId))
      .orderBy(desc(planSessions.createdAt))
      .limit(1);
    return anySession || undefined;
  }

  async createPlanSession(insertSession: InsertPlanSession): Promise<PlanSession> {
    const now = new Date().toISOString();
    const [session] = await db.insert(planSessions).values({
      ...insertSession,
      createdAt: insertSession.createdAt || now,
      updatedAt: insertSession.updatedAt || now,
    }).returning();
    return session;
  }

  async updatePlanSession(id: string, updateData: Partial<InsertPlanSession>): Promise<PlanSession | undefined> {
    const [session] = await db.update(planSessions)
      .set({
        ...updateData,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(planSessions.id, id))
      .returning();
    return session || undefined;
  }

  async deletePlanSession(id: string): Promise<boolean> {
    // First delete all messages for this session
    await db.delete(planMessages).where(eq(planMessages.sessionId, id));
    const result = await db.delete(planSessions).where(eq(planSessions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Plan Messages (chat messages within a session)
  async getPlanMessages(sessionId: string): Promise<PlanMessage[]> {
    return await db.select()
      .from(planMessages)
      .where(eq(planMessages.sessionId, sessionId))
      .orderBy(planMessages.createdAt);
  }

  async createPlanMessage(insertMessage: InsertPlanMessage): Promise<PlanMessage> {
    const now = new Date().toISOString();
    const [message] = await db.insert(planMessages).values({
      ...insertMessage,
      createdAt: insertMessage.createdAt || now,
    }).returning();
    return message;
  }

  async deletePlanMessages(sessionId: string): Promise<boolean> {
    const result = await db.delete(planMessages).where(eq(planMessages.sessionId, sessionId));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getGoals(coachId?: string): Promise<Goal[]> {
    if (coachId) {
      // Get goals for clients belonging to this coach
      const coachClientIds = db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.coachId, coachId));
      
      return await db
        .select()
        .from(goals)
        .where(inArray(goals.clientId, coachClientIds));
    }
    return await db.select().from(goals);
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    const result = await db.select().from(goals).where(eq(goals.id, id));
    return result[0];
  }

  async getGoalsByClientId(clientId: string): Promise<Goal[]> {
    return await db.select().from(goals).where(eq(goals.clientId, clientId));
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const now = new Date().toISOString();
    const result = await db.insert(goals).values({
      ...goal,
      createdAt: goal.createdAt || now,
      updatedAt: goal.updatedAt || now,
    }).returning();
    return result[0];
  }

  async updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal | undefined> {
    const now = new Date().toISOString();
    const result = await db.update(goals)
      .set({ ...goal, updatedAt: now })
      .where(eq(goals.id, id))
      .returning();
    return result[0];
  }

  async deleteGoal(id: string): Promise<boolean> {
    const result = await db.delete(goals).where(eq(goals.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Client Data Logs (unified progress tracking)
  async getClientDataLogs(): Promise<ClientDataLog[]> {
    return await db.select().from(clientDataLogs).orderBy(desc(clientDataLogs.date));
  }

  async getClientDataLog(id: string): Promise<ClientDataLog | undefined> {
    const result = await db.select().from(clientDataLogs).where(eq(clientDataLogs.id, id));
    return result[0];
  }

  async getClientDataLogsByClientId(
    clientId: string,
    options?: { startDate?: string; endDate?: string; type?: string }
  ): Promise<ClientDataLog[]> {
    let query = db.select().from(clientDataLogs)
      .where(eq(clientDataLogs.clientId, clientId))
      .orderBy(desc(clientDataLogs.date));

    if (options?.startDate || options?.endDate || options?.type) {
      const conditions = [eq(clientDataLogs.clientId, clientId)];
      
      if (options.startDate) {
        conditions.push(gte(clientDataLogs.date, options.startDate));
      }
      if (options.endDate) {
        conditions.push(lte(clientDataLogs.date, options.endDate));
      }
      if (options.type) {
        conditions.push(eq(clientDataLogs.type, options.type));
      }
      
      return await db.select().from(clientDataLogs)
        .where(and(...conditions))
        .orderBy(desc(clientDataLogs.date));
    }

    return await query;
  }

  async createClientDataLog(log: InsertClientDataLog): Promise<ClientDataLog> {
    const now = new Date().toISOString();
    const result = await db.insert(clientDataLogs).values({
      ...log,
      createdAt: log.createdAt || now,
    }).returning();
    return result[0];
  }

  async updateClientDataLog(id: string, log: Partial<InsertClientDataLog>): Promise<ClientDataLog | undefined> {
    const result = await db.update(clientDataLogs)
      .set(log)
      .where(eq(clientDataLogs.id, id))
      .returning();
    return result[0];
  }

  async deleteClientDataLog(id: string): Promise<boolean> {
    const result = await db.delete(clientDataLogs).where(eq(clientDataLogs.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Smart Logs (AI-powered progress tracking)
  async getSmartLogs(): Promise<SmartLog[]> {
    return await db.select().from(smartLogs).orderBy(desc(smartLogs.createdAt));
  }

  async getSmartLog(id: string): Promise<SmartLog | undefined> {
    const result = await db.select().from(smartLogs).where(eq(smartLogs.id, id));
    return result[0];
  }

  async getSmartLogsByClientId(
    clientId: string,
    options?: { startDate?: string; endDate?: string; limit?: number }
  ): Promise<SmartLog[]> {
    const conditions = [eq(smartLogs.clientId, clientId)];
    
    if (options?.startDate) {
      conditions.push(gte(smartLogs.localDateForClient, options.startDate));
    }
    if (options?.endDate) {
      conditions.push(lte(smartLogs.localDateForClient, options.endDate));
    }

    let query = db.select().from(smartLogs)
      .where(and(...conditions))
      .orderBy(desc(smartLogs.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    return await query;
  }

  async createSmartLog(log: InsertSmartLog): Promise<SmartLog> {
    const now = new Date().toISOString();
    const result = await db.insert(smartLogs).values({
      ...log,
      createdAt: log.createdAt || now,
    }).returning();
    return result[0];
  }

  async updateSmartLog(id: string, log: Partial<InsertSmartLog>): Promise<SmartLog | undefined> {
    const result = await db.update(smartLogs)
      .set(log)
      .where(eq(smartLogs.id, id))
      .returning();
    return result[0];
  }

  async deleteSmartLog(id: string): Promise<boolean> {
    const result = await db.delete(smartLogs).where(eq(smartLogs.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getPendingSmartLogs(limit: number = 10): Promise<SmartLog[]> {
    return await db.select().from(smartLogs)
      .where(eq(smartLogs.processingStatus, "pending"))
      .orderBy(smartLogs.createdAt)
      .limit(limit);
  }

  // Progress Events (normalized metrics)
  async getProgressEvents(): Promise<ProgressEvent[]> {
    return await db.select().from(progressEvents).orderBy(desc(progressEvents.createdAt));
  }

  async getProgressEvent(id: string): Promise<ProgressEvent | undefined> {
    const result = await db.select().from(progressEvents).where(eq(progressEvents.id, id));
    return result[0];
  }

  async getProgressEventsByClientId(
    clientId: string,
    options?: { startDate?: string; endDate?: string; eventType?: string }
  ): Promise<ProgressEvent[]> {
    const conditions = [eq(progressEvents.clientId, clientId)];
    
    if (options?.startDate) {
      conditions.push(gte(progressEvents.dateForMetric, options.startDate));
    }
    if (options?.endDate) {
      conditions.push(lte(progressEvents.dateForMetric, options.endDate));
    }
    if (options?.eventType) {
      conditions.push(eq(progressEvents.eventType, options.eventType));
    }

    return await db.select().from(progressEvents)
      .where(and(...conditions))
      .orderBy(desc(progressEvents.dateForMetric));
  }

  async createProgressEvent(event: InsertProgressEvent): Promise<ProgressEvent> {
    const now = new Date().toISOString();
    const result = await db.insert(progressEvents).values({
      ...event,
      createdAt: event.createdAt || now,
    }).returning();
    return result[0];
  }

  async updateProgressEvent(id: string, event: Partial<InsertProgressEvent>): Promise<ProgressEvent | undefined> {
    const result = await db.update(progressEvents)
      .set(event)
      .where(eq(progressEvents.id, id))
      .returning();
    return result[0];
  }

  async deleteProgressEvent(id: string): Promise<boolean> {
    const result = await db.delete(progressEvents).where(eq(progressEvents.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getProgressEventsBySmartLogId(smartLogId: string): Promise<ProgressEvent[]> {
    return await db.select().from(progressEvents)
      .where(eq(progressEvents.smartLogId, smartLogId))
      .orderBy(desc(progressEvents.createdAt));
  }

  // Weekly Reports
  async getWeeklyReports(): Promise<WeeklyReport[]> {
    return await db.select().from(weeklyReports).orderBy(desc(weeklyReports.weekStart));
  }

  async getWeeklyReport(id: string): Promise<WeeklyReport | undefined> {
    const result = await db.select().from(weeklyReports).where(eq(weeklyReports.id, id));
    return result[0];
  }

  async getWeeklyReportsByClientId(
    clientId: string,
    options?: { limit?: number }
  ): Promise<WeeklyReport[]> {
    let query = db.select().from(weeklyReports)
      .where(eq(weeklyReports.clientId, clientId))
      .orderBy(desc(weeklyReports.weekStart));

    if (options?.limit) {
      query = query.limit(options.limit) as typeof query;
    }

    return await query;
  }

  async getWeeklyReportByWeek(clientId: string, weekStart: string): Promise<WeeklyReport | undefined> {
    const result = await db.select().from(weeklyReports)
      .where(and(
        eq(weeklyReports.clientId, clientId),
        eq(weeklyReports.weekStart, weekStart)
      ));
    return result[0];
  }

  async createWeeklyReport(report: InsertWeeklyReport): Promise<WeeklyReport> {
    const now = new Date().toISOString();
    const result = await db.insert(weeklyReports).values({
      ...report,
      generatedAt: report.generatedAt || now,
      createdAt: report.createdAt || now,
    }).returning();
    return result[0];
  }

  async updateWeeklyReport(id: string, report: Partial<InsertWeeklyReport>): Promise<WeeklyReport | undefined> {
    const result = await db.update(weeklyReports)
      .set(report)
      .where(eq(weeklyReports.id, id))
      .returning();
    return result[0];
  }

  async deleteWeeklyReport(id: string): Promise<boolean> {
    const result = await db.delete(weeklyReports).where(eq(weeklyReports.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Plan Targets
  async getPlanTargets(): Promise<PlanTargetsRecord[]> {
    return await db.select().from(planTargets).orderBy(desc(planTargets.createdAt));
  }

  async getPlanTarget(id: string): Promise<PlanTargetsRecord | undefined> {
    const result = await db.select().from(planTargets).where(eq(planTargets.id, id));
    return result[0];
  }

  async getPlanTargetsByClientId(clientId: string): Promise<PlanTargetsRecord[]> {
    return await db.select().from(planTargets)
      .where(eq(planTargets.clientId, clientId))
      .orderBy(desc(planTargets.createdAt));
  }

  async getActivePlanTarget(clientId: string): Promise<PlanTargetsRecord | undefined> {
    const result = await db.select().from(planTargets)
      .where(and(
        eq(planTargets.clientId, clientId),
        eq(planTargets.isActive, true)
      ))
      .orderBy(desc(planTargets.startDate))
      .limit(1);
    return result[0];
  }

  async createPlanTarget(target: InsertPlanTargets): Promise<PlanTargetsRecord> {
    const now = new Date().toISOString();
    const result = await db.insert(planTargets).values({
      ...target,
      createdAt: target.createdAt || now,
      updatedAt: target.updatedAt || now,
    }).returning();
    return result[0];
  }

  async updatePlanTarget(id: string, target: Partial<InsertPlanTargets>): Promise<PlanTargetsRecord | undefined> {
    const now = new Date().toISOString();
    const result = await db.update(planTargets)
      .set({ ...target, updatedAt: now })
      .where(eq(planTargets.id, id))
      .returning();
    return result[0];
  }

  async deletePlanTarget(id: string): Promise<boolean> {
    const result = await db.delete(planTargets).where(eq(planTargets.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Engagement Triggers
  async getEngagementTriggers(clientId: string, coachId: string): Promise<EngagementTrigger[]> {
    return await db.select().from(engagementTriggers)
      .where(and(
        eq(engagementTriggers.clientId, clientId),
        eq(engagementTriggers.coachId, coachId)
      ))
      .orderBy(desc(engagementTriggers.detectedAt));
  }

  async getEngagementTrigger(id: string): Promise<EngagementTrigger | undefined> {
    const result = await db.select().from(engagementTriggers).where(eq(engagementTriggers.id, id));
    return result[0];
  }

  async createEngagementTrigger(trigger: InsertEngagementTrigger): Promise<EngagementTrigger> {
    const now = new Date().toISOString();
    const result = await db.insert(engagementTriggers).values({
      ...trigger,
      detectedAt: trigger.detectedAt || now,
      createdAt: trigger.createdAt || now,
    }).returning();
    return result[0];
  }

  async updateEngagementTrigger(id: string, trigger: Partial<InsertEngagementTrigger>): Promise<EngagementTrigger | undefined> {
    const result = await db.update(engagementTriggers)
      .set(trigger)
      .where(eq(engagementTriggers.id, id))
      .returning();
    return result[0];
  }

  async resolveEngagementTrigger(id: string): Promise<EngagementTrigger | undefined> {
    const now = new Date().toISOString();
    const result = await db.update(engagementTriggers)
      .set({ isResolved: true, resolvedAt: now })
      .where(eq(engagementTriggers.id, id))
      .returning();
    return result[0];
  }

  // Engagement Recommendations
  async getEngagementRecommendations(clientId: string, coachId: string): Promise<EngagementRecommendation[]> {
    return await db.select().from(engagementRecommendations)
      .where(and(
        eq(engagementRecommendations.clientId, clientId),
        eq(engagementRecommendations.coachId, coachId)
      ))
      .orderBy(desc(engagementRecommendations.createdAt));
  }

  async getEngagementRecommendation(id: string): Promise<EngagementRecommendation | undefined> {
    const result = await db.select().from(engagementRecommendations).where(eq(engagementRecommendations.id, id));
    return result[0];
  }

  async createEngagementRecommendation(recommendation: InsertEngagementRecommendation): Promise<EngagementRecommendation> {
    const now = new Date().toISOString();
    const result = await db.insert(engagementRecommendations).values({
      ...recommendation,
      createdAt: recommendation.createdAt || now,
    }).returning();
    return result[0];
  }

  async updateEngagementRecommendation(id: string, recommendation: Partial<InsertEngagementRecommendation>): Promise<EngagementRecommendation | undefined> {
    const result = await db.update(engagementRecommendations)
      .set(recommendation)
      .where(eq(engagementRecommendations.id, id))
      .returning();
    return result[0];
  }

  // Engagement Notification Preferences
  async getEngagementNotificationPreferences(coachId: string, clientId?: string): Promise<EngagementNotificationPreferences | undefined> {
    const conditions = clientId 
      ? and(eq(engagementNotificationPreferences.coachId, coachId), eq(engagementNotificationPreferences.clientId, clientId))
      : and(eq(engagementNotificationPreferences.coachId, coachId), sql`${engagementNotificationPreferences.clientId} IS NULL`);
    
    const result = await db.select().from(engagementNotificationPreferences).where(conditions);
    return result[0];
  }

  async upsertEngagementNotificationPreferences(preferences: InsertEngagementNotificationPreferences): Promise<EngagementNotificationPreferences> {
    const now = new Date().toISOString();
    const existing = await this.getEngagementNotificationPreferences(preferences.coachId, preferences.clientId || undefined);
    
    if (existing) {
      const result = await db.update(engagementNotificationPreferences)
        .set({ ...preferences, updatedAt: now })
        .where(eq(engagementNotificationPreferences.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(engagementNotificationPreferences).values({
        ...preferences,
        updatedAt: preferences.updatedAt || now,
      }).returning();
      return result[0];
    }
  }

  // In-App Notifications
  async getInAppNotifications(clientId: string): Promise<InAppNotification[]> {
    return await db.select().from(inAppNotifications)
      .where(eq(inAppNotifications.clientId, clientId))
      .orderBy(desc(inAppNotifications.createdAt));
  }

  async getUnreadInAppNotifications(clientId: string): Promise<InAppNotification[]> {
    return await db.select().from(inAppNotifications)
      .where(and(
        eq(inAppNotifications.clientId, clientId),
        eq(inAppNotifications.isRead, false)
      ))
      .orderBy(desc(inAppNotifications.createdAt));
  }

  async createInAppNotification(notification: InsertInAppNotification): Promise<InAppNotification> {
    const now = new Date().toISOString();
    const result = await db.insert(inAppNotifications).values({
      ...notification,
      createdAt: notification.createdAt || now,
    }).returning();
    return result[0];
  }

  async markInAppNotificationRead(id: string): Promise<InAppNotification | undefined> {
    const now = new Date().toISOString();
    const result = await db.update(inAppNotifications)
      .set({ isRead: true, readAt: now })
      .where(eq(inAppNotifications.id, id))
      .returning();
    return result[0];
  }

  // Push Subscriptions (multi-device support)
  async getPushSubscription(clientId: string): Promise<PushSubscription | undefined> {
    const result = await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.clientId, clientId));
    return result[0];
  }

  async getAllPushSubscriptions(clientId: string): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.clientId, clientId));
  }

  async getPushSubscriptionsByClientIds(clientIds: string[]): Promise<PushSubscription[]> {
    if (clientIds.length === 0) return [];
    const result = await db.select().from(pushSubscriptions)
      .where(sql`${pushSubscriptions.clientId} = ANY(${clientIds})`);
    return result;
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const now = new Date().toISOString();
    
    // Check for existing subscription with same endpoint (same device)
    const existing = await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    
    if (existing.length > 0) {
      // Update existing subscription (same device, possibly different user or renewed)
      const result = await db.update(pushSubscriptions)
        .set({ 
          clientId: subscription.clientId,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          updatedAt: now,
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
        .returning();
      return result[0];
    }
    
    // Insert new subscription (new device)
    const result = await db.insert(pushSubscriptions).values({
      ...subscription,
      createdAt: subscription.createdAt || now,
      updatedAt: subscription.updatedAt || now,
    }).returning();
    return result[0];
  }

  async updatePushSubscription(clientId: string, subscription: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined> {
    const now = new Date().toISOString();
    const result = await db.update(pushSubscriptions)
      .set({ ...subscription, updatedAt: now })
      .where(eq(pushSubscriptions.clientId, clientId))
      .returning();
    return result[0];
  }

  async deletePushSubscription(clientId: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.clientId, clientId))
      .returning();
    return result.length > 0;
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .returning();
    return result.length > 0;
  }

  // Coach Push Subscriptions (multi-device support)
  async getCoachPushSubscription(coachId: string): Promise<CoachPushSubscription | undefined> {
    const result = await db.select().from(coachPushSubscriptions)
      .where(eq(coachPushSubscriptions.coachId, coachId));
    return result[0];
  }

  async getAllCoachPushSubscriptions(coachId: string): Promise<CoachPushSubscription[]> {
    return await db.select().from(coachPushSubscriptions)
      .where(eq(coachPushSubscriptions.coachId, coachId));
  }

  async createCoachPushSubscription(subscription: InsertCoachPushSubscription): Promise<CoachPushSubscription> {
    const now = new Date().toISOString();
    
    // Check for existing subscription with same endpoint (same device)
    const existing = await db.select().from(coachPushSubscriptions)
      .where(eq(coachPushSubscriptions.endpoint, subscription.endpoint));
    
    if (existing.length > 0) {
      // Update existing subscription (same device, possibly different user or renewed)
      const result = await db.update(coachPushSubscriptions)
        .set({ 
          coachId: subscription.coachId,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          updatedAt: now,
        })
        .where(eq(coachPushSubscriptions.endpoint, subscription.endpoint))
        .returning();
      return result[0];
    }
    
    // Insert new subscription (new device)
    const result = await db.insert(coachPushSubscriptions).values({
      ...subscription,
      createdAt: subscription.createdAt || now,
      updatedAt: subscription.updatedAt || now,
    }).returning();
    return result[0];
  }

  async deleteCoachPushSubscription(coachId: string): Promise<boolean> {
    const result = await db.delete(coachPushSubscriptions)
      .where(eq(coachPushSubscriptions.coachId, coachId))
      .returning();
    return result.length > 0;
  }

  async deleteCoachPushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const result = await db.delete(coachPushSubscriptions)
      .where(eq(coachPushSubscriptions.endpoint, endpoint))
      .returning();
    return result.length > 0;
  }

  // Client Reminder Settings
  async getClientReminderSettings(clientId: string): Promise<ClientReminderSettings | undefined> {
    const result = await db.select().from(clientReminderSettings)
      .where(eq(clientReminderSettings.clientId, clientId));
    return result[0];
  }

  async getAllClientReminderSettings(): Promise<ClientReminderSettings[]> {
    return await db.select().from(clientReminderSettings);
  }

  async getEnabledClientReminderSettings(): Promise<ClientReminderSettings[]> {
    return await db.select().from(clientReminderSettings)
      .where(eq(clientReminderSettings.remindersEnabled, true));
  }

  async createClientReminderSettings(settings: InsertClientReminderSettings): Promise<ClientReminderSettings> {
    const now = new Date().toISOString();
    const result = await db.insert(clientReminderSettings).values({
      ...settings,
      createdAt: settings.createdAt || now,
      updatedAt: settings.updatedAt || now,
    }).returning();
    return result[0];
  }

  async updateClientReminderSettings(clientId: string, settings: Partial<InsertClientReminderSettings>): Promise<ClientReminderSettings | undefined> {
    const now = new Date().toISOString();
    const result = await db.update(clientReminderSettings)
      .set({ ...settings, updatedAt: now })
      .where(eq(clientReminderSettings.clientId, clientId))
      .returning();
    return result[0];
  }

  async upsertClientReminderSettings(settings: InsertClientReminderSettings): Promise<ClientReminderSettings> {
    const existing = await this.getClientReminderSettings(settings.clientId);
    if (existing) {
      return (await this.updateClientReminderSettings(settings.clientId, settings))!;
    }
    return this.createClientReminderSettings(settings);
  }

  async deleteClientReminderSettings(clientId: string): Promise<boolean> {
    const result = await db.delete(clientReminderSettings)
      .where(eq(clientReminderSettings.clientId, clientId))
      .returning();
    return result.length > 0;
  }

  // Sent Reminders
  async getSentReminders(clientId: string, date?: string): Promise<SentReminder[]> {
    if (date) {
      return await db.select().from(sentReminders)
        .where(and(
          eq(sentReminders.clientId, clientId),
          eq(sentReminders.sentDate, date)
        ))
        .orderBy(desc(sentReminders.sentAt));
    }
    return await db.select().from(sentReminders)
      .where(eq(sentReminders.clientId, clientId))
      .orderBy(desc(sentReminders.sentAt));
  }

  async getSentRemindersByTypeAndDate(clientId: string, reminderType: string, date: string): Promise<SentReminder[]> {
    return await db.select().from(sentReminders)
      .where(and(
        eq(sentReminders.clientId, clientId),
        eq(sentReminders.reminderType, reminderType),
        eq(sentReminders.sentDate, date)
      ));
  }

  async countSentRemindersToday(clientId: string, date: string): Promise<number> {
    const result = await db.select().from(sentReminders)
      .where(and(
        eq(sentReminders.clientId, clientId),
        eq(sentReminders.sentDate, date)
      ));
    return result.length;
  }

  async createSentReminder(reminder: InsertSentReminder): Promise<SentReminder> {
    const result = await db.insert(sentReminders).values(reminder).returning();
    return result[0];
  }

  async getClientsWithPushSubscriptions(): Promise<Client[]> {
    const subscriptions = await db.select().from(pushSubscriptions);
    const clientIds = Array.from(new Set(subscriptions.map(s => s.clientId)));
    if (clientIds.length === 0) return [];
    
    const result = await db.select().from(clients)
      .where(inArray(clients.id, clientIds));
    return result;
  }

  // Progress Photos
  async getProgressPhotos(clientId: string): Promise<ProgressPhoto[]> {
    return await db.select().from(progressPhotos)
      .where(eq(progressPhotos.clientId, clientId))
      .orderBy(desc(progressPhotos.photoDate));
  }

  async getProgressPhotosSharedWithCoach(clientId: string): Promise<ProgressPhoto[]> {
    return await db.select().from(progressPhotos)
      .where(and(
        eq(progressPhotos.clientId, clientId),
        eq(progressPhotos.isSharedWithCoach, true)
      ))
      .orderBy(desc(progressPhotos.photoDate));
  }

  async getProgressPhoto(id: string): Promise<ProgressPhoto | undefined> {
    const result = await db.select().from(progressPhotos)
      .where(eq(progressPhotos.id, id));
    return result[0];
  }

  async createProgressPhoto(photo: InsertProgressPhoto): Promise<ProgressPhoto> {
    const now = new Date().toISOString();
    const result = await db.insert(progressPhotos).values({
      ...photo,
      uploadedAt: photo.uploadedAt || now,
    }).returning();
    return result[0];
  }

  async updateProgressPhoto(id: string, photo: Partial<InsertProgressPhoto>): Promise<ProgressPhoto | undefined> {
    const result = await db.update(progressPhotos)
      .set(photo)
      .where(eq(progressPhotos.id, id))
      .returning();
    return result[0];
  }

  async deleteProgressPhoto(id: string): Promise<boolean> {
    const result = await db.delete(progressPhotos)
      .where(eq(progressPhotos.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();

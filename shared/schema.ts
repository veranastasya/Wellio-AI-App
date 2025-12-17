import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, json, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const GOAL_TYPES = [
  "lose_weight",
  "gain_muscle_strength",
  "improve_body_composition",
  "maintain_weight",
  "improve_health",
  "eat_healthier",
  "increase_energy",
  "improve_fitness_endurance",
  "reduce_stress_improve_balance",
  "improve_sleep_recovery",
  "prepare_event",
  "other",
] as const;

export type GoalType = typeof GOAL_TYPES[number];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  lose_weight: "Lose weight",
  gain_muscle_strength: "Gain muscle / strength",
  improve_body_composition: "Improve body composition",
  maintain_weight: "Maintain current weight",
  improve_health: "Improve overall health",
  eat_healthier: "Eat healthier",
  increase_energy: "Increase energy",
  improve_fitness_endurance: "Improve fitness / endurance",
  reduce_stress_improve_balance: "Reduce stress & improve balance",
  improve_sleep_recovery: "Improve sleep & recovery",
  prepare_event: "Prepare for an event",
  other: "Other",
};

export function getGoalTypeLabel(goalType: string | null | undefined, goalDescription?: string | null): string {
  if (!goalType) return "Not set";
  
  if (goalType === "other" && goalDescription) {
    return goalDescription;
  }
  
  if (goalType in GOAL_TYPE_LABELS) {
    return GOAL_TYPE_LABELS[goalType as GoalType];
  }
  
  return goalDescription || goalType;
}

export const ACTIVITY_LEVELS = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extra_active",
] as const;

export type ActivityLevel = typeof ACTIVITY_LEVELS[number];

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little to no exercise)",
  lightly_active: "Lightly Active (light exercise 1-3 days/week)",
  moderately_active: "Moderately Active (moderate exercise 3-5 days/week)",
  very_active: "Very Active (hard exercise 6-7 days/week)",
  extra_active: "Extremely Active (hard exercise & work in a physical job)",
};

export const ACTIVITY_LEVEL_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export function getActivityLevelLabel(activityLevel: string | null | undefined): string {
  if (!activityLevel) return "Not set";
  if (activityLevel in ACTIVITY_LEVEL_LABELS) {
    return ACTIVITY_LEVEL_LABELS[activityLevel as ActivityLevel];
  }
  return activityLevel;
}

export function getActivityLevelMultiplier(activityLevel: string | null | undefined): number {
  if (!activityLevel || !(activityLevel in ACTIVITY_LEVEL_MULTIPLIERS)) {
    return 1.2;
  }
  return ACTIVITY_LEVEL_MULTIPLIERS[activityLevel as ActivityLevel];
}

export const coaches = pgTable("coaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  oauthProvider: text("oauth_provider"),
  oauthId: text("oauth_id"),
  profileImageUrl: text("profile_image_url"),
});

export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true });
export type InsertCoach = z.infer<typeof insertCoachSchema>;
export type Coach = typeof coaches.$inferSelect;

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  // OAuth fields for social login
  oauthProvider: text("oauth_provider"), // "replit", "google", etc.
  oauthId: text("oauth_id"), // Unique ID from OAuth provider
  profileImageUrl: text("profile_image_url"),
  status: text("status").notNull().default("active"),
  goalType: text("goal_type"),
  goalDescription: text("goal_description"),
  progressScore: integer("progress_score").notNull().default(0),
  // Progress breakdown for composite score calculation
  goalProgress: integer("goal_progress").notNull().default(0), // 0-100: Long-term goal completion %
  weeklyProgress: integer("weekly_progress").notNull().default(0), // 0-100: Weekly task completion %
  activityProgress: integer("activity_progress").notNull().default(0), // 0-100: Activity consistency %
  progressUpdatedAt: text("progress_updated_at"), // Last time progress was recalculated
  joinedDate: text("joined_date").notNull(),
  lastSession: text("last_session"),
  lastLoginAt: text("last_login_at"),
  lastActiveAt: text("last_active_at"), // Tracks any client activity: messages, logs, login
  notes: text("notes"),
  intakeSource: text("intake_source"),
  questionnaireId: varchar("questionnaire_id"),
  sex: text("sex"),
  weight: real("weight"),
  age: integer("age"),
  height: real("height"),
  activityLevel: text("activity_level"),
  bodyFatPercentage: real("body_fat_percentage"),
  unitsPreference: text("units_preference").notNull().default("us"),
  targetWeight: real("target_weight"),
  targetBodyFat: real("target_body_fat"),
  goalWeight: real("goal_weight"),
  // Wellness plan fields
  occupation: text("occupation"),
  medicalNotes: text("medical_notes"),
  trainingExperience: text("training_experience"),
  equipmentAccess: text("equipment_access"),
  timeframe: text("timeframe"),
  currentHabits: json("current_habits").$type<{
    exercisePerWeek?: number;
    averageStepsPerDay?: number;
    sleepHoursPerNight?: number;
    stressLevel?: number;
    hydration?: string;
    eatingPattern?: string;
  }>(),
  preferences: json("preferences").$type<{
    likes?: string;
    dislikes?: string;
    scheduleConstraints?: string;
  }>(),
  // End date for coach-client collaboration
  endDate: text("end_date"),
}, (table) => ({
  coachIdIdx: index("clients_coach_id_idx").on(table.coachId),
  emailIdx: index("clients_email_idx").on(table.email),
}));

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  sessionType: text("session_type").notNull(),
  locationType: text("location_type").default("video"),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  meetingLink: text("meeting_link"),
}, (table) => ({
  clientIdIdx: index("sessions_client_id_idx").on(table.clientId),
}));

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  content: text("content").notNull(),
  sender: text("sender").notNull(),
  timestamp: text("timestamp").notNull(),
  read: boolean("read").notNull().default(false),
  attachments: json("attachments").$type<MessageAttachment[] | null>(),
}, (table) => ({
  clientIdIdx: index("messages_client_id_idx").on(table.clientId),
}));

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  timestamp: text("timestamp").notNull(),
  status: text("status").notNull().default("completed"),
});

export const questionnaires = pgTable("questionnaires", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  questions: json("questions").notNull(),
  welcomeText: text("welcome_text"),
  consentText: text("consent_text"),
  consentRequired: boolean("consent_required").notNull().default(false),
  confirmationMessage: text("confirmation_message"),
  defaultUnitsPreference: text("default_units_preference").notNull().default("us"),
  standardFields: json("standard_fields").$type<{
    sex?: boolean;
    weight?: boolean;
    age?: boolean;
    height?: boolean;
    activityLevel?: boolean;
    bodyFatPercentage?: boolean;
    goal?: boolean;
  }>(),
  deleted: boolean("deleted").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const responses = pgTable("responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionnaireId: varchar("questionnaire_id").notNull(),
  questionnaireName: text("questionnaire_name"),
  clientId: varchar("client_id"),
  clientName: text("client_name"),
  answers: json("answers").notNull(),
  submittedAt: text("submitted_at").notNull(),
  isDraft: boolean("is_draft").notNull().default(false),
  lastSavedAt: text("last_saved_at"),
  pinnedForAI: boolean("pinned_for_ai").notNull().default(false),
  pdfUrl: text("pdf_url"),
});

export const nutritionLogs = pgTable("nutrition_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  date: text("date").notNull(),
  calories: real("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fats: real("fats"),
  notes: text("notes"),
  dataSource: text("data_source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
});

export const workoutLogs = pgTable("workout_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  date: text("date").notNull(),
  workoutType: text("workout_type").notNull(),
  duration: integer("duration"),
  intensity: text("intensity"),
  exercises: json("exercises"),
  notes: text("notes"),
  dataSource: text("data_source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
});

export const checkIns = pgTable("check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  date: text("date").notNull(),
  weight: real("weight"),
  bodyFat: real("body_fat"),
  measurements: json("measurements"),
  photos: json("photos"),
  mood: text("mood"),
  energy: text("energy"),
  notes: text("notes"),
  dataSource: text("data_source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
});

export const deviceConnections = pgTable("device_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  deviceType: text("device_type").notNull(),
  status: text("status").notNull().default("connected"),
  syncEnabled: boolean("sync_enabled").notNull().default(true),
  dataPermissions: json("data_permissions").notNull(),
  lastSyncedAt: text("last_synced_at"),
  connectedAt: text("connected_at").notNull(),
});

export const connectionRequests = pgTable("connection_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  deviceType: text("device_type").notNull(),
  status: text("status").notNull().default("pending"),
  requestedAt: text("requested_at").notNull(),
  respondedAt: text("responded_at"),
  expiresAt: text("expires_at").notNull(),
  inviteCode: text("invite_code").notNull(),
});

export const clientTokens = pgTable("client_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"),
  coachId: varchar("coach_id").notNull().default("default-coach"), // Coach who created the token
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  coachName: text("coach_name").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at"),
  lastUsedAt: text("last_used_at"),
});

export const clientInvites = pgTable("client_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id"),
  coachId: varchar("coach_id").notNull().default("default-coach"), // Coach who sent the invite
  email: text("email").notNull(),
  name: text("name"),
  tokenId: varchar("token_id").notNull(),
  questionnaireId: varchar("questionnaire_id"),
  status: text("status").notNull().default("pending"), // pending, completed, expired, cancelled
  sentAt: text("sent_at").notNull(),
  completedAt: text("completed_at"),
  expiresAt: text("expires_at"), // Optional expiration for invites
  resendCount: integer("resend_count").notNull().default(0), // Track how many times invite was resent
  lastResendAt: text("last_resend_at"), // Last resend timestamp
  message: text("message"),
});

export const clientPlans = pgTable("client_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull().default("default-coach"),
  planName: text("plan_name").notNull(),
  planContent: json("plan_content").notNull(),
  pdfUrl: text("pdf_url"),
  status: text("status").notNull().default("draft"),
  shared: boolean("shared").notNull().default(false),
  sessionId: varchar("session_id"), // Links to plan session for chat history
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Plan Sessions - tracks each AI plan building session
// Plan lifecycle: NOT_STARTED -> IN_PROGRESS -> ASSIGNED
export const PLAN_SESSION_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "ASSIGNED"] as const;
export type PlanSessionStatus = typeof PLAN_SESSION_STATUSES[number];

export const planSessions = pgTable("plan_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull().default("default-coach"),
  status: text("status").notNull().default("IN_PROGRESS"), // NOT_STARTED, IN_PROGRESS, ASSIGNED
  canvasContent: text("canvas_content"), // The plan document content
  planName: text("plan_name"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  assignedAt: text("assigned_at"), // Set when status becomes ASSIGNED
});

// Plan Messages - persists AI chat history for each session
export const PLAN_MESSAGE_ROLES = ["system", "user", "assistant"] as const;
export type PlanMessageRole = typeof PLAN_MESSAGE_ROLES[number];

export const planMessages = pgTable("plan_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  role: text("role").notNull(), // system, user, assistant
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

// Goal scope types for progress calculation
export const GOAL_SCOPES = ["long_term", "weekly_task"] as const;
export type GoalScope = typeof GOAL_SCOPES[number];

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  goalType: text("goal_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value").notNull().default(0),
  baselineValue: real("baseline_value"), // Starting value for progress calculation
  unit: text("unit").notNull(),
  deadline: text("deadline").notNull(),
  status: text("status").notNull().default("active"),
  priority: text("priority").notNull().default("medium"),
  scope: text("scope").notNull().default("long_term"), // "long_term" or "weekly_task"
  weekStartDate: text("week_start_date"), // For weekly tasks, the week they belong to
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  clientIdIdx: index("goals_client_id_idx").on(table.clientId),
}));

export const QUESTION_TYPES = [
  "short_text",
  "paragraph",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "number",
  "date",
  "email",
  "phone",
  "file_upload",
] as const;

export type QuestionType = typeof QUESTION_TYPES[number];

const shortTextSettingsSchema = z.object({
  placeholder: z.string().optional(),
  characterLimit: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
});

const paragraphSettingsSchema = z.object({
  placeholder: z.string().optional(),
  characterLimit: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
});

const multipleChoiceSettingsSchema = z.object({
  options: z.array(z.string()).min(1),
  allowOther: z.boolean().optional(),
  defaultValue: z.string().optional(),
});

const checkboxesSettingsSchema = z.object({
  options: z.array(z.string()).min(1),
  allowOther: z.boolean().optional(),
  minSelections: z.number().optional(),
  maxSelections: z.number().optional(),
});

const dropdownSettingsSchema = z.object({
  options: z.array(z.string()).min(1),
  defaultValue: z.string().optional(),
});

const numberSettingsSchema = z.object({
  placeholder: z.string().optional(),
  unitLabel: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});

const dateSettingsSchema = z.object({
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
});

const emailSettingsSchema = z.object({
  placeholder: z.string().optional(),
});

const phoneSettingsSchema = z.object({
  placeholder: z.string().optional(),
  countryCode: z.string().optional(),
});

const fileUploadSettingsSchema = z.object({
  allowedTypes: z.array(z.string()).optional(),
  maxSizeMB: z.number().optional(),
  maxFiles: z.number().optional(),
});

export const questionSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("short_text"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: shortTextSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("paragraph"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: paragraphSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("multiple_choice"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: multipleChoiceSettingsSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("checkboxes"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: checkboxesSettingsSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("dropdown"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: dropdownSettingsSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("number"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: numberSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("date"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: dateSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("email"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: emailSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("phone"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: phoneSettingsSchema.optional(),
  }),
  z.object({
    id: z.string(),
    type: z.literal("file_upload"),
    label: z.string().min(1),
    description: z.string().optional(),
    required: z.boolean(),
    settings: fileUploadSettingsSchema.optional(),
  }),
]);

export type Question = z.infer<typeof questionSchema>;

export function normalizeQuestion(q: any): Question {
  const normalized: any = {
    id: q.id,
    type: q.type || "short_text",
    label: q.label || "",
    description: q.description || "",
    required: q.isRequired ?? q.required ?? false,
    settings: q.settings || {},
  };

  if (q.options && !q.settings?.options) {
    if (normalized.type === "multiple_choice" || normalized.type === "checkboxes" || normalized.type === "dropdown") {
      normalized.settings = {
        ...normalized.settings,
        options: q.options,
      };
    }
  }

  return normalized;
}

const baseClientSchema = createInsertSchema(clients).omit({
  id: true,
}).extend({
  goalType: z.enum(GOAL_TYPES, {
    errorMap: () => ({ message: "Please select your primary goal" }),
  }).optional(),
  goalDescription: z.string().optional(),
});

export const insertClientSchema = baseClientSchema.superRefine((data, ctx) => {
  if (data.goalType === "other" && !data.goalDescription) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please describe your goal when selecting 'Other'",
      path: ["goalDescription"],
    });
  }
});

export const updateClientSchema = baseClientSchema.partial().superRefine((data, ctx) => {
  if (data.goalType === "other" && !data.goalDescription) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please describe your goal when selecting 'Other'",
      path: ["goalDescription"],
    });
  }
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
}).extend({
  attachments: z.custom<MessageAttachment[] | null>().optional(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
});

export const insertQuestionnaireSchema = createInsertSchema(questionnaires).omit({
  id: true,
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
});

export const insertNutritionLogSchema = createInsertSchema(nutritionLogs).omit({
  id: true,
});

export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({
  id: true,
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
});

export const insertDeviceConnectionSchema = createInsertSchema(deviceConnections).omit({
  id: true,
});

export const insertConnectionRequestSchema = createInsertSchema(connectionRequests).omit({
  id: true,
}).extend({
  requestedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  inviteCode: z.string().optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
// Message attachment types
export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string; // MIME type
  fileSize: number; // in bytes
  objectPath: string; // path to object storage
  uploadedAt: string;
}

export type Message = typeof messages.$inferSelect & {
  attachments?: MessageAttachment[] | null;
};

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertQuestionnaire = z.infer<typeof insertQuestionnaireSchema>;
export type Questionnaire = typeof questionnaires.$inferSelect;

export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responses.$inferSelect;

export type InsertNutritionLog = z.infer<typeof insertNutritionLogSchema>;
export type NutritionLog = typeof nutritionLogs.$inferSelect;

export type InsertWorkoutLog = z.infer<typeof insertWorkoutLogSchema>;
export type WorkoutLog = typeof workoutLogs.$inferSelect;

export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;

export type InsertDeviceConnection = z.infer<typeof insertDeviceConnectionSchema>;
export type DeviceConnection = typeof deviceConnections.$inferSelect;

export type InsertConnectionRequest = z.infer<typeof insertConnectionRequestSchema>;
export type ConnectionRequest = typeof connectionRequests.$inferSelect;

export const insertClientTokenSchema = createInsertSchema(clientTokens).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  token: z.string().optional(),
});

export const insertClientInviteSchema = createInsertSchema(clientInvites).omit({
  id: true,
}).extend({
  sentAt: z.string().optional(),
});

export const insertClientPlanSchema = createInsertSchema(clientPlans).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const insertPlanSessionSchema = createInsertSchema(planSessions).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const insertPlanMessageSchema = createInsertSchema(planMessages).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertClientToken = z.infer<typeof insertClientTokenSchema>;
export type ClientToken = typeof clientTokens.$inferSelect;

export type InsertClientInvite = z.infer<typeof insertClientInviteSchema>;
export type ClientInvite = typeof clientInvites.$inferSelect;

export type InsertClientPlan = z.infer<typeof insertClientPlanSchema>;
export type ClientPlan = typeof clientPlans.$inferSelect;

export type InsertPlanSession = z.infer<typeof insertPlanSessionSchema>;
export type PlanSession = typeof planSessions.$inferSelect;

export type InsertPlanMessage = z.infer<typeof insertPlanMessageSchema>;
export type PlanMessage = typeof planMessages.$inferSelect;

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

// Unified Client Data Log for progress tracking
export const LOG_TYPES = ["nutrition", "workout", "checkin", "goal"] as const;
export type LogType = typeof LOG_TYPES[number];

export const LOG_SOURCES = ["client", "coach"] as const;
export type LogSource = typeof LOG_SOURCES[number];

export const WORKOUT_INTENSITIES = ["low", "medium", "high"] as const;
export type WorkoutIntensity = typeof WORKOUT_INTENSITIES[number];

// Payload type definitions for each log type
export interface NutritionPayload {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  comment?: string;
}

export interface WorkoutPayload {
  workoutType?: string;
  durationMinutes?: number;
  intensity?: WorkoutIntensity;
  comment?: string;
}

export interface CheckinPayload {
  weight?: number;
  waist?: number;
  hips?: number;
  energy?: number; // 1-10
  mood?: number; // 1-10
  sleepHours?: number;
  comment?: string;
  progressPhotoUrl?: string;
}

export interface GoalPayload {
  goalType?: string;
  goalValue?: string | number;
  goalStatus?: "active" | "paused" | "completed";
  comment?: string;
}

export type LogPayload = NutritionPayload | WorkoutPayload | CheckinPayload | GoalPayload;

export const clientDataLogs = pgTable("client_data_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  planId: varchar("plan_id"),
  createdByUserId: varchar("created_by_user_id").notNull(),
  source: text("source").notNull(), // "client" or "coach"
  type: text("type").notNull(), // "nutrition", "workout", "checkin", "goal"
  date: text("date").notNull(), // logical date of the log (YYYY-MM-DD)
  payload: json("payload").notNull().$type<LogPayload>(),
  createdAt: text("created_at").notNull(),
});

export const insertClientDataLogSchema = createInsertSchema(clientDataLogs).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  source: z.enum(LOG_SOURCES),
  type: z.enum(LOG_TYPES),
  payload: z.union([
    z.object({
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fats: z.number().optional(),
      comment: z.string().optional(),
    }),
    z.object({
      workoutType: z.string().optional(),
      durationMinutes: z.number().optional(),
      intensity: z.enum(WORKOUT_INTENSITIES).optional(),
      comment: z.string().optional(),
    }),
    z.object({
      weight: z.number().optional(),
      waist: z.number().optional(),
      hips: z.number().optional(),
      energy: z.number().min(1).max(10).optional(),
      mood: z.number().min(1).max(10).optional(),
      sleepHours: z.number().optional(),
      comment: z.string().optional(),
      progressPhotoUrl: z.string().optional(),
    }),
    z.object({
      goalType: z.string().optional(),
      goalValue: z.union([z.string(), z.number()]).optional(),
      goalStatus: z.enum(["active", "paused", "completed"]).optional(),
      comment: z.string().optional(),
    }),
  ]),
});

export type InsertClientDataLog = z.infer<typeof insertClientDataLogSchema>;
export type ClientDataLog = typeof clientDataLogs.$inferSelect;

// ============================================
// Smart Log System (AI-Powered Progress Tracking)
// ============================================

// Smart Log author types
export const SMART_LOG_AUTHOR_TYPES = ["client", "coach", "system"] as const;
export type SmartLogAuthorType = typeof SMART_LOG_AUTHOR_TYPES[number];

// Smart Log sources
export const SMART_LOG_SOURCES = ["smart_log", "quick_action", "import", "other"] as const;
export type SmartLogSource = typeof SMART_LOG_SOURCES[number];

// Progress event types
export const PROGRESS_EVENT_TYPES = [
  "weight",
  "nutrition",
  "workout",
  "steps",
  "sleep",
  "checkin_mood",
  "note",
  "other"
] as const;
export type ProgressEventType = typeof PROGRESS_EVENT_TYPES[number];

// AI Classification result type
export interface AIClassification {
  detected_event_types: ProgressEventType[];
  has_weight: boolean;
  has_nutrition: boolean;
  has_workout: boolean;
  has_steps: boolean;
  has_sleep: boolean;
  has_mood: boolean;
  overall_confidence: number;
}

// AI Parsed data types
export interface ParsedNutrition {
  food_description?: string;
  calories?: number;
  calories_est?: number;
  protein_g?: number;
  protein_est_g?: number;
  carbs_g?: number;
  carbs_est_g?: number;
  fat_g?: number;
  fat_est_g?: number;
  source: string;
  estimated: boolean;
  confidence: number;
}

export interface ParsedWorkout {
  type: "strength" | "cardio" | "hiit" | "mobility" | "mixed" | "unknown";
  body_focus: ("upper" | "lower" | "full" | "core" | "unspecified")[];
  duration_min: number | null;
  intensity: "low" | "medium" | "high" | "unknown";
  notes?: string;
  confidence: number;
}

export interface ParsedWeight {
  value: number;
  unit: "kg" | "lbs";
  confidence: number;
}

export interface ParsedSteps {
  steps: number;
  source: string;
  confidence: number;
}

export interface ParsedSleep {
  hours: number;
  quality?: "poor" | "fair" | "good" | "excellent";
  confidence: number;
}

export interface ParsedMood {
  rating: number; // 1-10
  notes?: string;
  confidence: number;
}

export interface AIParsedData {
  nutrition?: ParsedNutrition;
  workout?: ParsedWorkout;
  weight?: ParsedWeight;
  steps?: ParsedSteps;
  sleep?: ParsedSleep;
  mood?: ParsedMood;
}

// Plan targets configuration
export interface PlanTargets {
  calories_target_per_day?: number;
  protein_target_g?: number;
  carbs_target_g?: number;
  fat_target_g?: number;
  workouts_per_week_target?: number;
  preferred_workout_types?: string[];
  steps_target_per_day?: number;
  sleep_target_hours?: number;
  notes?: string;
}

// Smart Logs table - raw entries from clients/coaches
export const smartLogs = pgTable("smart_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  authorType: text("author_type").notNull(), // "client" | "coach" | "system"
  source: text("source").notNull().default("smart_log"), // "smart_log" | "quick_action" | "import" | "other"
  rawText: text("raw_text"),
  mediaUrls: json("media_urls").$type<string[]>(),
  localDateForClient: text("local_date_for_client").notNull(), // YYYY-MM-DD
  aiClassificationJson: json("ai_classification_json").$type<AIClassification | null>(),
  aiParsedJson: json("ai_parsed_json").$type<AIParsedData | null>(),
  processingStatus: text("processing_status").notNull().default("pending"), // "pending" | "processing" | "completed" | "failed"
  processingError: text("processing_error"),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  clientIdIdx: index("smart_logs_client_id_idx").on(table.clientId),
}));

export const insertSmartLogSchema = createInsertSchema(smartLogs).omit({
  id: true,
}).extend({
  authorType: z.enum(SMART_LOG_AUTHOR_TYPES),
  source: z.enum(SMART_LOG_SOURCES).optional(),
  rawText: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  localDateForClient: z.string(),
  createdAt: z.string().optional(),
});

export type InsertSmartLog = z.infer<typeof insertSmartLogSchema>;
export type SmartLog = typeof smartLogs.$inferSelect;

// Progress Events table - normalized extracted metrics
export const progressEvents = pgTable("progress_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  smartLogId: varchar("smart_log_id"), // Reference to source smart log
  eventType: text("event_type").notNull(), // weight, nutrition, workout, steps, sleep, checkin_mood, note, other
  dateForMetric: text("date_for_metric").notNull(), // YYYY-MM-DD
  dataJson: json("data_json").notNull().$type<Record<string, any>>(),
  confidence: real("confidence").notNull().default(1.0), // 0-1
  needsReview: boolean("needs_review").notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  clientIdIdx: index("progress_events_client_id_idx").on(table.clientId),
  dateIdx: index("progress_events_date_idx").on(table.dateForMetric),
}));

export const insertProgressEventSchema = createInsertSchema(progressEvents).omit({
  id: true,
}).extend({
  eventType: z.enum(PROGRESS_EVENT_TYPES),
  dateForMetric: z.string(),
  dataJson: z.record(z.any()),
  confidence: z.number().min(0).max(1).optional(),
  needsReview: z.boolean().optional(),
  createdAt: z.string().optional(),
});

export type InsertProgressEvent = z.infer<typeof insertProgressEventSchema>;
export type ProgressEvent = typeof progressEvents.$inferSelect;

// Weekly Reports table - AI-generated summaries
export const weeklyReports = pgTable("weekly_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  weekStart: text("week_start").notNull(), // YYYY-MM-DD (Monday)
  weekEnd: text("week_end").notNull(), // YYYY-MM-DD (Sunday)
  aggregatesJson: json("aggregates_json").$type<{
    days_with_data: number;
    avg_calories?: number;
    avg_protein_g?: number;
    days_within_calorie_target?: number;
    days_above_calorie_target?: number;
    days_below_calorie_target?: number;
    workouts_count: number;
    weight_change_kg?: number;
    avg_steps?: number;
    avg_sleep_hours?: number;
  }>(),
  flagsJson: json("flags_json").$type<{
    missing_data_days: string[];
    consistent_over_target: boolean;
    consistent_under_target: boolean;
    low_workout_adherence: boolean;
    weight_trend: "up" | "down" | "stable" | "unknown";
  }>(),
  coachReport: text("coach_report"), // AI-generated analytical summary
  clientReport: text("client_report"), // AI-generated motivational summary
  generatedAt: text("generated_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertWeeklyReportSchema = createInsertSchema(weeklyReports).omit({
  id: true,
}).extend({
  weekStart: z.string(),
  weekEnd: z.string(),
  generatedAt: z.string().optional(),
  createdAt: z.string().optional(),
});

export type InsertWeeklyReport = z.infer<typeof insertWeeklyReportSchema>;
export type WeeklyReport = typeof weeklyReports.$inferSelect;

// Plan Targets table - specific targets for a client's plan
export const planTargets = pgTable("plan_targets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  planId: varchar("plan_id"), // Optional reference to clientPlans
  planType: text("plan_type").notNull().default("combined"), // "nutrition" | "training" | "combined"
  title: text("title").notNull(),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date"), // YYYY-MM-DD, nullable
  configJson: json("config_json").$type<PlanTargets>().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertPlanTargetsSchema = createInsertSchema(planTargets).omit({
  id: true,
}).extend({
  planType: z.enum(["nutrition", "training", "combined"]).optional(),
  configJson: z.object({
    calories_target_per_day: z.number().optional(),
    protein_target_g: z.number().optional(),
    carbs_target_g: z.number().optional(),
    fat_target_g: z.number().optional(),
    workouts_per_week_target: z.number().optional(),
    preferred_workout_types: z.array(z.string()).optional(),
    steps_target_per_day: z.number().optional(),
    sleep_target_hours: z.number().optional(),
    notes: z.string().optional(),
  }),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertPlanTargets = z.infer<typeof insertPlanTargetsSchema>;
export type PlanTargetsRecord = typeof planTargets.$inferSelect;

// Engagement System Tables

// Trigger severities and types
export const TRIGGER_SEVERITIES = ["high", "medium", "low"] as const;
export type TriggerSeverity = typeof TRIGGER_SEVERITIES[number];

export const TRIGGER_TYPES = [
  "inactivity",
  "missed_workout",
  "declining_metrics",
  "goal_at_risk",
  "nutrition_concern",
  "sleep_issue",
  "engagement_drop",
] as const;
export type TriggerType = typeof TRIGGER_TYPES[number];

// Engagement Triggers - AI-detected issues for clients
export const engagementTriggers = pgTable("engagement_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  type: text("type").notNull(), // TriggerType
  severity: text("severity").notNull(), // TriggerSeverity
  reason: text("reason").notNull(),
  recommendedAction: text("recommended_action"),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedAt: text("resolved_at"),
  detectedAt: text("detected_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertEngagementTriggerSchema = createInsertSchema(engagementTriggers).omit({
  id: true,
}).extend({
  type: z.enum(TRIGGER_TYPES),
  severity: z.enum(TRIGGER_SEVERITIES),
  createdAt: z.string().optional(),
  detectedAt: z.string().optional(),
});

export type InsertEngagementTrigger = z.infer<typeof insertEngagementTriggerSchema>;
export type EngagementTrigger = typeof engagementTriggers.$inferSelect;

// Recommendation statuses
export const RECOMMENDATION_STATUSES = ["pending", "sent", "dismissed", "failed"] as const;
export type RecommendationStatus = typeof RECOMMENDATION_STATUSES[number];

// Engagement Recommendations - AI-generated suggestions for coaches
export const engagementRecommendations = pgTable("engagement_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  triggerId: varchar("trigger_id"), // Optional link to trigger
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  message: text("message").notNull(),
  reason: text("reason").notNull(),
  priority: text("priority").notNull().default("medium"), // TriggerSeverity
  status: text("status").notNull().default("pending"), // RecommendationStatus
  sentAt: text("sent_at"),
  sentVia: text("sent_via"), // "email" | "sms" | "in_app" | comma-separated
  createdAt: text("created_at").notNull(),
});

export const insertEngagementRecommendationSchema = createInsertSchema(engagementRecommendations).omit({
  id: true,
}).extend({
  priority: z.enum(TRIGGER_SEVERITIES).optional(),
  status: z.enum(RECOMMENDATION_STATUSES).optional(),
  createdAt: z.string().optional(),
});

export type InsertEngagementRecommendation = z.infer<typeof insertEngagementRecommendationSchema>;
export type EngagementRecommendation = typeof engagementRecommendations.$inferSelect;

// Notification frequency options
export const NOTIFICATION_FREQUENCIES = ["immediate", "daily", "weekly", "none"] as const;
export type NotificationFrequency = typeof NOTIFICATION_FREQUENCIES[number];

// Engagement Notification Preferences - Per-coach settings for client notifications
export const engagementNotificationPreferences = pgTable("engagement_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull(),
  clientId: varchar("client_id"), // Null = global coach preferences
  smsEnabled: boolean("sms_enabled").notNull().default(false),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  webPushEnabled: boolean("web_push_enabled").notNull().default(false),
  frequency: text("frequency").notNull().default("immediate"), // NotificationFrequency
  dailyLimit: integer("daily_limit").notNull().default(5),
  quietHoursStart: text("quiet_hours_start"), // "22:00"
  quietHoursEnd: text("quiet_hours_end"), // "08:00"
  updatedAt: text("updated_at").notNull(),
});

export const insertEngagementNotificationPreferencesSchema = createInsertSchema(engagementNotificationPreferences).omit({
  id: true,
}).extend({
  frequency: z.enum(NOTIFICATION_FREQUENCIES).optional(),
  updatedAt: z.string().optional(),
});

export type InsertEngagementNotificationPreferences = z.infer<typeof insertEngagementNotificationPreferencesSchema>;
export type EngagementNotificationPreferences = typeof engagementNotificationPreferences.$inferSelect;

// In-App Notifications - Stored notifications for clients
export const inAppNotifications = pgTable("in_app_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("reminder"), // "reminder" | "alert" | "message" | "update"
  isRead: boolean("is_read").notNull().default(false),
  readAt: text("read_at"),
  actionUrl: text("action_url"), // Optional link
  createdAt: text("created_at").notNull(),
});

export const insertInAppNotificationSchema = createInsertSchema(inAppNotifications).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
});

export type InsertInAppNotification = z.infer<typeof insertInAppNotificationSchema>;
export type InAppNotification = typeof inAppNotifications.$inferSelect;

// Push Subscriptions - Store client push notification subscriptions for PWA
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key
  auth: text("auth").notNull(), // Auth secret
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Coach Push Subscriptions - Store coach push notification subscriptions for web push
export const coachPushSubscriptions = pgTable("coach_push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertCoachPushSubscriptionSchema = createInsertSchema(coachPushSubscriptions).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertCoachPushSubscription = z.infer<typeof insertCoachPushSubscriptionSchema>;
export type CoachPushSubscription = typeof coachPushSubscriptions.$inferSelect;

// Reminder Types for smart triggers
export const REMINDER_TYPES = [
  "goal_weight",
  "goal_workout", 
  "goal_nutrition",
  "goal_general",
  "plan_daily",
  "inactivity_meals",
  "inactivity_workouts",
  "inactivity_checkin",
  "inactivity_general",
  "daily_breakfast",
  "daily_lunch",
  "daily_dinner",
] as const;
export type ReminderType = typeof REMINDER_TYPES[number];

// Client Reminder Settings - Per-client reminder configuration
export const clientReminderSettings = pgTable("client_reminder_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().unique(),
  coachId: varchar("coach_id").notNull(),
  remindersEnabled: boolean("reminders_enabled").notNull().default(true),
  goalRemindersEnabled: boolean("goal_reminders_enabled").notNull().default(true),
  planRemindersEnabled: boolean("plan_reminders_enabled").notNull().default(true),
  inactivityRemindersEnabled: boolean("inactivity_reminders_enabled").notNull().default(true),
  inactivityThresholdDays: integer("inactivity_threshold_days").notNull().default(1),
  quietHoursStart: text("quiet_hours_start").notNull().default("21:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("08:00"),
  timezone: text("timezone").notNull().default("America/New_York"),
  maxRemindersPerDay: integer("max_reminders_per_day").notNull().default(3),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const insertClientReminderSettingsSchema = createInsertSchema(clientReminderSettings).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type InsertClientReminderSettings = z.infer<typeof insertClientReminderSettingsSchema>;
export type ClientReminderSettings = typeof clientReminderSettings.$inferSelect;

// Sent Reminders - Track sent reminders to prevent duplicates
export const sentReminders = pgTable("sent_reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  reminderType: text("reminder_type").notNull(), // ReminderType
  reminderCategory: text("reminder_category").notNull(), // "goal" | "plan" | "inactivity"
  title: text("title").notNull(),
  message: text("message").notNull(),
  sentAt: text("sent_at").notNull(),
  sentDate: text("sent_date").notNull(), // YYYY-MM-DD for daily dedup
  deliveryStatus: text("delivery_status").notNull().default("sent"), // "sent" | "delivered" | "failed"
  relatedGoalId: varchar("related_goal_id"),
  relatedPlanId: varchar("related_plan_id"),
}, (table) => ({
  clientIdIdx: index("sent_reminders_client_id_idx").on(table.clientId),
  sentDateIdx: index("sent_reminders_sent_date_idx").on(table.sentDate),
}));

export const insertSentReminderSchema = createInsertSchema(sentReminders).omit({
  id: true,
}).extend({
  reminderType: z.enum(REMINDER_TYPES),
  reminderCategory: z.enum(["goal", "plan", "inactivity", "daily_checkin"]),
  deliveryStatus: z.enum(["sent", "delivered", "failed"]).optional(),
});

export type InsertSentReminder = z.infer<typeof insertSentReminderSchema>;
export type SentReminder = typeof sentReminders.$inferSelect;

// Progress Photos - Store client progress photos with privacy controls
export const progressPhotos = pgTable("progress_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  coachId: varchar("coach_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  photoDate: text("photo_date").notNull(), // YYYY-MM-DD for the date the photo represents
  isSharedWithCoach: boolean("is_shared_with_coach").notNull().default(true),
  uploadedAt: text("uploaded_at").notNull(),
}, (table) => ({
  clientIdIdx: index("progress_photos_client_id_idx").on(table.clientId),
  coachIdIdx: index("progress_photos_coach_id_idx").on(table.coachId),
  photoDateIdx: index("progress_photos_photo_date_idx").on(table.photoDate),
}));

export const insertProgressPhotoSchema = createInsertSchema(progressPhotos).omit({
  id: true,
}).extend({
  uploadedAt: z.string().optional(),
});

export type InsertProgressPhoto = z.infer<typeof insertProgressPhotoSchema>;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;

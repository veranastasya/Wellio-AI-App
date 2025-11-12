import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, json } from "drizzle-orm/pg-core";
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

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
  goalType: text("goal_type"),
  goalDescription: text("goal_description"),
  progressScore: integer("progress_score").notNull().default(0),
  joinedDate: text("joined_date").notNull(),
  lastSession: text("last_session"),
  lastLoginAt: text("last_login_at"),
  notes: text("notes"),
  intakeSource: text("intake_source"),
  questionnaireId: varchar("questionnaire_id"),
});

export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  sessionType: text("session_type").notNull(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  content: text("content").notNull(),
  sender: text("sender").notNull(),
  timestamp: text("timestamp").notNull(),
  read: boolean("read").notNull().default(false),
  attachments: json("attachments").$type<MessageAttachment[] | null>(),
});

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
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const responses = pgTable("responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionnaireId: varchar("questionnaire_id").notNull(),
  clientId: varchar("client_id"),
  answers: json("answers").notNull(),
  submittedAt: text("submitted_at").notNull(),
  isDraft: boolean("is_draft").notNull().default(false),
  lastSavedAt: text("last_saved_at"),
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
  email: text("email").notNull(),
  name: text("name"),
  tokenId: varchar("token_id").notNull(),
  questionnaireId: varchar("questionnaire_id"),
  status: text("status").notNull().default("pending"),
  sentAt: text("sent_at").notNull(),
  completedAt: text("completed_at"),
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
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  goalType: text("goal_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value").notNull().default(0),
  unit: text("unit").notNull(),
  deadline: text("deadline").notNull(),
  status: text("status").notNull().default("active"),
  priority: text("priority").notNull().default("medium"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

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

export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

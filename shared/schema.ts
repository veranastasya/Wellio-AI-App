import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("active"),
  goalType: text("goal_type"),
  progressScore: integer("progress_score").notNull().default(0),
  joinedDate: text("joined_date").notNull(),
  lastSession: text("last_session"),
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

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
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
}).extend({
  createdAt: z.string().optional(),
});

export const insertWorkoutLogSchema = createInsertSchema(workoutLogs).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
});

export const insertCheckInSchema = createInsertSchema(checkIns).omit({
  id: true,
}).extend({
  createdAt: z.string().optional(),
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
export type Message = typeof messages.$inferSelect;

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

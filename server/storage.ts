import {
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
  clients,
  sessions,
  messages,
  activities,
  questionnaires,
  responses,
  nutritionLogs,
  workoutLogs,
  checkIns,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;

  // Sessions
  getSessions(): Promise<Session[]>;
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;

  // Messages
  getMessages(): Promise<Message[]>;
  getMessage(id: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Activities
  getActivities(): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Questionnaires
  getQuestionnaires(): Promise<Questionnaire[]>;
  getQuestionnaire(id: string): Promise<Questionnaire | undefined>;
  createQuestionnaire(questionnaire: InsertQuestionnaire): Promise<Questionnaire>;
  updateQuestionnaire(id: string, questionnaire: Partial<InsertQuestionnaire>): Promise<Questionnaire | undefined>;
  deleteQuestionnaire(id: string): Promise<boolean>;

  // Responses
  getResponses(): Promise<Response[]>;
  getResponse(id: string): Promise<Response | undefined>;
  createResponse(response: InsertResponse): Promise<Response>;

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

  // Seeding
  seedData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async seedData() {
    const existingClients = await db.select().from(clients);
    if (existingClients.length > 0) {
      return;
    }

    const sampleClients: InsertClient[] = [
      {
        name: "Sarah Wilson",
        email: "sarah.wilson@example.com",
        phone: "+1 (555) 123-4567",
        status: "active",
        goalType: "Strength Training",
        progressScore: 87,
        joinedDate: "2024-01-15",
        lastSession: "2024-10-12",
        notes: "Excellent progress, very motivated",
      },
      {
        name: "Alex Thompson",
        email: "alex.thompson@example.com",
        phone: "+1 (555) 234-5678",
        status: "active",
        goalType: "Cardio Session",
        progressScore: 72,
        joinedDate: "2024-02-20",
        lastSession: "2024-10-13",
        notes: "Working on endurance goals",
      },
      {
        name: "Lisa Chen",
        email: "lisa.chen@example.com",
        phone: "+1 (555) 345-6789",
        status: "active",
        goalType: "Nutrition Consultation",
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
        goalType: "Weight Loss",
        progressScore: 58,
        joinedDate: "2024-04-05",
        lastSession: "2024-10-11",
        notes: "Making steady progress",
      },
      {
        name: "Emma Davis",
        email: "emma.davis@example.com",
        phone: "+1 (555) 567-8901",
        status: "active",
        goalType: "Flexibility & Mobility",
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
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
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
  async getSessions(): Promise<Session[]> {
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

  // Message methods
  async getMessages(): Promise<Message[]> {
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

  // Activity methods
  async getActivities(): Promise<Activity[]> {
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
  async getQuestionnaires(): Promise<Questionnaire[]> {
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

  // Nutrition Log methods
  async getNutritionLogs(): Promise<NutritionLog[]> {
    return await db.select().from(nutritionLogs);
  }

  async getNutritionLog(id: string): Promise<NutritionLog | undefined> {
    const [nutritionLog] = await db.select().from(nutritionLogs).where(eq(nutritionLogs.id, id));
    return nutritionLog || undefined;
  }

  async createNutritionLog(insertNutritionLog: InsertNutritionLog): Promise<NutritionLog> {
    const [nutritionLog] = await db.insert(nutritionLogs).values(insertNutritionLog).returning();
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
    const [workoutLog] = await db.insert(workoutLogs).values(insertWorkoutLog).returning();
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
    const [checkIn] = await db.insert(checkIns).values(insertCheckIn).returning();
    return checkIn;
  }
}

export const storage = new DatabaseStorage();

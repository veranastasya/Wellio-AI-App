import {
  type Client,
  type InsertClient,
  type Session,
  type InsertSession,
  type Message,
  type InsertMessage,
  type Activity,
  type InsertActivity,
  clients,
  sessions,
  messages,
  activities,
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
}

export const storage = new DatabaseStorage();

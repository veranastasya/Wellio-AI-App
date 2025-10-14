import {
  type Client,
  type InsertClient,
  type Session,
  type InsertSession,
  type Message,
  type InsertMessage,
  type Activity,
  type InsertActivity,
} from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private clients: Map<string, Client>;
  private sessions: Map<string, Session>;
  private messages: Map<string, Message>;
  private activities: Map<string, Activity>;

  constructor() {
    this.clients = new Map();
    this.sessions = new Map();
    this.messages = new Map();
    this.activities = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed clients
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

    sampleClients.forEach((client) => {
      const id = randomUUID();
      this.clients.set(id, { ...client, id });
    });

    // Seed sessions
    const clientIds = Array.from(this.clients.keys());
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

    sampleSessions.forEach((session) => {
      const id = randomUUID();
      this.sessions.set(id, { ...session, id });
    });

    // Seed activities
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

    sampleActivities.forEach((activity) => {
      const id = randomUUID();
      this.activities.set(id, { ...activity, id });
    });

    // Seed messages
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

    sampleMessages.forEach((message) => {
      const id = randomUUID();
      this.messages.set(id, { ...message, id });
    });
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = { ...insertClient, id };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updatedClient = { ...client, ...data };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Session methods
  async getSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values());
  }

  async getSession(id: string): Promise<Session | undefined> {
    return this.sessions.get(id);
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = randomUUID();
    const session: Session = { ...insertSession, id };
    this.sessions.set(id, session);
    return session;
  }

  // Message methods
  async getMessages(): Promise<Message[]> {
    return Array.from(this.messages.values());
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { ...insertMessage, id };
    this.messages.set(id, message);
    return message;
  }

  // Activity methods
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = randomUUID();
    const activity: Activity = { ...insertActivity, id };
    this.activities.set(id, activity);
    return activity;
  }
}

export const storage = new MemStorage();

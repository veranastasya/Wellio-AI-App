import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient, parseObjectPath } from "./objectStorage";
import { ObjectPermission, ObjectAccessGroupType } from "./objectAcl";
import type { MessageAttachment } from "@shared/schema";

// Extend Express session type
declare module 'express-session' {
  interface SessionData {
    clientId?: string;
    clientEmail?: string;
    coachId?: string;
  }
}

// Authentication middleware for client routes
function requireClientAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.clientId) {
    return res.status(401).json({ error: "Unauthorized - Please log in" });
  }
  next();
}

// Authentication middleware for coach routes (requires coach session)
function requireCoachAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.coachId) {
    return res.status(401).json({ error: "Unauthorized - Coach login required" });
  }
  next();
}
import { 
  insertClientSchema,
  updateClientSchema,
  insertSessionSchema, 
  insertMessageSchema, 
  insertActivitySchema,
  insertQuestionnaireSchema,
  insertResponseSchema,
  insertNutritionLogSchema,
  insertWorkoutLogSchema,
  insertCheckInSchema,
  insertDeviceConnectionSchema,
  insertClientTokenSchema,
  insertClientInviteSchema,
  insertClientPlanSchema,
  insertGoalSchema,
  GOAL_TYPES,
  type GoalType,
} from "@shared/schema";
import { analyzeClientData } from "./ai";
import { syncAppleHealthData } from "./sync";
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import { 
  verifyRookWebhook, 
  mapRookNutritionToLog, 
  mapRookPhysicalToWorkout, 
  mapRookBodyToCheckIn,
  generateRookConnectionUrl
} from "./rook";
import { sendInviteEmail } from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
  // Coach authentication routes
  app.post("/api/coach/login", async (req, res) => {
    try {
      const { password } = req.body;
      const coachPassword = process.env.COACH_PASSWORD;
      
      if (!coachPassword) {
        console.error("COACH_PASSWORD environment variable not set");
        return res.status(500).json({ error: "Server configuration error - coach authentication not configured" });
      }
      
      if (password !== coachPassword) {
        return res.status(401).json({ error: "Invalid password" });
      }

      req.session.coachId = "default-coach";
      res.json({ success: true, coachId: "default-coach" });
    } catch (error) {
      console.error("Coach login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Check coach session status
  app.get("/api/coach/session", async (req, res) => {
    try {
      const isAuthenticated = !!req.session?.coachId;
      res.json({ authenticated: isAuthenticated });
    } catch (error) {
      console.error("Coach session check error:", error);
      res.status(500).json({ error: "Session check failed" });
    }
  });

  // Coach logout
  app.post("/api/coach/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Coach logout error:", err);
          return res.status(500).json({ error: "Logout failed" });
        }
        res.json({ success: true });
      });
    } catch (error) {
      console.error("Coach logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // Client routes
  app.get("/api/clients", requireCoachAuth, async (_req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", requireCoachAuth, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.patch("/api/clients/:id", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = updateClientSchema.parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.delete("/api/clients/:id", requireCoachAuth, async (req, res) => {
    try {
      const success = await storage.deleteClient(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Admin migration endpoint - idempotent goalType migration
  app.post("/api/admin/migrate-goal-types", async (_req, res) => {
    try {
      const clients = await storage.getClients();
      const migratedIds: string[] = [];
      let skippedCount = 0;
      
      // Mapping table for common free-text values (case-insensitive, trimmed)
      const goalTypeMapping: Record<string, GoalType> = {
        "weight loss": "lose_weight",
        "lose weight": "lose_weight",
        "muscle gain": "gain_muscle_strength",
        "gain muscle": "gain_muscle_strength",
        "strength training": "gain_muscle_strength",
        "build strength": "gain_muscle_strength",
        "cardio": "improve_fitness_endurance",
        "cardio session": "improve_fitness_endurance",
        "endurance": "improve_fitness_endurance",
        "flexibility": "prepare_event",
        "flexibility & mobility": "prepare_event",
        "nutrition": "eat_healthier",
        "nutrition consultation": "eat_healthier",
        "healthy eating": "eat_healthier",
        "improve health": "improve_health",
        "body composition": "improve_body_composition",
        "maintain weight": "maintain_weight",
        "energy": "increase_energy",
        "mental health": "reduce_stress_improve_balance",
        "stress": "reduce_stress_improve_balance",
        "sleep": "improve_sleep_recovery",
        "consistency": "prepare_event",
      };

      for (const client of clients) {
        const currentGoalType = client.goalType?.trim() || "";
        
        // Skip if already migrated (goalType is a valid enum value)
        if (currentGoalType && GOAL_TYPES.includes(currentGoalType as GoalType)) {
          skippedCount++;
          continue;
        }

        let newGoalType: GoalType;
        let newGoalDescription: string | null = null;

        if (!currentGoalType) {
          // NULL or empty: default to "other" with "Unspecified"
          newGoalType = "other";
          newGoalDescription = "Unspecified";
        } else {
          // Try to map using case-insensitive lookup
          const mappedType = goalTypeMapping[currentGoalType.toLowerCase()];
          if (mappedType) {
            newGoalType = mappedType;
            newGoalDescription = null; // Clear description for mapped values
          } else {
            // Unknown value: default to "other" with original as description
            newGoalType = "other";
            newGoalDescription = currentGoalType;
          }
        }

        // Update client with new values
        await storage.updateClient(client.id, {
          goalType: newGoalType,
          goalDescription: newGoalDescription || undefined,
        });

        migratedIds.push(client.id);
      }

      res.json({
        success: true,
        totalClients: clients.length,
        migratedCount: migratedIds.length,
        skippedCount,
        migratedIds,
      });
    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({ error: "Migration failed" });
    }
  });

  // Session routes
  app.get("/api/sessions", requireCoachAuth, async (_req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:id", requireCoachAuth, async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.post("/api/sessions", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid session data" });
    }
  });

  // Message routes
  app.get("/api/messages", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId!;
      const allMessages = await storage.getMessages();
      // Filter messages for this client only
      const clientMessages = allMessages.filter(m => m.clientId === clientId);
      res.json(clientMessages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/:id", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId!;
      const message = await storage.getMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      // Verify the message belongs to this client
      if (message.clientId !== clientId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch message" });
    }
  });

  app.post("/api/messages", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId!;
      // Override any client-supplied clientId with the authenticated session clientId
      const messageData = { ...req.body, clientId };
      const validatedData = insertMessageSchema.parse(messageData);
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  app.patch("/api/messages/:id/read", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId!;
      const message = await storage.getMessage(req.params.id);
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      // Verify the message belongs to this client
      if (message.clientId !== clientId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updatedMessage = await storage.updateMessage(req.params.id, { read: true });
      res.json(updatedMessage);
    } catch (error) {
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  // Coach message routes (no client auth required - for coach access)
  app.get("/api/coach/messages", requireCoachAuth, async (_req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/coach/messages", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  app.patch("/api/coach/messages/:id/read", async (req, res) => {
    try {
      const message = await storage.updateMessage(req.params.id, { read: true });
      if (!message) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  // File attachment routes for messaging
  // Reference: blueprint:javascript_object_storage
  
  // Serve private objects with ACL checks
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // For messaging attachments, check if user has access
      // Access is granted if: user is coach OR user is the client in the message
      const clientId = req.session?.clientId;
      
      // Get the attachment metadata to verify access
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: clientId, // For clients, this is their clientId
        requestedPermission: ObjectPermission.READ,
      });
      
      // For coach access, we allow all (they can see all client messages)
      // For client access, canAccess checks if they own the file
      if (!clientId && !canAccess) {
        return res.sendStatus(401);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });
  
  // Get upload URL for attachments (both coach and client can upload)
  app.post("/api/attachments/upload", async (req, res) => {
    try {
      // Require either coach or client session
      if (!req.session || (!req.session.coachId && !req.session.clientId)) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });
  
  // Save attachment metadata after upload
  app.post("/api/attachments/save", async (req, res) => {
    try {
      const { objectURL, fileName, fileType, fileSize, clientId } = req.body;
      
      if (!objectURL || !fileName || !fileType || !fileSize || !clientId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Verify the clientId exists in the database
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Require either coach or client session
      if (!req.session || (!req.session.coachId && !req.session.clientId)) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      // Get userId - either coach or client
      const userId = req.session.clientId || req.session.coachId || "";
      
      // Verify authorization:
      // - Coaches can upload for any client (have coachId in session)
      // - Clients can only upload for their own conversations
      const isCoach = req.session.coachId !== undefined;
      const isOwnClient = userId === clientId;
      
      if (!isCoach && !isOwnClient) {
        return res.status(403).json({ error: "Not authorized to upload for this conversation" });
      }
      
      const objectStorageService = new ObjectStorageService();
      
      // Set ACL policy for the uploaded file
      // The group ID is the clientId - this allows both coach and that specific client to access
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        objectURL,
        {
          owner: userId,
          // Private visibility - only participants in the message can access
          visibility: "private",
          aclRules: [
            {
              group: {
                type: ObjectAccessGroupType.MESSAGE_PARTICIPANT,
                id: clientId, // Specific client for this conversation
              },
              permission: ObjectPermission.READ,
            },
          ],
        }
      );
      
      const attachment: MessageAttachment = {
        id: crypto.randomUUID(),
        fileName,
        fileType,
        fileSize,
        objectPath,
        uploadedAt: new Date().toISOString(),
      };
      
      res.status(200).json({ attachment });
    } catch (error) {
      console.error("Error saving attachment:", error);
      res.status(500).json({ error: "Failed to save attachment" });
    }
  });

  // Activity routes
  app.get("/api/activities", requireCoachAuth, async (_req, res) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.get("/api/activities/:id", requireCoachAuth, async (req, res) => {
    try {
      const activity = await storage.getActivity(req.params.id);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  app.post("/api/activities", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(validatedData);
      res.status(201).json(activity);
    } catch (error) {
      res.status(400).json({ error: "Invalid activity data" });
    }
  });

  // Questionnaire routes
  app.get("/api/questionnaires", requireCoachAuth, async (_req, res) => {
    try {
      const questionnaires = await storage.getQuestionnaires();
      res.json(questionnaires);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questionnaires" });
    }
  });

  app.get("/api/questionnaires/:id", requireCoachAuth, async (req, res) => {
    try {
      const questionnaire = await storage.getQuestionnaire(req.params.id);
      if (!questionnaire) {
        return res.status(404).json({ error: "Questionnaire not found" });
      }
      res.json(questionnaire);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questionnaire" });
    }
  });

  app.post("/api/questionnaires", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertQuestionnaireSchema.parse(req.body);
      const questionnaire = await storage.createQuestionnaire(validatedData);
      res.status(201).json(questionnaire);
    } catch (error) {
      res.status(400).json({ error: "Invalid questionnaire data" });
    }
  });

  app.patch("/api/questionnaires/:id", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertQuestionnaireSchema.partial().parse(req.body);
      const questionnaire = await storage.updateQuestionnaire(req.params.id, validatedData);
      if (!questionnaire) {
        return res.status(404).json({ error: "Questionnaire not found" });
      }
      res.json(questionnaire);
    } catch (error) {
      res.status(400).json({ error: "Invalid questionnaire data" });
    }
  });

  app.delete("/api/questionnaires/:id", requireCoachAuth, async (req, res) => {
    try {
      const success = await storage.deleteQuestionnaire(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Questionnaire not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete questionnaire" });
    }
  });

  // Response routes
  app.get("/api/responses", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId!;
      const allResponses = await storage.getResponses();
      // Filter responses for this client only
      const clientResponses = allResponses.filter(r => r.clientId === clientId);
      res.json(clientResponses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });

  app.get("/api/responses/:id", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId!;
      const response = await storage.getResponse(req.params.id);
      if (!response) {
        return res.status(404).json({ error: "Response not found" });
      }
      // Verify the response belongs to this client
      if (response.clientId !== clientId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch response" });
    }
  });

  app.post("/api/responses", async (req, res) => {
    try {
      const { token, ...responseData } = req.body;
      
      // If token provided, handle client onboarding flow (unauthenticated)
      if (token) {
        const validatedData = insertResponseSchema.parse(responseData);
        const clientToken = await storage.getClientTokenByToken(token);
        if (!clientToken) {
          return res.status(404).json({ error: "Invalid token" });
        }

        // Check if client already exists
        let client;
        if (clientToken.clientId) {
          client = await storage.getClient(clientToken.clientId);
        } else {
          // Create new client from questionnaire response
          // Use tokenId to look up the specific invite, not email (which may have multiple invites)
          const allInvites = await storage.getClientInvites();
          const invite = allInvites.find(i => i.tokenId === clientToken.id);
          if (!invite) {
            return res.status(404).json({ error: "Invite not found for this token" });
          }

          // Extract client data from questionnaire answers
          const answers = responseData.answers as any;
          const clientData = {
            name: invite.name || "New Client",
            email: clientToken.email,
            status: "active" as const,
            progressScore: 0,
            joinedDate: new Date().toISOString().split("T")[0],
            intakeSource: "questionnaire" as const,
            questionnaireId: invite.questionnaireId,
            // Extract additional fields from answers if available
            phone: answers.phone || answers.phoneNumber || "",
            goalType: answers.goalType || answers.goal || answers.primaryGoal || "",
            notes: answers.notes || answers.additionalInfo || "",
          };

          client = await storage.createClient(clientData);

          // Update token with client ID
          await storage.updateClientToken(clientToken.id, {
            clientId: client.id,
            status: "active",
          });

          // Update invite status
          await storage.updateClientInvite(invite.id, {
            status: "completed",
            clientId: client.id,
          });
        }

        // Link response to client (client is guaranteed to exist at this point)
        if (client) {
          validatedData.clientId = client.id;
        }
        
        const response = await storage.createResponse(validatedData);
        res.status(201).json(response);
      } else {
        // No token: require authentication and use session clientId
        if (!req.session || !req.session.clientId) {
          return res.status(401).json({ error: "Unauthorized - Please log in" });
        }
        
        const clientId = req.session.clientId;
        // Override any client-supplied clientId with the authenticated session clientId
        const sanitizedData = { ...responseData, clientId };
        const validatedData = insertResponseSchema.parse(sanitizedData);
        
        const response = await storage.createResponse(validatedData);
        res.status(201).json(response);
      }
    } catch (error) {
      console.error("Error creating response:", error);
      res.status(400).json({ error: "Invalid response data" });
    }
  });

  // Nutrition Log routes
  app.get("/api/nutrition-logs", async (_req, res) => {
    try {
      const nutritionLogs = await storage.getNutritionLogs();
      res.json(nutritionLogs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch nutrition logs" });
    }
  });

  app.post("/api/nutrition-logs", async (req, res) => {
    try {
      const validatedData = insertNutritionLogSchema.parse(req.body);
      const nutritionLog = await storage.createNutritionLog(validatedData);
      res.status(201).json(nutritionLog);
    } catch (error) {
      console.error("Nutrition log validation error:", error);
      res.status(400).json({ error: "Invalid nutrition log data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Workout Log routes
  app.get("/api/workout-logs", async (_req, res) => {
    try {
      const workoutLogs = await storage.getWorkoutLogs();
      res.json(workoutLogs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workout logs" });
    }
  });

  app.post("/api/workout-logs", async (req, res) => {
    try {
      const validatedData = insertWorkoutLogSchema.parse(req.body);
      const workoutLog = await storage.createWorkoutLog(validatedData);
      res.status(201).json(workoutLog);
    } catch (error) {
      res.status(400).json({ error: "Invalid workout log data" });
    }
  });

  // Check-in routes
  app.get("/api/check-ins", async (_req, res) => {
    try {
      const checkIns = await storage.getCheckIns();
      res.json(checkIns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch check-ins" });
    }
  });

  app.post("/api/check-ins", async (req, res) => {
    try {
      const validatedData = insertCheckInSchema.parse(req.body);
      const checkIn = await storage.createCheckIn(validatedData);
      res.status(201).json(checkIn);
    } catch (error) {
      res.status(400).json({ error: "Invalid check-in data" });
    }
  });

  // Device Connection routes
  app.get("/api/device-connections", async (_req, res) => {
    try {
      const connections = await storage.getDeviceConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch device connections" });
    }
  });

  app.get("/api/device-connections/client/:clientId", async (req, res) => {
    try {
      const connections = await storage.getDeviceConnectionsByClient(req.params.clientId);
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch device connections" });
    }
  });

  app.post("/api/device-connections", async (req, res) => {
    try {
      const validatedData = insertDeviceConnectionSchema.parse(req.body);
      const connection = await storage.createDeviceConnection(validatedData);
      res.status(201).json(connection);
    } catch (error) {
      res.status(400).json({ error: "Invalid device connection data" });
    }
  });

  app.patch("/api/device-connections/:id", async (req, res) => {
    try {
      const validatedData = insertDeviceConnectionSchema.partial().parse(req.body);
      const connection = await storage.updateDeviceConnection(req.params.id, validatedData);
      if (!connection) {
        return res.status(404).json({ error: "Device connection not found" });
      }
      res.json(connection);
    } catch (error) {
      res.status(400).json({ error: "Invalid device connection data" });
    }
  });

  app.delete("/api/device-connections/:id", async (req, res) => {
    try {
      const success = await storage.deleteDeviceConnection(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Device connection not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete device connection" });
    }
  });

  // Sync routes
  app.post("/api/sync/apple-health", async (req, res) => {
    try {
      const { clientId, clientName, daysToSync } = req.body;
      if (!clientId || !clientName) {
        return res.status(400).json({ error: "clientId and clientName are required" });
      }
      
      const results = await syncAppleHealthData({ 
        clientId, 
        clientName, 
        daysToSync: daysToSync || 7 
      });
      
      res.json({
        success: true,
        ...results,
        message: `Synced ${daysToSync || 7} days of Apple Health data`,
      });
    } catch (error) {
      console.error("Apple Health sync error:", error);
      res.status(500).json({ error: "Failed to sync Apple Health data" });
    }
  });

  // ROOK Integration routes
  app.post("/api/webhooks/rook", async (req, res) => {
    const startTime = Date.now();
    try {
      // Verify webhook signature
      if (!verifyRookWebhook(req)) {
        console.error("[ROOK] Webhook signature verification failed", {
          timestamp: new Date().toISOString(),
          headers: req.headers,
          userId: req.body?.user_id,
        });
        return res.status(403).json({ error: "Invalid signature" });
      }

      const event = req.body;
      console.log(`[ROOK] Webhook received: type=${event.type} userId=${event.user_id} timestamp=${event.timestamp}`);

      // Find client by userId (stored in device connection)
      const allConnections = await storage.getDeviceConnections();
      const connection = allConnections.find(conn => 
        conn.clientId === event.user_id && conn.deviceType === "rook"
      );

      if (!connection) {
        console.warn(`[ROOK] No connection found for userId=${event.user_id}`);
        // Still return 200 to acknowledge receipt
        return res.status(200).json({ message: "Webhook received but no matching connection" });
      }

      // Process different event types
      let processedCount = 0;
      const errors: string[] = [];

      if (event.type === "NUTRITION") {
        try {
          const nutritionLog = mapRookNutritionToLog(event, connection.clientId, connection.clientName);
          if (nutritionLog) {
            await storage.createNutritionLog(nutritionLog);
            processedCount++;
          } else {
            errors.push("Failed to map NUTRITION data");
          }
        } catch (error) {
          errors.push(`NUTRITION mapping error: ${error}`);
          console.error("[ROOK] NUTRITION mapping error:", error);
        }
      }

      if (event.type === "PHYSICAL") {
        try {
          const workoutLog = mapRookPhysicalToWorkout(event, connection.clientId, connection.clientName);
          if (workoutLog) {
            await storage.createWorkoutLog(workoutLog);
            processedCount++;
          } else {
            errors.push("Failed to map PHYSICAL data");
          }
        } catch (error) {
          errors.push(`PHYSICAL mapping error: ${error}`);
          console.error("[ROOK] PHYSICAL mapping error:", error);
        }
      }

      if (event.type === "BODY") {
        try {
          const checkIn = mapRookBodyToCheckIn(event, connection.clientId, connection.clientName);
          if (checkIn) {
            await storage.createCheckIn(checkIn);
            processedCount++;
          } else {
            errors.push("Failed to map BODY data");
          }
        } catch (error) {
          errors.push(`BODY mapping error: ${error}`);
          console.error("[ROOK] BODY mapping error:", error);
        }
      }

      // Update last synced timestamp
      if (processedCount > 0) {
        await storage.updateDeviceConnection(connection.id, {
          lastSyncedAt: new Date().toISOString(),
        });
      }

      const duration = Date.now() - startTime;
      console.log(`[ROOK] Webhook processed in ${duration}ms: type=${event.type} userId=${event.user_id} processed=${processedCount} errors=${errors.length}`);

      res.status(200).json({ 
        message: "Webhook processed successfully",
        processed: processedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[ROOK] Webhook processing failed after ${duration}ms:`, error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.post("/api/rook/connect", async (req, res) => {
    try {
      const { clientId, clientName } = req.body;
      if (!clientId || !clientName) {
        return res.status(400).json({ error: "clientId and clientName are required" });
      }

      // Generate connection URL (no user binding needed for API-based sources)
      // User will visit ROOK's connection page and authorize their devices
      const connectionUrl = generateRookConnectionUrl(clientId);

      // Create device connection record
      const connection = await storage.createDeviceConnection({
        clientId,
        clientName,
        deviceType: "rook",
        status: "pending",
        syncEnabled: true,
        dataPermissions: ["nutrition", "workouts", "check-ins"],
        connectedAt: new Date().toISOString(),
      });

      console.log(`[ROOK] Connection initiated for client=${clientName} userId=${clientId}`);

      res.json({
        connectionUrl,
        connection,
      });
    } catch (error) {
      console.error("[ROOK] Connection error:", error);
      res.status(500).json({ error: "Failed to create ROOK connection" });
    }
  });

  // Connection Request routes (Apple Health integration)
  app.post("/api/connection-requests", async (req, res) => {
    try {
      const { clientId, clientName, clientEmail, deviceType } = req.body;
      
      if (!clientId || !clientName || !clientEmail || !deviceType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const request = await storage.createConnectionRequest({
        clientId,
        clientName,
        clientEmail,
        deviceType,
      });

      console.log(`[Connection Request] Created request for ${clientName} (${clientEmail})`);

      res.json(request);
    } catch (error) {
      console.error("[Connection Request] Create error:", error);
      res.status(500).json({ error: "Failed to create connection request" });
    }
  });

  app.get("/api/connection-requests/pending", async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      const request = await storage.getPendingConnectionRequestByEmail(email);
      
      if (!request) {
        return res.status(404).json({ error: "No pending request found" });
      }

      res.json(request);
    } catch (error) {
      console.error("[Connection Request] Fetch pending error:", error);
      res.status(500).json({ error: "Failed to fetch pending request" });
    }
  });

  app.get("/api/connection-requests/by-code/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      const request = await storage.getConnectionRequestByInviteCode(code);
      
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      res.json(request);
    } catch (error) {
      console.error("[Connection Request] Fetch by code error:", error);
      res.status(500).json({ error: "Failed to fetch request" });
    }
  });

  app.patch("/api/connection-requests/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const request = await storage.updateConnectionRequest(id, { status });
      
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // If status is "connected", create a device connection
      if (status === "connected") {
        await storage.createDeviceConnection({
          clientId: request.clientId,
          clientName: request.clientName,
          deviceType: request.deviceType,
          status: "connected",
          syncEnabled: true,
          dataPermissions: {
            nutrition: true,
            workouts: true,
            checkIns: true,
          },
          connectedAt: new Date().toISOString(),
        });
        console.log(`[Connection Request] Created device connection for ${request.clientName}`);
      }

      res.json(request);
    } catch (error) {
      console.error("[Connection Request] Update status error:", error);
      res.status(500).json({ error: "Failed to update request status" });
    }
  });

  app.get("/api/connection-requests/client/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const requests = await storage.getConnectionRequestsByClient(clientId);
      
      res.json(requests);
    } catch (error) {
      console.error("[Connection Request] Fetch client requests error:", error);
      res.status(500).json({ error: "Failed to fetch client requests" });
    }
  });

  // AI Insights routes
  app.get("/api/insights/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const allNutritionLogs = await storage.getNutritionLogs();
      const allWorkoutLogs = await storage.getWorkoutLogs();
      const allCheckIns = await storage.getCheckIns();
      const allGoals = await storage.getGoals();

      const clientNutritionLogs = allNutritionLogs.filter(log => log.clientId === clientId);
      const clientWorkoutLogs = allWorkoutLogs.filter(log => log.clientId === clientId);
      const clientCheckIns = allCheckIns.filter(log => log.clientId === clientId);
      const clientGoals = allGoals.filter(goal => goal.clientId === clientId);

      const insights = await analyzeClientData(
        clientId,
        client.name,
        clientNutritionLogs,
        clientWorkoutLogs,
        clientCheckIns,
        clientGoals
      );

      res.json(insights);
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Client Invite routes (Coach creates invites for clients)
  app.post("/api/client-invites", async (req, res) => {
    try {
      const { email, name, questionnaireId, message, coachName } = req.body;
      
      // Check if client already has an active invite
      const existingInvite = await storage.getClientInviteByEmail(email);
      if (existingInvite && existingInvite.status === 'pending') {
        return res.status(400).json({ error: "Client already has a pending invite" });
      }

      // Create client token for authentication
      const tokenData = insertClientTokenSchema.parse({
        email,
        coachName: coachName || "Your Coach",
        status: "pending",
      });
      const clientToken = await storage.createClientToken(tokenData);
      console.log("[DEBUG] Created client token:", { id: clientToken.id, token: clientToken.token, email: clientToken.email });

      // Create invite
      const inviteData = insertClientInviteSchema.parse({
        email,
        name,
        tokenId: clientToken.id,
        questionnaireId,
        message,
        status: "pending",
      });
      const invite = await storage.createClientInvite(inviteData);

      const inviteLink = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/client/onboard?token=${clientToken.token}`;
      console.log("[DEBUG] Returning invite link:", inviteLink);

      // Send invite email
      try {
        const questionnaires = await storage.getQuestionnaires();
        const questionnaire = questionnaires.find(q => q.id === questionnaireId);
        
        await sendInviteEmail({
          to: email,
          clientName: name,
          coachName: coachName || "Your Coach",
          inviteLink,
          questionnaireName: questionnaire?.name,
          message,
        });
        console.log("[Email] Successfully sent invite email to:", email);
      } catch (emailError) {
        // Log email error but don't fail the invite creation
        console.error("[Email] Failed to send invite email:", emailError);
        // Continue with response - invite is still created even if email fails
      }

      res.status(201).json({
        invite,
        inviteLink,
      });
    } catch (error) {
      console.error("Error creating client invite:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  app.get("/api/client-invites/client/:clientId", async (req, res) => {
    try {
      const invite = await storage.getClientInviteByClientId(req.params.clientId);
      res.json(invite || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invite" });
    }
  });

  app.get("/api/client-invites/email/:email", async (req, res) => {
    try {
      const invite = await storage.getClientInviteByEmail(req.params.email);
      res.json(invite || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invite" });
    }
  });

  // Client Authentication routes
  app.post("/api/client-auth/verify", async (req, res) => {
    try {
      const { token } = req.body;
      console.log("[DEBUG] Token verification requested for:", token);
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      const clientToken = await storage.getClientTokenByToken(token);
      console.log("[DEBUG] Found client token:", clientToken ? { id: clientToken.id, email: clientToken.email } : null);
      
      if (!clientToken) {
        console.log("[DEBUG] Token not found in database");
        return res.status(404).json({ error: "Invalid token" });
      }

      // Check if token is expired
      if (clientToken.expiresAt && new Date(clientToken.expiresAt) < new Date()) {
        return res.status(401).json({ error: "Token has expired" });
      }

      // Update last used timestamp
      await storage.updateClientToken(clientToken.id, {
        lastUsedAt: new Date().toISOString(),
      });

      // Get associated client data if clientId exists
      let client = null;
      if (clientToken.clientId) {
        client = await storage.getClient(clientToken.clientId);
      }

      // Get invite information using tokenId to ensure we get the correct invite
      const allInvites = await storage.getClientInvites();
      const invite = allInvites.find(i => i.tokenId === clientToken.id);

      if (!invite) {
        return res.status(404).json({ error: "Invite not found for this token" });
      }

      console.log("[DEBUG] Returning invite data:", { 
        inviteId: invite.id, 
        questionnaireId: invite.questionnaireId,
        hasQuestionnaireId: !!invite.questionnaireId 
      });

      res.json({
        token: clientToken,
        client,
        invite,
      });
    } catch (error) {
      console.error("Error verifying token:", error);
      res.status(500).json({ error: "Failed to verify token" });
    }
  });

  // Set password for first-time clients
  app.post("/api/client-auth/set-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      // Verify token and get client
      const clientToken = await storage.getClientTokenByToken(token);
      if (!clientToken || !clientToken.clientId) {
        return res.status(404).json({ error: "Invalid token or client not found" });
      }

      const client = await storage.getClient(clientToken.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Check if password already set
      if (client.passwordHash) {
        return res.status(400).json({ error: "Password already set. Please use login instead." });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Update client with password
      await storage.updateClient(client.id, {
        passwordHash,
        lastLoginAt: new Date().toISOString(),
      });

      // Set session
      req.session.clientId = client.id;
      req.session.clientEmail = client.email;

      res.json({ 
        success: true, 
        client: { 
          id: client.id, 
          name: client.name, 
          email: client.email 
        } 
      });
    } catch (error) {
      console.error("Error setting password:", error);
      res.status(500).json({ error: "Failed to set password" });
    }
  });

  // Login for returning clients
  app.post("/api/client-auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Find client by email
      const clients = await storage.getClients();
      const client = clients.find(c => c.email.toLowerCase() === email.toLowerCase());

      if (!client || !client.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, client.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Update last login
      await storage.updateClient(client.id, {
        lastLoginAt: new Date().toISOString(),
      });

      // Set session
      req.session.clientId = client.id;
      req.session.clientEmail = client.email;

      res.json({ 
        success: true, 
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          status: client.status,
          progressScore: client.progressScore,
          joinedDate: client.joinedDate,
          goalType: client.goalType,
        }
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Get current client session
  app.get("/api/client-auth/me", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId!;

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      res.json({ 
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          status: client.status,
          progressScore: client.progressScore,
          joinedDate: client.joinedDate,
          goalType: client.goalType,
          phone: client.phone,
          notes: client.notes,
          lastSession: client.lastSession,
        }
      });
    } catch (error) {
      console.error("Error getting client session:", error);
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  // Client Plans routes
  app.post("/api/client-plans", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertClientPlanSchema.parse(req.body);
      const plan = await storage.createClientPlan(validatedData);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating client plan:", error);
      res.status(400).json({ error: "Invalid plan data" });
    }
  });

  // Client-facing endpoint to get their own plans
  app.get("/api/client-plans/my-plans", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId!;
      const plans = await storage.getClientPlansByClientId(clientId);
      // Only return shared plans for clients
      const sharedPlans = plans.filter(plan => plan.shared);
      res.json(sharedPlans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  // Coach-facing endpoint to get all plans for a client
  app.get("/api/client-plans/client/:clientId", requireCoachAuth, async (req, res) => {
    try {
      const plans = await storage.getClientPlansByClientId(req.params.clientId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.get("/api/client-plans/client/:clientId/active", requireCoachAuth, async (req, res) => {
    try {
      const plan = await storage.getActiveClientPlan(req.params.clientId);
      res.json(plan || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active plan" });
    }
  });

  app.get("/api/client-plans/:id", requireCoachAuth, async (req, res) => {
    try {
      const plan = await storage.getClientPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch plan" });
    }
  });

  app.patch("/api/client-plans/:id", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertClientPlanSchema.partial().parse(req.body);
      const plan = await storage.updateClientPlan(req.params.id, validatedData);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      res.status(400).json({ error: "Invalid plan data" });
    }
  });

  app.delete("/api/client-plans/:id", requireCoachAuth, async (req, res) => {
    try {
      const success = await storage.deleteClientPlan(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete plan" });
    }
  });

  // Share plan with client
  app.post("/api/client-plans/:id/share", requireCoachAuth, async (req, res) => {
    try {
      const plan = await storage.updateClientPlan(req.params.id, { shared: true });
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Failed to share plan" });
    }
  });

  // AI Plan Builder routes
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  app.get("/api/clients/:id/context", requireCoachAuth, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const goals = await storage.getGoalsByClientId(req.params.id);
      const allNutritionLogs = await storage.getNutritionLogs();
      const allWorkoutLogs = await storage.getWorkoutLogs();
      const allCheckIns = await storage.getCheckIns();

      const nutritionLogs = allNutritionLogs.filter(n => n.clientId === req.params.id);
      const workoutLogs = allWorkoutLogs.filter(w => w.clientId === req.params.id);
      const checkIns = allCheckIns.filter(c => c.clientId === req.params.id);

      const context = {
        client: {
          name: client.name,
          email: client.email,
          goal: client.goalType || null,
          goalDescription: client.goalDescription || null,
          current_weight: checkIns.length > 0 ? checkIns[checkIns.length - 1].weight : null,
          notes: client.notes || null,
        },
        goals: goals.map(g => ({
          type: g.goalType,
          target: g.targetValue,
          current: g.currentValue,
          deadline: g.deadline,
          status: g.status,
        })),
        recent_nutrition: nutritionLogs.slice(-7).map((n: any) => ({
          date: n.date,
          calories: n.calories,
          protein: n.protein,
          carbs: n.carbs,
          fats: n.fats,
        })),
        recent_workouts: workoutLogs.slice(-7).map((w: any) => ({
          date: w.date,
          type: w.type,
          duration: w.duration,
          intensity: w.intensity,
        })),
      };

      res.json(context);
    } catch (error) {
      console.error("Error getting client context:", error);
      res.status(500).json({ error: "Failed to get client context" });
    }
  });

  app.post("/api/plans/chat", requireCoachAuth, async (req, res) => {
    try {
      const chatRequestSchema = z.object({
        messages: z.array(z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        })),
        clientContext: z.object({
          client: z.object({
            name: z.string(),
            email: z.string().optional(),
            goal: z.string().nullable(),
            goalDescription: z.string().nullable(),
            current_weight: z.number().nullable(),
            notes: z.string().nullable(),
          }),
          goals: z.array(z.any()).optional(),
          recent_nutrition: z.array(z.any()).optional(),
          recent_workouts: z.array(z.any()).optional(),
        }),
      });

      const validatedData = chatRequestSchema.parse(req.body);
      const { messages, clientContext } = validatedData;

      const systemPrompt = `You are Wellio AI, a professional assistant that helps coaches create structured, personalized client plans.
Use the provided client profile data to generate a wellness or nutrition plan tailored to the client's goal, preferences, and metrics.
Always return structured, sectioned content that can be exported to PDF (no conversational fluff).

Client Context:
${JSON.stringify(clientContext, null, 2)}

When creating plans, include sections such as:
- 7-Day Meal Plan
- Daily Calorie / Macro Targets
- Exercise & Recovery Recommendations
- Optional Shopping List

Be specific, actionable, and professional.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message;
      if (!response) {
        return res.status(500).json({ error: "No response from AI" });
      }

      res.json({ message: response });
    } catch (error) {
      console.error("Error in GPT chat:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  app.post("/api/plans/:id/generate-pdf", requireCoachAuth, async (req, res) => {
    try {
      const plan = await storage.getClientPlan(req.params.id);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      const client = await storage.getClient(plan.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));

      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
      });

      doc.fontSize(24).fillColor('#28A0AE').text('Wellio', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(18).fillColor('#000000').text(plan.planName, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor('#666666').text(`Client: ${client.name}`, { align: 'center' });
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      const chatHistory = (plan.planContent as any).messages || [];
      
      doc.fontSize(14).fillColor('#000000');
      for (const msg of chatHistory) {
        if (msg.role === 'assistant') {
          doc.fontSize(12).fillColor('#000000').text(msg.content, {
            align: 'left',
            lineGap: 4,
          });
          doc.moveDown(1);
        }
      }

      doc.end();

      const pdfBuffer = await pdfPromise;

      const objectStorageService = new ObjectStorageService();
      let privateDir: string;
      try {
        privateDir = objectStorageService.getPrivateObjectDir();
      } catch (error) {
        return res.status(500).json({ error: "Object storage not configured. Please set up PRIVATE_OBJECT_DIR." });
      }
      const fileName = `${privateDir}/plans/${plan.id}.pdf`;
      
      const { bucketName, objectName } = parseObjectPath(fileName);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      await file.save(pdfBuffer, {
        contentType: 'application/pdf',
        resumable: false,
      });

      const objectPath = `/objects/plans/${plan.id}.pdf`;
      await objectStorageService.trySetObjectEntityAclPolicy(fileName, {
        owner: plan.coachId,
        visibility: 'private',
        aclRules: [
          {
            group: {
              type: 'clientId' as ObjectAccessGroupType,
              id: plan.clientId,
            },
            permission: ObjectPermission.READ,
          },
        ],
      });

      await storage.updateClientPlan(plan.id, { pdfUrl: objectPath });

      res.json({ pdfUrl: objectPath });
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Goals routes
  app.get("/api/goals", requireCoachAuth, async (_req, res) => {
    try {
      const goals = await storage.getGoals();
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.get("/api/goals/client/:clientId", requireCoachAuth, async (req, res) => {
    try {
      const goals = await storage.getGoalsByClientId(req.params.clientId);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.get("/api/goals/:id", requireCoachAuth, async (req, res) => {
    try {
      const goal = await storage.getGoal(req.params.id);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goal" });
    }
  });

  app.post("/api/goals", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(validatedData);
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating goal:", error);
      res.status(400).json({ error: "Invalid goal data" });
    }
  });

  app.patch("/api/goals/:id", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertGoalSchema.partial().parse(req.body);
      const goal = await storage.updateGoal(req.params.id, validatedData);
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.json(goal);
    } catch (error) {
      console.error("Error updating goal:", error);
      res.status(400).json({ error: "Invalid goal data" });
    }
  });

  app.delete("/api/goals/:id", requireCoachAuth, async (req, res) => {
    try {
      const success = await storage.deleteGoal(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Goal not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

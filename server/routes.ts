import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";

// Extend Express session type
declare module 'express-session' {
  interface SessionData {
    clientId?: string;
    clientEmail?: string;
  }
}

// Authentication middleware for client routes
function requireClientAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.clientId) {
    return res.status(401).json({ error: "Unauthorized - Please log in" });
  }
  next();
}
import { 
  insertClientSchema, 
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
} from "@shared/schema";
import { analyzeClientData } from "./ai";
import { syncAppleHealthData } from "./sync";
import { 
  verifyRookWebhook, 
  mapRookNutritionToLog, 
  mapRookPhysicalToWorkout, 
  mapRookBodyToCheckIn,
  generateRookConnectionUrl
} from "./rook";
import { sendInviteEmail } from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
  // Client routes
  app.get("/api/clients", async (_req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
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

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
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

  // Session routes
  app.get("/api/sessions", async (_req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
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

  app.post("/api/sessions", async (req, res) => {
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
  app.get("/api/coach/messages", async (_req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/coach/messages", async (req, res) => {
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

  // Activity routes
  app.get("/api/activities", async (_req, res) => {
    try {
      const activities = await storage.getActivities();
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.get("/api/activities/:id", async (req, res) => {
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

  app.post("/api/activities", async (req, res) => {
    try {
      const validatedData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(validatedData);
      res.status(201).json(activity);
    } catch (error) {
      res.status(400).json({ error: "Invalid activity data" });
    }
  });

  // Questionnaire routes
  app.get("/api/questionnaires", async (_req, res) => {
    try {
      const questionnaires = await storage.getQuestionnaires();
      res.json(questionnaires);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questionnaires" });
    }
  });

  app.get("/api/questionnaires/:id", async (req, res) => {
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

  app.post("/api/questionnaires", async (req, res) => {
    try {
      const validatedData = insertQuestionnaireSchema.parse(req.body);
      const questionnaire = await storage.createQuestionnaire(validatedData);
      res.status(201).json(questionnaire);
    } catch (error) {
      res.status(400).json({ error: "Invalid questionnaire data" });
    }
  });

  app.patch("/api/questionnaires/:id", async (req, res) => {
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

  app.delete("/api/questionnaires/:id", async (req, res) => {
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

      const clientNutritionLogs = allNutritionLogs.filter(log => log.clientId === clientId);
      const clientWorkoutLogs = allWorkoutLogs.filter(log => log.clientId === clientId);
      const clientCheckIns = allCheckIns.filter(log => log.clientId === clientId);

      const insights = await analyzeClientData(
        clientId,
        client.name,
        clientNutritionLogs,
        clientWorkoutLogs,
        clientCheckIns
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
  app.post("/api/client-plans", async (req, res) => {
    try {
      const validatedData = insertClientPlanSchema.parse(req.body);
      const plan = await storage.createClientPlan(validatedData);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating client plan:", error);
      res.status(400).json({ error: "Invalid plan data" });
    }
  });

  app.get("/api/client-plans/client/:clientId", async (req, res) => {
    try {
      const plans = await storage.getClientPlansByClientId(req.params.clientId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch plans" });
    }
  });

  app.get("/api/client-plans/client/:clientId/active", async (req, res) => {
    try {
      const plan = await storage.getActiveClientPlan(req.params.clientId);
      res.json(plan || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch active plan" });
    }
  });

  app.get("/api/client-plans/:id", async (req, res) => {
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

  app.patch("/api/client-plans/:id", async (req, res) => {
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

  app.delete("/api/client-plans/:id", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}

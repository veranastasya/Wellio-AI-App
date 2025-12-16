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
  insertClientDataLogSchema,
  insertSmartLogSchema,
  insertProgressEventSchema,
  insertWeeklyReportSchema,
  insertPlanTargetsSchema,
  insertPlanSessionSchema,
  insertPlanMessageSchema,
  insertEngagementTriggerSchema,
  insertEngagementRecommendationSchema,
  insertEngagementNotificationPreferencesSchema,
  insertInAppNotificationSchema,
  GOAL_TYPES,
  type GoalType,
} from "@shared/schema";
import { classifySmartLog, parseSmartLog, processSmartLogToEvents, processSmartLog } from "./smartLogProcessor";
import { updateClientProgress, updateAllClientsProgress, calculateClientProgress } from "./progressCalculator";
import { analyzeClientData, analyzeProgressEventsWithGoals, processProgramBuilderRequest, type EnhancedClientInsight, type ProgramBuilderAction } from "./ai";
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
import { sendInviteEmail, sendPlanAssignmentEmail, sendSessionBookingEmail, sendAccountSetupEmail } from "./email";
import { logger } from "./logger";

async function sendPushNotificationToClient(
  clientId: string,
  title: string,
  body: string,
  options?: { tag?: string; url?: string; type?: string; metadata?: Record<string, any> }
): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  try {
    const webpush = await import('web-push').then(m => m.default);
    
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      logger.warn('Push notification skipped: VAPID keys not configured');
      return { success: false, error: 'VAPID keys not configured' };
    }
    
    webpush.setVapidDetails(
      'mailto:support@wellio.app',
      vapidPublicKey,
      vapidPrivateKey
    );
    
    // Get ALL subscriptions for this client (multi-device support)
    const subscriptions = await storage.getAllPushSubscriptions(clientId);
    
    if (subscriptions.length === 0) {
      logger.debug('Push notification skipped: Client has no subscriptions', { clientId });
      return { success: false, error: 'Client has not enabled push notifications' };
    }
    
    const pushPayload = JSON.stringify({
      type: options?.type || 'notification',
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      tag: options?.tag || 'wellio-notification',
      data: { 
        url: options?.url || '/client',
        ...options?.metadata
      }
    });
    
    let sentCount = 0;
    const errors: string[] = [];
    
    // Send to all devices
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          pushPayload
        );
        sentCount++;
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          logger.info('Push subscription expired, removing', { clientId, endpoint: subscription.endpoint.slice(-20) });
          await storage.deletePushSubscriptionByEndpoint(subscription.endpoint);
        } else {
          errors.push(error.message);
        }
      }
    }
    
    if (sentCount > 0) {
      logger.info('Push notifications sent', { clientId, title, sentCount, totalDevices: subscriptions.length });
      return { success: true, sentCount };
    }
    
    return { success: false, error: errors.join(', ') || 'All subscriptions expired' };
  } catch (error: any) {
    logger.error('Failed to send push notification', { clientId }, error);
    return { success: false, error: 'Failed to send push notification' };
  }
}

async function sendPushNotificationToCoach(
  coachId: string,
  title: string,
  body: string,
  options?: { tag?: string; url?: string; type?: string; metadata?: Record<string, any> }
): Promise<{ success: boolean; error?: string; sentCount?: number }> {
  try {
    const webpush = await import('web-push').then(m => m.default);
    
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      logger.warn('Push notification skipped: VAPID keys not configured');
      return { success: false, error: 'VAPID keys not configured' };
    }
    
    webpush.setVapidDetails(
      'mailto:support@wellio.app',
      vapidPublicKey,
      vapidPrivateKey
    );
    
    // Get ALL subscriptions for this coach (multi-device support)
    const subscriptions = await storage.getAllCoachPushSubscriptions(coachId);
    
    if (subscriptions.length === 0) {
      logger.debug('Push notification skipped: Coach has no subscriptions', { coachId });
      return { success: false, error: 'Coach has not enabled push notifications' };
    }
    
    const pushPayload = JSON.stringify({
      type: options?.type || 'notification',
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      tag: options?.tag || 'wellio-notification',
      data: { 
        url: options?.url || '/communication',
        ...options?.metadata
      }
    });
    
    let sentCount = 0;
    const errors: string[] = [];
    
    // Send to all devices
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          pushPayload
        );
        sentCount++;
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          logger.info('Coach push subscription expired, removing', { coachId, endpoint: subscription.endpoint.slice(-20) });
          await storage.deleteCoachPushSubscriptionByEndpoint(subscription.endpoint);
        } else {
          errors.push(error.message);
        }
      }
    }
    
    if (sentCount > 0) {
      logger.info('Push notifications sent to coach', { coachId, title, sentCount, totalDevices: subscriptions.length });
      return { success: true, sentCount };
    }
    
    return { success: false, error: errors.join(', ') || 'All subscriptions expired' };
  } catch (error: any) {
    logger.error('Failed to send push notification to coach', { coachId }, error);
    return { success: false, error: 'Failed to send push notification' };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Dynamic manifest route for PWA - serves client-specific manifest when appropriate
  // iOS Safari uses the URL you're on when saving to home screen, not the manifest's start_url
  // This route serves different manifests based on the referer header
  app.get("/manifest.json", (req, res) => {
    const referer = req.headers.referer || '';
    const isClientPath = referer.includes('/client');
    
    // Base manifest configuration
    const manifest = {
      name: isClientPath ? "Wellio Client" : "Wellio - AI Fitness Coaching",
      short_name: "Wellio",
      description: isClientPath 
        ? "Track your fitness progress with your coach" 
        : "AI-powered fitness and wellness coaching platform",
      start_url: isClientPath ? "/client" : "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#28A0AE",
      orientation: "portrait-primary",
      icons: [
        { src: "/icon-72.png?v=2", sizes: "72x72", type: "image/png", purpose: "any maskable" },
        { src: "/icon-96.png?v=2", sizes: "96x96", type: "image/png", purpose: "any maskable" },
        { src: "/icon-128.png?v=2", sizes: "128x128", type: "image/png", purpose: "any maskable" },
        { src: "/icon-144.png?v=2", sizes: "144x144", type: "image/png", purpose: "any maskable" },
        { src: "/icon-152.png?v=2", sizes: "152x152", type: "image/png", purpose: "any maskable" },
        { src: "/icon-180.png?v=2", sizes: "180x180", type: "image/png", purpose: "any maskable" },
        { src: "/icon-192.png?v=2", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "/icon-384.png?v=2", sizes: "384x384", type: "image/png", purpose: "any maskable" },
        { src: "/icon-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "any maskable" }
      ],
      categories: ["health", "fitness", "lifestyle"],
      prefer_related_applications: false
    };
    
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(manifest);
  });

  // Coach registration endpoint
  app.post("/api/coach/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password, and name are required" });
      }
      
      // Check if coach with this email already exists
      const existingCoach = await storage.getCoachByEmail(email);
      if (existingCoach) {
        return res.status(400).json({ error: "A coach with this email already exists" });
      }
      
      // Hash the password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create the coach
      const coach = await storage.createCoach({
        email,
        name,
        passwordHash,
        phone: null,
      });
      
      // Log them in automatically
      req.session.coachId = coach.id;
      res.json({ success: true, coachId: coach.id, name: coach.name });
    } catch (error) {
      console.error("Coach registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Coach authentication routes
  app.post("/api/coach/login", async (req, res) => {
    try {
      const { password, email, username } = req.body;
      
      // Test account for automated testing (username: coach_test, password: coach123)
      if (username === "coach_test" && password === "coach123") {
        req.session.coachId = "test-coach";
        return res.json({ success: true, coachId: "test-coach" });
      }
      
      // Email-based login against coaches table
      if (email) {
        const coach = await storage.getCoachByEmail(email);
        if (!coach) {
          return res.status(401).json({ error: "Invalid email or password" });
        }
        
        if (!coach.passwordHash) {
          return res.status(401).json({ error: "Account not set up. Please contact support." });
        }
        
        const passwordMatch = await bcrypt.compare(password, coach.passwordHash);
        if (!passwordMatch) {
          return res.status(401).json({ error: "Invalid email or password" });
        }
        
        req.session.coachId = coach.id;
        return res.json({ success: true, coachId: coach.id, name: coach.name });
      }
      
      // No email provided - require email for login
      return res.status(401).json({ error: "Email and password are required" });
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

  // Coach profile routes
  app.get("/api/coach/profile", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId;
      let coach = await storage.getCoach(coachId!);
      
      // If no coach profile exists, create one with default values
      if (!coach) {
        coach = await storage.createCoach({
          name: "Coach",
          email: "coach@example.com",
          phone: null,
          passwordHash: null,
        });
        // Update session with actual coach id
        req.session.coachId = coach.id;
      }
      
      // Don't return password hash to frontend
      const { passwordHash, ...coachProfile } = coach;
      res.json(coachProfile);
    } catch (error) {
      console.error("Get coach profile error:", error);
      res.status(500).json({ error: "Failed to fetch coach profile" });
    }
  });

  app.patch("/api/coach/profile", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId;
      let coach = await storage.getCoach(coachId!);
      
      // If no coach exists, create one first
      if (!coach) {
        coach = await storage.createCoach({
          name: "Coach",
          email: "coach@example.com",
          phone: null,
          passwordHash: null,
        });
        req.session.coachId = coach.id;
      }
      
      // Only allow updating name, email, phone
      const { name, email, phone } = req.body;
      const updateData: { name?: string; email?: string; phone?: string | null } = {};
      
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      
      const updated = await storage.updateCoach(coach.id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Coach not found" });
      }
      
      // Don't return password hash to frontend
      const { passwordHash, ...coachProfile } = updated;
      res.json(coachProfile);
    } catch (error) {
      console.error("Update coach profile error:", error);
      res.status(500).json({ error: "Failed to update coach profile" });
    }
  });

  // Public endpoint for clients to get coach info (returns their coach's info)
  app.get("/api/coach/info", requireClientAuth, async (req, res) => {
    try {
      // Get the client to find their coach
      const client = await storage.getClient(req.session.clientId!);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Get the client's coach
      let coach = null;
      if (client.coachId) {
        coach = await storage.getCoach(client.coachId);
      }
      
      if (!coach) {
        // Fallback to default coach if client has no assigned coach
        coach = await storage.getDefaultCoach();
      }
      
      if (!coach) {
        // Return default info if no coach profile exists yet
        return res.json({ name: "Your Coach", email: null, phone: null });
      }
      
      // Only return public info (name, email, phone)
      res.json({
        name: coach.name,
        email: coach.email,
        phone: coach.phone,
      });
    } catch (error) {
      console.error("Get coach info error:", error);
      res.status(500).json({ error: "Failed to fetch coach info" });
    }
  });

  // Client routes
  app.get("/api/clients", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const clients = await storage.getClients(coachId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      // Verify coach ownership
      if (client.coachId && client.coachId !== coachId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      
      // Check if client with this email already exists (globally)
      const email = req.body.email;
      if (email) {
        const existingClient = await storage.getClientByEmail(email);
        if (existingClient) {
          return res.status(400).json({ error: "A client with this email already exists" });
        }
      }
      
      const validatedData = insertClientSchema.parse({
        ...req.body,
        coachId, // Automatically assign to the logged-in coach
      });
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.patch("/api/clients/:id", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      // Verify coach ownership
      if (client.coachId && client.coachId !== coachId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const validatedData = updateClientSchema.parse(req.body);
      const updatedClient = await storage.updateClient(req.params.id, validatedData);
      res.json(updatedClient);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.delete("/api/clients/:id", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      // Verify coach ownership
      if (client.coachId && client.coachId !== coachId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const success = await storage.deleteClient(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // Send account setup invite to an existing client (manually added)
  app.post("/api/clients/:id/send-setup-invite", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const clientId = req.params.id;
      const { message } = req.body;
      
      // Get client
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Verify coach ownership
      if (client.coachId && client.coachId !== coachId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check if client already has a password set
      if (client.passwordHash) {
        return res.status(400).json({ error: "Client already has an account set up" });
      }
      
      // Get coach info for the email
      const coach = await storage.getCoach(coachId);
      const coachName = coach?.name || "Your Coach";
      
      // Create a client token linked to this client
      const tokenData = insertClientTokenSchema.parse({
        clientId: client.id,
        email: client.email,
        coachId: coachId,
        coachName: coachName,
        status: "pending",
      });
      const clientToken = await storage.createClientToken(tokenData);
      
      // Generate the setup link
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
      const setupLink = `${baseUrl}/client/setup-password?token=${clientToken.token}`;
      
      // Send the email
      try {
        await sendAccountSetupEmail({
          to: client.email,
          clientName: client.name,
          coachName: coachName,
          setupLink,
          message,
        });
        console.log("[Email] Successfully sent account setup email to:", client.email);
      } catch (emailError) {
        console.error("[Email] Failed to send account setup email:", emailError);
        // Still return success - token is created even if email fails
      }
      
      res.json({
        success: true,
        setupLink,
        message: "Account setup invite sent successfully",
      });
    } catch (error) {
      console.error("Error sending setup invite:", error);
      res.status(500).json({ error: "Failed to send setup invite" });
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
      
      // Send booking confirmation email to client (don't fail session creation if email fails)
      try {
        const client = await storage.getClient(session.clientId);
        if (client && client.email && !client.email.endsWith('@pending.com')) {
          await sendSessionBookingEmail({
            to: client.email,
            clientName: client.name,
            coachName: 'Your Coach',
            sessionDate: session.date,
            sessionTime: session.startTime,
            endTime: session.endTime || undefined,
            sessionType: session.sessionType,
            locationType: session.locationType || 'video',
            meetingLink: session.meetingLink,
            notes: session.notes || undefined,
          });
          console.log(`[Sessions] Booking confirmation email sent to ${client.email}`);
        }
      } catch (emailError) {
        console.error('[Sessions] Failed to send booking confirmation email:', emailError);
        // Don't fail the session creation - email is a nice-to-have
      }
      
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid session data" });
    }
  });

  app.patch("/api/sessions/:id", requireCoachAuth, async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const updatedSession = await storage.updateSession(req.params.id, req.body);
      res.json(updatedSession);
    } catch (error) {
      res.status(400).json({ error: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", requireCoachAuth, async (req, res) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const deleted = await storage.deleteSession(req.params.id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(500).json({ error: "Failed to delete session" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete session" });
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
      
      // Update client's last active time
      await storage.updateClient(clientId, { lastActiveAt: new Date().toISOString() });
      
      // Send push notification to coach when client sends a message
      const client = await storage.getClient(clientId);
      if (client?.coachId) {
        sendPushNotificationToCoach(
          client.coachId,
          `New message from ${client.name}`,
          validatedData.content.substring(0, 100) + (validatedData.content.length > 100 ? '...' : ''),
          { tag: 'client-message', url: `/communication?client=${clientId}`, type: 'message', metadata: { userType: 'coach' } }
        ).then(result => {
          if (!result.success) {
            logger.debug('Push notification not sent for client message', { 
              coachId: client.coachId, 
              reason: result.error 
            });
          }
        }).catch(err => {
          logger.error('Unexpected error sending push notification to coach', { coachId: client.coachId }, err);
        });
      }
      
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
      
      // Send push notification to client when coach sends a message (non-blocking)
      if (validatedData.clientId) {
        sendPushNotificationToClient(
          validatedData.clientId,
          'New Message from Your Coach',
          validatedData.content.substring(0, 100) + (validatedData.content.length > 100 ? '...' : ''),
          { tag: 'coach-message', url: '/client/coach-chat', type: 'message', metadata: { userType: 'client' } }
        ).then(result => {
          if (!result.success) {
            logger.debug('Push notification not sent for coach message', { 
              clientId: validatedData.clientId, 
              reason: result.error 
            });
          }
        }).catch(err => {
          logger.error('Unexpected error sending push notification for coach message', { clientId: validatedData.clientId }, err);
        });
      }
      
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
      
      // Check for both coach and client sessions
      const coachId = req.session?.coachId;
      const clientId = req.session?.clientId;
      const userId = coachId || clientId;
      
      // Verify the user has access via ACL policy
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
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

  // Helper function to normalize object paths from various formats to /objects/ format
  function normalizeObjectPath(rawPath: string): string {
    // If it's already in the correct format, return as-is
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }

    // Handle full Google Cloud Storage URLs
    // Format: https://storage.googleapis.com/bucket-name/.private/uploads/entity-id
    if (rawPath.startsWith("https://storage.googleapis.com/")) {
      try {
        const url = new URL(rawPath);
        const pathname = url.pathname; // e.g., /bucket-name/.private/uploads/entity-id
        
        // Find the .private/ part and extract everything after it
        const privateIndex = pathname.indexOf("/.private/");
        if (privateIndex !== -1) {
          // Extract the path after .private/ (e.g., "uploads/entity-id")
          const entityPath = pathname.slice(privateIndex + "/.private/".length);
          return `/objects/${entityPath}`;
        }
        
        // Fallback: try to extract path after first segment (bucket name)
        const parts = pathname.split("/").filter(Boolean);
        if (parts.length >= 2) {
          const objectPath = parts.slice(1).join("/");
          // If it starts with .private, strip it
          if (objectPath.startsWith(".private/")) {
            return `/objects/${objectPath.slice(".private/".length)}`;
          }
          return `/objects/${objectPath}`;
        }
      } catch (e) {
        console.error("Error parsing URL:", e);
      }
    }

    // If it's a relative path, convert to /objects/ format
    if (rawPath.startsWith(".private/")) {
      return `/objects/${rawPath.slice(".private/".length)}`;
    }

    // Last resort: assume it's the entity ID
    return `/objects/${rawPath}`;
  }

  // Get signed download URL for an attachment
  app.post("/api/attachments/download-url", async (req, res) => {
    try {
      // Require either coach or client session
      if (!req.session || (!req.session.coachId && !req.session.clientId)) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      const { objectPath: rawObjectPath } = req.body;
      
      if (!rawObjectPath || typeof rawObjectPath !== 'string') {
        return res.status(400).json({ error: "Missing objectPath" });
      }
      
      // Normalize the object path to /objects/ format
      const objectPath = normalizeObjectPath(rawObjectPath);
      
      const objectStorageService = new ObjectStorageService();
      
      // Get the object file and verify it exists
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      
      // Verify the user has access to this object
      const userId = req.session.clientId || req.session.coachId || "";
      const canAccess = await objectStorageService.canAccessObjectEntity({
        userId,
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied to this file" });
      }
      
      // Generate a signed URL valid for 1 hour
      const signedUrl = await objectStorageService.getSignedDownloadURL(objectPath, 3600);
      
      res.json({ signedUrl });
    } catch (error) {
      console.error("Error generating download URL:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      res.status(500).json({ error: "Failed to generate download URL" });
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
      const activeQuestionnaires = questionnaires.filter(q => !q.deleted);
      res.json(activeQuestionnaires);
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
      
      // Allow public access to published questionnaires (for client onboarding)
      // Require coach authentication for draft questionnaires
      if (questionnaire.status === 'draft' && !req.session?.coachId) {
        return res.status(401).json({ error: "Unauthorized" });
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

  app.patch("/api/questionnaires/:id/publish", requireCoachAuth, async (req, res) => {
    try {
      console.log(`[Publish] Publishing questionnaire ${req.params.id}`);
      const questionnaire = await storage.publishQuestionnaire(req.params.id);
      if (!questionnaire) {
        console.log(`[Publish] Questionnaire ${req.params.id} not found`);
        return res.status(404).json({ error: "Questionnaire not found" });
      }
      console.log(`[Publish] Successfully published questionnaire ${req.params.id}`);
      res.json(questionnaire);
    } catch (error) {
      console.error(`[Publish] Error publishing questionnaire ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to publish questionnaire" });
    }
  });

  app.patch("/api/questionnaires/:id/archive", requireCoachAuth, async (req, res) => {
    try {
      const questionnaire = await storage.archiveQuestionnaire(req.params.id);
      if (!questionnaire) {
        return res.status(404).json({ error: "Questionnaire not found" });
      }
      res.json(questionnaire);
    } catch (error) {
      res.status(500).json({ error: "Failed to archive questionnaire" });
    }
  });

  app.patch("/api/questionnaires/:id/restore", requireCoachAuth, async (req, res) => {
    try {
      const questionnaire = await storage.restoreQuestionnaire(req.params.id);
      if (!questionnaire) {
        return res.status(404).json({ error: "Questionnaire not found" });
      }
      res.json(questionnaire);
    } catch (error) {
      res.status(500).json({ error: "Failed to restore questionnaire" });
    }
  });

  app.delete("/api/questionnaires/:id", requireCoachAuth, async (req, res) => {
    try {
      const questionnaire = await storage.getQuestionnaire(req.params.id);
      if (!questionnaire) {
        return res.status(404).json({ error: "Questionnaire not found" });
      }

      // Smart delete: if usageCount > 0, archive instead of hard delete
      if (questionnaire.usageCount && questionnaire.usageCount > 0) {
        const archived = await storage.archiveQuestionnaire(req.params.id);
        return res.json({ 
          message: "Questionnaire archived (has been sent to clients)",
          questionnaire: archived,
          archived: true
        });
      }

      // Hard delete if never used
      const deleted = await storage.deleteQuestionnaire(req.params.id);
      if (!deleted) {
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
          
          // Update existing client with new health metrics from questionnaire
          const answers = responseData.answers as any;
          const updateData: any = {};
          
          // Extract standard health metrics if present
          if (answers.sex) updateData.sex = answers.sex;
          if (answers.age !== undefined && answers.age !== "") {
            const parsedAge = parseInt(answers.age);
            if (isFinite(parsedAge)) updateData.age = parsedAge;
          }
          if (answers.weight !== undefined && answers.weight !== "") {
            const parsedWeight = parseFloat(answers.weight);
            if (isFinite(parsedWeight)) updateData.weight = parsedWeight;
          }
          if (answers.height !== undefined && answers.height !== "") {
            const parsedHeight = parseFloat(answers.height);
            if (isFinite(parsedHeight)) updateData.height = parsedHeight;
          }
          if (answers.activityLevel) updateData.activityLevel = answers.activityLevel;
          if (answers.bodyFatPercentage !== undefined && answers.bodyFatPercentage !== "") {
            const parsedBodyFat = parseFloat(answers.bodyFatPercentage);
            if (isFinite(parsedBodyFat)) updateData.bodyFatPercentage = parsedBodyFat;
          }
          if (answers.unitsPreference) updateData.unitsPreference = answers.unitsPreference;
          
          // Extract conditional goal-based fields
          if (answers.targetWeight !== undefined && answers.targetWeight !== "") {
            const parsedTargetWeight = parseFloat(answers.targetWeight);
            if (isFinite(parsedTargetWeight)) updateData.targetWeight = parsedTargetWeight;
          }
          if (answers.targetBodyFat !== undefined && answers.targetBodyFat !== "") {
            const parsedTargetBodyFat = parseFloat(answers.targetBodyFat);
            if (isFinite(parsedTargetBodyFat)) updateData.targetBodyFat = parsedTargetBodyFat;
          }
          if (answers.goalWeight !== undefined && answers.goalWeight !== "") {
            const parsedGoalWeight = parseFloat(answers.goalWeight);
            if (isFinite(parsedGoalWeight)) updateData.goalWeight = parsedGoalWeight;
          }
          
          // Also update basic info if provided
          if (answers.phone || answers.phoneNumber) updateData.phone = answers.phone || answers.phoneNumber;
          if (answers.goalType || answers.goal || answers.primaryGoal) updateData.goalType = answers.goalType || answers.goal || answers.primaryGoal;
          if (answers.notes || answers.additionalInfo) updateData.notes = answers.notes || answers.additionalInfo;
          
          // Update client if we have any new data
          if (Object.keys(updateData).length > 0) {
            await storage.updateClient(clientToken.clientId, updateData);
          }
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
            coachId: clientToken.coachId, // Link client to the correct coach from the invite token
            status: "active" as const,
            progressScore: 0,
            joinedDate: new Date().toISOString().split("T")[0],
            intakeSource: "questionnaire" as const,
            questionnaireId: invite.questionnaireId,
            // Extract additional fields from answers if available
            phone: answers.phone || answers.phoneNumber || "",
            goalType: answers.goalType || answers.goal || answers.primaryGoal || "",
            notes: answers.notes || answers.additionalInfo || "",
            // Extract standard health metrics from answers
            sex: answers.sex || null,
            age: (answers.age !== undefined && answers.age !== "") ? parseInt(answers.age) : null,
            weight: (answers.weight !== undefined && answers.weight !== "") ? parseFloat(answers.weight) : null,
            height: (answers.height !== undefined && answers.height !== "") ? parseFloat(answers.height) : null,
            activityLevel: answers.activityLevel || null,
            bodyFatPercentage: (answers.bodyFatPercentage !== undefined && answers.bodyFatPercentage !== "") ? parseFloat(answers.bodyFatPercentage) : null,
            unitsPreference: answers.unitsPreference || "us",
            // Extract conditional goal-based fields
            targetWeight: (answers.targetWeight !== undefined && answers.targetWeight !== "") ? parseFloat(answers.targetWeight) : null,
            targetBodyFat: (answers.targetBodyFat !== undefined && answers.targetBodyFat !== "") ? parseFloat(answers.targetBodyFat) : null,
            goalWeight: (answers.goalWeight !== undefined && answers.goalWeight !== "") ? parseFloat(answers.goalWeight) : null,
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
          validatedData.clientName = client.name;
        }
        
        // Fetch questionnaire to get its name
        const questionnaire = await storage.getQuestionnaire(validatedData.questionnaireId);
        if (questionnaire) {
          validatedData.questionnaireName = questionnaire.name;
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
        
        // Fetch client and questionnaire to get metadata
        const client = await storage.getClient(clientId);
        if (client) {
          validatedData.clientName = client.name;
        }
        
        const questionnaire = await storage.getQuestionnaire(validatedData.questionnaireId);
        if (questionnaire) {
          validatedData.questionnaireName = questionnaire.name;
        }
        
        const response = await storage.createResponse(validatedData);
        res.status(201).json(response);
      }
    } catch (error) {
      console.error("Error creating response:", error);
      res.status(400).json({ error: "Invalid response data" });
    }
  });

  // Coach-facing response routes
  app.get("/api/clients/:clientId/responses", requireCoachAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const coachId = req.session.coachId!;
      
      // Validate client exists and belongs to this coach
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      if (client.coachId && client.coachId !== coachId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get all responses for this client
      const clientResponses = await storage.getResponsesByClient(clientId);
      
      // Fetch questionnaire definitions for each response to include question text
      const responsesWithQuestions = await Promise.all(
        clientResponses.map(async (response) => {
          const questionnaire = await storage.getQuestionnaire(response.questionnaireId);
          return {
            ...response,
            questionnaireQuestions: questionnaire?.questions || [],
          };
        })
      );
      
      res.json(responsesWithQuestions);
    } catch (error) {
      console.error("Error fetching client responses:", error);
      res.status(500).json({ error: "Failed to fetch client responses" });
    }
  });

  app.post("/api/responses/:id/pin", requireCoachAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the current response
      const response = await storage.getResponse(id);
      if (!response) {
        return res.status(404).json({ error: "Response not found" });
      }
      
      // Toggle the pinned status
      const newPinnedStatus = !response.pinnedForAI;
      const updatedResponse = await storage.toggleResponsePin(id, newPinnedStatus);
      
      if (!updatedResponse) {
        return res.status(500).json({ error: "Failed to update response" });
      }
      
      res.json(updatedResponse);
    } catch (error) {
      console.error("Error toggling response pin:", error);
      res.status(500).json({ error: "Failed to toggle response pin status" });
    }
  });

  app.post("/api/responses/:id/generate-pdf", requireCoachAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get the response
      const response = await storage.getResponse(id);
      if (!response) {
        console.error(`PDF generation failed: Response not found for id ${id}`);
        return res.status(404).json({ error: "Response not found" });
      }
      
      // Fetch the questionnaire to get actual question text
      const questionnaire = await storage.getQuestionnaire(response.questionnaireId);
      const questions = questionnaire?.questions || [];
      
      console.log(`Generating PDF for response ${id}, client: ${response.clientName}`);
      
      // Create PDF document without buffering
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'LETTER'
      });
      
      // Set response headers for PDF download
      const filename = `response-${response.clientName || 'client'}-${new Date(response.submittedAt).toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Handle stream errors
      doc.on('error', (err) => {
        console.error('PDF generation stream error:', err);
      });
      
      // Add Wellio branding header
      doc.fontSize(24).fillColor('#28A0AE').text('Wellio', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(18).fillColor('#000000').text('Questionnaire Response', { align: 'center' });
      doc.moveDown(1);
      
      // Add metadata section
      doc.fontSize(12).fillColor('#666666');
      doc.text(`Client: ${response.clientName || 'N/A'}`, { align: 'left' });
      doc.text(`Questionnaire: ${response.questionnaireName || 'N/A'}`, { align: 'left' });
      doc.text(`Submitted: ${new Date(response.submittedAt).toLocaleString()}`, { align: 'left' });
      doc.moveDown(1.5);
      
      // Add separator line
      doc.strokeColor('#28A0AE').lineWidth(2).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(1);
      
      // Add responses section
      const answers = response.answers as any;
      if (answers && typeof answers === 'object') {
        Object.entries(answers).forEach(([key, value], index) => {
          // Skip empty or null values and internal fields
          if (value === null || value === undefined || value === '' || 
              key === 'consent' || key === 'consentGiven') {
            return;
          }
          
          // Find the actual question text from questionnaire definition
          const questionObj = (questions as any[]).find((q: any) => q.id === key);
          const questionText = questionObj?.label || questionObj?.text || 
            key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
          
          // Format the answer value
          let formattedAnswer = '';
          if (typeof value === 'boolean') {
            formattedAnswer = value ? 'Yes' : 'No';
          } else if (Array.isArray(value)) {
            formattedAnswer = value.join(', ');
          } else if (typeof value === 'object' && value !== null) {
            formattedAnswer = JSON.stringify(value, null, 2);
          } else {
            formattedAnswer = String(value);
          }
          
          // Question text (bold, primary color)
          doc.fontSize(11).fillColor('#28A0AE').font('Helvetica-Bold');
          doc.text(questionText, { continued: false });
          doc.moveDown(0.3);
          
          // Answer text (normal, black)
          doc.fontSize(10).fillColor('#000000').font('Helvetica');
          doc.text(formattedAnswer, { 
            align: 'left',
            indent: 20
          });
          doc.moveDown(0.8);
          
          // Add subtle separator between questions
          if (index < Object.keys(answers).length - 1) {
            doc.strokeColor('#E0E0E0').lineWidth(0.5)
              .moveTo(70, doc.y).lineTo(542, doc.y).stroke();
            doc.moveDown(0.5);
          }
        });
      }
      
      // Add simple footer with generation date
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#999999');
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
      
      // Finalize the PDF and wait for stream to finish
      await new Promise<void>((resolve, reject) => {
        doc.on('end', () => {
          console.log(`PDF stream ended for response ${id}`);
        });
        
        // Wait for the pipe to finish writing to response
        res.on('finish', () => {
          console.log(`PDF generation completed successfully for response ${id}`);
          resolve();
        });
        
        res.on('error', (err) => {
          console.error(`Response stream error for response ${id}:`, err);
          reject(err);
        });
        
        doc.end();
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error generating PDF for response ${req.params.id}:`, errorMessage);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate PDF" });
      }
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

      // Fetch data from new unified ClientDataLog table
      const clientDataLogs = await storage.getClientDataLogsByClientId(clientId);
      const clientGoals = await storage.getGoalsByClientId(clientId);

      // Convert ClientDataLogs to legacy format for backward compatibility with AI analysis
      const nutritionLogs = clientDataLogs
        .filter(log => log.type === "nutrition")
        .map(log => {
          const payload = log.payload as Record<string, unknown>;
          return {
            id: log.id,
            clientId: log.clientId,
            clientName: client.name,
            date: log.date,
            calories: payload.calories as number | null,
            protein: payload.protein as number | null,
            carbs: payload.carbs as number | null,
            fats: payload.fats as number | null,
            notes: payload.notes as string | null,
            createdAt: log.createdAt,
          };
        });

      const workoutLogs = clientDataLogs
        .filter(log => log.type === "workout")
        .map(log => {
          const payload = log.payload as Record<string, unknown>;
          return {
            id: log.id,
            clientId: log.clientId,
            clientName: client.name,
            date: log.date,
            workoutType: payload.workoutType as string | null,
            duration: payload.duration as number | null,
            intensity: payload.intensity as string | null,
            notes: payload.notes as string | null,
            createdAt: log.createdAt,
          };
        });

      const checkIns = clientDataLogs
        .filter(log => log.type === "checkin")
        .map(log => {
          const payload = log.payload as Record<string, unknown>;
          return {
            id: log.id,
            clientId: log.clientId,
            clientName: client.name,
            date: log.date,
            weight: payload.weight as number | null,
            bodyFat: payload.bodyFat as number | null,
            notes: payload.notes as string | null,
            createdAt: log.createdAt,
          };
        });

      const insights = await analyzeClientData(
        clientId,
        client.name,
        nutritionLogs,
        workoutLogs,
        checkIns,
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
      const { email, name, questionnaireId, message, coachName, coachId } = req.body;
      
      // Get coachId from session or request body
      const effectiveCoachId = coachId || (req.session as any)?.coachId || "default-coach";
      
      // Check if client with this email already exists (globally)
      const existingClient = await storage.getClientByEmail(email);
      if (existingClient) {
        return res.status(400).json({ error: "A client with this email already exists" });
      }
      
      // Check if client already has an active invite from this coach
      const existingInvite = await storage.getClientInviteByEmailAndCoach(email, effectiveCoachId);
      if (existingInvite && existingInvite.status === 'pending') {
        return res.status(400).json({ error: "Client already has a pending invite" });
      }

      // Create client token for authentication
      const tokenData = insertClientTokenSchema.parse({
        email,
        coachId: effectiveCoachId,
        coachName: coachName || "Your Coach",
        status: "pending",
      });
      const clientToken = await storage.createClientToken(tokenData);
      console.log("[DEBUG] Created client token:", { id: clientToken.id, token: clientToken.token, email: clientToken.email, coachId: effectiveCoachId });

      // Create invite with expiration (30 days from now)
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const inviteData = insertClientInviteSchema.parse({
        email,
        name,
        coachId: effectiveCoachId,
        tokenId: clientToken.id,
        questionnaireId,
        message,
        status: "pending",
        expiresAt,
      });
      const invite = await storage.createClientInvite(inviteData);

      // Increment questionnaire usage count
      if (questionnaireId) {
        await storage.incrementQuestionnaireUsage(questionnaireId);
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
      const inviteLink = `${baseUrl}/client/onboard?token=${clientToken.token}`;
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

  // Bulk invite endpoint - send multiple invites at once
  app.post("/api/client-invites/bulk", async (req, res) => {
    try {
      const { invites, coachId, coachName, questionnaireId, message } = req.body;
      
      const effectiveCoachId = coachId || (req.session as any)?.coachId || "default-coach";
      
      if (!invites || !Array.isArray(invites) || invites.length === 0) {
        return res.status(400).json({ error: "Invites array is required" });
      }
      
      if (invites.length > 50) {
        return res.status(400).json({ error: "Maximum 50 invites per batch" });
      }

      const results: Array<{ email: string; success: boolean; error?: string; inviteLink?: string }> = [];
      const questionnaires = await storage.getQuestionnaires();
      const questionnaire = questionnaires.find(q => q.id === questionnaireId);
      
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';

      for (const inviteReq of invites) {
        const { email, name } = inviteReq;
        
        try {
          // Check if client already exists
          const existingClient = await storage.getClientByEmail(email);
          if (existingClient) {
            results.push({ email, success: false, error: "Client already exists" });
            continue;
          }
          
          // Check for existing pending invite
          const existingInvite = await storage.getClientInviteByEmailAndCoach(email, effectiveCoachId);
          if (existingInvite && existingInvite.status === 'pending') {
            results.push({ email, success: false, error: "Already has pending invite" });
            continue;
          }

          // Create token
          const tokenData = insertClientTokenSchema.parse({
            email,
            coachId: effectiveCoachId,
            coachName: coachName || "Your Coach",
            status: "pending",
          });
          const clientToken = await storage.createClientToken(tokenData);

          // Create invite
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          const inviteData = insertClientInviteSchema.parse({
            email,
            name,
            coachId: effectiveCoachId,
            tokenId: clientToken.id,
            questionnaireId,
            message,
            status: "pending",
            expiresAt,
          });
          await storage.createClientInvite(inviteData);

          const inviteLink = `${baseUrl}/client/onboard?token=${clientToken.token}`;

          // Send email (non-blocking)
          sendInviteEmail({
            to: email,
            clientName: name,
            coachName: coachName || "Your Coach",
            inviteLink,
            questionnaireName: questionnaire?.name,
            message,
          }).catch(err => console.error(`[Email] Failed for ${email}:`, err));

          results.push({ email, success: true, inviteLink });
        } catch (err: any) {
          results.push({ email, success: false, error: err.message || "Failed to create invite" });
        }
      }

      // Increment questionnaire usage for successful invites
      const successCount = results.filter(r => r.success).length;
      if (questionnaireId && successCount > 0) {
        for (let i = 0; i < successCount; i++) {
          await storage.incrementQuestionnaireUsage(questionnaireId);
        }
      }

      res.status(201).json({
        total: invites.length,
        successful: successCount,
        failed: invites.length - successCount,
        results,
      });
    } catch (error) {
      console.error("Error creating bulk invites:", error);
      res.status(500).json({ error: "Failed to create bulk invites" });
    }
  });

  // Resend invite email
  app.post("/api/client-invites/:id/resend", async (req, res) => {
    try {
      const { id } = req.params;
      const invite = await storage.getClientInvite(id);
      
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      
      if (invite.status !== 'pending') {
        return res.status(400).json({ error: "Can only resend pending invites" });
      }

      // Get the token
      const allTokens = await storage.getClientTokens();
      const clientToken = allTokens.find(t => t.id === invite.tokenId);
      
      if (!clientToken) {
        return res.status(404).json({ error: "Token not found" });
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
      const inviteLink = `${baseUrl}/client/onboard?token=${clientToken.token}`;

      // Get questionnaire name
      const questionnaires = await storage.getQuestionnaires();
      const questionnaire = questionnaires.find(q => q.id === invite.questionnaireId);

      // Send email
      await sendInviteEmail({
        to: invite.email,
        clientName: invite.name || undefined,
        coachName: clientToken.coachName,
        inviteLink,
        questionnaireName: questionnaire?.name,
        message: invite.message || undefined,
      });

      // Update resend tracking
      await storage.updateClientInvite(id, {
        resendCount: (invite.resendCount || 0) + 1,
        lastResendAt: new Date().toISOString(),
      });

      res.json({ success: true, message: "Invite resent successfully" });
    } catch (error) {
      console.error("Error resending invite:", error);
      res.status(500).json({ error: "Failed to resend invite" });
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

      // For manual client setup (Send Portal Invite), there's no invite record
      // The token is valid as long as the client exists and needs password setup
      if (!invite) {
        // Check if this is a valid "account setup" token (client exists but no password)
        if (client && !client.passwordHash) {
          console.log("[DEBUG] Returning setup-only token data (no invite, client needs password):", { 
            clientId: client.id,
            clientName: client.name
          });
          return res.json({
            token: clientToken,
            client,
            invite: null, // No questionnaire invite for this flow
            isSetupOnly: true, // Flag to indicate this is just password setup
          });
        }
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

      // Update last login and last active
      const now = new Date().toISOString();
      await storage.updateClient(client.id, {
        lastLoginAt: now,
        lastActiveAt: now,
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
      console.log("[GET my-plans] Client ID from session:", clientId);
      const plans = await storage.getClientPlansByClientId(clientId);
      console.log("[GET my-plans] All plans for client:", plans.map(p => ({ id: p.id, clientId: p.clientId, shared: p.shared, status: p.status, planName: p.planName })));
      // Only return shared and active plans for clients
      const activePlans = plans.filter(plan => plan.shared && plan.status === 'active');
      console.log("[GET my-plans] Filtered active plans:", activePlans.map(p => ({ id: p.id, shared: p.shared, status: p.status, planName: p.planName })));
      res.json(activePlans);
    } catch (error) {
      console.error("[GET my-plans] Error:", error);
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

  // Plan Sessions routes (AI Plan Builder chat history)
  
  // Get all plan sessions (for client cards dynamic button labels)
  app.get("/api/plan-sessions", requireCoachAuth, async (req, res) => {
    try {
      const sessions = await storage.getPlanSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching all plan sessions:", error);
      res.status(500).json({ error: "Failed to fetch plan sessions" });
    }
  });

  // Get or create active session for a client
  app.get("/api/plan-sessions/client/:clientId", requireCoachAuth, async (req, res) => {
    try {
      const sessions = await storage.getPlanSessionsByClientId(req.params.clientId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching plan sessions:", error);
      res.status(500).json({ error: "Failed to fetch plan sessions" });
    }
  });

  // Get active session for a client (or return null if none)
  app.get("/api/plan-sessions/client/:clientId/active", requireCoachAuth, async (req, res) => {
    try {
      const session = await storage.getActivePlanSession(req.params.clientId);
      res.json(session || null);
    } catch (error) {
      console.error("Error fetching active plan session:", error);
      res.status(500).json({ error: "Failed to fetch active plan session" });
    }
  });

  // Create new plan session
  app.post("/api/plan-sessions", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertPlanSessionSchema.parse(req.body);
      const session = await storage.createPlanSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating plan session:", error);
      res.status(400).json({ error: "Invalid session data" });
    }
  });

  // Get specific session
  app.get("/api/plan-sessions/:id", requireCoachAuth, async (req, res) => {
    try {
      const session = await storage.getPlanSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Update session (canvas content, status, etc.)
  app.patch("/api/plan-sessions/:id", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertPlanSessionSchema.partial().parse(req.body);
      const session = await storage.updatePlanSession(req.params.id, validatedData);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: "Invalid session data" });
    }
  });

  // Delete session
  app.delete("/api/plan-sessions/:id", requireCoachAuth, async (req, res) => {
    try {
      const success = await storage.deletePlanSession(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  // Plan Messages routes (chat messages within a session)
  
  // Get all messages for a session
  app.get("/api/plan-sessions/:sessionId/messages", requireCoachAuth, async (req, res) => {
    try {
      const messages = await storage.getPlanMessages(req.params.sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching plan messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Add a message to a session
  app.post("/api/plan-sessions/:sessionId/messages", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertPlanMessageSchema.parse({
        ...req.body,
        sessionId: req.params.sessionId,
      });
      const message = await storage.createPlanMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating plan message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Get client's plan status (for dashboard button)
  app.get("/api/clients/:clientId/plan-status", requireCoachAuth, async (req, res) => {
    try {
      const clientId = req.params.clientId;
      const coachId = req.session.coachId!;
      
      // Verify coach ownership
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      if (client.coachId && client.coachId !== coachId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Check for active plan first
      const activePlan = await storage.getActiveClientPlan(clientId);
      if (activePlan) {
        return res.json({
          hasActivePlan: true,
          planId: activePlan.id,
          planName: activePlan.planName,
          status: activePlan.status,
          sessionId: activePlan.sessionId,
        });
      }
      
      // Check for in-progress session
      const activeSession = await storage.getActivePlanSession(clientId);
      if (activeSession) {
        return res.json({
          hasActivePlan: false,
          hasActiveSession: true,
          sessionId: activeSession.id,
          sessionStatus: activeSession.status,
        });
      }
      
      // No plan or session
      res.json({
        hasActivePlan: false,
        hasActiveSession: false,
      });
    } catch (error) {
      console.error("Error fetching plan status:", error);
      res.status(500).json({ error: "Failed to fetch plan status" });
    }
  });

  // AI Plan Builder routes
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  app.get("/api/clients/:id/context", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      if (client.coachId && client.coachId !== coachId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const goals = await storage.getGoalsByClientId(req.params.id);
      const allNutritionLogs = await storage.getNutritionLogs();
      const allWorkoutLogs = await storage.getWorkoutLogs();
      const allCheckIns = await storage.getCheckIns();
      const allResponses = await storage.getResponses();

      const nutritionLogs = allNutritionLogs.filter(n => n.clientId === req.params.id);
      const workoutLogs = allWorkoutLogs.filter(w => w.clientId === req.params.id);
      const checkIns = allCheckIns.filter(c => c.clientId === req.params.id);
      const pinnedResponses = allResponses.filter(r => r.clientId === req.params.id && r.pinnedForAI);

      const context = {
        client: {
          name: client.name,
          email: client.email,
          goal: client.goalType || null,
          goalDescription: client.goalDescription || null,
          current_weight: checkIns.length > 0 ? checkIns[checkIns.length - 1].weight : null,
          notes: client.notes || null,
          // Health metrics
          sex: client.sex || null,
          age: client.age || null,
          weight: client.weight || null,
          height: client.height || null,
          activityLevel: client.activityLevel || null,
          bodyFatPercentage: client.bodyFatPercentage || null,
          // Conditional goal-based fields
          targetWeight: client.targetWeight || null,
          targetBodyFat: client.targetBodyFat || null,
          goalWeight: client.goalWeight || null,
          // Wellness plan fields
          occupation: client.occupation || null,
          medicalNotes: client.medicalNotes || null,
          trainingExperience: client.trainingExperience || null,
          equipmentAccess: client.equipmentAccess || null,
          timeframe: client.timeframe || null,
          currentHabits: client.currentHabits || null,
          preferences: client.preferences || null,
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
        questionnaire_data: pinnedResponses.map(r => ({
          questionnaire_name: r.questionnaireName,
          submitted_at: r.submittedAt,
          data: r.answers,
        })),
      };

      res.json(context);
    } catch (error) {
      console.error("Error getting client context:", error);
      res.status(500).json({ error: "Failed to get client context" });
    }
  });

  // Enhanced AI Insights endpoint - analyzes ProgressEvents and predicts goal completion
  app.get("/api/clients/:id/insights", requireCoachAuth, async (req, res) => {
    try {
      const clientId = req.params.id;
      const coachId = req.session.coachId!;
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      if (client.coachId && client.coachId !== coachId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get progress events from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const progressEvents = await storage.getProgressEventsByClientId(clientId, { startDate });
      const goals = await storage.getGoalsByClientId(clientId);

      // Run the enhanced analysis
      const insights = await analyzeProgressEventsWithGoals(
        clientId,
        client.name,
        progressEvents,
        goals
      );

      res.json(insights);
    } catch (error) {
      console.error("Error generating client insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Client-facing insights endpoint (for client portal)
  app.get("/api/client/insights", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId;
      if (!clientId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get progress events from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];

      const progressEvents = await storage.getProgressEventsByClientId(clientId, { startDate });
      const goals = await storage.getGoalsByClientId(clientId);

      // Run the enhanced analysis
      const insights = await analyzeProgressEventsWithGoals(
        clientId,
        client.name,
        progressEvents,
        goals
      );

      res.json(insights);
    } catch (error) {
      console.error("Error generating client insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Progress Calculation Endpoints
  
  // Get progress breakdown for a specific client
  app.get("/api/clients/:id/progress", requireCoachAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Calculate and return the breakdown
      const breakdown = await calculateClientProgress(id);
      
      res.json({
        clientId: id,
        clientName: client.name,
        compositeScore: breakdown.compositeScore,
        breakdown: {
          goalProgress: breakdown.goalProgress,
          weeklyProgress: breakdown.weeklyProgress,
          activityProgress: breakdown.activityProgress,
        },
        weights: {
          longTermGoals: 0.5,
          weeklyTasks: 0.3,
          activity: 0.2,
        }
      });
    } catch (error) {
      console.error("Error calculating client progress:", error);
      res.status(500).json({ error: "Failed to calculate progress" });
    }
  });

  // Recalculate and update progress for a specific client
  app.post("/api/clients/:id/progress/recalculate", requireCoachAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const breakdown = await updateClientProgress(id);
      
      res.json({
        success: true,
        clientId: id,
        progressScore: breakdown.compositeScore,
        breakdown: {
          goalProgress: breakdown.goalProgress,
          weeklyProgress: breakdown.weeklyProgress,
          activityProgress: breakdown.activityProgress,
        }
      });
    } catch (error) {
      console.error("Error recalculating client progress:", error);
      res.status(500).json({ error: "Failed to recalculate progress" });
    }
  });

  // Recalculate progress for all clients (coach's clients)
  app.post("/api/progress/recalculate-all", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId;
      await updateAllClientsProgress(coachId);
      
      res.json({ success: true, message: "Progress recalculated for all clients" });
    } catch (error) {
      console.error("Error recalculating all client progress:", error);
      res.status(500).json({ error: "Failed to recalculate progress" });
    }
  });

  // AI Program Builder - processes natural language requests for weekly programs
  app.post("/api/program-builder/process", requireCoachAuth, async (req, res) => {
    try {
      const requestSchema = z.object({
        message: z.string(),
        clientName: z.string(),
        existingTrainingDays: z.array(z.object({
          day: z.string(),
          title: z.string(),
          exercises: z.array(z.object({
            name: z.string(),
            sets: z.number(),
            reps: z.number(),
          })),
        })).optional(),
      });

      const parsed = requestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request", details: parsed.error });
      }

      const { message, clientName, existingTrainingDays } = parsed.data;
      const result = await processProgramBuilderRequest(message, clientName, existingTrainingDays);
      
      res.json(result);
    } catch (error) {
      console.error("Error processing program builder request:", error);
      res.status(500).json({ error: "Failed to process request" });
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
            sex: z.string().nullable().optional(),
            age: z.number().nullable().optional(),
            weight: z.number().nullable().optional(),
            height: z.number().nullable().optional(),
            activityLevel: z.string().nullable().optional(),
            bodyFatPercentage: z.number().nullable().optional(),
            occupation: z.string().nullable().optional(),
            medicalNotes: z.string().nullable().optional(),
            trainingExperience: z.string().nullable().optional(),
            equipmentAccess: z.string().nullable().optional(),
            timeframe: z.string().nullable().optional(),
            currentHabits: z.any().nullable().optional(),
            preferences: z.any().nullable().optional(),
          }),
          goals: z.array(z.any()).optional(),
          recent_nutrition: z.array(z.any()).optional(),
          recent_workouts: z.array(z.any()).optional(),
          questionnaire_data: z.array(z.any()).optional(),
        }),
      });

      const validatedData = chatRequestSchema.parse(req.body);
      const { messages, clientContext } = validatedData;

      // Format client data according to the wellness coach prompt structure
      const client = clientContext.client;
      const formattedProfile = {
        Name: client.name || "Not provided",
        Age: client.age || "Not provided",
        Sex: client.sex || "Not provided",
        Height: client.height || "Not provided",
        Weight: client.weight || "Not provided",
        BodyFatPercent: client.bodyFatPercentage || "Not provided",
        ActivityLevel: client.activityLevel || "Not provided",
        Occupation: client.occupation || "Not provided",
        MainGoal: client.goal || client.goalDescription || "Not provided",
        SecondaryGoals: clientContext.goals?.map((g: any) => g.type) || [],
        Timeframe: client.timeframe || "Not specified",
        MedicalNotes: client.medicalNotes || "None provided",
        TrainingExperience: client.trainingExperience || "Not provided",
        AccessToEquipment: client.equipmentAccess || "Not provided",
        CurrentHabits: {
          ExercisePerWeek: client.currentHabits?.exercisePerWeek || "Not provided",
          AverageStepsPerDay: client.currentHabits?.averageStepsPerDay || "Not provided",
          SleepHoursPerNight: client.currentHabits?.sleepHoursPerNight || "Not provided",
          StressLevel: client.currentHabits?.stressLevel || "Not provided",
          Hydration: client.currentHabits?.hydration || "Not provided",
          EatingPattern: client.currentHabits?.eatingPattern || "Not provided",
        },
        Preferences: {
          Likes: client.preferences?.likes || "Not provided",
          Dislikes: client.preferences?.dislikes || "Not provided",
          ScheduleConstraints: client.preferences?.scheduleConstraints || "Not provided",
        },
        CoachNotes: client.notes || "None provided",
      };

      // Add questionnaire data if available
      const questionnaireContext = clientContext.questionnaire_data && clientContext.questionnaire_data.length > 0
        ? `\n\nQuestionnaire Responses:\n${clientContext.questionnaire_data.map((q: any) => 
            `- ${q.questionnaire_name} (submitted ${q.submitted_at})`
          ).join('\n')}`
        : '';

      const systemPrompt = `You are an expert wellness coach. 
Your job is to create clear, realistic, habit based wellness plans for clients, not just workout or diet plans.

You will receive a structured input with the client profile and coach notes. 
Use it to build a personalized wellness plan that a real human could follow.

=====================
INPUT FORMAT
=====================
You will get data in this structure:

ClientProfile:
- Name:
- Age:
- Sex:
- Height:
- Weight:
- BodyFatPercent (if provided):
- ActivityLevel (sedentary, lightly_active, moderately_active, very_active, extra_active):
- Occupation and daily routine:
- MainGoal:
- SecondaryGoals:
- Timeframe:
- MedicalNotes:
- TrainingExperience:
- AccessToEquipment:
- CurrentHabits:
    - ExercisePerWeek:
    - AverageStepsPerDay:
    - SleepHoursPerNight:
    - StressLevel (1-10):
    - Hydration:
    - EatingPattern:
- Preferences:
    - Likes:
    - Dislikes:
    - ScheduleConstraints:
- CoachNotes:

=====================
YOUR TASK
=====================
Using the input, create a personalized 8 to 12 week style wellness plan that covers the whole lifestyle, not only workouts or strict diet rules.

The plan must include these sections:

1. Short summary
   - 2 to 4 sentences that describe the client situation and the main focus of the plan.

2. Key goals
   - Bullet list of 2 to 5 clear goals.
   - Use the client wording when possible and make them measurable where appropriate.

3. Weekly structure overview
   - A simple table or bullet list that shows the week at a glance.
   - Include: number of movement sessions, approximate step goal range, number of strength or mobility sessions, number of stress or mindset practices, sleep target.

4. Movement and activity habits
   - Daily or weekly step goal.
   - Number and type of movement sessions per week (walking, strength, mobility, yoga, cardio, etc) tailored to experience, equipment and medical notes.
   - For each type of session, give:
     - frequency per week
     - target duration
     - intensity guidance (easy, moderate, hard, RPE 1 to 10, etc)
   - Respect all limitations from MedicalNotes. Avoid anything that would be unsafe.

5. Nutrition habits
   - Focus on habits, not a strict meal plan, unless the coach notes explicitly say otherwise.
   - Give 4 to 8 simple rules, for example:
     - protein habit per meal,
     - vegetables/fruit servings per day,
     - hydration target,
     - sample day structure (breakfast, lunch, dinner, snacks),
     - 1 or 2 examples of balanced meals that fit the client life.
   - If the client goal is weight related, gently align portions or habits with that goal without extreme restrictions.

6. Sleep and recovery
   - Sleep duration target.
   - 3 to 5 practical steps for better sleep and recovery that match the schedule and preferences.
   - Mention at least one recovery strategy (rest day, light movement day, stretching, relaxation).

7. Stress management and mindset
   - 3 to 6 simple practices such as breathing work, short meditation, walks without phone, journaling, boundary setting, etc.
   - Connect at least one habit directly to the client stress pattern or work context.

8. Environment and routines
   - 3 to 5 concrete suggestions to adjust the home, work or social environment to support the plan
     for example: prep water bottle on desk, keep walking shoes by the door, create a snack plan, grocery list idea.

9. Weekly checkpoints and metrics
   - Propose 3 to 5 simple metrics to track weekly, for example:
     - average steps,
     - workouts completed,
     - hours of sleep,
     - self reported energy (1 to 10),
     - adherence to key nutrition habits.
   - Suggest a short weekly reflection question or two.

=====================
STYLE AND CONSTRAINTS
=====================
- Be realistic for the client level, schedule, and limitations.
- Prioritize consistency and habit building over intensity.
- Avoid medical claims or diagnosis. If something sounds risky, say that the client should confirm with a healthcare professional.
- Keep language clear and encouraging, not fluffy.
- Use bullet points, short paragraphs, and headings so a coach can copy this directly into a client plan.
- Never invent extreme or unsustainable advice such as starvation diets or very long daily workouts.

Now read the ClientProfile input and generate the personalized wellness plan following the structure above.

=====================
CLIENT PROFILE
=====================
${JSON.stringify(formattedProfile, null, 2)}${questionnaireContext}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 3500,
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
        console.error("PDF Generation: Plan not found", req.params.id);
        return res.status(404).json({ error: "Plan not found" });
      }

      const client = await storage.getClient(plan.clientId);
      if (!client) {
        console.error("PDF Generation: Client not found", plan.clientId);
        return res.status(404).json({ error: "Client not found" });
      }

      // Validate planContent exists
      if (!plan.planContent) {
        console.error("PDF Generation: Invalid planContent", plan.planContent);
        return res.status(400).json({ error: "Plan has no content" });
      }

      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));

      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
      });

      doc.fontSize(28).fillColor('#28A0AE').text('Wellio', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(20).fillColor('#000000').text(plan.planName || 'Wellness Plan', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#666666').text(`Client: ${client.name}`, { align: 'center' });
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(0.3);
      
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#E2F9AD');
      doc.moveDown(1.5);

      // Handle multiple formats: string, { content: string }, or { sections: [] }
      let contentText = '';
      if (typeof plan.planContent === 'string') {
        // Direct string format
        contentText = plan.planContent;
      } else if (typeof plan.planContent === 'object') {
        // Check for { content: string } format (current format)
        if ((plan.planContent as any).content && typeof (plan.planContent as any).content === 'string') {
          contentText = (plan.planContent as any).content;
        } else {
          // Old format: sections array
          const sections = (plan.planContent as any).sections || [];
          if (sections.length === 0) {
            contentText = 'No content available.';
          } else {
            // Convert sections to plain text for backward compatibility
            contentText = sections.map((section: any) => {
              let text = '';
              if (section.heading) {
                text += `${section.heading}\n\n`;
              }
              if (section.content) {
                text += `${section.content}\n\n`;
              }
              return text;
            }).join('\n');
          }
        }
      }
      
      // Helper function to parse inline markdown (bold and italic)
      interface TextSegment {
        text: string;
        bold: boolean;
        italic: boolean;
      }

      const parseInlineMarkdown = (text: string): TextSegment[] => {
        const segments: TextSegment[] = [];
        let currentPos = 0;
        
        // Regex to match **bold** or *italic* (non-greedy)
        const markdownRegex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
        let match;
        
        while ((match = markdownRegex.exec(text)) !== null) {
          // Add text before the match as regular text
          if (match.index > currentPos) {
            segments.push({
              text: text.substring(currentPos, match.index),
              bold: false,
              italic: false,
            });
          }
          
          // Add the formatted text
          if (match[1]) {
            // Bold text (**text**)
            segments.push({
              text: match[2],
              bold: true,
              italic: false,
            });
          } else if (match[3]) {
            // Italic text (*text*)
            segments.push({
              text: match[4],
              bold: false,
              italic: true,
            });
          }
          
          currentPos = match.index + match[0].length;
        }
        
        // Add remaining text
        if (currentPos < text.length) {
          segments.push({
            text: text.substring(currentPos),
            bold: false,
            italic: false,
          });
        }
        
        // If no markdown found, return the whole text as one segment
        if (segments.length === 0) {
          segments.push({ text, bold: false, italic: false });
        }
        
        return segments;
      };

      // Helper function to render text with inline formatting
      const renderTextWithFormatting = (
        doc: PDFKit.PDFDocument,
        text: string,
        fontSize: number,
        color: string,
        options: PDFKit.Mixins.TextOptions = {}
      ) => {
        const segments = parseInlineMarkdown(text);
        
        doc.fontSize(fontSize).fillColor(color);
        
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          
          // Set font based on formatting
          if (segment.bold && segment.italic) {
            doc.font('Helvetica-BoldOblique');
          } else if (segment.bold) {
            doc.font('Helvetica-Bold');
          } else if (segment.italic) {
            doc.font('Helvetica-Oblique');
          } else {
            doc.font('Helvetica');
          }
          
          // Render the segment
          // Continue on same line except for first segment
          doc.text(segment.text, {
            ...options,
            continued: i < segments.length - 1,
          });
        }
        
        // Reset to default font
        doc.font('Helvetica');
      };

      if (!contentText.trim()) {
        doc.fontSize(12).fillColor('#666666').text('No content available.', { align: 'center' });
      } else {
        // Render content with beautiful formatting
        const lines = contentText.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();
          
          if (!trimmedLine) {
            // Empty line - add spacing
            doc.moveDown(0.6);
            continue;
          }
          
          // Detect markdown-style headings
          const h1Match = trimmedLine.match(/^#\s+(.+)$/);
          const h2Match = trimmedLine.match(/^##\s+(.+)$/);
          const h3Match = trimmedLine.match(/^###\s+(.+)$/);
          
          // Detect bullet points or numbered lists
          const bulletMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
          const numberedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
          
          // Detect lines ending with : as section headers
          const colonHeader = trimmedLine.endsWith(':') && trimmedLine.length < 80;
          
          // Detect all-caps as headers (but not too long)
          const capsHeader = trimmedLine === trimmedLine.toUpperCase() && 
                             trimmedLine.length > 2 && 
                             trimmedLine.length < 60 &&
                             !trimmedLine.match(/^[A-Z\s]+$/);
          
          if (h1Match) {
            // Main heading
            doc.moveDown(0.5);
            renderTextWithFormatting(doc, h1Match[1], 16, '#28A0AE', { align: 'left' });
            doc.moveDown(0.4);
          } else if (h2Match) {
            // Subheading
            doc.moveDown(0.4);
            renderTextWithFormatting(doc, h2Match[1], 14, '#28A0AE', { align: 'left' });
            doc.moveDown(0.3);
          } else if (h3Match) {
            // Sub-subheading
            doc.moveDown(0.3);
            renderTextWithFormatting(doc, h3Match[1], 12, '#28A0AE', { align: 'left' });
            doc.moveDown(0.2);
          } else if (colonHeader) {
            // Section header (ends with :)
            doc.moveDown(0.3);
            renderTextWithFormatting(doc, trimmedLine, 13, '#28A0AE', { align: 'left' });
            doc.moveDown(0.2);
          } else if (capsHeader) {
            // ALL CAPS header
            doc.moveDown(0.3);
            renderTextWithFormatting(doc, trimmedLine, 12, '#28A0AE', { align: 'left' });
            doc.moveDown(0.2);
          } else if (bulletMatch) {
            // Bullet point
            renderTextWithFormatting(doc, `• ${bulletMatch[1]}`, 11, '#000000', {
              align: 'left',
              indent: 20,
              lineGap: 3,
            });
          } else if (numberedMatch) {
            // Numbered list
            renderTextWithFormatting(doc, trimmedLine, 11, '#000000', {
              align: 'left',
              indent: 20,
              lineGap: 3,
            });
          } else {
            // Regular paragraph text
            renderTextWithFormatting(doc, trimmedLine, 11, '#333333', {
              align: 'left',
              lineGap: 4,
            });
          }
        }
      }

      doc.end();

      const pdfBuffer = await pdfPromise;
      console.log("PDF buffer generated successfully, size:", pdfBuffer.length);

      const objectStorageService = new ObjectStorageService();
      let privateDir: string;
      try {
        privateDir = objectStorageService.getPrivateObjectDir();
      } catch (error) {
        console.error("PDF Generation: Object storage not configured", error);
        return res.status(500).json({ error: "Object storage not configured. Please set up PRIVATE_OBJECT_DIR." });
      }
      const fileName = `${privateDir}/plans/${plan.id}.pdf`;
      
      try {
        const { bucketName, objectName } = parseObjectPath(fileName);
        const bucket = objectStorageClient.bucket(bucketName);
        const file = bucket.file(objectName);
        
        await file.save(pdfBuffer, {
          contentType: 'application/pdf',
          resumable: false,
        });
        console.log("PDF saved to object storage successfully:", fileName);
      } catch (error) {
        console.error("PDF Generation: Failed to save to object storage", error);
        throw new Error("Failed to save PDF to storage");
      }

      const objectPath = `/objects/plans/${plan.id}.pdf`;
      try {
        await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
          owner: plan.coachId,
          visibility: 'private',
          aclRules: [
            {
              group: {
                type: ObjectAccessGroupType.CLIENT_ID,
                id: plan.clientId,
              },
              permission: ObjectPermission.READ,
            },
          ],
        });
        console.log("ACL policy set successfully");
      } catch (error) {
        console.error("PDF Generation: Failed to set ACL policy", error);
        return res.status(500).json({ error: "Failed to set PDF access permissions", details: error instanceof Error ? error.message : 'Unknown error' });
      }

      await storage.updateClientPlan(plan.id, { pdfUrl: objectPath });

      res.json({ pdfUrl: objectPath });
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Assign plan to client (generates PDF, archives old plan, sends notification)
  app.post("/api/client-plans/:id/assign", requireCoachAuth, async (req, res) => {
    try {
      const { message } = req.body;
      const plan = await storage.getClientPlan(req.params.id);
      
      if (!plan) {
        console.error("Plan Assignment: Plan not found", req.params.id);
        return res.status(404).json({ error: "Plan not found" });
      }

      const client = await storage.getClient(plan.clientId);
      if (!client) {
        console.error("Plan Assignment: Client not found", plan.clientId);
        return res.status(404).json({ error: "Client not found" });
      }

      // Validate planContent exists
      if (!plan.planContent) {
        console.error("Plan Assignment: Invalid planContent", plan.planContent);
        return res.status(400).json({ error: "Plan has no content" });
      }

      // Archive any existing active plan for this client
      await storage.archiveActivePlan(plan.clientId);
      console.log("Plan Assignment: Archived old active plan for client", plan.clientId);

      // Generate PDF (reuse logic from generate-pdf endpoint)
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
      });

      doc.fontSize(28).fillColor('#28A0AE').text('Wellio', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(20).fillColor('#000000').text(plan.planName || 'Wellness Plan', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#666666').text(`Client: ${client.name}`, { align: 'center' });
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#E2F9AD');
      doc.moveDown(1.5);

      // Extract content text from plan
      let contentText = '';
      if (typeof plan.planContent === 'string') {
        contentText = plan.planContent;
      } else if (typeof plan.planContent === 'object') {
        if ((plan.planContent as any).content && typeof (plan.planContent as any).content === 'string') {
          contentText = (plan.planContent as any).content;
        }
      }

      // Helper function to parse inline markdown (bold and italic)
      interface TextSegment {
        text: string;
        bold: boolean;
        italic: boolean;
      }

      const parseInlineMarkdown = (text: string): TextSegment[] => {
        const segments: TextSegment[] = [];
        let currentPos = 0;
        
        // Regex to match **bold** or *italic* (non-greedy)
        const markdownRegex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
        let match;
        
        while ((match = markdownRegex.exec(text)) !== null) {
          // Add text before the match as regular text
          if (match.index > currentPos) {
            segments.push({
              text: text.substring(currentPos, match.index),
              bold: false,
              italic: false,
            });
          }
          
          // Add the formatted text
          if (match[1]) {
            // Bold text (**text**)
            segments.push({
              text: match[2],
              bold: true,
              italic: false,
            });
          } else if (match[3]) {
            // Italic text (*text*)
            segments.push({
              text: match[4],
              bold: false,
              italic: true,
            });
          }
          
          currentPos = match.index + match[0].length;
        }
        
        // Add remaining text
        if (currentPos < text.length) {
          segments.push({
            text: text.substring(currentPos),
            bold: false,
            italic: false,
          });
        }
        
        // If no markdown found, return the whole text as one segment
        if (segments.length === 0) {
          segments.push({ text, bold: false, italic: false });
        }
        
        return segments;
      };

      // Helper function to render text with inline formatting
      const renderTextWithFormatting = (
        doc: PDFKit.PDFDocument,
        text: string,
        fontSize: number,
        color: string,
        options: PDFKit.Mixins.TextOptions = {}
      ) => {
        const segments = parseInlineMarkdown(text);
        
        doc.fontSize(fontSize).fillColor(color);
        
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          
          // Set font based on formatting
          if (segment.bold && segment.italic) {
            doc.font('Helvetica-BoldOblique');
          } else if (segment.bold) {
            doc.font('Helvetica-Bold');
          } else if (segment.italic) {
            doc.font('Helvetica-Oblique');
          } else {
            doc.font('Helvetica');
          }
          
          // Render the segment
          // Continue on same line except for first segment
          doc.text(segment.text, {
            ...options,
            continued: i < segments.length - 1,
          });
        }
        
        // Reset to default font
        doc.font('Helvetica');
      };

      // Render content with beautiful formatting
      if (!contentText.trim()) {
        doc.fontSize(12).fillColor('#666666').text('No content available.', { align: 'center' });
      } else {
        const lines = contentText.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();
          
          if (!trimmedLine) {
            // Empty line - add spacing
            doc.moveDown(0.6);
            continue;
          }
          
          // Detect markdown-style headings
          const h1Match = trimmedLine.match(/^#\s+(.+)$/);
          const h2Match = trimmedLine.match(/^##\s+(.+)$/);
          const h3Match = trimmedLine.match(/^###\s+(.+)$/);
          
          // Detect bullet points or numbered lists
          const bulletMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
          const numberedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
          
          // Detect lines ending with : as section headers
          const colonHeader = trimmedLine.endsWith(':') && trimmedLine.length < 80;
          
          // Detect all-caps as headers (but not too long)
          const capsHeader = trimmedLine === trimmedLine.toUpperCase() && 
                             trimmedLine.length > 2 && 
                             trimmedLine.length < 60 &&
                             !trimmedLine.match(/^[A-Z\s]+$/);
          
          if (h1Match) {
            // Main heading
            doc.moveDown(0.5);
            renderTextWithFormatting(doc, h1Match[1], 16, '#28A0AE', { align: 'left' });
            doc.moveDown(0.4);
          } else if (h2Match) {
            // Subheading
            doc.moveDown(0.4);
            renderTextWithFormatting(doc, h2Match[1], 14, '#28A0AE', { align: 'left' });
            doc.moveDown(0.3);
          } else if (h3Match) {
            // Sub-subheading
            doc.moveDown(0.3);
            renderTextWithFormatting(doc, h3Match[1], 12, '#28A0AE', { align: 'left' });
            doc.moveDown(0.2);
          } else if (colonHeader) {
            // Section header (ends with :)
            doc.moveDown(0.3);
            renderTextWithFormatting(doc, trimmedLine, 13, '#28A0AE', { align: 'left' });
            doc.moveDown(0.2);
          } else if (capsHeader) {
            // ALL CAPS header
            doc.moveDown(0.3);
            renderTextWithFormatting(doc, trimmedLine, 12, '#28A0AE', { align: 'left' });
            doc.moveDown(0.2);
          } else if (bulletMatch) {
            // Bullet point
            renderTextWithFormatting(doc, `• ${bulletMatch[1]}`, 11, '#000000', {
              align: 'left',
              indent: 20,
              lineGap: 3,
            });
          } else if (numberedMatch) {
            // Numbered list
            renderTextWithFormatting(doc, trimmedLine, 11, '#000000', {
              align: 'left',
              indent: 20,
              lineGap: 3,
            });
          } else {
            // Regular paragraph text
            renderTextWithFormatting(doc, trimmedLine, 11, '#333333', {
              align: 'left',
              lineGap: 4,
            });
          }
        }
      }

      doc.end();
      const pdfBuffer = await pdfPromise;

      // Save PDF to object storage
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      const fileName = `${privateDir}/plans/${plan.id}.pdf`;
      
      const { bucketName, objectName } = parseObjectPath(fileName);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      await file.save(pdfBuffer, { contentType: 'application/pdf', resumable: false });

      // Set ACL for client access
      const objectPath = `/objects/plans/${plan.id}.pdf`;
      await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
        owner: plan.coachId,
        visibility: 'private',
        aclRules: [{
          group: { type: ObjectAccessGroupType.CLIENT_ID, id: plan.clientId },
          permission: ObjectPermission.READ,
        }],
      });

      // Update plan: mark as shared, active, and add PDF URL
      console.log("[Plan Assignment] BEFORE update - Plan:", { id: plan.id, clientId: plan.clientId, shared: plan.shared, status: plan.status });
      const updatedPlan = await storage.updateClientPlan(plan.id, {
        pdfUrl: objectPath,
        shared: true,
        status: 'active',
      });
      console.log("[Plan Assignment] AFTER update - Plan:", { id: updatedPlan?.id, clientId: updatedPlan?.clientId, shared: updatedPlan?.shared, status: updatedPlan?.status, pdfUrl: updatedPlan?.pdfUrl });

      // Send email notification to client
      try {
        const planLink = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/client/plan`;
        await sendPlanAssignmentEmail({
          to: client.email,
          clientName: client.name,
          coachName: "Coach",
          planName: plan.planName,
          planLink,
          message,
        });
        console.log("[Email] Successfully sent plan assignment email to:", client.email);
      } catch (emailError) {
        console.error("[Email] Failed to send plan assignment email:", emailError);
        // Don't fail the assignment if email fails
      }

      // Send push notification to client (non-blocking)
      sendPushNotificationToClient(
        client.id,
        'New Plan Assigned!',
        `${plan.planName || 'A new plan'} has been assigned to you`,
        { 
          tag: 'plan-assigned', 
          url: '/client/plan',
          type: 'plan_assigned',
          metadata: { planId: plan.id, planName: plan.planName, planType: 'main' }
        }
      ).then(result => {
        if (!result.success) {
          logger.debug('Push notification not sent for plan assignment', { 
            clientId: client.id, 
            planId: plan.id,
            reason: result.error 
          });
        }
      }).catch(err => {
        logger.error('Unexpected error sending push notification for plan assignment', { clientId: client.id, planId: plan.id }, err);
      });

      res.json({ 
        success: true, 
        pdfUrl: objectPath,
        message: "Plan assigned successfully"
      });
    } catch (error) {
      console.error("Error assigning plan:", error);
      res.status(500).json({ error: "Failed to assign plan", details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Manual plan assignment (create plan with optional PDF)
  app.post("/api/client-plans/assign-manual", requireCoachAuth, async (req, res) => {
    try {
      const { clientId, planName, planContent, pdfUrl, message } = req.body;

      if (!clientId || !planName || !planContent) {
        return res.status(400).json({ error: "Missing required fields: clientId, planName, planContent" });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        console.error("Manual Assignment: Client not found", clientId);
        return res.status(404).json({ error: "Client not found" });
      }

      const coachId = req.session.coachId!;

      // Archive any existing active plan for this client
      await storage.archiveActivePlan(clientId);
      console.log("Manual Assignment: Archived old active plan for client", clientId);

      // Create new plan record with text content
      const newPlan = await storage.createClientPlan({
        clientId,
        coachId,
        planName,
        planContent: { content: planContent }, // Store as { content: string } format
        pdfUrl: pdfUrl || null,
        shared: true,
        status: 'active',
      });

      // If PDF was provided, set ACL for client access
      if (pdfUrl) {
        try {
          const objectStorageService = new ObjectStorageService();
          await objectStorageService.trySetObjectEntityAclPolicy(pdfUrl, {
            owner: coachId,
            visibility: 'private',
            aclRules: [{
              group: { type: ObjectAccessGroupType.CLIENT_ID, id: clientId },
              permission: ObjectPermission.READ,
            }],
          });
          console.log("Manual Assignment: ACL policy set for PDF");
        } catch (aclError) {
          console.error("Manual Assignment: Failed to set ACL policy for PDF", aclError);
          // Continue anyway - plan is created, just PDF access might not work
        }
      }

      // Send email notification to client
      try {
        const planLink = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/client/plan`;
        await sendPlanAssignmentEmail({
          to: client.email,
          clientName: client.name,
          coachName: "Coach",
          planName,
          planLink,
          message,
        });
        console.log("[Email] Successfully sent plan assignment email to:", client.email);
      } catch (emailError) {
        console.error("[Email] Failed to send plan assignment email:", emailError);
        // Don't fail the assignment if email fails
      }

      // Send push notification to client (non-blocking)
      sendPushNotificationToClient(
        client.id,
        'New Plan Assigned!',
        `${planName || 'A new plan'} has been assigned to you`,
        { 
          tag: 'plan-assigned', 
          url: '/client/plan',
          type: 'plan_assigned',
          metadata: { planId: newPlan.id, planName, planType: 'main' }
        }
      ).then(result => {
        if (!result.success) {
          logger.debug('Push notification not sent for manual plan assignment', { 
            clientId: client.id, 
            planName,
            reason: result.error 
          });
        }
      }).catch(err => {
        logger.error('Unexpected error sending push notification for manual plan assignment', { clientId: client.id, planName }, err);
      });

      res.json({ 
        success: true,
        plan: newPlan,
        message: "Plan assigned successfully"
      });
    } catch (error) {
      console.error("Error in manual assignment:", error);
      res.status(500).json({ error: "Failed to assign plan manually", details: error instanceof Error ? error.message : 'Unknown error' });
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
      
      // Recalculate progress after goal is created
      updateClientProgress(validatedData.clientId).catch((err: unknown) => {
        console.error("Error updating client progress after goal creation:", err);
      });
      
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
      
      // Recalculate progress after goal is updated
      updateClientProgress(goal.clientId).catch((err: unknown) => {
        console.error("Error updating client progress after goal update:", err);
      });
      
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

  // ============================================================
  // Client Data Logs (unified progress tracking)
  // ============================================================

  // Get all logs for a client (coach can view any client, client can only view their own)
  app.get("/api/client-data-logs/:clientId", async (req, res) => {
    try {
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      const clientId = req.params.clientId;
      
      // Must be authenticated as coach or client
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      // Authorization check: clients can only view their own logs
      if (sessionClientId && sessionClientId !== clientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const { startDate, endDate, type } = req.query;
      const logs = await storage.getClientDataLogsByClientId(clientId, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        type: type as string | undefined,
      });
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching client data logs:", error);
      res.status(500).json({ error: "Failed to fetch client data logs" });
    }
  });

  // Create a new data log (coach creates with source='coach', client creates with source='client')
  app.post("/api/client-data-logs", async (req, res) => {
    try {
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      // Must be authenticated as coach or client
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }

      // Determine source and creator based on session
      const isCoach = !!coachId;
      const source = isCoach ? 'coach' : 'client';
      const creatorId = isCoach ? coachId : sessionClientId;
      
      // If client is creating, they can only create for themselves
      const clientId = req.body.clientId;
      if (!isCoach && sessionClientId !== clientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const validatedData = insertClientDataLogSchema.parse({
        ...req.body,
        source,
        createdByUserId: creatorId,
      });
      
      const log = await storage.createClientDataLog(validatedData);
      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating client data log:", error);
      res.status(400).json({ error: "Invalid data log" });
    }
  });

  // Update a data log
  app.patch("/api/client-data-logs/:id", async (req, res) => {
    try {
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      // Must be authenticated as coach or client
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      const userId = coachId || sessionClientId;

      const logId = req.params.id;
      const existingLog = await storage.getClientDataLog(logId);
      
      if (!existingLog) {
        return res.status(404).json({ error: "Log not found" });
      }

      // Authorization: users can only update logs they created
      if (existingLog.createdByUserId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const validatedData = insertClientDataLogSchema.partial().parse(req.body);
      const log = await storage.updateClientDataLog(logId, validatedData);
      
      res.json(log);
    } catch (error) {
      console.error("Error updating client data log:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Delete a data log
  app.delete("/api/client-data-logs/:id", async (req, res) => {
    try {
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      // Must be authenticated as coach or client
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      const userId = coachId || sessionClientId;

      const logId = req.params.id;
      const existingLog = await storage.getClientDataLog(logId);
      
      if (!existingLog) {
        return res.status(404).json({ error: "Log not found" });
      }

      // Authorization: users can only delete logs they created
      if (existingLog.createdByUserId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const success = await storage.deleteClientDataLog(logId);
      if (!success) {
        return res.status(404).json({ error: "Log not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client data log:", error);
      res.status(500).json({ error: "Failed to delete log" });
    }
  });

  // ============================================
  // Smart Log System API Routes
  // ============================================

  // Get smart logs for a client (client or coach)
  app.get("/api/smart-logs/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { startDate, endDate, limit } = req.query;
      
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      // Must be authenticated
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      // Clients can only access their own logs
      if (sessionClientId && sessionClientId !== clientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const logs = await storage.getSmartLogsByClientId(clientId, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching smart logs:", error);
      res.status(500).json({ error: "Failed to fetch smart logs" });
    }
  });

  // Create a smart log (client or coach)
  app.post("/api/smart-logs", async (req, res) => {
    try {
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }

      const validatedData = insertSmartLogSchema.parse({
        ...req.body,
        authorType: sessionClientId ? "client" : "coach"
      });

      // Verify client can only log for themselves
      if (sessionClientId && validatedData.clientId !== sessionClientId) {
        return res.status(403).json({ error: "Unauthorized - Can only log for yourself" });
      }

      const smartLog = await storage.createSmartLog(validatedData);
      
      // Update client's last active time when client logs activity
      if (sessionClientId) {
        await storage.updateClient(sessionClientId, { lastActiveAt: new Date().toISOString() });
      }
      
      // Process asynchronously if there's text or images
      const hasContent = smartLog.rawText || (smartLog.mediaUrls && (smartLog.mediaUrls as string[]).length > 0);
      if (hasContent) {
        processSmartLog(smartLog.id)
          .then(() => {
            // Recalculate progress after processing completes
            updateClientProgress(validatedData.clientId).catch((err: unknown) => {
              console.error("Error updating client progress:", err);
            });
          })
          .catch((err: unknown) => {
            console.error("Error processing smart log:", err);
          });
      }
      
      res.status(201).json(smartLog);
    } catch (error) {
      console.error("Error creating smart log:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Get a single smart log
  app.get("/api/smart-logs/log/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }

      const log = await storage.getSmartLog(id);
      if (!log) {
        return res.status(404).json({ error: "Smart log not found" });
      }

      // Clients can only access their own logs
      if (sessionClientId && log.clientId !== sessionClientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      res.json(log);
    } catch (error) {
      console.error("Error fetching smart log:", error);
      res.status(500).json({ error: "Failed to fetch smart log" });
    }
  });

  // Reprocess a smart log
  app.post("/api/smart-logs/:id/reprocess", requireCoachAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const log = await storage.getSmartLog(id);
      if (!log) {
        return res.status(404).json({ error: "Smart log not found" });
      }

      const result = await processSmartLog(id);
      res.json(result);
    } catch (error) {
      console.error("Error reprocessing smart log:", error);
      res.status(500).json({ error: "Failed to reprocess smart log" });
    }
  });

  // Delete a smart log
  app.delete("/api/smart-logs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }

      const log = await storage.getSmartLog(id);
      if (!log) {
        return res.status(404).json({ error: "Smart log not found" });
      }

      // Clients can only delete their own logs
      if (sessionClientId && log.clientId !== sessionClientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await storage.deleteSmartLog(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting smart log:", error);
      res.status(500).json({ error: "Failed to delete smart log" });
    }
  });

  // ============================================
  // Progress Events API Routes
  // ============================================

  // Get progress events for a client
  app.get("/api/progress-events/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { startDate, endDate, eventType } = req.query;
      
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      if (sessionClientId && sessionClientId !== clientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const events = await storage.getProgressEventsByClientId(clientId, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        eventType: eventType as string | undefined
      });
      
      res.json(events);
    } catch (error) {
      console.error("Error fetching progress events:", error);
      res.status(500).json({ error: "Failed to fetch progress events" });
    }
  });

  // Create a progress event manually
  app.post("/api/progress-events", async (req, res) => {
    try {
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }

      const validatedData = insertProgressEventSchema.parse(req.body);

      // Clients can only create events for themselves
      if (sessionClientId && validatedData.clientId !== sessionClientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const event = await storage.createProgressEvent(validatedData);
      
      // Update client's last active time when client logs progress
      if (sessionClientId) {
        await storage.updateClient(sessionClientId, { lastActiveAt: new Date().toISOString() });
      }
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating progress event:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Update a progress event (review/correction)
  app.patch("/api/progress-events/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const coachId = req.session?.coachId;
      if (!coachId) {
        return res.status(401).json({ error: "Unauthorized - Coach access required" });
      }

      const event = await storage.getProgressEvent(id);
      if (!event) {
        return res.status(404).json({ error: "Progress event not found" });
      }

      const validatedData = insertProgressEventSchema.partial().parse(req.body);
      const updated = await storage.updateProgressEvent(id, validatedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating progress event:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Delete a progress event
  app.delete("/api/progress-events/:id", requireCoachAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const event = await storage.getProgressEvent(id);
      if (!event) {
        return res.status(404).json({ error: "Progress event not found" });
      }

      await storage.deleteProgressEvent(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting progress event:", error);
      res.status(500).json({ error: "Failed to delete progress event" });
    }
  });

  // ============================================
  // Weekly Reports API Routes
  // ============================================

  // Get weekly reports for a client
  app.get("/api/weekly-reports/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { limit } = req.query;
      
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      if (sessionClientId && sessionClientId !== clientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const reports = await storage.getWeeklyReportsByClientId(clientId, {
        limit: limit ? parseInt(limit as string) : undefined
      });
      
      res.json(reports);
    } catch (error) {
      console.error("Error fetching weekly reports:", error);
      res.status(500).json({ error: "Failed to fetch weekly reports" });
    }
  });

  // Get a specific weekly report
  app.get("/api/weekly-reports/:clientId/:weekStart", async (req, res) => {
    try {
      const { clientId, weekStart } = req.params;
      
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      if (sessionClientId && sessionClientId !== clientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const report = await storage.getWeeklyReportByWeek(clientId, weekStart);
      if (!report) {
        return res.status(404).json({ error: "Weekly report not found" });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching weekly report:", error);
      res.status(500).json({ error: "Failed to fetch weekly report" });
    }
  });

  // ============================================
  // Plan Targets API Routes
  // ============================================

  // Get plan targets for a client
  app.get("/api/plan-targets/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      if (sessionClientId && sessionClientId !== clientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const targets = await storage.getPlanTargetsByClientId(clientId);
      res.json(targets);
    } catch (error) {
      console.error("Error fetching plan targets:", error);
      res.status(500).json({ error: "Failed to fetch plan targets" });
    }
  });

  // Get active plan target for a client
  app.get("/api/plan-targets/:clientId/active", async (req, res) => {
    try {
      const { clientId } = req.params;
      
      const coachId = req.session?.coachId;
      const sessionClientId = req.session?.clientId;
      
      if (!coachId && !sessionClientId) {
        return res.status(401).json({ error: "Unauthorized - Please log in" });
      }
      
      if (sessionClientId && sessionClientId !== clientId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const target = await storage.getActivePlanTarget(clientId);
      res.json(target || null);
    } catch (error) {
      console.error("Error fetching active plan target:", error);
      res.status(500).json({ error: "Failed to fetch active plan target" });
    }
  });

  // Create a plan target (coach only)
  app.post("/api/plan-targets", requireCoachAuth, async (req, res) => {
    try {
      const validatedData = insertPlanTargetsSchema.parse(req.body);
      
      // Deactivate existing active targets for this client
      const existingTargets = await storage.getPlanTargetsByClientId(validatedData.clientId);
      for (const target of existingTargets) {
        if (target.isActive) {
          await storage.updatePlanTarget(target.id, { isActive: false });
        }
      }

      const target = await storage.createPlanTarget(validatedData);
      res.status(201).json(target);
    } catch (error) {
      console.error("Error creating plan target:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Update a plan target (coach only)
  app.patch("/api/plan-targets/:id", requireCoachAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const target = await storage.getPlanTarget(id);
      if (!target) {
        return res.status(404).json({ error: "Plan target not found" });
      }

      const validatedData = insertPlanTargetsSchema.partial().parse(req.body);
      const updated = await storage.updatePlanTarget(id, validatedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating plan target:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Delete a plan target (coach only)
  app.delete("/api/plan-targets/:id", requireCoachAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const target = await storage.getPlanTarget(id);
      if (!target) {
        return res.status(404).json({ error: "Plan target not found" });
      }

      await storage.deletePlanTarget(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plan target:", error);
      res.status(500).json({ error: "Failed to delete plan target" });
    }
  });

  // ============ ENGAGEMENT SYSTEM ENDPOINTS ============

  // Get client activity timeline (from progress events and smart logs)
  app.get("/api/engagement/activity/:clientId", requireCoachAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const coachId = req.session!.coachId!;
      
      // Verify client belongs to this coach
      const client = await storage.getClient(clientId);
      if (!client || client.coachId !== coachId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get recent progress events for timeline
      const events = await storage.getProgressEventsByClientId(clientId);
      
      // Transform to activity timeline format - take last 50
      const activities = events.slice(0, 50).map(event => ({
        id: event.id,
        clientId: event.clientId,
        type: event.eventType,
        category: event.eventType,
        summary: `${event.eventType} logged`,
        details: event.dataJson,
        timestamp: event.createdAt,
        createdAt: event.createdAt,
      }));

      res.json(activities);
    } catch (error) {
      console.error("Error fetching client activity:", error);
      res.status(500).json({ error: "Failed to fetch client activity" });
    }
  });

  // Get engagement triggers for a client
  app.get("/api/engagement/triggers/:clientId", requireCoachAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const coachId = req.session!.coachId!;
      
      const client = await storage.getClient(clientId);
      if (!client || client.coachId !== coachId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const triggers = await storage.getEngagementTriggers(clientId, coachId);
      res.json(triggers);
    } catch (error) {
      console.error("Error fetching engagement triggers:", error);
      res.status(500).json({ error: "Failed to fetch engagement triggers" });
    }
  });

  // Create engagement trigger
  app.post("/api/engagement/triggers", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session!.coachId!;
      const validatedData = insertEngagementTriggerSchema.parse({
        ...req.body,
        coachId,
      });
      
      const trigger = await storage.createEngagementTrigger(validatedData);
      res.status(201).json(trigger);
    } catch (error) {
      console.error("Error creating engagement trigger:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Resolve engagement trigger
  app.patch("/api/engagement/triggers/:id/resolve", requireCoachAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const trigger = await storage.getEngagementTrigger(id);
      if (!trigger) {
        return res.status(404).json({ error: "Trigger not found" });
      }

      const resolved = await storage.resolveEngagementTrigger(id);
      res.json(resolved);
    } catch (error) {
      console.error("Error resolving engagement trigger:", error);
      res.status(500).json({ error: "Failed to resolve trigger" });
    }
  });

  // Get recommendations for a client
  app.get("/api/engagement/recommendations/:clientId", requireCoachAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const coachId = req.session!.coachId!;
      
      const client = await storage.getClient(clientId);
      if (!client || client.coachId !== coachId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const recommendations = await storage.getEngagementRecommendations(clientId, coachId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  // Create recommendation
  app.post("/api/engagement/recommendations", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session!.coachId!;
      const validatedData = insertEngagementRecommendationSchema.parse({
        ...req.body,
        coachId,
      });
      
      const recommendation = await storage.createEngagementRecommendation(validatedData);
      res.status(201).json(recommendation);
    } catch (error) {
      console.error("Error creating recommendation:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Update recommendation status (send/dismiss)
  app.patch("/api/engagement/recommendations/:id", requireCoachAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      const recommendation = await storage.getEngagementRecommendation(id);
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      const updated = await storage.updateEngagementRecommendation(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating recommendation:", error);
      res.status(500).json({ error: "Failed to update recommendation" });
    }
  });

  // Get notification preferences for a specific client
  app.get("/api/engagement/notification-preferences/:clientId", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session!.coachId!;
      const { clientId } = req.params;
      
      const preferences = await storage.getEngagementNotificationPreferences(coachId, clientId);
      res.json(preferences || null);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ error: "Failed to fetch notification preferences" });
    }
  });

  // Update notification preferences for a specific client
  app.put("/api/engagement/notification-preferences/:clientId", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session!.coachId!;
      const { clientId } = req.params;
      const validatedData = insertEngagementNotificationPreferencesSchema.parse({
        ...req.body,
        coachId,
        clientId,
      });
      
      const preferences = await storage.upsertEngagementNotificationPreferences(validatedData);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  // Client-facing: Get in-app notifications
  app.get("/api/client/notifications", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session!.clientId!;
      const notifications = await storage.getInAppNotifications(clientId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Client-facing: Get unread notifications count
  app.get("/api/client/notifications/unread", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session!.clientId!;
      const notifications = await storage.getUnreadInAppNotifications(clientId);
      res.json({ count: notifications.length, notifications });
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ error: "Failed to fetch unread notifications" });
    }
  });

  // Client-facing: Mark notification as read
  app.patch("/api/client/notifications/:id/read", requireClientAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markInAppNotificationRead(id);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Client-facing: Get VAPID public key for push subscription
  app.get("/api/client/push/vapid-public-key", requireClientAuth, (req, res) => {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      return res.status(500).json({ error: "Push notifications not configured" });
    }
    res.json({ publicKey: vapidPublicKey });
  });

  // Client-facing: Get push subscription status
  app.get("/api/client/push/subscription", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session!.clientId!;
      const subscription = await storage.getPushSubscription(clientId);
      res.json({ subscribed: !!subscription, subscription: subscription || null });
    } catch (error) {
      console.error("Error fetching push subscription:", error);
      res.status(500).json({ error: "Failed to fetch push subscription" });
    }
  });

  // Client-facing: Save push subscription
  const pushSubscriptionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  });

  app.post("/api/client/push/subscribe", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session!.clientId!;
      
      const parseResult = pushSubscriptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid subscription data",
          details: parseResult.error.flatten() 
        });
      }
      
      const { endpoint, keys } = parseResult.data;
      
      const subscription = await storage.createPushSubscription({
        clientId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      
      res.json({ success: true, subscription });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ error: "Failed to save push subscription" });
    }
  });

  // Client-facing: Remove push subscription
  app.delete("/api/client/push/subscription", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session!.clientId!;
      await storage.deletePushSubscription(clientId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ error: "Failed to remove push subscription" });
    }
  });

  // Coach Push Notification Routes
  app.get("/api/coach/push/vapid-public-key", requireCoachAuth, (_req, res) => {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      return res.status(500).json({ error: 'Push notifications not configured' });
    }
    res.json({ publicKey: vapidPublicKey });
  });

  app.post("/api/coach/push/subscribe", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      
      const parseResult = pushSubscriptionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid subscription data",
          details: parseResult.error.flatten() 
        });
      }
      
      const { endpoint, keys } = parseResult.data;
      
      const subscription = await storage.createCoachPushSubscription({
        coachId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
      
      logger.info('Coach push subscription created', { coachId });
      res.json({ success: true, subscriptionId: subscription.id });
    } catch (error) {
      logger.error('Failed to save coach push subscription', {}, error);
      res.status(500).json({ error: 'Failed to save subscription' });
    }
  });

  app.delete("/api/coach/push/subscription", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      await storage.deleteCoachPushSubscription(coachId);
      logger.info('Coach push subscription deleted', { coachId });
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to delete coach push subscription', {}, error);
      res.status(500).json({ error: 'Failed to delete subscription' });
    }
  });

  app.get("/api/coach/push/status", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const subscription = await storage.getCoachPushSubscription(coachId);
      res.json({ enabled: !!subscription });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check status' });
    }
  });

  // Test notification endpoint for coaches
  app.post("/api/coach/push/test", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      
      const result = await sendPushNotificationToCoach(
        coachId,
        'Test Notification',
        'Push notifications are working! You will receive alerts when clients message you.',
        { 
          type: 'test',
          tag: 'wellio-test',
          url: '/coach/settings'
        }
      );
      
      if (result.success) {
        res.json({ success: true, message: `Notification sent to ${result.sentCount} device(s)` });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Failed to send test notification', {}, error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  // Test notification endpoint for clients
  app.post("/api/client/push/test", requireClientAuth, async (req, res) => {
    try {
      const clientId = req.session.clientId!;
      
      const result = await sendPushNotificationToClient(
        clientId,
        'Test Notification',
        'Push notifications are working! You will receive alerts when your coach messages you.',
        { 
          type: 'test',
          tag: 'wellio-test',
          url: '/client/profile'
        }
      );
      
      if (result.success) {
        res.json({ success: true, message: `Notification sent to ${result.sentCount} device(s)` });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      logger.error('Failed to send test notification to client', {}, error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  // ===== Client Reminder Settings Routes =====
  
  // Get reminder settings for a specific client (coach view)
  app.get("/api/clients/:clientId/reminder-settings", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const { clientId } = req.params;
      
      const client = await storage.getClient(clientId);
      if (!client || client.coachId !== coachId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      let settings = await storage.getClientReminderSettings(clientId);
      
      if (!settings) {
        settings = await storage.createClientReminderSettings({
          clientId,
          coachId,
          remindersEnabled: true,
          goalRemindersEnabled: true,
          planRemindersEnabled: true,
          inactivityRemindersEnabled: true,
          inactivityThresholdDays: 2,
          quietHoursStart: "21:00",
          quietHoursEnd: "08:00",
          timezone: "America/New_York",
          maxRemindersPerDay: 3,
        });
      }
      
      res.json(settings);
    } catch (error) {
      logger.error('Failed to get client reminder settings', { clientId: req.params.clientId }, error);
      res.status(500).json({ error: 'Failed to get reminder settings' });
    }
  });
  
  // Update reminder settings for a specific client (coach view)
  app.patch("/api/clients/:clientId/reminder-settings", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const { clientId } = req.params;
      
      const client = await storage.getClient(clientId);
      if (!client || client.coachId !== coachId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const settings = await storage.upsertClientReminderSettings({
        clientId,
        coachId,
        ...req.body,
      });
      
      logger.info('Client reminder settings updated', { clientId, coachId });
      res.json(settings);
    } catch (error) {
      logger.error('Failed to update client reminder settings', { clientId: req.params.clientId }, error);
      res.status(500).json({ error: 'Failed to update reminder settings' });
    }
  });
  
  // Get sent reminders for a client
  app.get("/api/clients/:clientId/sent-reminders", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const { clientId } = req.params;
      const { date } = req.query;
      
      const client = await storage.getClient(clientId);
      if (!client || client.coachId !== coachId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const reminders = await storage.getSentReminders(clientId, date as string | undefined);
      res.json(reminders);
    } catch (error) {
      logger.error('Failed to get sent reminders', { clientId: req.params.clientId }, error);
      res.status(500).json({ error: 'Failed to get sent reminders' });
    }
  });
  
  // Trigger reminders manually for a client (for testing)
  app.post("/api/clients/:clientId/trigger-reminders", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session.coachId!;
      const { clientId } = req.params;
      const { bypassQuietHours } = req.body;
      
      const client = await storage.getClient(clientId);
      if (!client || client.coachId !== coachId) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      const { processRemindersForClient } = await import('./reminderService');
      const result = await processRemindersForClient(client, { bypassQuietHours: !!bypassQuietHours });
      
      logger.info('Manual reminder trigger completed', { clientId, ...result });
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Failed to trigger reminders', { clientId: req.params.clientId }, error);
      res.status(500).json({ error: 'Failed to trigger reminders' });
    }
  });

  // Send notification to client (web push + in-app)
  app.post("/api/engagement/send-notification", requireCoachAuth, async (req, res) => {
    try {
      const coachId = req.session!.coachId!;
      const { clientId, title, message, channels } = req.body;

      if (!clientId || !title || !message) {
        return res.status(400).json({ error: "clientId, title, and message are required" });
      }

      const client = await storage.getClient(clientId);
      if (!client || client.coachId !== coachId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const results: { channel: string; success: boolean; error?: string }[] = [];

      // Always create in-app notification
      if (!channels || channels.includes('in_app')) {
        try {
          await storage.createInAppNotification({
            clientId,
            coachId,
            title,
            message,
            type: 'reminder',
          });
          results.push({ channel: 'in_app', success: true });
        } catch (err) {
          results.push({ channel: 'in_app', success: false, error: 'Failed to create in-app notification' });
        }
      }

      // Send web push notification
      if (!channels || channels.includes('web_push')) {
        try {
          const webpush = await import('web-push');
          
          const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
          const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
          
          if (!vapidPublicKey || !vapidPrivateKey) {
            results.push({ channel: 'web_push', success: false, error: 'VAPID keys not configured' });
          } else {
            webpush.setVapidDetails(
              'mailto:support@wellio.app',
              vapidPublicKey,
              vapidPrivateKey
            );
            
            const subscription = await storage.getPushSubscription(clientId);
            
            if (subscription) {
              const pushPayload = JSON.stringify({
                title,
                body: message,
                icon: '/icon-192.png',
                badge: '/icon-72.png',
                tag: 'coach-message',
                data: { url: '/client' }
              });
              
              try {
                await webpush.sendNotification(
                  {
                    endpoint: subscription.endpoint,
                    keys: {
                      p256dh: subscription.p256dh,
                      auth: subscription.auth,
                    },
                  },
                  pushPayload
                );
                results.push({ channel: 'web_push', success: true });
              } catch (pushErr: any) {
                // 404 or 410 means the subscription is no longer valid
                if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
                  console.log(`[Push] Subscription expired for client ${clientId}, removing...`);
                  await storage.deletePushSubscription(clientId);
                  results.push({ channel: 'web_push', success: false, error: 'Subscription expired and was removed' });
                } else {
                  console.error("Web push send error:", pushErr);
                  results.push({ channel: 'web_push', success: false, error: 'Failed to send push notification' });
                }
              }
            } else {
              results.push({ channel: 'web_push', success: false, error: 'Client has not enabled push notifications' });
            }
          }
        } catch (err) {
          console.error("Web push error:", err);
          results.push({ channel: 'web_push', success: false, error: 'Failed to send push notification' });
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // AI-powered trigger detection endpoint
  app.post("/api/engagement/detect-triggers/:clientId", requireCoachAuth, async (req, res) => {
    try {
      const { clientId } = req.params;
      const coachId = req.session!.coachId!;
      
      const client = await storage.getClient(clientId);
      if (!client || client.coachId !== coachId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get recent activity to analyze
      const recentEvents = await storage.getProgressEventsByClientId(clientId);
      const limitedEvents = recentEvents.slice(0, 30);
      
      if (limitedEvents.length < 3) {
        return res.json({ triggers: [], message: "Not enough data for trigger detection" });
      }

      // Simple rule-based trigger detection (can be enhanced with AI)
      type TriggerType = 'inactivity' | 'missed_workout' | 'declining_metrics' | 'goal_at_risk' | 'nutrition_concern' | 'sleep_issue' | 'engagement_drop';
      const triggers: Array<{
        type: TriggerType;
        severity: 'high' | 'medium' | 'low';
        reason: string;
        recommendedAction: string;
      }> = [];

      // Check for inactivity (no events in last 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const recentActivity = limitedEvents.filter(e => new Date(e.createdAt) > threeDaysAgo);
      
      if (recentActivity.length === 0) {
        triggers.push({
          type: 'inactivity',
          severity: 'high',
          reason: 'No logged activity in the past 3 days',
          recommendedAction: 'Send a check-in message to encourage engagement',
        });
      }

      // Check for declining workout frequency
      const workouts = limitedEvents.filter(e => e.eventType === 'exercise' || e.eventType === 'workout');
      if (workouts.length > 5) {
        const recentWorkouts = workouts.slice(0, 5);
        const olderWorkouts = workouts.slice(5, 10);
        if (olderWorkouts.length > 0 && recentWorkouts.length < olderWorkouts.length * 0.5) {
          triggers.push({
            type: 'missed_workout',
            severity: 'medium',
            reason: 'Workout frequency has decreased significantly',
            recommendedAction: 'Review workout plan and consider adjustments',
          });
        }
      }

      // Store detected triggers
      const savedTriggers = [];
      for (const t of triggers) {
        const saved = await storage.createEngagementTrigger({
          clientId,
          coachId,
          type: t.type,
          severity: t.severity,
          reason: t.reason,
          recommendedAction: t.recommendedAction,
        });
        savedTriggers.push(saved);
      }

      res.json({ triggers: savedTriggers });
    } catch (error) {
      console.error("Error detecting triggers:", error);
      res.status(500).json({ error: "Failed to detect triggers" });
    }
  });

  // AI-powered recommendation generation
  app.post("/api/engagement/generate-recommendation/:triggerId", requireCoachAuth, async (req, res) => {
    try {
      const { triggerId } = req.params;
      const coachId = req.session!.coachId!;
      
      const trigger = await storage.getEngagementTrigger(triggerId);
      if (!trigger || trigger.coachId !== coachId) {
        return res.status(404).json({ error: "Trigger not found" });
      }

      const client = await storage.getClient(trigger.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Generate recommendation message based on trigger type
      let message = '';
      let priority: 'high' | 'medium' | 'low' = 'medium';

      switch (trigger.type) {
        case 'inactivity':
          message = `Hey ${client.name}! I noticed it's been a few days since your last check-in. How are you doing? I'm here to help if you need any adjustments to your plan or just want to chat about your progress. Let me know!`;
          priority = 'high';
          break;
        case 'declining_workouts':
          message = `Hi ${client.name}! I've been reviewing your recent activity and wanted to check in. Life gets busy sometimes! Would you like to discuss any adjustments to your workout schedule that might work better for you right now?`;
          priority = 'medium';
          break;
        case 'missed_meals':
          message = `Hey ${client.name}! I noticed some gaps in your meal logging recently. Remember, tracking helps us stay on course together. Is there anything making it difficult to log? I'm happy to help simplify the process!`;
          priority = 'low';
          break;
        default:
          message = `Hi ${client.name}! Just checking in to see how everything is going. Let me know if there's anything I can help with!`;
      }

      const recommendation = await storage.createEngagementRecommendation({
        triggerId,
        clientId: trigger.clientId,
        coachId,
        message,
        reason: trigger.reason,
        priority,
      });

      // Include clientName in response for message sending
      res.json({
        ...recommendation,
        clientName: client.name,
      });
    } catch (error) {
      console.error("Error generating recommendation:", error);
      res.status(500).json({ error: "Failed to generate recommendation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

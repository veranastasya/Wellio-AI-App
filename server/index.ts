import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { setupOAuth } from "./replitAuth";
import { logger, generateRequestId } from "./logger";

const app = express();

// Trust proxy for production (Replit runs behind a reverse proxy)
// This is required for secure cookies to work properly in production
app.set('trust proxy', 1);

// Validate SESSION_SECRET is set
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required for secure session management");
}

// Session middleware setup
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax', // CSRF protection
  },
}));

// Passport middleware for OAuth
app.use(passport.initialize());
app.use(passport.session());

// Store raw body for webhook signature verification
app.use(express.json({
  verify: (req: any, _res, buf, encoding) => {
    if (req.url === '/api/webhooks/rook') {
      req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req: any, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = generateRequestId();
  req.requestId = requestId;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);

      if (res.statusCode >= 500) {
        logger.error('API request failed', {
          requestId,
          method: req.method,
          path,
          statusCode: res.statusCode,
          durationMs: duration,
        });
      }
    }
  });

  next();
});

(async () => {
  logger.info('Starting Wellio server', {
    nodeEnv: process.env.NODE_ENV || 'development',
  });
  
  await storage.seedData();
  log("Database seeded successfully");
  logger.info('Database seeded successfully');
  
  // Setup OAuth routes (Replit Auth for Google, Apple, GitHub login)
  await setupOAuth(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = (req as any).requestId || generateRequestId();

    logger.error('Unhandled request error', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: status,
    }, err);

    res.status(status).json({ message, requestId });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    logger.info('Server started successfully', { port });
  });
})();

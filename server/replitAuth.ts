import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000; // 30 days
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "user_sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertCoachFromOAuth(claims: any): Promise<{ coachId: string; isNew: boolean }> {
  const email = claims["email"];
  const firstName = claims["first_name"] || "";
  const lastName = claims["last_name"] || "";
  const profileImageUrl = claims["profile_image_url"];
  const oauthId = claims["sub"];
  
  const name = [firstName, lastName].filter(Boolean).join(" ") || email?.split("@")[0] || "Coach";
  
  // First check if coach already exists with this OAuth ID
  const existingByOAuth = await storage.getCoachByOAuthId(oauthId);
  if (existingByOAuth) {
    return { coachId: existingByOAuth.id, isNew: false };
  }
  
  // Check if coach exists with this email (to link OAuth to existing account)
  if (email) {
    const existingByEmail = await storage.getCoachByEmail(email);
    if (existingByEmail) {
      // Link OAuth to existing account
      await storage.updateCoach(existingByEmail.id, {
        oauthProvider: "replit",
        oauthId: oauthId,
        profileImageUrl: profileImageUrl || existingByEmail.profileImageUrl,
      });
      return { coachId: existingByEmail.id, isNew: false };
    }
  }
  
  // Create new coach account
  const coach = await storage.createCoach({
    name,
    email: email || `oauth_${oauthId}@placeholder.local`,
    phone: null,
    passwordHash: null, // OAuth users don't need password
    oauthProvider: "replit",
    oauthId: oauthId,
    profileImageUrl,
  });
  
  return { coachId: coach.id, isNew: true };
}

export async function setupOAuth(app: Express) {
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    
    // Upsert coach and attach coachId to user object
    const { coachId, isNew } = await upsertCoachFromOAuth(tokens.claims());
    (user as any).coachId = coachId;
    (user as any).isNewCoach = isNew;
    
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/oauth/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // OAuth login route - redirects to Replit's OAuth flow (supports Google, Apple, GitHub, etc.)
  app.get("/api/oauth/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // OAuth callback route
  app.get("/api/oauth/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any) => {
      if (err || !user) {
        console.error("OAuth authentication failed:", err);
        return res.redirect("/coach/login?error=oauth_failed");
      }
      
      // Set the coach session (integrate with existing session system)
      req.session.coachId = user.coachId;
      
      // Also log in via passport for OAuth token management
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session login failed:", loginErr);
          return res.redirect("/coach/login?error=session_failed");
        }
        
        // Redirect to dashboard
        res.redirect("/");
      });
    })(req, res, next);
  });

  // OAuth logout route
  app.get("/api/oauth/logout", (req, res) => {
    const coachId = req.session.coachId;
    
    req.logout(() => {
      // Clear our custom session data
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction failed:", err);
        }
        
        // Redirect to Replit's end session endpoint
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}/coach/login`,
          }).href
        );
      });
    });
  });
}

export const isOAuthAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

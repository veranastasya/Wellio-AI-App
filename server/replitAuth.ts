import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// State encoding for OAuth flow distinction
interface OAuthState {
  flow: "coach" | "client";
  tokenId?: string; // For client flow, the invite token
  nonce: string;
}

function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString("base64url");
}

function decodeState(encoded: string): OAuthState | null {
  try {
    return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

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

  // ========== CLIENT OAuth Routes ==========
  
  // Client OAuth login - takes a token query param to identify the invite
  app.get("/api/client-oauth/login", (req, res, next) => {
    const token = req.query.token as string;
    
    if (!token) {
      return res.redirect("/client/login?error=missing_token");
    }
    
    // Store the token in session for the callback
    (req.session as any).clientOAuthToken = token;
    
    // Generate a nonce for security
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    (req.session as any).clientOAuthNonce = nonce;
    
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.redirect("/client/login?error=session_error");
      }
      
      ensureStrategy(req.hostname);
      
      // Create a strategy for client callback
      const clientStrategyName = `replitauth-client:${req.hostname}`;
      if (!registeredStrategies.has(clientStrategyName)) {
        const clientStrategy = new Strategy(
          {
            name: clientStrategyName,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${req.hostname}/api/client-oauth/callback`,
          },
          verify,
        );
        passport.use(clientStrategy);
        registeredStrategies.add(clientStrategyName);
      }
      
      passport.authenticate(clientStrategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });
  });

  // Client OAuth callback route
  app.get("/api/client-oauth/callback", async (req, res, next) => {
    const clientStrategyName = `replitauth-client:${req.hostname}`;
    
    // Ensure strategy exists
    if (!registeredStrategies.has(clientStrategyName)) {
      const clientStrategy = new Strategy(
        {
          name: clientStrategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${req.hostname}/api/client-oauth/callback`,
        },
        verify,
      );
      passport.use(clientStrategy);
      registeredStrategies.add(clientStrategyName);
    }
    
    passport.authenticate(clientStrategyName, async (err: any, user: any) => {
      if (err || !user) {
        console.error("Client OAuth authentication failed:", err);
        return res.redirect("/client/password-setup?error=oauth_failed");
      }
      
      // Get the stored token from session
      const inviteToken = (req.session as any).clientOAuthToken;
      
      if (!inviteToken) {
        console.error("No invite token in session");
        return res.redirect("/client/login?error=missing_token");
      }
      
      try {
        // Verify the invite token
        const clientToken = await storage.getClientTokenByToken(inviteToken);
        
        if (!clientToken) {
          console.error("Invalid invite token:", inviteToken);
          return res.redirect("/client/login?error=invalid_token");
        }
        
        // Check if token is expired
        if (clientToken.expiresAt && new Date(clientToken.expiresAt) < new Date()) {
          return res.redirect("/client/login?error=token_expired");
        }
        
        // Get OAuth claims
        const claims = user.claims;
        const email = claims?.email;
        const firstName = claims?.first_name || "";
        const lastName = claims?.last_name || "";
        const profileImageUrl = claims?.profile_image_url;
        const oauthId = claims?.sub;
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || email?.split("@")[0] || "Client";
        
        // Check if client already exists with this OAuth ID
        const existingClientByOAuth = await storage.getClientByOAuthId(oauthId);
        
        if (existingClientByOAuth) {
          // Client already has an account with OAuth, log them in
          req.session.clientId = existingClientByOAuth.id;
          
          // Clean up session
          delete (req.session as any).clientOAuthToken;
          delete (req.session as any).clientOAuthNonce;
          
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error("Session save error:", saveErr);
            }
            return res.redirect("/client/dashboard");
          });
          return;
        }
        
        // Check if there's a client created from the invite token
        let existingClient = clientToken.clientId ? await storage.getClient(clientToken.clientId) : null;
        
        if (existingClient) {
          // Update existing client with OAuth info
          await storage.updateClient(existingClient.id, {
            oauthProvider: "replit",
            oauthId: oauthId,
            profileImageUrl: profileImageUrl || existingClient.profileImageUrl,
            lastLoginAt: new Date().toISOString(),
          });
          
          req.session.clientId = existingClient.id;
        } else {
          // Check if client exists by email
          const clientByEmail = email ? await storage.getClientByEmail(email) : null;
          
          if (clientByEmail) {
            // Link OAuth to existing client account
            await storage.updateClient(clientByEmail.id, {
              oauthProvider: "replit",
              oauthId: oauthId,
              profileImageUrl: profileImageUrl || clientByEmail.profileImageUrl,
              lastLoginAt: new Date().toISOString(),
            });
            
            // Update the token to point to this client
            await storage.updateClientToken(clientToken.id, {
              clientId: clientByEmail.id,
              status: "used",
              lastUsedAt: new Date().toISOString(),
            });
            
            req.session.clientId = clientByEmail.id;
          } else {
            // Create a new client from OAuth
            const newClient = await storage.createClient({
              name: fullName,
              email: email || `oauth_${oauthId}@placeholder.local`,
              coachId: clientToken.coachId,
              oauthProvider: "replit",
              oauthId: oauthId,
              profileImageUrl,
              status: "active",
              joinedDate: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            });
            
            // Update the token to point to the new client
            await storage.updateClientToken(clientToken.id, {
              clientId: newClient.id,
              status: "used",
              lastUsedAt: new Date().toISOString(),
            });
            
            // Update invite if exists
            const allInvites = await storage.getClientInvites();
            const invite = allInvites.find(i => i.tokenId === clientToken.id);
            if (invite) {
              await storage.updateClientInvite(invite.id, {
                clientId: newClient.id,
                status: "completed",
                completedAt: new Date().toISOString(),
              } as any);
            }
            
            req.session.clientId = newClient.id;
          }
        }
        
        // Clean up session
        delete (req.session as any).clientOAuthToken;
        delete (req.session as any).clientOAuthNonce;
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
          }
          return res.redirect("/client/dashboard");
        });
      } catch (error) {
        console.error("Error processing client OAuth:", error);
        return res.redirect("/client/login?error=oauth_error");
      }
    })(req, res, next);
  });

  // Client OAuth logout route
  app.get("/api/client-oauth/logout", (req, res) => {
    const clientId = req.session.clientId;
    
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction failed:", err);
        }
        
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}/client/login`,
          }).href
        );
      });
    });
  });

  // Returning client OAuth login - for clients who already have OAuth accounts
  app.get("/api/client-oauth/returning-login", (req, res, next) => {
    // Generate a nonce for security
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    (req.session as any).clientReturningNonce = nonce;
    
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.redirect("/client/login?error=session_error");
      }
      
      // Create or use strategy for returning client callback
      const returningStrategyName = `replitauth-client-returning:${req.hostname}`;
      if (!registeredStrategies.has(returningStrategyName)) {
        const returningStrategy = new Strategy(
          {
            name: returningStrategyName,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${req.hostname}/api/client-oauth/returning-callback`,
          },
          verify,
        );
        passport.use(returningStrategy);
        registeredStrategies.add(returningStrategyName);
      }
      
      passport.authenticate(returningStrategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });
  });

  // Returning client OAuth callback
  app.get("/api/client-oauth/returning-callback", async (req, res, next) => {
    const returningStrategyName = `replitauth-client-returning:${req.hostname}`;
    
    // Ensure strategy exists
    if (!registeredStrategies.has(returningStrategyName)) {
      const returningStrategy = new Strategy(
        {
          name: returningStrategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${req.hostname}/api/client-oauth/returning-callback`,
        },
        verify,
      );
      passport.use(returningStrategy);
      registeredStrategies.add(returningStrategyName);
    }
    
    passport.authenticate(returningStrategyName, async (err: any, user: any) => {
      if (err || !user) {
        console.error("Returning client OAuth authentication failed:", err);
        return res.redirect("/client/login?error=oauth_failed");
      }
      
      try {
        // Get OAuth claims
        const claims = user.claims;
        const oauthId = claims?.sub;
        
        if (!oauthId) {
          console.error("No OAuth ID in claims");
          return res.redirect("/client/login?error=oauth_error");
        }
        
        // Look for existing client with this OAuth ID
        const existingClient = await storage.getClientByOAuthId(oauthId);
        
        if (!existingClient) {
          // No account found - they need to sign up via invite first
          console.log("No client found with OAuth ID:", oauthId);
          return res.redirect("/client/login?error=no_account");
        }
        
        // Update last login
        await storage.updateClient(existingClient.id, {
          lastLoginAt: new Date().toISOString(),
        });
        
        // Set session
        req.session.clientId = existingClient.id;
        
        // Clean up
        delete (req.session as any).clientReturningNonce;
        
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
          }
          return res.redirect("/client/dashboard");
        });
      } catch (error) {
        console.error("Error processing returning client OAuth:", error);
        return res.redirect("/client/login?error=oauth_error");
      }
    })(req, res, next);
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

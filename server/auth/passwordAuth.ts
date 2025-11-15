import type { Express, RequestHandler } from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { storage } from "../storage";
import { z } from "zod";
import { hashPassword, verifyPassword } from "./password";
import {
  createAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
  isTokenNearExpiry,
  type SessionData
} from "./tokens";
import {
  COOKIE_NAMES,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies
} from "./cookies";

// Login request schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Register request schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["super_admin", "school_admin", "admin", "teacher", "student"]).optional(),
  schoolId: z.number().optional(),
});

// Helper to issue session cookies from user data
async function issueSessionCookies(res: any, userId: string, email: string, role: string, schoolId: number | null, oldRefreshToken?: string) {
  // Create access token JWT with only user claims (no OIDC)
  const accessToken = await createAccessToken({
    sub: userId,
    email,
    role,
    school_id: schoolId,
  });
  
  // Create or rotate refresh token
  let refreshToken: string;
  if (oldRefreshToken) {
    const rotated = await rotateRefreshToken(oldRefreshToken);
    if (!rotated) {
      throw new Error("Failed to rotate refresh token");
    }
    refreshToken = rotated;
  } else {
    refreshToken = await createRefreshToken(userId);
  }
  
  const refreshData = await verifyRefreshToken(refreshToken);
  
  if (refreshData) {
    const tokenHash = hashRefreshToken(refreshData.tokenId, refreshData.rotationCounter);
    await storage.storeRefreshToken(userId, tokenHash, refreshData.tokenId);
  }
  
  // Set cookies
  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
}

export async function setupPasswordAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(cookieParser());

  // Rate limiting for login endpoint (prevent brute force)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per window
    message: "Too many login attempts, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Login endpoint (with rate limiting)
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is inactive" });
      }

      // Verify password
      const isValid = await verifyPassword(password, user.passwordHash);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Issue session cookies
      await issueSessionCookies(res, user.id, user.email, user.role, user.schoolId);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          schoolId: user.schoolId,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // REMOVED PUBLIC REGISTRATION - Use bootstrap script or admin creation instead
  // Registration is only allowed through:
  // 1. Initial super admin bootstrap (via environment variable check)
  // 2. Admin-created users (requires authentication)

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const refreshToken = req.cookies[COOKIE_NAMES.REFRESH_TOKEN];
      
      if (refreshToken) {
        const refreshData = await verifyRefreshToken(refreshToken);
        if (refreshData) {
          // Revoke refresh token from database
          await storage.revokeRefreshToken(refreshData.userId, refreshData.tokenId);
        }
      }

      // Clear auth cookies
      clearAuthCookies(res);
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear cookies even on error
      clearAuthCookies(res);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user endpoint (protected by isAuthenticated middleware)
  app.get("/api/auth/me", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(req.user.claims.sub);
      
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          schoolId: user.schoolId,
          profileImageUrl: user.profileImageUrl,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

// Middleware to verify authentication
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const accessToken = req.cookies[COOKIE_NAMES.ACCESS_TOKEN];

  if (!accessToken) {
    return res.status(401).json({ message: "Unauthorized - no token provided" });
  }

  try {
    const sessionData = await verifyAccessToken(accessToken);

    if (sessionData) {
      const user = await storage.getUser(sessionData.claims.sub);
      
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User not found or inactive" });
      }

      req.user = {
        claims: {
          sub: user.id,
          email: user.email,
          role: user.role,
          school_id: user.schoolId,
        },
      };

      // Proactively refresh if token is near expiry
      if (isTokenNearExpiry(sessionData.exp || 0)) {
        try {
          const refreshTokenCookie = req.cookies[COOKIE_NAMES.REFRESH_TOKEN];
          const refreshData = await verifyRefreshToken(refreshTokenCookie);
          
          if (refreshData) {
            await issueSessionCookies(res, user.id, user.email, user.role, user.schoolId, refreshTokenCookie);
          }
        } catch (error) {
          console.error("Failed to proactively refresh token:", error);
        }
      }

      return next();
    }

    // Try to refresh using refresh token
    const refreshTokenCookie = req.cookies[COOKIE_NAMES.REFRESH_TOKEN];
    
    if (!refreshTokenCookie) {
      return res.status(401).json({ message: "Unauthorized - session expired" });
    }

    const refreshData = await verifyRefreshToken(refreshTokenCookie);
    
    if (!refreshData) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Unauthorized - invalid refresh token" });
    }

    // Verify refresh token hash in database
    const tokenHash = hashRefreshToken(refreshData.tokenId, refreshData.rotationCounter);
    const isValid = await storage.verifyRefreshToken(refreshData.userId, tokenHash);
    
    if (!isValid) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "Unauthorized - token revoked" });
    }

    // Get user and issue new tokens
    const user = await storage.getUser(refreshData.userId);
    
    if (!user || !user.isActive) {
      clearAuthCookies(res);
      return res.status(401).json({ message: "User not found or inactive" });
    }

    await issueSessionCookies(res, user.id, user.email, user.role, user.schoolId, refreshTokenCookie);

    req.user = {
      claims: {
        sub: user.id,
        email: user.email,
        role: user.role,
        school_id: user.schoolId,
      },
    };

    return next();
  } catch (error) {
    console.error("Authentication error:", error);
    clearAuthCookies(res);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Middleware to require super admin role
export const isSuperAdmin: RequestHandler = (req, res, next) => {
  if (!req.user || req.user.claims.role !== "super_admin") {
    return res.status(403).json({ message: "Forbidden - super admin access required" });
  }
  next();
};

// Middleware to require school admin or super admin role
export const requireSchoolAdmin: RequestHandler = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const role = req.user.claims.role;
  if (role !== "school_admin" && role !== "super_admin") {
    return res.status(403).json({ message: "Forbidden - admin access required" });
  }
  next();
};

// NOTE: attachTenantContext is provided by server/tenantMiddleware.ts
// Do not duplicate it here to avoid divergent logic

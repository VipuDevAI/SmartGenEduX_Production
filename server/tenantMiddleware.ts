import { RequestHandler } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      schoolId?: number;
      isSuperAdmin?: boolean;
      userRole?: string;
    }
  }
}

export const attachTenantContext: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as any;
    
    // If no user (not authenticated), skip tenant context
    if (!user?.claims?.sub) {
      return next();
    }

    const userId = user.claims.sub;

    // Fetch user from database to get role and schoolId
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!dbUser) {
      return next();
    }

    // Set user role and super admin flag
    req.userRole = dbUser.role;
    req.isSuperAdmin = dbUser.role === "super_admin";
    
    // Super admins have no school context, regular users must have a school
    if (req.isSuperAdmin) {
      req.schoolId = undefined;
    } else {
      if (!dbUser.schoolId) {
        return res.status(403).json({
          message: "User is not assigned to a school. Please contact your administrator.",
        });
      }
      req.schoolId = dbUser.schoolId;
    }

    next();
  } catch (error) {
    console.error("Error in tenant middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const requireTenantContext: RequestHandler = (req, res, next) => {
  if (!req.schoolId && !req.isSuperAdmin) {
    return res.status(403).json({
      message: "Tenant context is required",
    });
  }
  next();
};

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (!req.isSuperAdmin) {
    return res.status(403).json({
      message: "Super admin access required",
    });
  }
  next();
};

export const requireSchoolAdmin: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as any;
    if (!user?.claims?.sub) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = user.claims.sub;
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    if (dbUser.role !== "school_admin" && dbUser.role !== "super_admin") {
      return res.status(403).json({
        message: "School admin or super admin access required",
      });
    }

    next();
  } catch (error) {
    console.error("Error in school admin middleware:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

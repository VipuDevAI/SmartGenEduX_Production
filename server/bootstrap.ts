/**
 * Bootstrap script to create initial Super Admin user
 * 
 * Usage:
 * 1. Set environment variables:
 *    BOOTSTRAP_EMAIL=admin@example.com
 *    BOOTSTRAP_PASSWORD=your-secure-password
 *    BOOTSTRAP_FIRST_NAME=Admin
 *    BOOTSTRAP_LAST_NAME=User
 * 
 * 2. Run: tsx server/bootstrap.ts
 * 
 * This creates a super_admin user with no school_id (platform-wide access)
 */

import { storage } from "./storage";
import { hashPassword } from "./auth/password";

async function bootstrap() {
  const email = process.env.BOOTSTRAP_EMAIL;
  const password = process.env.BOOTSTRAP_PASSWORD;
  const firstName = process.env.BOOTSTRAP_FIRST_NAME || "Super";
  const lastName = process.env.BOOTSTRAP_LAST_NAME || "Admin";

  if (!email || !password) {
    console.error("❌ BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD environment variables are required");
    console.error("\nUsage:");
    console.error("  BOOTSTRAP_EMAIL=admin@example.com \\");
    console.error("  BOOTSTRAP_PASSWORD=your-secure-password \\");
    console.error("  BOOTSTRAP_FIRST_NAME=Admin \\");
    console.error("  BOOTSTRAP_LAST_NAME=User \\");
    console.error("  tsx server/bootstrap.ts");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ Password must be at least 8 characters long");
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser) {
      console.error(`❌ User with email ${email} already exists`);
      console.log("\nExisting user details:");
      console.log(`  ID: ${existingUser.id}`);
      console.log(`  Email: ${existingUser.email}`);
      console.log(`  Role: ${existingUser.role}`);
      console.log(`  Active: ${existingUser.isActive}`);
      process.exit(1);
    }

    // Hash password
    console.log("🔐 Hashing password...");
    const passwordHash = await hashPassword(password);

    // Create super admin user
    console.log("👤 Creating Super Admin user...");
    const user = await storage.createUser({
      email,
      passwordHash,
      firstName,
      lastName,
      role: "super_admin",
      schoolId: null, // Super admin has no school - platform-wide access
      isActive: true,
    });

    console.log("\n✅ Super Admin created successfully!");
    console.log("\nUser details:");
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.firstName} ${user.lastName}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Active: ${user.isActive}`);
    console.log("\n🎉 You can now login with these credentials!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Bootstrap failed:", error);
    process.exit(1);
  }
}

bootstrap();

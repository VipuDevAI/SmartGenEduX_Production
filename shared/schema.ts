import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index, boolean, serial, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Schools table (Multi-Tenant Master)
export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  subdomain: varchar("subdomain", { length: 100 }).unique(),
  domain: varchar("domain", { length: 255 }).unique(),
  
  // School branding
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#3b82f6"),
  
  // School settings
  settings: jsonb("settings").default({}), // Store school-specific config
  
  // AI Configuration (per-school API keys for AI modules)
  aiProvider: varchar("ai_provider", { length: 50 }), // 'anthropic', 'openai', 'gemini', null
  aiApiKey: text("ai_api_key"), // Encrypted API key for school's AI features
  
  // Subscription/billing (for SaaS)
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("free"),
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default("active"),
  maxUsers: integer("max_users").default(100),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_schools_subdomain").on(table.subdomain),
  index("idx_schools_active").on(table.isActive),
]);

export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  modules: many(modules),
}));

export const insertSchoolSchema = createInsertSchema(schools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

// User roles enum
export const userRoles = ["super_admin", "school_admin", "admin", "teacher", "student"] as const;
export type UserRole = typeof userRoles[number];

// Users table with email/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  role: varchar("role", { length: 20 }).notNull().default("student"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_users_school").on(table.schoolId),
  index("idx_users_role").on(table.role),
  index("idx_users_email").on(table.email),
]);

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, {
    fields: [users.schoolId],
    references: [schools.id],
  }),
  conversations: many(conversations),
  modules: many(modules),
}));

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// AI Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_conversations_school").on(table.schoolId),
  index("idx_conversations_user").on(table.userId),
]);

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// AI Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  codePreview: text("code_preview"), // Generated code if any
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_messages_school").on(table.schoolId),
  index("idx_messages_conversation").on(table.conversationId),
]);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Modules table (for tracking created ERP modules)
export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, development
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_modules_school").on(table.schoolId),
  index("idx_modules_status").on(table.status),
]);

export const modulesRelations = relations(modules, ({ one }) => ({
  creator: one(users, {
    fields: [modules.createdBy],
    references: [users.id],
  }),
}));

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Module = typeof modules.$inferSelect;

// Generation job status enum
export const jobStatuses = ["pending", "generating", "review", "approved", "deploying", "deployed", "failed", "rejected"] as const;
export type JobStatus = typeof jobStatuses[number];

// Module Generation Jobs table (tracks AI code generation requests)
export const moduleGenerationJobs = pgTable("module_generation_jobs", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "set null" }),
  
  // Request details
  requestDescription: text("request_description").notNull(), // Natural language request
  moduleBlueprint: jsonb("module_blueprint"), // Parsed blueprint (entities, fields, relationships)
  
  // Status tracking
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  errorMessage: text("error_message"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  deployedAt: timestamp("deployed_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
}, (table) => [
  index("idx_generation_jobs_school").on(table.schoolId),
  index("idx_generation_jobs_status").on(table.status),
  index("idx_generation_jobs_user").on(table.userId),
]);

export const moduleGenerationJobsRelations = relations(moduleGenerationJobs, ({ one, many }) => ({
  user: one(users, {
    fields: [moduleGenerationJobs.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [moduleGenerationJobs.conversationId],
    references: [conversations.id],
  }),
  module: one(modules, {
    fields: [moduleGenerationJobs.moduleId],
    references: [modules.id],
  }),
  artifacts: many(generationArtifacts),
  deployments: many(deploymentHistory),
}));

export const insertModuleGenerationJobSchema = createInsertSchema(moduleGenerationJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  deployedAt: true,
});

export type InsertModuleGenerationJob = z.infer<typeof insertModuleGenerationJobSchema>;
export type ModuleGenerationJob = typeof moduleGenerationJobs.$inferSelect;

// Generation Artifacts table (stores generated code files)
export const generationArtifacts = pgTable("generation_artifacts", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => moduleGenerationJobs.id, { onDelete: "cascade" }),
  
  // File details
  filePath: text("file_path").notNull(), // e.g., "shared/schema.ts", "server/routes.ts"
  fileType: varchar("file_type", { length: 50 }).notNull(), // schema, route, component, type
  generatedCode: text("generated_code").notNull(), // The actual code
  diffPreview: text("diff_preview"), // Diff showing changes
  
  // Status
  isApplied: boolean("is_applied").default(false),
  appliedAt: timestamp("applied_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generationArtifactsRelations = relations(generationArtifacts, ({ one }) => ({
  job: one(moduleGenerationJobs, {
    fields: [generationArtifacts.jobId],
    references: [moduleGenerationJobs.id],
  }),
}));

export const insertGenerationArtifactSchema = createInsertSchema(generationArtifacts).omit({
  id: true,
  createdAt: true,
  appliedAt: true,
});

export type InsertGenerationArtifact = z.infer<typeof insertGenerationArtifactSchema>;
export type GenerationArtifact = typeof generationArtifacts.$inferSelect;

// Deployment History table (tracks all deployments)
export const deploymentHistory = pgTable("deployment_history", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => moduleGenerationJobs.id, { onDelete: "cascade" }),
  deployedBy: varchar("deployed_by").notNull().references(() => users.id),
  
  // Deployment metadata
  filesModified: jsonb("files_modified").notNull(), // Array of file paths that were changed
  backupSnapshot: jsonb("backup_snapshot"), // Backup of previous state for rollback
  migrationsSql: text("migrations_sql"), // SQL migrations that were run
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("success"), // success, failed, rolled_back
  errorMessage: text("error_message"),
  
  // Timestamps
  deployedAt: timestamp("deployed_at").defaultNow().notNull(),
  rolledBackAt: timestamp("rolled_back_at"),
});

export const deploymentHistoryRelations = relations(deploymentHistory, ({ one }) => ({
  job: one(moduleGenerationJobs, {
    fields: [deploymentHistory.jobId],
    references: [moduleGenerationJobs.id],
  }),
  deployer: one(users, {
    fields: [deploymentHistory.deployedBy],
    references: [users.id],
  }),
}));

export const insertDeploymentHistorySchema = createInsertSchema(deploymentHistory).omit({
  id: true,
  deployedAt: true,
  rolledBackAt: true,
});

export type InsertDeploymentHistory = z.infer<typeof insertDeploymentHistorySchema>;
export type DeploymentHistory = typeof deploymentHistory.$inferSelect;

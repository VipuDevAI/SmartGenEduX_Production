import {
  users,
  schools,
  conversations,
  messages,
  modules,
  moduleGenerationJobs,
  generationArtifacts,
  deploymentHistory,
  type User,
  type UpsertUser,
  type School,
  type InsertSchool,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Module,
  type InsertModule,
  type ModuleGenerationJob,
  type InsertModuleGenerationJob,
  type GenerationArtifact,
  type InsertGenerationArtifact,
  type DeploymentHistory,
  type InsertDeploymentHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(schoolId?: number): Promise<User[]>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  updateUser(userId: string, data: Partial<Omit<UpsertUser, 'id' | 'passwordHash'>>): Promise<User>;
  
  // Refresh token operations (for JWT auth)
  storeRefreshToken(userId: string, tokenHash: string, tokenId: string): Promise<void>;
  verifyRefreshToken(userId: string, tokenHash: string): Promise<boolean>;
  revokeRefreshToken(userId: string, tokenId: string): Promise<void>;
  
  // School operations
  getSchools(): Promise<School[]>;
  getSchool(schoolId: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(schoolId: number, data: Partial<InsertSchool>): Promise<School>;
  getSchoolAiConfig(schoolId: number): Promise<{ provider: string | null; hasKey: boolean }>;
  updateSchoolAiConfig(schoolId: number, provider: string | null, apiKey: string | null): Promise<School>;
  
  // Conversation operations (schoolId optional - undefined = super admin)
  getConversations(userId: string, schoolId?: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(conversationId: number): Promise<void>;
  
  // Message operations
  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Module operations (schoolId optional - undefined = super admin)
  getModules(schoolId?: number): Promise<Module[]>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(moduleId: number, data: Partial<InsertModule>): Promise<Module>;
  deleteModule(moduleId: number): Promise<void>;
  
  // Generation job operations (schoolId optional - undefined = super admin)
  getGenerationJobs(userId: string, schoolId?: number): Promise<ModuleGenerationJob[]>;
  getGenerationJob(jobId: number): Promise<ModuleGenerationJob | undefined>;
  createGenerationJob(job: InsertModuleGenerationJob): Promise<ModuleGenerationJob>;
  updateGenerationJob(jobId: number, data: Partial<InsertModuleGenerationJob>): Promise<ModuleGenerationJob>;
  
  // Artifact operations
  getJobArtifacts(jobId: number): Promise<GenerationArtifact[]>;
  createArtifact(artifact: InsertGenerationArtifact): Promise<GenerationArtifact>;
  updateArtifact(artifactId: number, data: Partial<InsertGenerationArtifact>): Promise<GenerationArtifact>;
  
  // Deployment operations
  getDeploymentHistory(jobId?: number): Promise<DeploymentHistory[]>;
  createDeployment(deployment: InsertDeploymentHistory): Promise<DeploymentHistory>;
  updateDeployment(deploymentId: number, data: Partial<InsertDeploymentHistory>): Promise<DeploymentHistory>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(schoolId?: number): Promise<User[]> {
    if (schoolId !== undefined) {
      return await db.select().from(users).where(eq(users.schoolId, schoolId));
    }
    return await db.select().from(users);
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUser(userId: string, data: Partial<Omit<UpsertUser, 'id' | 'passwordHash'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Refresh token operations (using sessions table with parameterized queries)
  async storeRefreshToken(userId: string, tokenHash: string, tokenId: string): Promise<void> {
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7); // 7 days

    await db.execute(
      sql`
        INSERT INTO sessions (sid, sess, expire)
        VALUES (${tokenId}, ${JSON.stringify({ userId, tokenHash })}, ${expireDate.toISOString()})
        ON CONFLICT (sid)
        DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire
      `
    );
  }

  async verifyRefreshToken(userId: string, tokenHash: string): Promise<boolean> {
    const result: any = await db.execute(
      sql`
        SELECT sess FROM sessions 
        WHERE sess::jsonb->>'userId' = ${userId} 
        AND sess::jsonb->>'tokenHash' = ${tokenHash}
        AND expire > NOW()
        LIMIT 1
      `
    );

    return result.rows && result.rows.length > 0;
  }

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    await db.execute(
      sql`
        DELETE FROM sessions 
        WHERE sid = ${tokenId}
      `
    );
  }

  // School operations
  async getSchools(): Promise<School[]> {
    return await db
      .select()
      .from(schools)
      .orderBy(desc(schools.createdAt));
  }

  async getSchool(schoolId: number): Promise<School | undefined> {
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId));
    return school;
  }

  async createSchool(schoolData: InsertSchool): Promise<School> {
    const [school] = await db
      .insert(schools)
      .values(schoolData)
      .returning();
    return school;
  }

  async updateSchool(schoolId: number, data: Partial<InsertSchool>): Promise<School> {
    const [school] = await db
      .update(schools)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schools.id, schoolId))
      .returning();
    return school;
  }

  async getSchoolAiConfig(schoolId: number): Promise<{ provider: string | null; hasKey: boolean }> {
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, schoolId));
    
    if (!school) {
      throw new Error("School not found");
    }
    
    return {
      provider: school.aiProvider,
      hasKey: !!school.aiApiKey,
    };
  }

  async updateSchoolAiConfig(schoolId: number, provider: string | null, apiKey: string | null): Promise<School> {
    const [school] = await db
      .update(schools)
      .set({ 
        aiProvider: provider,
        aiApiKey: apiKey,
        updatedAt: new Date() 
      })
      .where(eq(schools.id, schoolId))
      .returning();
    return school;
  }

  // Conversation operations
  async getConversations(userId: string, schoolId?: number): Promise<Conversation[]> {
    const conditions = [eq(conversations.userId, userId)];
    
    if (schoolId !== undefined) {
      conditions.push(eq(conversations.schoolId, schoolId));
    }
    
    return await db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.updatedAt));
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(conversationData)
      .returning();
    return conversation;
  }

  async updateConversation(conversationId: number): Promise<void> {
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
  }

  // Message operations
  async getMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  // Module operations
  async getModules(schoolId?: number): Promise<Module[]> {
    if (schoolId !== undefined) {
      return await db
        .select()
        .from(modules)
        .where(eq(modules.schoolId, schoolId))
        .orderBy(desc(modules.createdAt));
    }
    
    return await db
      .select()
      .from(modules)
      .orderBy(desc(modules.createdAt));
  }

  async createModule(moduleData: InsertModule): Promise<Module> {
    const [module] = await db
      .insert(modules)
      .values(moduleData)
      .returning();
    return module;
  }

  async updateModule(moduleId: number, data: Partial<InsertModule>): Promise<Module> {
    const [module] = await db
      .update(modules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(modules.id, moduleId))
      .returning();
    return module;
  }

  async deleteModule(moduleId: number): Promise<void> {
    await db.delete(modules).where(eq(modules.id, moduleId));
  }

  // Generation job operations
  async getGenerationJobs(userId: string, schoolId?: number): Promise<ModuleGenerationJob[]> {
    const conditions = [eq(moduleGenerationJobs.userId, userId)];
    
    if (schoolId !== undefined) {
      conditions.push(eq(moduleGenerationJobs.schoolId, schoolId));
    }
    
    return await db
      .select()
      .from(moduleGenerationJobs)
      .where(and(...conditions))
      .orderBy(desc(moduleGenerationJobs.createdAt));
  }

  async getGenerationJob(jobId: number): Promise<ModuleGenerationJob | undefined> {
    const [job] = await db
      .select()
      .from(moduleGenerationJobs)
      .where(eq(moduleGenerationJobs.id, jobId));
    return job;
  }

  async createGenerationJob(jobData: InsertModuleGenerationJob): Promise<ModuleGenerationJob> {
    const [job] = await db
      .insert(moduleGenerationJobs)
      .values(jobData)
      .returning();
    return job;
  }

  async updateGenerationJob(jobId: number, data: Partial<InsertModuleGenerationJob>): Promise<ModuleGenerationJob> {
    const [job] = await db
      .update(moduleGenerationJobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(moduleGenerationJobs.id, jobId))
      .returning();
    return job;
  }

  // Artifact operations
  async getJobArtifacts(jobId: number): Promise<GenerationArtifact[]> {
    return await db
      .select()
      .from(generationArtifacts)
      .where(eq(generationArtifacts.jobId, jobId))
      .orderBy(generationArtifacts.createdAt);
  }

  async createArtifact(artifactData: InsertGenerationArtifact): Promise<GenerationArtifact> {
    const [artifact] = await db
      .insert(generationArtifacts)
      .values(artifactData)
      .returning();
    return artifact;
  }

  async updateArtifact(artifactId: number, data: Partial<InsertGenerationArtifact>): Promise<GenerationArtifact> {
    const [artifact] = await db
      .update(generationArtifacts)
      .set(data)
      .where(eq(generationArtifacts.id, artifactId))
      .returning();
    return artifact;
  }

  // Deployment operations
  async getDeploymentHistory(jobId?: number): Promise<DeploymentHistory[]> {
    if (jobId) {
      return await db
        .select()
        .from(deploymentHistory)
        .where(eq(deploymentHistory.jobId, jobId))
        .orderBy(desc(deploymentHistory.deployedAt));
    }
    return await db
      .select()
      .from(deploymentHistory)
      .orderBy(desc(deploymentHistory.deployedAt))
      .limit(50);
  }

  async createDeployment(deploymentData: InsertDeploymentHistory): Promise<DeploymentHistory> {
    const [deployment] = await db
      .insert(deploymentHistory)
      .values(deploymentData)
      .returning();
    return deployment;
  }

  async updateDeployment(deploymentId: number, data: Partial<InsertDeploymentHistory>): Promise<DeploymentHistory> {
    const [deployment] = await db
      .update(deploymentHistory)
      .set(data)
      .where(eq(deploymentHistory.id, deploymentId))
      .returning();
    return deployment;
  }
}

export const storage: IStorage = new DatabaseStorage();

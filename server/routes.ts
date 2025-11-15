import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupPasswordAuth, isAuthenticated, isSuperAdmin, requireSchoolAdmin as requireSchoolAdminAuth } from "./auth/passwordAuth";
import { attachTenantContext, requireSuperAdmin, requireSchoolAdmin } from "./tenantMiddleware";
import { insertConversationSchema, insertMessageSchema, insertModuleSchema, insertSchoolSchema } from "@shared/schema";
import { aiService } from "./aiService";
import { codeGenerator } from "./codeGenerator";
import { promises as fs } from "fs";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Password-based auth middleware (includes cookieParser + auth routes)
  await setupPasswordAuth(app);
  
  // Apply tenant context to all routes after auth
  app.use(attachTenantContext);

  // User management routes (Super Admin only)
  app.get('/api/users', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId) : undefined;
      const users = await storage.getAllUsers(schoolId);
      
      // Remove password hashes from response
      const safeUsers = users.map(u => {
        const { passwordHash, ...safe } = u;
        return safe;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, role, schoolId } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      // Check if user already exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      // Hash password and create user
      const { hashPassword } = await import("./auth/password");
      const passwordHash = await hashPassword(password);
      
      const user = await storage.createUser({
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: role || "student",
        schoolId: schoolId || null,
        isActive: true,
      });
      
      // Remove password hash from response
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: error.message || "Failed to create user" });
    }
  });

  app.patch('/api/users/:userId', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Don't allow password changes through this endpoint
      delete updates.passwordHash;
      delete updates.id;
      
      const user = await storage.updateUser(userId, updates);
      
      // Remove password hash from response
      const { passwordHash: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: error.message || "Failed to update user" });
    }
  });

  // School routes (Super Admin only)
  app.get('/api/schools', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const schools = await storage.getSchools();
      res.json(schools);
    } catch (error) {
      console.error("Error fetching schools:", error);
      res.status(500).json({ message: "Failed to fetch schools" });
    }
  });

  app.post('/api/schools', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const validatedData = insertSchoolSchema.parse(req.body);
      const school = await storage.createSchool(validatedData);
      res.json(school);
    } catch (error: any) {
      console.error("Error creating school:", error);
      res.status(400).json({ message: error.message || "Failed to create school" });
    }
  });

  app.patch('/api/schools/:schoolId', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const schoolId = parseInt(req.params.schoolId);
      const school = await storage.updateSchool(schoolId, req.body);
      res.json(school);
    } catch (error: any) {
      console.error("Error updating school:", error);
      res.status(400).json({ message: error.message || "Failed to update school" });
    }
  });

  // AI Configuration routes (School Admin can manage their own school's AI config)
  app.get('/api/schools/:schoolId/ai-config', isAuthenticated, requireSchoolAdmin, async (req: any, res) => {
    try {
      const schoolId = parseInt(req.params.schoolId);
      
      // Ensure school admin can only access their own school
      if (req.userRole !== 'super_admin' && req.schoolId !== schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const config = await storage.getSchoolAiConfig(schoolId);
      res.json(config);
    } catch (error: any) {
      console.error("Error fetching AI config:", error);
      res.status(500).json({ message: error.message || "Failed to fetch AI configuration" });
    }
  });

  app.patch('/api/schools/:schoolId/ai-config', isAuthenticated, requireSchoolAdmin, async (req: any, res) => {
    try {
      const schoolId = parseInt(req.params.schoolId);
      const { provider, apiKey } = req.body;
      
      // Ensure school admin can only update their own school
      if (req.userRole !== 'super_admin' && req.schoolId !== schoolId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Validate provider
      const validProviders = ['anthropic', 'openai', 'gemini', null];
      if (provider && !validProviders.includes(provider)) {
        return res.status(400).json({ message: "Invalid AI provider" });
      }
      
      const school = await storage.updateSchoolAiConfig(schoolId, provider, apiKey);
      res.json({ success: true, provider: school.aiProvider, hasKey: !!school.aiApiKey });
    } catch (error: any) {
      console.error("Error updating AI config:", error);
      res.status(500).json({ message: error.message || "Failed to update AI configuration" });
    }
  });

  // Conversation routes (Super Admin only)
  app.get('/api/conversations', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schoolId = req.schoolId;
      const conversations = await storage.getConversations(userId, schoolId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schoolId = req.schoolId;
      const validatedData = insertConversationSchema.parse({
        ...req.body,
        userId,
        schoolId,
      });
      const conversation = await storage.createConversation(validatedData);
      res.json(conversation);
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      res.status(400).json({ message: error.message || "Failed to create conversation" });
    }
  });

  // Message routes (Super Admin only)
  app.get('/api/conversations/:conversationId/messages', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const messages = await storage.getMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:conversationId/messages', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const userMessage = req.body.content;

      if (!userMessage || typeof userMessage !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Save user message
      const validatedUserMessage = insertMessageSchema.parse({
        conversationId,
        role: "user",
        content: userMessage,
      });
      await storage.createMessage(validatedUserMessage);

      // Get conversation history for context
      const history = await storage.getMessages(conversationId);
      const conversationHistory = history
        .slice(-10) // Last 10 messages for context
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Generate AI response
      let aiResponse: string;
      try {
        aiResponse = await aiService.generateResponse(userMessage, conversationHistory);
      } catch (error: any) {
        aiResponse = `AI service error: ${error.message}. Please ensure an API key is configured.`;
      }

      // Save AI response
      const validatedAiMessage = insertMessageSchema.parse({
        conversationId,
        role: "assistant",
        content: aiResponse,
      });
      const savedMessage = await storage.createMessage(validatedAiMessage);

      // Update conversation timestamp
      await storage.updateConversation(conversationId);

      res.json(savedMessage);
    } catch (error: any) {
      console.error("Error processing message:", error);
      res.status(500).json({ message: error.message || "Failed to process message" });
    }
  });

  // Module routes
  app.get('/api/modules', isAuthenticated, async (req: any, res) => {
    try {
      const schoolId = req.schoolId;
      const modules = await storage.getModules(schoolId);
      res.json(modules);
    } catch (error) {
      console.error("Error fetching modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.post('/api/modules', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schoolId = req.schoolId;
      const validatedData = insertModuleSchema.parse({
        ...req.body,
        createdBy: userId,
        schoolId,
      });
      const module = await storage.createModule(validatedData);
      res.json(module);
    } catch (error: any) {
      console.error("Error creating module:", error);
      res.status(400).json({ message: error.message || "Failed to create module" });
    }
  });

  app.patch('/api/modules/:moduleId', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const module = await storage.updateModule(moduleId, req.body);
      res.json(module);
    } catch (error: any) {
      console.error("Error updating module:", error);
      res.status(400).json({ message: error.message || "Failed to update module" });
    }
  });

  app.delete('/api/modules/:moduleId', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      await storage.deleteModule(moduleId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting module:", error);
      res.status(500).json({ message: error.message || "Failed to delete module" });
    }
  });

  // Code Generation Routes (Super Admin only)
  app.post('/api/generation/jobs', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schoolId = req.schoolId;
      const { requestDescription, conversationId } = req.body;

      if (!requestDescription) {
        return res.status(400).json({ message: "Request description is required" });
      }

      // Start generation process (async)
      const jobId = await codeGenerator.generateModule(userId, requestDescription, conversationId, schoolId);
      res.json({ jobId, message: "Generation started" });
    } catch (error: any) {
      console.error("Error starting generation:", error);
      res.status(500).json({ message: error.message || "Failed to start generation" });
    }
  });

  app.get('/api/generation/jobs', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schoolId = req.schoolId;
      const jobs = await storage.getGenerationJobs(userId, schoolId);
      res.json(jobs);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch generation jobs" });
    }
  });

  app.get('/api/generation/jobs/:jobId', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const job = await storage.getGenerationJob(jobId);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const artifacts = await storage.getJobArtifacts(jobId);
      const deployments = await storage.getDeploymentHistory(jobId);

      res.json({ ...job, artifacts, deployments });
    } catch (error: any) {
      console.error("Error fetching job details:", error);
      res.status(500).json({ message: "Failed to fetch job details" });
    }
  });

  app.post('/api/generation/jobs/:jobId/approve', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = req.user.claims.sub;

      const job = await storage.getGenerationJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.status !== 'review') {
        return res.status(400).json({ message: "Job is not ready for approval" });
      }

      await storage.updateGenerationJob(jobId, {
        status: "approved",
        approvedBy: userId,
      } as any);

      res.json({ message: "Job approved successfully" });
    } catch (error: any) {
      console.error("Error approving job:", error);
      res.status(500).json({ message: error.message || "Failed to approve job" });
    }
  });

  app.post('/api/generation/jobs/:jobId/deploy', isAuthenticated, isSuperAdmin, async (req: any, res) => {
    try {
      const jobId = parseInt(req.params.jobId);
      const userId = req.user.claims.sub;

      const job = await storage.getGenerationJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (job.status !== 'approved') {
        return res.status(400).json({ message: "Job must be approved before deployment" });
      }

      // Update job status
      await storage.updateGenerationJob(jobId, {
        status: "deploying",
      });

      try {
        // Get artifacts
        const artifacts = await storage.getJobArtifacts(jobId);
        const filesModified: string[] = [];

        // Apply each artifact (write to filesystem)
        for (const artifact of artifacts) {
          const filePath = path.join(process.cwd(), artifact.filePath);
          
          // Read existing file content for backup
          let existingContent = '';
          try {
            existingContent = await fs.readFile(filePath, 'utf-8');
          } catch (error) {
            // File doesn't exist yet
          }

          // Append generated code to file
          const newContent = existingContent + '\n' + artifact.generatedCode;
          await fs.writeFile(filePath, newContent, 'utf-8');
          
          filesModified.push(artifact.filePath);

          // Mark artifact as applied
          await storage.updateArtifact(artifact.id, {
            isApplied: true,
          } as any);
        }

        // Create deployment record
        await storage.createDeployment({
          jobId,
          deployedBy: userId,
          filesModified,
          status: "success",
        });

        // Update job status
        await storage.updateGenerationJob(jobId, {
          status: "deployed",
        } as any);

        res.json({ 
          message: "Deployment successful! Restart your application to see changes.",
          filesModified 
        });
      } catch (deployError: any) {
        // Mark deployment as failed
        await storage.updateGenerationJob(jobId, {
          status: "failed",
          errorMessage: deployError.message,
        });

        throw deployError;
      }
    } catch (error: any) {
      console.error("Error deploying job:", error);
      res.status(500).json({ message: error.message || "Failed to deploy job" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

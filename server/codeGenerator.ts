import { aiService } from "./aiService";
import { storage } from "./storage";
import type { InsertModuleGenerationJob, InsertGenerationArtifact } from "@shared/schema";

interface ModuleBlueprint {
  moduleName: string;
  description: string;
  entities: EntityDefinition[];
  relationships: Relationship[];
  apiRoutes: RouteDefinition[];
  uiComponents: ComponentDefinition[];
}

interface EntityDefinition {
  name: string;
  tableName: string;
  fields: FieldDefinition[];
}

interface FieldDefinition {
  name: string;
  type: string; // varchar, text, integer, boolean, timestamp, etc.
  required: boolean;
  unique?: boolean;
  default?: string;
  length?: number;
}

interface Relationship {
  from: string;
  to: string;
  type: "one-to-many" | "many-to-one" | "many-to-many";
}

interface RouteDefinition {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  requiresAuth: boolean;
  requiresSuperAdmin?: boolean;
}

interface ComponentDefinition {
  name: string;
  type: "page" | "component";
  path?: string;
  description: string;
}

export class CodeGeneratorService {
  /**
   * Generate a complete module from natural language description
   */
  async generateModule(
    userId: string,
    requestDescription: string,
    conversationId?: number,
    schoolId?: number
  ): Promise<number> {
    // Create job record
    const job = await storage.createGenerationJob({
      userId,
      conversationId: conversationId ?? null,
      moduleId: null,
      schoolId: schoolId ?? null,
      requestDescription,
      status: "generating",
    } as any);

    try {
      // Step 1: Generate module blueprint using AI
      const blueprint = await this.createBlueprint(requestDescription);
      
      // Update job with blueprint
      await storage.updateGenerationJob(job.id, {
        moduleBlueprint: blueprint as any,
        status: "generating",
      });

      // Step 2: Generate code artifacts
      await this.generateSchemaCode(job.id, blueprint);
      await this.generateStorageCode(job.id, blueprint);
      await this.generateRouteCode(job.id, blueprint);
      await this.generateFrontendCode(job.id, blueprint);

      // Step 3: Mark job as ready for review
      await storage.updateGenerationJob(job.id, {
        status: "review",
      });

      return job.id;
    } catch (error: any) {
      // Mark job as failed
      await storage.updateGenerationJob(job.id, {
        status: "failed",
        errorMessage: error.message,
      });
      throw error;
    }
  }

  /**
   * Create a structured blueprint from natural language using AI
   */
  private async createBlueprint(requestDescription: string): Promise<ModuleBlueprint> {
    const prompt = `You are a database and API architect. Given the following module request, create a detailed technical blueprint.

REQUEST: ${requestDescription}

Generate a JSON blueprint with this exact structure:
{
  "moduleName": "AttendanceManagement",
  "description": "Manages student attendance records",
  "entities": [
    {
      "name": "Attendance",
      "tableName": "attendance_records",
      "fields": [
        {"name": "id", "type": "serial", "required": true},
        {"name": "studentId", "type": "varchar", "required": true},
        {"name": "date", "type": "timestamp", "required": true},
        {"name": "status", "type": "varchar", "required": true, "length": 20},
        {"name": "remarks", "type": "text", "required": false}
      ]
    }
  ],
  "relationships": [
    {"from": "attendance_records", "to": "users", "type": "many-to-one"}
  ],
  "apiRoutes": [
    {"method": "GET", "path": "/api/attendance", "description": "List attendance records", "requiresAuth": true},
    {"method": "POST", "path": "/api/attendance", "description": "Create attendance record", "requiresAuth": true, "requiresSuperAdmin": false}
  ],
  "uiComponents": [
    {"name": "AttendancePage", "type": "page", "path": "/attendance", "description": "Attendance management page"},
    {"name": "AttendanceForm", "type": "component", "description": "Form to mark attendance"}
  ]
}

Return ONLY valid JSON, no markdown or explanation.`;

    const response = await aiService.generateResponse(prompt, []);
    
    // Parse JSON response
    try {
      // Extract JSON from markdown code blocks if present
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
      }
      return JSON.parse(jsonStr);
    } catch (error: any) {
      throw new Error(`Failed to parse blueprint JSON: ${error.message}`);
    }
  }

  /**
   * Generate database schema code (Drizzle)
   */
  private async generateSchemaCode(jobId: number, blueprint: ModuleBlueprint): Promise<void> {
    let schemaCode = `\n// ${blueprint.moduleName} Schema\n`;
    
    for (const entity of blueprint.entities) {
      schemaCode += `export const ${entity.tableName} = pgTable("${entity.tableName}", {\n`;
      
      for (const field of entity.fields) {
        const typeMapping: any = {
          'serial': 'serial',
          'varchar': `varchar`,
          'text': 'text',
          'integer': 'integer',
          'boolean': 'boolean',
          'timestamp': 'timestamp',
        };
        
        let fieldDef = `  ${field.name}: ${typeMapping[field.type] || 'text'}("${field.name}")`;
        
        if (field.name === 'id' && field.type === 'serial') {
          fieldDef += '.primaryKey()';
        }
        if (field.length) {
          fieldDef = `  ${field.name}: varchar("${field.name}", { length: ${field.length} })`;
        }
        if (field.required && field.name !== 'id') {
          fieldDef += '.notNull()';
        }
        if (field.unique) {
          fieldDef += '.unique()';
        }
        if (field.default) {
          fieldDef += `.default(${field.default})`;
        }
        if (field.type === 'timestamp' && !field.default) {
          fieldDef += '.defaultNow()';
        }
        
        schemaCode += fieldDef + ',\n';
      }
      
      schemaCode += `});\n\n`;
      
      // Add Zod schemas
      schemaCode += `export const insert${entity.name}Schema = createInsertSchema(${entity.tableName}).omit({\n`;
      schemaCode += `  id: true,\n`;
      schemaCode += `});\n\n`;
      schemaCode += `export type Insert${entity.name} = z.infer<typeof insert${entity.name}Schema>;\n`;
      schemaCode += `export type ${entity.name} = typeof ${entity.tableName}.$inferSelect;\n\n`;
    }

    await storage.createArtifact({
      jobId,
      filePath: "shared/schema.ts",
      fileType: "schema",
      generatedCode: schemaCode,
      diffPreview: `+ ${schemaCode.split('\n').length} lines added to schema.ts`,
      isApplied: false,
    });
  }

  /**
   * Generate storage layer code
   */
  private async generateStorageCode(jobId: number, blueprint: ModuleBlueprint): Promise<void> {
    let storageCode = `\n// ${blueprint.moduleName} Storage Operations\n`;
    
    for (const entity of blueprint.entities) {
      const entityNameLower = entity.name.charAt(0).toLowerCase() + entity.name.slice(1);
      
      // Get all
      storageCode += `async get${entity.name}s(): Promise<${entity.name}[]> {\n`;
      storageCode += `  return await db.select().from(${entity.tableName}).orderBy(desc(${entity.tableName}.id));\n`;
      storageCode += `}\n\n`;
      
      // Get by ID
      storageCode += `async get${entity.name}(id: number): Promise<${entity.name} | undefined> {\n`;
      storageCode += `  const [${entityNameLower}] = await db.select().from(${entity.tableName}).where(eq(${entity.tableName}.id, id));\n`;
      storageCode += `  return ${entityNameLower};\n`;
      storageCode += `}\n\n`;
      
      // Create
      storageCode += `async create${entity.name}(data: Insert${entity.name}): Promise<${entity.name}> {\n`;
      storageCode += `  const [${entityNameLower}] = await db.insert(${entity.tableName}).values(data).returning();\n`;
      storageCode += `  return ${entityNameLower};\n`;
      storageCode += `}\n\n`;
      
      // Update
      storageCode += `async update${entity.name}(id: number, data: Partial<Insert${entity.name}>): Promise<${entity.name}> {\n`;
      storageCode += `  const [${entityNameLower}] = await db.update(${entity.tableName}).set(data).where(eq(${entity.tableName}.id, id)).returning();\n`;
      storageCode += `  return ${entityNameLower};\n`;
      storageCode += `}\n\n`;
      
      // Delete
      storageCode += `async delete${entity.name}(id: number): Promise<void> {\n`;
      storageCode += `  await db.delete(${entity.tableName}).where(eq(${entity.tableName}.id, id));\n`;
      storageCode += `}\n\n`;
    }

    await storage.createArtifact({
      jobId,
      filePath: "server/storage.ts",
      fileType: "storage",
      generatedCode: storageCode,
      diffPreview: `+ ${storageCode.split('\n').length} lines added to storage.ts`,
      isApplied: false,
    });
  }

  /**
   * Generate API routes
   */
  private async generateRouteCode(jobId: number, blueprint: ModuleBlueprint): Promise<void> {
    let routeCode = `\n// ${blueprint.moduleName} API Routes\n`;
    
    for (const route of blueprint.apiRoutes) {
      const middleware = route.requiresAuth ? ', isAuthenticated' : '';
      const superAdminMiddleware = route.requiresSuperAdmin ? ', isSuperAdmin' : '';
      
      routeCode += `app.${route.method.toLowerCase()}('${route.path}'${middleware}${superAdminMiddleware}, async (req: any, res) => {\n`;
      routeCode += `  try {\n`;
      routeCode += `    // ${route.description}\n`;
      
      if (route.method === 'GET' && route.path.includes(':id')) {
        const entity = blueprint.entities[0];
        routeCode += `    const id = parseInt(req.params.id);\n`;
        routeCode += `    const data = await storage.get${entity.name}(id);\n`;
        routeCode += `    if (!data) return res.status(404).json({ message: 'Not found' });\n`;
        routeCode += `    res.json(data);\n`;
      } else if (route.method === 'GET') {
        const entity = blueprint.entities[0];
        routeCode += `    const data = await storage.get${entity.name}s();\n`;
        routeCode += `    res.json(data);\n`;
      } else if (route.method === 'POST') {
        const entity = blueprint.entities[0];
        routeCode += `    const validated = insert${entity.name}Schema.parse(req.body);\n`;
        routeCode += `    const data = await storage.create${entity.name}(validated);\n`;
        routeCode += `    res.json(data);\n`;
      } else if (route.method === 'PATCH') {
        const entity = blueprint.entities[0];
        routeCode += `    const id = parseInt(req.params.id);\n`;
        routeCode += `    const data = await storage.update${entity.name}(id, req.body);\n`;
        routeCode += `    res.json(data);\n`;
      } else if (route.method === 'DELETE') {
        const entity = blueprint.entities[0];
        routeCode += `    const id = parseInt(req.params.id);\n`;
        routeCode += `    await storage.delete${entity.name}(id);\n`;
        routeCode += `    res.json({ success: true });\n`;
      }
      
      routeCode += `  } catch (error: any) {\n`;
      routeCode += `    console.error('Error:', error);\n`;
      routeCode += `    res.status(500).json({ message: error.message });\n`;
      routeCode += `  }\n`;
      routeCode += `});\n\n`;
    }

    await storage.createArtifact({
      jobId,
      filePath: "server/routes.ts",
      fileType: "route",
      generatedCode: routeCode,
      diffPreview: `+ ${routeCode.split('\n').length} lines added to routes.ts`,
      isApplied: false,
    });
  }

  /**
   * Generate frontend components
   */
  private async generateFrontendCode(jobId: number, blueprint: ModuleBlueprint): Promise<void> {
    const mainPage = blueprint.uiComponents.find(c => c.type === 'page');
    if (!mainPage) return;

    const entity = blueprint.entities[0];
    const entityNameLower = entity.name.charAt(0).toLowerCase() + entity.name.slice(1);
    
    let componentCode = `import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ${mainPage.name}() {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ['${entity.tableName}'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/${entity.tableName}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${entity.tableName}'] });
      toast({ title: "Success", description: "${entity.name} created successfully" });
      setIsFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(\`/api/${entity.tableName}/\${id}\`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${entity.tableName}'] });
      toast({ title: "Success", description: "${entity.name} deleted successfully" });
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">${blueprint.moduleName}</h1>
          <p className="text-muted-foreground">${blueprint.description}</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} data-testid="button-create-${entityNameLower}">
          <Plus className="w-4 h-4 mr-2" />
          Add ${entity.name}
        </Button>
      </div>

      <div className="grid gap-4">
        {items?.map((item: any) => (
          <Card key={item.id} data-testid={\`card-${entityNameLower}-\${item.id}\`}>
            <CardHeader>
              <CardTitle>{item.name || '${entity.name} #' + item.id}</CardTitle>
              <CardDescription>{item.description || ''}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                onClick={() => deleteMutation.mutate(item.id)}
                data-testid={\`button-delete-${entityNameLower}-\${item.id}\`}
              >
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
`;

    await storage.createArtifact({
      jobId,
      filePath: `client/src/pages/${mainPage.name.toLowerCase()}.tsx`,
      fileType: "component",
      generatedCode: componentCode,
      diffPreview: `+ New file: ${mainPage.name.toLowerCase()}.tsx (${componentCode.split('\n').length} lines)`,
      isApplied: false,
    });
  }
}

export const codeGenerator = new CodeGeneratorService();

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Layers, Plus, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Module } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Modules() {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
  });

  const { data: modules, isLoading } = useQuery<Module[]>({
    queryKey: ["/api/modules"],
  });

  const createModuleMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/modules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      setIsDialogOpen(false);
      setFormData({ name: "", description: "", status: "active" });
      toast({
        title: "Module Created",
        description: "New module has been added successfully",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create module",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Module name is required",
        variant: "destructive",
      });
      return;
    }
    createModuleMutation.mutate(formData);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "development":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Modules</h1>
          <p className="text-muted-foreground mt-1">
            Manage your ERP system modules and features
          </p>
        </div>
        {isSuperAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-module">
                <Plus className="w-4 h-4 mr-2" />
                Add Module
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Module</DialogTitle>
                <DialogDescription>
                  Add a new module to your SmartGenEduX ERP system
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Module Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Attendance Management"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-module-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this module does..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="input-module-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger id="status" data-testid="select-module-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="development">Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createModuleMutation.isPending}
                    data-testid="button-create-module"
                  >
                    {createModuleMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Module"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isSuperAdmin && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Use VipuDev.AI to Create Modules
            </CardTitle>
            <CardDescription>
              Let AI help you design and implement new modules for your ERP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Instead of manually creating modules, you can ask VipuDev.AI to generate complete
              modules with database schemas, API endpoints, and UI components through simple
              conversation.
            </p>
            <Button variant="outline" onClick={() => (window.location.href = "/vipudev")} data-testid="button-use-ai">
              <Brain className="w-4 h-4 mr-2" />
              Open VipuDev.AI
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </>
        ) : modules && modules.length > 0 ? (
          modules.map((module) => (
            <Card key={module.id} data-testid={`card-module-${module.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <Layers className="w-8 h-8 text-primary flex-shrink-0" />
                  <Badge variant={getStatusBadgeVariant(module.status)} data-testid={`badge-status-${module.id}`}>
                    {module.status}
                  </Badge>
                </div>
                <CardTitle className="mt-2">{module.name}</CardTitle>
                <CardDescription>
                  {module.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  <p>Created: {new Date(module.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(module.updatedAt).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Modules Yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                {isSuperAdmin
                  ? "Create your first module manually or use VipuDev.AI to generate modules with AI assistance."
                  : "No modules have been created yet. Contact your administrator."}
              </p>
              {isSuperAdmin && (
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-module">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Module
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Users, Layers, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Module } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { user, isSuperAdmin } = useAuth();

  const { data: modules, isLoading: modulesLoading } = useQuery<Module[]>({
    queryKey: ["/api/modules"],
  });

  const activeModules = modules?.filter((m) => m.status === "active").length || 0;
  const totalModules = modules?.length || 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-welcome">
          Welcome back, {user?.firstName || user?.email}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your SmartGenEduX system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Modules</CardTitle>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {modulesLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold" data-testid="text-active-modules">
                {activeModules}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {totalModules} total modules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">Online</div>
            <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize" data-testid="text-role-display">
              {user?.role?.replace("_", " ")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Access level</p>
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <Card className="border-primary/50">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VipuDev.AI</CardTitle>
              <Brain className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">Ready</div>
              <p className="text-xs text-muted-foreground mt-1">AI assistant available</p>
            </CardContent>
          </Card>
        )}
      </div>

      {isSuperAdmin && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              VipuDev.AI Assistant
            </CardTitle>
            <CardDescription>
              Your AI-powered development assistant is ready to help expand your ERP system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As a Super Admin, you have exclusive access to VipuDev.AI. Use it to generate new
              modules, debug issues, analyze code, and deploy features through natural language
              conversation.
            </p>
            <Link href="/vipudev">
              <Button data-testid="button-open-vipudev">
                <Brain className="w-4 h-4 mr-2" />
                Open VipuDev.AI
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/modules">
            <Button variant="outline" className="w-full justify-start" data-testid="button-view-modules">
              <Layers className="w-4 h-4 mr-2" />
              View All Modules
            </Button>
          </Link>
          {isSuperAdmin && (
            <Link href="/vipudev">
              <Button variant="outline" className="w-full justify-start" data-testid="button-create-module">
                <Brain className="w-4 h-4 mr-2" />
                Create New Module with AI
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

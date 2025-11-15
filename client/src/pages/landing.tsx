import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, GraduationCap, Shield, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-foreground">SmartGenEduX</h1>
              <p className="text-xs text-muted-foreground">School Management ERP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => (window.location.href = "/api/login")} data-testid="button-login">
              Login
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            AI-Powered School Management
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The only ERP system that builds itself. Powered by VipuDev.AI, an advanced
            AI assistant that helps expand and maintain your system through natural language.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={() => (window.location.href = "/api/login")} data-testid="button-get-started">
              Get Started
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Brain className="w-10 h-10 text-primary mb-2" />
              <CardTitle>VipuDev.AI Assistant</CardTitle>
              <CardDescription>
                Advanced AI-powered development assistant with coding, debugging, and deployment capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Natural language understanding</li>
                <li>• Code generation & debugging</li>
                <li>• Sandbox preview environment</li>
                <li>• Permission-based deployment</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Expandable Architecture</CardTitle>
              <CardDescription>
                Build new modules and features on demand using AI assistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Create modules through conversation</li>
                <li>• AI-powered schema generation</li>
                <li>• Automatic API creation</li>
                <li>• Real-time code preview</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Secure, permission-based system with multiple user roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Super Admin access control</li>
                <li>• Admin, Teacher & Student roles</li>
                <li>• VipuDev.AI exclusive to Super Admins</li>
                <li>• Granular permissions</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Future-Ready ERP System</CardTitle>
              <CardDescription className="text-base">
                Start with the foundation, expand as you grow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                SmartGenEduX comes with user management and the VipuDev.AI module. Use the AI
                assistant to create attendance systems, grade management, fee tracking, timetables,
                and any other module your institution needs - all through simple conversation.
              </p>
              <Button size="lg" onClick={() => (window.location.href = "/api/login")} data-testid="button-start-now">
                Start Your Journey
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border mt-24">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>SmartGenEduX © 2024. AI-Powered School Management ERP.</p>
        </div>
      </footer>
    </div>
  );
}

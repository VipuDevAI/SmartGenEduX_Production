import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, Loader2, Sparkles } from "lucide-react";
import logoUrl from "@assets/SmartGenEduX_20250426_124931_0000_1763224822285.jpg";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError("");
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", data);
      
      if (response.ok) {
        window.location.href = "/";
      } else {
        const result = await response.json();
        setError(result.message || "Login failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-orange-500 to-pink-500"></div>
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_50%)]"></div>
      
      <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-700"></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="backdrop-blur-sm bg-white/10 border-b border-white/20">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoUrl} alt="SmartGenEduX" className="w-12 h-12 rounded-lg" />
              <div>
                <h1 className="text-xl font-bold text-white">SmartGenEduX</h1>
                <p className="text-xs text-white/80">Happy Automation</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-sm text-white font-medium">VipuDevAI Powered</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 shadow-2xl border-white/20">
            <CardHeader className="space-y-3 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-base">
                Sign in to access your smart school management platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@vipudev.com"
                    data-testid="input-email"
                    {...register("email")}
                    disabled={isLoading}
                    className="h-11"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    data-testid="input-password"
                    {...register("password")}
                    disabled={isLoading}
                    className="h-11"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-900/20">
                    <AlertDescription data-testid="text-error" className="text-red-800 dark:text-red-200">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium shadow-lg"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Sign In to Dashboard
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>Contact your administrator if you need an account</p>
              </div>
            </CardContent>
          </Card>
        </main>

        <footer className="backdrop-blur-sm bg-white/10 border-t border-white/20 py-6">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <p className="text-sm text-white/90">&copy; 2024 SmartGenEduX. All rights reserved.</p>
            <p className="text-xs text-white/70 mt-1">Powered by VipuDevAI - Happy Automation</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Key, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface User {
  id: string;
  email: string;
  role: string;
  schoolId: number | null;
}

interface AiConfig {
  provider: string | null;
  hasKey: boolean;
}

export default function AiSettings() {
  const { toast } = useToast();
  const [provider, setProvider] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [showKey, setShowKey] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: config, isLoading: configLoading } = useQuery<AiConfig>({
    queryKey: ["/api/schools", user?.schoolId, "ai-config"],
    enabled: !!user?.schoolId,
  });

  useEffect(() => {
    if (config?.provider) {
      setProvider(config.provider);
    }
  }, [config]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: { provider: string | null; apiKey: string | null }) => {
      return await apiRequest("PATCH", `/api/schools/${user?.schoolId}/ai-config`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools", user?.schoolId, "ai-config"] });
      toast({
        title: "AI Configuration Updated",
        description: "Your AI settings have been saved successfully.",
      });
      setApiKey("");
      setShowKey(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!provider) {
      toast({
        title: "Validation Error",
        description: "Please select an AI provider",
        variant: "destructive",
      });
      return;
    }

    if (!apiKey && !config?.hasKey) {
      toast({
        title: "Validation Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    updateConfigMutation.mutate({
      provider: provider || null,
      apiKey: apiKey || null,
    });
  };

  const handleRemoveKey = () => {
    updateConfigMutation.mutate({
      provider: null,
      apiKey: null,
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-auth" />
      </div>
    );
  }

  if (user.role !== "super_admin" && user.role !== "school_admin") {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only School Admins can access AI settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user.schoolId) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No School Assigned</AlertTitle>
          <AlertDescription>
            You are not assigned to a school. Please contact the system administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="heading-ai-settings">AI Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your school's AI provider for AI-powered modules
        </p>
      </div>

      <Alert className="mb-6">
        <Key className="h-4 w-4" />
        <AlertTitle>About AI Configuration</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            This configuration is for <strong>AI modules created for schools</strong>, not VipuDev.AI (which is only for platform developers).
          </p>
          <p>
            If you use AI features in modules created by the platform administrator, you need to configure your own API key here.
            Each school is responsible for their AI usage and costs.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle data-testid="card-title-provider">AI Provider Configuration</CardTitle>
          <CardDescription>
            Select your AI provider and enter your API key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" data-testid="loader-config" />
            </div>
          ) : (
            <>
              {config?.hasKey && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>API Key Configured</AlertTitle>
                  <AlertDescription>
                    Your school has an API key configured for {config.provider}.
                    You can update it below or remove it entirely.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="provider">AI Provider</Label>
                <Select
                  value={provider}
                  onValueChange={setProvider}
                  disabled={updateConfigMutation.isPending}
                >
                  <SelectTrigger id="provider" data-testid="select-provider">
                    <SelectValue placeholder="Select AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    <SelectItem value="openai">OpenAI (GPT-4)</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose the AI provider for your school's AI features
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={config?.hasKey ? "Enter new key to update" : "Enter your API key"}
                    disabled={updateConfigMutation.isPending}
                    data-testid="input-api-key"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowKey(!showKey)}
                    disabled={updateConfigMutation.isPending}
                    data-testid="button-toggle-key"
                  >
                    {showKey ? "Hide" : "Show"}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your API key is encrypted and stored securely. Leave empty to keep existing key.
                </p>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">How to get an API key:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <strong>Anthropic:</strong>{" "}
                    <a
                      href="https://console.anthropic.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      console.anthropic.com
                    </a>
                  </li>
                  <li>
                    <strong>OpenAI:</strong>{" "}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      platform.openai.com/api-keys
                    </a>
                  </li>
                  <li>
                    <strong>Google Gemini:</strong>{" "}
                    <a
                      href="https://makersuite.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      makersuite.google.com/app/apikey
                    </a>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={updateConfigMutation.isPending || !provider}
                  data-testid="button-save"
                >
                  {updateConfigMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Configuration
                </Button>

                {config?.hasKey && (
                  <Button
                    variant="destructive"
                    onClick={handleRemoveKey}
                    disabled={updateConfigMutation.isPending}
                    data-testid="button-remove"
                  >
                    {updateConfigMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Remove AI Configuration
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

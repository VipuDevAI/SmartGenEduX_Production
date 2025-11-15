import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Brain, Send, Plus, MessageSquare, Code, Loader2, Sparkles, CheckCircle, XCircle, Clock, Rocket, FileCode } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Conversation, Message, ModuleGenerationJob, GenerationArtifact } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function VipuDev() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, isSuperAdmin } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [moduleRequest, setModuleRequest] = useState("");
  const [showJobDetails, setShowJobDetails] = useState(false);

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "VipuDev.AI is only available to Super Admins.",
        variant: "destructive",
      });
    }
  }, [authLoading, isSuperAdmin, toast]);

  // Chat Queries
  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isSuperAdmin,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    enabled: !!selectedConversationId,
  });

  // Generation Jobs Queries
  const { data: generationJobs, isLoading: jobsLoading } = useQuery<ModuleGenerationJob[]>({
    queryKey: ["/api/generation/jobs"],
    enabled: isSuperAdmin,
    refetchInterval: 5000, // Refresh every 5 seconds to see job status updates
  });

  const { data: jobDetails } = useQuery<ModuleGenerationJob & { artifacts: GenerationArtifact[] }>({
    queryKey: ["/api/generation/jobs", selectedJobId],
    enabled: !!selectedJobId,
  });

  // Chat Mutations
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", {
        title: `Conversation ${new Date().toLocaleString()}`,
      });
      return await res.json();
    },
    onSuccess: (data: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(data.id);
      toast({
        title: "New Conversation",
        description: "Started a new conversation with VipuDev.AI",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/conversations/${selectedConversationId}/messages`, {
        content,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations", selectedConversationId, "messages"],
      });
      setMessageInput("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Make sure an AI provider is configured.",
        variant: "destructive",
      });
    },
  });

  // Module Generation Mutations
  const generateModuleMutation = useMutation({
    mutationFn: async (requestDescription: string) => {
      const res = await apiRequest("POST", "/api/generation/jobs", {
        requestDescription,
        conversationId: selectedConversationId,
      });
      return await res.json();
    },
    onSuccess: (data: { jobId: number; message: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generation/jobs"] });
      setModuleRequest("");
      toast({
        title: "Generation Started",
        description: "VipuDev.AI is generating your module. This may take a moment...",
      });
      setSelectedJobId(data.jobId);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to start module generation",
        variant: "destructive",
      });
    },
  });

  const approveJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/generation/jobs/${jobId}/approve`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/generation/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/generation/jobs", selectedJobId] });
      toast({
        title: "Job Approved",
        description: "The generation job has been approved and is ready for deployment.",
      });
    },
  });

  const deployJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/generation/jobs/${jobId}/deploy`, {});
      return await res.json();
    },
    onSuccess: (data: { message: string; filesModified: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generation/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/generation/jobs", selectedJobId] });
      toast({
        title: "Deployment Successful!",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversationId) return;
    sendMessageMutation.mutate(messageInput);
  };

  const handleGenerateModule = () => {
    if (!moduleRequest.trim()) return;
    generateModuleMutation.mutate(moduleRequest);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "generating":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "review":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "deployed":
        return <Rocket className="h-4 w-4" />;
      case "failed":
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "deployed":
        return "default";
      case "approved":
      case "review":
        return "secondary";
      case "failed":
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              VipuDev.AI is only available to Super Admin users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You need Super Admin privileges to access the AI development assistant.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">VipuDev.AI</h1>
          <Badge variant="default">Super-Powered</Badge>
        </div>
        <p className="text-muted-foreground">
          Your AI-powered development assistant - Chat, Generate, and Deploy complete modules
        </p>
      </div>

      <Tabs defaultValue="chat" className="flex-1">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="chat" data-testid="tab-chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="generate" data-testid="tab-generate">
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Module
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="flex-1">
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-16rem)]">
            {/* Conversations Sidebar */}
            <Card className="col-span-3">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Conversations</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => createConversationMutation.mutate()}
                    disabled={createConversationMutation.isPending}
                    data-testid="button-new-conversation"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-24rem)]">
                  {conversationsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : conversations && conversations.length > 0 ? (
                    <div className="space-y-2">
                      {conversations.map((conv) => (
                        <Card
                          key={conv.id}
                          className={`cursor-pointer hover-elevate active-elevate-2 ${
                            selectedConversationId === conv.id ? "bg-accent" : ""
                          }`}
                          onClick={() => setSelectedConversationId(conv.id)}
                          data-testid={`conversation-${conv.id}`}
                        >
                          <CardHeader className="p-3">
                            <CardTitle className="text-sm truncate">{conv.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {new Date(conv.updatedAt).toLocaleDateString()}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No conversations yet. Create one to get started!
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="col-span-9 flex flex-col">
              <CardHeader>
                <CardTitle>
                  {selectedConversationId ? "Chat with VipuDev.AI" : "Select a conversation"}
                </CardTitle>
                <CardDescription>
                  {selectedConversationId
                    ? "Ask questions, get code help, or request module generation"
                    : "Choose a conversation from the sidebar or create a new one"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {selectedConversationId ? (
                  <>
                    <ScrollArea className="flex-1 mb-4">
                      {messagesLoading ? (
                        <div className="space-y-4">
                          {[...Array(2)].map((_, i) => (
                            <Skeleton key={i} className="h-20 w-full" />
                          ))}
                        </div>
                      ) : messages && messages.length > 0 ? (
                        <div className="space-y-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${
                                msg.role === "user" ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-4 ${
                                  msg.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                                data-testid={`message-${msg.id}`}
                              >
                                <div className="flex items-start gap-2">
                                  {msg.role === "assistant" && (
                                    <Brain className="h-5 w-5 mt-0.5" />
                                  )}
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                {msg.codePreview && (
                                  <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
                                    <code>{msg.codePreview}</code>
                                  </pre>
                                )}
                              </div>
                            </div>
                          ))}
                          {sendMessageMutation.isPending && (
                            <div className="flex justify-start">
                              <div className="bg-muted rounded-lg p-4">
                                <Loader2 className="h-5 w-5 animate-spin" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground mt-8">
                          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      )}
                    </ScrollArea>

                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Ask VipuDev.AI anything... (e.g., 'Create an attendance management module')"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="min-h-[80px]"
                        data-testid="input-message"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || sendMessageMutation.isPending}
                        size="icon"
                        className="h-[80px]"
                        data-testid="button-send-message"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>Select or create a conversation to start chatting</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Module Generation Tab */}
        <TabsContent value="generate" className="flex-1">
          <div className="grid grid-cols-12 gap-4 h-[calc(100vh-16rem)]">
            {/* Generation Jobs List */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle className="text-lg">Generation Jobs</CardTitle>
                <CardDescription>Track your module generation requests</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  {jobsLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : generationJobs && generationJobs.length > 0 ? (
                    <div className="space-y-2">
                      {generationJobs.map((job) => (
                        <Card
                          key={job.id}
                          className={`cursor-pointer hover-elevate active-elevate-2 ${
                            selectedJobId === job.id ? "bg-accent" : ""
                          }`}
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setShowJobDetails(true);
                          }}
                          data-testid={`job-${job.id}`}
                        >
                          <CardHeader className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm">Job #{job.id}</CardTitle>
                              <Badge variant={getStatusVariant(job.status)} className="flex items-center gap-1">
                                {getStatusIcon(job.status)}
                                {job.status}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs line-clamp-2">
                              {job.requestDescription}
                            </CardDescription>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(job.createdAt).toLocaleString()}
                            </p>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground mt-8">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No generation jobs yet</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Module Request & Details */}
            <Card className="col-span-8 flex flex-col">
              <CardHeader>
                <CardTitle>
                  {showJobDetails && jobDetails ? `Job #${jobDetails.id} Details` : "Generate New Module"}
                </CardTitle>
                <CardDescription>
                  {showJobDetails && jobDetails
                    ? "Review generated code and deploy"
                    : "Describe what module you want to create"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {!showJobDetails ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="module-request">Module Description</Label>
                      <Textarea
                        id="module-request"
                        placeholder="Example: Create an Attendance Management module with student check-in/check-out, daily reports, and absence tracking."
                        value={moduleRequest}
                        onChange={(e) => setModuleRequest(e.target.value)}
                        className="min-h-[200px] mt-2"
                        data-testid="input-module-request"
                      />
                    </div>
                    <Button
                      onClick={handleGenerateModule}
                      disabled={!moduleRequest.trim() || generateModuleMutation.isPending}
                      className="w-full"
                      data-testid="button-generate-module"
                    >
                      {generateModuleMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Module
                        </>
                      )}
                    </Button>

                    <div className="mt-8 p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-2">What VipuDev.AI will create:</h3>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Database schema with Drizzle ORM</li>
                        <li>Backend API routes with validation</li>
                        <li>Storage layer CRUD operations</li>
                        <li>Frontend React components</li>
                        <li>Complete TypeScript types</li>
                      </ul>
                    </div>
                  </div>
                ) : jobDetails ? (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Request:</h3>
                        <p className="text-sm text-muted-foreground">{jobDetails.requestDescription}</p>
                      </div>
                      <Badge variant={getStatusVariant(jobDetails.status)} className="flex items-center gap-1">
                        {getStatusIcon(jobDetails.status)}
                        {jobDetails.status}
                      </Badge>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="space-y-4">
                        <h3 className="font-semibold">Generated Files:</h3>
                        {jobDetails.artifacts && jobDetails.artifacts.length > 0 ? (
                          jobDetails.artifacts.map((artifact) => (
                            <Card key={artifact.id}>
                              <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                  <FileCode className="h-4 w-4" />
                                  <CardTitle className="text-sm">{artifact.filePath}</CardTitle>
                                  <Badge variant="outline" className="ml-auto">
                                    {artifact.fileType}
                                  </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                  {artifact.diffPreview}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <pre className="bg-background p-3 rounded text-xs overflow-x-auto max-h-40">
                                  <code>{artifact.generatedCode}</code>
                                </pre>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No artifacts generated yet</p>
                        )}
                      </div>
                    </ScrollArea>

                    <div className="flex gap-2 mt-4">
                      {jobDetails.status === "review" && (
                        <Button
                          onClick={() => approveJobMutation.mutate(jobDetails.id)}
                          disabled={approveJobMutation.isPending}
                          className="flex-1"
                          data-testid="button-approve-job"
                        >
                          {approveJobMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Approving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </>
                          )}
                        </Button>
                      )}
                      {jobDetails.status === "approved" && (
                        <Button
                          onClick={() => deployJobMutation.mutate(jobDetails.id)}
                          disabled={deployJobMutation.isPending}
                          className="flex-1"
                          data-testid="button-deploy-job"
                        >
                          {deployJobMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deploying...
                            </>
                          ) : (
                            <>
                              <Rocket className="mr-2 h-4 w-4" />
                              Deploy Now
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowJobDetails(false);
                          setSelectedJobId(null);
                        }}
                        data-testid="button-back"
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

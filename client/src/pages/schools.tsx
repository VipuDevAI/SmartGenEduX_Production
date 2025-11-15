import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSchoolSchema, type School } from "@shared/schema";
import { useState } from "react";
import { Building2, Plus, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const formSchema = insertSchoolSchema.extend({
  name: z.string().min(2, "School name must be at least 2 characters"),
  subdomain: z.string().min(2, "Subdomain must be at least 2 characters").regex(/^[a-z0-9-]+$/, "Subdomain must be lowercase letters, numbers, and hyphens only"),
});

export default function SchoolsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: schools, isLoading } = useQuery<School[]>({
    queryKey: ["/api/schools"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest("/api/schools", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schools"] });
      toast({
        title: "Success",
        description: "School created successfully",
      });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subdomain: "",
      description: "",
      logo: "",
      customDomain: "",
      subscriptionTier: "free",
      isActive: true,
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createMutation.mutate(data);
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only super administrators can access school management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Schools</h1>
          <p className="text-muted-foreground">
            Manage all schools in the system
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-school">
              <Plus className="w-4 h-4 mr-2" />
              Create School
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New School</DialogTitle>
              <DialogDescription>
                Add a new school to the system. All fields are required.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ABC High School"
                          data-testid="input-school-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subdomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subdomain</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="abc-high"
                          data-testid="input-subdomain"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Used for multi-tenant routing (e.g., abc-high.school.com)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="A brief description of the school"
                          data-testid="input-description"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable or disable this school
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? "Creating..." : "Create School"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : schools && schools.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schools.map((school) => (
            <Card key={school.id} data-testid={`card-school-${school.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      {school.logo ? (
                        <img
                          src={school.logo}
                          alt={school.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-school-name-${school.id}`}>
                        {school.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground" data-testid={`text-subdomain-${school.id}`}>
                        {school.subdomain}
                      </p>
                    </div>
                  </div>
                  <Badge variant={school.isActive ? "default" : "secondary"} data-testid={`badge-status-${school.id}`}>
                    {school.isActive ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <X className="w-3 h-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {school.description && (
                  <p className="text-sm text-muted-foreground mb-3" data-testid={`text-description-${school.id}`}>
                    {school.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline" data-testid={`badge-tier-${school.id}`}>
                    {school.subscriptionTier}
                  </Badge>
                  {school.customDomain && (
                    <span className="text-muted-foreground" data-testid={`text-domain-${school.id}`}>
                      {school.customDomain}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No schools yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Create your first school to get started with the multi-tenant ERP system.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

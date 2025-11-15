import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Settings() {
  const { user } = useAuth();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details and role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-medium" data-testid="text-profile-name">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : "User"}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-profile-email">
                {user?.email || "No email"}
              </p>
              <Badge variant="outline" className="mt-2 capitalize" data-testid="badge-profile-role">
                {user?.role?.replace("_", " ")}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div className="space-y-1">
              <Label className="text-muted-foreground">User ID</Label>
              <p className="text-sm font-mono">{user?.id}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Account Created</Label>
              <p className="text-sm">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">First Name</Label>
              <p className="text-sm">{user?.firstName || "Not set"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground">Last Name</Label>
              <p className="text-sm">{user?.lastName || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize your interface appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access & Permissions</CardTitle>
          <CardDescription>Your role and system access level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Current Role</Label>
              <p className="text-sm mt-1 capitalize">
                {user?.role?.replace("_", " ")}
              </p>
            </div>
            <div className="pt-4 border-t border-border">
              <Label className="mb-2 block">Permissions</Label>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {user?.role === "super_admin" && (
                  <>
                    <li>✓ Full system access</li>
                    <li>✓ VipuDev.AI access</li>
                    <li>✓ Module management</li>
                    <li>✓ User administration</li>
                  </>
                )}
                {user?.role === "admin" && (
                  <>
                    <li>✓ Module viewing</li>
                    <li>✓ User management (limited)</li>
                    <li>✗ VipuDev.AI access (Super Admin only)</li>
                  </>
                )}
                {user?.role === "teacher" && (
                  <>
                    <li>✓ Module viewing</li>
                    <li>✗ Module creation</li>
                    <li>✗ VipuDev.AI access</li>
                  </>
                )}
                {user?.role === "student" && (
                  <>
                    <li>✓ Basic access</li>
                    <li>✗ Module management</li>
                    <li>✗ VipuDev.AI access</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail, Calendar, Shield, Key } from "lucide-react";

export const Route = createFileRoute("/dashboard/users")({ component: UsersPage });

function UsersPage() {
  const { user } = useAuth();
  if (!user) return null;

  const created = user.created_at ? new Date(user.created_at).toLocaleString() : "—";
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—";
  const initials = (user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account</h1>
        <p className="text-muted-foreground">Your profile and session details.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-5">
          <Avatar className="h-20 w-20 ring-2 ring-primary/30">
            <AvatarImage src={(user.user_metadata as { avatar_url?: string })?.avatar_url} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 min-w-0">
            <h2 className="text-xl font-semibold">
              {(user.user_metadata as { full_name?: string })?.full_name ?? user.email}
            </h2>
            <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>
            <div className="flex flex-wrap gap-1.5 pt-2">
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" /> Owner
              </Badge>
              {user.email_confirmed_at && <Badge variant="secondary">Email verified</Badge>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" /> Joined
          </div>
          <p className="mt-1 font-medium">{created}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" /> Last sign-in
          </div>
          <p className="mt-1 font-medium">{lastSignIn}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Key className="h-4 w-4" /> User ID
          </div>
          <p className="mt-1 font-mono text-xs break-all">{user.id}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" /> Provider
          </div>
          <p className="mt-1 font-medium capitalize">
            {user.app_metadata?.provider ?? "email"}
          </p>
        </Card>
      </div>
    </div>
  );
}

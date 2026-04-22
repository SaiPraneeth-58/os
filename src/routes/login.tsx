import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally { setBusy(false); }
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await signUp(email, password, displayName || undefined);
      toast.success("Account created. You can sign in now.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-up failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6">
        <Link to="/" className="inline-flex items-center gap-2 font-semibold text-foreground">
          <Sparkles className="h-5 w-5 text-primary" /> JARVIS OS
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to JARVIS OS</CardTitle>
            <CardDescription>Sign in or create your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={onSignIn} className="space-y-4 mt-4">
                  <div><Label htmlFor="si-email">Email</Label><Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label htmlFor="si-pwd">Password</Label><Input id="si-pwd" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in..." : "Sign in"}</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={onSignUp} className="space-y-4 mt-4">
                  <div><Label htmlFor="su-name">Display name</Label><Input id="su-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
                  <div><Label htmlFor="su-email">Email</Label><Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div><Label htmlFor="su-pwd">Password</Label><Input id="su-pwd" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                  <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating..." : "Create account"}</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

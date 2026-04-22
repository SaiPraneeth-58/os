import { supabaseForUser } from "@/integrations/supabase/admin.server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthedContext = { userId: string; supabase: SupabaseClient; token: string };

export async function requireAuth(request: Request): Promise<AuthedContext> {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const token = auth.slice("Bearer ".length);
  const sb = supabaseForUser(token);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) throw new Response("Unauthorized", { status: 401 });
  return { userId: data.user.id, supabase: sb, token };
}

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export async function readJson<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Response("Invalid JSON", { status: 400 });
  }
}

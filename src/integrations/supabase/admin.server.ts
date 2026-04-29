import { createClient } from "@supabase/supabase-js";

// SERVER ONLY — never import from client code.
const SUPABASE_URL = process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.JARVIS_SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!serviceKey) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY not set");
}

export const supabaseAdmin = createClient(SUPABASE_URL, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function supabaseForUser(accessToken: string) {
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

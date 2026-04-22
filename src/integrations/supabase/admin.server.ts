import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./client";

// SERVER ONLY — never import from client code.
const serviceKey = process.env.JARVIS_SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.warn("JARVIS_SUPABASE_SERVICE_ROLE_KEY not set");
}

export const supabaseAdmin = createClient(SUPABASE_URL, serviceKey ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function supabaseForUser(accessToken: string) {
  return createClient(SUPABASE_URL, serviceKey ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// SERVER ONLY — never import from client code.
function getEnv() {
  const url =
    process.env.SUPABASE_URL ??
    (typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_SUPABASE_URL : "") ??
    "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.JARVIS_SUPABASE_SERVICE_ROLE_KEY ??
    "";
  if (!url) throw new Error("SUPABASE_URL not set");
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return { url, serviceKey };
}

let _admin: SupabaseClient | undefined;
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_t, prop, receiver) {
    if (!_admin) {
      const { url, serviceKey } = getEnv();
      _admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return Reflect.get(_admin, prop, receiver);
  },
});

export function supabaseForUser(accessToken: string) {
  const { url, serviceKey } = getEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

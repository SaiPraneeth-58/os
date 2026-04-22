import { createClient } from "@supabase/supabase-js";

// Public values — safe to ship in the client bundle.
export const SUPABASE_URL = "https://akthkogsziyzwtmdlwoq.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrdGhrb2dzeml5end0bWRsd29xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzA5ODcsImV4cCI6MjA5MDM0Njk4N30.YvvUMmAVZH8ysRSC_dw9ZX8C6UKURIRm5oi9L5kQvLg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

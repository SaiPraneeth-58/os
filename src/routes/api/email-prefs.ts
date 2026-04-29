import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";

const PrefsInput = z.object({
  manager_email: z.string().email().max(320),
  enabled: z.boolean().optional(),
});

export const Route = createFileRoute("/api/email-prefs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabase, userId } = await requireAuth(request);
        const { data, error } = await supabase
          .from("user_email_prefs")
          .select("manager_email, enabled, send_hour_ist, send_minute_ist")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ prefs: data });
      },

      PUT: async ({ request }) => {
        const { supabase, userId } = await requireAuth(request);
        const body = PrefsInput.parse(await readJson(request));
        const { data, error } = await supabase
          .from("user_email_prefs")
          .upsert(
            { user_id: userId, ...body },
            { onConflict: "user_id" },
          )
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ prefs: data });
      },
    },
  },
});

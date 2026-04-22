import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";

const Patch = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  due_at: z.string().datetime().optional().nullable(),
});

export const Route = createFileRoute("/api/tasks/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const ctx = await requireAuth(request);
        const body = Patch.parse(await readJson(request));
        const { data, error } = await ctx.supabase
          .from("tasks")
          .update(body)
          .eq("id", params.id)
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ task: data });
      },
      DELETE: async ({ request, params }) => {
        const ctx = await requireAuth(request);
        const { error } = await ctx.supabase.from("tasks").delete().eq("id", params.id);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";

const Patch = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(50000).optional(),
  summary: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const Route = createFileRoute("/api/notes/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const ctx = await requireAuth(request);
        const body = Patch.parse(await readJson(request));
        const { data, error } = await ctx.supabase
          .from("notes")
          .update({ ...body, updated_at: new Date().toISOString() })
          .eq("id", params.id)
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ note: data });
      },
      DELETE: async ({ request, params }) => {
        const ctx = await requireAuth(request);
        const { error } = await ctx.supabase.from("notes").delete().eq("id", params.id);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ ok: true });
      },
    },
  },
});

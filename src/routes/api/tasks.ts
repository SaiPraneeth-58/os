import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";

const TaskInput = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  due_at: z.string().datetime().optional().nullable(),
  ai_generated: z.boolean().optional(),
});

export const Route = createFileRoute("/api/tasks")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabase } = await requireAuth(request);
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ tasks: data });
      },
      POST: async ({ request }) => {
        const ctx = await requireAuth(request);
        const body = TaskInput.parse(await readJson(request));
        const { data, error } = await ctx.supabase
          .from("tasks")
          .insert({ ...body, user_id: ctx.userId })
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ task: data }, 201);
      },
    },
  },
});

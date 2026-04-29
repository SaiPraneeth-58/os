import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";

const ProjectCreate = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional().nullable(),
});

const ProjectUpdate = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  progress: z.number().int().min(0).max(100).optional(),
  progress_overridden: z.boolean().optional(),
  daily_note: z.string().max(2000).optional().nullable(),
  worked_today: z.boolean().optional(),
});

const ProjectDelete = z.object({ id: z.string().uuid() });

function todayIST(): string {
  const now = new Date();
  // IST = UTC+5:30
  const ist = new Date(now.getTime() + (5 * 60 + 30) * 60_000);
  return ist.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/api/projects")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabase } = await requireAuth(request);
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ projects: data });
      },

      POST: async ({ request }) => {
        const { supabase, userId } = await requireAuth(request);
        const body = ProjectCreate.parse(await readJson(request));
        const { data, error } = await supabase
          .from("projects")
          .insert({ ...body, user_id: userId })
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ project: data }, 201);
      },

      PUT: async ({ request }) => {
        const { supabase, userId } = await requireAuth(request);
        const input = ProjectUpdate.parse(await readJson(request));
        const { id, worked_today, ...patch } = input;

        // Fetch current to compute deltas
        const { data: current } = await supabase
          .from("projects")
          .select("progress, daily_note, worked_on_date")
          .eq("id", id)
          .single();

        const today = todayIST();
        const update: Record<string, unknown> = { ...patch };

        if (typeof patch.progress === "number") {
          update.last_progress_change_at = new Date().toISOString();
          if (current && patch.progress !== current.progress) {
            update.worked_on_date = today;
          }
        }
        if (worked_today === true) update.worked_on_date = today;
        if (worked_today === false) update.worked_on_date = null;

        const { data, error } = await supabase
          .from("projects")
          .update(update)
          .eq("id", id)
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);

        // Upsert daily log
        if (data && (typeof patch.progress === "number" || patch.daily_note !== undefined || worked_today !== undefined)) {
          const startProgress = current?.progress ?? 0;
          const endProgress = typeof patch.progress === "number" ? patch.progress : startProgress;
          await supabase.from("project_daily_log").upsert(
            {
              project_id: id,
              user_id: userId,
              log_date: today,
              progress_start: startProgress,
              progress_end: endProgress,
              note: patch.daily_note ?? data.daily_note ?? null,
              worked_marked: worked_today ?? !!data.worked_on_date,
            },
            { onConflict: "project_id,log_date" },
          );
        }

        return jsonResponse({ project: data });
      },

      DELETE: async ({ request }) => {
        const { supabase } = await requireAuth(request);
        const { id } = ProjectDelete.parse(await readJson(request));
        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true });
      },
    },
  },
});

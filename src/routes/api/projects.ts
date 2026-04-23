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
});

const ProjectDelete = z.object({
  id: z.string().uuid(),
});

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
        const { supabase } = await requireAuth(request);
        const body = ProjectCreate.parse(await readJson(request));
        const { data, error } = await supabase
          .from("projects")
          .insert(body)
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ project: data }, 201);
      },

      PUT: async ({ request }) => {
        const { supabase } = await requireAuth(request);
        const { id, ...patch } = ProjectUpdate.parse(await readJson(request));
        if (Object.keys(patch).length === 0) {
          return jsonResponse({ error: "No fields to update" }, 400);
        }
        const { data, error } = await supabase
          .from("projects")
          .update(patch)
          .eq("id", id)
          .select()
          .single();
        if (error) return jsonResponse({ error: error.message }, 500);
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

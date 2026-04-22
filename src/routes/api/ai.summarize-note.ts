import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";
import { openai, DEFAULT_MODEL } from "@/server/openai.server";

const Body = z.object({ noteId: z.string().uuid() });

export const Route = createFileRoute("/api/ai/summarize-note")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await requireAuth(request);
        const { noteId } = Body.parse(await readJson(request));
        const { data: note, error } = await ctx.supabase.from("notes").select("*").eq("id", noteId).single();
        if (error || !note) return jsonResponse({ error: "Note not found" }, 404);

        const resp = await openai().chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: "Summarize the note in 1-2 concise sentences." },
            { role: "user", content: `Title: ${note.title}\n\n${note.content ?? ""}` },
          ],
          temperature: 0.3,
        });
        const summary = resp.choices[0]?.message?.content?.trim() ?? "";
        const { data: updated } = await ctx.supabase.from("notes").update({ summary, updated_at: new Date().toISOString() }).eq("id", noteId).select().single();
        return jsonResponse({ note: updated });
      },
    },
  },
});

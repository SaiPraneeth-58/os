import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse, requireAuth } from "@/server/auth.server";
import { openai, DEFAULT_MODEL } from "@/server/openai.server";

export const Route = createFileRoute("/api/ai/briefing")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await requireAuth(request);
        const today = new Date();
        const start = new Date(today); start.setHours(0, 0, 0, 0);
        const end = new Date(today); end.setHours(23, 59, 59, 999);

        const [{ data: tasks }, { data: events }] = await Promise.all([
          ctx.supabase.from("tasks").select("*").neq("status", "done").order("priority", { ascending: false }).limit(20),
          ctx.supabase.from("events").select("*").gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString()).order("starts_at"),
        ]);

        const prompt = `You are JARVIS, a personal AI assistant. Provide a short morning briefing (3-5 sentences) for the user.
Today is ${today.toDateString()}.
Open tasks: ${JSON.stringify(tasks?.map((t) => ({ title: t.title, priority: t.priority, due_at: t.due_at })) ?? [])}
Today's events: ${JSON.stringify(events?.map((e) => ({ title: e.title, starts_at: e.starts_at })) ?? [])}
Be concise, warm, and actionable. Use markdown.`;

        try {
          const resp = await openai().chat.completions.create({
            model: DEFAULT_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          });
          const briefing = resp.choices[0]?.message?.content ?? "Have a productive day.";
          return jsonResponse({ briefing, tasksCount: tasks?.length ?? 0, eventsCount: events?.length ?? 0 });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "AI error";
          return jsonResponse({ briefing: `Good morning. You have ${tasks?.length ?? 0} open tasks and ${events?.length ?? 0} events today. (AI unavailable: ${msg})`, tasksCount: tasks?.length ?? 0, eventsCount: events?.length ?? 0 });
        }
      },
    },
  },
});

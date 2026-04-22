import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";
import { openai, DEFAULT_MODEL } from "@/server/openai.server";

const Body = z.object({
  threadId: z.string().uuid(),
  content: z.string().min(1).max(8000),
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await requireAuth(request);
        const { threadId, content } = Body.parse(await readJson(request));

        // Save user message
        await ctx.supabase.from("chat_messages").insert({
          thread_id: threadId, user_id: ctx.userId, role: "user", content,
        });

        // Load thread history + user context
        const [{ data: history }, { data: tasks }, { data: notes }, { data: events }] = await Promise.all([
          ctx.supabase.from("chat_messages").select("role,content").eq("thread_id", threadId).order("created_at").limit(40),
          ctx.supabase.from("tasks").select("title,status,priority,due_at").neq("status", "done").limit(15),
          ctx.supabase.from("notes").select("title,summary").order("updated_at", { ascending: false }).limit(10),
          ctx.supabase.from("events").select("title,starts_at,location").gte("starts_at", new Date().toISOString()).order("starts_at").limit(10),
        ]);

        const systemPrompt = `You are JARVIS, a personal AI assistant. Be concise, helpful, and proactive.
User context (use only if relevant):
- Open tasks: ${JSON.stringify(tasks ?? [])}
- Recent notes: ${JSON.stringify(notes ?? [])}
- Upcoming events: ${JSON.stringify(events ?? [])}`;

        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...(history ?? []).map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
        ];

        const stream = await openai().chat.completions.create({
          model: DEFAULT_MODEL,
          messages,
          stream: true,
          temperature: 0.7,
        });

        let assistantText = "";
        const encoder = new TextEncoder();
        const supabase = ctx.supabase;
        const userId = ctx.userId;

        const sse = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta?.content;
                if (delta) {
                  assistantText += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                }
              }
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            } catch (e) {
              const msg = e instanceof Error ? e.message : "stream error";
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
            } finally {
              if (assistantText) {
                await supabase.from("chat_messages").insert({
                  thread_id: threadId, user_id: userId, role: "assistant", content: assistantText,
                });
              }
              controller.close();
            }
          },
        });

        return new Response(sse, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      },
    },
  },
});

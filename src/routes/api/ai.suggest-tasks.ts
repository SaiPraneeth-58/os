import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";
import { openai, DEFAULT_MODEL } from "@/server/openai.server";

const Body = z.object({ context: z.string().max(2000).optional() });

export const Route = createFileRoute("/api/ai/suggest-tasks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ctx = await requireAuth(request);
        const body = Body.parse(await readJson(request));

        const { data: existing } = await ctx.supabase
          .from("tasks").select("title,status").order("created_at", { ascending: false }).limit(20);

        const resp = await openai().chat.completions.create({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: "You suggest 3-5 actionable tasks for the user based on their existing context." },
            { role: "user", content: `Existing tasks: ${JSON.stringify(existing ?? [])}\nUser context: ${body.context ?? "(none)"}\nReturn structured suggestions.` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "suggest_tasks",
              description: "Return 3-5 actionable task suggestions.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                      },
                      required: ["title", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "suggest_tasks" } },
        });

        const toolCall = resp.choices[0]?.message?.tool_calls?.[0];
        const argStr = toolCall && "function" in toolCall ? toolCall.function.arguments : null;
        const args = argStr ? JSON.parse(argStr) : { suggestions: [] };
        return jsonResponse({ suggestions: args.suggestions ?? [] });
      },
    },
  },
});

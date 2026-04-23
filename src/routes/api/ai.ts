import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { jsonResponse, readJson, requireAuth } from "@/server/auth.server";
import { openai, DEFAULT_MODEL } from "@/server/openai.server";

const JARVIS_SYSTEM =
  "You are Jarvis — a calm, professional AI assistant. " +
  "Always respond in 1–3 short, intelligent sentences. " +
  "Be precise, courteous, and avoid filler.";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("summarize"),
    text: z.string().min(1).max(8000),
  }),
  z.object({
    action: z.literal("prompt"),
    prompt: z.string().min(1).max(4000),
  }),
]);

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await requireAuth(request);
        const body = Body.parse(await readJson(request));

        const userMessage =
          body.action === "summarize"
            ? `Summarize this project description in one tight sentence:\n\n${body.text}`
            : body.prompt;

        try {
          const resp = await openai().chat.completions.create({
            model: DEFAULT_MODEL,
            messages: [
              { role: "system", content: JARVIS_SYSTEM },
              { role: "user", content: userMessage },
            ],
            temperature: 0.3,
            max_tokens: 200,
          });
          const result = resp.choices[0]?.message?.content?.trim() ?? "";
          return jsonResponse({ result });
        } catch (err) {
          console.error("AI request failed:", err);
          return jsonResponse(
            { error: err instanceof Error ? err.message : "AI request failed" },
            500,
          );
        }
      },
    },
  },
});

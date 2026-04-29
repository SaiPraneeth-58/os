import { supabase } from "@/integrations/supabase/client";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jarvis-chat`;

export type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

export async function streamJarvisChat({
  messages,
  model,
  signal,
  onDelta,
  onDone,
  onError,
}: {
  messages: ChatMsg[];
  model?: string;
  signal?: AbortSignal;
  onDelta: (chunk: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}) {
  try {
    const { data: sessionRes } = await supabase.auth.getSession();
    const token = sessionRes.session?.access_token;
    if (!token) throw new Error("Not signed in");

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ messages, model }),
      signal,
    });

    if (!resp.ok || !resp.body) {
      let errMsg = `Request failed (${resp.status})`;
      try {
        const j = await resp.json();
        if (j?.error) errMsg = j.error;
      } catch {
        /* ignore */
      }
      throw new Error(errMsg);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;

    while (!done) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line || line.startsWith(":")) continue;
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") {
          done = true;
          break;
        }
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }

    if (buffer.trim()) {
      for (let raw of buffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const json = raw.slice(6).trim();
        if (json === "[DONE]") continue;
        try {
          const parsed = JSON.parse(json);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          /* ignore */
        }
      }
    }

    onDone();
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      onDone();
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

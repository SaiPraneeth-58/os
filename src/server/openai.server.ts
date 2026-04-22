import OpenAI from "openai";

let _client: OpenAI | null = null;
export function openai() {
  if (_client) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");
  _client = new OpenAI({ apiKey: key });
  return _client;
}

export const DEFAULT_MODEL = "gpt-4o-mini";

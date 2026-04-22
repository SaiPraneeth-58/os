import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api-client";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Plus, Brain } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Thread = { id: string; title: string; created_at: string };
type Msg = { id?: string; role: "user" | "assistant" | "system"; content: string };

export function ChatPanel() {
  const qc = useQueryClient();
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [localMsgs, setLocalMsgs] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const threads = useQuery({ queryKey: ["threads"], queryFn: () => apiJson<{ threads: Thread[] }>("/api/threads") });
  const messages = useQuery({
    queryKey: ["messages", activeThread],
    queryFn: () => apiJson<{ messages: Msg[] }>(`/api/threads/${activeThread}/messages`),
    enabled: !!activeThread,
  });

  useEffect(() => { setLocalMsgs(messages.data?.messages ?? []); }, [messages.data]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [localMsgs]);

  const newThread = useMutation({
    mutationFn: () => apiJson<{ thread: Thread }>("/api/threads", { method: "POST" }),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["threads"] }); setActiveThread(d.thread.id); setLocalMsgs([]); },
  });

  async function send() {
    if (!draft.trim() || !activeThread || streaming) return;
    const userText = draft.trim();
    setDraft("");
    setLocalMsgs((m) => [...m, { role: "user", content: userText }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ threadId: activeThread, content: userText }),
      });
      if (!resp.ok || !resp.body) throw new Error(`Chat failed: ${resp.status}`);

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const j = JSON.parse(payload);
            if (j.error) toast.error(j.error);
            if (j.delta) {
              assistantText += j.delta;
              setLocalMsgs((prev) => {
                const copy = prev.slice();
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
      qc.invalidateQueries({ queryKey: ["messages", activeThread] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stream failed");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold flex items-center gap-2"><Brain className="h-7 w-7 text-primary" /> Jarvis</h1><p className="text-muted-foreground mt-1">Context-aware streaming assistant.</p></div>
        <Button onClick={() => newThread.mutate()}><Plus className="h-4 w-4 mr-2" />New thread</Button>
      </div>

      <div className="grid md:grid-cols-[240px_1fr] gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Threads</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {threads.data?.threads.length === 0 && <p className="text-sm text-muted-foreground">Create a thread.</p>}
            {threads.data?.threads.map((t) => (
              <button key={t.id} onClick={() => setActiveThread(t.id)}
                className={`w-full text-left rounded-md p-2 text-sm ${activeThread === t.id ? "bg-accent" : "hover:bg-accent/50"}`}>
                <div className="truncate">{t.title}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[600px]">
          <CardContent className="flex-1 overflow-auto pt-6 space-y-4" ref={scrollRef}>
            {!activeThread && <p className="text-sm text-muted-foreground">Select or create a thread to start chatting.</p>}
            {activeThread && localMsgs.length === 0 && <p className="text-sm text-muted-foreground">Say hello to Jarvis…</p>}
            {localMsgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`rounded-lg px-3 py-2 max-w-[85%] ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                    <ReactMarkdown>{m.content || (streaming && i === localMsgs.length - 1 ? "…" : "")}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <div className="border-t border-border p-3">
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <Input placeholder={activeThread ? "Ask Jarvis…" : "Create a thread first"} value={draft} disabled={!activeThread || streaming}
                onChange={(e) => setDraft(e.target.value)} />
              <Button type="submit" disabled={!activeThread || streaming || !draft.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}

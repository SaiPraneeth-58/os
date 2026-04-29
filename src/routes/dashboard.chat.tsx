import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { streamJarvisChat, type ChatMsg } from "@/lib/jarvis-chat";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Send,
  Square,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/chat")({ component: ChatPage });

type Thread = {
  id: string;
  title: string;
  model: string;
  last_message_at: string;
  created_at: string;
};

type DbMessage = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (fast)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "openai/gpt-5-mini", label: "GPT-5 mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
];

const QUICK_PROMPTS = [
  { label: "Plan my day", prompt: "Help me plan my day. Ask me 2 quick questions, then give me a focused, time-blocked schedule." },
  { label: "Brainstorm ideas", prompt: "Give me 7 creative ideas about: " },
  { label: "Summarize text", prompt: "Summarize this in 3 bullet points and 1 key takeaway:\n\n" },
  { label: "Draft an email", prompt: "Draft a professional email about: " },
  { label: "Explain like I'm 5", prompt: "Explain this in simple terms with one analogy: " },
  { label: "Code review", prompt: "Review this code, point out issues, and suggest improvements:\n\n```\n\n```" },
];

// ---------- API helpers ----------

async function fetchThreads(userId: string): Promise<Thread[]> {
  const { data, error } = await supabase
    .from("chat_threads")
    .select("id,title,model,last_message_at,created_at")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchMessages(threadId: string): Promise<DbMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id,thread_id,role,content,created_at")
    .eq("thread_id", threadId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as DbMessage[];
}

// ---------- Voice helpers ----------

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance })
      .SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance })
      .webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  u.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// ---------- Component ----------

function ChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [model, setModel] = useState(MODELS[0].value);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userId = user?.id;

  const threadsQuery = useQuery({
    queryKey: ["chat-threads", userId],
    queryFn: () => fetchThreads(userId!),
    enabled: !!userId,
  });

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", activeThreadId],
    queryFn: () => fetchMessages(activeThreadId!),
    enabled: !!activeThreadId,
  });

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  // Auto-select first thread or null state
  useEffect(() => {
    if (!activeThreadId && threadsQuery.data && threadsQuery.data.length > 0) {
      setActiveThreadId(threadsQuery.data[0].id);
      setModel(threadsQuery.data[0].model);
    }
  }, [threadsQuery.data, activeThreadId]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamText, streaming]);

  // ---------- Mutations ----------

  const newThread = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("chat_threads")
        .insert({ user_id: userId, title: "New chat", model })
        .select()
        .single();
      if (error) throw error;
      return data as Thread;
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["chat-threads", userId] });
      setActiveThreadId(t.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteThread = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_threads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_v, id) => {
      qc.invalidateQueries({ queryKey: ["chat-threads", userId] });
      if (activeThreadId === id) setActiveThreadId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ---------- Send message ----------

  async function ensureThread(): Promise<string> {
    if (activeThreadId) return activeThreadId;
    const t = await newThread.mutateAsync();
    return t.id;
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming || !userId) return;

    setInput("");
    stopSpeaking();
    setStreaming(true);
    setStreamText("");

    let threadId: string;
    try {
      threadId = await ensureThread();
    } catch {
      setStreaming(false);
      return;
    }

    // Persist user message
    const { error: insertErr } = await supabase.from("chat_messages").insert({
      thread_id: threadId,
      user_id: userId,
      role: "user",
      content: trimmed,
    });
    if (insertErr) {
      toast.error(insertErr.message);
      setStreaming(false);
      return;
    }

    // If first message, set thread title from prompt
    const isFirst = messages.length === 0;
    if (isFirst) {
      const title = trimmed.slice(0, 60);
      await supabase.from("chat_threads").update({ title, model }).eq("id", threadId);
      qc.invalidateQueries({ queryKey: ["chat-threads", userId] });
    }

    await qc.invalidateQueries({ queryKey: ["chat-messages", threadId] });

    // Build history
    const history: ChatMsg[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content }) as ChatMsg),
      { role: "user", content: trimmed },
    ];

    // Stream assistant response
    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";

    await streamJarvisChat({
      messages: history,
      model,
      signal: controller.signal,
      onDelta: (chunk) => {
        acc += chunk;
        setStreamText(acc);
      },
      onDone: async () => {
        if (acc.trim()) {
          await supabase.from("chat_messages").insert({
            thread_id: threadId,
            user_id: userId,
            role: "assistant",
            content: acc,
          });
          await qc.invalidateQueries({ queryKey: ["chat-messages", threadId] });
          if (ttsEnabled) speak(acc);
        }
        setStreamText("");
        setStreaming(false);
        abortRef.current = null;
      },
      onError: (err) => {
        toast.error(err.message);
        setStreamText("");
        setStreaming(false);
        abortRef.current = null;
      },
    });
  }

  function abortStream() {
    abortRef.current?.abort();
  }

  // ---------- Voice input ----------

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = getSpeechRecognition();
    if (!rec) {
      toast.error("Voice input not supported in this browser");
      return;
    }
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      const results = e.results;
      for (let i = 0; i < results.length; i++) {
        const alt = results[i]?.[0];
        if (alt) interim += alt.transcript;
      }
      finalText = interim;
      setInput(interim);
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") toast.error(`Voice error: ${e.error}`);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) {
        sendMessage(finalText);
      }
    };
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  }

  // ---------- Render ----------

  const activeThread = threadsQuery.data?.find((t) => t.id === activeThreadId);
  const showEmpty = !activeThreadId || messages.length === 0;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex">
      {/* Threads sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border/60 bg-background/40 backdrop-blur-xl">
        <div className="p-3 border-b border-border/60">
          <Button
            className="w-full gap-2"
            onClick={() => newThread.mutate()}
            disabled={newThread.isPending}
          >
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {threadsQuery.isLoading && (
              <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            )}
            {threadsQuery.data?.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No conversations yet. Start a new chat.
              </p>
            )}
            {threadsQuery.data?.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition",
                  activeThreadId === t.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-muted/60",
                )}
                onClick={() => {
                  setActiveThreadId(t.id);
                  setModel(t.model);
                }}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{t.title}</span>
                <button
                  type="button"
                  aria-label="Delete chat"
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this chat?")) deleteThread.mutate(t.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Conversation */}
      <div className="flex-1 flex min-w-0 flex-col">
        {/* Top toolbar */}
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-background/40 backdrop-blur-xl px-4 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">
              {activeThread?.title ?? "New conversation"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={ttsEnabled ? "Disable voice replies" : "Enable voice replies"}
              onClick={() => {
                if (ttsEnabled) stopSpeaking();
                setTtsEnabled((v) => !v);
              }}
            >
              {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
            {showEmpty && !streaming && (
              <EmptyState onPick={(p) => setInput(p)} />
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}

            {streaming && (
              <MessageBubble role="assistant" content={streamText || "…"} streaming />
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="border-t border-border/60 bg-background/40 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto p-3">
            <Card className="glass p-2">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask JARVIS anything… (Shift+Enter for newline)"
                  className="min-h-[44px] max-h-40 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  disabled={streaming}
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant={listening ? "default" : "ghost"}
                    size="icon"
                    aria-label="Voice input"
                    onClick={toggleListening}
                    disabled={streaming}
                  >
                    {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  {streaming ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      aria-label="Stop"
                      onClick={abortStream}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      aria-label="Send"
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
            <p className="mt-1.5 text-[11px] text-muted-foreground text-center">
              JARVIS can make mistakes. Verify important info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-primary flex items-center justify-center shadow-elevated">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-soft",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "glass rounded-bl-sm",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <>
            <Markdown>{content}</Markdown>
            {streaming && (
              <span className="inline-block w-2 h-4 bg-primary/70 align-middle animate-pulse ml-0.5" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="py-8 sm:py-12 text-center space-y-6">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-elevated">
        <Sparkles className="h-7 w-7 text-primary-foreground" />
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">How can I help?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a prompt below or just start typing.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 max-w-2xl mx-auto">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.label}
            type="button"
            className="glass text-left rounded-xl p-3 text-sm transition hover:-translate-y-0.5 hover:shadow-elevated"
            onClick={() => onPick(q.prompt)}
          >
            <div className="font-medium">{q.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {q.prompt}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

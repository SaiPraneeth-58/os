import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Ev = { id: string; title: string; description: string | null; starts_at: string; ends_at: string; location: string | null };

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarPanel() {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["events"], queryFn: () => apiJson<{ events: Ev[] }>("/api/events") });

  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  const [form, setForm] = useState({ title: "", starts_at: toLocalInput(now), ends_at: toLocalInput(later), location: "" });

  const create = useMutation({
    mutationFn: () =>
      apiJson("/api/events", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: new Date(form.ends_at).toISOString(),
          location: form.location || null,
        }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); setForm({ ...form, title: "", location: "" }); toast.success("Event added"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiJson(`/api/events/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Calendar</h1><p className="text-muted-foreground mt-1">Your upcoming events.</p></div>

      <Card>
        <CardHeader><CardTitle className="text-base">Add event</CardTitle></CardHeader>
        <CardContent>
          <form className="grid md:grid-cols-5 gap-2" onSubmit={(e) => { e.preventDefault(); if (form.title.trim()) create.mutate(); }}>
            <Input className="md:col-span-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            <Button type="submit" disabled={create.isPending}>Add</Button>
            <Input className="md:col-span-5" placeholder="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Upcoming</CardTitle></CardHeader>
        <CardContent>
          {events.data?.events.length === 0 && <p className="text-sm text-muted-foreground">No events.</p>}
          <ul className="space-y-2">
            {events.data?.events.map((ev) => (
              <li key={ev.id} className="flex items-center gap-3 rounded-md border border-border p-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{ev.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(ev.starts_at), "PPp")} — {format(new Date(ev.ends_at), "p")}
                    {ev.location && ` · ${ev.location}`}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove.mutate(ev.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

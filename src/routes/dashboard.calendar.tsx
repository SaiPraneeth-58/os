import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/calendar")({ component: CalendarPage });

type Event = {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  color: string;
};

const COLORS = ["sky", "emerald", "violet", "amber", "rose", "slate"];
const COLOR_CLASS: Record<string, string> = {
  sky: "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30",
  emerald: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  violet: "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30",
  amber: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
  rose: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30",
  slate: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30",
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CalendarPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => ({
    title: "",
    description: "",
    start_at: toLocalInput(new Date()),
    end_at: "",
    all_day: false,
    location: "",
    color: "sky",
  }));

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const rangeStart = new Date(monthStart);
  rangeStart.setDate(1 - monthStart.getDay()); // back to Sunday of week 1
  const rangeEnd = new Date(monthEnd);
  rangeEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  const eventsQuery = useQuery({
    queryKey: ["events", user?.id, monthStart.toISOString().slice(0, 7)],
    enabled: !!user,
    queryFn: async () => {
      // Fetch a window covering visible cells
      const { data, error } = await supabase
        .from("events")
        .select("id,title,description,start_at,end_at,all_day,location,color")
        .eq("user_id", user!.id)
        .gte("start_at", rangeStart.toISOString())
        .lte("start_at", new Date(rangeEnd.getTime() + 86400000).toISOString())
        .order("start_at");
      if (error) throw error;
      return (data ?? []) as Event[];
    },
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of eventsQuery.data ?? []) {
      const d = new Date(e.start_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [eventsQuery.data]);

  const days: Date[] = useMemo(() => {
    const arr: Date[] = [];
    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      arr.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return arr;
  }, [rangeStart, rangeEnd]);

  const selectedKey = `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`;
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];

  const addEvent = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!form.title.trim()) throw new Error("Title required");
      if (!form.start_at) throw new Error("Start required");
      const { error } = await supabase.from("events").insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
        all_day: form.all_day,
        location: form.location.trim() || null,
        color: form.color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setForm((f) => ({ ...f, title: "", description: "", end_at: "", location: "" }));
      qc.invalidateQueries({ queryKey: ["events", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", user?.id] }),
  });

  function openNewAt(d: Date) {
    setSelectedDay(d);
    const at = new Date(d);
    at.setHours(9, 0, 0, 0);
    setForm((f) => ({ ...f, start_at: toLocalInput(at) }));
    setOpen(true);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => addMonths(c, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setCursor(new Date()); setSelectedDay(new Date()); }}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New event</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New event</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start</Label>
                    <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End (optional)</Label>
                    <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="allday" checked={form.all_day} onCheckedChange={(v) => setForm({ ...form, all_day: !!v })} />
                  <Label htmlFor="allday" className="cursor-pointer">All day</Label>
                </div>
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLORS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => addEvent.mutate()} disabled={addEvent.isPending}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Month grid */}
        <Card className="glass p-3">
          <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, new Date());
              const isSelected = sameDay(d, selectedDay);
              const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
              const dayEvents = eventsByDay.get(key) ?? [];
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(d)}
                  onDoubleClick={() => openNewAt(d)}
                  className={cn(
                    "min-h-[78px] rounded-lg border border-border/40 p-1.5 text-left transition flex flex-col gap-1",
                    !inMonth && "opacity-40",
                    isSelected ? "ring-2 ring-primary border-primary/50" : "hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday && "bg-primary text-primary-foreground font-semibold",
                    )}>{d.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{dayEvents.length}</span>
                    )}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div key={e.id} className={cn("text-[10px] truncate rounded px-1 py-0.5 border", COLOR_CLASS[e.color] ?? COLOR_CLASS.sky)}>
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Day details */}
        <Card className="glass p-4 self-start">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">
                {selectedDay.toLocaleDateString(undefined, { weekday: "long" })}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedDay.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => openNewAt(selectedDay)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No events on this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((e) => (
                <li key={e.id} className={cn("rounded-lg border p-2.5 group", COLOR_CLASS[e.color] ?? COLOR_CLASS.sky)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <p className="text-[11px] opacity-80">
                        {e.all_day
                          ? "All day"
                          : new Date(e.start_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        {e.end_at && !e.all_day && ` – ${new Date(e.end_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                      {e.location && (
                        <p className="text-[11px] flex items-center gap-1 mt-0.5 opacity-80">
                          <MapPin className="h-3 w-3" /> {e.location}
                        </p>
                      )}
                      {e.description && <p className="text-[11px] mt-1 opacity-80 line-clamp-2">{e.description}</p>}
                    </div>
                    <button
                      onClick={() => deleteEvent.mutate(e.id)}
                      className="opacity-0 group-hover:opacity-100 transition p-1 -m-1 hover:text-destructive"
                      aria-label="Delete event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";

function greetingFor(hour: number) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function GreetingHeader() {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const name =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "Operator";

  const greeting = greetingFor(now.getHours());
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{dateStr}</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting},{" "}
          <span className="bg-gradient-primary bg-clip-text text-transparent capitalize">
            {name}
          </span>
        </h1>
      </div>
      <div className="font-mono text-2xl tabular-nums text-muted-foreground sm:text-3xl">
        {timeStr}
      </div>
    </div>
  );
}

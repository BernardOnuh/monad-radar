"use client";

import { useEffect, useState } from "react";

type Alert = { id?: string; name?: string; type?: string; timeWindow?: string; isEnabled?: boolean; description?: string; channels?: { type: string }[] };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/alerts");
    const j = await r.json();
    setAlerts(j.alerts ?? []);
    setError(j.error ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    setAlerts((a) => a?.filter((x) => x.id !== id) ?? null);
    const r = await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const j = await r.json();
    if (j.error) {
      setError(j.error);
      load();
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Nansen Smart Alerts</div>
        <h1 className="text-3xl font-bold tracking-tight">My alerts</h1>
        <p className="mt-1 text-sm text-muted">Alerts you set from a token X-ray. Delivered in real time to Telegram, Discord or your webhook.</p>
      </div>
      {error ? <p className="text-sm text-down">{error}</p> : null}
      {alerts == null ? (
        <div className="skeleton h-24 w-full" />
      ) : alerts.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">No alerts yet. X-ray a token and hit “🔔 Set alert”.</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="card flex items-center gap-3 p-4">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.isEnabled === false ? "bg-muted" : "bg-up live-dot"}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.name?.replace(/^Radar · /, "")}</div>
                <div className="truncate text-xs text-muted">
                  {a.type} · {a.timeWindow} · {a.channels?.map((c) => c.type).join(", ")}
                </div>
                {a.description ? <div className="truncate text-xs text-muted">{a.description}</div> : null}
              </div>
              {a.id ? (
                <button onClick={() => remove(a.id!)} className="rounded-lg px-3 py-1.5 text-xs text-down hover:bg-down/10">
                  Delete
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

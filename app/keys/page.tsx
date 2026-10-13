"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Status = {
  source: "user" | "server" | "none";
  tail: string | null;
  ok?: boolean;
  error?: string;
  credits?: number;
  plan?: string;
  remaining?: number | null;
};

const PROVIDERS = {
  nansen: {
    name: "Nansen API key",
    required: true,
    help: "Powers every scan: holders, funders, counterparties, flows, PnL and alerts.",
    get: "https://app.nansen.ai/auth/agent-setup",
    getLabel: "Get a Nansen API key",
    placeholder: "Paste your Nansen API key",
  },
  openrouter: {
    name: "OpenRouter key (optional)",
    required: false,
    help: "Powers the AI verdicts and the Ask Radar agent.",
    get: "https://openrouter.ai/keys",
    getLabel: "Get an OpenRouter key",
    placeholder: "sk-or-…",
  },
} as const;

type Provider = keyof typeof PROVIDERS;

export default function KeysPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Record<Provider, Status> | null>(null);

  async function load() {
    const r = await fetch("/api/keys", { cache: "no-store" });
    setStatus(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Settings</div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Use your own API keys</h1>
        <p className="mt-2 text-sm text-muted">
          Testing during judging? If the demo key runs out of Nansen credits, paste your own key here. It&apos;s used only for your
          requests, stored in an httpOnly cookie in this browser for 7 days, and never saved on the server.
        </p>
      </div>

      {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
        <KeyCard key={p} provider={p} status={status?.[p] ?? null} onChange={async () => {
          await load();
          router.refresh();
        }} />
      ))}

      <p className="text-xs text-muted">
        Each token X-ray uses about 30 Nansen calls (results are cached for 5 minutes). Alerts you create while using your own key are created on
        your Nansen account.
      </p>
    </div>
  );
}

function KeyCard({ provider, status, onChange }: { provider: Provider; status: Status | null; onChange: () => Promise<void> }) {
  const cfg = PROVIDERS[provider];
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, key: value }) });
    const j = await r.json();
    setBusy(false);
    if (j.error) return setMsg({ ok: false, text: j.error });
    setValue("");
    setMsg({
      ok: true,
      text:
        provider === "nansen"
          ? `Key saved. ${j.credits != null ? `${j.credits.toLocaleString()} credits remaining${j.plan ? ` (${j.plan} plan)` : ""}.` : ""}`
          : "Key saved.",
    });
    await onChange();
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/keys?provider=${provider}`, { method: "DELETE" });
    setBusy(false);
    setMsg({ ok: true, text: "Removed. Using the demo key again." });
    await onChange();
  }

  const using =
    !status ? (
      <span className="skeleton inline-block h-4 w-40" />
    ) : status.source === "user" ? (
      <span className="text-up">Your key {status.tail}</span>
    ) : status.source === "server" ? (
      <span className="text-muted">Demo key (shared)</span>
    ) : (
      <span className="text-down">No key configured</span>
    );

  const health =
    status && status.source !== "none"
      ? status.ok === false
        ? <span className="text-down">{status.error}</span>
        : provider === "nansen" && status.credits != null
          ? <span className={status.credits > 0 ? "text-up" : "text-down"}>{status.credits.toLocaleString()} credits left</span>
          : provider === "openrouter" && status.ok
            ? <span className="text-up">Working{status.remaining != null ? ` · $${status.remaining.toFixed(2)} left` : ""}</span>
            : null
      : null;

  return (
    <section className="card space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold">{cfg.name}</h2>
          <p className="text-xs text-muted">{cfg.help}</p>
        </div>
        <a href={cfg.get} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-accent-2 hover:underline">
          {cfg.getLabel} ↗
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-panel-2/60 px-3 py-2 text-sm">
        <span className="text-xs uppercase tracking-wider text-muted">In use</span>
        {using}
        {health ? <span className="ml-auto text-xs">{health}</span> : null}
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) save();
        }}
      >
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={cfg.placeholder}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-border bg-panel-2 px-3 py-2.5 font-mono text-base outline-none placeholder:font-sans sm:text-sm"
        />
        <button disabled={busy || !value.trim()} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Checking…" : "Save key"}
        </button>
        {status?.source === "user" ? (
          <button type="button" onClick={remove} disabled={busy} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted hover:text-down">
            Remove
          </button>
        ) : null}
      </form>
      {msg ? <p className={`text-sm ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p> : null}
    </section>
  );
}

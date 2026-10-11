"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Preset = "insiders" | "large" | "smflow";
type ChannelType = "telegram" | "discord" | "webhook";

const STORE = "radar-alert-channel";

export default function AlertButton({
  chain,
  token,
  symbol,
  wallets,
  walletsAreCluster,
}: {
  chain: string;
  token: string;
  symbol?: string;
  wallets: string[];
  walletsAreCluster: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<Preset>(wallets.length ? "insiders" : "large");
  const [minUsd, setMinUsd] = useState(1000);
  const [chType, setChType] = useState<ChannelType>("telegram");
  const [chValue, setChValue] = useState("");
  const [state, setState] = useState<{ status: "idle" | "saving" | "ok" | "error"; msg?: string }>({ status: "idle" });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (saved?.type) {
        setChType(saved.type);
        setChValue(saved.value ?? "");
      }
    } catch {}
  }, []);

  const presets: { id: Preset; title: string; desc: string; disabled?: boolean }[] = [
    {
      id: "insiders",
      title: walletsAreCluster ? "Insiders selling" : "Top holders selling",
      desc: walletsAreCluster
        ? `Ping me when any of the ${wallets.length} linked wallets found by X-ray sells or moves ${symbol ?? "this token"}.`
        : `Ping me when any of the top ${wallets.length} holders sells or moves ${symbol ?? "this token"}.`,
      disabled: wallets.length === 0,
    },
    { id: "large", title: "Large trades", desc: `Any ${symbol ?? "token"} buy or sell above the amount below.` },
    { id: "smflow", title: "Smart money flow", desc: "Smart money net flow beyond the amount below within 1h." },
  ];

  async function save() {
    setState({ status: "saving" });
    try {
      localStorage.setItem(STORE, JSON.stringify({ type: chType, value: chValue }));
    } catch {}
    const r = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset, chain, token, symbol, wallets, minUsd, channel: { type: chType, value: chValue } }),
    });
    const j = await r.json();
    setState(j.error ? { status: "error", msg: j.error } : { status: "ok" });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl border border-accent/50 bg-accent/15 px-4 py-2.5 text-sm font-semibold text-accent-2 hover:bg-accent hover:text-white"
      >
        🔔 Set alert
      </button>
      {open ? (
        <div className="card absolute right-0 top-12 z-30 w-[min(92vw,380px)] space-y-3 p-4 shadow-2xl shadow-black/50">
          <div className="flex items-center">
            <div className="font-semibold">Alert me about {symbol ?? "this token"}</div>
            <button onClick={() => setOpen(false)} className="ml-auto text-muted hover:text-fg" aria-label="Close">
              ✕
            </button>
          </div>

          <div className="space-y-1.5">
            {presets.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer gap-2 rounded-lg border p-2.5 text-sm ${
                  preset === p.id ? "border-accent bg-accent/10" : "border-border"
                } ${p.disabled ? "pointer-events-none opacity-40" : ""}`}
              >
                <input type="radio" className="mt-1 accent-[#836ef9]" checked={preset === p.id} onChange={() => setPreset(p.id)} />
                <span>
                  <span className="font-medium">{p.title}</span>
                  <span className="block text-xs text-muted">{p.desc}</span>
                </span>
              </label>
            ))}
          </div>

          <label className="block text-xs text-muted">
            Minimum USD value
            <input
              type="number"
              min={0}
              value={minUsd}
              onChange={(e) => setMinUsd(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-panel-2 px-2 py-1.5 text-sm text-fg outline-none"
            />
          </label>

          <div>
            <div className="mb-1 text-xs text-muted">Deliver to</div>
            <div className="mb-1.5 flex gap-1">
              {(["telegram", "discord", "webhook"] as ChannelType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setChType(t)}
                  className={`rounded-md px-2.5 py-1 text-xs capitalize ${chType === t ? "bg-accent text-white" : "bg-panel-2 text-muted"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              value={chValue}
              onChange={(e) => setChValue(e.target.value)}
              placeholder={chType === "telegram" ? "Telegram chat ID (e.g. 123456789 or -100…)" : "https://… webhook URL"}
              className="w-full rounded-lg border border-border bg-panel-2 px-2 py-1.5 text-sm outline-none"
            />
            {chType === "telegram" ? (
              <p className="mt-1 text-[11px] text-muted">Delivered by Nansen&apos;s alert bot. Get your chat ID from @userinfobot.</p>
            ) : null}
          </div>

          <button
            onClick={save}
            disabled={state.status === "saving" || !chValue.trim()}
            className="w-full rounded-xl bg-accent py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {state.status === "saving" ? "Creating…" : "Create alert"}
          </button>
          {state.status === "ok" ? (
            <p className="text-sm text-up">
              Alert live via Nansen Smart Alerts. <Link href="/alerts" className="underline">Manage alerts →</Link>
            </p>
          ) : null}
          {state.status === "error" ? <p className="text-sm text-down">{state.msg}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

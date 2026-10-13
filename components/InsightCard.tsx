"use client";

import { useEffect, useState } from "react";
import { KeyLink } from "./ui";

type Insight = {
  verdict: string;
  conviction: string;
  headline: string;
  bullets: string[];
  watch: string[];
};

const VERDICT_STYLE: Record<string, string> = {
  Bullish: "bg-up/15 text-up border-up/30",
  Bearish: "bg-down/15 text-down border-down/30",
  Mixed: "bg-warn/15 text-warn border-warn/30",
  Neutral: "bg-panel-2 text-muted border-border",
  "Low risk": "bg-up/15 text-up border-up/30",
  "Moderate risk": "bg-warn/15 text-warn border-warn/30",
  "High risk": "bg-down/15 text-down border-down/30",
  "Severe risk": "bg-down/25 text-down border-down/50",
  "Unknown risk": "bg-warn/10 text-warn border-warn/30",
};

export default function InsightCard({ kind, chain, address }: { kind: "market" | "token" | "wallet" | "xray"; chain: string; address?: string }) {
  const [data, setData] = useState<Insight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError(null);
    const qs = new URLSearchParams({ kind, chain, ...(address ? { address } : {}) });
    fetch(`/api/insight?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (j.error) setError(j.error);
        else setData(j);
      })
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, [kind, chain, address, nonce]);

  return (
    <section className="card relative min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
      <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
        <span className="text-accent-2">✦</span> Radar AI read
        <button onClick={() => setNonce((n) => n + 1)} className="ml-auto rounded-md px-2 py-0.5 normal-case tracking-normal hover:bg-panel-2">
          Refresh
        </button>
      </div>
      {error ? (
        <div>
          <p className="text-sm text-down">AI read unavailable: {error}</p>
          {/API keys/.test(error) ? <KeyLink /> : null}
        </div>
      ) : !data ? (
        <div className="space-y-2">
          <div className="skeleton h-6 w-2/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-4 w-4/6" />
          <p className="pt-1 text-xs text-muted">Reading Nansen signals…</p>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-sm font-semibold ${VERDICT_STYLE[data.verdict] ?? VERDICT_STYLE.Neutral}`}>
              {data.verdict}
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">{data.conviction} conviction</span>
          </div>
          <h3 className="mb-3 text-lg font-semibold leading-snug">{data.headline}</h3>
          <ul className="space-y-1.5 text-sm">
            {data.bullets?.map((b, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {data.watch?.length ? (
            <div className="mt-4 rounded-xl border border-border bg-panel-2/60 p-3 text-sm">
              <div className="mb-1 text-xs uppercase tracking-wider text-muted">Watch next</div>
              {data.watch.map((w, i) => (
                <div key={i}>→ {w}</div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

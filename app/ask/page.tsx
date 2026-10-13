"use client";

import { Fragment, useState, type ReactNode } from "react";

type Trace = { tool: string; args: Record<string, string>; ms: number; ok: boolean };
type Turn = { q: string; answer?: string; trace?: Trace[]; error?: string };

const SUGGESTIONS = [
  "Which trending Monad token looks riskiest right now, and why?",
  "Is CHOG safe? Who controls the supply?",
  "Which tokens are smart money dumping on Monad this week, and who is selling?",
  "Find the most active smart money trader on Monad right now and profile them.",
];

const TOOL_LABEL: Record<string, string> = {
  token_xray: "Holders + First Funder + Counterparties + Flow Intel + PnL + Who Bought/Sold",
  trending_tokens: "Token Screener",
  smart_money_overview: "Smart Money › Netflows + DEX Trades + Holdings",
  token_report: "Token God Mode › Info + Flow Intelligence + Holders + PnL",
  wallet_report: "Profiler › Labels + Balances + PnL + Trades + Related",
  smart_money_trades: "Smart Money › DEX Trades",
};

export default function AskPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setQ("");
    setTurns((t) => [...t, { q: question }]);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const j = await r.json();
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, answer: j.answer, trace: j.trace, error: j.error } : x)));
    } catch (e) {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: String(e) } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Agent</div>
        <h1 className="text-3xl font-bold tracking-tight">
          Ask <span className="text-accent-2">Radar</span>
        </h1>
        <p className="mt-1 text-sm text-muted">
          An AI agent that calls Nansen endpoints as tools, reads the data, and answers in plain English. Every tool call is shown.
        </p>
      </div>

      {turns.length === 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} className="card p-3 text-left text-sm hover:border-accent/50">
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-5">
        {turns.map((t, i) => (
          <div key={i} className="space-y-3">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2 text-sm text-white">{t.q}</div>
            <div className="card p-4">
              {t.trace?.length ? (
                <div className="mb-3 space-y-1 overflow-x-auto">
                  {t.trace.map((x, j) => (
                    <div key={j} className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className={x.ok ? "text-up" : "text-down"}>{x.ok ? "✓" : "✗"}</span>
                      <span className="text-accent-2">{x.tool}</span>
                      <span className="text-muted">{Object.entries(x.args).map(([k, v]) => `${k}=${String(v).slice(0, 14)}`).join(" ")}</span>
                      <span className="text-muted">· {TOOL_LABEL[x.tool]}</span>
                      <span className="ml-auto text-muted">{x.ms}ms</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {t.error ? (
                <p className="text-sm text-down">{t.error}</p>
              ) : t.answer != null ? (
                <div className="prose-radar text-sm leading-relaxed">{md(t.answer)}</div>
              ) : (
                <div className="space-y-2">
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-4 w-5/6" />
                  <p className="text-xs text-muted">Calling Nansen tools…</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] flex gap-2 rounded-2xl border border-border bg-panel/95 p-2 backdrop-blur md:bottom-4"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about tokens, wallets or smart money flows…"
          className="min-w-0 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-muted md:text-sm"
        />
        <button disabled={busy} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}

/** Tiny markdown renderer: headings, bullets, bold, inline code. */
function md(src: string): ReactNode {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) =>
      p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith("`") ? <code key={i}>{p.slice(1, -1)}</code> : <Fragment key={i}>{p}</Fragment>,
    );
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={out.length}>{list}</ul>);
    list = [];
  };
  for (const line of src.split("\n")) {
    const l = line.trim();
    if (/^[-*•]\s+/.test(l)) {
      list.push(<li key={list.length}>{inline(l.replace(/^[-*•]\s+/, ""))}</li>);
      continue;
    }
    flush();
    if (!l) continue;
    if (/^#{1,4}\s/.test(l)) out.push(<p key={out.length} className="font-semibold text-fg">{inline(l.replace(/^#+\s/, ""))}</p>);
    else out.push(<p key={out.length}>{inline(l)}</p>);
  }
  flush();
  return out;
}

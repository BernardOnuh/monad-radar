"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usd } from "@/lib/format";
import type { NetflowRow } from "@/lib/nansen";

const FRAMES = [
  ["1h", "net_flow_1h_usd"],
  ["24h", "net_flow_24h_usd"],
  ["7d", "net_flow_7d_usd"],
  ["30d", "net_flow_30d_usd"],
] as const;

export default function FlowBars({ rows, chain }: { rows: NetflowRow[]; chain: string }) {
  const [frame, setFrame] = useState<(typeof FRAMES)[number][1]>("net_flow_24h_usd");

  const { inflow, outflow, max } = useMemo(() => {
    const sorted = [...rows].filter((r) => r[frame]).sort((a, b) => b[frame] - a[frame]);
    const inflow = sorted.filter((r) => r[frame] > 0).slice(0, 10);
    const outflow = sorted.filter((r) => r[frame] < 0).reverse().slice(0, 10);
    const max = Math.max(1, ...[...inflow, ...outflow].map((r) => Math.abs(r[frame])));
    return { inflow, outflow, max };
  }, [rows, frame]);

  const Row = ({ r }: { r: NetflowRow }) => {
    const v = r[frame];
    const w = `${Math.max(2, (Math.abs(v) / max) * 100)}%`;
    return (
      <Link
        href={`/token/${r.token_address}?chain=${chain}`}
        className="group grid grid-cols-[64px_1fr_72px] sm:grid-cols-[88px_1fr_76px] items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-panel-2"
      >
        <div className="truncate text-sm font-medium group-hover:text-accent-2">{r.token_symbol || "?"}</div>
        <div className="h-5 rounded-md bg-panel-2/70">
          <div className={`h-5 rounded-md ${v > 0 ? "bg-up/70" : "bg-down/70"}`} style={{ width: w }} />
        </div>
        <div className={`num text-right text-sm ${v > 0 ? "text-up" : "text-down"}`}>{usd(v, true)}</div>
      </Link>
    );
  };

  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-semibold">Smart money net flows</h2>
          <p className="text-xs text-muted">Nansen Smart Money › Netflows · click a token to drill in</p>
        </div>
        <div className="ml-auto flex rounded-lg border border-border p-0.5">
          {FRAMES.map(([label, key]) => (
            <button
              key={key}
              onClick={() => setFrame(key)}
              className={`rounded-md px-2.5 py-1 text-xs ${frame === key ? "bg-accent text-white" : "text-muted hover:text-fg"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No smart money flows returned for this chain.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-2 px-2 text-xs uppercase tracking-wider text-up">Accumulating</div>
            {inflow.length ? inflow.map((r) => <Row key={r.token_address} r={r} />) : <p className="px-2 text-sm text-muted">None in this window.</p>}
          </div>
          <div>
            <div className="mb-2 px-2 text-xs uppercase tracking-wider text-down">Distributing</div>
            {outflow.length ? outflow.map((r) => <Row key={r.token_address} r={r} />) : <p className="px-2 text-sm text-muted">None in this window.</p>}
          </div>
        </div>
      )}
    </section>
  );
}

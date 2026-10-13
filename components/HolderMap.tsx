"use client";

import { hierarchy, pack } from "d3-hierarchy";
import Link from "next/link";
import { useMemo, useState } from "react";
import { short, usd } from "@/lib/format";

type H = {
  address: string;
  label: string;
  share: number;
  value_usd: number;
  change_7d: number;
  kind: "holder" | "infra" | "exchange";
  cluster?: number;
  funderName?: string;
};
type C = { id: number; members: string[]; share: number; reasons: string[] };

const CLUSTER_COLORS = ["#ff5c7a", "#ffc857", "#ff9f5c", "#e86cf0", "#5cc8ff", "#3ddc97"];
const KIND_COLOR = { holder: "#6b6390", infra: "#2f2a45", exchange: "#3a6ea8" };

type Node = { name: string; h?: H; children?: Node[]; value?: number };

export default function HolderMap({ holders, clusters, chain, traced }: { holders: H[]; clusters: C[]; chain: string; traced: number }) {
  const [hoverH, setHoverH] = useState<H | null>(null);
  const [picked, setPicked] = useState<H | null>(null);
  const hover = hoverH ?? picked;
  const size = 520;

  const nodes = useMemo(() => {
    const clustered = new Map<number, H[]>();
    const rest: Node[] = [];
    for (const h of holders) {
      const v = Math.max(h.share, 0.0005);
      if (h.cluster) clustered.set(h.cluster, [...(clustered.get(h.cluster) ?? []), h]);
      else rest.push({ name: h.address, h, value: v });
    }
    const groups: Node[] = [...clustered.entries()].map(([id, hs]) => ({
      name: `cluster-${id}`,
      children: hs.map((h) => ({ name: h.address, h, value: Math.max(h.share, 0.0005) })),
    }));
    const root = hierarchy<Node>({ name: "root", children: [...groups, ...rest] })
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return pack<Node>().size([size, size]).padding((d) => (d.depth === 0 ? 4 : 3))(root).descendants();
  }, [holders]);

  const color = (h: H) => (h.cluster ? CLUSTER_COLORS[(h.cluster - 1) % CLUSTER_COLORS.length] : KIND_COLOR[h.kind]);

  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-start gap-3">
        <div>
          <h2 className="font-semibold">Holder map</h2>
          <p className="text-xs text-muted">
            Top {holders.length} holders sized by % of supply. Top {traced} traced with Nansen First Funder + Counterparties — linked wallets are
            grouped and colored.
          </p>
        </div>
      </div>
      {holders.length === 0 ? (
        <div className="grid h-72 place-items-center rounded-xl border border-dashed border-border text-center text-sm text-muted">
          <div>
            No holder data returned by Nansen for this token.
            <div className="mt-1 text-xs">If the API key is out of credits, holders can&apos;t load — top up and refresh.</div>
          </div>
        </div>
      ) : (
      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="relative mx-auto w-full max-w-[520px]">
          <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full touch-manipulation">
            {nodes.map((n, i) => {
              if (n.depth === 0) return null;
              if (!n.data.h) {
                // cluster ring
                const id = Number(n.data.name.split("-")[1]);
                const c = CLUSTER_COLORS[(id - 1) % CLUSTER_COLORS.length];
                return <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={c} fillOpacity={0.08} stroke={c} strokeDasharray="4 3" strokeOpacity={0.8} />;
              }
              const h = n.data.h;
              return (
                <g
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`${h.label || h.address} ${(h.share * 100).toFixed(2)}%`}
                  onClick={() => setPicked((p) => (p?.address === h.address ? null : h))}
                  onKeyDown={(e) => e.key === "Enter" && setPicked(h)}
                  onMouseEnter={() => setHoverH(h)}
                  onMouseLeave={() => setHoverH(null)}
                  className="cursor-pointer outline-none"
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={color(h)}
                    fillOpacity={hover && hover.address !== h.address ? 0.45 : 0.9}
                    stroke={hover?.address === h.address ? "#fff" : "none"}
                    strokeWidth={2}
                    className="transition-[fill-opacity]"
                  />
                  {n.r > 22 ? (
                    <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={Math.min(13, n.r / 3)} fill="#fff" pointerEvents="none">
                      {(h.share * 100).toFixed(1)}%
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:block lg:space-y-3">
          <div className="min-h-28 rounded-xl border border-border bg-panel-2/60 p-3">
            {hover ? (
              <>
                <div className="font-medium">{hover.label || short(hover.address)}</div>
                <div className="font-mono text-xs text-muted">{short(hover.address)}</div>
                <div className="mt-1">
                  {(hover.share * 100).toFixed(2)}% · {usd(hover.value_usd)}
                </div>
                <div className="text-xs text-muted">7d balance Δ: {hover.change_7d?.toLocaleString?.() ?? "—"}</div>
                {hover.funderName ? <div className="text-xs text-muted">Funded by: {hover.funderName}</div> : null}
                {hover.cluster ? <div className="mt-1 text-xs" style={{ color: color(hover) }}>Cluster #{hover.cluster}</div> : null}
                <Link
                  href={`/wallet/${hover.address}?chain=${chain}`}
                  className="mt-2 inline-block rounded-lg bg-accent/15 px-2.5 py-1 text-xs text-accent-2 hover:bg-accent hover:text-white"
                >
                  X-ray this wallet →
                </Link>
              </>
            ) : (
              <span className="text-xs text-muted">Tap or hover a bubble for details</span>
            )}
          </div>
          <div className="space-y-1 text-xs">
            {clusters.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CLUSTER_COLORS[(c.id - 1) % CLUSTER_COLORS.length] }} />
                <span>
                  <b>Cluster #{c.id}</b>: {c.members.length} wallets · {(c.share * 100).toFixed(1)}%
                  <span className="block text-muted">{c.reasons[0]}</span>
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR.holder }} /> Independent holder
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR.exchange }} /> Exchange
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-border" style={{ background: KIND_COLOR.infra }} /> Pool / contract
            </div>
          </div>
        </div>
      </div>
      )}
    </section>
  );
}

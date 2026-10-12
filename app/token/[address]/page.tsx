import Link from "next/link";
import { Suspense } from "react";
import CohortFlows from "@/components/CohortFlows";
import HolderMap from "@/components/HolderMap";
import InsightCard from "@/components/InsightCard";
import RiskGauge from "@/components/RiskGauge";
import TradeBar from "@/components/TradeBar";
import { Empty, LabelChip, Panel, Stat } from "@/components/ui";
import { EXPLORERS, short, tone, usd } from "@/lib/format";
import { parseChain, type FlowPoint } from "@/lib/nansen";
import { xray } from "@/lib/xray";

export default function TokenPage(props: PageProps<"/token/[address]">) {
  return (
    <Suspense fallback={<Scanning />}>
      <Token params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

function Scanning() {
  const steps = [
    "Pulling top holders (TGM › Holders)",
    "Tracing first funders of top 20 wallets (Profiler › First Funder)",
    "Checking who transacts with whom (Profiler › Counterparties)",
    "Reading cohort flows, PnL leaderboard, buyers & sellers",
    "Scoring risk",
  ];
  return (
    <div className="card mx-auto mt-10 max-w-xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="relative grid h-9 w-9 place-items-center rounded-full bg-accent/20">
          <span className="h-3 w-3 rounded-full bg-accent live-dot" />
        </span>
        <div>
          <div className="font-semibold">X-raying token…</div>
          <div className="text-xs text-muted">~30 Nansen calls · 10–25 seconds</div>
        </div>
      </div>
      <ol className="space-y-2 text-sm text-muted">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent live-dot" style={{ animationDelay: `${i * 0.25}s` }} />
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

async function Token({
  params,
  searchParams,
}: {
  params: PageProps<"/token/[address]">["params"];
  searchParams: PageProps<"/token/[address]">["searchParams"];
}) {
  const { address } = await params;
  const sp = await searchParams;
  const chain = parseChain(typeof sp.chain === "string" ? sp.chain : undefined);
  const x = await xray(chain, address);
  const info = x.info;
  const sm = info?.spot_metrics;
  const buyShare = sm?.buy_volume_usd && sm?.volume_total_usd ? sm.buy_volume_usd / sm.volume_total_usd : null;
  const clusterShare = x.clusters.reduce((s, c) => s + c.share, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {info?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.logo} alt="" className="h-12 w-12 rounded-full border border-border" />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/20 text-lg font-bold text-accent-2">
            {(info?.symbol ?? "?").slice(0, 1)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted">Token X-ray · {chain}</div>
          <h1 className="text-3xl font-bold tracking-tight">
            {info?.name ?? short(address)} <span className="text-muted">{info?.symbol}</span>
          </h1>
          <a href={`${EXPLORERS[chain]}/token/${address}`} target="_blank" className="break-all font-mono text-xs text-muted hover:text-accent-2">
            {address} ↗
          </a>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {info?.token_details?.website ? (
            <a href={info.token_details.website} target="_blank">
              <LabelChip>Website ↗</LabelChip>
            </a>
          ) : null}
          {info?.token_details?.x ? (
            <a href={info.token_details.x} target="_blank">
              <LabelChip>X ↗</LabelChip>
            </a>
          ) : null}
          <LabelChip>{x.calls} Nansen calls</LabelChip>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Market cap" value={usd(info?.token_details?.market_cap_usd)} sub={`FDV ${usd(info?.token_details?.fdv_usd)}`} />
        <Stat label="24h volume" value={usd(sm?.volume_total_usd)} sub={buyShare != null ? `${(buyShare * 100).toFixed(0)}% buys` : undefined} />
        <Stat label="Liquidity" value={usd(sm?.liquidity_usd)} />
        <Stat label="Holders" value={sm?.total_holders?.toLocaleString() ?? "—"} />
        <Stat
          label="Linked wallets hold"
          value={`${(clusterShare * 100).toFixed(1)}%`}
          className={clusterShare > 0.1 ? "text-down" : clusterShare > 0.03 ? "text-warn" : "text-up"}
          sub={`${x.clusters.length} cluster(s) in top ${x.traced}`}
        />
      </div>

      <TradeBar
        chain={chain}
        token={address}
        symbol={info?.symbol}
        level={x.level}
        wallets={x.clusters.length ? x.clusters.flatMap((c) => c.members) : x.holders.filter((h) => h.kind === "holder").slice(0, 10).map((h) => h.address)}
        walletsAreCluster={x.clusters.length > 0}
      />

      {x.errors.holders ? <Empty error={x.errors.holders}>Holder data unavailable for this token.</Empty> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <HolderMap holders={x.holders} clusters={x.clusters} chain={chain} traced={x.traced} />
        <RiskGauge score={x.score} level={x.level} factors={x.factors} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <InsightCard kind="xray" chain={chain} address={address} />
        <CohortFlows d1={x.flow1d} d7={x.flow7d} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Biggest buyers · 24h" source="Nansen TGM › Who Bought/Sold">
          <Movers rows={x.buyers.map((b) => ({ address: b.address, label: b.address_label, usd: b.bought_volume_usd }))} chain={chain} up error={x.errors.buyers} />
        </Panel>
        <Panel title="Biggest sellers · 24h" source="Nansen TGM › Who Bought/Sold">
          <Movers rows={x.sellers.map((b) => ({ address: b.address, label: b.address_label, usd: b.sold_volume_usd }))} chain={chain} error={x.errors.sellers} />
        </Panel>
        <Panel title="Who's winning (30d)" source="Nansen TGM › PnL Leaderboard">
          {x.pnl.length === 0 ? (
            <Empty error={x.errors.pnl}>No PnL data.</Empty>
          ) : (
            <div className="space-y-1">
              {x.pnl.slice(0, 8).map((p) => (
                <Link
                  key={p.trader_address}
                  href={`/wallet/${p.trader_address}?chain=${chain}`}
                  className="grid grid-cols-[1fr_80px_64px] items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-panel-2"
                >
                  <span className="truncate">{p.trader_address_label || short(p.trader_address)}</span>
                  <span className={`num text-right ${tone(p.pnl_usd_total)}`}>{usd(p.pnl_usd_total, true)}</span>
                  <span className={`num text-right text-xs ${(p.still_holding_balance_ratio ?? 0) < 0.2 ? "text-down" : "text-muted"}`}>
                    {p.still_holding_balance_ratio != null ? `${Math.round(p.still_holding_balance_ratio * 100)}% held` : ""}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Trend points={x.trend} error={x.errors.trend} />
    </div>
  );
}

function Movers({ rows, chain, up, error }: { rows: { address: string; label: string; usd: number }[]; chain: string; up?: boolean; error?: string }) {
  if (!rows.length) return <Empty error={error}>No data in the last 24h.</Empty>;
  const max = Math.max(...rows.map((r) => r.usd || 0), 1);
  return (
    <div className="space-y-1.5">
      {rows.slice(0, 8).map((r) => (
        <Link key={r.address} href={`/wallet/${r.address}?chain=${chain}`} className="block rounded-lg px-2 py-1 hover:bg-panel-2">
          <div className="flex text-sm">
            <span className="truncate">{r.label || short(r.address)}</span>
            <span className={`num ml-auto ${up ? "text-up" : "text-down"}`}>{usd(r.usd)}</span>
          </div>
          <div className="mt-1 h-1 rounded bg-panel-2">
            <div className={`h-1 rounded ${up ? "bg-up/70" : "bg-down/70"}`} style={{ width: `${((r.usd || 0) / max) * 100}%` }} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function Trend({ points, error }: { points: FlowPoint[]; error?: string }) {
  if (points.length < 2) {
    return (
      <Panel title="Top-100 holders · 30d" source="Nansen TGM › Flows (top_100_holders)">
        <Empty error={error}>Not enough history.</Empty>
      </Panel>
    );
  }
  const W = 800;
  const H = 140;
  const line = (vals: number[]) => {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - 10 - ((v - min) / (max - min || 1)) * (H - 20)}`).join(" ");
  };
  const amt = points.map((p) => p.token_amount);
  const first = amt[0];
  const last = amt[amt.length - 1];
  const delta = first ? (last - first) / first : 0;
  return (
    <Panel
      title="Top-100 holders · 30d"
      source="Nansen TGM › Flows (top_100_holders) · balance held by the 100 largest wallets"
      right={<span className={`num text-sm font-semibold ${delta >= 0 ? "text-up" : "text-down"}`}>{(delta * 100).toFixed(1)}%</span>}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" preserveAspectRatio="none">
        <polyline points={line(amt)} fill="none" stroke="#836ef9" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex justify-between text-xs text-muted">
        <span>{points[0].date?.slice(0, 10)}</span>
        <span>{delta >= 0 ? "Big holders accumulating" : "Big holders distributing"}</span>
        <span>{points[points.length - 1].date?.slice(0, 10)}</span>
      </div>
    </Panel>
  );
}

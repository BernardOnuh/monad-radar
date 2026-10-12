import Link from "next/link";
import { Suspense } from "react";
import FlowBars from "@/components/FlowBars";
import InsightCard from "@/components/InsightCard";
import { Empty, Panel, Skeleton, Stat } from "@/components/ui";
import { getMarket } from "@/lib/data";
import { ago, short, usd } from "@/lib/format";
import { parseChain } from "@/lib/nansen";

export default function Home(props: PageProps<"/smart-money">) {
  return (
    <Suspense fallback={<Skeleton rows={3} />}>
      <Radar searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Radar({ searchParams }: { searchParams: PageProps<"/smart-money">["searchParams"] }) {
  const sp = await searchParams;
  const chain = parseChain(typeof sp.chain === "string" ? sp.chain : undefined);
  const m = await getMarket(chain);

  const in24 = m.netflow.filter((r) => r.net_flow_24h_usd > 0).reduce((s, r) => s + r.net_flow_24h_usd, 0);
  const out24 = m.netflow.filter((r) => r.net_flow_24h_usd < 0).reduce((s, r) => s + r.net_flow_24h_usd, 0);
  const top = [...m.netflow].sort((a, b) => b.net_flow_24h_usd - a.net_flow_24h_usd)[0];
  const traders = new Set(m.trades.map((t) => t.trader_address)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
            <span className="h-2 w-2 rounded-full bg-up live-dot" /> Live · {chain}
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What is smart money doing on <span className="capitalize text-accent-2">{chain}</span>?
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="SM inflows · 24h" value={usd(in24)} className="text-up" sub={`${m.netflow.filter((r) => r.net_flow_24h_usd > 0).length} tokens`} />
        <Stat label="SM outflows · 24h" value={usd(out24)} className="text-down" sub={`${m.netflow.filter((r) => r.net_flow_24h_usd < 0).length} tokens`} />
        <Stat label="Top accumulation" value={top?.token_symbol ?? "—"} sub={top ? `${usd(top.net_flow_24h_usd, true)} · ${top.trader_count} traders` : undefined} />
        <Stat label="Active SM traders" value={traders || "—"} sub="in latest DEX trades" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <FlowBars rows={m.netflow} chain={chain} />
        <InsightCard kind="market" chain={chain} />
      </div>

      {m.errors.netflow ? <Empty error={m.errors.netflow}>Netflow endpoint error</Empty> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Panel title="Live smart money trades" source="Nansen Smart Money › DEX Trades">
          {m.trades.length === 0 ? (
            <Empty error={m.errors.trades}>No recent smart money trades.</Empty>
          ) : (
            <div className="divide-y divide-border">
              {m.trades.slice(0, 14).map((t) => (
                <div key={t.transaction_hash + t.token_bought_address} className="flex items-center gap-3 py-2 text-sm">
                  <Link href={`/wallet/${t.trader_address}?chain=${chain}`} className="w-40 shrink-0 truncate text-muted hover:text-accent-2">
                    {t.trader_address_label || short(t.trader_address)}
                  </Link>
                  <div className="min-w-0 flex-1 truncate">
                    <span className="text-down">{t.token_sold_symbol}</span>
                    <span className="mx-1.5 text-muted">→</span>
                    <Link href={`/token/${t.token_bought_address}?chain=${chain}`} className="font-medium text-up hover:underline">
                      {t.token_bought_symbol}
                    </Link>
                  </div>
                  <div className="num w-20 text-right">{usd(t.trade_value_usd)}</div>
                  <div className="hidden w-16 text-right text-xs text-muted sm:block">{ago(t.block_timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Smart money bags" source="Nansen Smart Money › Holdings">
          {m.holdings.length === 0 ? (
            <Empty error={m.errors.holdings}>No holdings data.</Empty>
          ) : (
            <div className="space-y-1">
              {m.holdings.slice(0, 12).map((h) => (
                <Link
                  key={h.token_address}
                  href={`/token/${h.token_address}?chain=${chain}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-panel-2"
                >
                  <span className="w-20 truncate font-medium">{h.token_symbol}</span>
                  <span className="num flex-1 text-right">{usd(h.value_usd)}</span>
                  <span className={`num w-16 text-right text-xs ${h.balance_24h_percent_change >= 0 ? "text-up" : "text-down"}`}>
                    {h.balance_24h_percent_change?.toFixed?.(1)}%
                  </span>
                  <span className="w-14 text-right text-xs text-muted">{h.holders_count} SM</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

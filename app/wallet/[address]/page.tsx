import Link from "next/link";
import { Suspense } from "react";
import InsightCard from "@/components/InsightCard";
import RelatedGraph from "@/components/RelatedGraph";
import { Empty, LabelChip, Panel, Skeleton, Stat } from "@/components/ui";
import { getWallet } from "@/lib/data";
import { ago, EXPLORERS, pct, short, tone, usd } from "@/lib/format";
import { parseChain } from "@/lib/nansen";

export default function WalletPage(props: PageProps<"/wallet/[address]">) {
  return (
    <Suspense fallback={<Skeleton rows={3} />}>
      <Wallet params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Wallet({
  params,
  searchParams,
}: {
  params: PageProps<"/wallet/[address]">["params"];
  searchParams: PageProps<"/wallet/[address]">["searchParams"];
}) {
  const { address } = await params;
  const sp = await searchParams;
  const chain = parseChain(typeof sp.chain === "string" ? sp.chain : undefined);
  const w = await getWallet(chain, address);
  const total = w.balances.reduce((s, b) => s + (b.value_usd || 0), 0);
  const smLabels = w.labels.filter((l) => l.category === "smart_money");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Wallet X-ray · {chain}</div>
        <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">{short(address)}</h1>
        <a href={`${EXPLORERS[chain]}/address/${address}`} target="_blank" className="break-all font-mono text-xs text-muted hover:text-accent-2">
          {address} ↗
        </a>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {w.labels.length ? (
            w.labels.slice(0, 14).map((l) => <LabelChip key={l.label}>{l.category === "smart_money" ? "🧠 " : ""}{l.label}</LabelChip>)
          ) : (
            <span className="text-xs text-muted">No Nansen labels {w.errors.labels ? `(${w.errors.labels})` : ""}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
        <Stat label="Portfolio" value={usd(total)} sub={`${w.balances.length} tokens`} />
        <Stat label="Realized PnL · 90d" value={usd(w.pnl?.realized_pnl_usd, true)} className={tone(w.pnl?.realized_pnl_usd)} sub={w.pnl ? pct(w.pnl.realized_pnl_percent) : undefined} />
        <Stat label="Win rate" value={w.pnl?.win_rate != null ? `${Math.round(w.pnl.win_rate * (w.pnl.win_rate <= 1 ? 100 : 1))}%` : "—"} />
        <Stat label="Trades · 90d" value={w.pnl?.traded_times ?? "—"} sub={w.pnl ? `${w.pnl.traded_token_count} tokens` : undefined} />
        <Stat label="Smart money?" value={smLabels.length ? "Yes" : "No"} className={smLabels.length ? "text-up" : "text-muted"} sub={smLabels.map((l) => l.label).join(", ") || undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <RelatedGraph center={address} related={w.related} chain={chain} />
        <InsightCard kind="wallet" chain={chain} address={address} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Holdings" source="Nansen Profiler › Current Balances">
          {w.balances.length === 0 ? (
            <Empty error={w.errors.balances}>No balances found.</Empty>
          ) : (
            <div className="space-y-1.5">
              {w.balances.slice(0, 12).map((b) => (
                <Link key={b.token_address + b.chain} href={`/token/${b.token_address}?chain=${chain}`} className="block rounded-lg px-2 py-1 hover:bg-panel-2">
                  <div className="flex text-sm">
                    <span className="font-medium">{b.token_symbol}</span>
                    <span className="num ml-auto">{usd(b.value_usd)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-panel-2">
                    <div className="h-1.5 rounded bg-accent" style={{ width: `${total ? (b.value_usd / total) * 100 : 0}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Best calls · 90d" source="Nansen Profiler › PnL Summary">
          {!w.pnl?.top5_tokens?.length ? (
            <Empty error={w.errors.pnl}>No PnL history.</Empty>
          ) : (
            <div className="space-y-1">
              {w.pnl.top5_tokens.map((x) => (
                <Link key={x.token_address} href={`/token/${x.token_address}?chain=${chain}`} className="flex items-center rounded-lg px-2 py-1.5 text-sm hover:bg-panel-2">
                  <span className="font-medium">{x.token_symbol}</span>
                  <span className={`num ml-auto ${tone(x.realized_pnl)}`}>{usd(x.realized_pnl, true)}</span>
                  <span className="num w-16 text-right text-xs text-muted">{pct(x.realized_roi, 0)}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent trades" source="Nansen Profiler › Address DEX Trades">
          {w.trades.length === 0 ? (
            <Empty error={w.errors.trades}>No DEX trades in the last 30 days.</Empty>
          ) : (
            <div className="divide-y divide-border">
              {w.trades.slice(0, 12).map((t) => (
                <div key={t.transaction_hash + t.token_bought_address} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-down">{t.token_sold_symbol}</span>
                    <span className="mx-1 text-muted">→</span>
                    <span className="text-up">{t.token_bought_symbol}</span>
                  </span>
                  <span className="num">{usd(t.trade_value_usd)}</span>
                  <span className="w-14 text-right text-xs text-muted">{ago(t.block_timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

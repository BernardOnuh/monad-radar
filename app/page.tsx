import Link from "next/link";
import { Suspense } from "react";
import ScanBox from "@/components/ScanBox";
import { Empty, Panel } from "@/components/ui";
import { tone, usd } from "@/lib/format";
import { api, parseChain, safe } from "@/lib/nansen";

export default function Home(props: PageProps<"/">) {
  return (
    <div className="space-y-8">
      <section className="pt-6 text-center sm:pt-12">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-up live-dot" /> Powered by Nansen onchain intelligence
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Who <span className="text-accent-2">really</span> controls that token?
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          Paste any Monad token. Radar maps its holders, traces who funded them, finds wallets secretly working together, reads who is buying and
          dumping — and tells you in plain English how risky it is.
        </p>
        <div className="mx-auto mt-6 max-w-2xl">
          <Suspense>
            <ScanBox />
          </Suspense>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["🫧", "Holder map", "Bubble map of top holders, with linked wallets grouped by shared funders and direct transfers."],
          ["🚨", "Risk score", "Concentration, insider clusters, fresh-wallet bots, exchange deposits, winners exiting, liquidity."],
          ["✦", "AI verdict", "An analyst that reads every Nansen signal and explains what it means — with the numbers."],
        ].map(([i, t, d]) => (
          <div key={t} className="card p-4">
            <div className="text-xl">{i}</div>
            <div className="mt-1 font-semibold">{t}</div>
            <div className="text-sm text-muted">{d}</div>
          </div>
        ))}
      </div>

      <Suspense fallback={<div className="skeleton h-64 w-full" />}>
        <Trending searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Trending({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const sp = await searchParams;
  const chain = parseChain(typeof sp.chain === "string" ? sp.chain : undefined);
  const r = await safe(api.screener(chain, "24h", 15));
  const rows = r.data?.data ?? [];

  return (
    <Panel title={`Trending on ${chain} · 24h`} source="Nansen Token Screener · click any token to X-ray it">
      {rows.length === 0 ? (
        <Empty error={r.error}>No trending tokens returned.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="px-2 py-1 font-normal">Token</th>
                <th className="px-2 py-1 text-right font-normal">Price Δ</th>
                <th className="px-2 py-1 text-right font-normal">Volume</th>
                <th className="px-2 py-1 text-right font-normal">Net flow</th>
                <th className="px-2 py-1 text-right font-normal">Mcap</th>
                <th className="px-2 py-1 text-right font-normal">Liquidity</th>
                <th className="px-2 py-1 text-right font-normal">Traders</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.token_address} className="border-t border-border hover:bg-panel-2">
                  <td className="px-2 py-2 font-medium">{t.token_symbol}</td>
                  <td className={`num px-2 text-right ${tone(t.price_change)}`}>
                    {t.price_change != null ? `${(Math.abs(t.price_change) <= 5 ? t.price_change * 100 : t.price_change).toFixed(1)}%` : "—"}
                  </td>
                  <td className="num px-2 text-right">{usd(t.volume)}</td>
                  <td className={`num px-2 text-right ${tone(t.netflow)}`}>{usd(t.netflow, true)}</td>
                  <td className="num px-2 text-right">{usd(t.market_cap_usd)}</td>
                  <td className="num px-2 text-right">{usd(t.liquidity)}</td>
                  <td className="num px-2 text-right">{t.nof_traders ?? "—"}</td>
                  <td className="px-2 text-right">
                    <Link href={`/token/${t.token_address}?chain=${chain}`} className="rounded-lg bg-accent/15 px-2.5 py-1 text-xs text-accent-2 hover:bg-accent hover:text-white">
                      X-ray →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

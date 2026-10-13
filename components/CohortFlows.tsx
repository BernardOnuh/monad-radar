import { usd } from "@/lib/format";
import type { FlowIntel } from "@/lib/nansen";

const COHORTS = [
  ["smart_trader", "Smart traders", "🧠"],
  ["top_pnl", "Top PnL wallets", "🏆"],
  ["whale", "Whales", "🐋"],
  ["public_figure", "Public figures", "📣"],
  ["fresh_wallets", "Fresh wallets", "🌱"],
  ["exchange", "Exchanges", "🏦"],
] as const;

export default function CohortFlows({ d1, d7 }: { d1: FlowIntel | null; d7: FlowIntel | null }) {
  const get = (d: FlowIntel | null, k: string, f: "net_flow_usd" | "wallet_count") =>
    d ? ((d as unknown as Record<string, number>)[`${k}_${f}`] ?? 0) : 0;
  const max = Math.max(1, ...COHORTS.flatMap(([k]) => [Math.abs(get(d1, k, "net_flow_usd")), Math.abs(get(d7, k, "net_flow_usd"))]));

  const Bar = ({ v }: { v: number }) => (
    <div className="relative h-4 w-full">
      <div className="absolute left-1/2 top-0 h-4 w-px bg-border" />
      <div
        className={`absolute top-0.5 h-3 rounded ${v >= 0 ? "left-1/2 bg-up/70" : "right-1/2 bg-down/70"}`}
        style={{ width: `${(Math.abs(v) / max) * 50}%` }}
      />
    </div>
  );

  return (
    <section className="card min-w-0 p-4 sm:p-5">
      <h2 className="font-semibold">Who is moving it?</h2>
      <p className="mb-4 text-xs text-muted">Nansen Token God Mode › Flow Intelligence · net flow by wallet cohort</p>
      {!d1 && !d7 ? (
        <p className="py-6 text-center text-sm text-muted">Flow intelligence not available for this token/chain.</p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-[minmax(0,110px)_1fr_1fr] sm:grid-cols-[150px_1fr_1fr] gap-3 text-xs text-muted">
            <span />
            <span className="text-center">24h</span>
            <span className="text-center">7d</span>
          </div>
          {COHORTS.map(([k, label, icon]) => {
            const a = get(d1, k, "net_flow_usd");
            const b = get(d7, k, "net_flow_usd");
            return (
              <div key={k} className="grid grid-cols-[minmax(0,110px)_1fr_1fr] sm:grid-cols-[150px_1fr_1fr] items-center gap-3">
                <div className="min-w-0 text-xs sm:text-sm">
                  <span className="mr-1 sm:mr-1.5">{icon}</span>
                  {label}
                  <span className="ml-1 text-xs text-muted">({get(d7, k, "wallet_count") || get(d1, k, "wallet_count")})</span>
                </div>
                <div>
                  <Bar v={a} />
                  <div className={`num text-center text-xs ${a > 0 ? "text-up" : a < 0 ? "text-down" : "text-muted"}`}>{usd(a, true)}</div>
                </div>
                <div>
                  <Bar v={b} />
                  <div className={`num text-center text-xs ${b > 0 ? "text-up" : b < 0 ? "text-down" : "text-muted"}`}>{usd(b, true)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

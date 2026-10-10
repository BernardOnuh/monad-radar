import "server-only";
import { api, safe, type Chain, type Counterparty, type FirstFunder, type Holder } from "./nansen";

/** Labels that mark pools, routers, bridges, burn addresses, exchanges — not "real" holders. */
const INFRA_RE =
  /pool|pair|\blp\b|router|vault|bridge|burn|null|dead|contract|treasury|staking|multisig|gnosis|safe|uniswap|kuru|pancake|curve|balancer|aerodrome|velodrome|octoswap|ambient|izumi|bean|nad\.fun|bonding/i;
const EXCHANGE_RE = /binance|bybit|okx|coinbase|kraken|gate\.?io|mexc|bitget|kucoin|htx|huobi|upbit|crypto\.com|exchange|\bcex\b|hot wallet|deposit/i;
const DEAD_RE = /^0x0{30,}|dead$/i;

const CLUSTER_N = 20; // top real holders we trace for connections
const POOL = 5; // concurrency for per-wallet calls

export type XHolder = {
  address: string;
  label: string;
  share: number; // 0..1 of supply
  value_usd: number;
  change_7d: number;
  kind: "holder" | "infra" | "exchange";
  cluster?: number;
  funder?: string;
  funderName?: string;
};

export type Cluster = { id: number; members: string[]; share: number; value_usd: number; reasons: string[] };

export type Factor = { id: string; title: string; points: number; max: number; detail: string };

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

class UF {
  p = new Map<string, string>();
  find(x: string): string {
    if (!this.p.has(x)) this.p.set(x, x);
    const r = this.p.get(x)!;
    if (r === x) return x;
    const root = this.find(r);
    this.p.set(x, root);
    return root;
  }
  union(a: string, b: string) {
    this.p.set(this.find(a), this.find(b));
  }
}

export async function xray(chain: Chain, token: string) {
  const lc = (s: string) => s?.toLowerCase?.() ?? "";
  const [info, holdersR, flow1d, flow7d, pnl, buyers, sellers, trend] = await Promise.all([
    safe(api.tokenInfo(chain, token)),
    safe(api.topHolders(chain, token, 40)),
    safe(api.flowIntel(chain, token, "1d")),
    safe(api.flowIntel(chain, token, "7d")),
    safe(api.tokenPnl(chain, token)),
    safe(api.whoBoughtSold(chain, token, "BUY", 1)),
    safe(api.whoBoughtSold(chain, token, "SELL", 1)),
    safe(api.flows(chain, token, "top_100_holders", 30)),
  ]);

  const tInfo = info.data?.data ?? null;
  const supply = Number(tInfo?.token_details?.circulating_supply || tInfo?.token_details?.total_supply || 0);
  const raw: Holder[] = holdersR.data?.data ?? [];

  // Share of supply: prefer amount / supply; else normalise ownership_percentage (ratio vs percent).
  const ownSum = raw.reduce((s, h) => s + (h.ownership_percentage || 0), 0);
  const ownIsRatio = ownSum <= 1.5;
  const shareOf = (h: Holder) =>
    supply > 0 ? h.token_amount / supply : (h.ownership_percentage || 0) / (ownIsRatio ? 1 : 100);

  const holders: XHolder[] = raw.map((h) => {
    const label = h.address_label || "";
    const kind: XHolder["kind"] = EXCHANGE_RE.test(label) ? "exchange" : INFRA_RE.test(label) || DEAD_RE.test(h.address) ? "infra" : "holder";
    return { address: lc(h.address), label, share: shareOf(h), value_usd: h.value_usd, change_7d: h.balance_change_7d, kind };
  });

  const real = holders.filter((h) => h.kind === "holder");
  const traced = real.slice(0, CLUSTER_N);
  const tracedSet = new Set(traced.map((h) => h.address));

  // --- Connection tracing: first funders + counterparties among top holders ---
  const funders = await pool(traced, POOL, (h) => safe(api.firstFunder(h.address)));
  const batches: string[][] = [];
  for (let i = 0; i < traced.length; i += 10) batches.push(traced.slice(i, i + 10).map((h) => h.address));
  const cps = await Promise.all(batches.map((b) => safe(api.counterpartiesBatch(chain, b))));

  const uf = new UF();
  const reasons = new Map<string, Set<string>>(); // root-agnostic edge reasons keyed by address
  const addReason = (a: string, r: string) => {
    if (!reasons.has(a)) reasons.set(a, new Set());
    reasons.get(a)!.add(r);
  };

  const byFunder = new Map<string, string[]>();
  traced.forEach((h, i) => {
    const f: FirstFunder | undefined = funders[i].data?.data?.[0];
    if (!f?.first_funder_address) return;
    h.funder = lc(f.first_funder_address);
    h.funderName = f.first_funder_name || "";
    // A shared exchange hot wallet is weak evidence — skip it.
    if (EXCHANGE_RE.test(h.funderName)) return;
    if (tracedSet.has(h.funder)) {
      uf.union(h.address, h.funder);
      addReason(h.address, "funded by another top holder");
      addReason(h.funder, "funded another top holder");
    }
    byFunder.set(h.funder, [...(byFunder.get(h.funder) ?? []), h.address]);
  });
  for (const [funder, addrs] of byFunder) {
    if (addrs.length < 2) continue;
    for (const a of addrs) {
      uf.union(addrs[0], a);
      addReason(a, `same first funder ${funder.slice(0, 6)}…${funder.slice(-4)}`);
    }
  }

  for (const r of cps) {
    for (const c of (r.data?.data ?? []) as Counterparty[]) {
      const a = lc(c.wallet_address);
      const b = lc(c.counterparty_address);
      if (a !== b && tracedSet.has(a) && tracedSet.has(b)) {
        uf.union(a, b);
        addReason(a, "transacts directly with another top holder");
        addReason(b, "transacts directly with another top holder");
      }
    }
  }

  // Build clusters (size >= 2).
  const groups = new Map<string, XHolder[]>();
  for (const h of traced) {
    const root = uf.find(h.address);
    groups.set(root, [...(groups.get(root) ?? []), h]);
  }
  const clusters: Cluster[] = [...groups.values()]
    .filter((g) => g.length >= 2)
    .map((g) => ({
      id: 0,
      members: g.map((h) => h.address),
      share: g.reduce((s, h) => s + h.share, 0),
      value_usd: g.reduce((s, h) => s + (h.value_usd || 0), 0),
      reasons: [...new Set(g.flatMap((h) => [...(reasons.get(h.address) ?? [])]))].slice(0, 4),
    }))
    .sort((a, b) => b.share - a.share)
    .map((c, i) => ({ ...c, id: i + 1 }));
  for (const c of clusters) for (const m of c.members) {
    const h = holders.find((x) => x.address === m);
    if (h) h.cluster = c.id;
  }

  // --- Risk factors ---
  const factors: Factor[] = [];
  const pctS = (x: number) => `${(x * 100).toFixed(1)}%`;

  const top10 = real.slice(0, 10).reduce((s, h) => s + h.share, 0);
  factors.push({
    id: "concentration",
    title: "Holder concentration",
    max: 25,
    points: top10 > 0.5 ? 25 : top10 > 0.3 ? 15 : top10 > 0.15 ? 7 : 0,
    detail: `Top 10 non-pool holders own ${pctS(top10)} of supply.`,
  });

  const big = clusters[0];
  factors.push({
    id: "clusters",
    title: "Connected wallets",
    max: 30,
    points: !big ? 0 : big.share > 0.2 ? 30 : big.share > 0.1 ? 20 : big.share > 0.05 ? 12 : 5,
    detail: big
      ? `${clusters.length} cluster(s) found. Largest: ${big.members.length} linked wallets holding ${pctS(big.share)} (${big.reasons[0] ?? "linked"}).`
      : `No links found between the top ${traced.length} holders.`,
  });

  const f1 = flow1d.data?.data?.[0];
  const f7 = flow7d.data?.data?.[0];
  const fresh = f1?.fresh_wallets_net_flow_usd ?? 0;
  const posTotal = f1
    ? [f1.smart_trader_net_flow_usd, f1.whale_net_flow_usd, f1.top_pnl_net_flow_usd, f1.public_figure_net_flow_usd, f1.fresh_wallets_net_flow_usd, f1.exchange_net_flow_usd]
        .filter((v) => v > 0)
        .reduce((s, v) => s + v, 0)
    : 0;
  const freshShare = posTotal > 0 && fresh > 0 ? fresh / posTotal : 0;
  factors.push({
    id: "fresh",
    title: "Fresh-wallet buying",
    max: 10,
    points: freshShare > 0.5 ? 10 : freshShare > 0.25 ? 5 : 0,
    detail: f1
      ? `Fresh wallets: ${fmt(fresh)} net 24h across ${f1.fresh_wallets_wallet_count} wallets (${pctS(freshShare)} of inflows) — a common bot/sybil pattern.`
      : "Flow intelligence unavailable.",
  });

  const exch7 = f7?.exchange_net_flow_usd ?? 0;
  factors.push({
    id: "exchange",
    title: "Exchange deposits",
    max: 10,
    points: exch7 > 0 ? 10 : 0,
    detail: f7 ? `Exchanges net ${fmt(exch7)} over 7d (${exch7 > 0 ? "tokens moving onto exchanges = sell pressure" : "net withdrawals"}).` : "Flow intelligence unavailable.",
  });

  const winners = (pnl.data?.data ?? []).filter((p) => p.pnl_usd_total > 0).slice(0, 10);
  const held = winners.length ? winners.reduce((s, p) => s + (p.still_holding_balance_ratio ?? 0), 0) / winners.length : null;
  factors.push({
    id: "winners",
    title: "Winners exiting",
    max: 15,
    points: held == null ? 0 : held < 0.2 ? 15 : held < 0.4 ? 8 : 0,
    detail:
      held == null ? "No PnL leaderboard data." : `Top ${winners.length} profitable traders still hold ${pctS(held)} of their peak position on average.`,
  });

  const liq = Number(tInfo?.spot_metrics?.liquidity_usd || 0);
  const mcap = Number(tInfo?.token_details?.market_cap_usd || 0);
  const liqRatio = mcap > 0 ? liq / mcap : null;
  factors.push({
    id: "liquidity",
    title: "Thin liquidity",
    max: 10,
    points: liqRatio == null ? 0 : liqRatio < 0.02 ? 10 : liqRatio < 0.05 ? 5 : 0,
    detail: liqRatio == null ? "Liquidity/market cap unavailable." : `Liquidity ${fmt(liq)} is ${pctS(liqRatio)} of market cap.`,
  });

  const topDistrib = real.slice(0, 20).filter((h) => (h.change_7d ?? 0) < 0).length;
  factors.push({
    id: "distribution",
    title: "Top holders selling",
    max: 10,
    points: topDistrib >= 12 ? 10 : topDistrib >= 8 ? 5 : 0,
    detail: `${topDistrib} of the top ${Math.min(20, real.length)} holders reduced their balance in the last 7d.`,
  });

  const score = Math.min(100, factors.reduce((s, f) => s + f.points, 0));
  const level = score >= 75 ? "Severe" : score >= 50 ? "High" : score >= 25 ? "Moderate" : "Low";

  return {
    chain,
    token,
    info: tInfo,
    holders,
    clusters,
    traced: traced.length,
    factors,
    score,
    level,
    flow1d: f1 ?? null,
    flow7d: f7 ?? null,
    pnl: pnl.data?.data ?? [],
    buyers: buyers.data?.data ?? [],
    sellers: sellers.data?.data ?? [],
    trend: trend.data?.data ?? [],
    calls: 8 + traced.length + batches.length,
    errors: {
      info: info.error,
      holders: holdersR.error,
      flow: flow1d.error,
      pnl: pnl.error,
      buyers: buyers.error,
      sellers: sellers.error,
      trend: trend.error,
      funders: funders.find((f) => f.error)?.error,
      counterparties: cps.find((c) => c.error)?.error,
    },
  };
}

export type XRay = Awaited<ReturnType<typeof xray>>;

function fmt(n: number) {
  const a = Math.abs(n);
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(1)}K` : a.toFixed(0);
  return `${n < 0 ? "-" : ""}$${s}`;
}

/** Compact payload for the LLM. */
export function xrayForAi(x: XRay) {
  return {
    chain: x.chain,
    token: x.info ? { name: x.info.name, symbol: x.info.symbol, ...x.info.token_details, ...x.info.spot_metrics } : x.token,
    risk_score: x.score,
    risk_level: x.level,
    factors: x.factors.map((f) => ({ factor: f.title, points: `${f.points}/${f.max}`, detail: f.detail })),
    clusters: x.clusters.slice(0, 5).map((c) => ({ wallets: c.members.length, share_of_supply: +(c.share * 100).toFixed(2), value_usd: Math.round(c.value_usd), why_linked: c.reasons })),
    top_holders: x.holders.slice(0, 15).map((h) => ({ label: h.label || "unlabeled", kind: h.kind, share_pct: +(h.share * 100).toFixed(2), change_7d: h.change_7d, cluster: h.cluster ?? null })),
    cohort_flows_24h: x.flow1d,
    cohort_flows_7d: x.flow7d,
    top_pnl_traders: x.pnl.slice(0, 8).map((p) => ({ label: p.trader_address_label, pnl_usd: Math.round(p.pnl_usd_total), still_holding: p.still_holding_balance_ratio })),
    biggest_buyers_24h: x.buyers.slice(0, 5).map((b) => ({ label: b.address_label, usd: Math.round(b.bought_volume_usd) })),
    biggest_sellers_24h: x.sellers.slice(0, 5).map((b) => ({ label: b.address_label, usd: Math.round(b.sold_volume_usd) })),
    holder_trend_30d: x.trend.length ? { first: x.trend[0], last: x.trend[x.trend.length - 1] } : null,
  };
}

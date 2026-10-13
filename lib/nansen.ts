import "server-only";
import { nansenKey } from "./keys";

const BASE = "https://api.nansen.ai/api/v1";
const TTL_MS = 5 * 60 * 1000;

type CacheEntry = { at: number; value: unknown };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export class NansenError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string,
  ) {
    super(message);
  }
}

/** POST to a Nansen API v1 endpoint, with a 5-minute in-memory cache to save credits. */
export async function nansen<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { key } = await nansenKey();
  if (!key) throw new NansenError("No Nansen API key — add your own under API keys", 401, endpoint);

  const cacheKey = endpoint + JSON.stringify(body);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  // Identical concurrent requests (e.g. page render + AI route) share one paid call — per key,
  // so a viewer's own key never waits on a request made with an exhausted one.
  const flightKey = key.slice(-8) + cacheKey;
  const pending = inflight.get(flightKey);
  if (pending) return pending as Promise<T>;
  const p = request<T>(endpoint, body, key, cacheKey).finally(() => inflight.delete(flightKey));
  inflight.set(flightKey, p);
  return p;
}

async function request<T>(endpoint: string, body: Record<string, unknown>, key: string, cacheKey: string): Promise<T> {
  const res = await fetch(BASE + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      msg = j.message ?? j.error?.message ?? j.detail ?? msg;
      if (typeof msg !== "string") msg = JSON.stringify(msg).slice(0, 300);
    } catch {}
    throw new NansenError(friendly(msg, res.status), res.status, endpoint);
  }
  const value = JSON.parse(text) as T;
  cache.set(cacheKey, { at: Date.now(), value });
  return value;
}

function friendly(msg: string, status: number) {
  if (status === 403 && /credit/i.test(msg)) return "Out of Nansen credits — add your own key under API keys";
  if (status === 401) return "Nansen rejected the API key — check it under API keys";
  return msg;
}

/** Run a call, returning { data } or { error } so one failing endpoint never breaks a page. */
export async function safe<T>(
  p: Promise<T>,
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: string }> {
  try {
    return { data: await p };
  } catch (e) {
    const err = e as NansenError;
    return { error: err.status ? `${err.status}: ${err.message}` : String(err.message ?? e) };
  }
}

/** Uncached call for write endpoints (Smart Alerts). */
export async function nansenWrite<T = unknown>(method: "POST" | "GET" | "DELETE" | "PATCH", endpoint: string, body?: unknown): Promise<T> {
  const { key } = await nansenKey();
  if (!key) throw new NansenError("No Nansen API key — add your own under API keys", 401, endpoint);
  const res = await fetch(BASE + endpoint, {
    method,
    headers: { "Content-Type": "application/json", apikey: key },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text.slice(0, 300);
    try {
      const j = JSON.parse(text);
      msg = j.message ?? j.detail ?? msg;
      if (typeof msg !== "string") msg = JSON.stringify(msg).slice(0, 300);
    } catch {}
    throw new NansenError(friendly(msg, res.status), res.status, endpoint);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export const CHAINS = ["monad", "ethereum", "base", "arbitrum", "bnb", "solana"] as const;
export type Chain = (typeof CHAINS)[number];

export function parseChain(v: string | null | undefined): Chain {
  return (CHAINS as readonly string[]).includes(v ?? "") ? (v as Chain) : "monad";
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000).toISOString().slice(0, 10);
}

// ---------- Types (fields from the Nansen OpenAPI spec) ----------

type Page<T> = { data: T[]; pagination?: { page: number; per_page: number; is_last_page: boolean } };

export type NetflowRow = {
  token_address: string;
  token_symbol: string;
  net_flow_1h_usd: number;
  net_flow_24h_usd: number;
  net_flow_7d_usd: number;
  net_flow_30d_usd: number;
  chain: string;
  token_sectors: string[];
  trader_count: number;
  token_age_days: number;
  market_cap_usd: number;
};

export type DexTrade = {
  chain: string;
  block_timestamp: string;
  transaction_hash: string;
  trader_address: string;
  trader_address_label: string;
  token_bought_address: string;
  token_sold_address: string;
  token_bought_symbol: string;
  token_sold_symbol: string;
  token_bought_amount: number;
  token_sold_amount: number;
  trade_value_usd: number;
};

export type HoldingRow = {
  chain: string;
  token_address: string;
  token_symbol: string;
  token_sectors: string[];
  value_usd: number;
  balance_24h_percent_change: number;
  holders_count: number;
  share_of_holdings_percent: number;
  token_age_days: number;
  market_cap_usd: number;
};

export type FlowIntel = {
  public_figure_net_flow_usd: number;
  public_figure_wallet_count: number;
  top_pnl_net_flow_usd: number;
  top_pnl_wallet_count: number;
  whale_net_flow_usd: number;
  whale_wallet_count: number;
  smart_trader_net_flow_usd: number;
  smart_trader_wallet_count: number;
  exchange_net_flow_usd: number;
  exchange_wallet_count: number;
  fresh_wallets_net_flow_usd: number;
  fresh_wallets_wallet_count: number;
};

export type Holder = {
  address: string;
  address_label: string;
  token_amount: number;
  total_outflow: number;
  total_inflow: number;
  balance_change_24h: number;
  balance_change_7d: number;
  balance_change_30d: number;
  ownership_percentage: number;
  value_usd: number;
};

export type PnlTrader = {
  trader_address: string;
  trader_address_label: string;
  pnl_usd_realised: number;
  pnl_usd_unrealised: number;
  pnl_usd_total: number;
  roi_percent_total: number;
  holding_usd: number;
  still_holding_balance_ratio: number;
  nof_trades: number;
};

export type TokenInfo = {
  name: string;
  symbol: string;
  contract_address: string;
  logo?: string;
  token_details?: {
    token_deployment_date?: string;
    website?: string;
    x?: string;
    market_cap_usd?: number;
    fdv_usd?: number;
    circulating_supply?: number;
    total_supply?: number;
  };
  spot_metrics?: {
    volume_total_usd?: number;
    buy_volume_usd?: number;
    sell_volume_usd?: number;
    total_buys?: number;
    total_sells?: number;
    unique_buyers?: number;
    unique_sellers?: number;
    liquidity_usd?: number;
    total_holders?: number;
  };
};

export type Balance = {
  chain: string;
  token_address: string;
  token_symbol: string;
  token_name: string;
  token_amount: number;
  price_usd: number;
  value_usd: number;
};

export type PnlSummary = {
  top5_tokens: { realized_pnl: number; realized_roi: number; token_address: string; token_symbol: string; chain: string }[];
  traded_token_count: number;
  traded_times: number;
  realized_pnl_usd: number;
  realized_pnl_percent: number;
  win_rate: number;
};

export type RelatedWallet = {
  address: string;
  address_label: string;
  relation: string;
  transaction_hash: string;
  block_timestamp: string;
  order: number;
  chain: string;
};

export type AddressLabel = { label: string; category?: string; kind?: string[] };

export type ScreenerRow = {
  chain: string;
  token_address: string;
  token_symbol: string;
  token_age_days?: number;
  market_cap_usd?: number;
  liquidity?: number;
  price_usd?: number;
  price_change?: number;
  fdv?: number;
  nof_traders?: number;
  nof_buyers?: number;
  nof_sellers?: number;
  buy_volume?: number;
  sell_volume?: number;
  volume?: number;
  netflow?: number;
};

export type BuyerSeller = {
  address: string;
  address_label: string;
  bought_volume_usd: number;
  sold_volume_usd: number;
  trade_volume_usd: number;
};

export type FlowPoint = {
  date: string;
  price_usd: number;
  token_amount: number;
  value_usd: number;
  holders_count: number;
  total_inflows_cex: number;
  total_outflows_cex: number;
};

export type FirstFunder = {
  wallet_address: string;
  first_funder_address: string;
  first_funder_name: string;
  transaction_hash: string;
  block_timestamp: string;
  chain: string;
};

export type Counterparty = {
  counterparty_address: string;
  counterparty_address_label: string[] | string | null;
  interaction_count: number;
  total_volume_usd: number;
  wallet_address: string;
};

// ---------- Endpoint helpers ----------

export const api = {
  /** Smart Money › Netflows: which tokens smart money is accumulating / distributing. */
  netflow: (chain: Chain, perPage = 25) =>
    nansen<Page<NetflowRow>>("/smart-money/netflow", {
      chains: [chain],
      filters: { include_stablecoins: false, include_native_tokens: true },
      pagination: { page: 1, per_page: perPage },
      order_by: [{ field: "net_flow_24h_usd", direction: "DESC" }],
    }),

  /** Smart Money › DEX Trades: latest swaps by smart money wallets. */
  smDexTrades: (chain: Chain, perPage = 25, tokenAddress?: string) =>
    nansen<Page<DexTrade>>("/smart-money/dex-trades", {
      chains: [chain],
      ...(tokenAddress
        ? { filters: { token_bought_address: tokenAddress } }
        : {}),
      pagination: { page: 1, per_page: perPage },
      order_by: [{ field: "block_timestamp", direction: "DESC" }],
    }),

  /** Smart Money › Holdings: what smart money holds right now. */
  smHoldings: (chain: Chain, perPage = 20) =>
    nansen<Page<HoldingRow>>("/smart-money/holdings", {
      chains: [chain],
      filters: { include_stablecoins: false, include_native_tokens: true },
      pagination: { page: 1, per_page: perPage },
      order_by: [{ field: "value_usd", direction: "DESC" }],
    }),

  /** TGM › Token Information. */
  tokenInfo: (chain: Chain, token: string) =>
    nansen<{ data: TokenInfo }>("/tgm/token-information", { chain, token_address: token, timeframe: "1d" }),

  /** TGM › Flow Intelligence: net flow by cohort (smart traders, whales, exchanges, fresh wallets...). */
  flowIntel: (chain: Chain, token: string, timeframe: "1h" | "1d" | "7d" = "1d") =>
    nansen<{ data: FlowIntel[] }>("/tgm/flow-intelligence", { chain, token_address: token, timeframe }),

  /** TGM › Holders, filtered by label type. */
  holders: (chain: Chain, token: string, label_type: "smart_money" | "whale" | "all_holders" | "exchange" = "smart_money") =>
    nansen<Page<Holder>>("/tgm/holders", {
      chain,
      token_address: token,
      label_type,
      aggregate_by_entity: false,
      pagination: { page: 1, per_page: 15 },
      order_by: [{ field: "token_amount", direction: "DESC" }],
    }),

  /** TGM › PnL Leaderboard: the most profitable traders of a token. */
  tokenPnl: (chain: Chain, token: string) =>
    nansen<Page<PnlTrader>>("/tgm/pnl-leaderboard", {
      chain,
      token_address: token,
      date: { from: daysAgo(30), to: daysAgo(0) },
      pagination: { page: 1, per_page: 10 },
      order_by: [{ field: "pnl_usd_total", direction: "DESC" }],
    }),

  /** Profiler › Current Balances. */
  balances: (chain: Chain, address: string) =>
    nansen<Page<Balance>>("/profiler/address/current-balance", {
      address,
      chain,
      hide_spam_token: true,
      pagination: { page: 1, per_page: 25 },
      order_by: [{ field: "value_usd", direction: "DESC" }],
    }),

  /** Profiler › PnL Summary (90 days). */
  pnlSummary: (chain: Chain, address: string) =>
    nansen<PnlSummary>("/profiler/address/pnl-summary", {
      address,
      chain,
      date: { from: daysAgo(90), to: daysAgo(0) },
    }),

  /** Profiler › Related Wallets (funders, deployers, multisig signers...). */
  related: (chain: Chain, address: string) =>
    nansen<Page<RelatedWallet>>("/profiler/address/related-wallets", {
      address,
      chain,
      pagination: { page: 1, per_page: 15 },
    }),

  /** Profiler › Labels. */
  labels: (chain: Chain, address: string) =>
    nansen<Page<AddressLabel>>("/profiler/address/labels", {
      address,
      chain,
      pagination: { page: 1, per_page: 30 },
    }),

  /** Token Screener: trending tokens on a chain. */
  screener: (chain: Chain, timeframe: "1h" | "24h" | "7d" = "24h", perPage = 20) =>
    nansen<Page<ScreenerRow>>("/token-screener", {
      chains: [chain],
      timeframe,
      filters: { include_stablecoins: false, include_native_tokens: false },
      pagination: { page: 1, per_page: perPage },
      order_by: [{ field: "volume", direction: "DESC" }],
    }),

  /** TGM › Holders (all holders, larger page for concentration + clustering). */
  topHolders: (chain: Chain, token: string, perPage = 40) =>
    nansen<Page<Holder>>("/tgm/holders", {
      chain,
      token_address: token,
      label_type: "all_holders",
      aggregate_by_entity: false,
      pagination: { page: 1, per_page: perPage },
      order_by: [{ field: "token_amount", direction: "DESC" }],
    }),

  /** TGM › Who Bought/Sold over the last N days. */
  whoBoughtSold: (chain: Chain, token: string, side: "BUY" | "SELL", days = 1) =>
    nansen<Page<BuyerSeller>>("/tgm/who-bought-sold", {
      chain,
      token_address: token,
      buy_or_sell: side,
      date: { from: daysAgo(days), to: daysAgo(0) },
      pagination: { page: 1, per_page: 10 },
      order_by: [{ field: side === "BUY" ? "bought_volume_usd" : "sold_volume_usd", direction: "DESC" }],
    }),

  /** TGM › Flows: daily top-100-holder balance / CEX in-out series. */
  flows: (chain: Chain, token: string, label: "top_100_holders" | "exchange" | "whale" = "top_100_holders", days = 30) =>
    nansen<Page<FlowPoint>>("/tgm/flows", {
      chain,
      token_address: token,
      label,
      date: { from: daysAgo(days), to: daysAgo(0) },
      pagination: { page: 1, per_page: days + 2 },
      order_by: [{ field: "date", direction: "ASC" }],
    }),

  /** Profiler › First Funder: who first sent gas to this wallet. */
  firstFunder: (address: string) =>
    nansen<Page<FirstFunder>>("/profiler/address/first-funder", { address, chain: "all" }),

  /** Profiler › Counterparties (batch, up to 10 wallets). */
  counterpartiesBatch: (chain: Chain, wallets: string[]) =>
    nansen<Page<Counterparty>>("/profiler/address/counterparties/batch", {
      wallet_addresses: wallets.slice(0, 10),
      chain,
      date: { from: daysAgo(180), to: daysAgo(0) },
      source_input: "Combined",
      pagination: { page: 1, per_page: 200 },
      order_by: [{ field: "total_volume_usd", direction: "DESC" }],
    }),

  /** Profiler › Address DEX Trades (last 30 days). */
  walletTrades: (chain: Chain, address: string) =>
    nansen<Page<DexTrade>>("/profiler/dex-trades", {
      address,
      chain,
      date: { from: daysAgo(30), to: daysAgo(0) },
      pagination: { page: 1, per_page: 20 },
      order_by: [{ field: "block_timestamp", direction: "DESC" }],
    }),
};

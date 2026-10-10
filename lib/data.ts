import "server-only";
import { api, safe, type Chain } from "./nansen";

/** Radar home: smart money netflows + latest smart money DEX trades + holdings. */
export async function getMarket(chain: Chain) {
  const [netflow, trades, holdings] = await Promise.all([
    safe(api.netflow(chain, 40)),
    safe(api.smDexTrades(chain, 30)),
    safe(api.smHoldings(chain, 15)),
  ]);
  return {
    chain,
    netflow: netflow.data?.data ?? [],
    trades: trades.data?.data ?? [],
    holdings: holdings.data?.data ?? [],
    errors: { netflow: netflow.error, trades: trades.error, holdings: holdings.error },
  };
}

/** Token deep-dive: info, cohort flows, smart money holders, top PnL traders, recent SM trades. */
export async function getToken(chain: Chain, token: string) {
  const [info, flow1d, flow7d, smHolders, whales, pnl, trades] = await Promise.all([
    safe(api.tokenInfo(chain, token)),
    safe(api.flowIntel(chain, token, "1d")),
    safe(api.flowIntel(chain, token, "7d")),
    safe(api.holders(chain, token, "smart_money")),
    safe(api.holders(chain, token, "whale")),
    safe(api.tokenPnl(chain, token)),
    safe(api.smDexTrades(chain, 15, token)),
  ]);
  return {
    chain,
    token,
    info: info.data?.data ?? null,
    flow1d: flow1d.data?.data?.[0] ?? null,
    flow7d: flow7d.data?.data?.[0] ?? null,
    smHolders: smHolders.data?.data ?? [],
    whales: whales.data?.data ?? [],
    pnl: pnl.data?.data ?? [],
    trades: trades.data?.data ?? [],
    errors: {
      info: info.error,
      flow: flow1d.error,
      smHolders: smHolders.error,
      whales: whales.error,
      pnl: pnl.error,
      trades: trades.error,
    },
  };
}

/** Wallet X-ray: labels, balances, PnL, recent trades, related wallets. */
export async function getWallet(chain: Chain, address: string) {
  const [labels, balances, pnl, trades, related] = await Promise.all([
    safe(api.labels(chain, address)),
    safe(api.balances(chain, address)),
    safe(api.pnlSummary(chain, address)),
    safe(api.walletTrades(chain, address)),
    safe(api.related(chain, address)),
  ]);
  return {
    chain,
    address,
    labels: labels.data?.data ?? [],
    balances: balances.data?.data ?? [],
    pnl: pnl.data ?? null,
    trades: trades.data?.data ?? [],
    related: related.data?.data ?? [],
    errors: {
      labels: labels.error,
      balances: balances.error,
      pnl: pnl.error,
      trades: trades.error,
      related: related.error,
    },
  };
}

export type Market = Awaited<ReturnType<typeof getMarket>>;
export type TokenData = Awaited<ReturnType<typeof getToken>>;
export type WalletData = Awaited<ReturnType<typeof getWallet>>;

/** Trim payloads before sending them to the LLM. */
export function compactForAi(kind: "market" | "token" | "wallet", d: Market | TokenData | WalletData) {
  if (kind === "market") {
    const m = d as Market;
    return {
      chain: m.chain,
      top_inflows: m.netflow.slice(0, 15).map(pick("token_symbol", "net_flow_1h_usd", "net_flow_24h_usd", "net_flow_7d_usd", "trader_count", "market_cap_usd", "token_sectors")),
      top_outflows: [...m.netflow].sort((a, b) => a.net_flow_24h_usd - b.net_flow_24h_usd).slice(0, 8).map(pick("token_symbol", "net_flow_24h_usd", "net_flow_7d_usd", "trader_count")),
      recent_sm_trades: m.trades.slice(0, 15).map(pick("trader_address_label", "token_sold_symbol", "token_bought_symbol", "trade_value_usd", "block_timestamp")),
      top_sm_holdings: m.holdings.slice(0, 10).map(pick("token_symbol", "value_usd", "balance_24h_percent_change", "holders_count")),
    };
  }
  if (kind === "token") {
    const t = d as TokenData;
    return {
      chain: t.chain,
      token: t.info ? { name: t.info.name, symbol: t.info.symbol, ...t.info.token_details, ...t.info.spot_metrics } : t.token,
      cohort_flows_24h: t.flow1d,
      cohort_flows_7d: t.flow7d,
      smart_money_holders: t.smHolders.slice(0, 10).map(pick("address_label", "value_usd", "balance_change_24h", "balance_change_7d", "ownership_percentage")),
      whales: t.whales.slice(0, 8).map(pick("address_label", "value_usd", "balance_change_7d", "ownership_percentage")),
      top_pnl_traders_30d: t.pnl.slice(0, 8).map(pick("trader_address_label", "pnl_usd_total", "roi_percent_total", "still_holding_balance_ratio", "nof_trades")),
      recent_sm_buys: t.trades.slice(0, 10).map(pick("trader_address_label", "token_sold_symbol", "trade_value_usd", "block_timestamp")),
    };
  }
  const w = d as WalletData;
  return {
    chain: w.chain,
    address: w.address,
    labels: w.labels.map((l) => l.label),
    portfolio: w.balances.slice(0, 12).map(pick("token_symbol", "value_usd")),
    portfolio_total_usd: w.balances.reduce((s, b) => s + (b.value_usd || 0), 0),
    pnl_90d: w.pnl,
    recent_trades: w.trades.slice(0, 15).map(pick("token_sold_symbol", "token_bought_symbol", "trade_value_usd", "block_timestamp")),
    related_wallets: w.related.slice(0, 10).map(pick("address_label", "relation")),
  };
}

function pick<T extends object>(...keys: (keyof T)[]) {
  return (o: T) => Object.fromEntries(keys.map((k) => [k, o[k]]));
}

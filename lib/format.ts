export function usd(n: number | null | undefined, signed = false): string {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n < 0 ? "-" : signed && n > 0 ? "+" : "";
  const a = Math.abs(n);
  const s =
    a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(1)}K` : a.toFixed(a < 10 ? 2 : 0);
  return `${sign}$${s}`;
}

export function pct(n: number | null | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  // Nansen returns some ratios as 0..1 and some as percents; values <= 1 in magnitude are treated as ratios.
  const v = Math.abs(n) <= 1 ? n * 100 : n;
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export function short(addr: string | null | undefined): string {
  if (!addr) return "—";
  return addr.length > 14 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function ago(ts: string | null | undefined): string {
  if (!ts) return "";
  const t = new Date(ts.endsWith("Z") || ts.includes("+") ? ts : ts + "Z").getTime();
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function tone(n: number | null | undefined) {
  if (!n) return "text-muted";
  return n > 0 ? "text-up" : "text-down";
}

export const EXPLORERS: Record<string, string> = {
  monad: "https://monadvision.com",
  ethereum: "https://etherscan.io",
  base: "https://basescan.org",
  arbitrum: "https://arbiscan.io",
  bnb: "https://bscscan.com",
  solana: "https://solscan.io",
};

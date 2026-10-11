import AlertButton from "./AlertButton";

const UNISWAP_CHAIN: Record<string, string> = {
  monad: "monad",
  ethereum: "mainnet",
  base: "base",
  arbitrum: "arbitrum",
  bnb: "bnb",
};

function swapUrl(chain: string, token: string, side: "buy" | "sell") {
  if (chain === "solana") {
    return side === "buy" ? `https://jup.ag/swap/SOL-${token}` : `https://jup.ag/swap/${token}-SOL`;
  }
  const c = UNISWAP_CHAIN[chain] ?? "monad";
  const [input, output] = side === "buy" ? ["NATIVE", token] : [token, "NATIVE"];
  return `https://app.uniswap.org/swap?chain=${c}&inputCurrency=${input}&outputCurrency=${output}`;
}

const NOTE: Record<string, { text: string; cls: string }> = {
  Low: { text: "No major red flags found in holder structure or flows.", cls: "text-up" },
  Moderate: { text: "Some warning signs — check the risk factors before trading.", cls: "text-warn" },
  High: { text: "Significant red flags. Trade with caution and small size.", cls: "text-down" },
  Severe: { text: "Severe red flags. Many tokens with this profile get dumped on buyers.", cls: "text-down" },
};

export default function TradeBar({
  chain,
  token,
  symbol,
  level,
  wallets,
  walletsAreCluster,
}: {
  chain: string;
  token: string;
  symbol?: string;
  level: string;
  wallets: string[];
  walletsAreCluster: boolean;
}) {
  const note = NOTE[level] ?? NOTE.Moderate;
  const native = chain === "solana" ? "SOL" : chain === "monad" ? "MON" : chain === "bnb" ? "BNB" : "ETH";
  return (
    <section className="card flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          Trade {symbol ?? "this token"} on {chain === "solana" ? "Jupiter" : "Uniswap"} <span className="capitalize text-muted">· {chain}</span>
        </div>
        <div className={`text-xs ${note.cls}`}>
          {level} risk — {note.text}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <AlertButton chain={chain} token={token} symbol={symbol} wallets={wallets} walletsAreCluster={walletsAreCluster} />
        <a
          href={swapUrl(chain, token, "buy")}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-up px-5 py-2.5 text-sm font-semibold text-bg hover:brightness-110"
        >
          Buy with {native} ↗
        </a>
        <a
          href={swapUrl(chain, token, "sell")}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-down px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
        >
          Sell for {native} ↗
        </a>
      </div>
      <p className="w-full text-[11px] text-muted">Opens an external DEX with the token preloaded. You review and sign the swap in your own wallet. Not financial advice.</p>
    </section>
  );
}

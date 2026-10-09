# Monad Smart Money Radar

**What is smart money doing on Monad right now — and what does it mean?**

Radar turns raw Nansen onchain intelligence into answers a normal person can act on. Instead of dumping tables, every view pairs Nansen data with a visual and an AI analyst ("Radar") that reads the numbers and explains them in plain English with a verdict and conviction level.

Built for **Monad Metropolis — Best use of Nansen**.

## Features

| View | What you get | Nansen data used |
|---|---|---|
| **Radar (home)** | Diverging bar chart of tokens smart money is accumulating vs. distributing (1h / 24h / 7d / 30d), live smart money trade feed, smart money bags, and an AI market read | Smart Money › Netflows, DEX Trades, Holdings |
| **Token deep-dive** | "Who is moving it?" cohort flow chart (smart traders, top-PnL wallets, whales, public figures, fresh wallets, exchanges), smart money & whale holders, 30d PnL leaderboard, recent SM buys, AI verdict | Token God Mode › Token Information, Flow Intelligence (1d + 7d), Holders (smart_money + whale), PnL Leaderboard; Smart Money › DEX Trades |
| **Wallet X-ray** | Nansen labels, portfolio, 90d realized PnL & win rate, best calls, recent trades, a network graph of related wallets (funders, deployers, signers) you can click through, AI trader profile | Profiler › Labels, Current Balances, PnL Summary, DEX Trades, Related Wallets |
| **Ask Radar** | An AI agent that decides which Nansen endpoints to call, chains them (e.g. find top SM trade → profile that wallet → read that token), and answers with real numbers. Every tool call is shown on screen. | All of the above, exposed as 4 agent tools |

Everything is clickable: token → its smart money holders → a holder's wallet → its related wallets → their tokens.

Defaults to **Monad**; a chain switcher also supports Ethereum, Base, Arbitrum, BNB and Solana for comparison.

## How Nansen is integrated

All calls go server-side through `lib/nansen.ts` (`POST https://api.nansen.ai/api/v1/...`, `apikey` header, 5-minute in-memory cache to save credits).

| Endpoint | Used for |
|---|---|
| `POST /smart-money/netflow` | Radar flow chart, AI market read, agent `smart_money_overview` |
| `POST /smart-money/dex-trades` | Live SM trade feed; token-filtered SM buys; agent `smart_money_trades` |
| `POST /smart-money/holdings` | "Smart money bags" panel |
| `POST /tgm/token-information` | Token header stats (mcap, FDV, volume, buy share, liquidity, holders) |
| `POST /tgm/flow-intelligence` | Cohort net-flow chart (24h + 7d) |
| `POST /tgm/holders` | Smart money holders + whale holders (`label_type`) |
| `POST /tgm/pnl-leaderboard` | "Who's winning" 30d leaderboard |
| `POST /profiler/address/labels` | Wallet labels / "is this smart money?" |
| `POST /profiler/address/current-balance` | Wallet portfolio |
| `POST /profiler/address/pnl-summary` | Realized PnL, win rate, best calls |
| `POST /profiler/dex-trades` | Wallet recent trades |
| `POST /profiler/address/related-wallets` | Wallet network graph |

### AI layer

- `lib/data.ts` assembles multi-endpoint reports (market / token / wallet) and compacts them for the LLM.
- `GET /api/insight` → an LLM (via OpenRouter) returns `{verdict, conviction, headline, bullets, watch}` grounded in the Nansen numbers.
- `POST /api/ask` → tool-calling agent loop. Tools: `smart_money_overview`, `token_report`, `wallet_report`, `smart_money_trades`. The UI shows each tool call, its arguments and latency.

## Run locally

```bash
npm install
cp .env.example .env.local   # add your keys
npm run dev
```

`.env.local`:

```
NANSEN_API_KEY=...
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5   # any OpenRouter model with tool calling
```

## Stack

Next.js 16 (App Router, Server Components, Partial Prerendering) · Tailwind CSS v4 · Nansen API · OpenRouter.

_Not financial advice._

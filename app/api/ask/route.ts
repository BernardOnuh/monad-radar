import { chat, type ChatMessage, type ToolDef } from "@/lib/ai";
import { compactForAi, getMarket, getToken, getWallet } from "@/lib/data";
import { api, CHAINS, parseChain } from "@/lib/nansen";
import { xray, xrayForAi } from "@/lib/xray";

const chainParam = { type: "string", enum: [...CHAINS], description: "Chain, default monad" };
const addr = (d: string) => ({ type: "string", description: d });

const tools: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "token_xray",
      description:
        "Full safety X-ray of a token: top holders, connected-wallet clusters (shared first funders / direct transfers), risk score with factors, cohort flows, PnL leaders, biggest buyers & sellers. Use for 'is this token safe', 'who controls it', 'is it a rug'.",
      parameters: {
        type: "object",
        properties: { chain: chainParam, token_address: addr("Token contract address") },
        required: ["token_address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "trending_tokens",
      description: "Nansen Token Screener: top tokens by 24h volume on a chain, with price change, net flow, market cap, liquidity, traders and contract addresses.",
      parameters: { type: "object", properties: { chain: chainParam }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "smart_money_overview",
      description:
        "Nansen Smart Money netflows (1h/24h/7d/30d), latest smart money DEX trades and top smart money holdings on a chain. Use for 'what is smart money buying/selling'.",
      parameters: { type: "object", properties: { chain: chainParam }, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "token_report",
      description:
        "Nansen Token God Mode report for one token: info, flow intelligence by cohort (smart traders, whales, exchanges, fresh wallets), smart money holders, whales, top PnL traders, recent smart money buys.",
      parameters: {
        type: "object",
        properties: { chain: chainParam, token_address: addr("Token contract address") },
        required: ["token_address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "wallet_report",
      description: "Nansen Profiler report for a wallet: labels, balances, 90d PnL & win rate, recent DEX trades, related wallets.",
      parameters: {
        type: "object",
        properties: { chain: chainParam, address: addr("Wallet address") },
        required: ["address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "smart_money_trades",
      description: "Latest Nansen smart money DEX trades on a chain, optionally only those buying a given token.",
      parameters: {
        type: "object",
        properties: { chain: chainParam, token_address: addr("Optional token address bought") },
        required: [],
      },
    },
  },
];

async function runTool(name: string, args: Record<string, string>) {
  const chain = parseChain(args.chain);
  switch (name) {
    case "token_xray":
      return xrayForAi(await xray(chain, args.token_address));
    case "trending_tokens":
      return (await api.screener(chain, "24h", 20)).data;
    case "smart_money_overview":
      return compactForAi("market", await getMarket(chain));
    case "token_report":
      return compactForAi("token", await getToken(chain, args.token_address));
    case "wallet_report":
      return compactForAi("wallet", await getWallet(chain, args.address));
    case "smart_money_trades":
      return (await api.smDexTrades(chain, 25, args.token_address || undefined)).data.map((t) => ({
        trader: t.trader_address_label || t.trader_address,
        sold: t.token_sold_symbol,
        bought: t.token_bought_symbol,
        bought_address: t.token_bought_address,
        usd: t.trade_value_usd,
        at: t.block_timestamp,
      }));
    default:
      return { error: "unknown tool" };
  }
}

const SYSTEM = `You are Radar, an onchain intelligence agent for Monad powered by Nansen data. Your specialty is token safety: who controls a token, whether insiders are linked, and who is buying or dumping.
If the user names a token by symbol, call trending_tokens first to find its contract address.
Use the tools to fetch real data before answering. Default chain is "monad" unless the user names another.
Answer in concise markdown: lead with the direct answer, then 3-6 bullets with concrete numbers ($ amounts, wallet labels, token symbols).
If the data is empty or an endpoint errors, say so plainly. Never invent numbers. Not financial advice.`;

export async function POST(req: Request) {
  const { question } = (await req.json()) as { question?: string };
  if (!question?.trim()) return Response.json({ error: "Ask something" }, { status: 400 });

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: question },
  ];
  const trace: { tool: string; args: Record<string, string>; ms: number; ok: boolean }[] = [];

  try {
    for (let step = 0; step < 6; step++) {
      const res = await chat({ messages, tools, maxTokens: 1200 });
      if (!res.tool_calls?.length) {
        return Response.json({ answer: res.content ?? "", trace });
      }
      messages.push({ role: "assistant", content: res.content, tool_calls: res.tool_calls });
      for (const call of res.tool_calls) {
        const t0 = Date.now();
        let args: Record<string, string> = {};
        let out: unknown;
        let ok = true;
        try {
          args = JSON.parse(call.function.arguments || "{}");
          out = await runTool(call.function.name, args);
        } catch (e) {
          ok = false;
          out = { error: (e as Error).message };
        }
        trace.push({ tool: call.function.name, args, ms: Date.now() - t0, ok });
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(out).slice(0, 20000) });
      }
    }
    return Response.json({ answer: "I ran out of steps — try a narrower question.", trace });
  } catch (e) {
    return Response.json({ error: (e as Error).message, trace }, { status: 500 });
  }
}

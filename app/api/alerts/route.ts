import { nansenWrite, parseChain } from "@/lib/nansen";

/** Alerts created by this app are prefixed so the list only shows ours. */
const PREFIX = "Radar · ";

type Body = {
  preset: "insiders" | "large" | "smflow";
  chain: string;
  token: string;
  symbol?: string;
  wallets?: string[];
  minUsd?: number;
  channel: { type: "telegram" | "discord" | "webhook"; value: string };
};

function channelOf(c: Body["channel"]) {
  const v = c.value.trim();
  if (c.type === "telegram") return { type: "telegram", data: { chatId: v } };
  if (!/^https:\/\//.test(v)) throw new Error("Webhook URL must start with https://");
  return { type: c.type, data: { webhookUrl: v } };
}

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as Body;
    const chain = parseChain(b.chain);
    if (!/^0x[0-9a-fA-F]{40}$/.test(b.token) && chain !== "solana") throw new Error("Invalid token address");
    if (!b.channel?.value) throw new Error("Add a Telegram chat ID or webhook URL");
    const token = { chain, address: b.token };
    const sym = b.symbol || `${b.token.slice(0, 6)}…`;
    const minUsd = Math.max(0, Number(b.minUsd) || 0);

    let body: Record<string, unknown>;
    if (b.preset === "insiders") {
      const wallets = (b.wallets ?? []).filter((w) => /^0x[0-9a-fA-F]{40}$/.test(w)).slice(0, 25);
      if (!wallets.length) throw new Error("No linked wallets to watch for this token");
      body = {
        name: `${PREFIX}${sym} insiders selling`,
        description: `Linked top-holder wallets of ${sym} selling or moving the token (found by Monad Radar X-ray).`,
        type: "common-token-transfer",
        timeWindow: "realtime",
        data: {
          chains: [chain],
          subjects: wallets.map((value) => ({ type: "address", value })),
          events: ["sell", "send"],
          usdValue: { min: minUsd },
          inclusion: { tokens: [token] },
          exclusion: {},
        },
      };
    } else if (b.preset === "large") {
      body = {
        name: `${PREFIX}${sym} transfers > $${minUsd.toLocaleString()}`,
        description: `Any ${sym} buy or sell above $${minUsd.toLocaleString()}.`,
        type: "common-token-transfer",
        timeWindow: "realtime",
        data: {
          chains: [chain],
          events: ["buy", "sell"],
          usdValue: { min: minUsd },
          inclusion: { tokens: [token] },
          exclusion: {},
        },
      };
    } else {
      body = {
        name: `${PREFIX}${sym} smart money netflow > $${minUsd.toLocaleString()}`,
        description: `Smart money net inflow or outflow on ${sym} beyond $${minUsd.toLocaleString()} in 1h.`,
        type: "sm-token-flows",
        timeWindow: "1h",
        data: {
          chains: [chain],
          events: ["sm-token-flows"],
          netflow_1h: { min: minUsd },
          inclusion: { tokens: [token] },
          exclusion: {},
        },
      };
    }
    const res = await nansenWrite("POST", "/smart-alert", { ...body, channels: [channelOf(b.channel)], isEnabled: true, createdBy: "monad-radar" });
    return Response.json({ ok: true, alert: res });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function GET() {
  try {
    const res = await nansenWrite<unknown>("GET", "/smart-alert/list");
    const list = (Array.isArray(res) ? res : ((res as { data?: unknown[] }).data ?? (res as { alerts?: unknown[] }).alerts ?? [])) as {
      id?: string;
      name?: string;
    }[];
    return Response.json({ alerts: list.filter((a) => a.name?.startsWith(PREFIX)) });
  } catch (e) {
    return Response.json({ error: (e as Error).message, alerts: [] }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[\w-]+$/.test(id)) return Response.json({ error: "missing id" }, { status: 400 });
  try {
    await nansenWrite("DELETE", `/smart-alert/${id}`);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

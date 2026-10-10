import "server-only";

const URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ToolDef = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export function model() {
  return process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";
}

/** One OpenRouter chat completion (OpenAI-compatible). */
export async function chat(opts: {
  messages: ChatMessage[];
  tools?: ToolDef[];
  json?: boolean;
  maxTokens?: number;
}): Promise<{ content: string | null; tool_calls?: ToolCall[] }> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/monad-radar",
      "X-Title": "Monad Smart Money Radar",
    },
    body: JSON.stringify({
      model: model(),
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 900,
      temperature: 0.3,
      ...(opts.tools ? { tools: opts.tools } : {}),
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const msg = j.choices?.[0]?.message ?? {};
  return { content: msg.content ?? null, tool_calls: msg.tool_calls };
}

export type Insight = {
  verdict: string;
  conviction: "Low" | "Medium" | "High";
  headline: string;
  bullets: string[];
  watch: string[];
};

const INSIGHT_SYSTEM = `You are Radar, an onchain analyst. You receive raw Nansen data (smart money flows, holders, PnL, labels) and turn it into a short, honest read for a non-expert.
Rules:
- Ground every claim in the numbers provided; cite figures (use $1.2M style).
- If data is thin or missing, say so and lower conviction.
- Never give financial advice; describe what the data shows.
Respond with ONLY JSON: {"verdict":"Bullish|Bearish|Neutral|Mixed (unless the task specifies other verdict values)","conviction":"Low|Medium|High","headline":"<=14 words","bullets":["3-5 bullets, <=25 words each"],"watch":["1-3 things to watch next"]}`;

export async function insight(kind: "token" | "wallet" | "market" | "xray", data: unknown): Promise<Insight> {
  const prompt =
    kind === "xray"
      ? `This is a token safety X-ray. Explain to a retail buyer who really controls this token and how risky it is.
Use verdict = one of "Low risk" | "Moderate risk" | "High risk" | "Severe risk" (consistent with risk_score, but you may move one level if the evidence clearly warrants it).
Headline: the single most important finding. Bullets: concentration & connected-wallet clusters (cite % of supply and why they are linked), who is buying vs selling (cohorts, exchanges, fresh wallets), whether profitable traders are exiting, liquidity. Watch: concrete red/green flags to monitor.`
      : kind === "wallet"
      ? "Profile this wallet: what kind of trader is it, how good is it, what is it doing now, who is it connected to? Use verdict to describe its current stance (accumulating=Bullish, exiting=Bearish)."
      : kind === "token"
        ? "Read this token: what are smart money, whales, exchanges and fresh wallets doing, who is profiting, and what does it imply?"
        : "Summarize what smart money is doing on this chain right now: biggest rotations in and out, themes, anything unusual.";
  const { content } = await chat({
    messages: [
      { role: "system", content: INSIGHT_SYSTEM },
      { role: "user", content: `${prompt}\n\nDATA:\n${JSON.stringify(data).slice(0, 24000)}` },
    ],
    json: true,
  });
  return parseJson<Insight>(content ?? "{}");
}

export function parseJson<T>(s: string): T {
  const m = s.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : s) as T;
}

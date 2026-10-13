import { cookies } from "next/headers";
import { NANSEN_COOKIE, OPENROUTER_COOKIE, nansenKey, openRouterKey } from "@/lib/keys";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

async function checkNansen(key: string) {
  const r = await fetch("https://api.nansen.ai/api/v1/account", { headers: { apikey: key }, cache: "no-store" });
  if (!r.ok) return { ok: false as const, error: r.status === 401 ? "Nansen rejected this key" : `Nansen returned ${r.status}` };
  const j = (await r.json()) as { plan?: string; credits_remaining?: number };
  return { ok: true as const, plan: j.plan, credits: j.credits_remaining };
}

async function checkOpenRouter(key: string) {
  const r = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!r.ok) return { ok: false as const, error: r.status === 401 ? "OpenRouter rejected this key" : `OpenRouter returned ${r.status}` };
  const j = (await r.json()) as { data?: { limit_remaining?: number | null; usage?: number } };
  return { ok: true as const, remaining: j.data?.limit_remaining ?? null };
}

const tail = (k?: string) => (k ? `…${k.slice(-4)}` : null);

/** Status of the keys this viewer is using (never returns the key itself). */
export async function GET() {
  const [n, o] = await Promise.all([nansenKey(), openRouterKey()]);
  const [nc, oc] = await Promise.all([n.key ? checkNansen(n.key) : null, o.key ? checkOpenRouter(o.key) : null]);
  return Response.json({
    nansen: { source: n.source, tail: n.source === "user" ? tail(n.key) : null, ...(nc ?? {}) },
    openrouter: { source: o.source, tail: o.source === "user" ? tail(o.key) : null, ...(oc ?? {}) },
  });
}

/** Save a viewer's own key after validating it. */
export async function POST(req: Request) {
  const { provider, key } = (await req.json()) as { provider?: "nansen" | "openrouter"; key?: string };
  const k = key?.trim() ?? "";
  if (!k || k.length > 300 || /\s/.test(k)) return Response.json({ error: "Paste a valid key" }, { status: 400 });

  const store = await cookies();
  if (provider === "nansen") {
    const c = await checkNansen(k);
    if (!c.ok) return Response.json({ error: c.error }, { status: 400 });
    store.set(NANSEN_COOKIE, k, COOKIE_OPTS);
    return Response.json({ ok: true, credits: c.credits, plan: c.plan });
  }
  if (provider === "openrouter") {
    const c = await checkOpenRouter(k);
    if (!c.ok) return Response.json({ error: c.error }, { status: 400 });
    store.set(OPENROUTER_COOKIE, k, COOKIE_OPTS);
    return Response.json({ ok: true, remaining: c.remaining });
  }
  return Response.json({ error: "Unknown provider" }, { status: 400 });
}

/** Forget a viewer's key and fall back to the server's. */
export async function DELETE(req: Request) {
  const provider = new URL(req.url).searchParams.get("provider");
  const store = await cookies();
  if (provider === "nansen" || provider === "all") store.delete(NANSEN_COOKIE);
  if (provider === "openrouter" || provider === "all") store.delete(OPENROUTER_COOKIE);
  return Response.json({ ok: true });
}

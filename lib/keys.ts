import "server-only";
import { cookies } from "next/headers";

/**
 * Bring-your-own-key: a viewer (e.g. a hackathon judge) can save their own Nansen / OpenRouter
 * key in an httpOnly cookie. It takes priority over the server's env key for their requests only.
 */
export const NANSEN_COOKIE = "radar_nansen_key";
export const OPENROUTER_COOKIE = "radar_openrouter_key";

async function fromCookie(name: string): Promise<string | undefined> {
  try {
    return (await cookies()).get(name)?.value || undefined;
  } catch {
    return undefined; // outside a request scope
  }
}

export async function nansenKey(): Promise<{ key?: string; source: "user" | "server" | "none" }> {
  const user = await fromCookie(NANSEN_COOKIE);
  if (user) return { key: user, source: "user" };
  if (process.env.NANSEN_API_KEY) return { key: process.env.NANSEN_API_KEY, source: "server" };
  return { source: "none" };
}

export async function openRouterKey(): Promise<{ key?: string; source: "user" | "server" | "none" }> {
  const user = await fromCookie(OPENROUTER_COOKIE);
  if (user) return { key: user, source: "user" };
  if (process.env.OPENROUTER_API_KEY) return { key: process.env.OPENROUTER_API_KEY, source: "server" };
  return { source: "none" };
}

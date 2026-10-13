import { insight } from "@/lib/ai";
import { compactForAi, getMarket, getToken, getWallet } from "@/lib/data";
import { parseChain } from "@/lib/nansen";
import { xray, xrayForAi } from "@/lib/xray";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const chain = parseChain(url.searchParams.get("chain"));
  const address = url.searchParams.get("address") ?? "";

  try {
    if (kind === "market") {
      return Response.json(await insight("market", compactForAi("market", await getMarket(chain))));
    }
    if (kind === "token" && address) {
      return Response.json(await insight("token", compactForAi("token", await getToken(chain, address))));
    }
    if (kind === "xray" && address) {
      return Response.json(await insight("xray", xrayForAi(await xray(chain, address))));
    }
    if (kind === "wallet" && address) {
      return Response.json(await insight("wallet", compactForAi("wallet", await getWallet(chain, address))));
    }
    return Response.json({ error: "bad request" }, { status: 400 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}

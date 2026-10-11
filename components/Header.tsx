"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";

const CHAINS = ["monad", "ethereum", "base", "arbitrum", "bnb", "solana"];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const chain = params.get("chain") ?? "monad";
  const [q, setQ] = useState("");

  const go = (kind: "token" | "wallet") => {
    const v = q.trim();
    if (!v) return;
    router.push(`/${kind}/${v}?chain=${chain}`);
  };

  const setChain = (c: string) => {
    const p = new URLSearchParams(params);
    p.set("chain", c);
    router.push(`${pathname}?${p}`);
  };

  const nav = (href: string, label: string) => (
    <Link
      href={`${href}?chain=${chain}`}
      className={`rounded-lg px-3 py-1.5 text-sm transition ${
        pathname === href ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <Link href={`/?chain=${chain}`} className="flex items-center gap-2 font-semibold">
          <Logo />
          <span>
            Monad <span className="text-accent-2">Radar</span>
          </span>
        </Link>
        <nav className="flex gap-1">
          {nav("/", "X-ray")}
          {nav("/smart-money", "Smart money")}
          {nav("/ask", "Ask Radar")}
          {nav("/alerts", "Alerts")}
        </nav>
        <div className="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2">
          <form
            className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-border bg-panel px-2 py-1 sm:max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              go("token");
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Paste a wallet or token address…"
              className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted"
            />
            <button type="button" onClick={() => go("wallet")} className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-panel-2 hover:text-fg">
              Wallet
            </button>
            <button type="submit" className="rounded-lg bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-2">
              Token
            </button>
          </form>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="rounded-xl border border-border bg-panel px-2 py-2 text-sm capitalize outline-none"
            aria-label="Chain"
          >
            {CHAINS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}

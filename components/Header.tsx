"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import Logo from "./Logo";

const CHAINS = ["monad", "ethereum", "base", "arbitrum", "bnb", "solana"];

const Icon = {
  xray: (
    <path d="M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12l6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  ),
  sm: <path d="M4 18h16M7 15V9M12 15V5M17 15v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  ask: (
    <path d="M5 5h14v10H9l-4 4V5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  ),
  bell: (
    <path
      d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16zM10 20a2 2 0 0 0 4 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  ),
  search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
};

const NAV: { href: string; label: string; short: string; icon: ReactNode }[] = [
  { href: "/", label: "X-ray", short: "X-ray", icon: Icon.xray },
  { href: "/smart-money", label: "Smart money", short: "Smart $", icon: Icon.sm },
  { href: "/ask", label: "Ask Radar", short: "Ask", icon: Icon.ask },
  { href: "/alerts", label: "Alerts", short: "Alerts", icon: Icon.bell },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const chain = params.get("chain") ?? "monad";
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const go = (kind: "token" | "wallet") => {
    const v = q.trim();
    if (!v) return;
    setSearchOpen(false);
    router.push(`/${kind}/${v}?chain=${chain}`);
  };

  const setChain = (c: string) => {
    const p = new URLSearchParams(params);
    p.set("chain", c);
    router.push(`${pathname}?${p}`);
  };

  const active = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/token") : pathname.startsWith(href));

  const searchForm = (
    <form
      className="flex min-w-0 flex-1 items-center gap-1 rounded-xl border border-border bg-panel px-2 py-1"
      onSubmit={(e) => {
        e.preventDefault();
        go("token");
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Paste a token or wallet address…"
        className="min-w-0 flex-1 bg-transparent px-1 py-1.5 text-base outline-none placeholder:text-muted md:py-1 md:text-sm"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button type="button" onClick={() => go("wallet")} className="rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-panel-2 hover:text-fg">
        Wallet
      </button>
      <button type="submit" className="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-white hover:bg-accent-2">
        Token
      </button>
    </form>
  );

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 md:py-3">
          <Link href={`/?chain=${chain}`} className="flex shrink-0 items-center gap-2 font-semibold">
            <Logo />
            <span className="text-[15px] sm:text-base">
              Monad <span className="text-accent-2">Radar</span>
            </span>
          </Link>

          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={`${n.href}?chain=${chain}`}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${active(n.href) ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden max-w-md flex-1 md:flex">{searchForm}</div>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <button
              onClick={() => setSearchOpen((o) => !o)}
              className={`grid h-9 w-9 place-items-center rounded-xl border border-border md:hidden ${searchOpen ? "bg-accent text-white" : "bg-panel text-muted"}`}
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]">
                {Icon.search}
              </svg>
            </button>
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="h-9 rounded-xl border border-border bg-panel px-2 text-sm capitalize outline-none"
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
        {searchOpen ? <div className="px-4 pb-3 md:hidden">{searchForm}</div> : null}
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={`${n.href}?chain=${chain}`}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active(n.href) ? "text-accent-2" : "text-muted"}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5">
                {n.icon}
              </svg>
              {n.short}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

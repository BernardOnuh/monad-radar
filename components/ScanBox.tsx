"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ScanBox() {
  const router = useRouter();
  const chain = useSearchParams().get("chain") ?? "monad";
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) router.push(`/token/${v.trim()}?chain=${chain}`);
      }}
      className="flex flex-col gap-2 rounded-2xl border border-accent/40 bg-panel p-2 shadow-[0_0_60px_-15px_rgba(131,110,249,0.6)] sm:flex-row"
    >
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Paste a token contract address (0x…)"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-base outline-none placeholder:font-sans placeholder:text-muted sm:py-0 sm:text-sm"
      />
      <button className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-2 sm:py-2.5">X-ray</button>
    </form>
  );
}

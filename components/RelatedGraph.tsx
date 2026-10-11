import Link from "next/link";
import { short } from "@/lib/format";
import type { RelatedWallet } from "@/lib/nansen";

const COLORS: Record<string, string> = {
  "First Funder": "#3ddc97",
  "Funded": "#a594ff",
  "Deployed via": "#ffc857",
  "Multisig Signer": "#ff9f5c",
  "Signer": "#ff9f5c",
};

export default function RelatedGraph({ center, related, chain }: { center: string; related: RelatedWallet[]; chain: string }) {
  const nodes = related.slice(0, 12);
  const W = 420;
  const H = 300;
  const cx = W / 2;
  const cy = H / 2;
  const R = 115;

  return (
    <section className="card p-5">
      <h2 className="font-semibold">Wallet network</h2>
      <p className="mb-2 text-xs text-muted">Nansen Profiler › Related Wallets · click a node to X-ray it</p>
      {nodes.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No related wallets found.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
          {nodes.map((n, i) => {
            const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(a) * R * 1.35;
            const y = cy + Math.sin(a) * R * 0.95;
            const color = COLORS[n.relation] ?? "#9690b0";
            return (
              <g key={n.address + i}>
                <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeOpacity={0.45} strokeWidth={1.5} />
                <Link href={`/wallet/${n.address}?chain=${chain}`}>
                  <circle cx={x} cy={y} r={7} fill={color} />
                  <text x={x} y={y - 12} textAnchor="middle" fontSize={10} fill="#ece9f7">
                    {(n.address_label || short(n.address)).slice(0, 22)}
                  </text>
                  <text x={x} y={y + 19} textAnchor="middle" fontSize={9} fill={color}>
                    {n.relation}
                  </text>
                </Link>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={16} fill="#836ef9" />
          <circle cx={cx} cy={cy} r={24} fill="none" stroke="#836ef9" strokeOpacity={0.35} />
          <text x={cx} y={cy + 40} textAnchor="middle" fontSize={10} fill="#ece9f7">
            {short(center)}
          </text>
        </svg>
      )}
    </section>
  );
}

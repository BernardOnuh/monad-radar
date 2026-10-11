type Factor = { id: string; title: string; points: number; max: number; detail: string };

const LEVEL_COLOR: Record<string, string> = { Low: "#3ddc97", Moderate: "#ffc857", High: "#ff8a5c", Severe: "#ff5c7a" };

export default function RiskGauge({ score, level, factors }: { score: number; level: string; factors: Factor[] }) {
  const c = LEVEL_COLOR[level] ?? "#9690b0";
  const R = 64;
  const len = Math.PI * R;
  return (
    <section className="card p-5">
      <h2 className="font-semibold">Risk score</h2>
      <p className="mb-2 text-xs text-muted">Computed from Nansen holders, wallet links, cohort flows, PnL and liquidity</p>
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 160 92" className="w-56">
          <path d={`M16 84 A${R} ${R} 0 0 1 144 84`} fill="none" stroke="#2a2540" strokeWidth={14} strokeLinecap="round" />
          <path
            d={`M16 84 A${R} ${R} 0 0 1 144 84`}
            fill="none"
            stroke={c}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * len} ${len}`}
          />
          <text x={80} y={72} textAnchor="middle" fontSize={30} fontWeight={700} fill="#ece9f7">
            {score}
          </text>
          <text x={80} y={88} textAnchor="middle" fontSize={10} fill={c}>
            {level.toUpperCase()} RISK
          </text>
        </svg>
      </div>
      <div className="mt-3 space-y-2.5">
        {factors.map((f) => (
          <div key={f.id}>
            <div className="flex items-center text-sm">
              <span>{f.title}</span>
              <span className="num ml-auto text-xs text-muted">
                {f.points}/{f.max}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded bg-panel-2">
              <div
                className="h-1.5 rounded"
                style={{ width: `${(f.points / f.max) * 100}%`, background: f.points / f.max > 0.6 ? "#ff5c7a" : f.points ? "#ffc857" : "#3ddc97" }}
              />
            </div>
            <p className="mt-0.5 text-xs text-muted">{f.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import type { ReactNode } from "react";

export function Stat({ label, value, sub, className = "" }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={`num mt-1 text-xl font-semibold ${className}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function Panel({ title, source, children, right }: { title: string; source: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-start gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted">{source}</p>
        </div>
        {right ? <div className="ml-auto">{right}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children, error }: { children: ReactNode; error?: string }) {
  return (
    <div className="py-6 text-center text-sm text-muted">
      {children}
      {error ? <div className="mt-1 text-xs text-down/80">{error}</div> : null}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-40 w-full" />
      ))}
    </div>
  );
}

export function LabelChip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs text-accent-2">{children}</span>;
}

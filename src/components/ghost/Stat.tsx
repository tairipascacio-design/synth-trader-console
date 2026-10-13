import type { ReactNode } from "react";

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode | undefined; tone?: "pos" | "neg" | "warn" | "accent" | undefined }) {
  const c =
    tone === "pos" ? "text-success" : tone === "neg" ? "text-destructive" : tone === "warn" ? "text-warning" : tone === "accent" ? "text-accent" : "text-foreground";
  return (
    <div className="panel p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${c}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-primary">{title}</h2>
        {right}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function SimTag({ simulated }: { simulated: boolean }) {
  return simulated ? (
    <span className="rounded border border-gold/50 px-1 font-mono text-[10px] text-gold">SIM</span>
  ) : (
    <span className="rounded border border-destructive/60 px-1 font-mono text-[10px] text-destructive">REAL</span>
  );
}

export const th = "px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap";
export const td = "px-3 py-1.5 font-mono text-xs whitespace-nowrap";

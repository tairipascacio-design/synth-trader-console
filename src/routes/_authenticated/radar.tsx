import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { Section, SimTag, td, th } from "@/components/ghost/Stat";
import { fmt, fmtPx, tableQuery } from "@/lib/ghost";

export const Route = createFileRoute("/_authenticated/radar")({
  head: () => ({
    meta: [
      { title: "Radar — GHOST//SWEEP" },
      { name: "description", content: "Oportunidades detectadas, puntuación 0-100 y motivos de aceptación o rechazo." },
      { property: "og:title", content: "Radar — GHOST//SWEEP" },
      { property: "og:description", content: "Oportunidades detectadas, puntuación 0-100 y motivos de aceptación o rechazo." },
    ],
  }),
  component: Radar,
});

const STRAT: Record<string, string> = { A: "Barrida mínimos", B: "Barrida máximos", C: "Falsa ruptura", D: "Ruptura + continuación" };
type Factor = { name: string; points: number; note?: string };

function Radar() {
  const { data } = useQuery(tableQuery("signals", "created_at", 200));
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Section title={`Radar · ${data?.length ?? 0} señales recientes`} right={<span className="text-xs text-muted-foreground">La puntuación es una evaluación del modelo, no una probabilidad de éxito.</span>}>
      <table className="w-full">
        <thead>
          <tr>
            {["Hora", "Token", "Mercado", "Precio", "Vol 24h", "Δ%", "Señal", "Dir.", "Score", "Entrada", "Stop", "Objetivos", "B/R", "Decisión", ""].map((h) => (
              <th key={h} className={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data?.map((s) => {
            const factors = (s.factors as Factor[]) ?? [];
            const reasons = (s.reasons as string[]) ?? [];
            return (
              <Fragment key={s.id}>
                <tr className="cursor-pointer border-t border-border/50 hover:bg-secondary/40" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <td className={`${td} text-muted-foreground`}>{new Date(s.created_at).toLocaleTimeString("es-ES")}</td>
                  <td className={`${td} font-semibold`}>{s.symbol}</td>
                  <td className={td}>{s.market}</td>
                  <td className={td}>{fmtPx(s.price)}</td>
                  <td className={td}>{s.volume_24h ? `${fmt(Number(s.volume_24h) / 1e6, 1)}M` : "—"}</td>
                  <td className={`${td} ${Number(s.change_pct) >= 0 ? "text-success" : "text-destructive"}`}>{fmt(s.change_pct)}</td>
                  <td className={td}>{STRAT[s.strategy] ?? s.strategy}</td>
                  <td className={`${td} ${s.side === "LONG" ? "text-success" : "text-destructive"}`}>{s.side}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded bg-muted">
                        <div className={`h-full ${s.accepted ? "bg-primary" : "bg-accent"}`} style={{ width: `${Math.min(100, Number(s.score))}%` }} />
                      </div>
                      {fmt(s.score, 0)}
                    </div>
                  </td>
                  <td className={td}>{fmtPx(s.entry)}</td>
                  <td className={td}>{fmtPx(s.stop)}</td>
                  <td className={td}>{((s.targets as number[]) ?? []).map((t) => fmtPx(t)).join(" / ")}</td>
                  <td className={td}>{fmt(s.rr)}</td>
                  <td className={`${td} ${s.accepted ? "text-success" : "text-muted-foreground"}`}>{s.accepted ? "ACEPTADA" : "RECHAZADA"}</td>
                  <td className={td}><SimTag simulated={s.simulated} /></td>
                </tr>
                {open === s.id && (
                  <tr className="bg-secondary/30">
                    <td colSpan={15} className="px-4 py-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Factores</p>
                          <ul className="mt-1 space-y-0.5 font-mono text-xs">
                            {factors.map((f) => (
                              <li key={f.name}>
                                <span className={f.points >= 0 ? "text-success" : "text-destructive"}>{f.points >= 0 ? "+" : ""}{fmt(f.points, 1)}</span>{" "}
                                {f.name} {f.note && <span className="text-muted-foreground">— {f.note}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Motivo</p>
                          <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                            {reasons.map((r) => <li key={r}>{r}</li>)}
                          </ul>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {!data?.length && (
            <tr><td colSpan={15} className={`${td} py-8 text-center text-muted-foreground`}>Esperando señales del motor…</td></tr>
          )}
        </tbody>
      </table>
    </Section>
  );
}

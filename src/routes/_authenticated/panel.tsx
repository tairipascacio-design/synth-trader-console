import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Section, Stat, td, th } from "@/components/ghost/Stat";
import { fmt, statusQuery, tableQuery, type EngineStatus } from "@/lib/ghost";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel — GHOST//SWEEP" },
      { name: "description", content: "Estado del motor, Binance, WebSockets, latencia, capital y exposición." },
      { property: "og:title", content: "Panel — GHOST//SWEEP" },
      { property: "og:description", content: "Estado del motor, Binance, WebSockets, latencia, capital y exposición." },
    ],
  }),
  component: Panel,
});

function Panel() {
  const { data: st } = useQuery(statusQuery);
  const { data: events } = useQuery(tableQuery("events", "ts", 60));
  const s = (st?.status ?? {}) as EngineStatus;
  const a = s.account;
  const pnlTone = (v?: number) => (v === undefined ? undefined : v >= 0 ? "pos" : "neg");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="Binance REST" value={s.binance?.rest ?? "—"} tone={s.binance?.rest === "ok" ? "pos" : "neg"} sub={`offset ${s.binance?.timeOffsetMs ?? "—"} ms`} />
        <Stat
          label="WebSockets"
          value={s.ws ? `${s.ws.filter((w) => w.connected).length}/${s.ws.length}` : "—"}
          tone={s.ws?.every((w) => w.connected) ? "pos" : "neg"}
          sub={s.ws ? `${s.ws.reduce((x, w) => x + w.streams, 0)} streams · ${s.ws.reduce((x, w) => x + w.reconnects, 0)} reconex.` : undefined}
        />
        <Stat label="Latencia e2e p50" value={s.latency?.["e2e"] ? `${fmt(s.latency["e2e"].p50, 0)} ms` : "—"} sub={s.latency?.["e2e"] ? `p95 ${fmt(s.latency["e2e"].p95, 0)} ms` : undefined} tone="accent" />
        <Stat label="Capital (equity)" value={a ? fmt(a.equity) : "—"} sub="USDT" />
        <Stat label="Balance" value={a ? fmt(a.balance) : "—"} sub={a ? `disp. ${fmt(a.available)}` : undefined} />
        <Stat label="Margen usado" value={a ? fmt(a.marginUsed) : "—"} />
        <Stat label="Exposición" value={a ? fmt(a.exposure) : "—"} sub="nominal USDT" tone="warn" />
        <Stat label="PnL diario" value={a ? fmt(a.dailyPnl) : "—"} tone={pnlTone(a?.dailyPnl)} sub={a ? `no realizado ${fmt(a.unrealizedPnl)}` : undefined} />
      </div>

      {(s.halted || (s.entriesBlocked?.length ?? 0) > 0) && (
        <div className="panel border-destructive/60 p-4 text-sm">
          <p className="font-mono text-xs uppercase tracking-widest text-destructive">Entradas bloqueadas</p>
          <ul className="mt-2 list-inside list-disc text-muted-foreground">
            {s.halted && <li>Parada de emergencia activa {s.haltReason ? `— ${s.haltReason}` : ""}</li>}
            {s.entriesBlocked?.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Verificaciones previas (Binance)">
          <table className="w-full">
            <tbody>
              {Object.entries(s.binance?.checks ?? {}).map(([k, v]) => (
                <tr key={k} className="border-t border-border/50">
                  <td className={td}>{k}</td>
                  <td className={`${td} text-right ${v ? "text-success" : "text-destructive"}`}>{v ? "OK" : "FALLO"}</td>
                </tr>
              ))}
              {!s.binance?.checks && (
                <tr><td className={`${td} text-muted-foreground`}>Sin datos del motor</td></tr>
              )}
            </tbody>
          </table>
        </Section>
        <Section title="Latencia por etapa (ms)">
          <table className="w-full">
            <thead><tr><th className={th}>Etapa</th><th className={th}>último</th><th className={th}>p50</th><th className={th}>p95</th></tr></thead>
            <tbody>
              {Object.entries(s.latency ?? {}).map(([k, v]) => (
                <tr key={k} className="border-t border-border/50">
                  <td className={td}>{k}</td><td className={td}>{fmt(v.last, 1)}</td><td className={td}>{fmt(v.p50, 1)}</td><td className={td}>{fmt(v.p95, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
        <Section title="Motor">
          <table className="w-full">
            <tbody>
              {[
                ["Modo", s.mode ?? "—"],
                ["Versión", s.version ?? "—"],
                ["Inicio", s.startedAt ? new Date(s.startedAt).toLocaleString("es-ES") : "—"],
                ["Activos analizados", s.symbols ?? "—"],
                ["IP de salida", s.binance?.ip ?? "—"],
                ["Spot", s.binance?.spot ?? "—"],
                ["Futures", s.binance?.futures ?? "—"],
              ].map(([k, v]) => (
                <tr key={String(k)} className="border-t border-border/50"><td className={td}>{k}</td><td className={`${td} text-right`}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <Section title="Registro de eventos">
        <table className="w-full">
          <tbody>
            {events?.map((e) => (
              <tr key={e.id} className="border-t border-border/50">
                <td className={`${td} text-muted-foreground`}>{new Date(e.ts).toLocaleTimeString("es-ES")}</td>
                <td className={`${td} ${e.level === "error" ? "text-destructive" : e.level === "warn" ? "text-warning" : "text-primary"}`}>{e.level}</td>
                <td className={`${td} text-accent`}>{e.component}</td>
                <td className={`${td} whitespace-normal`}>{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Section, SimTag, Stat, td, th } from "@/components/ghost/Stat";
import { fmt, fmtPx, sendCommand, tableQuery } from "@/lib/ghost";

export const Route = createFileRoute("/_authenticated/operaciones")({
  head: () => ({
    meta: [
      { title: "Operaciones — GHOST//SWEEP" },
      { name: "description", content: "Órdenes, posiciones, ejecuciones, stops e historial con resultado neto." },
      { property: "og:title", content: "Operaciones — GHOST//SWEEP" },
      { property: "og:description", content: "Órdenes, posiciones, ejecuciones, stops e historial con resultado neto." },
    ],
  }),
  component: Ops,
});

const OPEN_ORDER = ["NEW", "PARTIALLY_FILLED", "PENDING", "UNKNOWN"];

function Ops() {
  const { data: orders } = useQuery(tableQuery("orders", "created_at", 300));
  const { data: positions } = useQuery(tableQuery("positions", "opened_at", 300));
  const { data: fills } = useQuery(tableQuery("fills", "ts", 300));

  const openOrders = orders?.filter((o) => OPEN_ORDER.includes(o.status)) ?? [];
  const stops = openOrders.filter((o) => o.purpose === "stop" || o.purpose === "tp");
  const openPos = positions?.filter((p) => p.status === "open" || p.status === "opening" || p.status === "closing") ?? [];
  const closed = positions?.filter((p) => p.status === "closed") ?? [];
  const net = closed.reduce((s, p) => s + Number(p.realized_pnl) - Number(p.fees), 0);
  const wins = closed.filter((p) => Number(p.realized_pnl) - Number(p.fees) > 0).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Posiciones abiertas" value={openPos.length} />
        <Stat label="Órdenes abiertas" value={openOrders.length} />
        <Stat label="Operaciones cerradas" value={closed.length} />
        <Stat label="Acierto" value={closed.length ? `${fmt((wins / closed.length) * 100, 0)}%` : "—"} />
        <Stat label="Resultado neto" value={fmt(net)} tone={net >= 0 ? "pos" : "neg"} sub="USDT tras comisiones" />
      </div>

      <Section title="Posiciones abiertas">
        <table className="w-full">
          <thead><tr>{["Token", "Mercado", "Dir.", "Estrategia", "Cantidad", "Entrada", "Mark", "Stop", "Stop inicial", "Objetivos", "PnL no real.", "", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {openPos.map((p) => (
              <tr key={p.id} className="border-t border-border/50">
                <td className={`${td} font-semibold`}>{p.symbol}</td><td className={td}>{p.market}</td>
                <td className={`${td} ${p.side === "LONG" ? "text-success" : "text-destructive"}`}>{p.side}</td>
                <td className={td}>{p.strategy}</td><td className={td}>{fmt(p.qty, 4)}</td>
                <td className={td}>{fmtPx(p.entry)}</td><td className={td}>{fmtPx(p.mark)}</td>
                <td className={`${td} text-destructive`}>{fmtPx(p.stop)}</td><td className={`${td} text-muted-foreground`}>{fmtPx(p.initial_stop)}</td>
                <td className={td}>{((p.targets as number[]) ?? []).map(fmtPx).join(" / ")}</td>
                <td className={`${td} ${Number(p.unrealized_pnl) >= 0 ? "text-success" : "text-destructive"}`}>{fmt(p.unrealized_pnl)}</td>
                <td className={td}><SimTag simulated={p.simulated} /></td>
                <td className={td}><Button size="sm" variant="outline" onClick={() => sendCommand("close_position", { positionId: p.id })}>Cerrar</Button></td>
              </tr>
            ))}
            {!openPos.length && <tr><td className={`${td} text-muted-foreground`} colSpan={13}>Sin posiciones abiertas</td></tr>}
          </tbody>
        </table>
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Órdenes abiertas">
          <OrdersTable rows={openOrders} />
        </Section>
        <Section title="Stops y objetivos activos">
          <OrdersTable rows={stops} />
        </Section>
      </div>

      <Section title="Ejecuciones">
        <table className="w-full">
          <thead><tr>{["Hora", "Token", "Lado", "Cantidad", "Precio", "Comisión", "PnL real.", "Client ID", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {fills?.slice(0, 100).map((f) => (
              <tr key={f.id} className="border-t border-border/50">
                <td className={`${td} text-muted-foreground`}>{new Date(f.ts).toLocaleString("es-ES")}</td>
                <td className={td}>{f.symbol}</td><td className={td}>{f.side}</td><td className={td}>{fmt(f.qty, 4)}</td>
                <td className={td}>{fmtPx(f.price)}</td><td className={td}>{fmt(f.fee, 4)}</td>
                <td className={`${td} ${Number(f.realized_pnl) >= 0 ? "text-success" : "text-destructive"}`}>{fmt(f.realized_pnl)}</td>
                <td className={`${td} text-muted-foreground`}>{f.client_order_id}</td><td className={td}><SimTag simulated={f.simulated} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="Historial">
        <table className="w-full">
          <thead><tr>{["Apertura", "Cierre", "Token", "Dir.", "Estrategia", "Score", "Entrada", "Stop inicial", "Resultado neto", "Motivo salida", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {closed.map((p) => {
              const n = Number(p.realized_pnl) - Number(p.fees);
              return (
                <tr key={p.id} className="border-t border-border/50">
                  <td className={`${td} text-muted-foreground`}>{new Date(p.opened_at).toLocaleString("es-ES")}</td>
                  <td className={`${td} text-muted-foreground`}>{p.closed_at ? new Date(p.closed_at).toLocaleString("es-ES") : "—"}</td>
                  <td className={td}>{p.symbol}</td><td className={td}>{p.side}</td><td className={td}>{p.strategy}</td><td className={td}>{fmt(p.score, 0)}</td>
                  <td className={td}>{fmtPx(p.entry)}</td><td className={td}>{fmtPx(p.initial_stop)}</td>
                  <td className={`${td} ${n >= 0 ? "text-success" : "text-destructive"}`}>{fmt(n)}</td>
                  <td className={td}>{p.exit_reason}</td><td className={td}><SimTag simulated={p.simulated} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

type OrderRow = { client_order_id: string; symbol: string; side: string; type: string; purpose: string; status: string; qty: number; price: number | null; stop_price: number | null; filled_qty: number; simulated: boolean };
function OrdersTable({ rows }: { rows: OrderRow[] }) {
  return (
    <table className="w-full">
      <thead><tr>{["Token", "Lado", "Tipo", "Uso", "Estado", "Cant.", "Ejec.", "Precio", "Stop", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((o) => (
          <tr key={o.client_order_id} className="border-t border-border/50">
            <td className={td}>{o.symbol}</td><td className={td}>{o.side}</td><td className={td}>{o.type}</td><td className={td}>{o.purpose}</td>
            <td className={`${td} ${o.status === "UNKNOWN" ? "text-warning" : ""}`}>{o.status}</td>
            <td className={td}>{fmt(o.qty, 4)}</td><td className={td}>{fmt(o.filled_qty, 4)}</td>
            <td className={td}>{fmtPx(o.price)}</td><td className={td}>{fmtPx(o.stop_price)}</td><td className={td}><SimTag simulated={o.simulated} /></td>
          </tr>
        ))}
        {!rows.length && <tr><td className={`${td} text-muted-foreground`} colSpan={10}>Ninguna</td></tr>}
      </tbody>
    </table>
  );
}

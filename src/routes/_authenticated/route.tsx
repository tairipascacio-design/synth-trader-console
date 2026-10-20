import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { currentOperator, signOut } from "@/lib/droplet";
import { Button } from "@/components/ui/button";
import { ago, sendCommand, statusQuery, useRealtimeInvalidate, type EngineStatus } from "@/lib/ghost";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await currentOperator();
    if (!user) throw redirect({ to: "/" });
    return { user };
  },
  component: Shell,
});

const NAV = [
  { to: "/panel", label: "Panel" },
  { to: "/radar", label: "Radar" },
  { to: "/operaciones", label: "Operaciones" },
  { to: "/configuracion", label: "Configuración" },
  { to: "/droplet", label: "Droplet" },
] as const;



function Shell() {
  const nav = useNavigate();
  useRealtimeInvalidate();
  const role = useQuery({
    queryKey: ["my_role"],
    queryFn: async () => {
      return (await currentOperator())?.role === 'admin';
    },
  });
  const { data: st } = useQuery(statusQuery);
  const s = (st?.status ?? {}) as EngineStatus;
  const fresh = st?.heartbeat_at && Date.now() - new Date(st.heartbeat_at).getTime() < 30000;
  const online = !!(s.online && fresh);

  if (role.data === false) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="panel max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-destructive">Acceso denegado</h1>
          <p className="mt-2 text-sm text-muted-foreground">Esta cuenta no tiene rol de operador.</p>
          <Button className="mt-4" variant="outline" onClick={() => signOut().then(() => nav({ to: "/" }))}>
            Salir
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-4 py-3">
          <span className="text-xl font-bold tracking-tight text-primary">
            GHOST<span className="text-accent">//</span>SWEEP
          </span>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-secondary text-primary" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 font-mono text-xs">
            <span className={`h-2 w-2 rounded-full ${online ? "bg-success glow-primary" : "bg-destructive"}`} />
            <span className={online ? "text-success" : "text-destructive"}>
              MOTOR {online ? "ONLINE" : "OFFLINE"}
            </span>
            <span className="text-muted-foreground">{ago(st?.heartbeat_at)}</span>
            <span
              className="rounded border border-destructive px-2 py-0.5 text-destructive"
            >
              {s.mode === 'live' ? 'BINANCE · LECTURA REAL' : s.mode === 'testnet' ? 'BINANCE · TESTNET' : 'DROPLET · SIN VERIFICAR'}
            </span>
            {s.halted ? (
              <Button size="sm" variant="outline" onClick={() => sendCommand("resume")}>
                Reanudar
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="glow-accent font-bold tracking-widest">
                    PARADA DE EMERGENCIA
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Activar parada de emergencia?</AlertDialogTitle>
                    <AlertDialogDescription>
                      El motor bloqueará nuevas entradas, cancelará órdenes de entrada pendientes y, si eliges cerrar,
                      cerrará todas las posiciones a mercado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => sendCommand("halt", { closeAll: false })}>Solo bloquear</AlertDialogAction>
                    <AlertDialogAction onClick={() => sendCommand("halt", { closeAll: true })}>Bloquear y cerrar todo</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="ghost" size="sm" onClick={() => signOut().then(() => nav({ to: "/" }))}>
              salir
            </Button>
          </div>
        </div>
      </header>
      {!online && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
          El motor del Droplet no está enviando datos. Los valores mostrados son los últimos recibidos.
        </div>
      )}
      <main className="mx-auto max-w-[1600px] p-4">
        <Outlet />
      </main>
    </div>
  );
}

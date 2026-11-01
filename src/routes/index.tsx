import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { currentConsoleUser } from "@/lib/console-auth";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GHOST//SWEEP — Acceso operador" },
      { name: "description", content: "Consola del motor de trading de barridas de liquidez GHOST//SWEEP." },
      { property: "og:title", content: "GHOST//SWEEP — Acceso operador" },
      { property: "og:description", content: "Consola del motor de trading de barridas de liquidez GHOST//SWEEP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentConsoleUser().then((user) => {
      if (user) nav({ to: "/panel" });
    });
  }, [nav]);

  const submit = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: { prompt: 'select_account' },
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      if (await currentConsoleUser()) await nav({ to: '/panel' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de acceso");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="panel glow-primary w-full max-w-sm p-8">
        <p className="font-mono text-xs tracking-[0.3em] text-accent">SISTEMA AUTÓNOMO</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-primary">GHOST//SWEEP</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Acceso del operador con Google.
        </p>
        <div className="mt-6">
          <Button type="button" onClick={submit} disabled={busy} className="w-full font-semibold">
            {busy ? 'Conectando…' : 'Continuar con Google'}
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-3 text-center text-xs text-primary">
          <Link to="/droplet">Instalación del Droplet · Termux y SSH</Link>
        </div>
      </div>
    </main>
  );
}

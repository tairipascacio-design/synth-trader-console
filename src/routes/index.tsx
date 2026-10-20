import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { currentOperator, dropletRequest } from "@/lib/droplet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GHOST//SWEEP — Acceso operador" },
      { name: "description", content: "Consola del motor de trading de barridas de liquidez GHOST//SWEEP." },
      { property: "og:title", content: "GHOST//SWEEP — Acceso operador" },
      { property: "og:description", content: "Consola del motor de trading de barridas de liquidez GHOST//SWEEP." },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentOperator().then((user) => {
      if (user) nav({ to: "/panel" });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await dropletRequest('login', { email, password });
      nav({ to: '/panel' });
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
          Acceso del operador al servidor del Droplet.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input type="email" required aria-label="Correo del operador" placeholder="correo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" required aria-label="Contraseña" minLength={8} placeholder="contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" disabled={busy} className="w-full font-semibold tracking-widest">
            ENTRAR
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-3 text-center text-xs text-primary">
          <Link to="/droplet">Instalación del Droplet · Termux y SSH</Link>
          <Link to="/reset-password">Cambiar contraseña del Droplet</Link>
        </div>
      </div>
    </main>
  );
}

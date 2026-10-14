import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: "/panel" });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/panel" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Revisa tu correo para confirmar la cuenta.");
        setMode("in");
      }
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
          Acceso restringido al operador. La primera cuenta registrada obtiene el rol de administrador.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input type="email" required placeholder="correo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" required minLength={8} placeholder="contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" disabled={busy} className="w-full font-semibold tracking-widest">
            {mode === "in" ? "ENTRAR" : "CREAR CUENTA"}
          </Button>
        </form>
        <button
          className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-primary"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "¿Sin cuenta? Registrarse" : "Ya tengo cuenta"}
        </button>
        <button
          className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-primary"
          onClick={async () => {
            if (!email) { toast.error("Escribe tu correo arriba primero."); return; }
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) toast.error(error.message);
            else toast.success("Te enviamos un enlace para crear una contraseña nueva.");
          }}
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
    </main>
  );
}

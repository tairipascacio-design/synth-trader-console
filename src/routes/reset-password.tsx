import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { dropletRequest } from "@/lib/droplet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "GHOST//SWEEP — Nueva contraseña" },
      { name: "description", content: "Crea una nueva contraseña para la consola GHOST//SWEEP." },
      { property: "og:title", content: "GHOST//SWEEP — Nueva contraseña" },
      { property: "og:description", content: "Crea una nueva contraseña para la consola GHOST//SWEEP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [oldPassword, setOldPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await dropletRequest('password', { oldPassword, password: pw });
      toast.success('Contraseña actualizada en el Droplet.');
      nav({ to: '/panel' });
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo cambiar'); }
    finally { setBusy(false); }
  };
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="panel glow-primary w-full max-w-sm space-y-3 p-8">
        <h1 className="text-2xl font-bold text-primary">Nueva contraseña</h1>
        <Input type="password" required aria-label="Contraseña actual" placeholder="contraseña actual" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        <Input type="password" required minLength={8} placeholder="nueva contraseña (mín. 8)" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button type="submit" disabled={busy} className="w-full tracking-widest">GUARDAR</Button>
      </form>
    </main>
  );
}

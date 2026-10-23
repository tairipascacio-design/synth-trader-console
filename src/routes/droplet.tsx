import { createFileRoute, Link } from "@tanstack/react-router";
import { DEPLOYMENT_STEPS } from "@/lib/deployment-steps";

export const Route = createFileRoute("/droplet")({
  head: () => ({
    meta: [
      { title: "GHOST//SWEEP — Instalación del Droplet" },
      { name: "description", content: "Comandos en orden para instalar GHOST//SWEEP en tu Droplet desde Termux." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "GHOST//SWEEP — Instalación del Droplet" },
      { property: "og:description", content: "Comandos en orden para instalar GHOST//SWEEP en tu Droplet desde Termux." },
    ],
  }),
  component: DropletPage,
});


function DropletPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <Link to="/" className="text-xs text-primary">← Volver</Link>
      <h1 className="text-3xl font-bold text-primary">Instalación del Droplet</h1>
      <p className="text-sm text-muted-foreground">Copia cada comando en orden. Etapa de solo lectura: todavía no compra ni vende.</p>
      {DEPLOYMENT_STEPS.map((s) => (
        <section key={s.title} className="panel space-y-2 p-4">
          <h2 className="font-semibold text-foreground">{s.title}</h2>
          {s.cmds.map((c) => (
            <pre key={c} className="overflow-x-auto rounded bg-secondary p-2 font-mono text-xs text-foreground">{c}</pre>
          ))}
          {s.note && <p className="text-xs text-accent">{s.note}</p>}
        </section>
      ))}
    </main>
  );
}

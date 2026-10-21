import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/droplet")({
  head: () => ({
    meta: [
      { title: "GHOST//SWEEP — Instalación del Droplet" },
      { name: "description", content: "Comandos en orden para instalar GHOST//SWEEP en tu Droplet desde Termux." },
      { property: "og:title", content: "GHOST//SWEEP — Instalación del Droplet" },
      { property: "og:description", content: "Comandos en orden para instalar GHOST//SWEEP en tu Droplet desde Termux." },
    ],
  }),
  component: DropletPage,
});

const STEPS: { title: string; note?: string; cmds: string[] }[] = [
  { title: "1. En Termux: entrar al Droplet", cmds: ["pkg update -y && pkg install -y openssh", "ssh root@TU_IP_DEL_DROPLET"] },
  { title: "2. Instalar lo necesario en Ubuntu", cmds: [
    "apt update && apt upgrade -y",
    "apt install -y git nginx ufw certbot python3-certbot-nginx",
    "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
    "apt install -y nodejs",
    "npm install -g pm2",
  ] },
  { title: "3. Firewall", cmds: ["ufw allow OpenSSH", "ufw allow 'Nginx Full'", "ufw --force enable"] },
  { title: "4. Descargar el proyecto desde GitHub", cmds: ["git clone https://github.com/TU_USUARIO/TU_REPO.git /opt/ghost-sweep", "cd /opt/ghost-sweep"] },
  { title: "5. Compilar la consola e instalar el motor", cmds: [
    "npm install", "npm run build:droplet", "cd engine", "npm install", "npm test",
    "cp .env.example .env", "chmod 600 .env", "nano .env",
  ], note: "En nano: si NO tienes dominio, cambia COOKIE_SECURE=1 por COOKIE_SECURE=0. Guarda con Ctrl+O, Enter, Ctrl+X." },
  { title: "6. Crear tu usuario de acceso (pide la contraseña)", cmds: ["npm run operator -- tu@correo.com", "cd /opt/ghost-sweep"] },
  { title: "7. Arrancar con PM2 e inicio automático", cmds: [
    "mkdir -p /var/log/ghost", "pm2 start deploy/ecosystem.config.cjs", "pm2 save", "pm2 startup systemd -u root --hp /root",
    "pm2 install pm2-logrotate", "pm2 set pm2-logrotate:max_size 10M", "pm2 set pm2-logrotate:retain 14",
  ] },
  { title: "8. Nginx", cmds: [
    "sed -i 's/TU_DOMINIO/tu.dominio.com/' deploy/nginx-ghost.conf",
    "cp deploy/nginx-ghost.conf /etc/nginx/sites-available/ghost",
    "ln -sf /etc/nginx/sites-available/ghost /etc/nginx/sites-enabled/ghost",
    "rm -f /etc/nginx/sites-enabled/default", "nginx -t", "systemctl reload nginx",
  ], note: "Sin dominio usa _ en lugar de tu.dominio.com y salta el paso 9." },
  { title: "9. HTTPS (solo con dominio)", cmds: ["certbot --nginx -d tu.dominio.com"] },
  { title: "10. Comprobar", cmds: ["pm2 status", "curl -s http://127.0.0.1:8787/api/ghost/health"], note: "Después abre https://tu.dominio.com (o http://TU_IP) y entra con tu correo." },
  { title: "Actualizar desde GitHub", cmds: ["bash /opt/ghost-sweep/deploy/update.sh"] },
  { title: "Ver registros y recuperar", cmds: ["pm2 logs ghost-api --lines 100", "pm2 logs ghost-console --lines 100", "pm2 restart all"] },
];

function DropletPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <Link to="/" className="text-xs text-primary">← Volver</Link>
      <h1 className="text-3xl font-bold text-primary">Instalación del Droplet</h1>
      <p className="text-sm text-muted-foreground">Copia cada comando en orden. Etapa de solo lectura: todavía no compra ni vende.</p>
      {STEPS.map((s) => (
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

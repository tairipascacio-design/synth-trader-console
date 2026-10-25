export const DEPLOYMENT_STEPS: { title: string; cmds: string[]; note?: string }[] = [
  {
    "title": "1. En Termux: entrar al Droplet",
    "cmds": [
      "pkg update -y && pkg install -y openssh",
      "ssh root@167.99.38.30"
    ],
    "note": "La contraseña o llave SSH es la del Droplet. No es la contraseña del bot."
  },
  {
    "title": "2. En Ubuntu: instalar dependencias",
    "cmds": [
      "apt update",
      "apt install -y ca-certificates curl git nginx ufw",
      "curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource-setup.sh",
      "bash /tmp/nodesource-setup.sh",
      "apt install -y nodejs",
      "npm install -g pm2"
    ],
    "note": "Estos comandos son para Ubuntu y acceso root. Si tu servidor usa otra distribución, detente."
  },
  {
    "title": "3. Permitir SSH y web",
    "cmds": [
      "ufw allow OpenSSH",
      "ufw allow 'Nginx Full'",
      "ufw --force enable"
    ],
    "note": "No se abren los puertos internos 3000 ni 8787."
  },
  {
    "title": "4. Descargar el proyecto",
    "cmds": [
      "git clone https://github.com/tairipascacio-design/synth-trader-console.git /opt/ghost-sweep",
      "cd /opt/ghost-sweep"
    ],
    "note": "Si el repositorio es privado, GitHub pide tu usuario y un token con acceso a este repositorio, no tu contraseña de GitHub. No pegues el token en el chat ni en la dirección. Si la carpeta ya existe, no repitas git clone."
  },
  {
    "title": "5. Instalar y comprobar",
    "cmds": [
      "npm install",
      "npm run build:droplet",
      "test -f .output/server/index.mjs",
      "cd /opt/ghost-sweep/engine",
      "npm install",
      "npm test"
    ],
    "note": "Si cualquier comando falla, detente y envía el error sin secretos; no sigas al siguiente paso."
  },
  {
    "title": "6. Preparar ajustes del servidor",
    "cmds": [
      "cp -n .env.example .env",
      "chmod 600 .env",
      "sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=0/' .env"
    ],
    "note": "Sin dominio, el acceso recomendado abajo usa un túnel SSH. No pongas claves de Binance: esta etapa no las utiliza y no opera."
  },
  {
    "title": "7. Crear tu correo y contraseña",
    "cmds": [
      "read -r -p \"Correo para entrar al bot: \" OPERATOR_EMAIL",
      "npm run operator -- \"$OPERATOR_EMAIL\"",
      "unset OPERATOR_EMAIL",
      "cd /opt/ghost-sweep"
    ],
    "note": "Escribe tu correo y elige una contraseña de al menos 8 caracteres cuando se solicite. No existe contraseña predeterminada. El programa actual muestra la contraseña al escribir: hazlo en privado y no compartas capturas."
  },
  {
    "title": "8. Arrancar y conservar tras reinicio",
    "cmds": [
      "mkdir -p /var/log/ghost",
      "pm2 start deploy/ecosystem.config.cjs",
      "pm2 save",
      "pm2 startup systemd -u root --hp /root",
      "pm2 install pm2-logrotate",
      "pm2 set pm2-logrotate:max_size 10M",
      "pm2 set pm2-logrotate:retain 14"
    ],
    "note": "Si PM2 imprime otro comando de inicio automático, ejecútalo también."
  },
  {
    "title": "9. Conectar Nginx",
    "cmds": [
      "cp deploy/nginx-ghost.conf /etc/nginx/sites-available/ghost",
      "ln -sf /etc/nginx/sites-available/ghost /etc/nginx/sites-enabled/ghost",
      "rm -f /etc/nginx/sites-enabled/default",
      "nginx -t",
      "systemctl enable nginx",
      "systemctl reload nginx"
    ],
    "note": "No necesitas un dominio para esta etapa: el comando ya usa tu IP 167.99.38.30. Un dominio solo hace falta más adelante para tener HTTPS y abrir la consola desde cualquier dispositivo. La consola y el acceso se sirven desde el mismo Droplet."
  },
  {
    "title": "10. Comprobar disponibilidad y reinicio",
    "cmds": [
      "pm2 status",
      "curl -fsS http://127.0.0.1:8787/api/ghost/health",
      "curl -fsS http://127.0.0.1/api/ghost/health",
      "curl -I http://127.0.0.1/",
      "pm2 restart ghost-api ghost-console",
      "curl --retry 10 --retry-connrefused --retry-delay 2 -fsS http://127.0.0.1/api/ghost/health"
    ],
    "note": "La salud debe devolver ok:true, operatorConfigured:true y trading:false. Esto no prueba Binance ni el reinicio de Ubuntu. Falta comprobar que puedes entrar por el navegador y que los ajustes guardados sobreviven al reinicio."
  },
  {
    "title": "11. Abrir desde tu teléfono con túnel SSH",
    "cmds": [
      "ssh -N -L 8081:127.0.0.1:80 root@167.99.38.30"
    ],
    "note": "Ejecuta este comando en una segunda sesión de Termux y déjala abierta. Abre http://127.0.0.1:8081 en el navegador del mismo teléfono. Entra con el correo y contraseña del paso 7. El teléfono solo muestra la consola; el túnel transporta el acceso cifrado al Droplet. No escribas tu contraseña en http://167.99.38.30: esa dirección no tiene HTTPS."
  },
  {
    "title": "Actualizar después de cambios en GitHub",
    "cmds": [
      "bash /opt/ghost-sweep/deploy/update.sh"
    ],
    "note": "Dentro del Droplet. Espera a que los cambios aparezcan en GitHub antes de actualizar. Los datos permanecen en engine/data."
  },
  {
    "title": "Consultar registros",
    "cmds": [
      "pm2 logs ghost-api --lines 100",
      "pm2 logs ghost-console --lines 100"
    ],
    "note": "Ctrl+C sale del visor de registros. No publiques contraseñas ni claves."
  },
  {
    "title": "Recuperar acceso si olvidaste la contraseña",
    "cmds": [
      "cd /opt/ghost-sweep/engine",
      "read -r -p \"Correo del operador: \" OPERATOR_EMAIL",
      "npm run operator -- \"$OPERATOR_EMAIL\"",
      "unset OPERATOR_EMAIL",
      "pm2 restart ghost-api"
    ],
    "note": "Esto reemplaza al operador e invalida las sesiones anteriores. Elige una contraseña nueva y vuelve a entrar."
  }
];

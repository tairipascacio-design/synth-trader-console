# GHOST//SWEEP — instalación en tu Droplet

Servidor indicado: `167.99.38.30`. Repositorio indicado: https://github.com/tairipascacio-design/synth-trader-console

**Estado:** paquete de instalación, sin despliegue verificado en tu servidor. El servicio inicial ofrece acceso, configuración y almacenamiento local. No inicia el escáner de Binance, no descarga balances y no compra ni vende. Los adaptadores existentes no están conectados al arranque; no inventa datos. Las órdenes están bloqueadas hasta implementar y verificar ejecución, protecciones y conciliación.

La consola, API, sesiones y datos operativos viven en el Droplet. Nginx dirige `/api/ghost` al servicio local 8787 y la consola al servidor local 3000. No necesitas claves de Lovable Cloud ni de Binance para esta etapa. PM2 mantiene ambos procesos; no crea el motor.

Sigue los pasos de uno en uno. No ejecutes el siguiente si falla el anterior. No uses una instalación existente sin respaldar `engine/data` y revisar su configuración de Nginx.

## 1. En Termux: entrar al Droplet

```bash
pkg update -y && pkg install -y openssh
ssh root@167.99.38.30
```

La contraseña o llave SSH es la del Droplet. No es la contraseña del bot.

## 2. En Ubuntu: instalar dependencias

```bash
apt update
apt install -y ca-certificates curl git nginx ufw
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource-setup.sh
bash /tmp/nodesource-setup.sh
apt install -y nodejs
npm install -g pm2
```

Estos comandos son para Ubuntu y acceso root. Si tu servidor usa otra distribución, detente.

## 3. Permitir SSH y web

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
```

No se abren los puertos internos 3000 ni 8787.

## 4. Descargar el proyecto

```bash
git clone https://github.com/tairipascacio-design/synth-trader-console.git /opt/ghost-sweep
cd /opt/ghost-sweep
```

Si el repositorio es privado, GitHub pide tu usuario y un token con acceso a este repositorio, no tu contraseña de GitHub. No pegues el token en el chat ni en la dirección. Si la carpeta ya existe, no repitas git clone.

## 5. Instalar y comprobar

```bash
npm install
npm run build:droplet
test -f .output/server/index.mjs
cd /opt/ghost-sweep/engine
npm install
npm test
```

Si cualquier comando falla, detente y envía el error sin secretos; no sigas al siguiente paso.

## 6. Preparar ajustes del servidor

```bash
cp -n .env.example .env
chmod 600 .env
sed -i 's/^COOKIE_SECURE=.*/COOKIE_SECURE=0/' .env
```

Sin dominio, el acceso recomendado abajo usa un túnel SSH. No pongas claves de Binance: esta etapa no las utiliza y no opera.

## 7. Crear tu correo y contraseña

```bash
read -r -p "Correo para entrar al bot: " OPERATOR_EMAIL
npm run operator -- "$OPERATOR_EMAIL"
unset OPERATOR_EMAIL
cd /opt/ghost-sweep
```

Escribe tu correo y elige una contraseña de al menos 8 caracteres cuando se solicite. No existe contraseña predeterminada. El programa actual muestra la contraseña al escribir: hazlo en privado y no compartas capturas.

## 8. Arrancar y conservar tras reinicio

```bash
mkdir -p /var/log/ghost
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 14
```

Si PM2 imprime otro comando de inicio automático, ejecútalo también.

## 9. Conectar Nginx

```bash
cp deploy/nginx-ghost.conf /etc/nginx/sites-available/ghost
ln -sf /etc/nginx/sites-available/ghost /etc/nginx/sites-enabled/ghost
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx
```

No se pide dominio: Nginx acepta la IP del Droplet y el túnel SSH. Un dominio solo hace falta más adelante para tener HTTPS y abrir la consola desde cualquier dispositivo.

## 10. Comprobar disponibilidad y reinicio

```bash
pm2 status
curl -fsS http://127.0.0.1:8787/api/ghost/health
curl -fsS http://127.0.0.1/api/ghost/health
curl -I http://127.0.0.1/
pm2 restart ghost-api ghost-console
curl --retry 10 --retry-connrefused --retry-delay 2 -fsS http://127.0.0.1/api/ghost/health
```

La salud debe devolver ok:true, operatorConfigured:true y trading:false. Esto no prueba Binance ni el reinicio de Ubuntu. Falta comprobar que puedes entrar por el navegador y que los ajustes guardados sobreviven al reinicio.

## 11. Abrir desde tu teléfono con túnel SSH

```bash
ssh -N -L 8081:127.0.0.1:80 root@167.99.38.30
```

Ejecuta este comando en una segunda sesión de Termux y déjala abierta. Abre http://127.0.0.1:8081 en el navegador del mismo teléfono. Entra con el correo y contraseña del paso 7. El teléfono solo muestra la consola; el túnel transporta el acceso cifrado al Droplet. No escribas tu contraseña en http://167.99.38.30: esa dirección no tiene HTTPS.

## Actualizar después de cambios en GitHub

```bash
bash /opt/ghost-sweep/deploy/update.sh
```

Dentro del Droplet. Espera a que los cambios aparezcan en GitHub antes de actualizar. Los datos permanecen en engine/data.

## Consultar registros

```bash
pm2 logs ghost-api --lines 100
pm2 logs ghost-console --lines 100
```

Ctrl+C sale del visor de registros. No publiques contraseñas ni claves.

## Recuperar acceso si olvidaste la contraseña

```bash
cd /opt/ghost-sweep/engine
read -r -p "Correo del operador: " OPERATOR_EMAIL
npm run operator -- "$OPERATOR_EMAIL"
unset OPERATOR_EMAIL
pm2 restart ghost-api
```

Esto reemplaza al operador e invalida las sesiones anteriores. Elige una contraseña nueva y vuelve a entrar.

## HTTPS y acceso público

El acceso por IP queda sin HTTPS. Usa el túnel SSH para iniciar sesión. Para abrir desde cualquier dispositivo sin Termux, hace falta un dominio apuntando a 167.99.38.30 y configurar HTTPS; no se incluye un comando con un dominio inventado. Después de obtener el certificado hay que cambiar COOKIE_SECURE a 1 y reiniciar ghost-api.

## GitHub Actions

El flujo actual ejecuta pruebas del motor; el despliegue automático está desactivado mientras DEPLOY_ENABLED no sea true. Necesita DROPLET_HOST y DROPLET_SSH_KEY configurados en GitHub, y autorizar previamente esa llave en el servidor. No actives despliegue automático hasta probar la instalación manual. Nunca incluyas .env, engine/data ni llaves privadas en GitHub.

## Verificación pendiente

Las pruebas locales cubren salud, contraseña incorrecta, sesión persistente y rechazo de trading; no equivalen a una instalación en DigitalOcean. Comprueba acceso en navegador, guardar y recuperar configuración y reinicio de Ubuntu. No afirmes que Binance funciona basándote en el endpoint de salud: informa modo readonly y trading false deliberadamente.

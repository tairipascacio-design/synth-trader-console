#!/usr/bin/env bash
# Pulls the latest code from GitHub, tests, rebuilds and restarts. Data in engine/data is kept.
set -euo pipefail
cd /opt/ghost-sweep
git pull --ff-only
npm install
npm run build:droplet
cd engine
npm install
npm test
cd ..
pm2 reload deploy/ecosystem.config.cjs
pm2 save
sleep 3
curl -fsS http://127.0.0.1:8787/api/ghost/health
echo
echo "Actualización completa."

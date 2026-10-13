# GHOST//SWEEP roadmap
- [x] Cloud schema (config, radar, orders, positions, fills, events, engine status, commands)
- [x] Engine ingest/sync API (shared-secret HMAC) at /api/public/engine/sync
- [x] Cyberpunk dashboard: panel, radar, operaciones, configuración (+ login, emergency stop)
- [ ] Node engine in /engine — DONE: types, config, log, latency, math, journal. TODO: Binance adapter (REST/WS multiplexed, user stream), strategies A-D, decision 0-100, sizing, risk guard, executor (clientOrderId idempotency), positions, reconciliation, console sync, health/admin server, tests
- [ ] Deploy kit: PM2, Nginx, HTTPS, UFW, logrotate, .env.example, procedures
- [ ] ENGINE_TOKEN shared secret (needs user to set the same value on the Droplet)
- [ ] Final 1:1 check against the attached spec

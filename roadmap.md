# GHOST//SWEEP roadmap
- [ ] Cloud schema (config, radar, orders, positions, fills, events, engine status, commands)
- [ ] Engine ingest/sync API (shared-secret HMAC)
- [ ] Cyberpunk dashboard: panel, radar, operaciones, configuración (+ login, emergency stop)
- [ ] Node engine in /engine: Binance adapter (Spot+Futures, WS multiplexed), strategies A-D, decision 0-100, sizing, risk guard, executor (clientOrderId idempotency), positions, reconciliation, latency, persistence, tests
- [ ] Deploy kit: PM2, Nginx, HTTPS, UFW, logrotate, env docs, procedures
- [ ] Verify everything matches the attached spec 1:1

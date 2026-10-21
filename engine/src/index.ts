import { existsSync } from "node:fs";
import { AuthStore } from "./auth.js";

// Secrets live only in engine/.env on the Droplet (never in the repo).
if (existsSync(".env")) process.loadEnvFile(".env");
import { buildServer } from "./server.js";
import { Journal } from "./util/journal.js";
import { log } from "./util/log.js";

const L = log("main");
const dataDir = process.env.DATA_DIR ?? "./data";
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";

const server = buildServer({
  auth: new AuthStore(dataDir),
  journal: new Journal(dataDir),
  startedAt: new Date().toISOString(),
  version: process.env.npm_package_version ?? "1.0.0",
});
server.listen(port, host, () => L.info("api listening (read-only stage)", { host, port }));

const stop = () => { L.info("shutting down"); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

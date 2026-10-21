import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AuthStore } from "./auth.js";
import { Journal } from "./util/journal.js";
import { DEFAULT_CONFIG, mergeConfig } from "./config.js";

const TABLES = ["signals", "orders", "positions", "fills", "events"] as const;
/** Read-only stage: only these commands are accepted; anything that trades is rejected. */
const SAFE_COMMANDS = new Set(["halt", "resume"]);

export interface ServerDeps { auth: AuthStore; journal: Journal; startedAt: string; version: string }

const json = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
  res.end(JSON.stringify(body));
};

const cookie = (req: IncomingMessage, name: string) =>
  req.headers.cookie?.split(";").map((c) => c.trim().split("=")).find(([k]) => k === name)?.[1];

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 100_000) throw new Error("Cuerpo demasiado grande");
    chunks.push(c as Buffer);
  }
  if (!chunks.length) return {};
  const v = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  return v && typeof v === "object" ? v : {};
}

const ip = (req: IncomingMessage) => String(req.headers["x-real-ip"] ?? req.socket.remoteAddress ?? "?");

export function buildServer(d: ServerDeps) {
  const secure = process.env.COOKIE_SECURE !== "0";
  const setCookie = (v: string, maxAge: number) =>
    `ghost_session=${v}; Path=/api/ghost; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://local");
      const path = url.pathname.replace(/^\/api\/ghost\/?/, "");
      const method = req.method ?? "GET";

      if (path === "health") {
        return json(res, 200, { ok: true, mode: "readonly", trading: false, startedAt: d.startedAt, version: d.version, operatorConfigured: !!d.auth.operator() });
      }

      if (path === "login" && method === "POST") {
        if (d.auth.locked(ip(req))) return json(res, 429, { error: "Demasiados intentos. Espera 15 minutos." });
        if (!d.auth.operator()) return json(res, 503, { error: "Falta crear el operador en el Droplet (npm run operator)." });
        const b = await readBody(req);
        const email = String(b.email ?? ""), password = String(b.password ?? "");
        if (!d.auth.checkPassword(email, password)) { d.auth.fail(ip(req)); return json(res, 401, { error: "Correo o contraseña incorrectos." }); }
        d.auth.clearFails(ip(req));
        const token = d.auth.create(email.trim().toLowerCase());
        return json(res, 200, { ok: true }, { "Set-Cookie": setCookie(token, 12 * 3600) });
      }

      // Everything below requires a valid session.
      const token = cookie(req, "ghost_session");
      const session = d.auth.get(token);
      if (!session) return json(res, 401, { error: "Sesión no iniciada." });

      // Same-origin guard for state-changing requests.
      if (method !== "GET") {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: "Origen no permitido." });
      }

      if (path === "session") return json(res, 200, { email: session.email, role: "admin" });
      if (path === "logout" && method === "POST") {
        d.auth.destroy(token);
        return json(res, 200, { ok: true }, { "Set-Cookie": setCookie("", 0) });
      }
      if (path === "password" && method === "POST") {
        const b = await readBody(req);
        if (!d.auth.checkPassword(session.email, String(b.oldPassword ?? ""))) return json(res, 401, { error: "La contraseña actual no coincide." });
        d.auth.setOperator(session.email, String(b.password ?? ""));
        const t = d.auth.create(session.email);
        return json(res, 200, { ok: true }, { "Set-Cookie": setCookie(t, 12 * 3600) });
      }
      if (path === "status") {
        const s = d.journal.state;
        return json(res, 200, {
          heartbeat_at: new Date().toISOString(),
          status: { online: true, mode: "readonly", halted: s.halted, haltReason: s.haltReason, version: d.version, startedAt: d.startedAt,
            entriesBlocked: ["Etapa de solo lectura: el trading real está bloqueado hasta verificar protecciones y conciliación."] },
        });
      }
      if (path === "config") {
        const s = d.journal.state;
        if (method === "GET") return json(res, 200, { config: mergeConfig(DEFAULT_CONFIG, s.config ?? {}), version: s.configVersion });
        if (method === "PUT") {
          const b = await readBody(req);
          if (Number(b.version ?? -1) !== s.configVersion) return json(res, 409, { error: "La configuración cambió; recarga la página." });
          s.config = mergeConfig(DEFAULT_CONFIG, b.config);
          s.configVersion += 1;
          d.journal.save();
          return json(res, 200, { ok: true, version: s.configVersion });
        }
      }
      if (path.startsWith("tables/")) {
        const t = path.slice(7) as (typeof TABLES)[number];
        if (!TABLES.includes(t)) return json(res, 404, { error: "Tabla desconocida." });
        const s = d.journal.state;
        const rows = t === "orders" ? Object.values(s.orders) : t === "positions" ? Object.values(s.positions) : t === "fills" ? s.fills : [];
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 1000);
        return json(res, 200, rows.slice(-limit).reverse());
      }
      if (path === "commands" && method === "POST") {
        const b = await readBody(req);
        const c = String(b.command ?? "");
        if (!SAFE_COMMANDS.has(c)) return json(res, 403, { error: "Etapa de solo lectura: este comando de trading está bloqueado." });
        d.journal.state.halted = c === "halt";
        d.journal.state.haltReason = c === "halt" ? `Parada manual (${session.email})` : null;
        d.journal.save();
        return json(res, 200, { ok: true });
      }
      return json(res, 404, { error: "Ruta no encontrada." });
    } catch (e) {
      return json(res, 400, { error: e instanceof Error ? e.message : "Petición inválida" });
    }
  });
}

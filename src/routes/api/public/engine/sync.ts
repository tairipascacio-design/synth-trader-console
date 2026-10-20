import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Engine <-> console bridge. The Droplet engine signs every request with
// HMAC-SHA256(ENGINE_TOKEN, `${timestamp}.${rawBody}`). Binance keys never reach this app.

const num = z.number().finite().nullable().optional();
const Body = z.object({
  status: z.record(z.string(), z.unknown()).optional(),
  signals: z.array(z.object({
    symbol: z.string().max(40), market: z.string().max(10), strategy: z.string().max(4), side: z.string().max(5),
    score: z.number(), accepted: z.boolean(), price: num, volume_24h: num, change_pct: num,
    entry: num, stop: num, targets: z.array(z.number()).max(5), rr: num,
    factors: z.array(z.unknown()).max(40), reasons: z.array(z.string().max(300)).max(40), simulated: z.boolean(),
  })).max(200).optional(),
  orders: z.array(z.record(z.string(), z.unknown())).max(200).optional(),
  positions: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
  fills: z.array(z.record(z.string(), z.unknown())).max(200).optional(),
  events: z.array(z.object({ level: z.string().max(10), component: z.string().max(40), message: z.string().max(2000), data: z.unknown().optional() })).max(200).optional(),
  ackCommands: z.array(z.number().int()).max(100).optional(),
});

const ORDER_COLS = ["client_order_id","exchange_order_id","symbol","market","side","type","purpose","status","qty","price","stop_price","filled_qty","avg_price","reduce_only","position_id","simulated","raw","created_at","updated_at"];
const POS_COLS = ["id","symbol","market","side","strategy","score","qty","entry","stop","initial_stop","targets","trail","status","realized_pnl","fees","mark","unrealized_pnl","entry_reason","exit_reason","simulated","opened_at","closed_at"];
const FILL_COLS = ["id","client_order_id","position_id","symbol","side","qty","price","fee","realized_pnl","simulated","ts"];
const pick = (rows: Record<string, unknown>[], cols: string[]) =>
  rows.map((r) => Object.fromEntries(cols.filter((c) => c in r).map((c) => [c, r[c]])));

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const Route = createFileRoute("/api/public/engine/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Droplet-only architecture: reject the obsolete Cloud bridge before any I/O.
        return Response.json({ error: 'Cloud sync disabled; use the Droplet local API.' }, { status: 410 });
        /* Legacy bridge retained for reference, never executed.
        const secret = process.env["ENGINE_TOKEN"];
        if (!secret) return Response.json({ error: "ENGINE_TOKEN not configured" }, { status: 503 });
        const ts = request.headers.get("x-ghost-ts") ?? "";
        const sig = request.headers.get("x-ghost-signature") ?? "";
        const raw = await request.text();
        if (raw.length > 1_000_000) return Response.json({ error: "too large" }, { status: 413 });
        const t = Number(ts);
        if (!Number.isFinite(t) || Math.abs(Date.now() - t) > 30_000) return Response.json({ error: "stale timestamp" }, { status: 401 });
        if (!safeEq(sig, await hmacHex(secret, `${ts}.${raw}`))) return Response.json({ error: "bad signature" }, { status: 401 });

        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(JSON.parse(raw));
        } catch (e) {
          return Response.json({ error: "invalid body", detail: String(e).slice(0, 500) }, { status: 400 });
        }

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const errs: string[] = [];
        const chk = (r: { error: { message: string } | null }, what: string) => r.error && errs.push(`${what}: ${r.error.message}`);

        if (body.status) chk(await db.from("engine_status").upsert({ id: 1, status: body.status as never, heartbeat_at: new Date().toISOString() }), "status");
        if (body.signals?.length) chk(await db.from("signals").insert(body.signals as never), "signals");
        if (body.orders?.length) chk(await db.from("orders").upsert(pick(body.orders, ORDER_COLS) as never), "orders");
        if (body.positions?.length) chk(await db.from("positions").upsert(pick(body.positions, POS_COLS) as never), "positions");
        if (body.fills?.length) chk(await db.from("fills").upsert(pick(body.fills, FILL_COLS) as never), "fills");
        if (body.events?.length) chk(await db.from("events").insert(body.events as never), "events");
        if (body.ackCommands?.length) chk(await db.from("engine_commands").update({ acked_at: new Date().toISOString() }).in("id", body.ackCommands), "ack");

        const [cfg, cmds] = await Promise.all([
          db.from("bot_config").select("config, version").eq("id", 1).single(),
          db.from("engine_commands").select("id, command, payload, created_at").is("acked_at", null).order("id").limit(50),
        ]);
        return Response.json({ ok: errs.length === 0, errors: errs, config: cfg.data?.config, configVersion: cfg.data?.version, commands: cmds.data ?? [] });
        */
      },
    },
  },
});

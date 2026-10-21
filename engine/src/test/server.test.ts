import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { AuthStore } from "../auth.js";
import { Journal } from "../util/journal.js";
import { buildServer } from "../server.js";

process.env.COOKIE_SECURE = "0";
const dir = mkdtempSync(join(tmpdir(), "ghost-"));
let base = "";
const mk = () => buildServer({ auth: new AuthStore(dir), journal: new Journal(dir), startedAt: "x", version: "t" });
let srv = mk();

beforeAll(async () => {
  new AuthStore(dir).setOperator("op@x.com", "secreto123");
  srv = mk();
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/ghost/`;
});
afterAll(() => srv.close());

const login = (password: string) =>
  fetch(base + "login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "op@x.com", password }) });

describe("droplet api", () => {
  it("health responds without session", async () => {
    expect((await (await fetch(base + "health")).json()).ok).toBe(true);
  });
  it("rejects wrong password and private data without session", async () => {
    expect((await login("mal")).status).toBe(401);
    expect((await fetch(base + "status")).status).toBe(401);
  });
  it("session survives a restart", async () => {
    const r = await login("secreto123");
    const c = r.headers.get("set-cookie")!.split(";")[0];
    srv.close(); srv = mk();
    await new Promise<void>((ok) => srv.listen(0, "127.0.0.1", ok));
    base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/ghost/`;
    const s = await fetch(base + "session", { headers: { cookie: c } });
    expect((await s.json()).email).toBe("op@x.com");
    const cmd = await fetch(base + "commands", { method: "POST", headers: { cookie: c, "Content-Type": "application/json" }, body: JSON.stringify({ command: "open" }) });
    expect(cmd.status).toBe(403);
  });
});

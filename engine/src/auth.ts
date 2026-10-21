import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Operator { email: string; salt: string; hash: string }
interface Session { email: string; expires: number }

const SESSION_MS = 12 * 3600_000;

const writeAtomic = (file: string, data: unknown) => {
  writeFileSync(file + ".tmp", JSON.stringify(data), { mode: 0o600 });
  renameSync(file + ".tmp", file);
};

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { salt, hash: scryptSync(password, salt, 64).toString("hex") };
}

/** Operator credentials and sessions live only on the Droplet disk; sessions survive restarts. */
export class AuthStore {
  private opFile: string;
  private sesFile: string;
  sessions: Record<string, Session> = {};
  private attempts = new Map<string, { n: number; until: number }>();

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.opFile = join(dir, "operator.json");
    this.sesFile = join(dir, "sessions.json");
    if (existsSync(this.sesFile)) this.sessions = JSON.parse(readFileSync(this.sesFile, "utf8"));
  }

  operator(): Operator | null {
    return existsSync(this.opFile) ? JSON.parse(readFileSync(this.opFile, "utf8")) : null;
  }

  setOperator(email: string, password: string) {
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    writeAtomic(this.opFile, { email: email.trim().toLowerCase(), ...hashPassword(password) });
    this.sessions = {};
    this.saveSessions();
  }

  checkPassword(email: string, password: string) {
    const op = this.operator();
    if (!op) return false;
    const { hash } = hashPassword(password, op.salt);
    const ok = timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(op.hash, "hex"));
    return ok && op.email === email.trim().toLowerCase();
  }

  /** Max 5 failed attempts per IP, then 15 min lockout. */
  locked(ip: string) { const a = this.attempts.get(ip); return !!a && a.until > Date.now(); }
  fail(ip: string) {
    const a = this.attempts.get(ip) ?? { n: 0, until: 0 };
    a.n += 1;
    if (a.n >= 5) { a.until = Date.now() + 15 * 60_000; a.n = 0; }
    this.attempts.set(ip, a);
  }
  clearFails(ip: string) { this.attempts.delete(ip); }

  create(email: string) {
    const token = randomBytes(32).toString("hex");
    this.sessions[this.key(token)] = { email, expires: Date.now() + SESSION_MS };
    this.saveSessions();
    return token;
  }
  get(token: string | undefined) {
    if (!token) return null;
    const s = this.sessions[this.key(token)];
    if (!s || s.expires < Date.now()) return null;
    return s;
  }
  destroy(token: string | undefined) {
    if (!token) return;
    delete this.sessions[this.key(token)];
    this.saveSessions();
  }
  /** Only token hashes are stored on disk. */
  private key(token: string) { return createHash("sha256").update(token).digest("hex"); }
  private saveSessions() {
    const now = Date.now();
    for (const [k, s] of Object.entries(this.sessions)) if (s.expires < now) delete this.sessions[k];
    writeAtomic(this.sesFile, this.sessions);
  }
}

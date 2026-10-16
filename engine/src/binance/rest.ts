import { createHmac } from "node:crypto";
import { latency } from "../util/latency.js";

export class BinanceError extends Error {
  constructor(public code: number, msg: string, public status: number) {
    super(msg);
  }
}
/** Network failure / timeout / 5xx: the request outcome is UNKNOWN. */
export const isUnknownOutcome = (e: unknown) =>
  !(e instanceof BinanceError) || e.status >= 500 || e.code === -1007; // -1007 = timeout waiting for backend

type P = Record<string, string | number | boolean | undefined>;
const qs = (p: P) =>
  new URLSearchParams(Object.entries(p).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])).toString();

/** Binance USDⓈ-M Futures REST client. Keys stay in this process only. */
export class FuturesRest {
  offset = 0;
  weightUsed = 0;
  constructor(private base: string, private key: string, private secret: string, private recvWindow = 5000) {}

  get hasKeys() {
    return !!(this.key && this.secret);
  }

  async syncTime() {
    const t0 = Date.now();
    const r = await this.pub<{ serverTime: number }>("/fapi/v1/time");
    const t1 = Date.now();
    this.offset = r.serverTime - Math.round((t0 + t1) / 2);
    latency.record("rest_rtt", t1 - t0);
    return this.offset;
  }

  pub<T>(path: string, params: P = {}) {
    const q = qs(params);
    return this.req<T>("GET", path + (q ? "?" + q : ""), false);
  }
  /** API-key-only endpoints (listenKey). */
  keyed<T>(method: string, path: string) {
    return this.req<T>(method, path, true);
  }
  signed<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, params: P = {}) {
    if (!this.hasKeys) throw new BinanceError(-1, "API keys missing", 0);
    const q = qs({ ...params, recvWindow: this.recvWindow, timestamp: Date.now() + this.offset });
    const sig = createHmac("sha256", this.secret).update(q).digest("hex");
    return this.req<T>(method, `${path}?${q}&signature=${sig}`, true);
  }

  private async req<T>(method: string, pathQs: string, auth: boolean): Promise<T> {
    const res = await fetch(this.base + pathQs, {
      method,
      headers: auth ? { "X-MBX-APIKEY": this.key } : {},
      signal: AbortSignal.timeout(8000),
    });
    const w = res.headers.get("x-mbx-used-weight-1m");
    if (w) this.weightUsed = Number(w);
    const text = await res.text();
    if (!res.ok) {
      let j: { code?: number; msg?: string } = {};
      try {
        j = JSON.parse(text);
      } catch {
        /* non-json */
      }
      throw new BinanceError(j.code ?? res.status, j.msg ?? text.slice(0, 300), res.status);
    }
    return JSON.parse(text) as T;
  }
}

import WebSocket from "ws";
import { log } from "../util/log.js";

const L = log("ws");

/** Auto-reconnecting WebSocket with liveness tracking. */
export class Stream {
  ws: WebSocket | null = null;
  connected = false;
  lastMsgAt = 0;
  reconnects = 0;
  private closed = false;
  private backoff = 1000;
  constructor(public name: string, private url: () => string, private onMsg: (m: any) => void, public streams = 0) {}

  start() {
    this.closed = false;
    this.open();
  }
  stop() {
    this.closed = true;
    this.ws?.close();
  }
  private open() {
    const ws = new WebSocket(this.url(), { handshakeTimeout: 10_000 });
    this.ws = ws;
    ws.on("open", () => {
      this.connected = true;
      this.backoff = 1000;
      L.info("connected", { name: this.name, streams: this.streams });
    });
    ws.on("message", (buf) => {
      this.lastMsgAt = Date.now();
      try {
        this.onMsg(JSON.parse(buf.toString()));
      } catch (e) {
        L.warn("bad message", { name: this.name, err: String(e) });
      }
    });
    ws.on("close", () => {
      this.connected = false;
      if (this.closed) return;
      this.reconnects++;
      const wait = this.backoff;
      this.backoff = Math.min(30_000, this.backoff * 2);
      L.warn("disconnected, reconnecting", { name: this.name, wait });
      setTimeout(() => this.open(), wait);
    });
    ws.on("error", (e) => L.warn("error", { name: this.name, err: String(e) }));
  }
  status() {
    return { name: this.name, connected: this.connected, streams: this.streams, lastMsgAgoMs: this.lastMsgAt ? Date.now() - this.lastMsgAt : -1, reconnects: this.reconnects };
  }
}

/** Split many streams into combined connections (Binance limit 200 per connection). */
export function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

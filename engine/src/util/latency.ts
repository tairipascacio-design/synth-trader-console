/** Rolling latency tracker per pipeline stage (ms). */
export class Latency {
  private buf = new Map<string, number[]>();
  constructor(private size = 500) {}
  record(stage: string, ms: number) {
    let a = this.buf.get(stage);
    if (!a) this.buf.set(stage, (a = []));
    a.push(ms);
    if (a.length > this.size) a.shift();
  }
  snapshot() {
    const out: Record<string, { p50: number; p95: number; last: number }> = {};
    for (const [k, a] of this.buf) {
      if (!a.length) continue;
      const s = [...a].sort((x, y) => x - y);
      out[k] = { p50: s[Math.floor(s.length * 0.5)]!, p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]!, last: a.at(-1)! };
    }
    return out;
  }
}

/** Stages measured end to end:
 *  feed      exchange event time -> received
 *  market    received -> candles/tickers updated
 *  detect    strategy scan
 *  decide    scoring + risk + sizing
 *  submit    order request round trip (ack)
 *  confirm   submit -> fill confirmation
 *  e2e       exchange event -> order acknowledged
 */
export const latency = new Latency();

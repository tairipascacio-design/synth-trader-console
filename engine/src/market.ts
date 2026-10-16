import type { Candle, SymbolRules, Ticker } from "./types.js";
import type { FuturesRest } from "./binance/rest.js";
import { Stream, chunk } from "./binance/ws.js";
import { latency } from "./util/latency.js";
import { log } from "./util/log.js";

const L = log("market");
const MAX = 400;

/** Real Binance Futures market data: exchangeInfo, 24h tickers, klines seed + combined WebSocket streams. */
export class Market {
  rules = new Map<string, SymbolRules>();
  tickers = new Map<string, Ticker>();
  candles = new Map<string, Candle[]>(); // key `${symbol}|${tf}`
  symbols: string[] = [];
  streams: Stream[] = [];
  onClose: (symbol: string, tf: string) => void = () => {};

  constructor(private rest: FuturesRest, private wsBase: string) {}

  async loadRules() {
    const info = await this.rest.pub<any>("/fapi/v1/exchangeInfo");
    for (const s of info.symbols) {
      if (s.contractType !== "PERPETUAL" || s.quoteAsset !== "USDT") continue;
      const f = (t: string) => s.filters.find((x: any) => x.filterType === t) ?? {};
      this.rules.set(s.symbol, {
        symbol: s.symbol, market: "futures", base: s.baseAsset, quote: s.quoteAsset,
        tickSize: Number(f("PRICE_FILTER").tickSize), stepSize: Number(f("MARKET_LOT_SIZE").stepSize || f("LOT_SIZE").stepSize),
        minQty: Number(f("MARKET_LOT_SIZE").minQty || f("LOT_SIZE").minQty), maxQty: Number(f("MARKET_LOT_SIZE").maxQty || f("LOT_SIZE").maxQty),
        minNotional: Number(f("MIN_NOTIONAL").notional ?? 5), status: s.status,
      });
    }
  }

  /** Pick the most liquid tradable symbols that pass the volume filter. */
  async selectUniverse(minQuoteVol: number, max: number, blacklist: string[]) {
    const t = await this.rest.pub<any[]>("/fapi/v1/ticker/24hr");
    const books = await this.rest.pub<any[]>("/fapi/v1/ticker/bookTicker");
    const bk = new Map(books.map((b) => [b.symbol, b]));
    const now = Date.now();
    for (const x of t) {
      const b = bk.get(x.symbol);
      this.tickers.set(x.symbol, { symbol: x.symbol, last: Number(x.lastPrice), bid: Number(b?.bidPrice ?? 0), ask: Number(b?.askPrice ?? 0), quoteVolume24h: Number(x.quoteVolume), changePct: Number(x.priceChangePercent), updatedAt: now });
    }
    this.symbols = t
      .filter((x) => this.rules.get(x.symbol)?.status === "TRADING" && !blacklist.includes(x.symbol) && Number(x.quoteVolume) >= minQuoteVol)
      .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
      .slice(0, max)
      .map((x) => x.symbol);
    return this.symbols;
  }

  async seed(tfs: string[]) {
    for (const s of this.symbols) {
      for (const tf of tfs) {
        const k = await this.rest.pub<any[]>("/fapi/v1/klines", { symbol: s, interval: tf, limit: 300 });
        this.candles.set(`${s}|${tf}`, k.map((r) => ({ t: r[0], o: +r[1], h: +r[2], l: +r[3], c: +r[4], v: +r[5], closed: r[6] < Date.now() })));
      }
    }
  }

  connect(tfs: string[]) {
    for (const s of this.streams) s.stop();
    const names = this.symbols.flatMap((s) => [...tfs.map((tf) => `${s.toLowerCase()}@kline_${tf}`), `${s.toLowerCase()}@bookTicker`]);
    this.streams = chunk(names, 180).map((part, i) => {
      const st = new Stream(`market-${i}`, () => `${this.wsBase}/stream?streams=${part.join("/")}`, (m) => this.handle(m), part.length);
      st.start();
      return st;
    });
  }

  private handle(m: any) {
    const d = m.data;
    if (!d) return;
    const recv = Date.now();
    if (d.E) latency.record("feed", Math.max(0, recv - d.E));
    if (d.e === "kline") {
      const k = d.k;
      const key = `${d.s}|${k.i}`;
      const arr = this.candles.get(key) ?? [];
      const c: Candle = { t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v, closed: k.x };
      if (arr.length && arr[arr.length - 1]!.t === c.t) arr[arr.length - 1] = c;
      else arr.push(c);
      if (arr.length > MAX) arr.shift();
      this.candles.set(key, arr);
      const t = this.tickers.get(d.s);
      if (t) { t.last = c.c; t.updatedAt = recv; }
      latency.record("market", Date.now() - recv);
      if (k.x) this.onClose(d.s, k.i);
    } else if (d.e === "bookTicker" || (d.b && d.a && d.s)) {
      const t = this.tickers.get(d.s);
      if (t) { t.bid = +d.b; t.ask = +d.a; t.updatedAt = recv; }
    }
  }

  closed(symbol: string, tf: string) {
    return (this.candles.get(`${symbol}|${tf}`) ?? []).filter((c) => c.closed);
  }
  /** Data is fresh when every market stream got a message recently and the ticker was updated. */
  isStale(symbol: string, maxMs: number) {
    const t = this.tickers.get(symbol);
    if (!t || Date.now() - t.updatedAt > maxMs) return true;
    return this.streams.some((s) => !s.connected || Date.now() - s.lastMsgAt > maxMs);
  }
  spreadPct(symbol: string) {
    const t = this.tickers.get(symbol);
    if (!t || !t.bid || !t.ask) return Infinity;
    return ((t.ask - t.bid) / ((t.ask + t.bid) / 2)) * 100;
  }
  log() {
    L.info("universe", { symbols: this.symbols.length });
  }
}

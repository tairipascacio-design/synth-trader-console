import type { BotConfig } from "./config.js";
import type { Candle, Setup } from "./types.js";

export function atr(c: Candle[], n: number): number {
  if (c.length < n + 1) return 0;
  let s = 0;
  for (let i = c.length - n; i < c.length; i++) {
    const p = c[i - 1]!.c, x = c[i]!;
    s += Math.max(x.h - x.l, Math.abs(x.h - p), Math.abs(x.l - p));
  }
  return s / n;
}
export function ema(v: number[], n: number): number[] {
  const k = 2 / (n + 1);
  const out: number[] = [];
  v.forEach((x, i) => out.push(i ? x * k + out[i - 1]! * (1 - k) : x));
  return out;
}
/** Swing pivots (confirmed by `lb` bars each side). */
export function pivots(c: Candle[], lb: number) {
  const highs: { i: number; p: number }[] = [], lows: { i: number; p: number }[] = [];
  for (let i = lb; i < c.length - lb; i++) {
    let hi = true, lo = true;
    for (let j = i - lb; j <= i + lb; j++) {
      if (j === i) continue;
      if (c[j]!.h >= c[i]!.h) hi = false;
      if (c[j]!.l <= c[i]!.l) lo = false;
    }
    if (hi) highs.push({ i, p: c[i]!.h });
    if (lo) lows.push({ i, p: c[i]!.l });
  }
  return { highs, lows };
}
const relVol = (c: Candle[], n = 20) => {
  const last = c[c.length - 1]!;
  const base = c.slice(-n - 1, -1);
  const m = base.reduce((a, x) => a + x.v, 0) / Math.max(1, base.length);
  return m ? last.v / m : 0;
};

/**
 * Strategy detection on closed candles.
 * A: liquidity sweep below a swing low with rejection (LONG)
 * B: liquidity sweep above a swing high with rejection (SHORT)
 * C: false breakout — closes beyond a level then closes back inside (fade)
 * D: confirmed breakout — N closes beyond the level with volume (follow)
 */
export function detect(symbol: string, fast: Candle[], structure: Candle[], context: Candle[], cfg: BotConfig): Setup[] {
  const d = cfg.detection;
  if (fast.length < 50 || structure.length < d.levelLookback) return [];
  const a = atr(fast, d.atrPeriod);
  if (!a) return [];
  const last = fast[fast.length - 1]!;
  const atrPct = (a / last.c) * 100;
  const st = structure.slice(-d.levelLookback);
  const { highs, lows } = pivots(st, d.pivotLookback);
  const rv = relVol(fast);
  const ctxE = ema(context.map((x) => x.c), 20);
  const slope = ctxE.length > 3 ? ctxE[ctxE.length - 1]! - ctxE[ctxE.length - 4]! : 0;
  const ctx = (side: "LONG" | "SHORT") => (context.length < 25 ? null : side === "LONG" ? slope > 0 : slope < 0);
  const range = last.h - last.l || 1e-12;
  const out: Setup[] = [];
  const nearestAbove = (p: number) => highs.map((h) => h.p).filter((x) => x > p).sort((x, y) => x - y)[0];
  const nearestBelow = (p: number) => lows.map((h) => h.p).filter((x) => x < p).sort((x, y) => y - x)[0];
  const quality = (touches: number, age: number) => Math.min(1, 0.4 + touches * 0.2 + Math.min(age, 40) / 100);
  const touches = (lvl: number) => st.filter((x) => Math.abs(x.h - lvl) < a * 0.3 || Math.abs(x.l - lvl) < a * 0.3).length;
  const base = (strategy: Setup["strategy"], side: Setup["side"], level: number, stop: number, inval: number, strength: number, extra: Partial<Setup["features"]>, notes: string[], lvlIdx: number) => {
    const entry = last.c;
    const r = Math.abs(entry - stop);
    if (r <= 0) return;
    const struct = side === "LONG" ? nearestAbove(entry) : nearestBelow(entry);
    const t1 = struct && Math.abs(struct - entry) > r ? struct : side === "LONG" ? entry + 2 * r : entry - 2 * r;
    const t2 = side === "LONG" ? Math.max(t1, entry + 3 * r) : Math.min(t1, entry - 3 * r);
    out.push({
      strategy, side, symbol, market: "futures", level, entry, stop, targets: [t1, t2], invalidation: inval,
      features: { structureQuality: quality(touches(level), st.length - lvlIdx), strength, relVolume: rv, atr: a, atrPct, confirmations: 1, contextAligned: ctx(side), ...extra },
      notes,
    });
  };

  // A / B — wick sweeps
  for (const lw of lows) {
    const pen = (lw.p - last.l) / a;
    if (pen >= d.minPenetrationAtr && pen <= d.maxPenetrationAtr && last.c > lw.p) {
      const wick = (Math.min(last.o, last.c) - last.l) / range;
      if (wick >= d.minWickRatio && rv >= d.minRelVolume)
        base("A", "LONG", lw.p, last.l - a * 0.1, last.l, wick, { penetrationAtr: pen, wickRatio: wick, recoveryBars: 1 }, [`barrida bajo ${lw.p}`], lw.i);
    }
  }
  for (const hg of highs) {
    const pen = (last.h - hg.p) / a;
    if (pen >= d.minPenetrationAtr && pen <= d.maxPenetrationAtr && last.c < hg.p) {
      const wick = (last.h - Math.max(last.o, last.c)) / range;
      if (wick >= d.minWickRatio && rv >= d.minRelVolume)
        base("B", "SHORT", hg.p, last.h + a * 0.1, last.h, wick, { penetrationAtr: pen, wickRatio: wick, recoveryBars: 1 }, [`barrida sobre ${hg.p}`], hg.i);
    }
  }
  // C — false breakout: 1..3 prior closes beyond, current close back inside
  const prev = fast.slice(-4, -1);
  for (const hg of highs) {
    const beyond = prev.filter((x) => x.c > hg.p);
    if (beyond.length && last.c < hg.p && rv >= d.minRelVolume * 0.8) {
      const ext = Math.max(...prev.map((x) => x.h), last.h);
      base("C", "SHORT", hg.p, ext + a * 0.1, ext, Math.min(1, (hg.p - last.c) / a), { recoveryBars: beyond.length }, [`falsa ruptura de ${hg.p}`], hg.i);
    }
  }
  for (const lw of lows) {
    const beyond = prev.filter((x) => x.c < lw.p);
    if (beyond.length && last.c > lw.p && rv >= d.minRelVolume * 0.8) {
      const ext = Math.min(...prev.map((x) => x.l), last.l);
      base("C", "LONG", lw.p, ext - a * 0.1, ext, Math.min(1, (last.c - lw.p) / a), { recoveryBars: beyond.length }, [`falsa ruptura de ${lw.p}`], lw.i);
    }
  }
  // D — confirmed breakout
  const lastN = fast.slice(-d.breakoutCloses);
  const before = fast[fast.length - d.breakoutCloses - 1];
  if (before && rv >= d.breakoutRelVolume) {
    for (const hg of highs)
      if (before.c <= hg.p && lastN.every((x) => x.c > hg.p))
        base("D", "LONG", hg.p, hg.p - a * 0.5, hg.p - a * 0.5, Math.min(1, (last.c - hg.p) / a), { confirmations: d.breakoutCloses }, [`ruptura de ${hg.p}`], hg.i);
    for (const lw of lows)
      if (before.c >= lw.p && lastN.every((x) => x.c < lw.p))
        base("D", "SHORT", lw.p, lw.p + a * 0.5, lw.p + a * 0.5, Math.min(1, (lw.p - last.c) / a), { confirmations: d.breakoutCloses }, [`ruptura de ${lw.p}`], lw.i);
  }
  const enabled = { A: cfg.strategies.A_sweepLow, B: cfg.strategies.B_sweepHigh, C: cfg.strategies.C_falseBreakout, D: cfg.strategies.D_breakout };
  return out.filter((s) => enabled[s.strategy]);
}

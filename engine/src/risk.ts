import type { BotConfig } from "./config.js";
import type { PositionRecord, Setup, SizingResult, SymbolRules } from "./types.js";
import { floorStep } from "./util/math.js";

/** Position size from monetary risk, including fees and slippage, rounded to exchange rules. */
export function size(s: Setup, rules: SymbolRules, equity: number, available: number, cfg: BotConfig): SizingResult {
  const c = cfg.capital;
  const riskUsd = (equity * c.riskPerTradePct) / 100;
  const perUnitRisk = Math.abs(s.entry - s.stop);
  const perUnitCost = s.entry * ((c.feePct * 2) / 100) + s.entry * (c.maxSlippagePct / 100);
  const fail = (reason: string): SizingResult => ({ qty: 0, notional: 0, margin: 0, riskUsd, potentialLoss: 0, feesEst: 0, slippageEst: 0, ok: false, reason });
  if (perUnitRisk <= 0) return fail("stop inválido");
  let qty = floorStep(riskUsd / (perUnitRisk + perUnitCost), rules.stepSize);
  const maxByMargin = floorStep((available * 0.95 * c.leverage) / s.entry, rules.stepSize);
  qty = Math.min(qty, maxByMargin, rules.maxQty);
  const notional = qty * s.entry;
  const feesEst = notional * ((c.feePct * 2) / 100);
  const slippageEst = notional * (c.maxSlippagePct / 100);
  const potentialLoss = qty * perUnitRisk + feesEst + slippageEst;
  const r: SizingResult = { qty, notional, margin: notional / c.leverage, riskUsd, potentialLoss, feesEst, slippageEst, ok: true };
  if (qty < rules.minQty) return { ...r, ok: false, reason: `cantidad ${qty} < mínimo ${rules.minQty}` };
  if (notional < rules.minNotional) return { ...r, ok: false, reason: `nocional ${notional.toFixed(2)} < mínimo ${rules.minNotional}` };
  if (potentialLoss > riskUsd * 1.05) return { ...r, ok: false, reason: "pérdida potencial excede el riesgo autorizado" };
  return r;
}

export interface GuardCtx {
  cfg: BotConfig;
  equity: number;
  dailyPnl: number;
  dayStartEquity: number;
  halted: boolean;
  blocked: string[]; // global blocks (stale, mismatch, time offset...)
  open: PositionRecord[];
}

/** Portfolio-level protections. Returns reasons to reject (empty = allowed). */
export function guard(s: Setup, sz: SizingResult, g: GuardCtx): string[] {
  const c = g.cfg.capital;
  const r: string[] = [...g.blocked];
  if (g.halted) r.push("motor detenido");
  if (g.dayStartEquity > 0 && -g.dailyPnl >= (g.dayStartEquity * c.dailyLossPct) / 100) r.push("límite de pérdida diaria alcanzado");
  const live = g.open.filter((p) => p.status !== "closed");
  if (live.length >= c.maxPositions) r.push(`máx. posiciones (${c.maxPositions})`);
  if (live.some((p) => p.symbol === s.symbol)) r.push("ya hay posición en el símbolo");
  const aggRisk = live.reduce((a, p) => a + p.riskUsd, 0) + sz.riskUsd;
  if (aggRisk > (g.equity * c.maxAggregateRiskPct) / 100) r.push("riesgo agregado excedido");
  const notional = (p: PositionRecord) => p.qty * (p.mark ?? p.entry);
  const asset = live.filter((p) => p.symbol === s.symbol).reduce((a, p) => a + notional(p), 0) + sz.notional;
  if (asset > (g.equity * c.leverage * c.maxExposurePerAssetPct) / 100) r.push("exposición por activo excedida");
  const dir = live.filter((p) => p.side === s.side).reduce((a, p) => a + notional(p), 0) + sz.notional;
  if (dir > (g.equity * c.leverage * c.maxExposurePerDirectionPct) / 100) r.push("exposición por dirección excedida");
  return r;
}

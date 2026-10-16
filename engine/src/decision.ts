import type { BotConfig } from "./config.js";
import type { Evaluation, Factor, Setup } from "./types.js";

/** Central decision engine: scores a setup 0..100 with an explainable factor breakdown. */
export function score(s: Setup, cfg: BotConfig): Evaluation {
  const f = s.features;
  const risk = Math.abs(s.entry - s.stop);
  const rr = risk > 0 ? Math.abs(s.targets[0]! - s.entry) / risk : 0;
  const factors: Factor[] = [
    { name: "estructura", points: Math.round(20 * f.structureQuality) },
    { name: "fuerza", points: Math.round(20 * Math.min(1, f.strength)) },
    { name: "volumen relativo", points: Math.round(20 * Math.min(1, f.relVolume / (cfg.detection.minRelVolume * 2))) },
    { name: "contexto", points: f.contextAligned === null ? 7 : f.contextAligned ? 15 : 0 },
    { name: "riesgo/beneficio", points: Math.round(15 * Math.min(1, rr / (cfg.capital.minRR * 1.5))) },
    { name: "volatilidad", points: f.atrPct >= cfg.filters.minAtrPct && f.atrPct <= cfg.filters.maxAtrPct ? 10 : 0 },
  ];
  if (s.strategy === "D" && f.contextAligned === false) factors.push({ name: "ruptura contra tendencia", points: -10 });
  const total = Math.max(0, Math.min(100, factors.reduce((a, x) => a + x.points, 0)));
  const reasons: string[] = [];
  if (total < cfg.capital.minScore) reasons.push(`puntuación ${total} < ${cfg.capital.minScore}`);
  if (rr < cfg.capital.minRR) reasons.push(`R:B ${rr.toFixed(2)} < ${cfg.capital.minRR}`);
  if (f.atrPct < cfg.filters.minAtrPct || f.atrPct > cfg.filters.maxAtrPct) reasons.push(`ATR% ${f.atrPct.toFixed(2)} fuera de rango`);
  return { setup: s, score: total, factors, rr, accepted: reasons.length === 0, reasons };
}

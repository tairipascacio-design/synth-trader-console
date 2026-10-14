import type { Mode, Market } from "./types.js";

/** Runtime trading configuration (editable from the console, no recompilation needed). */
export interface BotConfig {
  mode: Mode;
  markets: Market[];
  capital: {
    reference: number;
    riskPerTradePct: number;
    maxPositions: number;
    leverage: number;
    minRR: number;
    minScore: number;
    dailyLossPct: number;
    maxSlippagePct: number;
    maxAggregateRiskPct: number;
    maxExposurePerAssetPct: number;
    maxExposurePerDirectionPct: number;
    feePct: number;
  };
  strategies: { A_sweepLow: boolean; B_sweepHigh: boolean; C_falseBreakout: boolean; D_breakout: boolean };
  timeframes: { fast: string; structure: string; context: string };
  detection: {
    pivotLookback: number;
    levelLookback: number;
    minPenetrationAtr: number;
    maxPenetrationAtr: number;
    minWickRatio: number;
    minRelVolume: number;
    breakoutRelVolume: number;
    breakoutCloses: number;
    atrPeriod: number;
    confirmBars: number;
  };
  filters: {
    minQuoteVolume24h: number;
    maxSpreadPct: number;
    minAtrPct: number;
    maxAtrPct: number;
    maxSymbols: number;
    blacklist: string[];
  };
  exits: {
    trailingEnabled: boolean;
    trailingActivateR: number;
    trailingDistanceAtr: number;
    closeOnInvalidation: boolean;
    closeOnOppositeSignal: boolean;
    partialTpPct: number;
  };
  staleDataMs: number;
}

export const DEFAULT_CONFIG: BotConfig = {
  mode: "live",
  markets: ["futures"],
  capital: {
    reference: 1000,
    riskPerTradePct: 1,
    maxPositions: 5,
    leverage: 1,
    minRR: 2,
    minScore: 65,
    dailyLossPct: 5,
    maxSlippagePct: 0.1,
    maxAggregateRiskPct: 5,
    maxExposurePerAssetPct: 30,
    maxExposurePerDirectionPct: 60,
    feePct: 0.04,
  },
  strategies: { A_sweepLow: true, B_sweepHigh: true, C_falseBreakout: true, D_breakout: true },
  timeframes: { fast: "1m", structure: "5m", context: "15m" },
  detection: {
    pivotLookback: 3,
    levelLookback: 60,
    minPenetrationAtr: 0.1,
    maxPenetrationAtr: 1.5,
    minWickRatio: 0.5,
    minRelVolume: 1.5,
    breakoutRelVolume: 1.8,
    breakoutCloses: 2,
    atrPeriod: 14,
    confirmBars: 1,
  },
  filters: { minQuoteVolume24h: 50_000_000, maxSpreadPct: 0.05, minAtrPct: 0.15, maxAtrPct: 5, maxSymbols: 30, blacklist: [] },
  exits: {
    trailingEnabled: true,
    trailingActivateR: 1,
    trailingDistanceAtr: 1,
    closeOnInvalidation: true,
    closeOnOppositeSignal: true,
    partialTpPct: 50,
  },
  staleDataMs: 5000,
};

/** Deep-merge a partial (possibly remote) config over defaults; unknown keys are ignored. */
export function mergeConfig(base: BotConfig, patch: unknown): BotConfig {
  const out: any = structuredClone(base);
  const walk = (dst: any, src: any) => {
    if (!src || typeof src !== "object") return;
    for (const k of Object.keys(dst)) {
      if (!(k in src)) continue;
      const v = src[k];
      if (Array.isArray(dst[k])) dst[k] = Array.isArray(v) ? v : dst[k];
      else if (dst[k] && typeof dst[k] === "object") walk(dst[k], v);
      else if (typeof v === typeof dst[k]) dst[k] = v;
    }
  };
  walk(out, patch);
  // hard sanity bounds
  out.capital.riskPerTradePct = clamp(out.capital.riskPerTradePct, 0.01, 5);
  out.capital.leverage = clamp(Math.round(out.capital.leverage), 1, 20);
  out.capital.maxPositions = clamp(Math.round(out.capital.maxPositions), 1, 50);
  out.capital.minScore = clamp(out.capital.minScore, 0, 100);
  out.capital.dailyLossPct = clamp(out.capital.dailyLossPct, 0.1, 50);
  return out as BotConfig;
}
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Server environment (secrets live only here, never in the console). */
export interface Env {
  mode: Mode; // ceiling: config.mode can never exceed this
  enableLive: boolean;
  apiKey: string;
  apiSecret: string;
  consoleUrl: string;
  engineToken: string;
  adminToken: string;
  port: number;
  dataDir: string;
  expectedIp: string;
  spotRest: string;
  spotWs: string;
  futRest: string;
  futWs: string;
}

export function loadEnv(e = process.env): Env {
  const mode = (e.GHOST_MODE as Mode) ?? "live";
  const testnet = mode === "testnet";
  return {
    mode,
    enableLive: e.ENABLE_LIVE_TRADING === "true",
    apiKey: e.BINANCE_API_KEY ?? "",
    apiSecret: e.BINANCE_API_SECRET ?? "",
    consoleUrl: e.CONSOLE_SYNC_URL ?? "",
    engineToken: e.ENGINE_TOKEN ?? "",
    adminToken: e.ADMIN_TOKEN ?? "",
    port: Number(e.PORT ?? 8787),
    dataDir: e.DATA_DIR ?? "./data",
    expectedIp: e.EXPECTED_PUBLIC_IP ?? "",
    spotRest: e.BINANCE_SPOT_REST ?? (testnet ? "https://testnet.binance.vision" : "https://api.binance.com"),
    spotWs: e.BINANCE_SPOT_WS ?? (testnet ? "wss://stream.testnet.binance.vision" : "wss://stream.binance.com:9443"),
    futRest: e.BINANCE_FUTURES_REST ?? (testnet ? "https://testnet.binancefuture.com" : "https://fapi.binance.com"),
    futWs: e.BINANCE_FUTURES_WS ?? (testnet ? "wss://stream.binancefuture.com" : "wss://fstream.binance.com"),
  };
}

/** The effective mode is the most conservative of console mode and server ceiling. */
export function effectiveMode(cfg: Mode, env: Env): Mode {
  const rank: Record<Mode, number> = { paper: 0, testnet: 1, live: 2 };
  let m: Mode = rank[cfg] <= rank[env.mode] ? cfg : env.mode;
  if (m === "live" && !env.enableLive) m = "paper";
  if (m === "testnet" && env.mode !== "testnet") m = "paper"; // testnet needs testnet URLs/keys
  return m;
}

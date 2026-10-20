import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { dropletRequest, type Row, type TableName } from "@/lib/droplet";

export async function sendCommand(command: string, payload?: Record<string, unknown>) {
  try {
    await dropletRequest('commands', { command, payload });
    toast.success(`Comando "${command}" confirmado por el Droplet`);
  } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo enviar el comando'); }
}

export type BotConfig = {
  mode: "paper" | "testnet" | "live";
  markets: ("spot" | "futures")[];
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
  detection: Record<string, number>;
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
};

export type EngineStatus = {
  online?: boolean;
  mode?: string;
  halted?: boolean;
  haltReason?: string | null;
  entriesBlocked?: string[];
  binance?: { rest?: string; spot?: string; futures?: string; timeOffsetMs?: number; ip?: string; checks?: Record<string, boolean> };
  ws?: { connected: boolean; streams: number; lastMsgAgoMs: number; reconnects: number }[];
  latency?: Record<string, { p50: number; p95: number; last: number }>;
  account?: { equity: number; balance: number; marginUsed: number; available: number; exposure: number; dailyPnl: number; unrealizedPnl: number; simulated: boolean };
  symbols?: number;
  version?: string;
  startedAt?: string;
};

export const configQuery = queryOptions({
  queryKey: ["bot_config"],
  queryFn: async () => {
    return dropletRequest<{ config: BotConfig; version: number }>('config');
  },
});

export const statusQuery = queryOptions({
  queryKey: ["engine_status"],
  queryFn: async () => {
    return dropletRequest<{ status: EngineStatus; heartbeat_at: string | null }>('status');
  },
  refetchInterval: 5000,
});

export const tableQuery = <T extends TableName>(
  table: T,
  orderCol: string,
  limit = 200,
) =>
  queryOptions({
    queryKey: [table],
    queryFn: async () => {
      return dropletRequest<Row<T>[]>(`tables/${table}?order=${encodeURIComponent(orderCol)}&limit=${limit}`);
    },
  });

/** Subscribes once to realtime changes and invalidates matching query keys. */
export function useRealtimeInvalidate() {
  const qc = useQueryClient();
  useEffect(() => {
    const tables = ["engine_status", "signals", "orders", "positions", "fills", "events"];
    const timer = window.setInterval(() => {
      for (const t of tables) void qc.invalidateQueries({ queryKey: [t] });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [qc]);
}

export const fmt = (n: unknown, d = 2) =>
  n === null || n === undefined || Number.isNaN(Number(n))
    ? "—"
    : Number(n).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtPx = (n: unknown) => {
  const v = Number(n);
  if (n === null || n === undefined || Number.isNaN(v)) return "—";
  const d = v >= 100 ? 2 : v >= 1 ? 4 : 6;
  return fmt(v, d);
};

export const ago = (iso?: string | null) => {
  if (!iso) return "nunca";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.round(s / 60)}m`;
  return `hace ${Math.round(s / 3600)}h`;
};

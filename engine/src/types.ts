export type Market = "spot" | "futures";
export type Side = "LONG" | "SHORT";
export type OrderSide = "BUY" | "SELL";
export type Mode = "paper" | "testnet" | "live";
export type StrategyId = "A" | "B" | "C" | "D";

export interface Candle {
  t: number; // open time ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number; // base volume
  closed: boolean;
}

export interface SymbolRules {
  symbol: string;
  market: Market;
  base: string;
  quote: string;
  tickSize: number;
  stepSize: number;
  minQty: number;
  maxQty: number;
  minNotional: number;
  status: string;
}

export interface Ticker {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  quoteVolume24h: number;
  changePct: number;
  updatedAt: number;
}

export interface Setup {
  strategy: StrategyId;
  side: Side;
  symbol: string;
  market: Market;
  level: number;
  entry: number;
  stop: number;
  targets: number[];
  invalidation: number; // price that invalidates the structure
  features: {
    structureQuality: number; // 0..1
    strength: number; // 0..1 rejection / breakout strength
    relVolume: number;
    atr: number;
    atrPct: number;
    penetrationAtr?: number;
    wickRatio?: number;
    recoveryBars?: number;
    confirmations: number;
    contextAligned: boolean | null;
  };
  notes: string[];
}

export interface Factor { name: string; points: number; note?: string }

export interface Evaluation {
  setup: Setup;
  score: number;
  factors: Factor[];
  rr: number;
  accepted: boolean;
  reasons: string[];
  sizing?: SizingResult;
}

export interface SizingResult {
  qty: number;
  notional: number;
  margin: number;
  riskUsd: number; // authorised monetary risk
  potentialLoss: number; // loss at stop incl. costs with rounded qty
  feesEst: number;
  slippageEst: number;
  ok: boolean;
  reason?: string;
}

export type OrderStatus =
  | "PENDING" // intent persisted, not yet acknowledged
  | "UNKNOWN" // request outcome unknown, must query before anything else
  | "NEW"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELED"
  | "REJECTED"
  | "EXPIRED"
  | "NOT_FOUND";

export type OrderPurpose = "entry" | "stop" | "tp" | "exit";

export interface OrderRecord {
  client_order_id: string;
  exchange_order_id: string | null;
  symbol: string;
  market: Market;
  side: OrderSide;
  type: string;
  purpose: OrderPurpose;
  status: OrderStatus;
  qty: number;
  price: number | null;
  stop_price: number | null;
  filled_qty: number;
  avg_price: number | null;
  reduce_only: boolean;
  position_id: string | null;
  simulated: boolean;
  created_at: string;
  updated_at: string;
  raw?: unknown;
}

export interface PositionRecord {
  id: string;
  symbol: string;
  market: Market;
  side: Side;
  strategy: StrategyId;
  score: number;
  qty: number;
  entry: number;
  stop: number;
  initial_stop: number;
  targets: number[];
  trail: { active: boolean; distance: number; best: number } | null;
  status: "opening" | "open" | "closing" | "closed";
  realized_pnl: number;
  fees: number;
  mark: number | null;
  unrealized_pnl: number | null;
  entry_reason: unknown;
  exit_reason: string | null;
  simulated: boolean;
  opened_at: string;
  closed_at: string | null;
  invalidation: number;
  tp1Done?: boolean;
  riskUsd: number;
}

export interface FillRecord {
  id: string;
  client_order_id: string;
  position_id: string | null;
  symbol: string;
  side: OrderSide;
  qty: number;
  price: number;
  fee: number;
  realized_pnl: number;
  simulated: boolean;
  ts: string;
}

export interface PlaceOrderReq {
  symbol: string;
  market: Market;
  side: OrderSide;
  type: "MARKET" | "LIMIT" | "STOP_MARKET" | "TAKE_PROFIT_MARKET";
  qty: number;
  price?: number;
  stopPrice?: number;
  reduceOnly?: boolean;
  clientOrderId: string;
}

export interface ExchangeOrder {
  clientOrderId: string;
  orderId: string;
  status: OrderStatus;
  executedQty: number;
  avgPrice: number | null;
  raw?: unknown;
}

export interface ExchangePosition {
  symbol: string;
  market: Market;
  side: Side;
  qty: number;
  entry: number;
}

export interface AccountSnapshot {
  equity: number;
  balance: number;
  available: number;
  marginUsed: number;
  unrealizedPnl: number;
}

import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { FillRecord, OrderRecord, PositionRecord } from "../types.js";

export interface JournalState {
  orders: Record<string, OrderRecord>;
  positions: Record<string, PositionRecord>;
  fills: FillRecord[];
  day: string; // UTC date of dailyPnl
  dayStartEquity: number;
  dailyRealized: number;
  halted: boolean;
  haltReason: string | null;
  config: unknown;
  configVersion: number;
  seq: number;
  paperBalance: number | null;
}

const empty = (): JournalState => ({
  orders: {}, positions: {}, fills: [], day: "", dayStartEquity: 0, dailyRealized: 0,
  halted: false, haltReason: null, config: null, configVersion: 0, seq: 0, paperBalance: null,
});

/** Crash-safe local state (write tmp + atomic rename). Survives restarts. */
export class Journal {
  state: JournalState;
  private file: string;
  constructor(dir: string, name = "state.json") {
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, name);
    this.state = existsSync(this.file) ? { ...empty(), ...JSON.parse(readFileSync(this.file, "utf8")) } : empty();
  }
  save() {
    if (this.state.fills.length > 2000) this.state.fills = this.state.fills.slice(-2000);
    for (const [k, p] of Object.entries(this.state.positions)) {
      if (p.status === "closed" && p.closed_at && Date.now() - Date.parse(p.closed_at) > 7 * 864e5) delete this.state.positions[k];
    }
    const tmp = this.file + ".tmp";
    writeFileSync(tmp, JSON.stringify(this.state));
    renameSync(tmp, this.file);
  }
  /** Monotonic id suffix persisted to disk -> client order ids never repeat across restarts. */
  nextSeq() {
    this.state.seq += 1;
    this.save();
    return this.state.seq;
  }
}

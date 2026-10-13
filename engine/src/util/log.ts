export type Level = "debug" | "info" | "warn" | "error";
export interface LogEvent { level: Level; component: string; message: string; data?: unknown; ts: string }

type Sink = (e: LogEvent) => void;
const sinks: Sink[] = [];
export const addSink = (s: Sink) => sinks.push(s);

const SECRET_KEYS = /(secret|signature|apikey|api_key|token|password|listenkey)/i;
/** Never let credentials reach logs. */
export function redact(v: unknown, depth = 0): unknown {
  if (depth > 5 || v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => redact(x, depth + 1));
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, SECRET_KEYS.test(k) ? "[redacted]" : redact(x, depth + 1)]),
  );
}

function emit(level: Level, component: string, message: string, data?: unknown) {
  const e: LogEvent = { level, component, message, data: redact(data), ts: new Date().toISOString() };
  const line = JSON.stringify(e);
  if (level === "error" || level === "warn") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
  for (const s of sinks) s(e);
}

export const log = (component: string) => ({
  debug: (m: string, d?: unknown) => process.env.LOG_DEBUG === "1" && emit("debug", component, m, d),
  info: (m: string, d?: unknown) => emit("info", component, m, d),
  warn: (m: string, d?: unknown) => emit("warn", component, m, d),
  error: (m: string, d?: unknown) => emit("error", component, m, d),
});

/** Floor a value to an exchange step (avoids float drift). */
export function floorStep(v: number, step: number): number {
  if (step <= 0) return v;
  const p = decimals(step);
  return Number((Math.floor(v / step + 1e-9) * step).toFixed(p));
}
export function roundTick(v: number, tick: number, mode: "down" | "up" | "near" = "near"): number {
  if (tick <= 0) return v;
  const p = decimals(tick);
  const f = mode === "down" ? Math.floor : mode === "up" ? Math.ceil : Math.round;
  return Number((f(v / tick - (mode === "near" ? 0 : 1e-9) * (mode === "up" ? 1 : -1)) * tick).toFixed(p));
}
export function decimals(step: number): number {
  const s = step.toString();
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  return s.includes(".") ? s.split(".")[1]!.replace(/0+$/, "").length : 0;
}
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
export const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);
export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;
  const x = a.slice(-n), y = b.slice(-n);
  const mx = mean(x), my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i]! - mx) * (y[i]! - my);
    dx += (x[i]! - mx) ** 2;
    dy += (y[i]! - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}
export const returns = (closes: number[]) => closes.slice(1).map((c, i) => c / closes[i]! - 1);

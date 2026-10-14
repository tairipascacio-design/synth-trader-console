import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Section } from "@/components/ghost/Stat";
import { configQuery, type BotConfig } from "@/lib/ghost";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — GHOST//SWEEP" },
      { name: "description", content: "Capital, riesgo, apalancamiento, estrategias, temporalidades, filtros y límites." },
      { property: "og:title", content: "Configuración — GHOST//SWEEP" },
      { property: "og:description", content: "Capital, riesgo, apalancamiento, estrategias, temporalidades, filtros y límites." },
    ],
  }),
  component: Config,
});

type Path = string;
function get(o: unknown, p: Path): unknown {
  return p.split(".").reduce<unknown>((a, k) => (a as Record<string, unknown>)?.[k], o);
}
function set<T>(o: T, p: Path, v: unknown): T {
  const c = structuredClone(o) as Record<string, unknown>;
  const ks = p.split(".");
  let cur = c;
  for (const k of ks.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
  cur[ks.at(-1)!] = v;
  return c as T;
}

const NUM_FIELDS: [string, Path, string?][] = [
  ["Capital de referencia (USDT)", "capital.reference"],
  ["Riesgo por operación (%)", "capital.riskPerTradePct"],
  ["Máx. posiciones simultáneas", "capital.maxPositions"],
  ["Apalancamiento (x)", "capital.leverage", "No aumenta el riesgo autorizado: solo reduce el margen usado."],
  ["Beneficio/riesgo mínimo", "capital.minRR"],
  ["Puntuación mínima (0-100)", "capital.minScore"],
  ["Pérdida diaria máx. (%)", "capital.dailyLossPct"],
  ["Slippage máximo (%)", "capital.maxSlippagePct"],
  ["Riesgo agregado máx. (%)", "capital.maxAggregateRiskPct"],
  ["Exposición máx. por activo (%)", "capital.maxExposurePerAssetPct"],
  ["Exposición máx. por dirección (%)", "capital.maxExposurePerDirectionPct"],
  ["Comisión estimada (%)", "capital.feePct"],
];
const FILTER_FIELDS: [string, Path][] = [
  ["Volumen 24h mínimo (USDT)", "filters.minQuoteVolume24h"],
  ["Spread máximo (%)", "filters.maxSpreadPct"],
  ["ATR mínimo (%)", "filters.minAtrPct"],
  ["ATR máximo (%)", "filters.maxAtrPct"],
  ["Máx. activos analizados", "filters.maxSymbols"],
  ["Datos obsoletos tras (ms)", "staleDataMs"],
];
const DETECT_FIELDS: [string, Path][] = [
  ["Pivote (velas a cada lado)", "detection.pivotLookback"],
  ["Ventana de niveles (velas)", "detection.levelLookback"],
  ["Penetración mín. (ATR)", "detection.minPenetrationAtr"],
  ["Penetración máx. (ATR)", "detection.maxPenetrationAtr"],
  ["Mecha mínima (ratio)", "detection.minWickRatio"],
  ["Volumen relativo mín.", "detection.minRelVolume"],
  ["Vol. relativo ruptura", "detection.breakoutRelVolume"],
  ["Cierres fuera para ruptura", "detection.breakoutCloses"],
  ["Periodo ATR", "detection.atrPeriod"],
  ["Velas de confirmación", "detection.confirmBars"],
];
const EXIT_NUM: [string, Path][] = [
  ["Trailing se activa a (R)", "exits.trailingActivateR"],
  ["Distancia trailing (ATR)", "exits.trailingDistanceAtr"],
  ["Cierre parcial en TP1 (%)", "exits.partialTpPct"],
];

function Config() {
  const qc = useQueryClient();
  const { data } = useQuery(configQuery);
  const [cfg, setCfg] = useState<BotConfig | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data?.config) setCfg(data.config as unknown as BotConfig);
  }, [data]);
  if (!cfg) return <p className="text-muted-foreground">Cargando…</p>;

  const num = (label: string, p: Path, hint?: string) => (
    <label key={p} className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type="number"
        step="any"
        className="mt-1 font-mono"
        value={String(get(cfg, p) ?? "")}
        onChange={(e) => setCfg(set(cfg, p, e.target.value === "" ? 0 : Number(e.target.value)))}
      />
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
  const sw = (label: string, p: Path) => (
    <label key={p} className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">{label}</span>
      <Switch checked={!!get(cfg, p)} onCheckedChange={(v) => setCfg(set(cfg, p, v))} />
    </label>
  );

  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("bot_config")
      .update({ config: cfg as never, version: (data?.version ?? 1) + 1, updated_at: new Date().toISOString(), updated_by: u.user?.id ?? null })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configuración guardada. El motor la aplicará en la próxima sincronización.");
    qc.invalidateQueries({ queryKey: ["bot_config"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <span className="font-mono text-xs text-muted-foreground">v{data?.version}</span>
        <Button onClick={save} disabled={saving} className="ml-auto glow-primary font-bold tracking-widest">
          GUARDAR CONFIGURACIÓN
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Estos valores son parámetros iniciales de configuración, no garantías de seguridad ni de rentabilidad.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Modo y mercados">
          <div className="space-y-3 p-4">
            <div className="flex gap-2">
              {(["live"] as const).map((m) => (
                <Button key={m} size="sm" variant={cfg.mode === m ? "default" : "outline"} onClick={() => setCfg({ ...cfg, mode: m })}>
                  Real (Binance en vivo)
                </Button>
              ))}
            </div>
            {cfg.mode === "live" && (
              <p className="text-xs text-destructive">
                El modo real solo se activa si el servidor tiene ENABLE_LIVE_TRADING=true y todas las verificaciones previas son correctas.
              </p>
            )}
            {(["spot", "futures"] as const).map((m) => (
              <label key={m} className="flex items-center justify-between py-1">
                <span className="text-sm">{m === "spot" ? "Spot" : "USDⓈ-M Futures"}</span>
                <Switch
                  checked={cfg.markets.includes(m)}
                  onCheckedChange={(v) => setCfg({ ...cfg, markets: v ? [...new Set([...cfg.markets, m])] : cfg.markets.filter((x) => x !== m) })}
                />
              </label>
            ))}
          </div>
        </Section>
        <Section title="Estrategias">
          <div className="p-4">
            {sw("A · Barrida de mínimos (LONG)", "strategies.A_sweepLow")}
            {sw("B · Barrida de máximos (SHORT)", "strategies.B_sweepHigh")}
            {sw("C · Falsas rupturas", "strategies.C_falseBreakout")}
            {sw("D · Ruptura con continuación", "strategies.D_breakout")}
          </div>
        </Section>
        <Section title="Temporalidades">
          <div className="grid gap-3 p-4">
            {(
              [
                ["Rápida (movimientos)", "fast"],
                ["Estructura operativa", "structure"],
                ["Contexto", "context"],
              ] as const
            ).map(([l, k]) => (
              <label key={k} className="block">
                <span className="text-xs text-muted-foreground">{l}</span>
                <select
                  className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 font-mono text-sm"
                  value={cfg.timeframes[k]}
                  onChange={(e) => setCfg({ ...cfg, timeframes: { ...cfg.timeframes, [k]: e.target.value } })}
                >
                  {["1m", "3m", "5m", "15m", "30m", "1h", "4h"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </label>
            ))}
          </div>
        </Section>
      </div>

      <Section title="Capital y límites de riesgo">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">{NUM_FIELDS.map(([l, p, h]) => num(l, p, h))}</div>
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Filtros de activos">
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {FILTER_FIELDS.map(([l, p]) => num(l, p))}
            <label className="block sm:col-span-2">
              <span className="text-xs text-muted-foreground">Lista negra (separada por comas)</span>
              <Input
                className="mt-1 font-mono"
                value={cfg.filters.blacklist.join(",")}
                onChange={(e) => setCfg({ ...cfg, filters: { ...cfg.filters, blacklist: e.target.value.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean) } })}
              />
            </label>
          </div>
        </Section>
        <Section title="Detección">
          <div className="grid gap-3 p-4 sm:grid-cols-2">{DETECT_FIELDS.map(([l, p]) => num(l, p))}</div>
        </Section>
      </div>
      <Section title="Salidas">
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div>
            {sw("Trailing stop", "exits.trailingEnabled")}
            {sw("Cerrar por invalidación de estructura", "exits.closeOnInvalidation")}
            {sw("Cerrar por señal contraria", "exits.closeOnOppositeSignal")}
          </div>
          {EXIT_NUM.map(([l, p]) => num(l, p))}
        </div>
      </Section>
    </div>
  );
}

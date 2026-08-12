/**
 * Tarjeta de estado actual de un sensor.
 * Muestra valor, unidad, ícono y color según el estado respecto al umbral.
 */

import { Droplets, Sprout, Sun, Thermometer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { evaluarEstado, META_POR_SENSOR, type EstadoLectura } from "@/lib/sensores";
import type { SensorId, Umbral } from "@/types/greensense";

const ICONOS: Record<SensorId, LucideIcon> = {
  humedadSuelo: Sprout,
  temperatura: Thermometer,
  humedadAmbiente: Droplets,
  luz: Sun,
};

/** Clases por estado, todas basadas en tokens del sistema de diseño. */
const ESTILOS: Record<EstadoLectura, { caja: string; chip: string; texto: string }> = {
  ok: {
    caja: "border-ok/30 bg-card",
    chip: "bg-ok/15 text-ok",
    texto: "En rango",
  },
  advertencia: {
    caja: "border-warn/50 bg-warn/10",
    chip: "bg-warn/25 text-warn-foreground",
    texto: "Alerta",
  },
  critico: {
    caja: "border-crit/50 bg-crit/10",
    chip: "bg-crit/20 text-crit",
    texto: "Crítico",
  },
};

interface Props {
  sensor: SensorId;
  valor: number | undefined;
  umbral: Umbral;
}

export function TarjetaSensor({ sensor, valor, umbral }: Props) {
  const meta = META_POR_SENSOR[sensor];
  const Icono = ICONOS[sensor];
  const estado = valor === undefined ? "ok" : evaluarEstado(valor, umbral);
  const estilo = ESTILOS[estado];

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition-colors sm:p-5 ${estilo.caja}`}
      aria-label={meta.etiqueta}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex size-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: `color-mix(in oklab, ${meta.color} 18%, transparent)` }}
          >
            <Icono className="size-5" style={{ color: meta.color }} aria-hidden />
          </span>
          <h3 className="text-sm font-semibold leading-tight text-foreground">{meta.etiqueta}</h3>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${estilo.chip}`}>
          {estilo.texto}
        </span>
      </header>

      <p className="mt-3 font-display text-3xl font-semibold tabular-nums sm:text-4xl">
        {valor === undefined ? "—" : valor.toFixed(meta.decimales)}
        <span className="ml-1 text-base font-medium text-muted-foreground">{meta.unidad}</span>
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
        Rango configurado: {umbral.min}–{umbral.max} {meta.unidad}
      </p>
    </article>
  );
}

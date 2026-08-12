/**
 * Gráfico de líneas del histórico de lecturas (Recharts).
 * La luminosidad usa un eje derecho por su escala (0–2000 lux).
 */

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SENSORES, formatearHora } from "@/lib/sensores";
import type { Lectura, RangoTemporal } from "@/types/greensense";

interface Props {
  lecturas: Lectura[];
  rango: RangoTemporal;
}

export function GraficoLecturas({ lecturas, rango }: Props) {
  // Etiqueta del eje X según el rango: hora para 24h, día+hora para rangos largos.
  const etiquetaX = (iso: string) =>
    rango === "24h"
      ? formatearHora(iso)
      : new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });

  return (
    <div className="h-[300px] w-full sm:h-[380px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={lecturas} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={etiquetaX}
            minTickGap={32}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="izq"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="der"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
          />
          <Tooltip
            labelFormatter={(v) => formatearHora(String(v))}
            contentStyle={{
              backgroundColor: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {SENSORES.map((s) => (
            <Line
              key={s.id}
              yAxisId={s.id === "luz" ? "der" : "izq"}
              type="monotone"
              dataKey={s.id}
              name={`${s.etiqueta} (${s.unidad})`}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

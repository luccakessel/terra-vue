/**
 * Widget de clima externo del invernadero, alimentado por la EMA Center API
 * (Laboratorio Gugler). Muestra el último registro de la estación: temperatura,
 * humedad, luz, viento y lluvia. Se oculta en modo demo (no hay estación).
 */

import { useQuery } from "@tanstack/react-query";
import { CloudRain, MapPin, Sun, Thermometer } from "lucide-react";

import { Cargando, ErrorConexion } from "@/components/EstadoCarga";
import { formatearFecha } from "@/lib/sensores";
import { api } from "@/services/api";
import type { RegistroMeteorologico } from "@/types/greensense";

function Valor({ etiqueta, texto }: { etiqueta: string; texto: string }) {
  return (
    <div className="rounded-xl bg-secondary/60 p-3">
      <dt className="text-xs font-medium text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-1 font-semibold">{texto}</dd>
    </div>
  );
}

export function PanelClima() {
  const consulta = useQuery({
    queryKey: ["contexto-climatico"],
    queryFn: () => api.obtenerContextoClimatico(),
  });

  // Modo demo (USAR_MOCK): no hay estación, el widget no aporta.
  if (consulta.data === null) return null;
  if (consulta.isPending) return <Cargando filas={1} alto="h-64" />;
  if (consulta.error) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5" aria-label="Clima externo">
        <h2 className="font-display text-lg font-semibold">Clima externo · EMA Center</h2>
        <div className="mt-3">
          <ErrorConexion error={consulta.error} onReintentar={consulta.refetch} />
        </div>
      </section>
    );
  }

  const { estacion, registro } = consulta.data!;
  const v: RegistroMeteorologico = registro;

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5"
      aria-label="Clima externo de la estación EMA Center"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Clima externo</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-bold uppercase text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          EMA Center
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {estacion.nombre} · {estacion.ciudad}
      </p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Valor etiqueta="Temperatura externa" texto={`${v.temperaturaExterna.toFixed(1)} °C`} />
        <Valor etiqueta="Humedad externa" texto={`${v.humedadExterna.toFixed(0)} %`} />
        <Valor etiqueta="Radiación lumínica" texto={`${Math.round(v.luz)} lux`} />
        <Valor
          etiqueta="Viento"
          texto={`${v.vientoVelocidad.toFixed(1)} m/s ${v.vientoDireccion || ""}`}
        />
        <Valor etiqueta="Lluvia (hoy)" texto={`${v.lluviaDiaria.toFixed(1)} mm`} />
        <Valor etiqueta="Presión relativa" texto={`${v.presionRelativa.toFixed(0)} hPa`} />
      </dl>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Thermometer className="size-3.5" aria-hidden /> Actualizado: {formatearFecha(v.fecha)}
        {v.lluviaHora > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-crit/15 px-2 py-0.5 text-[11px] font-bold text-crit">
            <CloudRain className="size-3.5" aria-hidden /> Lloviendo
          </span>
        )}
      </p>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Sun className="size-3.5" aria-hidden />
        Estación {estacion.modelo} · datos públicos del Lab. Gugler
      </p>
    </section>
  );
}

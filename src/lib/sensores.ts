/**
 * Metadatos y utilidades de presentación de sensores:
 * etiquetas, unidades, colores y evaluación de estado contra umbrales.
 */

import type { Lectura, SensorId, Umbral } from "@/types/greensense";

export type EstadoLectura = "ok" | "advertencia" | "critico";

export interface MetaSensor {
  id: SensorId;
  etiqueta: string;
  unidad: string;
  /** Variable CSS del color asignado al sensor (para Recharts). */
  color: string;
  decimales: number;
}

export const SENSORES: MetaSensor[] = [
  { id: "humedadSuelo", etiqueta: "Humedad de suelo", unidad: "%", color: "var(--sensor-suelo)", decimales: 1 },
  { id: "temperatura", etiqueta: "Temperatura", unidad: "°C", color: "var(--sensor-temp)", decimales: 1 },
  { id: "humedadAmbiente", etiqueta: "Humedad ambiente", unidad: "%", color: "var(--sensor-ambiente)", decimales: 1 },
  { id: "luz", etiqueta: "Luminosidad", unidad: "lux", color: "var(--sensor-luz)", decimales: 0 },
];

export const META_POR_SENSOR: Record<SensorId, MetaSensor> = SENSORES.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<SensorId, MetaSensor>,
);

/**
 * Evalúa una lectura contra su umbral.
 * - ok: dentro del rango
 * - advertencia: hasta 10% del rango fuera del límite
 * - critico: más allá de ese margen
 */
export function evaluarEstado(valor: number, umbral: Umbral): EstadoLectura {
  if (valor >= umbral.min && valor <= umbral.max) return "ok";
  const margen = Math.max((umbral.max - umbral.min) * 0.1, 0.5);
  const exceso = valor < umbral.min ? umbral.min - valor : valor - umbral.max;
  return exceso <= margen ? "advertencia" : "critico";
}

export function formatearValor(sensor: SensorId, valor: number) {
  const meta = META_POR_SENSOR[sensor];
  return `${valor.toFixed(meta.decimales)} ${meta.unidad}`;
}

export function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatearHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

/** Extrae el valor de un sensor de una lectura completa. */
export function valorDe(lectura: Lectura, sensor: SensorId) {
  return lectura[sensor];
}

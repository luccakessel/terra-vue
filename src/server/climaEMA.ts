/**
 * Función serverless que consulta la EMA Center API (Laboratorio Gugler)
 * desde el servidor (λ de Vercel / dev server). Evita el problema de CORS
 * de leer la API externa desde el navegador y aplica cache de 60 s.
 */

import { createServerFn } from "@tanstack/react-start";

import type { ContextoClimatico } from "../types/greensense";

const EMA_URL = process.env["VITE_EMA_URL"] ?? "https://emacenter.gugler.com.ar/api/station/1/";

const TTL_MS = 60_000;
const TIMEOUT_MS = 8_000;

type CacheEma = { valor: ContextoClimatico; milis: number };

const global = globalThis as typeof globalThis & { __emaCache?: CacheEma };

type RespuestaEma = {
  id_estacion: number;
  nombre?: string;
  modelo?: string;
  ciudad?: string;
  latitud?: string;
  longitud?: string;
  registros?: Array<{
    fecha?: string;
    temperatura_externa?: number | string;
    humedad_externa?: number | string;
    punto_de_rocio?: number | string;
    luxer_intencidad?: number | string;
    luxer_uv?: number | string;
    viento_velocidad?: number | string;
    viento_rafagas?: number | string;
    viento_direccion_nombre?: string;
    presion_relativa?: number | string;
    lluvia_acumulado_hora?: number | string;
    lluvia_acumulado_diario?: number | string;
  }>;
};

function numero(valor: number | string | undefined): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export const climaEma = createServerFn({ method: "POST" }).handler(
  async (): Promise<ContextoClimatico> => {
    const ahora = Date.now();
    const cache = global.__emaCache;
    if (cache && ahora - cache.milis < TTL_MS) {
      return cache.valor;
    }

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    try {
      const respuesta = await fetch(EMA_URL, {
        headers: { Accept: "application/json" },
        signal: controlador.signal,
      });
      if (!respuesta.ok) {
        throw new Error(`La EMA Center API respondió ${respuesta.status}.`);
      }
      const crudo = (await respuesta.json()) as RespuestaEma;
      const r = crudo.registros?.[0];
      if (!r) {
        throw new Error("La EMA Center API no devolvió registros.");
      }

      const contexto: ContextoClimatico = {
        estacion: {
          id: crudo.id_estacion,
          nombre: crudo.nombre ?? "",
          modelo: crudo.modelo ?? "",
          ciudad: crudo.ciudad ?? "",
          latitud: crudo.latitud ?? "",
          longitud: crudo.longitud ?? "",
        },
        registro: {
          fecha: r.fecha ?? "",
          temperaturaExterna: numero(r.temperatura_externa),
          humedadExterna: numero(r.humedad_externa),
          puntoDeRocio: numero(r.punto_de_rocio),
          luz: numero(r.luxer_intencidad),
          uv: numero(r.luxer_uv),
          vientoVelocidad: numero(r.viento_velocidad),
          vientoRafagas: numero(r.viento_rafagas),
          vientoDireccion: r.viento_direccion_nombre ?? "",
          presionRelativa: numero(r.presion_relativa),
          lluviaHora: numero(r.lluvia_acumulado_hora),
          lluviaDiaria: numero(r.lluvia_acumulado_diario),
        },
        obtenidoEn: new Date().toISOString(),
      };

      global.__emaCache = { valor: contexto, milis: ahora };
      return contexto;
    } finally {
      clearTimeout(temporizador);
    }
  },
);

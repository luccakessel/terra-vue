/**
 * Capa única de acceso a la API REST de GreenSense.
 *
 * Todas las llamadas HTTP del frontend pasan por acá. Mientras el backend no
 * esté disponible, `USAR_MOCK` devuelve datos simulados con la misma forma que
 * los endpoints reales, así que cuando el backend esté listo sólo hay que
 * definir VITE_USE_MOCK=false y VITE_API_URL en el .env.
 *
 * Endpoints reales esperados:
 *   GET  /api/invernaderos
 *   GET  /api/invernaderos/:id/lecturas?desde=&hasta=
 *   GET  /api/invernaderos/:id/lecturas/ultima
 *   GET  /api/invernaderos/:id/alertas
 *   POST /api/invernaderos/:id/riego
 *   GET  /api/invernaderos/:id/configuracion
 *   PUT  /api/invernaderos/:id/configuracion
 *   GET  /api/reportes/:tipo?formato=csv|excel
 */

import axios, { type AxiosInstance } from "axios";

import type {
  Alerta,
  Configuracion,
  EstadoRiego,
  FormatoReporte,
  Invernadero,
  Lectura,
  RangoTemporal,
  TipoReporte,
} from "@/types/greensense";
import {
  MOCK_ALERTAS,
  MOCK_INVERNADEROS,
  generarLecturas,
  generarUltimaLectura,
  mockConfiguracion,
  mockEstadoRiego,
} from "./mock";

export const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3000";

/** Con VITE_USE_MOCK=false se consume el backend real. */
export const USAR_MOCK = import.meta.env["VITE_USE_MOCK"] !== "false";

/** Cliente axios compartido. El token se inyecta en memoria (ver setAuthToken). */
export const http: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

let tokenEnMemoria: string | null = null;

/** Guarda el token sólo en memoria (nunca en localStorage). */
export function setAuthToken(token: string | null) {
  tokenEnMemoria = token;
}

http.interceptors.request.use((config) => {
  if (tokenEnMemoria) {
    config.headers.Authorization = `Bearer ${tokenEnMemoria}`;
  }
  return config;
});

/** Normaliza errores de red/servidor a un mensaje legible para la UI. */
export function mensajeDeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") return "El invernadero no respondió en tiempo (timeout).";
    if (!error.response) return "Sin conexión con el servidor. Verificá la red del invernadero.";
    if (error.response.status === 401) return "Sesión expirada. Volvé a iniciar sesión.";
    return (error.response.data as { mensaje?: string })?.mensaje ?? `Error ${error.response.status} del servidor.`;
  }
  return error instanceof Error ? error.message : "Error inesperado.";
}

/** Latencia simulada para poder ver los loading states. */
const demora = (ms = 400) => new Promise((r) => setTimeout(r, ms));

/** Convierte un rango de UI en horas + paso de muestreo. */
export function rangoAHoras(rango: RangoTemporal): { horas: number; pasoMin: number } {
  if (rango === "7d") return { horas: 24 * 7, pasoMin: 60 };
  if (rango === "30d") return { horas: 24 * 30, pasoMin: 180 };
  return { horas: 24, pasoMin: 15 };
}

export const api = {
  /** POST /api/auth/login */
  async login(email: string, password: string): Promise<{ token: string; nombre: string }> {
    if (USAR_MOCK) {
      await demora(600);
      if (!email.includes("@") || password.length < 4) {
        throw new Error("Credenciales inválidas.");
      }
      return { token: "mock-token-greensense", nombre: email.split("@")[0] ?? "Productor" };
    }
    const { data } = await http.post("/auth/login", { email, password });
    return data;
  },

  /** GET /api/invernaderos */
  async listarInvernaderos(): Promise<Invernadero[]> {
    if (USAR_MOCK) {
      await demora();
      return MOCK_INVERNADEROS;
    }
    const { data } = await http.get<Invernadero[]>("/invernaderos");
    return data;
  },

  /** GET /api/invernaderos/:id/lecturas?desde=&hasta= */
  async listarLecturas(invernaderoId: string, rango: RangoTemporal): Promise<Lectura[]> {
    const { horas, pasoMin } = rangoAHoras(rango);
    if (USAR_MOCK) {
      await demora(500);
      return generarLecturas(horas, pasoMin, invernaderoId.length + horas);
    }
    const hasta = new Date().toISOString();
    const desde = new Date(Date.now() - horas * 3_600_000).toISOString();
    const { data } = await http.get<Lectura[]>(`/invernaderos/${invernaderoId}/lecturas`, {
      params: { desde, hasta },
    });
    return data;
  },

  /** GET /api/invernaderos/:id/lecturas/ultima */
  async ultimaLectura(invernaderoId: string): Promise<Lectura> {
    if (USAR_MOCK) {
      await demora(300);
      return generarUltimaLectura(invernaderoId);
    }
    const { data } = await http.get<Lectura>(`/invernaderos/${invernaderoId}/lecturas/ultima`);
    return data;
  },

  /** GET /api/invernaderos/:id/alertas */
  async listarAlertas(invernaderoId: string): Promise<Alerta[]> {
    if (USAR_MOCK) {
      await demora();
      return MOCK_ALERTAS.filter((a) => a.invernaderoId === invernaderoId);
    }
    const { data } = await http.get<Alerta[]>(`/invernaderos/${invernaderoId}/alertas`);
    return data;
  },

  /** GET /api/invernaderos/:id/riego (estado actual del riego) */
  async estadoRiego(invernaderoId: string): Promise<EstadoRiego> {
    if (USAR_MOCK) {
      await demora(300);
      return mockEstadoRiego();
    }
    const { data } = await http.get<EstadoRiego>(`/invernaderos/${invernaderoId}/riego`);
    return data;
  },

  /** POST /api/invernaderos/:id/riego — activar/desactivar riego manual */
  async cambiarRiego(invernaderoId: string, activar: boolean): Promise<EstadoRiego> {
    if (USAR_MOCK) {
      await demora(700);
      const base = mockEstadoRiego();
      return {
        ...base,
        activo: activar,
        ultimoRiego: activar ? new Date().toISOString() : base.ultimoRiego,
      };
    }
    const { data } = await http.post<EstadoRiego>(`/invernaderos/${invernaderoId}/riego`, { activar });
    return data;
  },

  /** GET /api/invernaderos/:id/configuracion */
  async obtenerConfiguracion(invernaderoId: string): Promise<Configuracion> {
    if (USAR_MOCK) {
      await demora();
      return mockConfiguracion(invernaderoId);
    }
    const { data } = await http.get<Configuracion>(`/invernaderos/${invernaderoId}/configuracion`);
    return data;
  },

  /** PUT /api/invernaderos/:id/configuracion */
  async guardarConfiguracion(config: Configuracion): Promise<Configuracion> {
    if (USAR_MOCK) {
      await demora(600);
      return config;
    }
    const { data } = await http.put<Configuracion>(
      `/invernaderos/${config.invernaderoId}/configuracion`,
      config,
    );
    return data;
  },

  /** GET /api/reportes/:tipo?formato= — devuelve la URL de descarga */
  urlReporte(tipo: TipoReporte, formato: FormatoReporte, desde: string, hasta: string): string {
    const params = new URLSearchParams({ formato, desde, hasta });
    return `${API_URL}/api/reportes/${tipo}?${params.toString()}`;
  },
};

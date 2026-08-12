/**
 * Tipos de dominio de GreenSense.
 * Reflejan los contratos que expone el backend REST/WebSocket.
 */

/** Sensores soportados por el sistema. */
export type SensorId = "humedadSuelo" | "temperatura" | "humedadAmbiente" | "luz";

export interface Invernadero {
  id: string;
  nombre: string;
  ubicacion: string;
  cultivo: string;
  /** true si el gateway del invernadero reportó datos recientemente */
  enLinea: boolean;
}

/** Una lectura puntual (un timestamp con los 4 sensores). */
export interface Lectura {
  timestamp: string; // ISO 8601
  humedadSuelo: number; // %
  temperatura: number; // °C
  humedadAmbiente: number; // %
  luz: number; // lux
}

/** Evento emitido por el WebSocket /ws/lecturas */
export interface EventoNuevaLectura {
  invernaderoId: string;
  sensor: SensorId;
  valor: number;
  timestamp: string;
}

export type NivelAlerta = "critica" | "advertencia";

export interface Alerta {
  id: string;
  invernaderoId: string;
  fecha: string; // ISO 8601
  sensor: SensorId;
  nivel: NivelAlerta;
  valor: number;
  umbral: number;
  mensaje: string;
  vista: boolean;
}

/** Umbral mínimo/máximo configurado para un sensor. */
export interface Umbral {
  min: number;
  max: number;
}

export interface HorarioRiego {
  id: string;
  hora: string; // "HH:mm"
  duracionMin: number;
  activo: boolean;
}

export interface Configuracion {
  invernaderoId: string;
  umbrales: Record<SensorId, Umbral>;
  riegoAutomatico: boolean;
  horarios: HorarioRiego[];
}

export interface EstadoRiego {
  activo: boolean;
  ultimoRiego: string | null; // ISO
  proximoRiego: string | null; // ISO
  litrosHoy: number;
}

export type RangoTemporal = "24h" | "7d" | "30d";

export type TipoReporte = "riego" | "consumo" | "alertas";

export type FormatoReporte = "csv" | "excel";

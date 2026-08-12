/**
 * Conexión WebSocket (socket.io) para lecturas en tiempo real.
 *
 * Namespace real: `${VITE_API_URL}/ws/lecturas`, evento `nueva_lectura`.
 * Con VITE_USE_MOCK activo se simula el stream con un intervalo local, así el
 * dashboard se ve "vivo" sin backend.
 */

import { io, type Socket } from "socket.io-client";

import type { EventoNuevaLectura, SensorId } from "@/types/greensense";
import { API_URL, USAR_MOCK } from "./api";
import { generarUltimaLectura } from "./mock";

export type ManejadorLectura = (evento: EventoNuevaLectura) => void;

export interface SuscripcionLecturas {
  /** Corta la suscripción y libera el socket/intervalo. */
  cerrar: () => void;
}

const SENSORES: SensorId[] = ["humedadSuelo", "temperatura", "humedadAmbiente", "luz"];

/**
 * Suscribe a las lecturas en vivo de un invernadero.
 * @param onEstado callback de estado de conexión (para mostrar "sin conexión")
 */
export function suscribirLecturas(
  invernaderoId: string,
  onLectura: ManejadorLectura,
  onEstado?: (conectado: boolean) => void,
): SuscripcionLecturas {
  if (USAR_MOCK) {
    onEstado?.(true);
    // Emite las 4 variables cada 5 segundos con una variación suave.
    const intervalo = setInterval(() => {
      const lectura = generarUltimaLectura(invernaderoId);
      const timestamp = new Date().toISOString();
      SENSORES.forEach((sensor) => {
        const base = lectura[sensor];
        const jitter = sensor === "luz" ? 25 : 0.6;
        onLectura({
          invernaderoId,
          sensor,
          valor: +(base + (Math.random() - 0.5) * jitter).toFixed(1),
          timestamp,
        });
      });
    }, 5000);

    return {
      cerrar: () => {
        clearInterval(intervalo);
        onEstado?.(false);
      },
    };
  }

  const socket: Socket = io(`${API_URL}/ws/lecturas`, {
    transports: ["websocket"],
    query: { invernaderoId },
  });

  socket.on("connect", () => onEstado?.(true));
  socket.on("disconnect", () => onEstado?.(false));
  socket.on("connect_error", () => onEstado?.(false));
  socket.on("nueva_lectura", (evento: EventoNuevaLectura) => {
    if (evento.invernaderoId === invernaderoId) onLectura(evento);
  });

  return {
    cerrar: () => {
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}

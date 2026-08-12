/**
 * Hook que combina el histórico REST con el stream de WebSocket.
 *
 * 1. Trae el histórico del rango elegido (React Query).
 * 2. Se suscribe a `nueva_lectura` y va agregando puntos al final de la serie.
 * 3. Expone el estado de la conexión en vivo para avisar cortes.
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { api } from "@/services/api";
import { suscribirLecturas } from "@/services/socket";
import type { Lectura, RangoTemporal, SensorId } from "@/types/greensense";

/** Cantidad máxima de puntos en memoria para no degradar el gráfico. */
const MAX_PUNTOS = 400;

export function useLecturasEnVivo(invernaderoId: string | undefined, rango: RangoTemporal) {
  const consulta = useQuery({
    queryKey: ["lecturas", invernaderoId, rango],
    queryFn: () => api.listarLecturas(invernaderoId!, rango),
    enabled: Boolean(invernaderoId),
  });

  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [enVivo, setEnVivo] = useState(false);
  // Buffer para juntar los 4 sensores de un mismo timestamp en una sola lectura.
  const buffer = useRef<Partial<Record<SensorId, number>>>({});

  // Cada vez que llega histórico nuevo, reemplaza la serie.
  useEffect(() => {
    if (consulta.data) setLecturas(consulta.data);
  }, [consulta.data]);

  useEffect(() => {
    if (!invernaderoId || rango !== "24h") return; // el vivo sólo aplica al rango corto
    const sub = suscribirLecturas(
      invernaderoId,
      (evento) => {
        buffer.current[evento.sensor] = evento.valor;
        const b = buffer.current;
        // Sólo agrego el punto cuando tengo las 4 variables.
        if (
          b.humedadSuelo !== undefined &&
          b.temperatura !== undefined &&
          b.humedadAmbiente !== undefined &&
          b.luz !== undefined
        ) {
          const punto: Lectura = {
            timestamp: evento.timestamp,
            humedadSuelo: b.humedadSuelo,
            temperatura: b.temperatura,
            humedadAmbiente: b.humedadAmbiente,
            luz: b.luz,
          };
          buffer.current = {};
          setLecturas((prev) => [...prev, punto].slice(-MAX_PUNTOS));
        }
      },
      setEnVivo,
    );
    return () => sub.cerrar();
  }, [invernaderoId, rango]);

  const ultima = lecturas.length > 0 ? lecturas[lecturas.length - 1] : undefined;

  return {
    lecturas,
    ultima,
    enVivo,
    cargando: consulta.isPending,
    error: consulta.error,
    recargar: consulta.refetch,
  };
}

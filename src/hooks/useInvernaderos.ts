/**
 * Lista de invernaderos del usuario + selección activa persistida en memoria.
 */

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "@/services/api";

export function useInvernaderos() {
  const consulta = useQuery({ queryKey: ["invernaderos"], queryFn: api.listarInvernaderos });
  const [seleccionado, setSeleccionado] = useState<string | undefined>();

  // Selecciona el primero en cuanto llega la lista.
  useEffect(() => {
    if (!seleccionado && consulta.data?.length) setSeleccionado(consulta.data[0]!.id);
  }, [consulta.data, seleccionado]);

  const activo = consulta.data?.find((i) => i.id === seleccionado);

  return {
    invernaderos: consulta.data ?? [],
    activo,
    seleccionado,
    setSeleccionado,
    cargando: consulta.isPending,
    error: consulta.error,
  };
}

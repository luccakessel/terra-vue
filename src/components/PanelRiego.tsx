/**
 * Panel de estado del riego: activo/inactivo, último y próximo riego,
 * y control manual (POST /api/invernaderos/:id/riego).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplet, History, Timer } from "lucide-react";
import { toast } from "sonner";

import { Cargando, ErrorConexion } from "@/components/EstadoCarga";
import { Button } from "@/components/ui/button";
import { formatearFecha } from "@/lib/sensores";
import { api, mensajeDeError } from "@/services/api";

export function PanelRiego({ invernaderoId }: { invernaderoId: string }) {
  const queryClient = useQueryClient();
  const clave = ["riego", invernaderoId];

  const consulta = useQuery({ queryKey: clave, queryFn: () => api.estadoRiego(invernaderoId) });

  const mutacion = useMutation({
    mutationFn: (activar: boolean) => api.cambiarRiego(invernaderoId, activar),
    onSuccess: (estado) => {
      queryClient.setQueryData(clave, estado);
      toast.success(estado.activo ? "Riego manual activado" : "Riego manual detenido");
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  if (consulta.isPending) return <Cargando filas={1} alto="h-44" />;
  if (consulta.error) return <ErrorConexion error={consulta.error} onReintentar={consulta.refetch} />;

  const estado = consulta.data!;

  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-label="Estado del riego">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Riego</h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
            estado.activo ? "bg-ok/15 text-ok" : "bg-muted text-muted-foreground"
          }`}
        >
          <Droplet className="size-3.5" aria-hidden />
          {estado.activo ? "Regando" : "Detenido"}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-secondary/60 p-3">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <History className="size-3.5" aria-hidden /> Último riego
          </dt>
          <dd className="mt-1 font-semibold">
            {estado.ultimoRiego ? formatearFecha(estado.ultimoRiego) : "Sin registro"}
          </dd>
        </div>
        <div className="rounded-xl bg-secondary/60 p-3">
          <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Timer className="size-3.5" aria-hidden /> Próximo programado
          </dt>
          <dd className="mt-1 font-semibold">
            {estado.proximoRiego ? formatearFecha(estado.proximoRiego) : "Sin programar"}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-muted-foreground">
        Consumo estimado de hoy: <strong className="text-foreground">{estado.litrosHoy} L</strong>
      </p>

      <Button
        className="mt-4 w-full"
        variant={estado.activo ? "destructive" : "default"}
        disabled={mutacion.isPending}
        onClick={() => mutacion.mutate(!estado.activo)}
      >
        {mutacion.isPending
          ? "Enviando orden…"
          : estado.activo
            ? "Detener riego manual"
            : "Activar riego manual"}
      </Button>
    </section>
  );
}

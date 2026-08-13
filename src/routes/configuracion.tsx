/**
 * Configuración del invernadero: umbrales por sensor, riego automático
 * y horarios programados. Guarda con PUT /api/invernaderos/:id/configuracion.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Cargando, ErrorConexion } from "@/components/EstadoCarga";
import { SelectorInvernadero } from "@/components/SelectorInvernadero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useInvernaderos } from "@/hooks/useInvernaderos";
import { SENSORES } from "@/lib/sensores";
import { api, mensajeDeError } from "@/services/api";
import type { Configuracion, HorarioRiego } from "@/types/greensense";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración · GreenSense" },
      {
        name: "description",
        content:
          "Definí umbrales mínimos y máximos por sensor, activá el riego automático y programá horarios de riego.",
      },
      { property: "og:title", content: "Configuración · GreenSense" },
      {
        property: "og:description",
        content: "Umbrales por sensor, riego automático y horarios programados.",
      },
    ],
  }),
  component: ConfiguracionPage,
});

function ConfiguracionPage() {
  const { invernaderos, seleccionado, setSeleccionado, cargando, error } = useInvernaderos();

  const consulta = useQuery({
    queryKey: ["configuracion", seleccionado],
    queryFn: () => api.obtenerConfiguracion(seleccionado!),
    enabled: Boolean(seleccionado),
  });

  return (
    <AppShell titulo="Configuración">
      {cargando ? (
        <Cargando filas={2} />
      ) : error ? (
        <ErrorConexion error={error} />
      ) : (
        <div className="grid gap-5">
          <SelectorInvernadero
            invernaderos={invernaderos}
            seleccionado={seleccionado}
            onCambio={setSeleccionado}
          />

          {consulta.isPending ? (
            <Cargando filas={2} alto="h-40" />
          ) : consulta.error ? (
            <ErrorConexion error={consulta.error} onReintentar={consulta.refetch} />
          ) : (
            // key: al cambiar de invernadero se reinicia el formulario con sus datos.
            <Formulario key={consulta.data!.invernaderoId} inicial={consulta.data!} />
          )}
        </div>
      )}
    </AppShell>
  );
}

function Formulario({ inicial }: { inicial: Configuracion }) {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<Configuracion>(inicial);

  // Sincroniza si el servidor devuelve datos nuevos para el mismo invernadero.
  useEffect(() => setConfig(inicial), [inicial]);

  const mutacion = useMutation({
    mutationFn: (valores: Configuracion) => api.guardarConfiguracion(valores),
    onSuccess: (guardada) => {
      queryClient.setQueryData(["configuracion", guardada.invernaderoId], guardada);
      toast.success("Configuración guardada");
    },
    onError: (e) => toast.error(mensajeDeError(e)),
  });

  function actualizarUmbral(sensor: keyof Configuracion["umbrales"], campo: "min" | "max", valor: number) {
    setConfig((prev) => ({
      ...prev,
      umbrales: { ...prev.umbrales, [sensor]: { ...prev.umbrales[sensor], [campo]: valor } },
    }));
  }

  function actualizarHorario(id: string, cambios: Partial<HorarioRiego>) {
    setConfig((prev) => ({
      ...prev,
      horarios: prev.horarios.map((h) => (h.id === id ? { ...h, ...cambios } : h)),
    }));
  }

  function agregarHorario() {
    setConfig((prev) => ({
      ...prev,
      horarios: [
        ...prev.horarios,
        { id: `h-${Date.now()}`, hora: "08:00", duracionMin: 10, activo: true },
      ],
    }));
  }

  function quitarHorario(id: string) {
    setConfig((prev) => ({ ...prev, horarios: prev.horarios.filter((h) => h.id !== id) }));
  }

  // Validación simple: el mínimo nunca puede superar al máximo.
  const invalido = SENSORES.some((s) => config.umbrales[s.id].min >= config.umbrales[s.id].max);

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (invalido) {
          toast.error("Revisá los umbrales: el mínimo debe ser menor al máximo.");
          return;
        }
        mutacion.mutate(config);
      }}
    >
      <section className="rounded-2xl border border-border bg-card p-5" aria-label="Umbrales por sensor">
        <h2 className="font-display text-lg font-semibold">Umbrales de alerta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando una lectura sale de este rango, GreenSense genera una alerta.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {SENSORES.map((s) => {
            const u = config.umbrales[s.id];
            const malo = u.min >= u.max;
            return (
              <div key={s.id} className="rounded-xl bg-secondary/50 p-4">
                <p className="text-sm font-semibold">
                  {s.etiqueta} <span className="text-muted-foreground">({s.unidad})</span>
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`${s.id}-min`}>Mínimo</Label>
                    <Input
                      id={`${s.id}-min`}
                      type="number"
                      value={u.min}
                      aria-invalid={malo}
                      onChange={(e) => actualizarUmbral(s.id, "min", Number(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`${s.id}-max`}>Máximo</Label>
                    <Input
                      id={`${s.id}-max`}
                      type="number"
                      value={u.max}
                      aria-invalid={malo}
                      onChange={(e) => actualizarUmbral(s.id, "max", Number(e.target.value))}
                    />
                  </div>
                </div>
                {malo && (
                  <p className="mt-2 text-xs font-medium text-destructive">
                    El mínimo debe ser menor al máximo.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5" aria-label="Riego">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Riego automático</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Si está activo, el sistema riega según los horarios y los umbrales de humedad.
            </p>
          </div>
          <Switch
            checked={config.riegoAutomatico}
            aria-label="Riego automático"
            onCheckedChange={(v) => setConfig((prev) => ({ ...prev, riegoAutomatico: v }))}
          />
        </div>

        <div className="mt-5 grid gap-3">
          <h3 className="text-sm font-semibold">Horarios programados</h3>
          {config.horarios.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no hay horarios configurados.</p>
          )}
          {config.horarios.map((h) => (
            <div key={h.id} className="flex flex-wrap items-end gap-3 rounded-xl bg-secondary/50 p-3">
              <div className="grid gap-1.5">
                <Label htmlFor={`${h.id}-hora`}>Hora</Label>
                <Input
                  id={`${h.id}-hora`}
                  type="time"
                  className="w-32"
                  value={h.hora}
                  onChange={(e) => actualizarHorario(h.id, { hora: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${h.id}-dur`}>Duración (min)</Label>
                <Input
                  id={`${h.id}-dur`}
                  type="number"
                  min={1}
                  className="w-28"
                  value={h.duracionMin}
                  onChange={(e) => actualizarHorario(h.id, { duracionMin: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={h.activo}
                  aria-label={`Horario ${h.hora} activo`}
                  onCheckedChange={(v) => actualizarHorario(h.id, { activo: v })}
                />
                <span className="text-sm text-muted-foreground">{h.activo ? "Activo" : "Pausado"}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto"
                aria-label={`Quitar horario ${h.hora}`}
                onClick={() => quitarHorario(h.id)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={agregarHorario}>
            <Plus className="size-4" aria-hidden /> Agregar horario
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={mutacion.isPending || invalido}>
          {mutacion.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setConfig(inicial)}>
          Descartar cambios
        </Button>
      </div>
    </form>
  );
}

/**
 * Alertas: historial completo con filtros por nivel y por sensor.
 */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Cargando, ErrorConexion, SinDatos } from "@/components/EstadoCarga";
import { SelectorInvernadero } from "@/components/SelectorInvernadero";
import { TablaAlertas } from "@/components/TablaAlertas";
import { Button } from "@/components/ui/button";
import { useInvernaderos } from "@/hooks/useInvernaderos";
import { SENSORES } from "@/lib/sensores";
import { api } from "@/services/api";
import type { NivelAlerta, SensorId } from "@/types/greensense";

export const Route = createFileRoute("/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas · GreenSense" },
      {
        name: "description",
        content:
          "Historial de alertas críticas y advertencias por sensor de cada invernadero, con filtros por nivel.",
      },
      { property: "og:title", content: "Alertas · GreenSense" },
      { property: "og:description", content: "Historial de alertas por sensor e invernadero." },
    ],
  }),
  component: Alertas,
});

type FiltroNivel = "todas" | NivelAlerta;
type FiltroSensor = "todos" | SensorId;

function Alertas() {
  const { invernaderos, seleccionado, setSeleccionado, cargando, error } = useInvernaderos();
  const [nivel, setNivel] = useState<FiltroNivel>("todas");
  const [sensor, setSensor] = useState<FiltroSensor>("todos");

  const consulta = useQuery({
    queryKey: ["alertas", seleccionado],
    queryFn: () => api.listarAlertas(seleccionado!),
    enabled: Boolean(seleccionado),
  });

  const filtradas = useMemo(
    () =>
      (consulta.data ?? []).filter(
        (a) => (nivel === "todas" || a.nivel === nivel) && (sensor === "todos" || a.sensor === sensor),
      ),
    [consulta.data, nivel, sensor],
  );

  return (
    <AppShell titulo="Alertas">
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

          <div className="grid gap-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por nivel">
              {(["todas", "critica", "advertencia"] as FiltroNivel[]).map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={nivel === n ? "default" : "outline"}
                  onClick={() => setNivel(n)}
                >
                  {n === "todas" ? "Todas" : n === "critica" ? "Críticas" : "Advertencias"}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por sensor">
              <Button
                size="sm"
                variant={sensor === "todos" ? "secondary" : "ghost"}
                onClick={() => setSensor("todos")}
              >
                Todos los sensores
              </Button>
              {SENSORES.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant={sensor === s.id ? "secondary" : "ghost"}
                  onClick={() => setSensor(s.id)}
                >
                  {s.etiqueta}
                </Button>
              ))}
            </div>
          </div>

          {consulta.isPending ? (
            <Cargando filas={1} alto="h-64" />
          ) : consulta.error ? (
            <ErrorConexion error={consulta.error} onReintentar={consulta.refetch} />
          ) : filtradas.length === 0 ? (
            <SinDatos mensaje="No hay alertas que coincidan con los filtros elegidos." />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {filtradas.length} alerta{filtradas.length === 1 ? "" : "s"} encontrada
                {filtradas.length === 1 ? "" : "s"}.
              </p>
              <TablaAlertas alertas={filtradas} />
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

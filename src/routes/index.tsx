/**
 * Dashboard principal: estado actual de los 4 sensores, gráfico histórico,
 * panel de riego y últimas alertas del invernadero seleccionado.
 */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Cargando, ErrorConexion, SinDatos } from "@/components/EstadoCarga";
import { GraficoLecturas } from "@/components/GraficoLecturas";
import { PanelRiego } from "@/components/PanelRiego";
import { SelectorInvernadero } from "@/components/SelectorInvernadero";
import { TablaAlertas } from "@/components/TablaAlertas";
import { TarjetaSensor } from "@/components/TarjetaSensor";
import { Button } from "@/components/ui/button";
import { useInvernaderos } from "@/hooks/useInvernaderos";
import { useLecturasEnVivo } from "@/hooks/useLecturasEnVivo";
import { SENSORES } from "@/lib/sensores";
import { api } from "@/services/api";
import type { RangoTemporal } from "@/types/greensense";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · GreenSense — Monitoreo de invernaderos" },
      {
        name: "description",
        content:
          "Panel en tiempo real de humedad de suelo, temperatura, humedad ambiente y luminosidad de tus invernaderos.",
      },
      { property: "og:title", content: "Dashboard · GreenSense" },
      {
        property: "og:description",
        content: "Monitoreo y control inteligente de invernaderos en tiempo real.",
      },
    ],
  }),
  component: Dashboard,
});

const RANGOS: { valor: RangoTemporal; etiqueta: string }[] = [
  { valor: "24h", etiqueta: "24 horas" },
  { valor: "7d", etiqueta: "7 días" },
  { valor: "30d", etiqueta: "30 días" },
];

function Dashboard() {
  const { invernaderos, seleccionado, setSeleccionado, cargando, error } = useInvernaderos();
  const [rango, setRango] = useState<RangoTemporal>("24h");
  const lecturas = useLecturasEnVivo(seleccionado, rango);

  // Umbrales configurados: definen el color de cada tarjeta de sensor.
  const config = useQuery({
    queryKey: ["configuracion", seleccionado],
    queryFn: () => api.obtenerConfiguracion(seleccionado!),
    enabled: Boolean(seleccionado),
  });

  const alertas = useQuery({
    queryKey: ["alertas", seleccionado],
    queryFn: () => api.listarAlertas(seleccionado!),
    enabled: Boolean(seleccionado),
  });

  return (
    <AppShell titulo="Dashboard">
      {cargando ? (
        <Cargando filas={2} />
      ) : error ? (
        <ErrorConexion error={error} />
      ) : (
        <div className="grid gap-6">
          <SelectorInvernadero
            invernaderos={invernaderos}
            seleccionado={seleccionado}
            onCambio={setSeleccionado}
            enVivo={rango === "24h" ? lecturas.enVivo : undefined}
          />

          {/* Tarjetas de estado actual */}
          <section aria-label="Estado actual de sensores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SENSORES.map((s) => (
              <TarjetaSensor
                key={s.id}
                sensor={s.id}
                valor={lecturas.ultima?.[s.id]}
                umbral={config.data?.umbrales[s.id] ?? { min: 0, max: 100 }}
              />
            ))}
          </section>

          {/* Histórico */}
          <section className="rounded-2xl border border-border bg-card p-5" aria-label="Histórico de lecturas">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-lg font-semibold">Evolución de las variables</h2>
              <div className="flex gap-1.5" role="group" aria-label="Rango temporal">
                {RANGOS.map((r) => (
                  <Button
                    key={r.valor}
                    size="sm"
                    variant={rango === r.valor ? "default" : "outline"}
                    onClick={() => setRango(r.valor)}
                  >
                    {r.etiqueta}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              {lecturas.cargando ? (
                <Cargando filas={1} alto="h-[300px]" />
              ) : lecturas.error ? (
                <ErrorConexion error={lecturas.error} onReintentar={lecturas.recargar} />
              ) : lecturas.lecturas.length === 0 ? (
                <SinDatos mensaje="No hay lecturas registradas en este rango." />
              ) : (
                <GraficoLecturas lecturas={lecturas.lecturas} rango={rango} />
              )}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            {/* Últimas alertas */}
            <section aria-label="Últimas alertas">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">Últimas alertas</h2>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/alertas">Ver todas</Link>
                </Button>
              </div>
              <div className="mt-3">
                {alertas.isPending ? (
                  <Cargando filas={1} alto="h-40" />
                ) : alertas.error ? (
                  <ErrorConexion error={alertas.error} onReintentar={alertas.refetch} />
                ) : alertas.data!.length === 0 ? (
                  <SinDatos mensaje="Sin alertas registradas. Todo en rango." />
                ) : (
                  <TablaAlertas alertas={alertas.data!.slice(0, 4)} />
                )}
              </div>
            </section>

            {seleccionado && <PanelRiego invernaderoId={seleccionado} />}
          </div>
        </div>
      )}
    </AppShell>
  );
}

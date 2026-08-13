/**
 * Reportes: elección de tipo, rango de fechas y formato (CSV / Excel).
 * La descarga apunta a GET /api/reportes/:tipo?formato=&desde=&hasta=
 */

import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Cargando, ErrorConexion } from "@/components/EstadoCarga";
import { SelectorInvernadero } from "@/components/SelectorInvernadero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvernaderos } from "@/hooks/useInvernaderos";
import { USAR_MOCK, api } from "@/services/api";
import type { FormatoReporte, TipoReporte } from "@/types/greensense";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes · GreenSense" },
      {
        name: "description",
        content:
          "Exportá reportes de riego, consumo de agua y alertas de tus invernaderos en formato CSV o Excel.",
      },
      { property: "og:title", content: "Reportes · GreenSense" },
      { property: "og:description", content: "Exportación de riego, consumo y alertas en CSV o Excel." },
    ],
  }),
  component: Reportes,
});

const TIPOS: { valor: TipoReporte; etiqueta: string; detalle: string }[] = [
  { valor: "riego", etiqueta: "Historial de riego", detalle: "Activaciones manuales y automáticas." },
  { valor: "consumo", etiqueta: "Consumo de agua", detalle: "Litros por día y por invernadero." },
  { valor: "alertas", etiqueta: "Alertas", detalle: "Eventos fuera de umbral con su nivel." },
];

/** Fecha de hoy y de hace N días en formato YYYY-MM-DD (para inputs date). */
function fechaISO(diasAtras = 0) {
  return new Date(Date.now() - diasAtras * 86_400_000).toISOString().slice(0, 10);
}

function Reportes() {
  const { invernaderos, seleccionado, setSeleccionado, cargando, error } = useInvernaderos();
  const [tipo, setTipo] = useState<TipoReporte>("riego");
  const [formato, setFormato] = useState<FormatoReporte>("csv");
  const [desde, setDesde] = useState(fechaISO(7));
  const [hasta, setHasta] = useState(fechaISO());

  function descargar() {
    if (desde > hasta) {
      toast.error("La fecha 'desde' no puede ser posterior a 'hasta'.");
      return;
    }
    const url = api.urlReporte(tipo, formato, desde, hasta);
    if (USAR_MOCK) {
      // Sin backend no hay archivo: se informa el endpoint que se llamaría.
      toast.info("Modo demo: el backend generará el archivo.", { description: url });
      return;
    }
    window.open(url, "_blank", "noopener");
  }

  return (
    <AppShell titulo="Reportes">
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

          <section className="grid gap-4 sm:grid-cols-3" aria-label="Tipo de reporte">
            {TIPOS.map((t) => {
              const activo = tipo === t.valor;
              return (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => setTipo(t.valor)}
                  aria-pressed={activo}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    activo ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/50"
                  }`}
                >
                  <p className="font-display text-base font-semibold">{t.etiqueta}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.detalle}</p>
                </button>
              );
            })}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5" aria-label="Parámetros del reporte">
            <h2 className="font-display text-lg font-semibold">Parámetros</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="desde">Desde</Label>
                <Input id="desde" type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hasta">Hasta</Label>
                <Input
                  id="hasta"
                  type="date"
                  value={hasta}
                  min={desde}
                  max={fechaISO()}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <span className="text-sm font-medium">Formato</span>
              <div className="flex gap-2" role="group" aria-label="Formato de exportación">
                <Button
                  type="button"
                  variant={formato === "csv" ? "default" : "outline"}
                  onClick={() => setFormato("csv")}
                >
                  <FileText className="size-4" aria-hidden /> CSV
                </Button>
                <Button
                  type="button"
                  variant={formato === "excel" ? "default" : "outline"}
                  onClick={() => setFormato("excel")}
                >
                  <FileSpreadsheet className="size-4" aria-hidden /> Excel
                </Button>
              </div>
            </div>

            <Button className="mt-5" onClick={descargar}>
              <Download className="size-4" aria-hidden /> Descargar reporte
            </Button>
          </section>
        </div>
      )}
    </AppShell>
  );
}

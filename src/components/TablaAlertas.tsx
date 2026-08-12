/** Tabla reutilizable de alertas (usada en Alertas y en el resumen del dashboard). */

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { META_POR_SENSOR, formatearFecha, formatearValor } from "@/lib/sensores";
import type { Alerta } from "@/types/greensense";

export function TablaAlertas({ alertas }: { alertas: Alerta[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Sensor</TableHead>
            <TableHead>Nivel</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Umbral</TableHead>
            <TableHead className="min-w-[220px]">Detalle</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alertas.map((a) => (
            <TableRow key={a.id} className={a.vista ? undefined : "bg-warn/5"}>
              <TableCell className="whitespace-nowrap text-sm">{formatearFecha(a.fecha)}</TableCell>
              <TableCell className="text-sm font-medium">{META_POR_SENSOR[a.sensor].etiqueta}</TableCell>
              <TableCell>
                <Badge
                  className={
                    a.nivel === "critica"
                      ? "bg-crit/15 text-crit hover:bg-crit/15"
                      : "bg-warn/25 text-warn-foreground hover:bg-warn/25"
                  }
                >
                  {a.nivel === "critica" ? "Crítica" : "Advertencia"}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatearValor(a.sensor, a.valor)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatearValor(a.sensor, a.umbral)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{a.mensaje}</TableCell>
              <TableCell className="text-sm">
                {a.vista ? (
                  <span className="text-muted-foreground">Vista</span>
                ) : (
                  <span className="font-semibold text-warn-foreground">Sin ver</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

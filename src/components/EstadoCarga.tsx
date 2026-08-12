/** Bloques reutilizables de carga y error de conexión. */

import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { mensajeDeError } from "@/services/api";

export function Cargando({ filas = 3, alto = "h-24" }: { filas?: number; alto?: string }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Cargando datos">
      {Array.from({ length: filas }).map((_, i) => (
        <Skeleton key={i} className={`w-full ${alto} rounded-xl`} />
      ))}
    </div>
  );
}

export function ErrorConexion({ error, onReintentar }: { error: unknown; onReintentar?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
      <WifiOff className="size-7 text-destructive" aria-hidden />
      <div>
        <p className="font-semibold text-foreground">No se pudo comunicar con el invernadero</p>
        <p className="mt-1 text-sm text-muted-foreground">{mensajeDeError(error)}</p>
      </div>
      {onReintentar && (
        <Button variant="outline" size="sm" onClick={onReintentar}>
          <RefreshCw className="size-4" aria-hidden /> Reintentar
        </Button>
      )}
    </div>
  );
}

export function SinDatos({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">
      <AlertTriangle className="size-4" aria-hidden />
      {mensaje}
    </div>
  );
}

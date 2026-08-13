/** Selector de invernadero + indicador de conexión del gateway. */

import { MapPin, Wifi, WifiOff } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Invernadero } from "@/types/greensense";

interface Props {
  invernaderos: Invernadero[];
  seleccionado: string | undefined;
  onCambio: (id: string) => void;
  /** Estado del stream en vivo (WebSocket). */
  enVivo?: boolean;
}

export function SelectorInvernadero({ invernaderos, seleccionado, onCambio, enVivo }: Props) {
  const activo = invernaderos.find((i) => i.id === seleccionado);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {invernaderos.length > 1 && (
        <Select value={seleccionado ?? ""} onValueChange={onCambio}>
          <SelectTrigger className="w-full sm:w-64" aria-label="Invernadero">
            <SelectValue placeholder="Elegí un invernadero" />
          </SelectTrigger>
          <SelectContent>
            {invernaderos.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {activo && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden />
          {activo.ubicacion} · {activo.cultivo}
        </p>
      )}

      {enVivo !== undefined && (
        <span
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            enVivo ? "bg-ok/15 text-ok" : "bg-crit/15 text-crit"
          }`}
        >
          {enVivo ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
          {enVivo ? "En vivo" : "Sin conexión en vivo"}
        </span>
      )}
    </div>
  );
}

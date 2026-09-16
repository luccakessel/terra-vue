/**
 * Widget de chat flotante (abajo a la derecha): botón de apertura
 * y panel de conversación con historial y envío de mensajes.
 */

import { useState, type FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Mensaje {
  id: number;
  texto: string;
  propio: boolean;
}

const mensajesIniciales: Mensaje[] = [
  {
    id: 1,
    texto: "¡Hola! Soy el asistente de GreenSense. ¿En qué puedo ayudarte?",
    propio: false,
  },
];

export function ChatWidget() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>(mensajesIniciales);
  const [borrador, setBorrador] = useState("");

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const texto = borrador.trim();
    if (!texto) return;

    setMensajes((previos) => [
      ...previos,
      { id: Date.now(), texto, propio: true },
    ]);
    setBorrador("");
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {abierto && (
        <section
          className="flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
          aria-label="Chat de asistencia"
        >
          <header className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-primary" aria-hidden />
              <h2 className="font-display text-sm font-semibold">Asistente GreenSense</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar chat"
            >
              <X className="size-4" aria-hidden />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {mensajes.map((mensaje) => (
              <div
                key={mensaje.id}
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  mensaje.propio
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-secondary/60 text-foreground",
                )}
              >
                {mensaje.texto}
              </div>
            ))}
          </div>

          <form
            onSubmit={enviar}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <Input
              value={borrador}
              onChange={(evento) => setBorrador(evento.target.value)}
              placeholder="Escribí tu consulta…"
              aria-label="Mensaje"
            />
            <Button type="submit" size="icon" className="size-9" aria-label="Enviar mensaje">
              <Send className="size-4" aria-hidden />
            </Button>
          </form>
        </section>
      )}

      <Button
        onClick={() => setAbierto((estado) => !estado)}
        className="size-14 rounded-full shadow-lg"
        aria-label={abierto ? "Cerrar chat" : "Abrir chat"}
      >
        {abierto ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
      </Button>
    </div>
  );
}
/**
 * Widget de chat flotante (abajo a la derecha): botón de apertura,
 * panel con historial, preguntas rápidas y respuestas del asistente.
 * Las respuestas las genera la IA (Groq, server fn) con la base de
 * conocimiento de GreenSense como contexto; ante fallos usa el matcher
 * local como respaldo.
 */

import { useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, X } from "lucide-react";

import { responderChatIA, type MensajeChat } from "@/server/chatIA";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface Mensaje {
  id: number;
  texto: string;
  propio: boolean;
}

interface TemaConocimiento {
  id: string;
  /** Palabras clave que activan la respuesta. */
  claves: string[];
  /** Botón de pregunta rápida asociado al tema. */
  pregunta: string;
  respuesta: string;
}

/* Base de conocimiento contextual de GreenSense. */
const BASE_DE_CONOCIMIENTO: TemaConocimiento[] = [
  {
    id: "invernaderos",
    claves: [
      "invernadero",
      "invernaderos",
      "cuantos",
      "cuantos puedo",
      "cantidad",
      "limite",
      "registrar",
      "agregar invernadero",
    ],
    pregunta: "¿Cuántos invernaderos puedo tener?",
    respuesta:
      "GreenSense permite monitorear y administrar múltiples invernaderos desde el mismo panel. El contrato de datos y el simulador actual soportan 3 invernaderos de ejemplo (Norte, Vivero Almácigos y Sur), y podés alternar entre ellos con el selector del panel superior.",
  },
  {
    id: "alertas",
    claves: [
      "alerta",
      "alertas",
      "configurar alertas",
      "configuracion de alertas",
      "umbral",
      "umbrales",
      "meterse en",
      "niveles de alerta",
    ],
    pregunta: "¿Cómo configuro las alertas?",
    respuesta:
      "Las alertas se configuran en la sección Configuración, definiendo un umbral mínimo y máximo por sensor. Cuando una lectura sale del rango, GreenSense genera una alerta de advertencia si está hasta ~10% fuera del límite, o crítica si supera ese margen. El historial se consulta en la sección Alertas.",
  },
  {
    id: "rangos",
    claves: [
      "rango",
      "rangos",
      "ideal",
      "rango ideal",
      "temperatura",
      "humedad",
      "optimo",
      "optimo para",
      "cuanto debe",
      "valores recomendados",
    ],
    pregunta: "Rangos ideales de temperatura y humedad",
    respuesta:
      "Los rangos de referencia por defecto de GreenSense son:\n• Temperatura ambiente: 15 °C a 32 °C\n• Humedad de suelo: 25% a 65%\n• Humedad ambiente: 45% a 90%\n• Luminosidad: 400 a 1.800 lux\nPodés ajustarlos por invernadero en Configuración, siempre que el mínimo sea menor al máximo.",
  },
  {
    id: "sistema",
    claves: [
      "estado del sistema",
      "estado",
      "sistema",
      "funcionando",
      "en linea",
      "en línea",
      "conexion",
      "websocket",
      "tiempo real",
    ],
    pregunta: "Estado general del sistema",
    respuesta:
      "GreenSense está compuesto por un backend PHP (REST), un relay de WebSocket (socket.io) para lecturas en tiempo real y el panel web. Cada invernadero muestra un indicador en línea/desconectado según su gateway, y los sensores se marcan en verde (OK), ámbar (advertencia) o rojo (crítico) según los umbrales configurados.",
  },
  {
    id: "riego",
    claves: ["riego", "regar", "automatico", "automatizado", "horario", "programar riego"],
    pregunta: "¿Cómo funciona el riego?",
    respuesta:
      "Podés activar el riego automático en Configuración: el sistema riega según los horarios programados y los umbrales de humedad de suelo. Desde el panel también podés iniciar o detener manualmente el riego, y el panel muestra el último y próximo riego junto con el consumo estimado del día.",
  },
];

const preguntasRapidas = BASE_DE_CONOCIMIENTO.map((tema) => tema.pregunta);

const saludo: Mensaje = {
  id: 1,
  texto: "¡Hola! Soy el asistente de GreenSense. Elegí una pregunta rápida o escribí tu consulta.",
  propio: false,
};

/** Normaliza texto: minúsculas y sin tildes para el match de intenciones. */
function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Busca el tema de la base de conocimiento que coincida con la consulta. */
function temaParaConsulta(consulta: string): TemaConocimiento | undefined {
  const buscado = normalizar(consulta);
  let mejor: TemaConocimiento | undefined;
  let mejorPuntaje = 0;

  for (const tema of BASE_DE_CONOCIMIENTO) {
    const puntaje = tema.claves.reduce(
      (acumulador, clave) =>
        acumulador + (buscado.includes(normalizar(clave)) ? clave.split(" ").length : 0),
      0,
    );
    if (puntaje > mejorPuntaje) {
      mejor = tema;
      mejorPuntaje = puntaje;
    }
  }

  return mejor && mejorPuntaje > 0 ? mejor : undefined;
}

const respuestaGenerica =
  "Todavía no tengo información sobre ese tema. Podés consultarme sobre la cantidad de invernaderos, la configuración de alertas, los rangos ideales de temperatura y humedad, el riego, o el estado general del sistema.";

export function ChatWidget() {
  const { autenticado } = useAuth();

  const identidad = useRef(1);
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([saludo]);
  const [preguntasVisibles, setPreguntasVisibles] = useState(true);
  const [borrador, setBorrador] = useState("");

  function nuevoMensaje(texto: string, propio: boolean): Mensaje {
    identidad.current += 1;
    return { id: identidad.current, texto, propio };
  }

  /** Respuesta de respaldo cuando la IA no está disponible. */
  function fallback(consulta: string): string {
    const tema = temaParaConsulta(consulta);
    return tema ? tema.respuesta : respuestaGenerica;
  }

  function reemplazarPendiente(id: number, texto: string) {
    setMensajes((previos) =>
      previos.map((mensaje) => (mensaje.id === id ? { ...mensaje, texto } : mensaje)),
    );
  }

  function responder(consulta: string) {
    const historial: MensajeChat[] = mensajes
      .filter((mensaje) => mensaje.id !== saludo.id)
      .map((mensaje) => ({
        rol: mensaje.propio ? "usuario" : "asistente",
        contenido: mensaje.texto,
      }));

    const usuario = nuevoMensaje(consulta, true);
    const pendiente = nuevoMensaje("Escribiendo…", false);
    setMensajes((previos) => [...previos, usuario, pendiente]);
    setPreguntasVisibles(false);

    void responderChatIA({ data: { pregunta: consulta, historial } })
      .then((resultado) => {
        const texto =
          resultado.ok && resultado.respuesta ? resultado.respuesta : fallback(consulta);
        reemplazarPendiente(pendiente.id, texto);
      })
      .catch(() => reemplazarPendiente(pendiente.id, fallback(consulta)));
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const texto = borrador.trim();
    if (!texto) return;

    responder(texto);
    setBorrador("");
  }

  // Solo disponible dentro del sistema, tras iniciar sesión.
  if (!autenticado) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {abierto && (
        <section
          className="flex h-[30rem] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
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
            {preguntasVisibles && (
              <div className="space-y-2">
                {preguntasRapidas.map((pregunta) => (
                  <Button
                    key={pregunta}
                    variant="outline"
                    size="sm"
                    className="h-auto justify-start whitespace-normal rounded-xl px-3 py-2 text-left text-xs leading-snug"
                    onClick={() => responder(pregunta)}
                  >
                    {pregunta}
                  </Button>
                ))}
              </div>
            )}

            {mensajes.map((mensaje) => (
              <div key={mensaje.id} className={cn("space-y-2", mensaje.propio && "ml-auto")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    mensaje.propio
                      ? "ml-auto whitespace-pre-line bg-primary text-primary-foreground"
                      : "whitespace-pre-line bg-secondary/60 text-foreground",
                  )}
                >
                  {mensaje.texto}
                </div>
                {!mensaje.propio && !preguntasVisibles && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto rounded-full px-3 py-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:bg-secondary/50 hover:text-foreground hover:underline"
                    onClick={() => setPreguntasVisibles(true)}
                  >
                    ¿Seguís teniendo dudas? Volver a las preguntas rápidas
                  </Button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={enviar} className="flex items-center gap-2 border-t border-border p-3">
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
        {abierto ? (
          <X className="size-6" aria-hidden />
        ) : (
          <MessageCircle className="size-6" aria-hidden />
        )}
      </Button>
    </div>
  );
}

/**
 * Función serverless que responde las consultas del chat con el modelo
 * openai/gpt-oss-120b (Groq). La clave GROQ_API_KEY se lee solo en el servidor
 * (λ de Vercel / dev server) y nunca se expone al navegador. Si falta la clave
 * o la API falla, devuelve ok:false para que el widget use su respaldo local.
 */

import { createServerFn } from "@tanstack/react-start";

export type MensajeChat = { rol: "usuario" | "asistente"; contenido: string };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = process.env["GROQ_MODELO"] ?? "openai/gpt-oss-120b";
const TIMEOUT_MS = 25_000;
const MAX_TOKENS = 1_024;

const REGLAS = [
  "Sos el asistente de GreenSense, un sistema de monitoreo de invernaderos.",
  "Respondé SIEMPRE en español, de forma clara, amable y concisa, con listas si corresponde.",
  "Respondé únicamente sobre GreenSense o los temas de la base de conocimiento. Si la consulta no tiene relación, decí que solo podés ayudar con GreenSense.",
].join("\n");

const BASE_DE_CONOCIMIENTO = [
  {
    tema: "Invernaderos",
    detalle:
      "GreenSense permite monitorear y administrar múltiples invernaderos desde el mismo panel. El simulador actual soporta 3 invernaderos de ejemplo (Norte, Vivero Almácigos y Sur), y se alterna entre ellos con el selector del panel superior.",
  },
  {
    tema: "Alertas",
    detalle:
      "Las alertas se configuran en Configuración con un umbral mínimo y máximo por sensor. Si una lectura sale del rango se genera una alerta de advertencia (hasta ~10% fuera del límite) o crítica (por encima de ese margen). El historial se consulta en la sección Alertas.",
  },
  {
    tema: "Rangos ideales",
    detalle:
      "Rangos por defecto de GreenSense: temperatura ambiente 15 a 32 °C; humedad de suelo 25% a 65%; humedad ambiente 45% a 90%; luminosidad 400 a 1.800 lux. Son ajustables por invernadero en Configuración (mínimo siempre menor al máximo).",
  },
  {
    tema: "Estado del sistema",
    detalle:
      "GreenSense combina un backend PHP (REST), un relay WebSocket para lecturas en tiempo real y el panel web. Cada invernadero muestra el estado en línea/desconectado de su gateway, y los sensores se marcan verde (OK), ámbar (advertencia) o rojo (crítico) según los umbrales.",
  },
  {
    tema: "Riego",
    detalle:
      "El riego puede activarse de forma automática en Configuración según horarios y umbrales de humedad de suelo, o manualmente desde el panel. Se muestra el último y próximo riego junto al consumo estimado del día.",
  },
  {
    tema: "Clima externo",
    detalle:
      "El widget Clima externo consulta la estación meteorológica Aramburu_Centro de la EMA Center API (Paraná, Entre Ríos) y muestra temperatura, humedad, viento, lluvia y presión del entorno, tanto en modo demo (función serverless) como con el backend PHP.",
  },
]
  .map((tema) => `- ${tema.tema}: ${tema.detalle}`)
  .join("\n");

const SISTEMA = [REGLAS, "Base de conocimiento:", BASE_DE_CONOCIMIENTO].join("\n\n");

export type RespuestaChat = { ok: boolean; respuesta: string };

export const responderChatIA = createServerFn({ method: "POST", strict: false })
  .validator((dato: unknown) => dato as { pregunta: string; historial: MensajeChat[] })
  .handler(async ({ data }): Promise<RespuestaChat> => {
    const clave = process.env["GROQ_API_KEY"];
    if (!clave) {
      return { ok: false, respuesta: "" };
    }

    const ultimos = [...data.historial].slice(-8).map((mensaje) => ({
      role: mensaje.rol === "usuario" ? "user" : "assistant",
      content: mensaje.contenido,
    }));

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS);
    try {
      const respuesta = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clave}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODELO,
          messages: [
            { role: "system", content: SISTEMA },
            ...ultimos,
            { role: "user", content: data.pregunta },
          ],
          temperature: 0.5,
          max_tokens: MAX_TOKENS,
        }),
        signal: controlador.signal,
      });

      if (!respuesta.ok) {
        return { ok: false, respuesta: "" };
      }

      const crudo = (await respuesta.json()) as {
        choices?: Array<{
          message?: { content?: string | null; reasoning?: string | null };
        }>;
      };
      const mensaje = crudo.choices?.[0]?.message;
      const contenido = (mensaje?.content ?? mensaje?.reasoning ?? "").trim();

      return { ok: true, respuesta: contenido || "" };
    } catch {
      return { ok: false, respuesta: "" };
    } finally {
      clearTimeout(temporizador);
    }
  });

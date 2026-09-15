/**
 * Relay WebSocket (Engine.IO v4 + Socket.IO minimal) para GreenSense.
 *
 * El frontend usa socket.io-client y espera el namespace /ws/lecturas con el
 * evento "nueva_lectura". Este relay implementa lo mínimo del protocolo:
 *  1. Handshake: 0{sid,upgrades,pingInterval,...}
 *  2. Connect del namespace: 40/ws/lecturas,{sid}
 *  3. Heartbeat: el servidor envía 2 (ping) y el cliente responde 3 (pong)
 *  4. Eventos: 42/ws/lecturas,["nueva_lectura",{...}]
 *
 * Las lecturas se simulan con el mismo patrón día/noche del mock del frontend.
 * Ejecutar:  node backend/relay/socket-relay.js
 */

import { WebSocketServer, WebSocket } from "ws";

const PUERTO = Number(process.env.VITE_WS_PORT ?? 3001);
const INTERVALO_PING = 25000;
const TIEMPO_ALTA = 20000;
const EMITIR_CADA_MS = 5000;

const DEBUG = process.env.DEBUG === "1";

const log = (msg) => DEBUG && console.log(`[relay ${new Date().toISOString()}]`, msg);

// --- Simulación día/noche (misma base que el mock del frontend) -------------

function ruido(semilla) {
  const x = Math.sin(semilla * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function factorSolar(horaDecimal) {
  const amanecer = 6;
  const atardecer = 20;
  if (horaDecimal < amanecer || horaDecimal > atardecer) return 0;
  const t = (horaDecimal - amanecer) / (atardecer - amanecer);
  return Math.sin(Math.PI * t);
}

function lecturaPara(invernaderoId, semillaBase) {
  const ahora = new Date();
  const horaDecimal = ahora.getHours() + ahora.getMinutes() / 60;
  const sol = factorSolar(horaDecimal);
  const s = semillaBase;

  const luz = +(sol * 1900 + ruido(s) * 90).toFixed(1);
  const solR = factorSolar(Math.max(0, horaDecimal - 2));
  const temperatura = +(16 + solR * 16 + ruido(s + 7) * 1.6).toFixed(1);
  const humedadAmbiente = +(88 - solR * 42 + ruido(s + 13) * 4).toFixed(1);
  const humedadSuelo = +(58 - horaDecimal * 1.2 + ruido(s + 21) * 4).toFixed(1);

  return { humedadSuelo, temperatura, humedadAmbiente, luz, timestamp: ahora.toISOString() };
}

// --- Servidor ----------------------------------------------------------------

const wss = new WebSocketServer({ port: PUERTO }, () => {
  console.log(`GreenSense relay WebSocket escuchando en el puerto ${PUERTO}`);
});

/** Mapa socket => datos de contexto (namespace y temporizadores). */
const contexto = new Map();

wss.on("connection", (ws, req) => {
  const consulta = (req.url ?? "").split("?")[1] ?? "";
  const sid = () => Math.random().toString(16).slice(2, 18);

  const datos = {
    eioSid: sid(),
    namespace: null,
    pingEnviado: 0,
    temporizadorPing: null,
    invernaderoId: new URLSearchParams(consulta).get("invernaderoId") ?? "1",
  };
  contexto.set(ws, datos);

  // 1. Engine.IO "open"
  const abrir = `0${JSON.stringify({
    sid: datos.eioSid,
    upgrades: [],
    pingInterval: INTERVALO_PING,
    pingTimeout: TIEMPO_ALTA,
    maxPayload: 1000000,
  })}`;
  ws.send(abrir);
  log(`open enviado (sid=${datos.eioSid})`);

  // Heartbeat: Engine.IO v4 -> el SÍrvuelo envía 2 (ping), espera 3 (pong).
  datos.temporizadorPing = setInterval(() => {
    if (Date.now() - datos.pingEnviado > TIEMPO_ALTA) {
      ws.terminate();
      return;
    }
    datos.pingEnviado = Date.now();
    ws.send("2");
  }, INTERVALO_PING);

  ws.on("message", (buffer) => {
    const paquete = buffer.toString("utf8");
    procesarPaquete(ws, datos, paquete);
  });

  ws.on("close", () => {
    clearInterval(datos.temporizadorPing);
    contexto.delete(ws);
  });

  ws.on("error", () => {
    clearInterval(datos.temporizadorPing);
    contexto.delete(ws);
  });
});

function procesarPaquete(ws, datos, paquete) {
  const tipo = paquete[0];
  const cuerpo = paquete.slice(1);

  switch (tipo) {
    // Mensaje Socket.IO: 4<SIO_TYPE><namespace>[,payload]
    case "4": {
      const tipoSio = cuerpo[0];
      if (tipoSio === "0") {
        // CONNECT: 40/lecturas  (sin coma cuando no hay payload de auth)
        datos.namespace = cuerpo.split(",")[0].slice(1) || "";
        const sioSid = Math.random().toString(16).slice(2, 18);
        ws.send(`40${datos.namespace},{"sid":"${sioSid}"}`);
        log(`socket.io conectado en namespace "${datos.namespace}"`);
      } else if (tipoSio === "1") {
        // DISCONNECT del namespace; se mantiene la conexión engine.
        log("disconnect de namespace");
      }
      break;
    }
    // PONG del cliente
    case "3":
      datos.pingEnviado = 0;
      break;
    // PING del cliente (algunos clientes lo envían): responder PONG
    case "2":
      ws.send("3");
      break;
    default:
      log(`paquete ignorado: t=${tipo}`);
  }
}

// --- Emisión periódica de lecturas simuladas ---------------------------------

const SEMILLAS = { 1: 3, 2: 9, 3: 15 };

setInterval(() => {
  for (const [ws, datos] of contexto) {
    if (!datos.namespace) continue;

    const lectura = lecturaPara(datos.invernaderoId, SEMILLAS[datos.invernaderoId] ?? 3);

    for (const sensor of ["humedadSuelo", "temperatura", "humedadAmbiente", "luz"]) {
      const evento = {
        invernaderoId: datos.invernaderoId,
        sensor,
        valor: lectura[sensor],
        timestamp: lectura.timestamp,
      };
      ws.send(`42${datos.namespace},["nueva_lectura",${JSON.stringify(evento)}]`);
    }
  }
}, EMITIR_CADA_MS);

// Evita que el proceso muera por errores no capturados.
process.on("uncaughtException", (err) => console.error("[relay] error:", err.message));

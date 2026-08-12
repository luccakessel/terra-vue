/**
 * Datos de ejemplo (mock) para desarrollar el frontend sin backend.
 *
 * Las curvas siguen un patrón día/noche realista:
 *  - Luz: campana entre ~6:00 y ~20:00 (0 de noche, pico ~1900 lux al mediodía).
 *  - Temperatura: sigue la luz con retardo (mínimo de madrugada, máximo ~16:00).
 *  - Humedad ambiente: inversa a la temperatura.
 *  - Humedad de suelo: decae lentamente y sube de golpe en cada riego.
 *
 * Cuando el backend esté listo basta con poner VITE_USE_MOCK=false.
 */

import type {
  Alerta,
  Configuracion,
  EstadoRiego,
  Invernadero,
  Lectura,
  SensorId,
} from "@/types/greensense";

export const MOCK_INVERNADEROS: Invernadero[] = [
  {
    id: "inv-1",
    nombre: "Invernadero Norte",
    ubicacion: "Lote 3 — Luján, BA",
    cultivo: "Tomate cherry",
    enLinea: true,
  },
  {
    id: "inv-2",
    nombre: "Vivero Almácigos",
    ubicacion: "Lote 1 — Luján, BA",
    cultivo: "Plantines varios",
    enLinea: true,
  },
  {
    id: "inv-3",
    nombre: "Invernadero Sur",
    ubicacion: "Lote 7 — Mercedes, BA",
    cultivo: "Lechuga hidropónica",
    enLinea: false,
  },
];

/** Pseudo-random determinístico para que los datos no "salten" en cada render. */
function ruido(semilla: number) {
  const x = Math.sin(semilla * 12.9898) * 43758.5453;
  return x - Math.floor(x); // [0,1)
}

/** Factor de luz solar [0..1] según la hora decimal del día. */
function factorSolar(horaDecimal: number) {
  const amanecer = 6;
  const atardecer = 20;
  if (horaDecimal < amanecer || horaDecimal > atardecer) return 0;
  const t = (horaDecimal - amanecer) / (atardecer - amanecer);
  return Math.sin(Math.PI * t);
}

/**
 * Genera un histórico de lecturas.
 * @param horas cantidad de horas hacia atrás
 * @param pasoMin intervalo entre lecturas en minutos
 * @param semillaBase desplaza las curvas por invernadero
 */
export function generarLecturas(horas: number, pasoMin = 15, semillaBase = 1): Lectura[] {
  const puntos = Math.floor((horas * 60) / pasoMin);
  const ahora = Date.now();
  const lecturas: Lectura[] = [];

  // Humedad de suelo arranca alta y se va secando entre riegos.
  let suelo = 58;

  for (let i = puntos; i >= 0; i--) {
    const fecha = new Date(ahora - i * pasoMin * 60_000);
    const horaDecimal = fecha.getHours() + fecha.getMinutes() / 60;
    const sol = factorSolar(horaDecimal);
    const s = semillaBase + i;

    const luz = Math.round(sol * 1900 + ruido(s) * 90);

    // La temperatura sigue al sol con ~2h de retardo.
    const solRetardado = factorSolar(Math.max(0, horaDecimal - 2));
    const temperatura = +(16 + solRetardado * 16 + ruido(s + 7) * 1.6).toFixed(1);

    // Humedad ambiente: inversa a la temperatura.
    const humedadAmbiente = +(88 - solRetardado * 42 + ruido(s + 13) * 4).toFixed(1);

    // Riego automático a las 7:00 y 19:00 → salto de humedad de suelo.
    const esRiego = (horaDecimal >= 7 && horaDecimal < 7.5) || (horaDecimal >= 19 && horaDecimal < 19.5);
    suelo = esRiego ? Math.min(68, suelo + 6) : Math.max(21, suelo - (0.35 + sol * 0.55));
    const humedadSuelo = +(suelo + ruido(s + 21) * 1.2).toFixed(1);

    lecturas.push({
      timestamp: fecha.toISOString(),
      humedadSuelo,
      temperatura,
      humedadAmbiente,
      luz,
    });
  }

  return lecturas;
}

export function generarUltimaLectura(invernaderoId: string): Lectura {
  const semilla = invernaderoId.charCodeAt(invernaderoId.length - 1);
  const lecturas = generarLecturas(2, 15, semilla);
  return lecturas[lecturas.length - 1];
}

const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

export const MOCK_ALERTAS: Alerta[] = [
  {
    id: "al-1",
    invernaderoId: "inv-1",
    fecha: horasAtras(2),
    sensor: "humedadSuelo",
    nivel: "critica",
    valor: 18.4,
    umbral: 25,
    mensaje: "Humedad de suelo por debajo del mínimo crítico. Riego de emergencia sugerido.",
    vista: false,
  },
  {
    id: "al-2",
    invernaderoId: "inv-1",
    fecha: horasAtras(9),
    sensor: "temperatura",
    nivel: "advertencia",
    valor: 33.6,
    umbral: 32,
    mensaje: "Temperatura sobre el máximo configurado durante 40 minutos.",
    vista: true,
  },
  {
    id: "al-3",
    invernaderoId: "inv-2",
    fecha: horasAtras(26),
    sensor: "humedadAmbiente",
    nivel: "advertencia",
    valor: 92.1,
    umbral: 90,
    mensaje: "Humedad ambiente elevada: riesgo de hongos en almácigos.",
    vista: true,
  },
  {
    id: "al-4",
    invernaderoId: "inv-3",
    fecha: horasAtras(38),
    sensor: "luz",
    nivel: "critica",
    valor: 120,
    umbral: 400,
    mensaje: "Luminosidad insuficiente al mediodía. Verificar sombreado o sensor.",
    vista: false,
  },
];

export const MOCK_UMBRALES: Record<SensorId, { min: number; max: number }> = {
  humedadSuelo: { min: 25, max: 65 },
  temperatura: { min: 15, max: 32 },
  humedadAmbiente: { min: 45, max: 90 },
  luz: { min: 400, max: 1800 },
};

export function mockConfiguracion(invernaderoId: string): Configuracion {
  return {
    invernaderoId,
    umbrales: structuredClone(MOCK_UMBRALES),
    riegoAutomatico: true,
    horarios: [
      { id: "h-1", hora: "07:00", duracionMin: 20, activo: true },
      { id: "h-2", hora: "19:00", duracionMin: 15, activo: true },
    ],
  };
}

export function mockEstadoRiego(): EstadoRiego {
  return {
    activo: false,
    ultimoRiego: horasAtras(5),
    proximoRiego: new Date(Date.now() + 3 * 3_600_000).toISOString(),
    litrosHoy: 84,
  };
}

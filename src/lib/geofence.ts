import type { EstadoViaje } from "@/types";

/** El viaje inicia al salir de este origen, no al entrar en su radio. */
export const ORIGEN_PIMOT = { lat: 15.640187, lng: -88.546492 } as const;

/** @deprecated Usa ORIGEN_PIMOT. */
export const GEOFENCE_DEFAULT_ORIGIN = ORIGEN_PIMOT;

export const GEOFENCE_FALLBACK = {
  radio_inicio_m: 500,
  radio_llegada_m: 500,
  radio_salida_m: 650,
  radio_retorno_m: 500,
  lecturas_para_inicio: 2,
  lecturas_para_salida: 2,
  velocidad_max_plausible_kmh: 160,
  tolerancia_ruido_m: 50,
  max_descartes_consecutivos: 3,
} as const;

/** @deprecated Los parámetros ahora provienen de GEOFENCE_FALLBACK. */
export const GEOFENCE_CONFIG = {
  radioInicioM: GEOFENCE_FALLBACK.radio_inicio_m,
  radioLlegadaM: GEOFENCE_FALLBACK.radio_llegada_m,
  radioSalidaM: GEOFENCE_FALLBACK.radio_salida_m,
  radioRetornoM: GEOFENCE_FALLBACK.radio_retorno_m,
  lecturasParaInicio: GEOFENCE_FALLBACK.lecturas_para_inicio,
  lecturasParaSalida: GEOFENCE_FALLBACK.lecturas_para_salida,
};

export const ESTADOS_ACTIVOS = [
  "programado",
  "en_transito",
  "en_destino",
  "de_vuelta",
] as const;

export const VENTANA_PROGRAMADO_ANTES_H = 4;
export const SEGMENTO_MAX_DT_S = 180;
export const PROGRESO_MIN_FRACCION = 0.5;
export const RUTA_MIN_PARA_PROGRESO_M = 3000;

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface ParametrosGeofence {
  radioInicioM: number;
  radioLlegadaM: number;
  radioSalidaM: number;
  radioRetornoM: number;
  lecturasParaInicio: number;
  lecturasParaSalida: number;
  toleranciaRuidoM: number;
}

export interface EvaluarGeofenceInput {
  estado: (typeof ESTADOS_ACTIVOS)[number];
  actual: Coordenada;
  origen?: Coordenada | null;
  previa: Coordenada | null;
  dtSegundos: number | null;
  destino: Coordenada | null;
  params: ParametrosGeofence;
  lecturasInicioConfirm: number;
  lecturasFueraDestino: number;
  enOrigenVisto: boolean;
  maxDistOrigenM: number;
}

export type MotivoGeofence =
  | "llegada_sin_origen"
  | "llegada_destino"
  | "salida_origen"
  | "salida_origen_inferida"
  | "confirmando_salida"
  | "en_origen"
  | "esperando_origen"
  | "retorno_sin_destino"
  | "retorno_sin_salida"
  | "salida_destino"
  | "confirmando_salida_destino"
  | "en_destino"
  | "en_transito"
  | "esperando_origen"
  | "de_vuelta"
  | "sin_destino"
  | "retorno_origen";

export interface ResultadoGeofence {
  objetivo: EstadoViaje | null;
  motivo: MotivoGeofence;
  lecturasInicioConfirm: number;
  lecturasFueraDestino: number;
  enOrigenVisto: boolean;
  maxDistOrigenM: number;
  distanciaOrigenPuntoM: number;
  distanciaOrigenEvidenciaM: number;
  distanciaDestinoPuntoM: number | null;
  distanciaDestinoEvidenciaM: number | null;
}

const RADIO_TIERRA_M = 6_371_000;

export function haversineMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function distanciaMinimaSegmentoM(
  a: Coordenada,
  b: Coordenada,
  centro: Coordenada,
): number {
  const lat0 = (centro.lat * Math.PI) / 180;
  const vector = (p: Coordenada) => ({
    x: (((p.lng - centro.lng) * Math.PI) / 180) * Math.cos(lat0) * RADIO_TIERRA_M,
    y: ((p.lat - centro.lat) * Math.PI) / 180 * RADIO_TIERRA_M,
  });
  const A = vector(a);
  const B = vector(b);
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const longitudCuadrada = dx * dx + dy * dy;
  if (longitudCuadrada < 1e-12) return Math.hypot(A.x, A.y);
  const t = Math.max(0, Math.min(1, -(A.x * dx + A.y * dy) / longitudCuadrada));
  return Math.hypot(A.x + t * dx, A.y + t * dy);
}

export function evaluarGeofencePuro(
  input: EvaluarGeofenceInput,
): ResultadoGeofence {
  const {
    estado,
    actual,
    origen = ORIGEN_PIMOT,
    previa,
    dtSegundos,
    destino,
    params,
    lecturasInicioConfirm,
    lecturasFueraDestino,
    enOrigenVisto,
    maxDistOrigenM,
  } = input;
  const origenEfectivo = origen ?? ORIGEN_PIMOT;
  const distanciaOrigenPuntoM = haversineMetros(
    actual.lat,
    actual.lng,
    origenEfectivo.lat,
    origenEfectivo.lng,
  );
  const usarSegmento =
    previa !== null &&
    dtSegundos !== null &&
    dtSegundos > 0 &&
    dtSegundos <= SEGMENTO_MAX_DT_S;
  const distanciaOrigenEvidenciaM = usarSegmento
    ? Math.min(
        distanciaOrigenPuntoM,
        distanciaMinimaSegmentoM(previa, actual, origenEfectivo),
      )
    : distanciaOrigenPuntoM;
  const distanciaDestinoPuntoM = destino
    ? haversineMetros(actual.lat, actual.lng, destino.lat, destino.lng)
    : null;
  const distanciaDestinoEvidenciaM = destino
    ? usarSegmento
      ? Math.min(
          distanciaDestinoPuntoM!,
          distanciaMinimaSegmentoM(previa, actual, destino),
        )
      : distanciaDestinoPuntoM
    : null;

  const enOrigen = distanciaOrigenEvidenciaM <= params.radioInicioM;
  const fueraOrigen =
    distanciaOrigenPuntoM > params.radioInicioM + params.toleranciaRuidoM;
  const enRetorno = distanciaOrigenEvidenciaM <= params.radioRetornoM;
  const enDestino =
    distanciaDestinoEvidenciaM !== null &&
    distanciaDestinoEvidenciaM <= params.radioLlegadaM;
  const fueraDestino =
    distanciaDestinoPuntoM !== null &&
    distanciaDestinoPuntoM > params.radioSalidaM;
  const rutaM = destino
    ? haversineMetros(
        origenEfectivo.lat,
        origenEfectivo.lng,
        destino.lat,
        destino.lng,
      )
    : 0;
  const maxDist = Math.max(maxDistOrigenM, distanciaOrigenPuntoM);
  const progreso =
    rutaM >= RUTA_MIN_PARA_PROGRESO_M &&
    maxDist >= PROGRESO_MIN_FRACCION * rutaM;
  // El máximo persistido funciona como evidencia de recuperación cuando una
  // lectura del origen se perdió, pero lecturas GPS aceptadas ya demuestran
  // que la unidad salió de su radio. La confirmación de salida evita iniciar
  // por una única lectura aislada.
  const salidaInferida = estado === "programado" &&
    !enOrigenVisto &&
    !enOrigen &&
    maxDistOrigenM > params.radioInicioM + params.toleranciaRuidoM;
  const armado = enOrigenVisto || enOrigen || salidaInferida;
  const resultadoBase = {
    lecturasInicioConfirm,
    lecturasFueraDestino,
    enOrigenVisto: enOrigenVisto || enOrigen,
    maxDistOrigenM: maxDist,
    distanciaOrigenPuntoM,
    distanciaOrigenEvidenciaM,
    distanciaDestinoPuntoM,
    distanciaDestinoEvidenciaM,
  };
  const nada = (motivo: MotivoGeofence, extra: Partial<ResultadoGeofence> = {}) => ({
    ...resultadoBase,
    objetivo: null,
    motivo,
    ...extra,
  });

  switch (estado) {
    case "programado":
      if (enDestino) {
        return {
          ...resultadoBase,
          objetivo: "en_destino",
          motivo: armado ? "llegada_destino" : "llegada_sin_origen",
        };
      }
      if (armado && fueraOrigen) {
        const contador = lecturasInicioConfirm + 1;
        if (contador >= params.lecturasParaInicio) {
          return {
            ...resultadoBase,
            objetivo: "en_transito",
            motivo: salidaInferida ? "salida_origen_inferida" : "salida_origen",
            lecturasInicioConfirm: contador,
          };
        }
        return nada(destino ? "confirmando_salida" : "sin_destino", {
          lecturasInicioConfirm: contador,
        });
      }
      if (armado) return nada("en_origen", { lecturasInicioConfirm: 0 });
      return nada(destino ? "esperando_origen" : "sin_destino");
    case "en_transito":
      if (enRetorno && progreso) {
        return { ...resultadoBase, objetivo: "finalizado", motivo: "retorno_sin_destino" };
      }
      if (enDestino) {
        return { ...resultadoBase, objetivo: "en_destino", motivo: "llegada_destino" };
      }
      return nada(destino ? "en_transito" : "sin_destino");
    case "en_destino":
      if (enRetorno && progreso) {
        return { ...resultadoBase, objetivo: "finalizado", motivo: "retorno_sin_salida" };
      }
      if (fueraDestino) {
        const contador = lecturasFueraDestino + 1;
        if (contador >= params.lecturasParaSalida) {
          return {
            ...resultadoBase,
            objetivo: "de_vuelta",
            motivo: "salida_destino",
            lecturasFueraDestino: contador,
          };
        }
        return nada("confirmando_salida_destino", {
          lecturasFueraDestino: contador,
        });
      }
      return nada("en_destino", { lecturasFueraDestino: 0 });
    case "de_vuelta":
      if (enRetorno) {
        return { ...resultadoBase, objetivo: "finalizado", motivo: "retorno_origen" };
      }
      return nada("retorno_origen");
  }
}

// Compatibilidad temporal para los dos consumidores que se migran en esta fase.
export type TransicionEstado =
  | "confirmar_inicio"
  | "en_transito"
  | "en_destino"
  | "salida_destino"
  | "de_vuelta"
  | "finalizado";

export interface EvaluarGeofenceParams {
  trackerLat: number | null;
  trackerLng: number | null;
  estadoActual: EstadoViaje | string;
  origenLat?: number | null;
  origenLng?: number | null;
  destinoLat: number | null;
  destinoLng: number | null;
  bloqueado: boolean;
  lecturasInicioConfirm: number;
  lecturasFueraDestino: number;
}

export interface EvaluarGeofenceResult {
  transicion: TransicionEstado | null;
  distanciaDestinoM: number | null;
  distanciaOrigenM: number | null;
  distanciaPuertoBarriosM: number | null;
}

/** @deprecated Migrar a evaluarGeofencePuro. */
export function evaluarGeofence(input: EvaluarGeofenceParams): EvaluarGeofenceResult {
  if (input.trackerLat === null || input.trackerLng === null) {
    return { transicion: null, distanciaDestinoM: null, distanciaOrigenM: null, distanciaPuertoBarriosM: null };
  }
  const resultado = evaluarGeofencePuro({
    estado: ESTADOS_ACTIVOS.includes(input.estadoActual as (typeof ESTADOS_ACTIVOS)[number])
      ? (input.estadoActual as (typeof ESTADOS_ACTIVOS)[number])
      : "programado",
    actual: { lat: input.trackerLat, lng: input.trackerLng },
    origen: input.origenLat === null || input.origenLat === undefined ||
      input.origenLng === null || input.origenLng === undefined
      ? ORIGEN_PIMOT
      : { lat: input.origenLat, lng: input.origenLng },
    previa: null,
    dtSegundos: null,
    destino: input.destinoLat === null || input.destinoLng === null
      ? null
      : { lat: input.destinoLat, lng: input.destinoLng },
    params: {
      radioInicioM: 500,
      radioLlegadaM: 500,
      radioSalidaM: 650,
      radioRetornoM: 500,
      lecturasParaInicio: 2,
      lecturasParaSalida: 2,
      toleranciaRuidoM: 50,
    },
    lecturasInicioConfirm: input.lecturasInicioConfirm,
    lecturasFueraDestino: input.lecturasFueraDestino,
    enOrigenVisto: input.bloqueado,
    maxDistOrigenM: 0,
  });
  const candidatos: TransicionEstado[] = [
    "en_transito", "en_destino", "de_vuelta", "finalizado",
  ];
  const transicion: TransicionEstado | null = resultado.motivo === "confirmando_salida"
    ? "confirmar_inicio"
    : candidatos.includes(resultado.objetivo as TransicionEstado)
      ? (resultado.objetivo as TransicionEstado)
      : null;
  return {
    transicion,
    distanciaDestinoM: resultado.distanciaDestinoPuntoM,
    distanciaOrigenM: resultado.distanciaOrigenPuntoM,
    distanciaPuertoBarriosM: resultado.distanciaOrigenPuntoM,
  };
}

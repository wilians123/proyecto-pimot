import type { EstadoViaje } from "@/types";

export const GEOFENCE_DEFAULT_ORIGIN = {
  lat: 15.66719,
  lng: -88.56064,
};

export const GEOFENCE_CONFIG = {
  radioInicioM: 150,
  radioLlegadaM: 75,
  radioSalidaM: 120,
  radioRetornoM: 150,
  lecturasParaInicio: 2,
  lecturasParaSalida: 3,
};

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

export function haversineMetros(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export function evaluarGeofence({
  trackerLat,
  trackerLng,
  estadoActual,
  origenLat,
  origenLng,
  destinoLat,
  destinoLng,
  bloqueado,
  lecturasInicioConfirm,
  lecturasFueraDestino,
}: EvaluarGeofenceParams): EvaluarGeofenceResult {
  if (trackerLat === null || trackerLng === null) {
    return {
      transicion: null,
      distanciaDestinoM: null,
      distanciaOrigenM: null,
      distanciaPuertoBarriosM: null,
    };
  }

  const origin = {
    lat: origenLat ?? GEOFENCE_DEFAULT_ORIGIN.lat,
    lng: origenLng ?? GEOFENCE_DEFAULT_ORIGIN.lng,
  };

  const distanciaOrigenM = haversineMetros(
    trackerLat,
    trackerLng,
    origin.lat,
    origin.lng,
  );
  const distanciaPuertoBarriosM = haversineMetros(
    trackerLat,
    trackerLng,
    GEOFENCE_DEFAULT_ORIGIN.lat,
    GEOFENCE_DEFAULT_ORIGIN.lng,
  );
  const distanciaDestinoM =
    destinoLat === null || destinoLng === null
      ? null
      : haversineMetros(trackerLat, trackerLng, destinoLat, destinoLng);

  let transicion: TransicionEstado | null = null;

  switch (estadoActual) {
    case "programado":
      if (!bloqueado && distanciaOrigenM <= GEOFENCE_CONFIG.radioInicioM) {
        transicion =
          lecturasInicioConfirm + 1 >= GEOFENCE_CONFIG.lecturasParaInicio
            ? "en_transito"
            : "confirmar_inicio";
      }
      break;
    case "en_transito":
      if (
        distanciaDestinoM !== null &&
        distanciaDestinoM <= GEOFENCE_CONFIG.radioLlegadaM
      ) {
        transicion = "en_destino";
      }
      break;
    case "en_destino":
      if (
        distanciaDestinoM !== null &&
        distanciaDestinoM > GEOFENCE_CONFIG.radioSalidaM
      ) {
        transicion =
          lecturasFueraDestino + 1 >= GEOFENCE_CONFIG.lecturasParaSalida
            ? "de_vuelta"
            : "salida_destino";
      }
      break;
    case "de_vuelta":
      if (distanciaOrigenM <= GEOFENCE_CONFIG.radioRetornoM) {
        transicion = "finalizado";
      }
      break;
  }

  return {
    transicion,
    distanciaDestinoM,
    distanciaOrigenM,
    distanciaPuertoBarriosM,
  };
}

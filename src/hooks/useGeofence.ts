// useGeofence.ts
// Lógica geográfica pura para la automatización de estados del viaje.
// Usa useMemo exclusivamente — sin useEffect ni setState.
import { useMemo } from "react";

const PUERTO_BARRIOS_LAT = 15.69455;
const PUERTO_BARRIOS_LNG = -88.57833;

const RADIO_INICIO_M = 150; // Radio de Puerto Barrios para detectar salida
const RADIO_LLEGADA_M = 75; // Radio del destino para detectar llegada
const RADIO_SALIDA_M = 120; // Radio del destino para detectar salida
const RADIO_RETORNO_M = 150; // Radio de Puerto Barrios para detectar retorno

// Lecturas consecutivas requeridas antes de confirmar cada transición.
// Evita falsos positivos por GPS drift, posición cacheada o señal débil.
const LECTURAS_PARA_INICIO = 2; // programado → en_transito (nueva)
const LECTURAS_PARA_SALIDA = 3; // en_destino → de_vuelta

export type TransicionEstado =
  | "salida_inicio" // incrementa contador para confirmar en_transito
  | "en_transito" // se emite al superar LECTURAS_PARA_INICIO
  | "en_destino"
  | "salida_destino" // incrementa contador para confirmar de_vuelta
  | "de_vuelta"
  | "finalizado";

interface UseGeofenceParams {
  trackerLat: number | null;
  trackerLng: number | null;
  estadoActual: string;
  destinoLat: number | null;
  destinoLng: number | null;
  bloqueado: boolean;
  lecturasFueraDestino: number;
  /** Lecturas consecutivas fuera del radio de inicio (para confirmar en_transito) */
  lecturasInicioConfirm: number;
}

interface UseGeofenceResult {
  transicion: TransicionEstado | null;
  distanciaDestinoM: number | null;
  distanciaPuertoBarriosM: number | null;
}

function haversineMetros(
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

export function useGeofence({
  trackerLat,
  trackerLng,
  estadoActual,
  destinoLat,
  destinoLng,
  bloqueado,
  lecturasFueraDestino,
  lecturasInicioConfirm,
}: UseGeofenceParams): UseGeofenceResult {
  const transicion = useMemo((): TransicionEstado | null => {
    if (trackerLat === null || trackerLng === null) return null;

    const distPB = haversineMetros(
      trackerLat,
      trackerLng,
      PUERTO_BARRIOS_LAT,
      PUERTO_BARRIOS_LNG,
    );

    switch (estadoActual) {
      case "programado": {
        if (bloqueado) return null;
        if (distPB > RADIO_INICIO_M) {
          // Requiere LECTURAS_PARA_INICIO lecturas consecutivas fuera del radio
          // para evitar falsos positivos por GPS drift o posición cacheada
          if (lecturasInicioConfirm >= LECTURAS_PARA_INICIO)
            return "en_transito";
          return "salida_inicio";
        }
        return null;
      }
      case "en_transito": {
        if (destinoLat !== null && destinoLng !== null) {
          const distDest = haversineMetros(
            trackerLat,
            trackerLng,
            destinoLat,
            destinoLng,
          );
          if (distDest <= RADIO_LLEGADA_M) return "en_destino";
        }
        return null;
      }
      case "en_destino": {
        if (destinoLat !== null && destinoLng !== null) {
          const distDest = haversineMetros(
            trackerLat,
            trackerLng,
            destinoLat,
            destinoLng,
          );
          if (distDest > RADIO_SALIDA_M) {
            if (lecturasFueraDestino >= LECTURAS_PARA_SALIDA)
              return "de_vuelta";
            return "salida_destino";
          }
        }
        return null;
      }
      case "de_vuelta": {
        if (distPB <= RADIO_RETORNO_M) return "finalizado";
        return null;
      }
    }
    return null;
  }, [
    trackerLat,
    trackerLng,
    estadoActual,
    destinoLat,
    destinoLng,
    bloqueado,
    lecturasFueraDestino,
    lecturasInicioConfirm,
  ]);

  const distanciaDestinoM = useMemo(() => {
    if (
      trackerLat === null ||
      trackerLng === null ||
      destinoLat === null ||
      destinoLng === null
    )
      return null;
    return haversineMetros(trackerLat, trackerLng, destinoLat, destinoLng);
  }, [trackerLat, trackerLng, destinoLat, destinoLng]);

  const distanciaPuertoBarriosM = useMemo(() => {
    if (trackerLat === null || trackerLng === null) return null;
    return haversineMetros(
      trackerLat,
      trackerLng,
      PUERTO_BARRIOS_LAT,
      PUERTO_BARRIOS_LNG,
    );
  }, [trackerLat, trackerLng]);

  return { transicion, distanciaDestinoM, distanciaPuertoBarriosM };
}

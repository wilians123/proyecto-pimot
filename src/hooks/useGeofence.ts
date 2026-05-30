// useGeofence.ts
// Lógica geográfica para automatizar estados del viaje.
// Mantiene compatibilidad con la lógica previa pero añade soporte para
// "one-way" (ida simple) y parámetros configurables para pruebas/producción.
// Usa useMemo — sin useEffect ni setState.
import { useMemo } from "react";

const PUERTO_BARRIOS_LAT = 15.69455;
const PUERTO_BARRIOS_LNG = -88.57833;

// Valores por defecto (se pueden sobreescribir con parámetros o vars de entorno)
const DEFAULT_RADIO_INICIO_M = 150; // Radio de Puerto Barrios para detectar salida
const DEFAULT_RADIO_LLEGADA_M = 75; // Radio del destino para detectar llegada
const DEFAULT_RADIO_SALIDA_M = 120; // Radio del destino para detectar salida
const DEFAULT_RADIO_RETORNO_M = 150; // Radio de Puerto Barrios para detectar retorno

const DEFAULT_LECTURAS_PARA_INICIO = 2; // programado → en_transito
const DEFAULT_LECTURAS_PARA_SALIDA = 3; // en_destino → de_vuelta
const DEFAULT_LECTURAS_PARA_FINALIZACION_ONEWAY = 3; // lecturas estables dentro del radio para finalizar (one-way)
const DEFAULT_PORCENTAJE_FINALIZACION_ONEWAY = 95; // % consumido para permitir finalización (one-way)

export type TransicionEstado =
  | "salida_inicio"
  | "en_transito"
  | "en_destino"
  | "salida_destino"
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
  // Nuevo: tipo de viaje — "one-way" (ida simple) o "roundtrip" (ida+vuelta)
  tripType?: "one-way" | "roundtrip";
  // Lecturas consecutivas dentro del radio de llegada (para confirmar finalizado en one-way)
  lecturasDentroDestino?: number;
  // Parámetros configurables (si no se pasan, se leen de vars de entorno o se usan defaults)
  radioInicioM?: number;
  radioLlegadaM?: number;
  radioSalidaM?: number;
  radioRetornoM?: number;
  lecturasParaInicio?: number;
  lecturasParaSalida?: number;
  lecturasParaFinalizacionOneWay?: number;
  porcentajeFinalizacionOneWay?: number; // como porcentaje (p.ej. 95)
  // Información de ruta para % consumido
  routeLengthMeters?: number | null;
  distanceConsumedMeters?: number | null;
  // Debug
  debug?: boolean;
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

/**
 * Versión pura de la lógica que puede ser testeada sin hooks de React.
 * Devuelve solo la transición (o null) dado el estado y parámetros.
 */
export function computeGeofenceTransition({
  trackerLat,
  trackerLng,
  estadoActual,
  destinoLat,
  destinoLng,
  bloqueado,
  lecturasFueraDestino,
  lecturasInicioConfirm,
  tripType = "roundtrip",
  lecturasDentroDestino = 0,
  radioInicioM,
  radioLlegadaM,
  radioSalidaM,
  radioRetornoM,
  lecturasParaInicio,
  lecturasParaSalida,
  lecturasParaFinalizacionOneWay,
  porcentajeFinalizacionOneWay,
  routeLengthMeters = null,
  distanceConsumedMeters = null,
  debug = false,
}: UseGeofenceParams): TransicionEstado | null {
  const log = (msg: string, ...args: any[]) => {
    if (debug) console.debug(`[useGeofence] ${msg}`, ...args);
  };

  if (trackerLat === null || trackerLng === null) return null;

  const effectiveRadioInicio =
    (radioInicioM ??
      Number(
        process.env.NEXT_PUBLIC_GEOFENCE_RADIO_INICIO_M ??
          process.env.REACT_APP_GEOFENCE_RADIO_INICIO_M,
      )) ||
    DEFAULT_RADIO_INICIO_M;
  const effectiveRadioLlegada =
    (radioLlegadaM ??
      Number(
        process.env.NEXT_PUBLIC_GEOFENCE_RADIO_LLEGADA_M ??
          process.env.REACT_APP_GEOFENCE_RADIO_LLEGADA_M,
      )) ||
    DEFAULT_RADIO_LLEGADA_M;
  const effectiveRadioSalida =
    (radioSalidaM ??
      Number(
        process.env.NEXT_PUBLIC_GEOFENCE_RADIO_SALIDA_M ??
          process.env.REACT_APP_GEOFENCE_RADIO_SALIDA_M,
      )) ||
    DEFAULT_RADIO_SALIDA_M;
  const effectiveRadioRetorno =
    (radioRetornoM ??
      Number(
        process.env.NEXT_PUBLIC_GEOFENCE_RADIO_RETORNO_M ??
          process.env.REACT_APP_GEOFENCE_RADIO_RETORNO_M,
      )) ||
    DEFAULT_RADIO_RETORNO_M;

  const effectiveLecturasParaInicio =
    (lecturasParaInicio ??
      Number(
        process.env.NEXT_PUBLIC_GEOFENCE_LECTURAS_PARA_INICIO ??
          process.env.REACT_APP_GEOFENCE_LECTURAS_PARA_INICIO,
      )) ||
    DEFAULT_LECTURAS_PARA_INICIO;
  const effectiveLecturasParaSalida =
    (lecturasParaSalida ??
      Number(
        process.env.NEXT_PUBLIC_GEOFENCE_LECTURAS_PARA_SALIDA ??
          process.env.REACT_APP_GEOFENCE_LECTURAS_PARA_SALIDA,
      )) ||
    DEFAULT_LECTURAS_PARA_SALIDA;
  const effectiveLecturasParaFinalizacionOneWay =
    (lecturasParaFinalizacionOneWay ??
      Number(
        process.env.NEXT_PUBLIC_GEOFENCE_LECTURAS_PARA_FINALIZACION_ONEWAY ??
          process.env.REACT_APP_GEOFENCE_LECTURAS_PARA_FINALIZACION_ONEWAY,
      )) ||
    DEFAULT_LECTURAS_PARA_FINALIZACION_ONEWAY;

  const effectivePorcentajeFinalizacionOneWay =
    (porcentajeFinalizacionOneWay ??
      Number(
        process.env.NEXT_PUBLIC_GEOFENCE_PORCENTAJE_FINALIZACION_ONEWAY ??
          process.env.REACT_APP_GEOFENCE_PORCENTAJE_FINALIZACION_ONEWAY,
      )) ||
    DEFAULT_PORCENTAJE_FINALIZACION_ONEWAY;

  const distPB = haversineMetros(
    trackerLat,
    trackerLng,
    PUERTO_BARRIOS_LAT,
    PUERTO_BARRIOS_LNG,
  );

  const percentConsumed =
    routeLengthMeters && distanceConsumedMeters && routeLengthMeters > 0
      ? (distanceConsumedMeters / routeLengthMeters) * 100
      : null;

  // Transición principal
  switch (estadoActual) {
    case "programado": {
      if (bloqueado) return null;
      if (distPB > effectiveRadioInicio) {
        if (lecturasInicioConfirm >= effectiveLecturasParaInicio) return "en_transito";
        log(
          "programado -> fuera del radio inicio, incrementando lecturas (salida_inicio)",
          {
            distPB,
            effectiveRadioInicio,
            lecturasInicioConfirm,
            effectiveLecturasParaInicio,
          },
        );
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

        // One-way: permitir finalizado por %consumido
        if (tripType === "one-way" && percentConsumed !== null) {
          if (percentConsumed >= effectivePorcentajeFinalizacionOneWay) {
            log("one-way: porcentaje consumido >= umbral → finalizado", {
              percentConsumed,
              effectivePorcentajeFinalizacionOneWay,
            });
            return "finalizado";
          }
        }

        if (distDest <= effectiveRadioLlegada) {
          // One-way: permitir finalizar tras lecturas estables dentro del radio
          if (tripType === "one-way") {
            if (
              (lecturasDentroDestino ?? 0) >=
              effectiveLecturasParaFinalizacionOneWay
            ) {
              log(
                "one-way: lecturas dentro del destino >= umbral → finalizado",
                {
                  lecturasDentroDestino,
                  effectiveLecturasParaFinalizacionOneWay,
                },
              );
              return "finalizado";
            }
            log(
              "one-way: dentro del radio de llegada pero no cumple lecturas estables → emitir en_destino",
              {
                distDest,
                effectiveRadioLlegada,
                lecturasDentroDestino,
                effectiveLecturasParaFinalizacionOneWay,
              },
            );
            return "en_destino";
          }

          // Roundtrip: comportamiento original
          log("roundtrip: dentro del radio de llegada → en_destino", {
            distDest,
            effectiveRadioLlegada,
          });
          return "en_destino";
        }
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

        if (distDest > effectiveRadioSalida) {
          if (lecturasFueraDestino >= effectiveLecturasParaSalida) {
            log(
              "en_destino -> fuera del radio y lecturasFueraDestino >= umbral → de_vuelta",
              {
                distDest,
                effectiveRadioSalida,
                lecturasFueraDestino,
                effectiveLecturasParaSalida,
              },
            );
            return "de_vuelta";
          }
          log(
            "en_destino -> fuera del radio pero lecturas insuficientes → salida_destino",
            {
              distDest,
              effectiveRadioSalida,
              lecturasFueraDestino,
              effectiveLecturasParaSalida,
            },
          );
          return "salida_destino";
        }

        // Si sigue dentro del destino y es one-way, comprobar criterios de finalización
        if (tripType === "one-way") {
          if (
            (lecturasDentroDestino ?? 0) >=
            effectiveLecturasParaFinalizacionOneWay
          ) {
            log(
              "en_destino (one-way): lecturas dentro >= umbral → finalizado",
              {
                lecturasDentroDestino,
                effectiveLecturasParaFinalizacionOneWay,
              },
            );
            return "finalizado";
          }
          if (
            percentConsumed !== null &&
            percentConsumed >= effectivePorcentajeFinalizacionOneWay
          ) {
            log(
              "en_destino (one-way): porcentaje consumido >= umbral → finalizado",
              { percentConsumed, effectivePorcentajeFinalizacionOneWay },
            );
            return "finalizado";
          }
        }
      }
      return null;
    }

    case "de_vuelta": {
      if (distPB <= effectiveRadioRetorno) {
        log("de_vuelta -> dentro del radio de retorno → finalizado", {
          distPB,
          effectiveRadioRetorno,
        });
        return "finalizado";
      }
      return null;
    }
  }

  return null;
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
  tripType,
  lecturasDentroDestino,
  radioInicioM,
  radioLlegadaM,
  radioSalidaM,
  radioRetornoM,
  lecturasParaInicio,
  lecturasParaSalida,
  lecturasParaFinalizacionOneWay,
  porcentajeFinalizacionOneWay,
  routeLengthMeters,
  distanceConsumedMeters,
  debug,
}: UseGeofenceParams): UseGeofenceResult {
  const transicion = useMemo((): TransicionEstado | null => {
    return computeGeofenceTransition({
      trackerLat,
      trackerLng,
      estadoActual,
      destinoLat,
      destinoLng,
      bloqueado,
      lecturasFueraDestino,
      lecturasInicioConfirm,
      tripType,
      lecturasDentroDestino,
      radioInicioM,
      radioLlegadaM,
      radioSalidaM,
      radioRetornoM,
      lecturasParaInicio,
      lecturasParaSalida,
      lecturasParaFinalizacionOneWay,
      porcentajeFinalizacionOneWay,
      routeLengthMeters,
      distanceConsumedMeters,
      debug,
    });
  }, [
    trackerLat,
    trackerLng,
    estadoActual,
    destinoLat,
    destinoLng,
    bloqueado,
    lecturasFueraDestino,
    lecturasInicioConfirm,
    tripType,
    lecturasDentroDestino,
    radioInicioM,
    radioLlegadaM,
    radioSalidaM,
    radioRetornoM,
    lecturasParaInicio,
    lecturasParaSalida,
    lecturasParaFinalizacionOneWay,
    porcentajeFinalizacionOneWay,
    routeLengthMeters,
    distanceConsumedMeters,
    debug,
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

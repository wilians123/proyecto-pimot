import { useMemo } from "react";
import { evaluarGeofence, type TransicionEstado } from "@/lib/geofence";

export type { TransicionEstado };

interface UseGeofenceParams {
  trackerLat: number | null;
  trackerLng: number | null;
  estadoActual: string;
  origenLat?: number | null;
  origenLng?: number | null;
  destinoLat: number | null;
  destinoLng: number | null;
  bloqueado: boolean;
  lecturasFueraDestino: number;
  lecturasInicioConfirm: number;
}

interface UseGeofenceResult {
  transicion: TransicionEstado | null;
  distanciaDestinoM: number | null;
  distanciaOrigenM: number | null;
  distanciaPuertoBarriosM: number | null;
}

export function useGeofence({
  trackerLat,
  trackerLng,
  estadoActual,
  origenLat,
  origenLng,
  destinoLat,
  destinoLng,
  bloqueado,
  lecturasFueraDestino,
  lecturasInicioConfirm,
}: UseGeofenceParams): UseGeofenceResult {
  return useMemo(
    () =>
      evaluarGeofence({
        trackerLat,
        trackerLng,
        estadoActual,
        origenLat,
        origenLng,
        destinoLat,
        destinoLng,
        bloqueado,
        lecturasFueraDestino,
        lecturasInicioConfirm,
      }),
    [
      trackerLat,
      trackerLng,
      estadoActual,
      origenLat,
      origenLng,
      destinoLat,
      destinoLng,
      bloqueado,
      lecturasFueraDestino,
      lecturasInicioConfirm,
    ],
  );
}

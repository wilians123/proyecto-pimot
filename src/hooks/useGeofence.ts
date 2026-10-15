import { useMemo } from "react";
import { haversineMetros, ORIGEN_PIMOT } from "@/lib/geofence";

interface UseGeofenceParams {
  trackerLat: number | null;
  trackerLng: number | null;
  destinoLat: number | null;
  destinoLng: number | null;
}

interface UseGeofenceResult {
  distanciaDestinoM: number | null;
  distanciaOrigenM: number | null;
}

export function useGeofence({
  trackerLat,
  trackerLng,
  destinoLat,
  destinoLng,
}: UseGeofenceParams): UseGeofenceResult {
  return useMemo(() => {
    if (trackerLat === null || trackerLng === null) {
      return { distanciaDestinoM: null, distanciaOrigenM: null };
    }
    return {
      distanciaOrigenM: haversineMetros(
        trackerLat,
        trackerLng,
        ORIGEN_PIMOT.lat,
        ORIGEN_PIMOT.lng,
      ),
      distanciaDestinoM:
        destinoLat === null || destinoLng === null
          ? null
          : haversineMetros(trackerLat, trackerLng, destinoLat, destinoLng),
    };
  }, [trackerLat, trackerLng, destinoLat, destinoLng]);
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluarGeofence } from "@/lib/geofence";
import type { Database } from "@/types/database";
import type { EstadoViaje } from "@/types";

export interface TrackerGeofenceState {
  tracker_id: number;
  cabezal_id: string | null;
  lat: number | null;
  lng: number | null;
  velocidad?: number | null;
}

export interface GeofenceProcessEvent {
  viajeId: string;
  estadoAnterior: EstadoViaje;
  estadoNuevo?: EstadoViaje;
  accion:
    | "confirmar_inicio"
    | "salida_destino"
    | "cambio_estado"
    | "sin_tracker"
    | "sin_posicion"
    | "sin_cambio";
  trackerId?: number;
  distanciaOrigenM: number | null;
  distanciaDestinoM: number | null;
  error?: string;
}

type Db = SupabaseClient<Database>;
type ViajeActivo = Pick<
  Database["public"]["Tables"]["viajes"]["Row"],
  | "id"
  | "estado"
  | "lat_origen"
  | "lng_origen"
  | "lat_destino"
  | "lng_destino"
  | "bloqueado"
  | "lecturas_inicio_confirm"
  | "lecturas_fuera_destino"
  | "cabezal_id"
>;

function updatesParaEstado(estadoNuevo: EstadoViaje): Record<string, unknown> {
  const ahora = new Date().toISOString();
  const updates: Record<string, unknown> = { estado: estadoNuevo };

  // CHANGE: geofence migration fix - reset counters only on the transition that owns them.
  if (estadoNuevo === "en_transito") {
    updates.fecha_inicio = ahora;
    updates.bloqueado = true;
    updates.lecturas_inicio_confirm = 0;
  }
  if (estadoNuevo === "en_destino") {
    updates.fecha_llegada_destino = ahora;
    updates.lecturas_fuera_destino = 0;
  }
  if (estadoNuevo === "de_vuelta") {
    updates.fecha_salida_destino = ahora;
    updates.lecturas_fuera_destino = 0;
  }
  if (estadoNuevo === "finalizado") {
    updates.fecha_fin = ahora;
    updates.bloqueado = false;
  }

  return updates;
}

export async function procesarGeofenceViajes(
  supabase: Db,
  trackers: TrackerGeofenceState[],
): Promise<{ eventos: GeofenceProcessEvent[]; error: string | null }> {
  const { data, error } = await supabase
    .from("viajes")
    .select(
      "id, estado, lat_origen, lng_origen, lat_destino, lng_destino, bloqueado, lecturas_inicio_confirm, lecturas_fuera_destino, cabezal_id",
    )
    .is("deleted_at", null)
    .in("estado", ["programado", "en_transito", "en_destino", "de_vuelta"]);

  if (error) return { eventos: [], error: error.message };

  const trackersPorCabezal = new Map(
    trackers
      .filter((tracker) => tracker.cabezal_id)
      .map((tracker) => [tracker.cabezal_id as string, tracker]),
  );
  const eventos: GeofenceProcessEvent[] = [];

  for (const viaje of (data ?? []) as ViajeActivo[]) {
    const tracker = viaje.cabezal_id
      ? trackersPorCabezal.get(viaje.cabezal_id)
      : undefined;

    if (!tracker) {
      eventos.push({
        viajeId: viaje.id,
        estadoAnterior: viaje.estado,
        accion: "sin_tracker",
        distanciaOrigenM: null,
        distanciaDestinoM: null,
      });
      continue;
    }

    const resultado = evaluarGeofence({
      trackerLat: tracker.lat,
      trackerLng: tracker.lng,
      estadoActual: viaje.estado,
      origenLat: viaje.lat_origen,
      origenLng: viaje.lng_origen,
      destinoLat: viaje.lat_destino,
      destinoLng: viaje.lng_destino,
      bloqueado: viaje.bloqueado,
      lecturasInicioConfirm: viaje.lecturas_inicio_confirm ?? 0,
      lecturasFueraDestino: viaje.lecturas_fuera_destino ?? 0,
    });

    if (tracker.lat === null || tracker.lng === null) {
      eventos.push({
        viajeId: viaje.id,
        estadoAnterior: viaje.estado,
        accion: "sin_posicion",
        trackerId: tracker.tracker_id,
        distanciaOrigenM: null,
        distanciaDestinoM: null,
      });
      continue;
    }

    if (resultado.transicion === "confirmar_inicio") {
      const lecturasActuales = viaje.lecturas_inicio_confirm ?? 0;
      const { error: updateError } = await supabase
        .from("viajes")
        .update({
          lecturas_inicio_confirm: lecturasActuales + 1,
        })
        .eq("id", viaje.id)
        .eq("estado", "programado")
        .eq("lecturas_inicio_confirm", lecturasActuales);

      eventos.push({
        viajeId: viaje.id,
        estadoAnterior: viaje.estado,
        accion: "confirmar_inicio",
        trackerId: tracker.tracker_id,
        distanciaOrigenM: resultado.distanciaOrigenM,
        distanciaDestinoM: resultado.distanciaDestinoM,
        error: updateError?.message,
      });
      continue;
    }

    if (resultado.transicion === "salida_destino") {
      const lecturasActuales = viaje.lecturas_fuera_destino ?? 0;
      const { error: updateError } = await supabase
        .from("viajes")
        .update({
          lecturas_fuera_destino: lecturasActuales + 1,
        })
        .eq("id", viaje.id)
        .eq("estado", "en_destino")
        .eq("lecturas_fuera_destino", lecturasActuales);

      eventos.push({
        viajeId: viaje.id,
        estadoAnterior: viaje.estado,
        accion: "salida_destino",
        trackerId: tracker.tracker_id,
        distanciaOrigenM: resultado.distanciaOrigenM,
        distanciaDestinoM: resultado.distanciaDestinoM,
        error: updateError?.message,
      });
      continue;
    }

    if (resultado.transicion) {
      const estadoNuevo = resultado.transicion as EstadoViaje;
      const { error: updateError } = await supabase
        .from("viajes")
        .update(updatesParaEstado(estadoNuevo))
        .eq("id", viaje.id)
        .eq("estado", viaje.estado);

      eventos.push({
        viajeId: viaje.id,
        estadoAnterior: viaje.estado,
        estadoNuevo,
        accion: "cambio_estado",
        trackerId: tracker.tracker_id,
        distanciaOrigenM: resultado.distanciaOrigenM,
        distanciaDestinoM: resultado.distanciaDestinoM,
        error: updateError?.message,
      });
      continue;
    }

    eventos.push({
      viajeId: viaje.id,
      estadoAnterior: viaje.estado,
      accion: "sin_cambio",
      trackerId: tracker.tracker_id,
      distanciaOrigenM: resultado.distanciaOrigenM,
      distanciaDestinoM: resultado.distanciaDestinoM,
    });
  }

  return { eventos, error: null };
}

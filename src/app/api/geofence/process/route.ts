import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  procesarGeofenceViajes,
  type TrackerGeofenceState,
} from "@/services/geofence-processor.service";

interface NavixyState {
  gps?: {
    location?: { lat: number; lng: number };
    speed?: number;
  };
}

interface NavixyStatesResponse {
  success: boolean;
  states: Record<string, NavixyState>;
}

const NAVIXY_BASE = "https://api.us.navixy.com/v2";

function autorizado(request: Request): boolean {
  const secret = process.env.GEOFENCE_CRON_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  return bearer === `Bearer ${secret}` || headerSecret === secret;
}

async function cargarTrackers(): Promise<{
  trackers: TrackerGeofenceState[];
  error: string | null;
}> {
  const hash = process.env.NAVIXY_HASH;
  if (!hash) return { trackers: [], error: "NAVIXY_HASH no configurado" };

  const { data: meta, error } = await supabaseAdmin
    .from("navixy_trackers")
    .select("tracker_id, cabezal_id")
    .eq("activo", true);

  if (error) return { trackers: [], error: error.message };

  const trackerIds = (meta ?? []).map((tracker) => tracker.tracker_id);
  if (trackerIds.length === 0) return { trackers: [], error: null };

  const res = await fetch(`${NAVIXY_BASE}/tracker/get_states`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hash, tracker_id: trackerIds }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    return { trackers: [], error: `Navixy respondio con status ${res.status}` };
  }

  const json = (await res.json()) as NavixyStatesResponse;
  if (!json.success) return { trackers: [], error: "Navixy devolvio success:false" };

  const cabezalPorTracker = new Map(
    (meta ?? []).map((tracker) => [tracker.tracker_id, tracker.cabezal_id]),
  );

  return {
    trackers: Object.entries(json.states).map(([idStr, state]) => {
      const trackerId = Number(idStr);
      return {
        tracker_id: trackerId,
        cabezal_id: cabezalPorTracker.get(trackerId) ?? null,
        lat: state.gps?.location?.lat ?? null,
        lng: state.gps?.location?.lng ?? null,
        velocidad: state.gps?.speed ?? null,
      };
    }),
    error: null,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { trackers, error } = await cargarTrackers();
  if (error) return NextResponse.json({ error }, { status: 502 });

  const resultado = await procesarGeofenceViajes(supabaseAdmin, trackers);
  if (resultado.error) {
    return NextResponse.json({ error: resultado.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    trackers: trackers.length,
    eventos: resultado.eventos,
  });
}

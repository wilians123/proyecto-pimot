// =============================================================
// la anon key de Navixy no puede exponerse
// en el cliente. El frontend llama a /api/gps/estados y esta
// ruta llama a Navixy con el hash desde variables de entorno.
//
// Navixy endpoint: POST /tracker/get_states
// Devuelve lat/lng/velocidad/movimiento/encendido de todos
// los trackers configurados en la cuenta.
//
// El response de esta ruta normaliza los datos al formato
// interno de PIMOT para que el cliente no dependa del
// esquema de Navixy directamente.
// =============================================================

import { NextResponse } from "next/server";

// Tipos del response de Navixy
interface NavixyGpsLocation {
  lat: number;
  lng: number;
}

interface NavixyTrackerState {
  gps?: {
    location?: NavixyGpsLocation;
    speed?: number;
  };
  movement_status?: "moving" | "parked" | "stopped";
  ignition?: boolean;
  battery_level?: number;
  last_update?: string;
}

interface NavixyStatesResponse {
  success: boolean;
  states: Record<string, NavixyTrackerState>;
}

// Tipo normalizado que devuelve esta API Route al cliente
export interface TrackerEstado {
  tracker_id: number;
  lat: number | null;
  lng: number | null;
  velocidad: number;
  movimiento: "moving" | "parked" | "stopped" | "unknown";
  encendido: boolean;
  bateria: number | null;
  ultima_actualizacion: string | null;
}

const NAVIXY_BASE = "https://api.us.navixy.com/v2";

export async function GET(): Promise<NextResponse> {
  const hash = process.env.NAVIXY_HASH;
  if (!hash) {
    return NextResponse.json(
      { error: "NAVIXY_HASH no configurado en variables de entorno" },
      { status: 500 },
    );
  }

  // IDs de los trackers registrados (en producción vienen de la BD)
  // Hardcodeados como fallback seguro; la ruta /api/gps/trackers
  // los puede leer dinámicamente de navixy_trackers en Supabase.
  const trackerIds = [10457452, 10457453];

  try {
    const res = await fetch(`${NAVIXY_BASE}/tracker/get_states`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hash,
        tracker_id: trackerIds,
      }),
      // Timeout de 8 segundos para no bloquear el render
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Navixy respondió con status ${res.status}` },
        { status: 502 },
      );
    }

    const json = (await res.json()) as NavixyStatesResponse;

    if (!json.success) {
      return NextResponse.json(
        { error: "Navixy devolvió success: false" },
        { status: 502 },
      );
    }

    // Normalizar al formato interno
    const estados: TrackerEstado[] = Object.entries(json.states).map(
      ([idStr, state]) => ({
        tracker_id: parseInt(idStr, 10),
        lat: state.gps?.location?.lat ?? null,
        lng: state.gps?.location?.lng ?? null,
        velocidad: state.gps?.speed ?? 0,
        movimiento: state.movement_status ?? "unknown",
        encendido: state.ignition ?? false,
        bateria: state.battery_level ?? null,
        ultima_actualizacion: state.last_update ?? null,
      }),
    );

    // Cache de 15 segundos en Vercel Edge — evita sobrecargar Navixy
    return NextResponse.json(
      { estados },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: `Fallo al contactar Navixy: ${message}` },
      { status: 503 },
    );
  }
}

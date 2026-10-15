import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  procesarGeofenceViajes,
  type TrackerGeofenceState,
} from "@/services/geofence-processor.service";

interface PosicionSimulada {
  cabezal_id: string;
  lat: number;
  lng: number;
}

interface SolicitudSimulacion {
  posiciones?: PosicionSimulada[];
  ahora?: string;
}

function autorizado(request: Request): boolean {
  const secret = process.env.GEOFENCE_CRON_SECRET;
  if (!secret) return false;
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-cron-secret") === secret
  );
}

function trackerIdPrueba(cabezalId: string): number {
  let hash = 0;
  for (const caracter of cabezalId) {
    hash = (Math.imul(hash, 31) + caracter.charCodeAt(0)) >>> 0;
  }
  return 2_000_000_000 + (hash % 100_000_000);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.GEOFENCE_SIM_ENABLED !== "1") {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: SolicitudSimulacion;
  try {
    body = (await request.json()) as SolicitudSimulacion;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (
    !Array.isArray(body.posiciones) ||
    body.posiciones.some(
      (p) =>
        !p ||
        typeof p.cabezal_id !== "string" ||
        !Number.isFinite(p.lat) ||
        !Number.isFinite(p.lng) ||
        p.lat < -90 ||
        p.lat > 90 ||
        p.lng < -180 ||
        p.lng > 180,
    )
  ) {
    return NextResponse.json({ error: "Posiciones inválidas" }, { status: 400 });
  }
  const ahora = body.ahora === undefined ? new Date() : new Date(body.ahora);
  if (!Number.isFinite(ahora.getTime())) {
    return NextResponse.json({ error: "ahora inválido" }, { status: 400 });
  }

  const cabezalIds = [...new Set(body.posiciones.map((p) => p.cabezal_id))];
  const { data: cabezales, error: cabezalesError } = await supabaseAdmin
    .from("cabezales")
    .select("id, placa")
    .in("id", cabezalIds);
  if (cabezalesError) {
    return NextResponse.json({ error: "No se pudieron validar los cabezales" }, { status: 500 });
  }
  const permitidos = new Set(
    (cabezales ?? [])
      .filter((cabezal) => cabezal.placa.startsWith("TEST-GF"))
      .map((cabezal) => cabezal.id),
  );
  if (cabezalIds.some((id) => !permitidos.has(id))) {
    return NextResponse.json(
      { error: "La simulación solo admite cabezales TEST-GF" },
      { status: 400 },
    );
  }

  const trackers: TrackerGeofenceState[] = body.posiciones.map((posicion) => ({
    tracker_id: trackerIdPrueba(posicion.cabezal_id),
    cabezal_id: posicion.cabezal_id,
    lat: posicion.lat,
    lng: posicion.lng,
  }));
  const resultado = await procesarGeofenceViajes(supabaseAdmin, trackers, { ahora });
  if (resultado.error) {
    return NextResponse.json({ error: resultado.error }, { status: 500 });
  }
  const resumen = resultado.eventos.reduce<Record<string, number>>((conteo, evento) => {
    conteo[evento.accion] = (conteo[evento.accion] ?? 0) + 1;
    return conteo;
  }, {});
  return NextResponse.json({
    ok: true,
    trackers: trackers.length,
    eventos: resultado.eventos,
    resumen,
  });
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { procesarGeofenceViajes } from "@/services/geofence-processor.service";
import { haversineMetros, ORIGEN_PIMOT } from "@/lib/geofence";
import type { Database } from "@/types/database";

export const DESTINO_PRUEBA = { lat: 15.678341, lng: -88.506870 };
export const T0 = new Date("2026-01-01T12:00:00.000Z");
export const CADENCIA_S = 15;
export const LIMITE_VELOCIDAD_PRUEBA_KMH = 150;

/** Compara instantes sin depender de la representación que use PostgREST. */
export function mismoInstante(a: string | null | undefined, b: string | null | undefined): boolean {
  return typeof a === "string" && typeof b === "string" && Date.parse(a) === Date.parse(b);
}

export const integrationEnabled =
  process.env.GEOFENCE_IT === "1" &&
  process.env.GEOFENCE_IT_CONFIRM_NO_WEBHOOK === "1";

let supabaseAdmin: SupabaseClient<Database> | null = null;
let hostObjetivoRegistrado = false;

export interface FixtureOptions {
  placa?: string;
  estado?: "programado" | "en_transito" | "en_destino" | "de_vuelta" | "finalizado" | "cancelado";
  fechaInicio?: string | null;
  fechaEstimada?: string | null;
  radioDestino?: number;
  latOrigen?: number | null;
  lngOrigen?: number | null;
  latDestino?: number | null;
  lngDestino?: number | null;
  chasisId?: string | null;
  deletedAt?: string | null;
}

export interface Fixture {
  viajeId: string;
  cabezalId: string;
  placa: string;
}

const prefijo = `TEST-GF-IT-${Date.now().toString(36).toUpperCase()}`;
let secuencia = 0;
const fixtures: Fixture[] = [];
const chasisIds: string[] = [];
const lecturasNormales = new Map<string, { lat: number; lng: number; segundos: number }>();
let fixturesCreados = 0;

export interface ConteoLimpieza {
  viajes: number;
  cabezales: number;
  chasis: number;
}

export interface LineaBaseViajesReales {
  viajes: Array<{
    id: string;
    estado: string;
    deleted_at: string | null;
    updated_at: string | null;
    lecturas_inicio_confirm: number | null;
    lecturas_fuera_destino: number | null;
    transiciones_inferidas: unknown;
  }>;
  alertasReales: number;
}

function db() {
  return getSupabaseAdmin();
}

export function getSupabaseAdmin(): SupabaseClient<Database> {
  requireIntegrationGuard();
  return supabaseAdmin!;
}

function fallo(contexto: string, error: { message: string } | null): void {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

export function puntoNorte(centro: { lat: number; lng: number }, metros: number) {
  return { lat: centro.lat + metros / 111_320, lng: centro.lng };
}

export function enRuta(distanciaM: number, desvioM = 0) {
  const lat0 = (ORIGEN_PIMOT.lat * Math.PI) / 180;
  const distanciaTotal = haversineMetros(
    ORIGEN_PIMOT.lat,
    ORIGEN_PIMOT.lng,
    DESTINO_PRUEBA.lat,
    DESTINO_PRUEBA.lng,
  );
  const norte = (DESTINO_PRUEBA.lat - ORIGEN_PIMOT.lat) * 111_320;
  const este = (DESTINO_PRUEBA.lng - ORIGEN_PIMOT.lng) * 111_320 * Math.cos(lat0);
  const longitud = Math.hypot(norte, este) || distanciaTotal;
  const nx = norte / longitud;
  const ny = este / longitud;
  const x = nx * distanciaM - ny * desvioM;
  const y = ny * distanciaM + nx * desvioM;
  return {
    lat: ORIGEN_PIMOT.lat + x / 111_320,
    lng: ORIGEN_PIMOT.lng + y / (111_320 * Math.cos(lat0)),
  };
}

export async function crearFixture(etiqueta: string, opciones: FixtureOptions = {}): Promise<Fixture> {
  const client = db();
  const numero = ++secuencia;
  const placa = opciones.placa ?? `${prefijo}-${etiqueta}-${numero}`;
  const { data: cabezal, error: errorCabezal } = await client
    .from("cabezales")
    .insert({ placa, marca: "PIMOT TEST", modelo: etiqueta, estado: "activo", notas: "[GEOFENCE-TEST]" })
    .select("id")
    .single();
  fallo("crear cabezal", errorCabezal);
  if (!cabezal) throw new Error("No se recibió el identificador del cabezal de prueba.");

  const estado = opciones.estado ?? "programado";
  const { data: viaje, error: errorViaje } = await client
    .from("viajes")
    .insert({
      origen: "Puerto Barrios",
      destino: opciones.latDestino === null ? "TEST SIN DESTINO" : "TEST DESTINO",
      estado,
      cabezal_id: cabezal.id,
      chasis_id: opciones.chasisId ?? null,
      tipo_servicio: "flete",
      fecha_inicio: opciones.fechaInicio === undefined ? T0.toISOString() : opciones.fechaInicio,
      fecha_estimada: opciones.fechaEstimada ?? new Date(T0.getTime() + 60 * 60_000).toISOString(),
      radio_destino_metros: opciones.radioDestino ?? 500,
      lat_origen: opciones.latOrigen === undefined ? ORIGEN_PIMOT.lat : opciones.latOrigen,
      lng_origen: opciones.lngOrigen === undefined ? ORIGEN_PIMOT.lng : opciones.lngOrigen,
      lat_destino: opciones.latDestino === undefined ? DESTINO_PRUEBA.lat : opciones.latDestino,
      lng_destino: opciones.lngDestino === undefined ? DESTINO_PRUEBA.lng : opciones.lngDestino,
      notas: "[GEOFENCE-TEST]",
      bloqueado: estado === "programado" ? false : estado !== "finalizado" && estado !== "cancelado",
      deleted_at: opciones.deletedAt ?? null,
    })
    .select("id")
    .single();
  fallo("crear viaje", errorViaje);
  if (!viaje) throw new Error("No se recibió el identificador del viaje de prueba.");
  const fixture = { viajeId: viaje.id, cabezalId: cabezal.id, placa };
  fixtures.push(fixture);
  fixturesCreados += 1;
  return fixture;
}

export async function crearChasis(etiqueta: string): Promise<string> {
  const { data, error } = await db()
    .from("chasis")
    .insert({ placa: `${prefijo}-CH-${etiqueta}-${++secuencia}`, tamaño: "40", estado: "disponible", notas: "[GEOFENCE-TEST]" })
    .select("id")
    .single();
  fallo("crear chasis", error);
  if (!data) throw new Error("No se recibió el identificador del chasis de prueba.");
  chasisIds.push(data.id);
  fixturesCreados += 1;
  return data.id;
}

export async function procesar(
  fixture: Fixture,
  posicion: { lat: number | null; lng: number | null } | null,
  segundosDesdeT0: number,
) {
  const trackers = posicion
    ? [{ tracker_id: 1_900_000_000 + secuencia, cabezal_id: fixture.cabezalId, lat: posicion.lat, lng: posicion.lng }]
    : [];
  return procesarGeofenceViajes(db(), trackers, {
    ahora: new Date(T0.getTime() + segundosDesdeT0 * 1000),
  });
}

/** Verifica que los puntos normales del guion no impliquen más de 150 km/h. */
export async function procesarNormal(
  fixture: Fixture,
  posicion: { lat: number; lng: number },
  segundosDesdeT0: number,
) {
  let anterior = lecturasNormales.get(fixture.viajeId);
  if (!anterior) {
    const estado = await estadoGeofence(fixture);
    if (estado?.ultima_lat != null && estado.ultima_lng != null && estado.ultima_lectura_at) {
      anterior = {
        lat: estado.ultima_lat,
        lng: estado.ultima_lng,
        segundos: (Date.parse(estado.ultima_lectura_at) - T0.getTime()) / 1000,
      };
    }
  }

  if (anterior) {
    const deltaSegundos = segundosDesdeT0 - anterior.segundos;
    if (deltaSegundos <= 0) {
      throw new Error(`Guion físicamente inválido para ${fixture.placa}: el tiempo no avanza (${deltaSegundos} s).`);
    }
    const distanciaM = haversineMetros(anterior.lat, anterior.lng, posicion.lat, posicion.lng);
    const velocidadKmh = (distanciaM / deltaSegundos) * 3.6;
    if (velocidadKmh > LIMITE_VELOCIDAD_PRUEBA_KMH) {
      throw new Error(
        `Guion físicamente inválido para ${fixture.placa}: ${distanciaM.toFixed(0)} m en ${deltaSegundos} s = ${velocidadKmh.toFixed(1)} km/h (límite ${LIMITE_VELOCIDAD_PRUEBA_KMH} km/h).`,
      );
    }
  }

  lecturasNormales.set(fixture.viajeId, { ...posicion, segundos: segundosDesdeT0 });
  return procesar(fixture, posicion, segundosDesdeT0);
}

export async function viaje(fixture: Fixture) {
  const { data, error } = await db().from("viajes").select("*").eq("id", fixture.viajeId).single();
  fallo("leer viaje", error);
  if (!data) throw new Error("No se encontró el viaje de prueba.");
  return data;
}

export async function estadoGeofence(fixture: Fixture) {
  const { data, error } = await db()
    .from("geofence_viaje_estado")
    .select("*")
    .eq("viaje_id", fixture.viajeId)
    .maybeSingle();
  fallo("leer estado de geocerca", error);
  return data;
}

export async function guardarEstadoGeofence(
  fixture: Fixture,
  valores: Partial<Database["public"]["Tables"]["geofence_viaje_estado"]["Insert"]>,
) {
  const { error } = await db().from("geofence_viaje_estado").upsert({
    viaje_id: fixture.viajeId,
    ...valores,
  });
  fallo("preparar estado de geocerca", error);
}

export interface FilaIntegracion {
  viaje_id: string;
  created_at: string;
  tipo?: string;
}

export async function filas(
  tabla: "alertas" | "estado_viaje_log" | "geofence_eventos",
  fixture: Fixture,
): Promise<FilaIntegracion[]> {
  if (tabla === "alertas") {
    const { data, error } = await db().from("alertas").select("*").eq("viaje_id", fixture.viajeId).order("created_at");
    fallo(`leer ${tabla}`, error);
    return (data ?? []) as unknown as FilaIntegracion[];
  }
  if (tabla === "estado_viaje_log") {
    const { data, error } = await db().from("estado_viaje_log").select("*").eq("viaje_id", fixture.viajeId).order("created_at");
    fallo(`leer ${tabla}`, error);
    return (data ?? []) as unknown as FilaIntegracion[];
  }
  const { data, error } = await db().from("geofence_eventos").select("*").eq("viaje_id", fixture.viajeId).order("created_at");
  fallo(`leer ${tabla}`, error);
  return (data ?? []) as unknown as FilaIntegracion[];
}

export function reiniciarContadoresFixtures(): void {
  fixturesCreados = 0;
}

export function registrarFixtureMarcadoCreado(): void {
  fixturesCreados += 1;
}

export async function limpiarResiduos(): Promise<ConteoLimpieza> {
  const client = getSupabaseAdmin();
  const cabezalesPorPlaca = await client.from("cabezales").select("id").like("placa", "TEST-GF-%");
  fallo("buscar cabezales TEST-GF", cabezalesPorPlaca.error);
  const cabezalesPorMarca = await client.from("cabezales").select("id").ilike("notas", "%[GEOFENCE-TEST]%");
  fallo("buscar cabezales marcados", cabezalesPorMarca.error);
  const idsCabezal = [...new Set([
    ...(cabezalesPorPlaca.data ?? []).map((row) => row.id),
    ...(cabezalesPorMarca.data ?? []).map((row) => row.id),
  ])];

  const viajesMarcados = await client.from("viajes").select("id").ilike("notas", "%[GEOFENCE-TEST]%");
  fallo("buscar viajes marcados", viajesMarcados.error);
  let viajesPorCabezal: string[] = [];
  if (idsCabezal.length > 0) {
    const resultado = await client.from("viajes").select("id").in("cabezal_id", idsCabezal);
    fallo("buscar viajes TEST-GF", resultado.error);
    viajesPorCabezal = (resultado.data ?? []).map((row) => row.id);
  }
  const idsViaje = [...new Set([
    ...(viajesMarcados.data ?? []).map((row) => row.id),
    ...viajesPorCabezal,
  ])];

  let viajesEliminados = 0;
  if (idsViaje.length > 0) {
    const resultado = await client.from("viajes").delete().in("id", idsViaje).select("id");
    fallo("eliminar viajes de prueba marcados", resultado.error);
    viajesEliminados = resultado.data?.length ?? 0;
  }

  let cabezalesEliminados = 0;
  if (idsCabezal.length > 0) {
    const resultado = await client.from("cabezales").delete().in("id", idsCabezal).select("id");
    fallo("eliminar cabezales TEST-GF/marcados", resultado.error);
    cabezalesEliminados = resultado.data?.length ?? 0;
  }

  const chasisPorPlaca = await client.from("chasis").select("id").like("placa", "TEST-GF-%");
  fallo("buscar chasis TEST-GF", chasisPorPlaca.error);
  const chasisPorMarca = await client.from("chasis").select("id").ilike("notas", "%[GEOFENCE-TEST]%");
  fallo("buscar chasis marcados", chasisPorMarca.error);
  const idsChasis = [...new Set([
    ...(chasisPorPlaca.data ?? []).map((row) => row.id),
    ...(chasisPorMarca.data ?? []).map((row) => row.id),
  ])];
  let chasisEliminados = 0;
  if (idsChasis.length > 0) {
    const resultado = await client.from("chasis").delete().in("id", idsChasis).select("id");
    fallo("eliminar chasis TEST-GF/marcados", resultado.error);
    chasisEliminados = resultado.data?.length ?? 0;
  }

  for (const fixture of fixtures) lecturasNormales.delete(fixture.viajeId);
  return { viajes: viajesEliminados, cabezales: cabezalesEliminados, chasis: chasisEliminados };
}

async function leerPaginas<T>(
  obtener: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  contexto: string,
): Promise<T[]> {
  const filas: T[] = [];
  const tamañoPagina = 1000;
  for (let desde = 0; ; desde += tamañoPagina) {
    const resultado = await obtener(desde, desde + tamañoPagina - 1);
    fallo(contexto, resultado.error);
    const pagina = resultado.data ?? [];
    filas.push(...pagina);
    if (pagina.length < tamañoPagina) return filas;
  }
}

export async function capturarLineaBaseViajesReales(): Promise<LineaBaseViajesReales> {
  const client = getSupabaseAdmin();
  const cabezalesMarcados = await client.from("cabezales").select("id").like("placa", "TEST-GF-%");
  fallo("leer cabezales marcados para línea base", cabezalesMarcados.error);
  const cabezalesConMarca = await client.from("cabezales").select("id").ilike("notas", "%[GEOFENCE-TEST]%");
  fallo("leer cabezales con marca para línea base", cabezalesConMarca.error);
  const idsCabezalPrueba = new Set([
    ...(cabezalesMarcados.data ?? []).map((row) => row.id),
    ...(cabezalesConMarca.data ?? []).map((row) => row.id),
  ]);
  const viajes = await leerPaginas(
    (desde, hasta) => client.from("viajes")
      .select("id, estado, deleted_at, updated_at, lecturas_inicio_confirm, lecturas_fuera_destino, transiciones_inferidas, notas, cabezal_id")
      .range(desde, hasta),
    "capturar viajes de línea base",
  );
  const viajesReales = viajes.filter((row) =>
    !row.notas?.includes("[GEOFENCE-TEST]") &&
    (row.cabezal_id == null || !idsCabezalPrueba.has(row.cabezal_id)),
  );
  const idsViajeReal = new Set(viajesReales.map((row) => row.id));
  const alertas = await leerPaginas(
    (desde, hasta) => client.from("alertas").select("viaje_id").range(desde, hasta),
    "contar alertas de viajes reales",
  );
  return {
    viajes: viajesReales.map((row) => ({
      id: row.id,
      estado: row.estado,
      deleted_at: row.deleted_at,
      updated_at: row.updated_at,
      lecturas_inicio_confirm: row.lecturas_inicio_confirm,
      lecturas_fuera_destino: row.lecturas_fuera_destino,
      transiciones_inferidas: row.transiciones_inferidas,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    alertasReales: alertas.filter((row) => row.viaje_id == null || idsViajeReal.has(row.viaje_id)).length,
  };
}

export function resumenFixtures(): { creados: number } {
  return { creados: fixturesCreados };
}

export function requireIntegrationGuard(): void {
  if (process.env.GEOFENCE_IT !== "1" || process.env.GEOFENCE_IT_CONFIRM_NO_WEBHOOK !== "1") {
    throw new Error("Defina GEOFENCE_IT=1 y GEOFENCE_IT_CONFIRM_NO_WEBHOOK=1 solo con el webhook de alertas apagado o en BD de prueba.");
  }
  const faltantes = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ].filter((nombre) => !process.env[nombre]?.trim());
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan variables de Supabase: ${faltantes.join(", ")}. Agréguelas localmente a .env.local; no comparta sus valores.`,
    );
  }

  if (!supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL no es válida. Revise la URL en .env.local.");
    }
    supabaseAdmin = createClient<Database>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    if (!hostObjetivoRegistrado) {
      console.log(`BD objetivo: ${host}`);
      hostObjetivoRegistrado = true;
    }
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ESTADOS_ACTIVOS,
  evaluarGeofencePuro,
  GEOFENCE_FALLBACK,
  type Coordenada,
  type MotivoGeofence,
} from "@/lib/geofence";
import type { Database, Json } from "@/types/database";
import type { EstadoViaje } from "@/types";

export interface TrackerGeofenceState {
  tracker_id: number;
  cabezal_id: string | null;
  lat: number | null;
  lng: number | null;
  velocidad?: number | null;
  ultima_senal_at?: string | null;
}

type EstadoActivo = (typeof ESTADOS_ACTIVOS)[number];
type Db = SupabaseClient<Database>;
type ViajeEvaluable = Pick<
  Database["public"]["Tables"]["viajes"]["Row"],
  | "id"
  | "estado"
  | "cabezal_id"
  | "lat_origen"
  | "lng_origen"
  | "fecha_inicio"
  | "fecha_estimada"
  | "radio_destino_metros"
  | "lat_destino"
  | "lng_destino"
  | "created_at"
  | "lecturas_inicio_confirm"
  | "lecturas_fuera_destino"
>;

export interface ViajeSeleccion {
  evaluables: ViajeEvaluable[];
  descartados: Array<{
    viaje: ViajeEvaluable;
    razon: "cabezal_ocupado" | "fuera_de_ventana";
  }>;
}

export interface GeofenceProcessEvent {
  viajeId: string;
  estadoAnterior: EstadoViaje;
  estadoNuevo?: EstadoViaje;
  accion:
    | "cambio_estado"
    | "contador"
    | "sin_cambio"
    | "lectura_descartada"
    | "alerta_generada"
    | "sin_tracker"
    | "sin_posicion"
    | "cabezal_ocupado"
    | "fuera_de_ventana"
    | "error";
  motivo: string;
  inferidas: string[];
  distanciaOrigenM: number | null;
  distanciaDestinoM: number | null;
  error?: string;
}

interface GeofenceEstado {
  viaje_id: string;
  ultima_lat: number | null;
  ultima_lng: number | null;
  ultima_lectura_at: string | null;
  en_origen_visto: boolean;
  max_dist_origen_m: number;
}

interface ConfigGeofence {
  radio_inicio_m: number;
  radio_llegada_m: number;
  radio_salida_m: number;
  radio_retorno_m: number;
  lecturas_para_inicio: number;
  lecturas_para_salida: number;
  velocidad_max_plausible_kmh: number;
  tolerancia_ruido_m: number;
  max_descartes_consecutivos: number;
}

interface LecturaRpc {
  ok?: boolean;
  aceptada?: boolean;
  motivo?: string;
  distancia_m?: number | null;
  velocidad_kmh?: number | null;
  descartes_consecutivos?: number;
  error?: string;
}

interface TransicionRpc {
  ok?: boolean;
  estado_anterior?: string;
  estado_nuevo?: string;
  inferidas?: string[];
  error?: string;
}

const ESTADOS_EN_CURSO = new Set<EstadoActivo>([
  "en_transito",
  "en_destino",
  "de_vuelta",
]);

export function seleccionarViajesEvaluables(
  viajes: ViajeEvaluable[],
  ahora: Date,
): ViajeSeleccion {
  const descartados: ViajeSeleccion["descartados"] = [];
  const evaluables: ViajeEvaluable[] = [];
  const cabezalesEnCurso = new Set(
    viajes
      .filter((viaje) => ESTADOS_EN_CURSO.has(viaje.estado as EstadoActivo))
      .map((viaje) => viaje.cabezal_id)
      .filter((id): id is string => Boolean(id)),
  );
  const programadosPorCabezal = new Map<string, ViajeEvaluable[]>();
  const limite = ahora.getTime() + 4 * 60 * 60 * 1000;

  for (const viaje of viajes) {
    if (viaje.estado === "programado" && viaje.cabezal_id) {
      const grupo = programadosPorCabezal.get(viaje.cabezal_id) ?? [];
      grupo.push(viaje);
      programadosPorCabezal.set(viaje.cabezal_id, grupo);
    }
  }

  const primeroPorCabezal = new Map<string, string>();
  for (const [cabezalId, grupo] of programadosPorCabezal) {
    grupo.sort((a, b) => {
      if (a.fecha_inicio === null && b.fecha_inicio !== null) return 1;
      if (a.fecha_inicio !== null && b.fecha_inicio === null) return -1;
      const diferenciaInicio = a.fecha_inicio && b.fecha_inicio
        ? Date.parse(a.fecha_inicio) - Date.parse(b.fecha_inicio)
        : 0;
      return diferenciaInicio || Date.parse(a.created_at) - Date.parse(b.created_at);
    });
    const primero = grupo[0];
    if (primero) primeroPorCabezal.set(cabezalId, primero.id);
  }

  for (const viaje of viajes) {
    if (viaje.estado !== "programado") {
      evaluables.push(viaje);
      continue;
    }
    if (viaje.cabezal_id && cabezalesEnCurso.has(viaje.cabezal_id)) {
      descartados.push({ viaje, razon: "cabezal_ocupado" });
      continue;
    }
    if (viaje.cabezal_id && primeroPorCabezal.get(viaje.cabezal_id) !== viaje.id) {
      descartados.push({ viaje, razon: "cabezal_ocupado" });
      continue;
    }
    if (viaje.fecha_inicio && Date.parse(viaje.fecha_inicio) > limite) {
      descartados.push({ viaje, razon: "fuera_de_ventana" });
      continue;
    }
    evaluables.push(viaje);
  }

  return { evaluables, descartados };
}

function esObjeto(valor: Json | null): valor is { [key: string]: Json | undefined } {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

function errorRpc(data: Json | null, error: { message: string } | null): string | null {
  if (error) return error.message;
  if (esObjeto(data) && data.ok === false) {
    return typeof data.error === "string" ? data.error : "RPC devolvió ok:false";
  }
  return null;
}

function defaultConfig(): ConfigGeofence {
  return { ...GEOFENCE_FALLBACK };
}

function paramsViaje(config: ConfigGeofence, radioDestino: number) {
  const radioLlegadaM = Math.max(radioDestino, config.radio_llegada_m);
  return {
    radioInicioM: config.radio_inicio_m,
    radioLlegadaM,
    radioSalidaM: radioLlegadaM + (config.radio_salida_m - config.radio_llegada_m),
    radioRetornoM: config.radio_retorno_m,
    lecturasParaInicio: config.lecturas_para_inicio,
    lecturasParaSalida: config.lecturas_para_salida,
    toleranciaRuidoM: config.tolerancia_ruido_m,
  };
}

export function secuenciaTransiciones(
  estadoActual: EstadoActivo,
  objetivo: EstadoViaje,
): EstadoViaje[] {
  if (estadoActual === "programado" && objetivo === "en_destino") {
    return ["en_transito", "en_destino"];
  }
  if (estadoActual === "en_transito" && objetivo === "finalizado") {
    return ["en_destino", "de_vuelta", "finalizado"];
  }
  if (estadoActual === "en_destino" && objetivo === "finalizado") {
    return ["de_vuelta", "finalizado"];
  }
  return [objetivo];
}

export async function procesarGeofenceViajes(
  supabase: Db,
  trackers: TrackerGeofenceState[],
  opciones?: { ahora?: Date },
): Promise<{ eventos: GeofenceProcessEvent[]; error: string | null }> {
  const ahora = opciones?.ahora ?? new Date();
  const eventos: GeofenceProcessEvent[] = [];
  const { data: configRow, error: configError } = await supabase
    .from("geofence_config")
    .select("*")
    .limit(1)
    .maybeSingle();
  const config: ConfigGeofence = configError || !configRow
    ? defaultConfig()
    : configRow;
  if (configError || !configRow) {
    eventos.push({
      viajeId: "sistema",
      estadoAnterior: "programado",
      accion: "error",
      motivo: "geofence_config_fallback",
      inferidas: [],
      distanciaOrigenM: null,
      distanciaDestinoM: null,
      error: configError?.message ?? "geofence_config no tiene fila",
    });
  }

  const { data: viajes, error: viajesError } = await supabase
    .from("viajes")
    .select("id, estado, cabezal_id, lat_origen, lng_origen, fecha_inicio, fecha_estimada, radio_destino_metros, lat_destino, lng_destino, created_at, lecturas_inicio_confirm, lecturas_fuera_destino")
    .is("deleted_at", null)
    .in("estado", [...ESTADOS_ACTIVOS]);
  if (viajesError) return { eventos, error: viajesError.message };

  const listaViajes = (viajes ?? []) as ViajeEvaluable[];
  const viajeIds = listaViajes.map((viaje) => viaje.id);
  let estados: GeofenceEstado[] = [];
  if (viajeIds.length > 0) {
    const { data, error } = await supabase
      .from("geofence_viaje_estado")
      .select("viaje_id, ultima_lat, ultima_lng, ultima_lectura_at, en_origen_visto, max_dist_origen_m")
      .in("viaje_id", viajeIds);
    if (error) return { eventos, error: error.message };
    estados = (data ?? []) as GeofenceEstado[];
  }
  const estadoPorViaje = new Map(estados.map((estado) => [estado.viaje_id, estado]));
  const trackersPorCabezal = new Map(
    trackers.filter((tracker) => tracker.cabezal_id).map((tracker) => [tracker.cabezal_id!, tracker]),
  );
  const seleccion = seleccionarViajesEvaluables(listaViajes, ahora);

  for (const descartado of seleccion.descartados) {
    eventos.push({
      viajeId: descartado.viaje.id,
      estadoAnterior: descartado.viaje.estado,
      accion: descartado.razon,
      motivo: descartado.razon,
      inferidas: [],
      distanciaOrigenM: null,
      distanciaDestinoM: null,
    });
  }

  for (const viaje of seleccion.evaluables) {
    const tracker = viaje.cabezal_id ? trackersPorCabezal.get(viaje.cabezal_id) : undefined;
    if (!tracker) {
      eventos.push({
        viajeId: viaje.id,
        estadoAnterior: viaje.estado,
        accion: "sin_tracker",
        motivo: "sin_tracker",
        inferidas: [],
        distanciaOrigenM: null,
        distanciaDestinoM: null,
      });
      continue;
    }
    if (viaje.estado === "en_transito" && tracker.ultima_senal_at) {
      const { data: inactividadData, error: inactividadError } = await supabase.rpc(
        "geofence_verificar_inactividad_viaje",
        {
          p_viaje_id: viaje.id,
          p_ultima_senal_at: tracker.ultima_senal_at,
        },
      );
      const inactividadJson = inactividadData as Json | null;
      const error = errorRpc(inactividadJson, inactividadError);
      const inactividad = inactividadJson as {
        alerta_generada?: boolean;
        etapa_alerta?: number;
        minutos_sin_senal?: number;
        senal_recuperada?: boolean;
        error?: string;
      } | null;
      if (error || inactividad?.error) {
        eventos.push({
          viajeId: viaje.id,
          estadoAnterior: viaje.estado,
          accion: "error",
          motivo: "verificar_inactividad",
          inferidas: [],
          distanciaOrigenM: null,
          distanciaDestinoM: null,
          error: error ?? inactividad?.error,
        });
      } else if (inactividad?.alerta_generada) {
        eventos.push({
          viajeId: viaje.id,
          estadoAnterior: viaje.estado,
          accion: "alerta_generada",
          motivo: `inactividad_prolongada_etapa_${inactividad.etapa_alerta ?? 0}_${inactividad.minutos_sin_senal ?? 0}_minutos`,
          inferidas: [],
          distanciaOrigenM: null,
          distanciaDestinoM: null,
        });
      }
    }
    if (tracker.lat === null || tracker.lng === null) {
      eventos.push({
        viajeId: viaje.id,
        estadoAnterior: viaje.estado,
        accion: "sin_posicion",
        motivo: "sin_posicion",
        inferidas: [],
        distanciaOrigenM: null,
        distanciaDestinoM: null,
      });
      continue;
    }

    const estadoLeido = estadoPorViaje.get(viaje.id);
    const previa: Coordenada | null = estadoLeido?.ultima_lat !== null &&
      estadoLeido?.ultima_lat !== undefined &&
      estadoLeido.ultima_lng !== null
      ? { lat: estadoLeido.ultima_lat, lng: estadoLeido.ultima_lng }
      : null;
    const previaAt = estadoLeido?.ultima_lectura_at ?? null;
    const { data: lecturaData, error: lecturaError } = await supabase.rpc(
      "geofence_registrar_lectura",
      {
        p_viaje_id: viaje.id,
        p_lat: tracker.lat,
        p_lng: tracker.lng,
        p_ts: ahora.toISOString(),
        p_tracker_id: tracker.tracker_id,
      },
    );
    const lecturaJson = lecturaData as Json | null;
    const mensajeError = errorRpc(lecturaJson, lecturaError);
    const lectura = lecturaJson as LecturaRpc | null;
    if (mensajeError || !lectura) {
      eventos.push({
        viajeId: viaje.id,
        estadoAnterior: viaje.estado,
        accion: "error",
        motivo: lectura?.motivo ?? "error_rpc_lectura",
        inferidas: [],
        distanciaOrigenM: null,
        distanciaDestinoM: null,
        error: mensajeError ?? "Respuesta vacía de geofence_registrar_lectura",
      });
      continue;
    }
    if (lectura.aceptada !== true) {
      eventos.push({
        viajeId: viaje.id,
        estadoAnterior: viaje.estado,
        accion: "lectura_descartada",
        motivo: lectura.motivo ?? "lectura_descartada",
        inferidas: [],
        distanciaOrigenM: null,
        distanciaDestinoM: null,
      });
      continue;
    }

    const destino = viaje.lat_destino === null || viaje.lng_destino === null
      ? null
      : { lat: viaje.lat_destino, lng: viaje.lng_destino };
    const origen = viaje.lat_origen === null || viaje.lng_origen === null
      ? null
      : { lat: viaje.lat_origen, lng: viaje.lng_origen };
    const resultado = evaluarGeofencePuro({
      estado: viaje.estado as EstadoActivo,
      actual: { lat: tracker.lat, lng: tracker.lng },
      origen,
      previa,
      dtSegundos: previaAt ? (ahora.getTime() - Date.parse(previaAt)) / 1000 : null,
      destino,
      params: paramsViaje(config, viaje.radio_destino_metros),
      lecturasInicioConfirm: viaje.lecturas_inicio_confirm ?? 0,
      lecturasFueraDestino: viaje.lecturas_fuera_destino ?? 0,
      enOrigenVisto: estadoLeido?.en_origen_visto ?? false,
      maxDistOrigenM: estadoLeido?.max_dist_origen_m ?? 0,
    });

    let evidenciaPersistida = false;
    if (
      resultado.enOrigenVisto !== (estadoLeido?.en_origen_visto ?? false) ||
      resultado.maxDistOrigenM !== (estadoLeido?.max_dist_origen_m ?? 0)
    ) {
      const { data: evidenciaActualizada, error } = await supabase.rpc(
        "geofence_actualizar_evidencia",
        {
          p_viaje_id: viaje.id,
          p_en_origen_visto: resultado.enOrigenVisto,
          p_max_dist_origen_m: resultado.maxDistOrigenM,
        },
      );
      if (error || evidenciaActualizada !== true) {
        eventos.push({
          viajeId: viaje.id,
          estadoAnterior: viaje.estado,
          accion: "error",
          motivo: "persistencia_evidencia",
          inferidas: [],
          distanciaOrigenM: resultado.distanciaOrigenPuntoM,
          distanciaDestinoM: resultado.distanciaDestinoPuntoM,
          error: error?.message ?? "No se encontró el estado de geocerca para guardar evidencia",
        });
        continue;
      }
      evidenciaPersistida = true;
    }

    if (resultado.objetivo) {
      const cadena = secuenciaTransiciones(viaje.estado as EstadoActivo, resultado.objetivo);
      const inferidas: string[] = [];
      let falloTransicion: string | null = null;
      for (const estadoNuevo of cadena) {
        const { data: transicionData, error: transicionError } = await supabase.rpc(
          "actualizar_estado_viaje_automatico",
          {
            p_viaje_id: viaje.id,
            p_estado_nuevo: estadoNuevo,
            p_fecha_timestamp: ahora.toISOString(),
          },
        );
        const transicionJson = transicionData as Json | null;
        const transicion = transicionJson as TransicionRpc | null;
        const error = errorRpc(transicionJson, transicionError);
        if (error || !transicion?.ok) {
          falloTransicion = error ?? transicion?.error ?? "RPC de transición devolvió respuesta inválida";
          break;
        }
        if (estadoNuevo !== resultado.objetivo) inferidas.push(estadoNuevo);
      }
      if (falloTransicion) {
        eventos.push({
          viajeId: viaje.id,
          estadoAnterior: viaje.estado,
          accion: falloTransicion === "estado_ya_aplicado" || falloTransicion === "transicion_invalida"
            ? "sin_cambio"
            : "error",
          motivo: falloTransicion,
          inferidas,
          distanciaOrigenM: resultado.distanciaOrigenPuntoM,
          distanciaDestinoM: resultado.distanciaDestinoPuntoM,
          ...(falloTransicion !== "estado_ya_aplicado" && falloTransicion !== "transicion_invalida"
            ? { error: falloTransicion }
            : {}),
        });
        continue;
      }
      eventos.push({
        viajeId: viaje.id,
        estadoAnterior: viaje.estado,
        estadoNuevo: resultado.objetivo,
        accion: "cambio_estado",
        motivo: resultado.motivo,
        inferidas,
        distanciaOrigenM: resultado.distanciaOrigenPuntoM,
        distanciaDestinoM: resultado.distanciaDestinoPuntoM,
      });
      continue;
    }

    const siguienteInicio = resultado.lecturasInicioConfirm;
    const siguienteFuera = resultado.lecturasFueraDestino;
    const inicioActual = viaje.lecturas_inicio_confirm ?? 0;
    const fueraActual = viaje.lecturas_fuera_destino ?? 0;
    const contadoresCambiaron = siguienteInicio !== inicioActual || siguienteFuera !== fueraActual;
    if (contadoresCambiaron) {
      const { error } = await supabase
        .from("viajes")
        .update({
          lecturas_inicio_confirm: siguienteInicio,
          lecturas_fuera_destino: siguienteFuera,
        })
        .eq("id", viaje.id)
        .eq("estado", viaje.estado)
        .eq("lecturas_inicio_confirm", inicioActual)
        .eq("lecturas_fuera_destino", fueraActual);
      if (error) {
        eventos.push({
          viajeId: viaje.id,
          estadoAnterior: viaje.estado,
          accion: "error",
          motivo: resultado.motivo,
          inferidas: [],
          distanciaOrigenM: resultado.distanciaOrigenPuntoM,
          distanciaDestinoM: resultado.distanciaDestinoPuntoM,
          error: error.message,
        });
        continue;
      }
    }
    eventos.push({
      viajeId: viaje.id,
      estadoAnterior: viaje.estado,
      accion: contadoresCambiaron || evidenciaPersistida ? "contador" : "sin_cambio",
      motivo: resultado.motivo as MotivoGeofence,
      inferidas: [],
      distanciaOrigenM: resultado.distanciaOrigenPuntoM,
      distanciaDestinoM: resultado.distanciaDestinoPuntoM,
    });
  }

  return { eventos, error: null };
}

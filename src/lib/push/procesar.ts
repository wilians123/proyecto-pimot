import type { Database } from "@/types/database";
import { clasificarErrorFcm } from "./errores";
import { construirContenido, type Contenido } from "./contenido";
import { construirMensaje, type PushMessage } from "./mensajes";

type Alerta = Pick<Database["public"]["Tables"]["alertas"]["Row"], "id" | "tipo" | "nivel" | "mensaje" | "estado" | "viaje_id">;
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "rol" | "activo">;
type Dispositivo = Pick<Database["public"]["Tables"]["dispositivos_push"]["Row"], "id" | "user_id" | "token" | "plataforma">;
type Log = Pick<Database["public"]["Tables"]["notificaciones_push_log"]["Row"], "dispositivo_id" | "estado">;

export type PushEntrada =
  | { modo: "webhook"; alertaId: string }
  | { modo: "test"; userId?: string };

export interface PushResumen {
  ok: true;
  alerta_id: string;
  destinatarios: number;
  enviados: number;
  fallidos: number;
  invalidos: number;
  omitidos: number;
}

export interface PushDeps {
  cargarAlerta: (id: string) => Promise<Alerta | null>;
  cargarDestinatarios: (userId?: string) => Promise<Profile[]>;
  cargarDispositivos: (userIds: string[]) => Promise<Dispositivo[]>;
  cargarLogsAlerta: (alertaId: string) => Promise<Log[]>;
  borrarLogsFallidos: (alertaId: string) => Promise<void>;
  insertarLogs: (filas: Database["public"]["Tables"]["notificaciones_push_log"]["Insert"][]) => Promise<void>;
  desactivarDispositivos: (ids: string[]) => Promise<void>;
  marcarAlertaEnviada: (alertaId: string) => Promise<void>;
  enviarLote: (mensajes: PushMessage[]) => Promise<Array<{ success: boolean; messageId?: string; error?: { code?: string } }>>;
}

export type ProcesarError = { ok: false; code: "alerta_no_encontrada" };

const contenidoTest: Contenido = {
  title: "🔔 Prueba PIMOT",
  body: "Notificación de prueba",
  data: { alertaId: "test", tipo: "otro", nivel: "info", url: "/?modulo=alertas" },
};

export async function procesarPush(deps: PushDeps, entrada: PushEntrada): Promise<PushResumen | ProcesarError> {
  const alerta = entrada.modo === "webhook" ? await deps.cargarAlerta(entrada.alertaId) : null;
  if (entrada.modo === "webhook" && !alerta) return { ok: false, code: "alerta_no_encontrada" };

  const perfiles = await deps.cargarDestinatarios(entrada.modo === "test" ? entrada.userId : undefined);
  const userIds = perfiles.filter((p) => p.activo && (p.rol === "admin" || p.rol === "operativo")).map((p) => p.id);
  const dispositivos = (await deps.cargarDispositivos(userIds)).filter(
    (d) => (d.plataforma === "web" || d.plataforma === "android") && userIds.includes(d.user_id),
  );

  const logsEnviados = new Set<string>();
  let omitidos = 0;
  if (entrada.modo === "webhook") {
    const logs = await deps.cargarLogsAlerta(entrada.alertaId);
    for (const log of logs) {
      if (log.estado === "enviado" && log.dispositivo_id) logsEnviados.add(log.dispositivo_id);
    }
    await deps.borrarLogsFallidos(entrada.alertaId);
  }

  const pendientes = dispositivos.filter((d) => {
    if (!logsEnviados.has(d.id)) return true;
    omitidos += 1;
    return false;
  });
  const contenido = entrada.modo === "test" ? contenidoTest : construirContenido(alerta!);
  const resultados: Array<{ dispositivo: Dispositivo; resultado: { success: boolean; messageId?: string; error?: { code?: string } } }> = [];
  for (let i = 0; i < pendientes.length; i += 500) {
    const lote = pendientes.slice(i, i + 500);
    const respuestas = await deps.enviarLote(lote.map((d) => construirMensaje(d.plataforma as "web" | "android", d.token, contenido)));
    respuestas.forEach((resultado, index) => resultados.push({ dispositivo: lote[index], resultado }));
  }

  const filas: Database["public"]["Tables"]["notificaciones_push_log"]["Insert"][] = [];
  const invalidos: string[] = [];
  let enviados = 0;
  let fallidos = 0;
  for (const { dispositivo, resultado } of resultados) {
    if (resultado.success) {
      enviados += 1;
      if (entrada.modo === "webhook") filas.push({ alerta_id: entrada.alertaId, dispositivo_id: dispositivo.id, user_id: dispositivo.user_id, plataforma: dispositivo.plataforma, estado: "enviado", fcm_message_id: resultado.messageId ?? null });
      continue;
    }
    const estado = clasificarErrorFcm(resultado.error?.code);
    if (estado === "token_invalido") {
      invalidos.push(dispositivo.id);
    } else {
      fallidos += 1;
    }
    if (entrada.modo === "webhook") filas.push({ alerta_id: entrada.alertaId, dispositivo_id: dispositivo.id, user_id: dispositivo.user_id, plataforma: dispositivo.plataforma, estado, error: estado === "fallido" ? resultado.error?.code ?? null : null });
  }
  if (invalidos.length) await deps.desactivarDispositivos(invalidos);
  if (filas.length && entrada.modo === "webhook") {
    try {
      await deps.insertarLogs(filas);
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") console.warn("[push] conflicto de idempotencia al insertar logs");
      else throw error;
    }
  }
  if (entrada.modo === "webhook" && enviados > 0 && alerta?.estado === "pendiente") await deps.marcarAlertaEnviada(entrada.alertaId);
  return { ok: true, alerta_id: entrada.modo === "webhook" ? entrada.alertaId : "test", destinatarios: dispositivos.length, enviados, fallidos, invalidos: invalidos.length, omitidos };
}

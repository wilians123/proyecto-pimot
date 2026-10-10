import { NextResponse } from "next/server";
import { getFirebaseMessaging } from "@/lib/firebase-admin";
import { supabaseAdmin } from "@/lib/supabase-server";
import { secretoValido } from "@/lib/push/auth";
import { procesarPush, type PushDeps } from "@/lib/push/procesar";
import type { Database } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const esperado = process.env.PUSH_WEBHOOK_SECRET;
  if (!esperado) return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });
  if (!secretoValido(req.headers.get("x-webhook-secret"), esperado)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) return NextResponse.json({ error: "Entrada inválida" }, { status: 400 });
  const data = cuerpo as Record<string, unknown>;
  let entrada: Parameters<typeof procesarPush>[1];
  if (data.test === true && (data.user_id === undefined || typeof data.user_id === "string")) {
    entrada = { modo: "test", userId: data.user_id as string | undefined };
  } else {
    const record = data.record as Record<string, unknown> | undefined;
    if (data.type !== "INSERT" || data.table !== "alertas" || !record || typeof record.id !== "string" || !record.id) {
      return NextResponse.json({ error: "Entrada inválida" }, { status: 400 });
    }
    entrada = { modo: "webhook", alertaId: record.id };
  }

  try {
    const messaging = getFirebaseMessaging();
    const deps: PushDeps = {
      cargarAlerta: async (id) => {
        const { data: alerta, error } = await supabaseAdmin.from("alertas").select("id, tipo, nivel, mensaje, estado, viaje_id").eq("id", id).maybeSingle();
        if (error) throw error;
        return alerta as Database["public"]["Tables"]["alertas"]["Row"] | null;
      },
      cargarDestinatarios: async (userId) => {
        let query = supabaseAdmin.from("profiles").select("id, rol, activo").eq("activo", true).in("rol", ["admin", "operativo"]);
        if (userId) query = query.eq("id", userId);
        const { data: perfiles, error } = await query;
        if (error) throw error;
        return perfiles ?? [];
      },
      cargarDispositivos: async (userIds) => {
        if (!userIds.length) return [];
        const { data: dispositivos, error } = await supabaseAdmin.from("dispositivos_push").select("id, user_id, token, plataforma").eq("activo", true).in("user_id", userIds).in("plataforma", ["web", "android"]);
        if (error) throw error;
        return dispositivos ?? [];
      },
      cargarLogsAlerta: async (alertaId) => {
        const { data: logs, error } = await supabaseAdmin.from("notificaciones_push_log").select("dispositivo_id, estado").eq("alerta_id", alertaId);
        if (error) throw error;
        return logs ?? [];
      },
      borrarLogsFallidos: async (alertaId) => {
        const { error } = await supabaseAdmin.from("notificaciones_push_log").delete().eq("alerta_id", alertaId).eq("estado", "fallido");
        if (error) throw error;
      },
      insertarLogs: async (filas) => {
        const { error } = await supabaseAdmin.from("notificaciones_push_log").insert(filas);
        if (error) throw error;
      },
      desactivarDispositivos: async (ids) => {
        const { error } = await supabaseAdmin.from("dispositivos_push").update({ activo: false }).in("id", ids);
        if (error) throw error;
      },
      marcarAlertaEnviada: async (alertaId) => {
        const { error } = await supabaseAdmin.from("alertas").update({ estado: "enviada", canal_push: true }).eq("id", alertaId).eq("estado", "pendiente");
        if (error) throw error;
      },
      enviarLote: async (mensajes) => {
        const response = await messaging.sendEach(mensajes);
        return response.responses.map((item) => ({ success: item.success, messageId: item.messageId, error: item.error ? { code: item.error.code } : undefined }));
      },
    };
    const resultado = await procesarPush(deps, entrada);
    if (!resultado.ok) return NextResponse.json({ error: resultado.code }, { status: 404 });
    return NextResponse.json(resultado);
  } catch (error) {
    if (error instanceof Error && error.message === "Faltan variables FIREBASE_*") return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });
    console.error("[push] procesamiento fallido");
    return NextResponse.json({ error: "Error interno al procesar la notificación" }, { status: 500 });
  }
}

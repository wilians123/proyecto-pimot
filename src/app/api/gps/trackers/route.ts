// =============================================================
// Lee la tabla navixy_trackers desde Supabase (con su cabezal
// vinculado) y devuelve la lista al cliente.
// Esto permite que MapaFlota muestre etiquetas reales y vincule
// cada marcador GPS con su cabezal en el sistema.
// =============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function GET(): Promise<NextResponse> {
  // Usar service role para leer sin depender de cookies de sesión
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await supabaseAdmin
    .from("navixy_trackers")
    .select(
      "tracker_id, label, activo, cabezal:cabezales(id, placa, marca, estado)",
    )
    .eq("activo", true)
    .order("tracker_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ trackers: data ?? [] });
}

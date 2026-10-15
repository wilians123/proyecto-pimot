import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const yes = args.has("--yes");
const allowRemote = args.has("--allow-remote");
const intervalArg = process.argv.find((arg) => arg.startsWith("--interval-ms="));
const intervalMs = intervalArg
  ? Number(intervalArg.slice("--interval-ms=".length))
  : Number(process.env.GEOFENCE_POLL_INTERVAL_MS ?? 15_000);
const baseUrl = process.env.GEOFENCE_BASE_URL ?? "http://localhost:3000";
const secret = process.env.GEOFENCE_CRON_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let parsedUrl;
try {
  parsedUrl = new URL(baseUrl);
} catch {
  console.error("GEOFENCE_BASE_URL no es una URL válida.");
  process.exit(1);
}
const esLocal = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
if (!esLocal && !allowRemote) {
  console.error("El sondeo se limita a localhost. Usa --allow-remote para habilitar una URL remota.");
  process.exit(1);
}
if (!secret || !supabaseUrl || !serviceRoleKey) {
  console.error("Faltan variables requeridas en el entorno local.");
  process.exit(1);
}
if (!Number.isFinite(intervalMs) || intervalMs < 1000) {
  console.error("El intervalo debe ser un número de al menos 1000 ms.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const estadosActivos = ["programado", "en_transito", "en_destino", "de_vuelta"];
const estadosEnCurso = new Set(["en_transito", "en_destino", "de_vuelta"]);

function seleccionarParaConfirmacion(viajes, trackerHeads, ahora = new Date()) {
  const enCurso = new Set(
    viajes.filter((v) => estadosEnCurso.has(v.estado) && v.cabezal_id).map((v) => v.cabezal_id),
  );
  const programados = new Map();
  for (const viaje of viajes) {
    if (viaje.estado !== "programado" || !viaje.cabezal_id) continue;
    const grupo = programados.get(viaje.cabezal_id) ?? [];
    grupo.push(viaje);
    programados.set(viaje.cabezal_id, grupo);
  }
  const primero = new Map();
  for (const [cabezalId, grupo] of programados) {
    grupo.sort((a, b) => {
      if (a.fecha_inicio === null && b.fecha_inicio !== null) return 1;
      if (a.fecha_inicio !== null && b.fecha_inicio === null) return -1;
      return (a.fecha_inicio ? Date.parse(a.fecha_inicio) : 0) -
        (b.fecha_inicio ? Date.parse(b.fecha_inicio) : 0) ||
        Date.parse(a.created_at) - Date.parse(b.created_at);
    });
    primero.set(cabezalId, grupo[0]?.id);
  }
  const maxStart = ahora.getTime() + 4 * 60 * 60 * 1000;
  return viajes.filter((viaje) => {
    if (!viaje.cabezal_id || !trackerHeads.has(viaje.cabezal_id)) return false;
    if (viaje.estado !== "programado") return true;
    if (enCurso.has(viaje.cabezal_id)) return false;
    if (primero.get(viaje.cabezal_id) !== viaje.id) return false;
    return !viaje.fecha_inicio || Date.parse(viaje.fecha_inicio) <= maxStart;
  });
}

const { data: viajes, error: viajesError } = await supabase
  .from("viajes")
  .select("id, codigo, estado, cabezal_id, fecha_inicio, created_at")
  .in("estado", estadosActivos)
  .is("deleted_at", null);
if (viajesError) {
  console.error("No se pudieron leer los viajes activos; el sondeo no iniciará.");
  process.exit(1);
}
const { data: cabezales, error: cabezalesError } = await supabase
  .from("navixy_trackers")
  .select("cabezal_id")
  .eq("activo", true)
  .not("cabezal_id", "is", null);
if (cabezalesError) {
  console.error("No se pudieron leer los vínculos GPS; el sondeo no iniciará.");
  process.exit(1);
}
const trackerHeads = new Set(cabezales.map((tracker) => tracker.cabezal_id));
const cabezalLabels = new Map(
  (await supabase.from("cabezales").select("id, placa")).data?.map((c) => [c.id, c.placa]) ?? [],
);
const evaluables = seleccionarParaConfirmacion(viajes ?? [], trackerHeads);

console.log("Viajes activos que el procesador evaluará al iniciar:");
if (evaluables.length === 0) console.log("  (ninguno)");
for (const viaje of evaluables) {
  console.log(`  ${viaje.codigo ?? viaje.id} · ${viaje.estado} · ${cabezalLabels.get(viaje.cabezal_id) ?? "sin placa"}`);
}

if (!yes) {
  if (!process.stdin.isTTY) {
    console.error("Se requiere una terminal interactiva; usa --yes solo si confirmas el impacto en viajes activos.");
    process.exit(1);
  }
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const confirmacion = await readline.question("El sondeo puede cambiar estados y generar alertas reales. ¿Continuar? (s/N) ");
  readline.close();
  if (confirmacion.trim().toLocaleLowerCase("es-GT") !== "s") {
    console.log("Sondeo cancelado.");
    process.exit(0);
  }
}

const endpoint = new URL("/api/geofence/process", baseUrl).toString();
console.log(`Sondeo activo cada ${intervalMs} ms en ${endpoint}`);
while (true) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "x-cron-secret": secret },
    });
    if (!response.ok) {
      console.error(`Geofence respondió HTTP ${response.status}`);
    } else {
      const result = await response.json();
      console.log(new Date().toISOString(), JSON.stringify(result.resumen ?? {}));
    }
  } catch (error) {
    console.error("Error consultando el endpoint de geocercas:", error instanceof Error ? error.message : "error desconocido");
  }
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

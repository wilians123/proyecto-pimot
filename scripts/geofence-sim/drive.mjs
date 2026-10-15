import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.GEOFENCE_CRON_SECRET;
const baseUrl = process.env.GEOFENCE_BASE_URL ?? "http://localhost:3000";
if (!supabaseUrl || !serviceRoleKey || !secret) {
  console.error("Faltan variables requeridas en el entorno local.");
  process.exit(1);
}
const base = new URL(baseUrl);
if (!["localhost", "127.0.0.1", "::1"].includes(base.hostname) && !process.argv.includes("--allow-remote")) {
  console.error("drive.mjs se limita a localhost. Usa --allow-remote para habilitar una URL remota.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const origen = { lat: 15.640187, lng: -88.546492 };
const destinoPredeterminado = { lat: 15.678341, lng: -88.506870 };
const R = 6_371_000;
const dist = (a, b) => {
  const rad = (v) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, q)));
};
const puntoRuta = (destino, metros) => {
  const total = dist(origen, destino);
  const f = Math.max(0, Math.min(1.2, metros / total));
  return { lat: origen.lat + (destino.lat - origen.lat) * f, lng: origen.lng + (destino.lng - origen.lng) * f };
};
const puntoEn = (metros, cadencia = 1) => Object.assign(
  (destino) => puntoRuta(destino, metros),
  { cadencia },
);

const { data: viajes, error } = await supabase
  .from("viajes")
  .select("id, codigo, estado, cabezal_id, lat_destino, lng_destino, notas, cabezal:cabezales(id, placa)")
  .like("notas", "%[GEOFENCE-TEST]%")
  .in("estado", ["programado", "en_transito", "en_destino", "de_vuelta"])
  .is("deleted_at", null);
if (error) {
  console.error("No se pudieron cargar los viajes de prueba.");
  process.exit(1);
}

const porPlaca = new Map((viajes ?? []).map((viaje) => [viaje.cabezal?.placa, viaje]));
const endpoint = new URL("/api/geofence/simulate", base).toString();
let reloj = Date.now();

async function enviar(nombreRuta, viaje, puntos) {
  if (!viaje) {
    console.log(`${nombreRuta}: omitida; no hay un viaje de prueba activo para esa placa.`);
    return;
  }
  const destino = viaje.lat_destino !== null && viaje.lng_destino !== null
    ? { lat: viaje.lat_destino, lng: viaje.lng_destino }
    : destinoPredeterminado;
  console.log(`Ruta ${nombreRuta} · ${viaje.codigo ?? viaje.id}`);
  for (let i = 0; i < puntos.length; i++) {
    const paso = puntos[i];
    const punto = typeof paso === "function" ? paso(destino) : paso;
    reloj += 15_000 * (paso.cadencia ?? 1);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": secret },
      body: JSON.stringify({
        posiciones: [{ cabezal_id: viaje.cabezal_id, lat: punto.lat, lng: punto.lng }],
        ahora: new Date(reloj).toISOString(),
      }),
    });
    if (!response.ok) {
      console.error(`  Paso ${i + 1}: HTTP ${response.status}`);
      return;
    }
    const result = await response.json();
    const { data: estado, error: estadoError } = await supabase
      .from("viajes")
      .select("estado, transiciones_inferidas")
      .eq("id", viaje.id)
      .maybeSingle();
    if (estadoError) {
      console.error(`  Paso ${i + 1}: no se pudo leer el estado.`);
      return;
    }
    const evento = result.eventos?.find((item) => item.viajeId === viaje.id);
    const inferidas = estado?.transiciones_inferidas?.length
      ? ` · inferidas: ${estado.transiciones_inferidas.join(",")}`
      : "";
    console.log(`  ${i + 1}/${puntos.length} · ${estado?.estado ?? "sin estado"} · ${evento?.accion ?? "sin evento"}${inferidas}`);
  }
}

function rutaNormal(destino) {
  const total = dist(origen, destino);
  const puntos = [0, 20, -20, 15, 650, 700, 1100];
  for (let d = 1300; d < total - 100; d += 417) puntos.push(d);
  puntos.push(total);
  puntos.push(puntoEn(total - 700, 4), total - 750);
  for (let d = total - 1100; d > 0; d -= 417) puntos.push(d);
  puntos.push(0);
  return puntos.map((d) => typeof d === "function" ? d : puntoEn(d));
}

function rutaOrigenSaltado(destino) {
  const total = dist(origen, destino);
  const puntos = [1700];
  for (let d = 2100; d < total - 100; d += 417) puntos.push(d);
  puntos.push(total);
  return puntos.map((d) => puntoEn(d));
}

function rutaDestinoSaltado(destino) {
  const total = dist(origen, destino);
  const puntos = [0, 0, 650, 700, 1100];
  for (let d = 1517; d < total - 700; d += 417) puntos.push(d);
  puntos.push(total - 700, puntoEn(total + 700, 4), puntoEn(total - 700, 4), total - 1100);
  for (let d = total - 1500; d > 0; d -= 417) puntos.push(d);
  puntos.push(0);
  return puntos.map((d) => typeof d === "function" ? d : puntoEn(d));
}

await enviar("A · ruta normal", porPlaca.get("TEST-GF-A"), rutaNormal(destinoPredeterminado));
await enviar("B · origen saltado", porPlaca.get("TEST-GF-B"), rutaOrigenSaltado(destinoPredeterminado));
await enviar("C · destino saltado", porPlaca.get("TEST-GF-C"), rutaDestinoSaltado(destinoPredeterminado));
const maestro = porPlaca.get("TEST-GF-MAESTRO");
if (maestro) {
  const destMaestro = maestro.lat_destino !== null && maestro.lng_destino !== null
    ? { lat: maestro.lat_destino, lng: maestro.lng_destino }
    : destinoPredeterminado;
  await enviar("maestro · recorrido integral", maestro, rutaNormal(destMaestro));
} else {
  console.log("Ruta maestro: omitida; TEST-GF-MAESTRO solo existe mientras corre la prueba de integración §8.7.");
}

import {
  CADENCIA_S,
  capturarLineaBaseViajesReales,
  crearFixture,
  DESTINO_PRUEBA,
  enRuta,
  estadoGeofence,
  filas,
  guardarEstadoGeofence,
  getSupabaseAdmin,
  integrationEnabled,
  limpiarResiduos,
  mismoInstante,
  procesar,
  procesarNormal,
  puntoNorte,
  reiniciarContadoresFixtures,
  registrarFixtureMarcadoCreado,
  requireIntegrationGuard,
  resumenFixtures,
  T0,
  viaje,
} from "@/services/__tests__/geofence-it.helpers";
import { haversineMetros, ORIGEN_PIMOT } from "@/lib/geofence";

const describeIT = integrationEnabled ? describe : describe.skip;
const distanciaRutaM = haversineMetros(
  ORIGEN_PIMOT.lat,
  ORIGEN_PIMOT.lng,
  DESTINO_PRUEBA.lat,
  DESTINO_PRUEBA.lng,
);
let lineaBase: Awaited<ReturnType<typeof capturarLineaBaseViajesReales>>;
let fixture: Awaited<ReturnType<typeof crearFixture>>;
let segundos = 0;
let updatedAlCrear = "";
let faseFallida: string | null = null;

function itFase(fase: string, nombre: string, prueba: () => Promise<void>): void {
  it(`fase ${fase}: ${nombre}`, async () => {
    if (faseFallida) {
      throw new Error(`Bloqueada por fallo previo en la fase ${faseFallida}`);
    }
    try {
      await prueba();
    } catch (error) {
      faseFallida = fase;
      throw error;
    }
  }, 240_000);
}

describeIT("viaje maestro integral de geocercas", () => {
  beforeAll(async () => {
    requireIntegrationGuard();
    await limpiarResiduos();
    reiniciarContadoresFixtures();
    lineaBase = await capturarLineaBaseViajesReales();
    fixture = await crearFixture("MAESTRO", {
      placa: "TEST-GF-MAESTRO",
      fechaInicio: T0.toISOString(),
      fechaEstimada: new Date(T0.getTime() + 4 * 60_000).toISOString(),
    });
    updatedAlCrear = (await viaje(fixture)).updated_at ?? "";
  }, 120_000);

  afterAll(async () => {
    const eliminados = await limpiarResiduos();
    const actual = await capturarLineaBaseViajesReales();
    const comparacionCorrecta = JSON.stringify(actual) === JSON.stringify(lineaBase);
    const fixtures = resumenFixtures();
    console.log(`Limpieza viaje maestro: fixtures creados=${fixtures.creados}; viajes eliminados=${eliminados.viajes}; cabezales eliminados=${eliminados.cabezales}; chasis eliminados=${eliminados.chasis}; línea base real=${comparacionCorrecta ? "sin cambios" : "DIFERENCIAS"}.`);
    expect(actual).toEqual(lineaBase);
  }, 120_000);

  itFase("A", "el jitter del origen no inicia el viaje ni actualiza viajes.updated_at", async () => {
    segundos += CADENCIA_S;
    expect(getSupabaseAdmin()).toBeDefined();
    for (let i = 0; i < 4; i++) {
      await procesarNormal(fixture, puntoNorte(ORIGEN_PIMOT, i % 2 ? -30 : 30), segundos);
      segundos += CADENCIA_S;
    }
    expect((await viaje(fixture)).estado).toBe("programado");
    expect((await estadoGeofence(fixture))?.en_origen_visto).toBe(true);
    expect((await viaje(fixture)).lecturas_inicio_confirm).toBe(0);
    expect((await viaje(fixture)).updated_at).toBe(updatedAlCrear);
  });

  itFase("B", "confirma salida con dos lecturas plausibles", async () => {
    segundos += CADENCIA_S;
    await procesarNormal(fixture, enRuta(600), segundos);
    segundos += CADENCIA_S;
    await procesarNormal(fixture, enRuta(700), segundos);
    const horaSalida = new Date(T0.getTime() + segundos * 1000).toISOString();
    expect((await viaje(fixture)).estado).toBe("en_transito");
    expect(mismoInstante((await viaje(fixture)).fecha_inicio, horaSalida)).toBe(true);
    expect((await viaje(fixture)).bloqueado).toBe(true);
    expect((await filas("alertas", fixture)).map((alerta) => alerta.tipo)).toEqual(["inicio_viaje"]);
    segundos += CADENCIA_S;
  });

  itFase("C", "las lecturas estacionarias conservan el estado", async () => {
    segundos += CADENCIA_S;
    const parada = enRuta(700);
    const updatedAntesParada = (await viaje(fixture)).updated_at;
    let ultimaLeidaAt = (await estadoGeofence(fixture))?.ultima_lectura_at;
    for (let i = 0; i < 6; i++) {
      await procesarNormal(fixture, parada, segundos);
      segundos += CADENCIA_S;
      const estado = await estadoGeofence(fixture);
      ultimaLeidaAt = estado?.ultima_lectura_at;
      expect(estado?.ultima_velocidad_kmh).toBe(0);
    }
    expect((await viaje(fixture)).estado).toBe("en_transito");
    expect((await viaje(fixture)).lecturas_inicio_confirm).toBe(0);
    expect((await viaje(fixture)).lecturas_fuera_destino).toBe(0);
    expect((await viaje(fixture)).updated_at).toBe(updatedAntesParada);
    expect(mismoInstante(ultimaLeidaAt, new Date(T0.getTime() + (segundos - CADENCIA_S) * 1000).toISOString())).toBe(true);
    // El siguiente punto normal debe quedar a 15 s de la última lectura estacionaria.
    segundos -= CADENCIA_S;
  });

  itFase("D", "acepta 144 km/h, descarta el pico y registra exactamente un descarte", async () => {
    segundos += CADENCIA_S;
    const puntoAceptadoD = 700 + 600;
    await procesarNormal(fixture, enRuta(puntoAceptadoD), segundos);
    expect((await estadoGeofence(fixture))?.ultima_lat).toBeCloseTo(enRuta(puntoAceptadoD).lat, 6);
    const antesPico = await estadoGeofence(fixture);
    segundos += CADENCIA_S;
    await procesar(fixture, enRuta(puntoAceptadoD + 1000), segundos);
    expect((await viaje(fixture)).estado).toBe("en_transito");
    expect((await estadoGeofence(fixture))?.ultima_lat).toBeCloseTo(antesPico?.ultima_lat ?? 0, 6);
    expect((await filas("geofence_eventos", fixture)).filter((evento) => evento.tipo === "lectura_descartada")).toHaveLength(1);
    expect((await filas("alertas", fixture)).some((alerta) => alerta.tipo === "velocidad_excesiva")).toBe(false);
  });

  itFase("E", "pérdida temporal y reaparición tras 120 s, más variante de diez minutos", async () => {
    segundos += CADENCIA_S;
    const estadoAntesPerdida = await estadoGeofence(fixture);
    const updatedAntesPerdida = (await viaje(fixture)).updated_at;
    const segundosUltimaAceptada = estadoAntesPerdida?.ultima_lectura_at
      ? (Date.parse(estadoAntesPerdida.ultima_lectura_at) - T0.getTime()) / 1000
      : segundos;
    for (let i = 1; i <= 8; i++) {
      segundos = segundosUltimaAceptada + i * CADENCIA_S;
      const respuesta = await procesar(fixture, { lat: null, lng: null }, segundos);
      expect(respuesta.eventos.find((evento) => evento.viajeId === fixture.viajeId)?.accion).toBe("sin_posicion");
    }
    const estadoTrasPerdida = await estadoGeofence(fixture);
    expect(estadoTrasPerdida?.ultima_lat).toBe(estadoAntesPerdida?.ultima_lat);
    expect(estadoTrasPerdida?.ultima_lng).toBe(estadoAntesPerdida?.ultima_lng);
    expect(estadoTrasPerdida?.ultima_lectura_at).toBe(estadoAntesPerdida?.ultima_lectura_at);
    expect((await viaje(fixture)).updated_at).toBe(updatedAntesPerdida);
    const puntoReaparicion = enRuta(4300);
    segundos = segundosUltimaAceptada + 120;
    await procesarNormal(fixture, puntoReaparicion, segundos);
    expect((await estadoGeofence(fixture))?.ultima_lat).toBeCloseTo(puntoReaparicion.lat, 6);
    expect((await viaje(fixture)).updated_at).toBe(updatedAntesPerdida);

    const variante = await crearFixture("MAESTRO-10M", { estado: "en_transito" });
    const p1k = enRuta(1000);
    await guardarEstadoGeofence(variante, {
      ultima_lat: p1k.lat,
      ultima_lng: p1k.lng,
      ultima_lectura_at: T0.toISOString(),
      en_origen_visto: true,
      max_dist_origen_m: 1000,
    });
    await procesarNormal(variante, enRuta(4000), 600);
    expect((await estadoGeofence(variante))?.ultima_lat).toBeCloseTo(enRuta(4000).lat, 6);
  });

  itFase("F", "llega después de la fecha estimada y oscila sobre el eje de ruta", async () => {
    segundos += CADENCIA_S;
    let estadoActual = await viaje(fixture);
    for (let metros = 4300 + 417; metros <= distanciaRutaM + 600 && estadoActual.estado === "en_transito"; metros += 417) {
      segundos += CADENCIA_S;
      await procesarNormal(fixture, enRuta(metros), segundos);
      estadoActual = await viaje(fixture);
    }
    if (estadoActual.estado === "en_transito") {
      segundos += CADENCIA_S;
      await procesarNormal(fixture, enRuta(distanciaRutaM), segundos);
      estadoActual = await viaje(fixture);
    }
    expect(estadoActual.estado).toBe("en_destino");
    expect(Date.parse(estadoActual.fecha_llegada_destino ?? "")).toBeGreaterThan(Date.parse(estadoActual.fecha_estimada ?? ""));
    expect((await filas("alertas", fixture)).filter((alerta) => alerta.tipo === "llegada_destino")).toHaveLength(1);
    expect((await filas("alertas", fixture)).some((alerta) => alerta.tipo === "retraso_operativo")).toBe(false);
    for (const [indice, metros] of [480, 520, 560, 610, 480].entries()) {
      segundos += indice === 0 ? 2 * CADENCIA_S : CADENCIA_S;
      await procesarNormal(fixture, enRuta(distanciaRutaM - metros), segundos);
      expect((await viaje(fixture)).estado).toBe("en_destino");
    }
    expect((await viaje(fixture)).lecturas_fuera_destino).toBe(0);
  });

  itFase("G", "inicia el retorno con dos lecturas fuera del radio", async () => {
    segundos += CADENCIA_S;
    segundos += 45;
    await procesarNormal(fixture, enRuta(distanciaRutaM + 660), segundos);
    segundos += CADENCIA_S;
    await procesarNormal(fixture, enRuta(distanciaRutaM + 700), segundos);
    expect((await viaje(fixture)).estado).toBe("de_vuelta");
    expect((await filas("alertas", fixture)).filter((alerta) => alerta.tipo === "retorno_viaje")).toHaveLength(1);
  });

  itFase("H", "completa el retorno con segmentos plausibles", async () => {
    segundos += CADENCIA_S;
    for (let metros = distanciaRutaM + 700 - 1700; metros > 0; metros -= 1700) {
      segundos += 60;
      await procesarNormal(fixture, enRuta(metros), segundos);
      if ((await viaje(fixture)).estado === "finalizado") break;
    }
    if ((await viaje(fixture)).estado !== "finalizado") {
      segundos += 60;
      await procesarNormal(fixture, ORIGEN_PIMOT, segundos);
    }
    const final = await viaje(fixture);
    expect(final.estado).toBe("finalizado");
    expect(final.fecha_fin).not.toBeNull();
    expect(Date.parse(final.fecha_fin ?? "")).toBeGreaterThan(Date.parse(final.fecha_estimada ?? ""));
    expect(final.bloqueado).toBe(false);
    expect(final.duracion_real_min).toBeGreaterThan(0);
    expect((await filas("alertas", fixture)).filter((alerta) => alerta.tipo === "finalizacion_viaje")).toHaveLength(1);
  });

  itFase("I", "la finalización libera el cabezal y conserva el descarte único de D", async () => {
    segundos += CADENCIA_S;
    const { error } = await getSupabaseAdmin()
      .from("viajes")
      .insert({
        origen: "Puerto Barrios",
        destino: "TEST LIBERACION",
        estado: "programado",
        cabezal_id: fixture.cabezalId,
        tipo_servicio: "flete",
        notas: "[GEOFENCE-TEST]",
      });
    if (!error) registrarFixtureMarcadoCreado();
    expect(error).toBeNull();
    expect((await filas("alertas", fixture)).map((alerta) => alerta.tipo)).toEqual([
      "inicio_viaje",
      "llegada_destino",
      "retorno_viaje",
      "finalizacion_viaje",
    ]);
    expect((await filas("alertas", fixture)).filter((alerta) =>
      ["velocidad_excesiva", "retraso_operativo", "inactividad_prolongada"].includes(alerta.tipo ?? ""),
    )).toHaveLength(0);
    expect((await filas("estado_viaje_log", fixture))).toHaveLength(4);
    expect((await viaje(fixture)).transiciones_inferidas).toEqual([]);
    expect((await filas("geofence_eventos", fixture)).filter((evento) => evento.tipo === "lectura_descartada")).toHaveLength(1);
  });
});

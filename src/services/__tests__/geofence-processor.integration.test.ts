import {
  CADENCIA_S,
  capturarLineaBaseViajesReales,
  crearChasis,
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
const rutaM = haversineMetros(ORIGEN_PIMOT.lat, ORIGEN_PIMOT.lng, DESTINO_PRUEBA.lat, DESTINO_PRUEBA.lng);
let lineaBase: Awaited<ReturnType<typeof capturarLineaBaseViajesReales>>;

describeIT("integración de geocercas S1–S19", () => {
  beforeAll(async () => {
    requireIntegrationGuard();
    await limpiarResiduos();
    reiniciarContadoresFixtures();
    lineaBase = await capturarLineaBaseViajesReales();
  }, 120_000);

  afterAll(async () => {
    const eliminados = await limpiarResiduos();
    const actual = await capturarLineaBaseViajesReales();
    const comparacionCorrecta = JSON.stringify(actual) === JSON.stringify(lineaBase);
    const fixtures = resumenFixtures();
    console.log(`Limpieza geocercas: fixtures creados=${fixtures.creados}; viajes eliminados=${eliminados.viajes}; cabezales eliminados=${eliminados.cabezales}; chasis eliminados=${eliminados.chasis}; línea base real=${comparacionCorrecta ? "sin cambios" : "DIFERENCIAS"}.`);
    expect(actual).toEqual(lineaBase);
  }, 120_000);

  it("S1: recorrido normal, retorno y finalización", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s1 = await crearFixture("S1");
    let t = 0;
    await procesarNormal(s1, ORIGEN_PIMOT, t);
    t += CADENCIA_S;
    await procesarNormal(s1, enRuta(600), t);
    t += CADENCIA_S;
    await procesarNormal(s1, enRuta(700), t);
    expect((await viaje(s1)).estado).toBe("en_transito");
    let d = 1100;
    let estado = await viaje(s1);
    while (d < rutaM + 200 && estado.estado === "en_transito") {
      t += CADENCIA_S;
      await procesarNormal(s1, enRuta(d), t);
      estado = await viaje(s1);
      d += 417;
    }
    expect(estado.estado).toBe("en_destino");
    let estadoRetorno = await viaje(s1);
    let distanciaRetorno = d - 417;
    for (let intento = 0; intento < 12 && estadoRetorno.estado === "en_destino"; intento++) {
      distanciaRetorno += 417;
      t += CADENCIA_S;
      await procesarNormal(s1, enRuta(distanciaRetorno), t);
      estadoRetorno = await viaje(s1);
    }
    expect(estadoRetorno.estado).toBe("de_vuelta");
    estado = estadoRetorno;
    for (let metros = distanciaRetorno - 417; metros > 0; metros -= 417) {
      t += CADENCIA_S;
      await procesarNormal(s1, enRuta(Math.max(0, metros)), t);
      estado = await viaje(s1);
      if (estado.estado === "finalizado") break;
    }
    if (estado.estado !== "finalizado") {
      t += CADENCIA_S;
      await procesarNormal(s1, ORIGEN_PIMOT, t);
    }
    const s1Final = await viaje(s1);
    expect(s1Final.estado).toBe("finalizado");
    expect(s1Final.transiciones_inferidas).toEqual([]);
    expect(mismoInstante(s1Final.fecha_inicio, new Date(T0.getTime() + 30_000).toISOString())).toBe(true);
    expect(s1Final.fecha_fin).not.toBeNull();
    expect(s1Final.bloqueado).toBe(false);
    expect(s1Final.duracion_real_min).toBeGreaterThanOrEqual(1);
    expect((await filas("estado_viaje_log", s1)).length).toBe(4);
    expect((await filas("alertas", s1)).map((alerta) => alerta.tipo)).toEqual([
      "inicio_viaje",
      "llegada_destino",
      "retorno_viaje",
      "finalizacion_viaje",
    ]);
  }, 240_000);

  it("S2: segmento que cruza destino a velocidad plausible", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s2 = await crearFixture("S2");
    await procesarNormal(s2, ORIGEN_PIMOT, 0);
    let estadoS2 = await viaje(s2);
    for (let segundos = 60, metros = 1700; metros < rutaM + 1700 && estadoS2.estado !== "en_destino"; segundos += 60, metros += 1700) {
      await procesarNormal(s2, enRuta(metros), segundos);
      estadoS2 = await viaje(s2);
    }
    expect(estadoS2.estado).toBe("en_destino");
  }, 240_000);

  it("S3: inferencia de inicio al perderse el origen", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s3 = await crearFixture("S3");
    let t = 0;
    await procesarNormal(s3, enRuta(1700), t);
    let estado = await viaje(s3);
    for (let metros = 2117; metros < rutaM + 200 && estado.estado === "programado"; metros += 417) {
      t += CADENCIA_S;
      await procesarNormal(s3, enRuta(metros), t);
      estado = await viaje(s3);
    }
    expect(estado.estado).toBe("en_destino");
    expect(estado.transiciones_inferidas).toEqual(["en_transito"]);
    expect(estado.fecha_inicio).not.toBeNull();
    expect((await filas("alertas", s3)).map((alerta) => alerta.tipo)).toEqual(["llegada_destino"]);
    expect((await filas("geofence_eventos", s3)).some((evento) => evento.tipo === "transicion_inferida")).toBe(true);
  }, 240_000);

  it("S4: segmento largo y confirmación de retorno", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s4 = await crearFixture("S4", { estado: "en_transito" });
    await guardarEstadoGeofence(s4, {
      ultima_lat: enRuta(rutaM - 3000).lat,
      ultima_lng: enRuta(rutaM - 3000).lng,
      ultima_lectura_at: T0.toISOString(),
      max_dist_origen_m: rutaM - 3000,
      en_origen_visto: true,
    });
    await procesarNormal(s4, enRuta(rutaM + 3000), 150);
    expect((await viaje(s4)).estado).toBe("en_destino");
    let t = 165;
    await procesarNormal(s4, enRuta(rutaM + 3500), t);
    t += CADENCIA_S;
    await procesarNormal(s4, enRuta(rutaM + 3550), t);
    expect((await viaje(s4)).estado).toBe("de_vuelta");
  }, 240_000);

  it("S5: hueco prolongado con inferencia de transiciones", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s5 = await crearFixture("S5", { estado: "en_transito" });
    const remoto = enRuta(4000);
    await guardarEstadoGeofence(s5, {
      ultima_lat: remoto.lat,
      ultima_lng: remoto.lng,
      ultima_lectura_at: T0.toISOString(),
      max_dist_origen_m: 4000,
      en_origen_visto: true,
    });
    const s5Run = await procesarNormal(s5, ORIGEN_PIMOT, 3 * 60 * 60);
    expect((await viaje(s5)).estado).toBe("finalizado");
    expect((await viaje(s5)).transiciones_inferidas).toEqual(["en_destino", "de_vuelta"]);
    expect(s5Run.error).toBeNull();
  }, 240_000);

  it("S6: jitter en el origen", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s6 = await crearFixture("S6");
    for (let i = 0; i < 10; i++) {
      await procesarNormal(s6, puntoNorte(ORIGEN_PIMOT, i % 2 ? -30 : 30), i * CADENCIA_S);
    }
    expect((await viaje(s6)).estado).toBe("programado");
    expect((await viaje(s6)).lecturas_inicio_confirm).toBe(0);
    expect((await estadoGeofence(s6))?.en_origen_visto).toBe(true);
  }, 240_000);

  it("S7: oscilaciones dentro del radio del destino", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s7 = await crearFixture("S7", { estado: "en_destino" });
    for (const [i, metros] of [480, 520, 560, 610, 480].entries()) {
      await procesarNormal(s7, puntoNorte(DESTINO_PRUEBA, metros), i * CADENCIA_S);
    }
    expect((await viaje(s7)).estado).toBe("en_destino");
    expect((await viaje(s7)).lecturas_fuera_destino).toBe(0);
  }, 240_000);

  it("S8: pico GPS aislado descartado", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s8 = await crearFixture("S8", { estado: "en_transito" });
    const p3k = enRuta(3000);
    await guardarEstadoGeofence(s8, {
      ultima_lat: p3k.lat,
      ultima_lng: p3k.lng,
      ultima_lectura_at: T0.toISOString(),
      max_dist_origen_m: 3000,
      en_origen_visto: true,
    });
    await procesar(s8, DESTINO_PRUEBA, CADENCIA_S);
    expect((await viaje(s8)).estado).toBe("en_transito");
    expect((await estadoGeofence(s8))?.ultima_lat).toBeCloseTo(p3k.lat, 6);
    await procesarNormal(s8, enRuta(3417), 2 * CADENCIA_S);
    expect((await estadoGeofence(s8))?.ultima_lat).toBeCloseTo(enRuta(3417).lat, 6);
    expect((await filas("geofence_eventos", s8)).filter((evento) => evento.tipo === "lectura_descartada")).toHaveLength(1);
  }, 240_000);

  it("S9: bloqueo tras descartes consecutivos", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s9 = await crearFixture("S9", { estado: "en_transito" });
    const p3k = enRuta(3000);
    await guardarEstadoGeofence(s9, {
      ultima_lat: p3k.lat,
      ultima_lng: p3k.lng,
      ultima_lectura_at: T0.toISOString(),
      max_dist_origen_m: 3000,
      en_origen_visto: true,
    });
    const pico = puntoNorte(ORIGEN_PIMOT, 55_000);
    for (let i = 1; i <= 4; i++) await procesar(s9, pico, i * CADENCIA_S);
    expect((await estadoGeofence(s9))?.ultima_lat).toBeCloseTo(pico.lat, 6);
    expect((await filas("geofence_eventos", s9)).filter((evento) => evento.tipo === "lectura_descartada")).toHaveLength(3);
    expect((await filas("geofence_eventos", s9)).some((evento) => evento.tipo === "rebase_tras_descartes")).toBe(true);
  }, 240_000);

  it("S10: lectura duplicada idempotente", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s10 = await crearFixture("S10");
    await procesarNormal(s10, ORIGEN_PIMOT, 0);
    await procesarNormal(s10, enRuta(600), CADENCIA_S);
    await procesarNormal(s10, enRuta(700), 2 * CADENCIA_S);
    const transicionRepetida = await procesar(s10, enRuta(700), 2 * CADENCIA_S);
    expect(transicionRepetida.error).toBeNull();
    expect((await viaje(s10)).estado).toBe("en_transito");
    expect((await filas("estado_viaje_log", s10))).toHaveLength(1);
  }, 240_000);

  it("S11: índices parciales y liberación de recursos", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s11 = await crearFixture("S11");
    const chasis = await crearChasis("S11");
    const { error: asignarChasisError } = await getSupabaseAdmin()
      .from("viajes")
      .update({ chasis_id: chasis })
      .eq("id", s11.viajeId);
    expect(asignarChasisError).toBeNull();
    const { error: mismoCabezal } = await getSupabaseAdmin()
      .from("viajes")
      .insert({ origen: "PB", destino: "Test", estado: "programado", cabezal_id: s11.cabezalId, tipo_servicio: "flete", notas: "[GEOFENCE-TEST]" });
    if (!mismoCabezal) registrarFixtureMarcadoCreado();
    expect(mismoCabezal?.code).toBe("23505");
    const otroCabezal = await crearFixture("S11B");
    const { error: mismoChasis } = await getSupabaseAdmin()
      .from("viajes")
      .insert({ origen: "PB", destino: "Test", estado: "programado", cabezal_id: otroCabezal.cabezalId, chasis_id: chasis, tipo_servicio: "flete", notas: "[GEOFENCE-TEST]" });
    if (!mismoChasis) registrarFixtureMarcadoCreado();
    expect(mismoChasis?.code).toBe("23505");
    const { error: cancelarError } = await getSupabaseAdmin()
      .from("viajes")
      .update({ estado: "cancelado" })
      .eq("id", s11.viajeId);
    expect(cancelarError).toBeNull();
    const { error: altaLiberada } = await getSupabaseAdmin()
      .from("viajes")
      .insert({ origen: "PB", destino: "Test", estado: "programado", cabezal_id: s11.cabezalId, chasis_id: chasis, tipo_servicio: "flete", notas: "[GEOFENCE-TEST]" });
    if (!altaLiberada) registrarFixtureMarcadoCreado();
    expect(altaLiberada).toBeNull();
  }, 240_000);

  it("S12: viaje fuera de ventana", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s12 = await crearFixture("S12", { fechaInicio: new Date(T0.getTime() + 10 * 60 * 60_000).toISOString() });
    const fuera = await procesarNormal(s12, enRuta(700), 0);
    expect(fuera.eventos.find((evento) => evento.viajeId === s12.viajeId)?.accion).toBe("fuera_de_ventana");
    expect(await estadoGeofence(s12)).toBeNull();
  }, 240_000);

  it("S13: origen canónico frente a coordenadas históricas", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s13 = await crearFixture("S13", { latOrigen: 15.69455, lngOrigen: -88.57833 });
    await procesarNormal(s13, ORIGEN_PIMOT, 0);
    expect((await estadoGeofence(s13))?.en_origen_visto).toBe(true);
    const s13Alt = await crearFixture("S13ALT", { latOrigen: 15.69455, lngOrigen: -88.57833 });
    await procesarNormal(s13Alt, { lat: 15.69455, lng: -88.57833 }, 0);
    expect((await estadoGeofence(s13Alt))?.en_origen_visto).toBe(false);
  }, 240_000);

  it("S14: radio de destino mínimo", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s14a = await crearFixture("S14A", { estado: "en_transito", radioDestino: 100 });
    expect((await viaje(s14a)).radio_destino_metros).toBe(500);
    await procesarNormal(s14a, puntoNorte(DESTINO_PRUEBA, 480), 0);
    expect((await viaje(s14a)).estado).toBe("en_destino");
    const s14b = await crearFixture("S14B", { estado: "en_transito", radioDestino: 100 });
    await procesarNormal(s14b, puntoNorte(DESTINO_PRUEBA, 520), 0);
    expect((await viaje(s14b)).estado).toBe("en_transito");
  }, 240_000);

  it("S15: viaje sin destino", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s15 = await crearFixture("S15", { latDestino: null, lngDestino: null });
    await procesarNormal(s15, ORIGEN_PIMOT, 0);
    await procesarNormal(s15, enRuta(600), CADENCIA_S);
    await procesarNormal(s15, enRuta(700), 2 * CADENCIA_S);
    await procesarNormal(s15, enRuta(2000), 5 * CADENCIA_S);
    expect((await viaje(s15)).estado).toBe("en_transito");
  }, 240_000);

  it("S16: viajes cancelados o eliminados", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s16a = await crearFixture("S16C", { estado: "cancelado" });
    const s16b = await crearFixture("S16D", { deletedAt: T0.toISOString() });
    const s16Run = await procesarNormal(s16a, ORIGEN_PIMOT, 0);
    expect(s16Run.eventos.some((evento) => [s16a.viajeId, s16b.viajeId].includes(evento.viajeId))).toBe(false);
    expect(await estadoGeofence(s16a)).toBeNull();
    expect(await estadoGeofence(s16b)).toBeNull();
  }, 240_000);

  it("S17: ausencia de tracker o posición", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s17a = await crearFixture("S17N");
    const sinTracker = await procesar(s17a, null, 0);
    expect(sinTracker.eventos.find((evento) => evento.viajeId === s17a.viajeId)?.accion).toBe("sin_tracker");
    const s17b = await crearFixture("S17P");
    const sinPosicion = await procesar(s17b, { lat: null, lng: null }, 0);
    expect(sinPosicion.eventos.find((evento) => evento.viajeId === s17b.viajeId)?.accion).toBe("sin_posicion");
    expect(await estadoGeofence(s17a)).toBeNull();
    expect(await estadoGeofence(s17b)).toBeNull();
  }, 240_000);

  it("S18: rechazo de retroceso de estado finalizado", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s18 = await crearFixture("S18", { estado: "finalizado" });
    const { data: retroceso, error: errorRetroceso } = await getSupabaseAdmin().rpc(
      "actualizar_estado_viaje_automatico",
      { p_viaje_id: s18.viajeId, p_estado_nuevo: "en_transito", p_fecha_timestamp: T0.toISOString() },
    );
    expect(errorRetroceso).toBeNull();
    expect(retroceso).toMatchObject({ ok: false, error: "transicion_invalida" });
    expect((await viaje(s18)).estado).toBe("finalizado");
  }, 240_000);

  it("S19: alertas limitadas al alcance", async () => {
    expect(getSupabaseAdmin()).toBeDefined();
    const s19 = await crearFixture("S19");
    await procesarNormal(s19, ORIGEN_PIMOT, 0);
    await procesarNormal(s19, enRuta(600), CADENCIA_S);
    await procesarNormal(s19, enRuta(700), 2 * CADENCIA_S);
    const tipos = (await filas("alertas", s19)).map((alerta) => alerta.tipo);
    expect(tipos).toEqual(["inicio_viaje"]);
    expect(tipos.some((tipo) => ["velocidad_excesiva", "retraso_operativo", "inactividad_prolongada"].includes(tipo ?? ""))).toBe(false);
  }, 240_000);

});

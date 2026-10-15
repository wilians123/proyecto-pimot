import {
  distanciaMinimaSegmentoM,
  evaluarGeofencePuro,
  GEOFENCE_FALLBACK,
  ORIGEN_PIMOT,
  type EvaluarGeofenceInput,
} from "@/lib/geofence";

const params = {
  radioInicioM: 500,
  radioLlegadaM: 500,
  radioSalidaM: 650,
  radioRetornoM: 500,
  lecturasParaInicio: 2,
  lecturasParaSalida: 2,
  toleranciaRuidoM: 50,
};
const norte = (centro: { lat: number; lng: number }, metros: number) => ({
  lat: centro.lat + metros / 111_320,
  lng: centro.lng,
});
const base = (overrides: Partial<EvaluarGeofenceInput> = {}): EvaluarGeofenceInput => ({
  estado: "programado",
  actual: ORIGEN_PIMOT,
  previa: null,
  dtSegundos: null,
  destino: norte(ORIGEN_PIMOT, 6000),
  params,
  lecturasInicioConfirm: 0,
  lecturasFueraDestino: 0,
  enOrigenVisto: false,
  maxDistOrigenM: 0,
  ...overrides,
});

describe("distanciaMinimaSegmentoM", () => {
  it("detecta un segmento que atraviesa el círculo sin extremos dentro", () => {
    const centro = ORIGEN_PIMOT;
    expect(
      distanciaMinimaSegmentoM(norte(centro, -1000), norte(centro, 1000), centro),
    ).toBeLessThanOrEqual(1);
  });

  it("mide un segmento paralelo a unos 700 m", () => {
    const centro = ORIGEN_PIMOT;
    expect(
      distanciaMinimaSegmentoM(
        { lat: centro.lat + 700 / 111_320, lng: centro.lng - 0.01 },
        { lat: centro.lat + 700 / 111_320, lng: centro.lng + 0.01 },
        centro,
      ),
    ).toBeCloseTo(700, -1);
  });

  it("usa la distancia del punto si el segmento tiene longitud cero", () => {
    const punto = norte(ORIGEN_PIMOT, 123);
    expect(distanciaMinimaSegmentoM(punto, punto, ORIGEN_PIMOT)).toBeCloseTo(123, 0);
  });
});

describe("evaluarGeofencePuro", () => {
  it("arma el viaje al detectar una lectura dentro del origen", () => {
    const result = evaluarGeofencePuro(base());
    expect(result).toMatchObject({ objetivo: null, motivo: "en_origen", enOrigenVisto: true });
  });

  it("confirma salida con dos lecturas y limpia contador al volver", () => {
    const fuera = norte(ORIGEN_PIMOT, 700);
    expect(evaluarGeofencePuro(base({ actual: fuera, enOrigenVisto: true }))).toMatchObject({
      objetivo: null,
      motivo: "confirmando_salida",
      lecturasInicioConfirm: 1,
    });
    expect(evaluarGeofencePuro(base({
      actual: fuera,
      enOrigenVisto: true,
      lecturasInicioConfirm: 1,
    }))).toMatchObject({ objetivo: "en_transito", motivo: "salida_origen" });
    expect(evaluarGeofencePuro(base({
      actual: ORIGEN_PIMOT,
      enOrigenVisto: true,
      lecturasInicioConfirm: 1,
    }))).toMatchObject({ objetivo: null, lecturasInicioConfirm: 0 });
  });

  it("no arma fuera del origen e infiere llegada aunque nunca lo haya visto", () => {
    const destino = norte(ORIGEN_PIMOT, 6000);
    expect(evaluarGeofencePuro(base({ actual: norte(ORIGEN_PIMOT, 1000) }))).toMatchObject({
      objetivo: null,
      motivo: "esperando_origen",
      enOrigenVisto: false,
    });
    expect(evaluarGeofencePuro(base({ actual: destino }))).toMatchObject({
      objetivo: "en_destino",
      motivo: "llegada_sin_origen",
    });
  });

  it("tolera ruido de hasta 550 m desde el origen", () => {
    for (const metros of [520, 540]) {
      expect(evaluarGeofencePuro(base({
        actual: norte(ORIGEN_PIMOT, metros),
        enOrigenVisto: true,
      }))).toMatchObject({ objetivo: null, motivo: "en_origen", lecturasInicioConfirm: 0 });
    }
  });

  it("detecta llegada y retorno cruzando por segmento según el progreso", () => {
    const destino = norte(ORIGEN_PIMOT, 6000);
    const llegada = evaluarGeofencePuro(base({
      estado: "en_transito",
      actual: norte(destino, 3000),
      previa: norte(destino, -3000),
      dtSegundos: 60,
    }));
    expect(llegada).toMatchObject({ objetivo: "en_destino", motivo: "llegada_destino" });

    const retorno = evaluarGeofencePuro(base({
      estado: "en_transito",
      actual: ORIGEN_PIMOT,
      previa: norte(ORIGEN_PIMOT, 1700),
      dtSegundos: 60,
      maxDistOrigenM: 3000,
    }));
    expect(retorno).toMatchObject({ objetivo: "finalizado", motivo: "retorno_sin_destino" });
    expect(evaluarGeofencePuro(base({
      estado: "en_transito",
      actual: ORIGEN_PIMOT,
      maxDistOrigenM: 1000,
    })).objetivo).toBeNull();
  });

  it("confirma salida del destino, resetea ruido y permite retorno inferido", () => {
    const destino = norte(ORIGEN_PIMOT, 6000);
    expect(evaluarGeofencePuro(base({
      estado: "en_destino",
      actual: norte(destino, 600),
      lecturasFueraDestino: 0,
    }))).toMatchObject({ objetivo: null, motivo: "en_destino", lecturasFueraDestino: 0 });
    expect(evaluarGeofencePuro(base({
      estado: "en_destino",
      actual: norte(destino, 700),
    }))).toMatchObject({ objetivo: null, motivo: "confirmando_salida_destino" });
    expect(evaluarGeofencePuro(base({
      estado: "en_destino",
      actual: norte(destino, 700),
      lecturasFueraDestino: 1,
    }))).toMatchObject({ objetivo: "de_vuelta", motivo: "salida_destino" });
    expect(evaluarGeofencePuro(base({
      estado: "en_destino",
      actual: ORIGEN_PIMOT,
      maxDistOrigenM: 3000,
    }))).toMatchObject({ objetivo: "finalizado", motivo: "retorno_sin_salida" });
  });

  it("finaliza al retornar, pero no usa un segmento de más de 180 segundos", () => {
    expect(evaluarGeofencePuro(base({
      estado: "de_vuelta",
      actual: ORIGEN_PIMOT,
    })).objetivo).toBe("finalizado");
    expect(evaluarGeofencePuro(base({
      estado: "de_vuelta",
      actual: norte(ORIGEN_PIMOT, 900),
      previa: ORIGEN_PIMOT,
      dtSegundos: 3600,
    })).objetivo).toBeNull();
  });

  it("sin destino solo permite reglas de origen y no inventa progreso corto", () => {
    expect(evaluarGeofencePuro(base({ destino: null, actual: norte(ORIGEN_PIMOT, 700), enOrigenVisto: true })))
      .toMatchObject({ objetivo: null, motivo: "sin_destino" });
    expect(GEOFENCE_FALLBACK.radio_inicio_m).toBe(500);
    expect(ORIGEN_PIMOT).toEqual({ lat: 15.640187, lng: -88.546492 });
  });

  it("nunca devuelve una transición hacia atrás", () => {
    const orden = ["programado", "en_transito", "en_destino", "de_vuelta", "finalizado"];
    for (const estado of ["programado", "en_transito", "en_destino", "de_vuelta"] as const) {
      const result = evaluarGeofencePuro(base({ estado, actual: ORIGEN_PIMOT, enOrigenVisto: true }));
      if (result.objetivo) {
        expect(orden.indexOf(result.objetivo)).toBeGreaterThan(orden.indexOf(estado));
      }
    }
  });
});

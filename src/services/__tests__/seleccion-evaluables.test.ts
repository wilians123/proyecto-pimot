import { seleccionarViajesEvaluables } from "@/services/geofence-processor.service";

const ahora = new Date("2026-01-01T12:00:00.000Z");
const viaje = (
  id: string,
  estado: "programado" | "en_transito" | "en_destino" | "de_vuelta" = "programado",
  fecha_inicio: string | null = "2026-01-01T12:00:00.000Z",
  cabezal_id: string | null = "c1",
  created_at = "2025-12-01T00:00:00.000Z",
) => ({
  id,
  estado,
  cabezal_id,
  fecha_inicio,
  fecha_estimada: null,
  radio_destino_metros: 500,
  lat_destino: null,
  lng_destino: null,
  created_at,
  lecturas_inicio_confirm: 0,
  lecturas_fuera_destino: 0,
});

describe("seleccionarViajesEvaluables", () => {
  it("omite programados cuyo cabezal ya tiene un viaje en curso", () => {
    const result = seleccionarViajesEvaluables([
      viaje("en-curso", "en_transito"),
      viaje("programado"),
    ], ahora);
    expect(result.evaluables.map(({ id }) => id)).toEqual(["en-curso"]);
    expect(result.descartados).toMatchObject([{ viaje: { id: "programado" }, razon: "cabezal_ocupado" }]);
  });

  it("selecciona el programado más temprano por cabezal", () => {
    const result = seleccionarViajesEvaluables([
      viaje("tardio", "programado", "2026-01-01T14:00:00.000Z"),
      viaje("temprano", "programado", "2026-01-01T13:00:00.000Z"),
    ], ahora);
    expect(result.evaluables.map(({ id }) => id)).toEqual(["temprano"]);
    expect(result.descartados[0]).toMatchObject({ viaje: { id: "tardio" }, razon: "cabezal_ocupado" });
  });

  it("aplica ventana de cuatro horas, NULLS LAST y desempata por created_at", () => {
    const result = seleccionarViajesEvaluables([
      viaje("fuera", "programado", "2026-01-01T22:00:00.000Z", "c2"),
      viaje("dentro", "programado", "2026-01-01T15:00:00.000Z", "c3"),
      viaje("null-creado-tarde", "programado", null, "c4", "2025-12-02T00:00:00.000Z"),
      viaje("null-creado-temprano", "programado", null, "c4", "2025-12-01T00:00:00.000Z"),
    ], ahora);
    expect(result.evaluables.map(({ id }) => id)).toEqual(["dentro", "null-creado-temprano"]);
    expect(result.descartados).toMatchObject([
      { viaje: { id: "fuera" }, razon: "fuera_de_ventana" },
      { viaje: { id: "null-creado-tarde" }, razon: "cabezal_ocupado" },
    ]);
  });
});

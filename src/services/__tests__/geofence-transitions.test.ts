import { secuenciaTransiciones } from "@/services/geofence-processor.service";

describe("secuenciaTransiciones", () => {
  it("activa el viaje antes de registrar una llegada detectada con una sola lectura", () => {
    expect(secuenciaTransiciones("programado", "en_destino")).toEqual([
      "en_transito",
      "en_destino",
    ]);
  });

  it("completa los estados intermedios al detectar el final desde tránsito", () => {
    expect(secuenciaTransiciones("en_transito", "finalizado")).toEqual([
      "en_destino",
      "de_vuelta",
      "finalizado",
    ]);
  });

  it("registra el retorno antes de finalizar desde destino", () => {
    expect(secuenciaTransiciones("en_destino", "finalizado")).toEqual([
      "de_vuelta",
      "finalizado",
    ]);
  });

  it("conserva una transición directa cuando los estados son consecutivos", () => {
    expect(secuenciaTransiciones("programado", "en_transito")).toEqual(["en_transito"]);
  });
});

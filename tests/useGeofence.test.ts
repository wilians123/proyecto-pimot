import { computeGeofenceTransition } from "../src/hooks/useGeofence";

describe("useGeofence - roundtrip and one-way", () => {
  test("roundtrip: arrival only sets en_destino but not finalizado", () => {
    const trans = computeGeofenceTransition({
      trackerLat: 14.95,
      trackerLng: -89.53,
      estadoActual: "en_transito",
      destinoLat: 14.95,
      destinoLng: -89.53,
      bloqueado: false,
      lecturasFueraDestino: 0,
      lecturasInicioConfirm: 2,
      tripType: "roundtrip",
      lecturasDentroDestino: 0,
    });

    expect(trans).toBe("en_destino");
  });

  test("one-way: stable inside arrival emits finalizado", () => {
    const trans = computeGeofenceTransition({
      trackerLat: 14.95,
      trackerLng: -89.53,
      estadoActual: "en_transito",
      destinoLat: 14.95,
      destinoLng: -89.53,
      bloqueado: false,
      lecturasFueraDestino: 0,
      lecturasInicioConfirm: 2,
      tripType: "one-way",
      lecturasDentroDestino: 3,
      lecturasParaFinalizacionOneWay: 3,
    });

    expect(trans).toBe("finalizado");
  });

  test("one-way: porcentaje consumido >= 95% emite finalizado", () => {
    const trans = computeGeofenceTransition({
      trackerLat: 15.172798562975485,
      trackerLng: -89.2452230092984,
      estadoActual: "en_transito",
      destinoLat: 14.95,
      destinoLng: -89.53,
      bloqueado: false,
      lecturasFueraDestino: 0,
      lecturasInicioConfirm: 2,
      tripType: "one-way",
      routeLengthMeters: 131416,
      distanceConsumedMeters: 124855,
    });

    expect(trans).toBe("finalizado");
  });
});

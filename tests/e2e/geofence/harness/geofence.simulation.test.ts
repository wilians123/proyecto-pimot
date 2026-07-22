import fs from "fs";
import path from "path";
import {
  evaluarGeofence,
  GEOFENCE_CONFIG,
  GEOFENCE_DEFAULT_ORIGIN,
} from "../../../../src/lib/geofence";
import type { EstadoViaje } from "../../../../src/types";

type Point = {
  timestamp: string;
  lat: number;
  lng: number;
};

type EventLog = {
  phase: "ida" | "vuelta";
  index: number;
  timestamp: string;
  lat: number;
  lng: number;
  stateBefore: EstadoViaje;
  stateAfter: EstadoViaje;
  transicion: string | null;
  distanciaDestinoM: number | null;
  distanciaOrigenM: number | null;
  lecturasInicioConfirm: number;
  lecturasFueraDestino: number;
};

function saveArtifact(name: string, obj: unknown) {
  const dir = path.join(__dirname, "..", "artifacts");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const body = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  const target = path.join(dir, name);

  try {
    fs.writeFileSync(target, body);
  } catch {
    const parsed = path.parse(name);
    fs.writeFileSync(path.join(dir, `${parsed.name}.latest${parsed.ext}`), body);
  }
}

function applyTransition(state: EstadoViaje, transicion: string | null): EstadoViaje {
  if (
    transicion === "en_transito" ||
    transicion === "en_destino" ||
    transicion === "de_vuelta" ||
    transicion === "finalizado"
  ) {
    return transicion;
  }
  return state;
}

describe("Geofence ida + vuelta simulation", () => {
  test("advances programado -> en_transito -> en_destino -> de_vuelta -> finalizado", () => {
    const base = path.join(__dirname, "..", "..", "data");
    const idaFile = path.join(base, "points_payloads.json");
    const vueltaFile = path.join(base, "points_payloads_return.json");

    const ida = JSON.parse(fs.readFileSync(idaFile, "utf8"));
    const vuelta = JSON.parse(fs.readFileSync(vueltaFile, "utf8"));

    const trip = {
      id: "sim-1",
      state: "programado" as EstadoViaje,
      lecturasInicioConfirm: 0,
      lecturasFueraDestino: 0,
    };
    const events: EventLog[] = [];

    function runPoints(points: Point[], phase: "ida" | "vuelta") {
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const stateBefore = trip.state;
        const res = evaluarGeofence({
          trackerLat: p.lat,
          trackerLng: p.lng,
          estadoActual: trip.state,
          origenLat: ida.metadata.origin.lat,
          origenLng: ida.metadata.origin.lng,
          destinoLat: ida.metadata.destination.lat,
          destinoLng: ida.metadata.destination.lng,
          bloqueado: false,
          lecturasInicioConfirm: trip.lecturasInicioConfirm,
          lecturasFueraDestino: trip.lecturasFueraDestino,
        });

        if (res.transicion === "confirmar_inicio") {
          trip.lecturasInicioConfirm++;
        } else if (res.transicion === "salida_destino") {
          trip.lecturasFueraDestino++;
        } else if (res.transicion === "en_transito") {
          trip.state = "en_transito";
          trip.lecturasInicioConfirm = 0;
        } else if (res.transicion === "en_destino") {
          trip.state = "en_destino";
          trip.lecturasFueraDestino = 0;
        } else if (res.transicion === "de_vuelta") {
          trip.state = "de_vuelta";
          trip.lecturasFueraDestino = 0;
        } else {
          trip.state = applyTransition(trip.state, res.transicion);
        }

        events.push({
          phase,
          index: i,
          timestamp: p.timestamp,
          lat: p.lat,
          lng: p.lng,
          stateBefore,
          stateAfter: trip.state,
          transicion: res.transicion,
          distanciaDestinoM: res.distanciaDestinoM,
          distanciaOrigenM: res.distanciaOrigenM,
          lecturasInicioConfirm: trip.lecturasInicioConfirm,
          lecturasFueraDestino: trip.lecturasFueraDestino,
        });

        if (phase === "vuelta" && trip.state === "finalizado") break;
      }
    }

    runPoints(ida.points, "ida");
    runPoints(vuelta.points, "vuelta");

    const cambios = events.filter((event) => event.stateBefore !== event.stateAfter);
    const flujo = cambios.map((event) => event.stateAfter);

    saveArtifact("events_return.json", events);
    saveArtifact("trip_return.json", trip);
    saveArtifact(
      "report_return.md",
      [
        "# Geofence E2E Simulation Report",
        "",
        `Config: inicio ${GEOFENCE_CONFIG.radioInicioM}m, llegada ${GEOFENCE_CONFIG.radioLlegadaM}m, salida ${GEOFENCE_CONFIG.radioSalidaM}m, retorno ${GEOFENCE_CONFIG.radioRetornoM}m.`,
        `Origen usado: ${GEOFENCE_DEFAULT_ORIGIN.lat}, ${GEOFENCE_DEFAULT_ORIGIN.lng}.`,
        "",
        "| fase | index | estado anterior | estado nuevo | transicion | distancia origen m | distancia destino m |",
        "| --- | ---: | --- | --- | --- | ---: | ---: |",
        ...cambios.map((event) =>
          [
            event.phase,
            event.index,
            event.stateBefore,
            event.stateAfter,
            event.transicion,
            Math.round(event.distanciaOrigenM ?? -1),
            Math.round(event.distanciaDestinoM ?? -1),
          ].join(" | "),
        ),
        "",
        `Final state: ${trip.state}`,
      ].join("\n"),
    );

    expect(flujo).toEqual([
      "en_transito",
      "en_destino",
      "de_vuelta",
      "finalizado",
    ]);
    expect(trip.state).toBe("finalizado");
  }, 300000);
});

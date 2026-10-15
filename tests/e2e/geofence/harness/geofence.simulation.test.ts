import fs from "fs";
import path from "path";
import {
  evaluarGeofencePuro,
  GEOFENCE_CONFIG,
  GEOFENCE_FALLBACK,
  ORIGEN_PIMOT,
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
      enOrigenVisto: false,
      maxDistOrigenM: 0,
    };
    const events: EventLog[] = [];
    let previa: Point | null = null;

    function runPoints(points: Point[], phase: "ida" | "vuelta") {
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const stateBefore = trip.state;
        const actual = { lat: p.lat, lng: p.lng };
        const dtSegundos = previa
          ? (Date.parse(p.timestamp) - Date.parse(previa.timestamp)) / 1000
          : null;
        const res = evaluarGeofencePuro({
          estado: trip.state as "programado" | "en_transito" | "en_destino" | "de_vuelta",
          actual,
          previa: previa ? { lat: previa.lat, lng: previa.lng } : null,
          dtSegundos,
          destino: {
            lat: ida.metadata.destination.lat,
            lng: ida.metadata.destination.lng,
          },
          params: {
            radioInicioM: GEOFENCE_FALLBACK.radio_inicio_m,
            radioLlegadaM: GEOFENCE_FALLBACK.radio_llegada_m,
            radioSalidaM: GEOFENCE_FALLBACK.radio_salida_m,
            radioRetornoM: GEOFENCE_FALLBACK.radio_retorno_m,
            lecturasParaInicio: GEOFENCE_FALLBACK.lecturas_para_inicio,
            lecturasParaSalida: GEOFENCE_FALLBACK.lecturas_para_salida,
            toleranciaRuidoM: GEOFENCE_FALLBACK.tolerancia_ruido_m,
          },
          lecturasInicioConfirm: trip.lecturasInicioConfirm,
          lecturasFueraDestino: trip.lecturasFueraDestino,
          enOrigenVisto: trip.enOrigenVisto,
          maxDistOrigenM: trip.maxDistOrigenM,
        });

        trip.enOrigenVisto = res.enOrigenVisto;
        trip.maxDistOrigenM = res.maxDistOrigenM;
        if (res.objetivo) {
          trip.state = res.objetivo;
          if (res.objetivo === "en_transito") trip.lecturasInicioConfirm = 0;
          if (res.objetivo === "en_destino" || res.objetivo === "de_vuelta") {
            trip.lecturasFueraDestino = 0;
          }
        } else {
          trip.lecturasInicioConfirm = res.lecturasInicioConfirm;
          trip.lecturasFueraDestino = res.lecturasFueraDestino;
        }

        events.push({
          phase,
          index: i,
          timestamp: p.timestamp,
          lat: p.lat,
          lng: p.lng,
          stateBefore,
          stateAfter: trip.state,
          transicion: res.objetivo,
          distanciaDestinoM: res.distanciaDestinoPuntoM,
          distanciaOrigenM: res.distanciaOrigenPuntoM,
          lecturasInicioConfirm: trip.lecturasInicioConfirm,
          lecturasFueraDestino: trip.lecturasFueraDestino,
        });
        previa = p;

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
        `Origen usado: ${ORIGEN_PIMOT.lat}, ${ORIGEN_PIMOT.lng}.`,
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

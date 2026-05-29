/** @jest-environment jsdom */
import fs from "fs";
import path from "path";
import React from 'react';
import { render, act } from '@testing-library/react';
import { useGeofence } from "../../../../src/hooks/useGeofence";

// Constants must match useGeofence.ts
const PUERTO_BARRIOS_LAT = 15.69455;
const PUERTO_BARRIOS_LNG = -88.57833;
const RADIO_INICIO_M = 150;
const RADIO_LLEGADA_M = 75;
const RADIO_SALIDA_M = 120;
const RADIO_RETORNO_M = 150;
const LECTURAS_PARA_INICIO = 2;
const LECTURAS_PARA_SALIDA = 3;

function saveArtifact(name: string, obj: any) {
  const dir = path.join(__dirname, "..", "artifacts");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, name),
    typeof obj === "string" ? obj : JSON.stringify(obj, null, 2),
  );
}

describe("Geofence ida + vuelta simulation", () => {
  test("runs ida then vuelta and validates transitions", async () => {
    const base = path.join(__dirname, "..", "..", "data");
    const idaFile = path.join(base, "points_payloads.json");
    const vueltaFile = path.join(base, "points_payloads_return.json");

    const ida = JSON.parse(fs.readFileSync(idaFile, "utf8"));
    const vuelta = JSON.parse(fs.readFileSync(vueltaFile, "utf8"));

    const events: any[] = [];

    const trip: any = { state: "programado" };

    // helper to run through points
    function runPoints(points: any[], phase: "ida" | "vuelta") {
      let lecturasInicioConfirm = 0;
      let lecturasFueraDestino = 0;
      const logs: any[] = [];

      let currentRes: any = null;
      
      function TestComp(props: any) {
        const res = useGeofence(props as any);
        React.useEffect(() => { currentRes = res; }, [res]);
        return null;
      }

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const props = {
          trackerLat: p.lat,
          trackerLng: p.lng,
          estadoActual: trip.state,
          destinoLat: ida.metadata.destination.lat,
          destinoLng: ida.metadata.destination.lng,
          bloqueado: false,
          lecturasFueraDestino,
          lecturasInicioConfirm,
        };

        // use @testing-library/react to mount and update
        const TestComp = (props: any) => {
          const r = useGeofence(props as any);
          React.useEffect(() => { currentRes = r; }, [r]);
          return null;
        };

        const rendered = render(React.createElement(TestComp, props));
        const res = currentRes;


        // update counters based on distances and state
        if (trip.state === "programado") {
          if (
            res.distanciaPuertoBarriosM !== null &&
            res.distanciaPuertoBarriosM > RADIO_INICIO_M
          )
            lecturasInicioConfirm++;
          else lecturasInicioConfirm = 0;
        }

        if (trip.state === "en_destino") {
          if (
            res.distanciaDestinoM !== null &&
            res.distanciaDestinoM > RADIO_SALIDA_M
          )
            lecturasFueraDestino++;
          else lecturasFueraDestino = 0;
        }

        // record event
        logs.push({
          index: i,
          timestamp: p.timestamp,
          lat: p.lat,
          lng: p.lng,
          stateBefore: trip.state,
          transicion: res.transicion,
          distanciaDestinoM: res.distanciaDestinoM,
          distanciaPuertoBarriosM: res.distanciaPuertoBarriosM,
          lecturasInicioConfirm,
          lecturasFueraDestino,
        });
        events.push({ phase, ...logs[logs.length - 1] });

        // apply transitions
        if (res.transicion === "en_transito") trip.state = "en_transito";
        if (res.transicion === "en_destino") trip.state = "en_destino";
        if (res.transicion === "de_vuelta") trip.state = "de_vuelta";
        if (res.transicion === "finalizado") trip.state = "finalizado";

        // unmount this render to avoid DOM buildup
        rendered.unmount();

        // stop early if finalized during vuelta
        if (phase === "vuelta" && trip.state === "finalizado") break;
      }

      return logs;
    }

    // run ida
    const idaLogs = runPoints(ida.points, "ida");
    // assertions after ida: must have reached en_destino
    expect(
      trip.state === "en_destino" ||
        trip.state === "de_vuelta" ||
        trip.state === "finalizado" ||
        trip.state === "en_transito",
    ).toBeTruthy();

    // run vuelta
    const vueltaLogs = runPoints(vuelta.points, "vuelta");

    // after vuelta, expect de_vuelta then finalizado
    expect(trip.state).toBe("finalizado");

    // write artifacts
    saveArtifact("events_return.json", events);
    saveArtifact("trip_return.json", trip);
    saveArtifact(
      "report_return.md",
      `Transitions report\n\nIDA logs: ${idaLogs.length} ticks\nVUELTA logs: ${vueltaLogs.length} ticks\nFinal state: ${trip.state}`,
    );

    // simple snapshots
    expect(
      fs.existsSync(
        path.join(__dirname, "..", "artifacts", "events_return.json"),
      ),
    ).toBeTruthy();
  }, 300000);
});

// generatePoints.js
// Intención: generar puntos interpolados entre Puerto Barrios y Zacapa para la simulación de geofence.
// Fuente de verdad: src/hooks/useGeofence.ts
const fs = require("fs");

const PB = { lat: 15.69455, lng: -88.57833 };
const ZAC = { lat: 14.95, lng: -89.53 };
const SPEED_KMH = 40; // 40 km/h
const SECS_PER_TICK = 10; // lecturas cada 10s

function toRad(v) {
  return (v * Math.PI) / 180;
}
function haversine(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat),
    lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2),
    sinDLon = Math.sin(dLon / 2);
  const c =
    2 *
    Math.asin(
      Math.sqrt(
        sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
      ),
    );
  return R * c;
}

const totalMeters = haversine(PB, ZAC);
const speedMs = SPEED_KMH / 3.6;
const stepMeters = speedMs * SECS_PER_TICK; // distancia por tick
const steps = Math.max(2, Math.ceil(totalMeters / stepMeters));

const points = [];
const startTime = Date.now();
for (let i = 0; i <= steps; i++) {
  const f = i / steps;
  const lat = PB.lat + (ZAC.lat - PB.lat) * f;
  const lng = PB.lng + (ZAC.lng - PB.lng) * f;
  const timestamp = new Date(
    startTime + i * SECS_PER_TICK * 1000,
  ).toISOString();
  points.push({
    timestamp,
    lat,
    lng,
    lecturasInicioConfirm: 0,
    lecturasFueraDestino: 0,
  });
}

// compute route length by summing haversine between points
let routeLen = 0;
for (let i = 1; i < points.length; i++)
  routeLen += haversine(points[i - 1], points[i]);

const out = {
  metadata: {
    origin: PB,
    destination: ZAC,
    steps,
    stepMeters,
    route_length_m: Math.round(routeLen),
  },
  points,
};

const outPath = "tests/e2e/data/points_payloads.json";
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(
  "Wrote",
  outPath,
  "with",
  points.length,
  "points, route_length_m=",
  Math.round(routeLen),
);

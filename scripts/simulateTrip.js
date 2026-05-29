// simulateTrip.js
// Intención: simular el viaje leyendo las constantes desde src/hooks/useGeofence.ts y aplicando la lógica de geofence.
// No modifica useGeofence.ts; extrae constantes como fuente de verdad.
const fs = require("fs");
const path = require("path");

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

const geofile = path.join("src", "hooks", "useGeofence.ts");
if (!fs.existsSync(geofile)) {
  console.error("useGeofence.ts not found at", geofile);
  process.exit(2);
}
const src = fs.readFileSync(geofile, "utf8");
function extractNumber(name) {
  const re = new RegExp(name + "\\s*=\\s*([0-9.+-]+)", "m");
  const m = src.match(re);
  if (!m) throw new Error("Const " + name + " not found");
  return Number(m[1]);
}
// constants per rule; fallback to extraction
let PUERTO_BARRIOS_LAT = 15.69455;
let PUERTO_BARRIOS_LNG = -88.57833;
let RADIO_INICIO_M = 150;
let RADIO_LLEGADA_M = 75;
let RADIO_SALIDA_M = 120;
let RADIO_RETORNO_M = 150;
let LECTURAS_PARA_INICIO = 2;
let LECTURAS_PARA_SALIDA = 3;
try {
  PUERTO_BARRIOS_LAT = extractNumber("PUERTO_BARRIOS_LAT");
  PUERTO_BARRIOS_LNG = extractNumber("PUERTO_BARRIOS_LNG");
  RADIO_INICIO_M = extractNumber("RADIO_INICIO_M");
  RADIO_LLEGADA_M = extractNumber("RADIO_LLEGADA_M");
  RADIO_SALIDA_M = extractNumber("RADIO_SALIDA_M");
  RADIO_RETORNO_M = extractNumber("RADIO_RETORNO_M");
  LECTURAS_PARA_INICIO = extractNumber("LECTURAS_PARA_INICIO");
  LECTURAS_PARA_SALIDA = extractNumber("LECTURAS_PARA_SALIDA");
} catch (e) {
  console.warn("Could not extract all constants, using defaults", e.message);
}

const PB = { lat: PUERTO_BARRIOS_LAT, lng: PUERTO_BARRIOS_LNG };
// destination read from generated points metadata
const pointsPath = "tests/e2e/data/points_payloads.json";
if (!fs.existsSync(pointsPath)) {
  console.error("Points file missing, run scripts/generatePoints.js first");
  process.exit(2);
}
const pts = JSON.parse(fs.readFileSync(pointsPath, "utf8"));
const points = pts.points;
const dest = pts.metadata.destination;

// trip initial
let trip = {
  id: "sim-1",
  origin: "Puerto Barrios",
  destination: "Zacapa",
  unit_id: "unit-123",
  state: "programado",
  route_id: "route-sim",
};

// route geometry and length
let route = {
  geometry: points.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    timestamp: p.timestamp,
  })),
  length_meters: 0,
};
for (let i = 1; i < route.geometry.length; i++)
  route.length_meters += haversine(route.geometry[i - 1], route.geometry[i]);
route.length_meters = Math.round(route.length_meters);

// simulation
let events = [];
let lecturasInicioConfirm = 0;
let lecturasFueraDestino = 0;
let state = trip.state;
let cumulativeMeters = 0;
let lastPoint = null;
const checkpoints = [0.25, 0.5, 0.75, 1.0].map((p) => ({
  fraction: p,
  reached: false,
}));

for (let i = 0; i < points.length; i++) {
  const p = points[i];
  if (lastPoint) cumulativeMeters += haversine(lastPoint, p);
  lastPoint = p;
  const distDest = haversine(p, dest);
  const distPB = haversine(p, PB);

  // start logic: if outside RADIO_INICIO_M increment lecturasInicioConfirm, else reset
  if (distPB > RADIO_INICIO_M) {
    lecturasInicioConfirm++;
  } else {
    lecturasInicioConfirm = 0;
  }
  // en_transito
  if (state === "programado" && lecturasInicioConfirm >= LECTURAS_PARA_INICIO) {
    const prev = state;
    state = "en_transito";
    events.push({
      timestamp: p.timestamp,
      lat: p.lat,
      lon: p.lng,
      estado_anterior: prev,
      estado_nuevo: state,
      trigger: "LECTURAS_PARA_INICIO",
      distanciaDestinoM: Math.round(distDest),
      distanciaPuertoBarriosM: Math.round(distPB),
    });
  }

  // arrival
  if (state !== "en_destino" && distDest <= RADIO_LLEGADA_M) {
    const prev = state;
    state = "en_destino";
    events.push({
      timestamp: p.timestamp,
      lat: p.lat,
      lon: p.lng,
      estado_anterior: prev,
      estado_nuevo: state,
      trigger: "RADIO_LLEGADA_M",
      distanciaDestinoM: Math.round(distDest),
      distanciaPuertoBarriosM: Math.round(distPB),
    });
    // capture snapshot
    fs.writeFileSync(
      "tests/e2e/geofence/artifacts/trip_en_destino.json",
      JSON.stringify(Object.assign({}, trip, { state }), null, 2),
    );
  }

  // when in destino and moves away
  if (state === "en_destino") {
    if (distDest > RADIO_SALIDA_M) {
      lecturasFueraDestino++;
    } else {
      lecturasFueraDestino = 0;
    }
    if (lecturasFueraDestino >= LECTURAS_PARA_SALIDA) {
      const prev = state;
      state = "de_vuelta";
      events.push({
        timestamp: p.timestamp,
        lat: p.lat,
        lon: p.lng,
        estado_anterior: prev,
        estado_nuevo: state,
        trigger: "LECTURAS_PARA_SALIDA",
        distanciaDestinoM: Math.round(distDest),
        distanciaPuertoBarriosM: Math.round(distPB),
      });
    }
  }

  // finalizado upon returning near PB
  if (state === "de_vuelta" && distPB <= RADIO_RETORNO_M) {
    const prev = state;
    state = "finalizado";
    events.push({
      timestamp: p.timestamp,
      lat: p.lat,
      lon: p.lng,
      estado_anterior: prev,
      estado_nuevo: state,
      trigger: "RADIO_RETORNO_M",
      distanciaDestinoM: Math.round(distDest),
      distanciaPuertoBarriosM: Math.round(distPB),
    });
    fs.writeFileSync(
      "tests/e2e/geofence/artifacts/trip_final.json",
      JSON.stringify(Object.assign({}, trip, { state }), null, 2),
    );
    break;
  }

  // checkpoints
  const fraction = cumulativeMeters / route.length_meters;
  checkpoints.forEach((ch) => {
    if (!ch.reached && fraction >= ch.fraction - 0.05) {
      // allow some tolerance when marking reached
      ch.reached = true;
      events.push({
        timestamp: p.timestamp,
        lat: p.lat,
        lon: p.lng,
        checkpoint: ch.fraction,
        distancia_recorrida_m: Math.round(cumulativeMeters),
        route_length_m: route.length_meters,
      });
    }
  });
}

// write artifacts
fs.mkdirSync("tests/e2e/geofence/artifacts", { recursive: true });
fs.writeFileSync(
  "tests/e2e/geofence/artifacts/events.json",
  JSON.stringify(events, null, 2),
);
fs.writeFileSync(
  "tests/e2e/geofence/artifacts/route.json",
  JSON.stringify(route, null, 2),
);
fs.writeFileSync(
  "tests/e2e/geofence/artifacts/points_payloads.json",
  JSON.stringify(pts, null, 2),
);
fs.writeFileSync(
  "tests/e2e/geofence/artifacts/trip_before.json",
  JSON.stringify(trip, null, 2),
);

console.log(
  "Simulation complete. Artifacts written to tests/e2e/geofence/artifacts",
);

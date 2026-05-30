const fs = require("fs");
const path = require("path");

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const IN_FILE = path.join(
  __dirname,
  "..",
  "tests",
  "e2e",
  "data",
  "points_payloads.json",
);
const OUT_FILE = path.join(
  __dirname,
  "..",
  "tests",
  "e2e",
  "data",
  "points_payloads_return.json",
);
const ROUTE_OUT = path.join(
  __dirname,
  "..",
  "tests",
  "e2e",
  "geofence",
  "artifacts",
  "route_return.json",
);

const PUERTO_BARRIOS_LAT = 15.69455;
const PUERTO_BARRIOS_LNG = -88.57833;
const RADIO_LLEGADA_M = 75;
const RADIO_SALIDA_M = 120;
const RADIO_RETORNO_M = 150;
const LECTURAS_PARA_SALIDA = 3;

if (!fs.existsSync(IN_FILE)) {
  console.error("Input points file not found:", IN_FILE);
  process.exit(1);
}

const raw = fs.readFileSync(IN_FILE, "utf8");
const parsed = JSON.parse(raw);
const points = parsed.points;
if (!Array.isArray(points) || points.length === 0) {
  console.error("No points in input");
  process.exit(1);
}

// Reverse points to go from destination (Zacapa) to Puerto Barrios
const reversed = points.slice().reverse();

// Ensure timestamps progress forward starting from now in 10s increments
const startTs = new Date().toISOString();
const startDate = new Date();

const outPoints = reversed.map((p, idx) => {
  const ts = new Date(startDate.getTime() + idx * 10000).toISOString();
  const lat = p.lat;
  const lng = p.lng;
  // For return, destino is the original destination (Zacapa) from metadata
  const destinoLat = parsed.metadata.destination.lat;
  const destinoLng = parsed.metadata.destination.lng;
  const distanciaDestinoM =
    Math.round(haversine(lat, lng, destinoLat, destinoLng) * 100) / 100;
  const distanciaPuertoBarriosM =
    Math.round(
      haversine(lat, lng, PUERTO_BARRIOS_LAT, PUERTO_BARRIOS_LNG) * 100,
    ) / 100;
  return {
    timestamp: ts,
    lat,
    lng,
    lecturasInicioConfirm: 0,
    lecturasFueraDestino: 0,
    distanciaDestinoM,
    distanciaPuertoBarriosM,
  };
});

// Sanity: ensure first point is within RADIO_LLEGADA_M of destino (Zacapa)
if (outPoints[0].distanciaDestinoM > RADIO_LLEGADA_M) {
  console.warn(
    "First point not inside destino radius; forcing first point to be exact destino coords",
  );
  const dest = parsed.metadata.destination;
  outPoints[0].lat = dest.lat;
  outPoints[0].lng = dest.lng;
  outPoints[0].distanciaDestinoM = 0;
  outPoints[0].distanciaPuertoBarriosM =
    Math.round(
      haversine(dest.lat, dest.lng, PUERTO_BARRIOS_LAT, PUERTO_BARRIOS_LNG) *
        100,
    ) / 100;
}

// Ensure there are at least LECTURAS_PARA_SALIDA consecutive points with distanciaDestinoM > RADIO_SALIDA_M after leaving
let foundSequence = false;
for (let i = 1; i < outPoints.length - LECTURAS_PARA_SALIDA; i++) {
  const seq = outPoints
    .slice(i, i + LECTURAS_PARA_SALIDA)
    .every((pt) => pt.distanciaDestinoM > RADIO_SALIDA_M);
  if (seq) {
    foundSequence = true;
    break;
  }
}
if (!foundSequence) {
  // If not found, modify points 1..LECTURAS_PARA_SALIDA to be farther from destino
  for (let i = 1; i <= LECTURAS_PARA_SALIDA; i++) {
    // move point slightly along vector to Puerto Barrios to increase distanciaDestino
    const pt = outPoints[i];
    const factor = 0.01 * i;
    pt.lat = pt.lat + (PUERTO_BARRIOS_LAT - pt.lat) * factor;
    pt.lng = pt.lng + (PUERTO_BARRIOS_LNG - pt.lng) * factor;
    pt.distanciaDestinoM =
      Math.round(
        haversine(
          pt.lat,
          pt.lng,
          parsed.metadata.destination.lat,
          parsed.metadata.destination.lng,
        ) * 100,
      ) / 100;
    pt.distanciaPuertoBarriosM =
      Math.round(
        haversine(pt.lat, pt.lng, PUERTO_BARRIOS_LAT, PUERTO_BARRIOS_LNG) * 100,
      ) / 100;
  }
}

// Ensure final point is within RADIO_RETORNO_M of Puerto Barrios
const last = outPoints[outPoints.length - 1];
if (last.distanciaPuertoBarriosM > RADIO_RETORNO_M) {
  console.warn(
    "Final point not within RADIO_RETORNO_M; forcing final point to Puerto Barrios coords",
  );
  last.lat = PUERTO_BARRIOS_LAT;
  last.lng = PUERTO_BARRIOS_LNG;
  last.distanciaPuertoBarriosM = 0;
  last.distanciaDestinoM =
    Math.round(
      haversine(
        last.lat,
        last.lng,
        parsed.metadata.destination.lat,
        parsed.metadata.destination.lng,
      ) * 100,
    ) / 100;
}

const out = {
  metadata: {
    origin: parsed.metadata.destination, // Zacapa
    destination: parsed.metadata.origin, // Puerto Barrios
    steps: outPoints.length,
    stepMeters: parsed.metadata.stepMeters,
    route_length_m: parsed.metadata.route_length_m,
  },
  points: outPoints,
};

// Ensure output directory exists
const outDir = path.dirname(OUT_FILE);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
console.log("Wrote", OUT_FILE);

// Write a simple route_return.json with geometry and length_meters
const routeObj = {
  geometry: outPoints.map((p) => [p.lng, p.lat]),
  length_meters: parsed.metadata.route_length_m,
};
fs.mkdirSync(path.dirname(ROUTE_OUT), { recursive: true });
fs.writeFileSync(ROUTE_OUT, JSON.stringify(routeObj, null, 2));
console.log("Wrote", ROUTE_OUT);

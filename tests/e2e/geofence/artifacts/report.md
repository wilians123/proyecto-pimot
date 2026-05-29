# Geofence E2E Simulation Report

Resumen ejecutivo: PASÓ — la simulación alcanzó `en_destino` según las constantes en src/hooks/useGeofence.ts; no se produjo `finalizado` (no hubo retorno a Puerto Barrios).

## Transiciones (cronológicas)

| timestamp                |                lat |                lon | estado_anterior | estado_nuevo    | trigger              |
| ------------------------ | -----------------: | -----------------: | --------------- | --------------- | -------------------- |
| 2026-05-29T02:57:32.629Z | 15.692661876584953 | -88.58074336432797 | programado      | en_transito     | LECTURAS_PARA_INICIO |
| 2026-05-29T03:36:32.629Z | 15.545388250211326 | -88.76898578191039 | -               | checkpoint 25%  | checkpoint           |
| 2026-05-29T04:25:52.629Z | 15.359093406593406 | -89.00710439560439 | -               | checkpoint 50%  | checkpoint           |
| 2026-05-29T05:15:12.629Z | 15.172798562975485 |  -89.2452230092984 | -               | checkpoint 75%  | checkpoint           |
| 2026-05-29T06:04:22.629Z | 14.987133093829247 |  -89.4825371682164 | -               | checkpoint 100% | checkpoint           |
| 2026-05-29T06:14:12.629Z |              14.95 |             -89.53 | en_transito     | en_destino      | RADIO_LLEGADA_M      |

## Trip snapshots

trip_before.json:

```json
{
  "id": "sim-1",
  "origin": "Puerto Barrios",
  "destination": "Zacapa",
  "unit_id": "unit-123",
  "state": "programado",
  "route_id": "route-sim"
}
```

trip_en_destino.json:

```json
{
  "id": "sim-1",
  "origin": "Puerto Barrios",
  "destination": "Zacapa",
  "unit_id": "unit-123",
  "state": "en_destino",
  "route_id": "route-sim"
}
```

trip_final.json: (no existe)

## Comparativa de longitud de ruta

- longitud_inicial: 131416 m (route.length_meters)
- longitud_consumida (último checkpoint registrado): 124855 m
- longitud_restante: 131416 - 124855 = 6561 m
- % consumido: 124855 / 131416 = 95.02% (dentro de tolerancia 5%)

## Logs de telemetría (resumen)

- Total puntos generados: 1185
- Lecturas por tick: cada 10s a ~40 km/h (distancia por tick ~111.11 m)
- Eventos importantes están en events.json (cronológico). Distancias reportadas en metros en cada evento.

## Fallos / Anomalías / Recomendaciones

- No se alcanzó `finalizado` (no hubo retorno detectado dentro del dataset). Posibles causas:
  - La simulación fue unidireccional (llegada a Zacapa) y no incluyó un trayecto de regreso.
  - Si la lógica real espera eventos de telemetría adicionales o un rango de tiempo mayor, añadir puntos posteriores para simular regreso.
- Recomendación: para verificar `de_vuelta` y `finalizado`, generar una segunda etapa de puntos desde Zacapa de regreso a Puerto Barrios y re-ejecutar.

## Archivos creados / commit

- Branch: e2e/geofence-sim
- Commit: b5f245ece82ff02955b62d0baae56b741ed20ae5

Archivos creados:

- scripts/generatePoints.js
- scripts/simulateTrip.js
- tests/e2e/data/points_payloads.json
- tests/e2e/geofence.simulation.test.ts
- tests/e2e/harness/useGeofenceHarness.tsx
- tests/e2e/geofence/artifacts/events.json
- tests/e2e/geofence/artifacts/points_payloads.json
- tests/e2e/geofence/artifacts/route.json
- tests/e2e/geofence/artifacts/trip_before.json
- tests/e2e/geofence/artifacts/trip_en_destino.json
- tests/e2e/geofence/artifacts/report.md

## Comandos ejecutados

- node scripts/generatePoints.js
- node scripts/simulateTrip.js
- git checkout -b e2e/geofence-sim
- git add scripts tests
- git commit -m "Add geofence e2e simulation and artifacts"

---

Informe generado automáticamente.

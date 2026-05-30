This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Geofence configuration and E2E examples

The project exposes a geofence helper hook at `src/hooks/useGeofence.ts` which now supports two trip types and configurable thresholds for tests and production.

Key parameters (can be passed to the hook or set via environment variables):

- tripType: "one-way" | "roundtrip" (default: "roundtrip")
- radioInicioM / NEXT_PUBLIC_GEOFENCE_RADIO_INICIO_M (default: 150)
- radioLlegadaM / NEXT_PUBLIC_GEOFENCE_RADIO_LLEGADA_M (default: 75)
- radioSalidaM / NEXT_PUBLIC_GEOFENCE_RADIO_SALIDA_M (default: 120)
- radioRetornoM / NEXT_PUBLIC_GEOFENCE_RADIO_RETORNO_M (default: 150)
- lecturasParaInicio / NEXT_PUBLIC_GEOFENCE_LECTURAS_PARA_INICIO (default: 2)
- lecturasParaSalida / NEXT_PUBLIC_GEOFENCE_LECTURAS_PARA_SALIDA (default: 3)
- lecturasParaFinalizacionOneWay / NEXT_PUBLIC_GEOFENCE_LECTURAS_PARA_FINALIZACION_ONEWAY (default: 3)
- porcentajeFinalizacionOneWay / NEXT_PUBLIC_GEOFENCE_PORCENTAJE_FINALIZACION_ONEWAY (default: 95)

Examples (E2E):

- Roundtrip simulation (Puerto Barrios → Zacapa → Puerto Barrios): use default `tripType: "roundtrip"`. The hook will emit `en_destino`, then `salida_destino`/`de_vuelta` and finally `finalizado` when returning inside the return radius.

- One-way simulation (Puerto Barrios → Zacapa only): set `tripType: "one-way"`. The hook will allow `finalizado` when either:
  - lecturasDentroDestino >= lecturasParaFinalizacionOneWay (stable readings inside destination radius), or
  - distanceConsumedMeters / routeLengthMeters * 100 >= porcentajeFinalizacionOneWay (e.g. 95%).

Usage snippet:

```ts
import { useGeofence } from "src/hooks/useGeofence";

const { transicion, distanciaDestinoM } = useGeofence({
  trackerLat,
  trackerLng,
  estadoActual,
  destinoLat,
  destinoLng,
  bloqueado,
  lecturasFueraDestino,
  lecturasInicioConfirm,
  tripType: "one-way",
  lecturasDentroDestino, // contador de lecturas consecutivas dentro del radio destino
  routeLengthMeters,
  distanceConsumedMeters,
  debug: true, // habilita logs explicativos
});
```

Unit tests are included at `tests/useGeofence.test.ts` demonstrating `roundtrip` vs `one-way` behaviors using the existing simulation-derived parameters.

Adjust environment variables or pass params to the hook when running CI/E2E to reproduce both scenarios.

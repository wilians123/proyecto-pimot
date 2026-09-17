# ARCHIVO DE INSTRUCCIONES DE AGENTES - PROYECTO PIMOT

> Plataforma Inteligente de Monitoreo de Operaciones de Transporte

## 🏗️ REGLAS GENERALES Y ARQUITECTURA DEL PROYECTO

1. **Stack Tecnológico:**
   - Framework: Next.js (App Router), React 19, TypeScript.
   - Estilos: Tailwind CSS v4.
   - Base de Datos & Auth: Supabase SSR, PostgreSQL, Row Level Security (RLS).
   - Telemática & GIS: Navixy API, Leaflet / react-leaflet, Nominatim (acotado a Guatemala).
   - Pruebas: Jest, scripts Node.js para simulación E2E.

2. **Reutilización Estricta:**
   - Componentes UI: Antes de crear nuevos elementos, REVISAR y REUTILIZAR los componentes en `src/components/shared/` (`KpiCard.tsx`, `AlertaBadge.tsx`, `DestinoAutocomplete.tsx`, etc.).
   - Estilos Globals: Respetar tokens en `src/app/globals.css`.
   - Tipado: Utilizar ÚNICAMENTE los tipos estrictos de `src/types/database.ts`.

3. **Seguridad & APIs:**
   - Nunca exponer credenciales (`NAVIXY_HASH`, claves maestras) en el cliente. Canalizar a través de API Routes (`src/app/api/`).

---

## 🤖 ROLES Y AGENTES ESPECIALIZADOS

### 1. 🎨 Agente Frontend & Experiencia de Usuario (UI/UX)

- **Responsabilidad:** Vistas, componentes interactivos y layouts.
- **Directrices:**
  - Trabajar bajo App Router (distinguir `use client` de Server Components).
  - Manejar el estado global de navegación mediante `AppContext.tsx` y la estructura del `AppShell` / `Sidebar`.
  - Asegurar que entradas de destino usen `DestinoAutocomplete.tsx`.

### 2. 🛡️ Agente Backend, Auth & Base de Datos (Supabase)

- **Responsabilidad:** Esquema PostgreSQL, migraciones, RLS, Server Actions y Auth.
- **Directrices:**
  - Manejar autenticación vía `AuthContext.tsx` e instancias adecuadas de Supabase (`supabaseAdmin` para servidor).
  - Respetar políticas RLS (revisar `rls_viajes_minimal.sql` y `safe_migration_geofence.sql`).
  - Sincronizar esquemas SQL con `src/types/database.ts`.

### 3. 🗺️ Agente de Telemática & GIS (Navixy & Leaflet)

- **Responsabilidad:** Integración Navixy, mapas Leaflet, Nominatim y motor de geocercas.
- **Directrices:**
  - Implementar cálculos geoespaciales (Fórmula de Haversine).
  - Lógica central en `src/services/geofence-processor.service.ts`.
  - Control de estados e interacción GPS mediante `useGeofence.ts` y `useNavixy.ts`.
  - Consultas de Nominatim acotadas al territorio de Guatemala.
  - Llamadas a la API de Navixy canalizadas por `src/app/api/gps/`.

### 4. 🧪 Agente de QA, Automatización & Simulación

- **Responsabilidad:** Scripts de prueba E2E, simulación de viajes e interpolación GPS.
- **Directrices:**
  - Mantener scripts en `scripts/` (`generatePoints.js`, `simulateTrip.js`).
  - Generar artefactos de prueba en `tests/e2e/geofence/artifacts/`.
  - Ejecutar tests en Jest para verificar reglas de desvío/parada.

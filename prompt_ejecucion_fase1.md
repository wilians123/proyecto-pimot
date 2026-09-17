# PROMPT DE EJECUCIÓN — Fase 1: Conectar infraestructura ya construida (PIMOT)

Copia y pega este prompt completo en tu asistente de IA de codificación, con acceso al repositorio del proyecto PIMOT. La Fase 0 ya está completada — esta fase asume que el sidebar, el header y la limpieza de código muerto ya quedaron resueltos.

---

## CONTEXTO

Eres un desarrollador senior de frontend/fullstack trabajando sobre **PIMOT** (Next.js + TypeScript + Supabase). El backend de esta fase **ya existe y funciona**: tablas con RLS, hooks de datos con Supabase Realtime, y una interfaz visual ya construida en varios módulos. Tu tarea en esta fase es **cablear** — conectar UI existente con datos reales — no diseñar ni construir componentes visuales nuevos desde cero, salvo donde se indique explícitamente.

## REGLA MÁS IMPORTANTE

**No cambies el diseño visual de ningún componente ya existente.** El objetivo de esta fase es que los datos mostrados sean reales, no que la interfaz se vea diferente. Si para conectar un dato necesitas ajustar una prop o un nombre de campo, hazlo, pero conserva el layout, las clases de Tailwind y la estructura visual tal como están.

Antes de cada tarea, localiza el código real actual (puede haber cambiado ligeramente desde la auditoría). Verifica compilación (`npm run build` o `tsc --noEmit`) después de cada tarea antes de continuar con la siguiente.

---

## TAREAS A IMPLEMENTAR (en este orden)

### 1. Dashboard: reemplazar datos de muestra por datos reales

- **Dónde**: el componente del Dashboard (módulo principal / página de inicio).
- **Problema actual**: usa `VIAJES_MUESTRA` y `ALERTAS_MUESTRA` (arreglos estáticos importados de `src/lib/constants.tsx`) en lugar de datos reales de Supabase.
- **Qué hacer**:
  - Reemplaza `VIAJES_MUESTRA` por el hook `useViajes()` (definido en `src/hooks/useViajes.ts`). Retorna `{ viajes, loading, error, refetch }`. Cada viaje ya viene con relaciones (`piloto`, `cabezal`, `chasis`, `cliente`) resueltas vía join, así que no necesitas hacer fetches adicionales. Si el Dashboard filtraba antes por "viajes activos" usando el mock, replica ese mismo filtro sobre `viajes` (ej. `estado !== 'finalizado'`), tal como ya se hace en el componente actual.
  - Reemplaza `ALERTAS_MUESTRA` por el hook `useAlertas(true)` (definido en `src/hooks/useAlertas.ts`), pasando `true` para traer solo alertas activas (`pendiente` o `enviada`). Retorna `{ alertas, loading, refetch }`. Cada alerta ya trae `viaje: { codigo, origen, destino }` vía join.
  - Conecta también `useStats()` (definido en `src/hooks/useStats.ts`, hoy sin usar en ningún componente) para las tarjetas KPI del Dashboard. Retorna `{ stats, loading }`, donde `stats` tiene la forma `{ total, finalizados, en_transito, programados, cancelados, dur_prom_min, cumplimiento }`. Mapea cada KPI visual existente al campo correspondiente de `stats` (si el Dashboard ya tenía tarjetas de "total de viajes", "cumplimiento", etc. con valores hardcodeados o mock, ahora deben venir de aquí).
  - Maneja el estado `loading` de cada hook mostrando el mismo patrón de carga que ya use el resto de la app (o un estado simple si no existe aún; no inventes un nuevo sistema de skeletons en esta fase, eso es parte de la Fase 4).
- **Criterio de aceptación**: si se crea un viaje o una alerta nueva en la base de datos, el Dashboard la refleja sin necesidad de mock ni de recargar manualmente el código (gracias al Realtime ya incluido en los hooks).

### 2. Alertas: construir el componente real del módulo

- **Dónde**: `src/modules/alertas/` (hoy solo tiene `index.ts` vacíos, sin componente) y `src/components/layout/Header.tsx` (panel de notificaciones).
- **Problema actual**: no existe `Alertas.tsx`. La vista de alertas que se ve hoy en la app (dentro de `AppShell.tsx`, inline) y el panel de notificaciones del Header usan `ALERTAS_MUESTRA` (mock), sin conexión al hook real `useAlertas.ts` que ya tiene Realtime funcionando.
- **Qué hacer**:
  - Crea `src/modules/alertas/components/Alertas.tsx`, tomando como base visual el bloque de alertas que hoy vive inline en `AppShell.tsx` (para no rediseñar nada, solo extraerlo y conectarlo).
  - Usa `useAlertas()` (sin el filtro `soloActivas`, para ver el historial completo en la vista de módulo) para poblar la tabla/lista.
  - Actualiza el `switch` de `AppShell.tsx` para que el `case "alertas"` renderice `<Alertas />` en lugar del bloque inline con mock.
  - En `Header.tsx`, reemplaza `ALERTAS_MUESTRA` por `useAlertas(true)` (alertas activas) para el panel de notificaciones. Conserva el diseño visual del panel tal cual está.
  - Exporta el componente desde `src/modules/alertas/index.ts`.
- **Criterio de aceptación**: una alerta nueva insertada en la tabla `alertas` aparece tanto en el módulo de Alertas como en el panel de notificaciones del Header, sin recargar la página.

### 3. Clientes: conectar CRUD real a Supabase

- **Dónde**: `src/modules/clientes/components/Clientes.tsx`.
- **Problema actual**: usa un arreglo `CLIENTES_MOCK` hardcodeado. Los botones de crear/editar/activar/desactivar no llaman a Supabase, solo cambian estado local.
- **Columnas reales de la tabla `clientes`**: `id`, `nombre`, `tipo` (`'directo'` | `'indirecto'`), `telefono`, `correo`, `direccion`, `activo`, `created_at`, `updated_at`. La tabla ya tiene RLS configurado (lectura para todos los roles autenticados, escritura para `admin`/`operativo`).
- **Qué hacer**:
  - Sigue el mismo patrón que ya usan `useViajes.ts` / `useAlertas.ts` (fetch inicial + `supabase.from('clientes')...` + opcionalmente canal de Realtime si el resto de módulos ya lo tienen; si prefieres simplicidad, un hook `useClientes()` sin Realtime es válido, ya que Clientes no es un dato de alta frecuencia de cambio).
  - Conecta el formulario de creación/edición para hacer `insert` / `update` reales sobre la tabla `clientes`.
  - Conecta el botón de activar/desactivar para hacer `update` real del campo `activo` (no solo cambiar estado local como hoy).
  - Mantén exactamente el mismo diseño de tabla, formulario y flujo de confirmación inline que ya existe — solo cambia el origen y destino de los datos.
- **Criterio de aceptación**: crear, editar o desactivar un cliente desde la UI persiste en la base de datos y se refleja correctamente al recargar la página.

### 4. Usuarios y Seguridad: conectar a Supabase Auth + tabla `profiles`

- **Dónde**: `src/modules/usuarios/components/Usuarios.tsx`.
- **Problema actual**: usa un arreglo `USUARIOS_MOCK` hardcodeado. La matriz de permisos y las acciones son decorativas.
- **Columnas reales de la tabla `profiles`**: `id` (mismo UUID que `auth.users.id`), `nombre`, `telefono`, `rol` (`'admin'` | `'operativo'` | `'visualizador'`), `activo`, `avatar_url`, `created_at`, `updated_at`. **Importante**: el correo electrónico no vive en `profiles`, vive en `auth.users` — si la UI necesita mostrarlo, tendrás que traerlo por separado (ver nota de creación de usuarios abajo).
- **Ya existe un trigger** (`handle_new_user`) que crea automáticamente una fila en `profiles` cuando se crea un usuario en `auth.users`, usando `raw_user_meta_data.nombre` y `raw_user_meta_data.rol` (o `'operativo'` por defecto si no se especifica).
- **Qué hacer**:
  - Conecta la tabla/listado de usuarios a un `select` real sobre `profiles` (con `supabase.from('profiles')...`).
  - Conecta la edición de rol y el activar/desactivar usuario a un `update` real sobre `profiles` (respetando que solo `admin` puede hacer esto, según las políticas RLS ya definidas).
  - **Para la creación de nuevos usuarios** necesitas una ruta de API en el servidor (ej. `src/app/api/usuarios/route.ts`) que use `supabaseAdmin` (ya definido en `src/lib/supabase-server.ts`, con `SUPABASE_SERVICE_ROLE_KEY`) para llamar a `supabaseAdmin.auth.admin.createUser({ email, password, user_metadata: { nombre, rol } })`. Esto es necesario porque el cliente (navegador) no tiene permisos para crear usuarios en nombre de otra persona; no es un cambio de diseño, es el mecanismo obligatorio de Supabase Auth para este flujo. El trigger `handle_new_user` se encargará de crear el `profile` automáticamente.
  - Mantén el diseño visual de la tabla, el formulario y la matriz de permisos exactamente como están — solo cambia el origen de los datos y conecta las acciones a llamadas reales.
- **Criterio de aceptación**: crear un usuario nuevo desde la UI crea también su registro en `profiles` automáticamente (vía el trigger), y cambiar su rol o estado activo desde la UI persiste correctamente.

---

## AL FINALIZAR

Entrega un resumen con:
- Estado de las 4 tareas (completada / bloqueada — con motivo).
- Archivos nuevos y modificados (incluyendo si se creó la ruta de API para creación de usuarios).
- Confirmación de que, para cada módulo, los datos mostrados en la UI corresponden a la base de datos real (no a ningún arreglo mock restante).
- Cualquier hallazgo adicional detectado durante el trabajo, sin corregirlo, solo para reporte.
- Confirmación de que el proyecto compila correctamente al final de todas las tareas.

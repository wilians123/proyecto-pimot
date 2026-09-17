# PROMPT DE EJECUCIÓN — Fase 2: Módulo de Renta de Chasis (PIMOT)

Copia y pega este prompt completo en tu asistente de IA de codificación, con acceso al repositorio del proyecto PIMOT. Las Fases 0 y 1 ya están completadas.

---

## CONTEXTO

Eres un desarrollador senior fullstack trabajando sobre **PIMOT** (Next.js + TypeScript + Supabase). En esta fase construirás un módulo nuevo desde cero — **Renta de Chasis** — sobre un backend que ya existe y está listo (tablas, RLS, relaciones). También cerrarás 3 pendientes menores que quedaron señalados en las fases anteriores.

## REGLA MÁS IMPORTANTE

Para el módulo nuevo, sigue **exactamente los mismos patrones visuales y de código** que ya usan los módulos existentes (Flota, Pilotos, Clientes): mismo estilo de tabla (`rounded-2xl border border-slate-200`, encabezado sin fondo — ya unificado en Fase 0), mismo patrón de formulario, mismo fallback de tarjetas en móvil (`hidden md:block` / `md:hidden space-y-3`), mismos componentes compartidos (`Badge`, `KpiCard`, etc.) donde apliquen. No inventes un estilo nuevo para este módulo.

Verifica compilación (`npm run build` o `tsc --noEmit`) después de cada tarea.

---

## PARTE A — Pendientes de fases anteriores (hacer primero, son rápidos)

### A.1 Corregir el saludo hardcodeado del Dashboard
- **Dónde**: componente del Dashboard.
- **Problema**: el saludo ("Buenas tardes, Willians") sigue mostrando un nombre fijo, aunque ya se corrigió el mismo problema en el Sidebar durante la Fase 0.
- **Qué hacer**: reemplaza el nombre fijo por `profile.nombre` (o el campo equivalente) desde `AuthContext`, igual que se hizo en el Sidebar. Conserva la lógica de franja horaria ("Buenos días" / "Buenas tardes" / "Buenas noches") si ya existe, solo cambia el nombre.

### A.2 Resolver la advertencia de `package-lock.json` duplicado
- **Problema**: Next.js detecta un `package-lock.json` fuera del proyecto (en `C:\Users\Usuario`), lo que genera una advertencia de "múltiples raíces de workspace" y puede causar que Next.js infiera mal la raíz del proyecto.
- **Qué hacer**: primero confirma si ese archivo es necesario para algo (probablemente no, si no hay un `package.json` correspondiente ahí). Si no es necesario, elimínalo. Si por alguna razón no se puede eliminar (fuera del control del repositorio), en su lugar define explícitamente la raíz del proyecto en `next.config.js`/`next.config.ts` usando la opción `outputFileTracingRoot` apuntando a la carpeta real del proyecto, para que la advertencia deje de aparecer sin depender de borrar archivos fuera del repo.

### A.3 Conectar los indicadores de flota y "piloto destacado" del Dashboard
- **Dónde**: componente del Dashboard.
- **Problema**: estos dos indicadores siguen siendo estáticos, no reflejan datos reales.
- **Qué hacer**:
  - **Estado de flota**: reemplaza el indicador estático por un conteo real agrupando `cabezales` por `estado` (`activo`, `en_viaje`, `en_mantenimiento`, `inactivo`) y `chasis` por `estado` (`disponible`, `en_renta`, `en_flete`, `en_taller`). Puedes hacerlo con dos consultas simples de Supabase (`select estado` con conteo en el cliente, o `count` agrupado si prefieres una función RPC), sin necesidad de crear un hook nuevo si el patrón actual del Dashboard no lo requiere.
  - **Piloto destacado**: no existe hoy una definición de "destacado" en el sistema, así que usa este criterio por defecto (razonable y verificable): **el piloto con más viajes finalizados en los últimos 30 días**. Si más adelante el equipo quiere otro criterio (ej. mejor cumplimiento de tiempos), se puede ajustar después — no bloquees esta tarea por eso, solo deja el cálculo claramente aislado en una función o variable fácil de modificar.
- **Criterio de aceptación**: ambos indicadores cambian si se actualiza el estado de un cabezal/chasis o se finaliza un viaje, sin necesidad de tocar código.

---

## PARTE B — Módulo nuevo: Renta de Chasis

### Contexto del backend (ya existe, no crear tablas nuevas)

- **`chasis`**: `id`, `placa`, `tamaño` (`'20'|'40'|'45'`), `estado` (`'disponible'|'en_renta'|'en_flete'|'en_taller'`), `marca`, `modelo`, `numero_serie`, `notas`.
- **`tipos_renta`**: `id`, `nombre`, `modalidad` (`'por_viaje'|'mensual'|'por_dia'`), `precio_base`, `dias_incluidos`, `precio_dia_extra`, `activo`. RLS: cualquier usuario autenticado puede leer (`todos_ven_tipos_renta`); solo `admin` puede escribir (`admin_gestiona_tipos_renta`).
- **`rentas_chasis`**: `id`, `chasis_id` (FK → chasis), `cliente_id` (FK → clientes), `tipo_renta_id` (FK → tipos_renta), `fecha_inicio`, `fecha_fin`, `dias_extra` (default 0), `costo_total`, `estado` (`'activa'|'cerrada'|'cancelada'`), `notas`, `creado_por` (FK → profiles). RLS: cualquier autenticado puede leer (`usuarios_autenticados_ven_rentas`); `admin` y `operativo` pueden escribir (`admin_operativo_gestionan_rentas`).

Nota: la tabla `viajes` también tiene un `tipo_renta_id` opcional para viajes con `tipo_servicio = 'renta'` — eso es parte del módulo de Viajes ya existente, **no lo toques**; este módulo nuevo se enfoca solo en `rentas_chasis` y `tipos_renta`.

### Tareas

**1. Hook `useRentasChasis`** (`src/hooks/useRentasChasis.ts`)
- Sigue el mismo patrón que `useViajes.ts` / `useAlertas.ts` (fetch + joins + realtime opcional).
- `select` con joins a `chasis`, `cliente:clientes(*)`, `tipo_renta:tipos_renta(*)`.
- Acepta un filtro opcional por `estado`.
- Expón funciones para: crear renta, cerrar renta, cancelar renta (ver lógica de negocio abajo).

**2. Hook `useTiposRenta`** (`src/hooks/useTiposRenta.ts`)
- CRUD simple sobre `tipos_renta` (no necesita realtime, es un catálogo de baja frecuencia de cambio).

**3. Lógica de negocio: crear una renta**
Al crear una renta nueva desde el formulario:
- Solo debe permitir seleccionar chasis con `estado = 'disponible'` (filtra el listado del selector).
- Calcula `costo_total` automáticamente según la `modalidad` del `tipo_renta` seleccionado:
  - `por_dia`: `precio_base * (días entre fecha_inicio y fecha_fin, o solo precio_base si fecha_fin es nula todavía)`.
  - `mensual` / `por_viaje`: `precio_base + (dias_extra * precio_dia_extra)`, usando `dias_incluidos` como referencia informativa en el formulario (para que el usuario vea cuántos días trae incluidos el plan).
  - Muestra el cálculo en pantalla antes de confirmar, y permite que el usuario ajuste `dias_extra` manualmente si aplica.
- Al guardar: (a) inserta la fila en `rentas_chasis` con `estado = 'activa'`, y (b) actualiza `chasis.estado = 'en_renta'` para el chasis seleccionado. Estas dos escrituras deben ejecutarse una después de la otra con manejo de error — si la segunda falla, informa al usuario claramente que la renta se creó pero el estado del chasis no se actualizó, para que pueda corregirlo manualmente (no es necesario implementar una transacción atómica en la base de datos para esta fase, pero si te sientes cómodo agregando una función RPC de Postgres que haga ambas escrituras en una sola transacción, es la mejora natural a futuro — dejarlo anotado en tu reporte final si no lo implementas).

**4. Lógica de negocio: cerrar o cancelar una renta**
- Botón "Cerrar renta": cambia `estado` a `'cerrada'`, fija `fecha_fin` si no estaba fijada, y actualiza `chasis.estado = 'disponible'`.
- Botón "Cancelar renta": cambia `estado` a `'cancelada'` y también libera el chasis a `'disponible'`.
- Sigue el mismo patrón de confirmación inline (fila que se expande a "¿Confirmar?") que ya usan Clientes/Usuarios.

**5. Componente principal** (`src/modules/renta-chasis/components/RentaChasis.tsx`)
- Tabla de rentas (activas por defecto, con filtro para ver históricas/cerradas/canceladas), mostrando: chasis (placa), cliente, tipo de renta, fecha inicio, fecha fin, costo total, estado, con las acciones de cerrar/cancelar.
- Formulario de nueva renta (según lógica de negocio del punto 3).
- Una segunda pestaña o sección para gestionar el catálogo de **Tipos de Renta** (tabla simple con CRUD, visible/editable solo para rol `admin` — oculta o deshabilita las acciones de escritura si el usuario no es admin, replicando el mismo patrón de permisos por rol que ya usa el módulo de Usuarios).
- Exporta desde `src/modules/renta-chasis/index.ts`.

**6. Integración a la navegación**
- Agrega el nuevo módulo a `NAV_ITEMS` en `src/lib/constants.tsx` (ícono, id, label — sugerido: `"Renta de Chasis"`, id `"renta-chasis"`).
- Agrega la entrada correspondiente en `MODULO_HEADERS`.
- Agrega el `case "renta-chasis":` en el switch de `AppShell.tsx`, renderizando `<RentaChasis />`.

**7. Consistencia con Flota**
- En `src/modules/flota/components/Flota.tsx`, confirma que el dropdown de estado de chasis (ya corregido en Fase 0 para incluir los 4 estados) refleje correctamente que un chasis "en_renta" fue puesto en ese estado por este módulo nuevo — no debería ser editable manualmente a "en_renta" desde Flota si ya existe una renta activa para ese chasis (para evitar que alguien lo cambie manualmente y se pierda la referencia a la renta). Si esto requiere una validación adicional, agrégala, pero sin cambiar el diseño visual del dropdown.

---

## AL FINALIZAR

Entrega un resumen con:
- Estado de las tareas A.1, A.2, A.3 y de cada tarea de la Parte B (completada / bloqueada — con motivo).
- Archivos nuevos y modificados.
- Confirmación de que el flujo completo funciona de extremo a extremo: crear renta → chasis pasa a "en_renta" → cerrar/cancelar renta → chasis vuelve a "disponible".
- Cualquier hallazgo adicional detectado durante el trabajo, sin corregirlo, solo para reporte (por ejemplo, si detectas que el campo de ingresos por cliente sería útil de agregar al esquema — no lo implementes, solo anótalo).
- Confirmación de que el proyecto compila correctamente al final de todas las tareas.

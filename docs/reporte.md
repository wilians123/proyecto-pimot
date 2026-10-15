# Reporte de ejecución: Geocercas Fase 7

**Fecha:** 10 de octubre de 2026  
**Repositorio:** `C:\Users\Usuario\Desktop\pimot`  
**Alcance:** implementación del prompt `prompts/prompt_ejecucion_fase7.md`, fases 1–7.

## Resumen

Se implementó el flujo de evaluación automática de geocercas, los cambios de interfaz y mapa, el sondeo local, los datos de prueba y la documentación de despliegue. Se añadieron las pruebas unitarias y se escribieron las pruebas de integración protegidas por las dos variables de habilitación requeridas.

No se ejecutaron pruebas de integración contra la base de datos real, no se aplicaron migraciones SQL y no se modificó el viaje real VJ-2026-0026. Los únicos archivos SQL agregados son datos auxiliares de prueba (`seed.sql` y `cleanup.sql`).

## Cambios realizados

### 1. Lógica de geocercas y utilidades

- `src/lib/geofence.ts`: se incorporó la lógica pura del nuevo modelo de geocercas, con el origen PIMOT canónico (15.640187, -88.546492), configuración por defecto, medición de distancias, evaluación de lecturas y estados/eventos de transición. Se conservaron `GEOFENCE_CONFIG` y `evaluarGeofence` para compatibilidad con el harness E2E existente.
- `src/lib/unidades-ocupadas.ts`: nueva utilidad para identificar unidades ocupadas y compartir la selección entre la interfaz y las pruebas.
- `src/utils/rumbo.ts`: normalización defensiva del rumbo GPS documentado `gps.heading`; devuelve `null` si el dato no es utilizable, sin inferirlo desde coordenadas ni usar alias alternativos.
- `src/utils/escapeHtml.ts`: nueva utilidad de escape para texto insertado en contenido HTML.
- `src/utils/formatDate.ts`: helpers de conversión y presentación de fechas usando la zona horaria fija de Guatemala (`-06:00`).
- `src/utils/navixy-diagnostic.ts`: diagnóstico de desarrollo de una sola emisión por proceso que imprime exclusivamente los nombres de las claves GPS de Navixy.

### 2. Tipos

- `src/types/database.ts`: tipos para las tablas `geofence_config`, `geofence_viaje_estado` y `geofence_eventos`, campos adicionales de viajes y RPCs. Se agregaron las firmas de `geofence_registrar_lectura` y `geofence_parametros_viaje`; `actualizar_estado_viaje_automatico` conserva sus argumentos y queda tipada con retorno `Json`.
- `src/types/index.ts`: se añadió `transiciones_inferidas` al tipo de viaje correspondiente.

### 3. Procesador y API

- `src/services/geofence-processor.service.ts`: reemplazo del flujo anterior por la selección de viajes evaluables y el procesamiento centralizado. Incluye carga compartida de configuración/estados, lecturas y transiciones vía RPC, control para evitar persistencias ante lecturas ausentes o rechazadas, y contadores/resumen de ejecución.
- `src/app/api/geofence/process/route.ts`: integración con el procesador y respuesta HTTP con el resumen de trabajo. Mantiene protección mediante secreto del cron y agrega el diagnóstico de claves GPS en desarrollo.
- `src/app/api/geofence/simulate/route.ts`: nueva ruta de simulación deshabilitada por defecto; requiere `GEOFENCE_SIM_ENABLED=1`, autenticación configurada y cabezales de prueba cuya placa comience por `TEST-GF`.
- `src/app/api/gps/estados/route.ts`: normalización tipada de `gps.heading` y emisión del diagnóstico no productivo de claves Navixy.
- `src/services/viajes.service.ts`: se marcaron como obsoletas las operaciones previas de escritura automática para evitar que la interfaz mantenga el mecanismo reemplazado.

### 4. Interfaz y mapa

- `src/hooks/useGeofence.ts`: el hook pasó a consumir el estado para presentación; deja de escribir transiciones automáticamente.
- `src/components/shared/SeguimientoViaje.tsx`: se retiró la automatización cliente y se ajustó la vista al estado procesado por el backend.
- `src/modules/viajes/components/Viajes.tsx`: fechas de entrada/salida interpretadas en hora de Guatemala, origen canónico, filtrado de cabezales ocupados y actualización de disponibilidad. Se maneja el conflicto de unicidad `23505` y se presenta el estado inferido.
- `src/modules/dashboard/components/Dashboard.tsx`: fechas del dashboard presentadas en la zona horaria definida.
- `src/components/shared/MapaFlota.tsx`: consume rumbo tipado; conserva el último rumbo válido del vehículo detenido y usa cero cuando todavía no hay rumbo válido. Se orienta el icono mediante el ajuste indicado por la implementación y se escapa texto del popup.

### 5. Simulación y datos de prueba

- `scripts/geofence-sim/drive.mjs`: cliente para enviar posiciones de prueba al endpoint de simulación.
- `scripts/geofence-sim/poll-local.mjs`: sondeo local del endpoint de proceso, con validación de URL local por defecto, vista previa de viajes activos y confirmación interactiva antes de iniciar. `--allow-remote` habilita explícitamente otro host; `--yes` omite la confirmación.
- `scripts/geofence-sim/seed.sql` y `scripts/geofence-sim/cleanup.sql`: creación y limpieza de fixtures de prueba para cabezales `TEST-GF`; no son migraciones y no se ejecutaron en la BD real.
- `scripts/generatePoints.js`, `scripts/generateReturnPoints.js` y `scripts/simulateTrip.js`: se actualizaron para usar el origen canónico.
- Se regeneraron `tests/e2e/data/points_payloads.json`, `tests/e2e/data/points_payloads_return.json` y los artefactos de `tests/e2e/geofence/artifacts/` (`events`, rutas, puntos y estados antes/en destino) con las coordenadas actualizadas.
- `package.json`: se agregaron `test:geofence`, `geofence:drive` y `geofence:poll`; el comando de Jest excluye las pruebas internas de push.

### 6. Pruebas agregadas

- `src/lib/__tests__/geofence.test.ts`: casos unitarios de la lógica de geocercas.
- `src/lib/__tests__/unidades-ocupadas.test.ts`: selección de unidades ocupadas.
- `src/utils/__tests__/rumbo.test.ts`, `fechas.test.ts` y `escapeHtml.test.ts`: pruebas para las utilidades nuevas y actualizadas.
- `src/services/__tests__/seleccion-evaluables.test.ts`: reglas de selección de viajes evaluables.
- `src/services/__tests__/geofence-it.helpers.ts`: fixtures, helpers y guardas para no ejecutar pruebas de integración sin habilitación explícita.
- `src/services/__tests__/geofence-processor.integration.test.ts`: escenarios S1–S19 del procesador.
- `src/services/__tests__/geofence-viaje-maestro.integration.test.ts`: escenarios A–I del viaje maestro.

Las dos suites de integración solo se habilitan cuando `GEOFENCE_IT=1` y `GEOFENCE_IT_CONFIRM_NO_WEBHOOK=1` están presentes. El helper también verifica la condición antes de continuar.

### 7. Documentación

- `docs/DESPLIEGUE_GEOFENCE.md`: variables requeridas, preparación de Supabase/Vercel, secuencia recomendada de cron y webhook, Firebase/Android, validaciones y reversa. No contiene valores secretos.
- Este archivo, `docs/reporte.md`, registra el detalle de implementación y verificación.

## Pruebas y verificaciones ejecutadas

| Comando/verificación | Resultado | Detalle |
|---|---|---|
| `npx tsc --noEmit` | Correcto | Sin errores de TypeScript al finalizar los cambios. |
| `npm run lint` | Correcto con advertencias | Sin errores. Reportó tres advertencias preexistentes: archivo generado `coverage/lcov-report/block-navigation.js`, variable `mensaje` no usada en `Clientes.tsx` e `icons` no usado en `Reportes.tsx`. |
| `npm run test:geofence` | Correcto con compatibilidad temporal | Resultado final: 6 suites aprobadas, 2 suites de integración omitidas; 29 pruebas aprobadas y 2 omitidas. La ejecución final usó un preload temporal para resolver la limitación `realpath` de este entorno. El preload fue eliminado después. |
| `npm run build` | Correcto | Build de producción completado: compilación, comprobación de TypeScript y generación de páginas estáticas. Para esta ejecución se establecieron valores ficticios de Supabase solo como variables del proceso; no se guardaron en archivos. |
| `git diff --check` | Correcto | Sin errores de whitespace. Git mostró avisos de conversión LF/CRLF para archivos editados en Windows; no son errores de contenido. |

### Pruebas de integración pendientes

Las suites S1–S19 y A–I están escritas, pero no ejecutadas. Requieren credenciales y una BD compatible; se omitieron para no tocar datos reales ni arriesgar notificaciones. Para ejecutarlas deliberadamente contra una BD de prueba y con el webhook de alertas desactivado:

```powershell
$env:GEOFENCE_IT='1'
$env:GEOFENCE_IT_CONFIRM_NO_WEBHOOK='1'
npm run test:geofence
```

## Fallos encontrados y resolución

1. **Jest en el sandbox de Windows — `EPERM` al llamar `realpath` nativo.** La primera ejecución normal de Jest no pudo resolver rutas debido a permisos del entorno restringido. Se utilizó un preload temporal de compatibilidad para la ejecución de la suite, sin modificar código del producto ni dejar el preload en el repositorio. Con ese ajuste la ejecución final pasó (29 aprobadas, 2 omitidas).
2. **Dos aserciones unitarias fallaron en la primera pasada.** Una esperaba una razón distinta para `sin_destino`; otra no contemplaba la normalización de una fecha inválida con rollover de calendario. Se corrigieron la expectativa/condición correspondiente y la validación de fecha; la siguiente ejecución de `npm run test:geofence` pasó.
3. **Primer build bloqueado por el sandbox durante canonicalización SWC.** Next/SWC no pudo canonicalizar `jsc.baseUrl` (`Acceso denegado`, error OS 5) con el proceso restringido. Se reintentó el build fuera del sandbox con autorización del entorno y variables ficticias efímeras de Supabase. El segundo intento completó correctamente.
4. **Incompatibilidad temporal en el escenario S4 del prompt.** El escenario pedía cubrir 6 km en 60 segundos (360 km/h), mientras el límite de velocidad plausible configurado es 160 km/h. El test conserva los extremos a ±3 km y usa 150 segundos (144 km/h) para que el caso no contradiga dicho límite. La decisión está anotada junto al escenario S4.

## Verificaciones manuales pendientes

- **Campo Navixy `gps.heading`:** no se obtuvo una respuesta real de Navixy durante esta ejecución. Queda pendiente de verificación manual. Para observar el diagnóstico, iniciar el servidor local con `npm run dev` y, en otra terminal, ejecutar `npm run geofence:poll`. El script lista los viajes que evaluará y solicita confirmación antes del sondeo, que puede cambiar estados y generar alertas reales. Revisar la lista y no confirmar si incluye VJ-2026-0026 o cualquier viaje que no deba procesarse. El diagnóstico de desarrollo imprime solo los nombres de las claves de `state.gps`.
- **RPC y permisos de `service_role`:** no se probaron contra la BD real. Si al ejecutar las pruebas controladas algún RPC devuelve `42501`, debe reportarse para revisión; no se modificó SQL para cambiar permisos.

## Límites de esta ejecución

- No se aplicaron migraciones ni se alteró el esquema remoto.
- No se ejecutaron `seed.sql` ni `cleanup.sql`.
- No se ejecutaron las pruebas de integración con credenciales reales.
- No se inició el sondeo sobre viajes reales ni se modificó VJ-2026-0026.
- El rumbo real de Navixy está pendiente de verificación manual, como se detalla arriba.

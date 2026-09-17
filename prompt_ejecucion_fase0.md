# PROMPT DE EJECUCIÓN — Fase 0: Correcciones inmediatas (PIMOT)

Copia y pega este prompt completo en tu asistente de IA de codificación (Claude Code u otro), con acceso al repositorio del proyecto PIMOT.

---

## CONTEXTO

Eres un desarrollador senior de frontend trabajando sobre el proyecto **PIMOT**, una plataforma de gestión logística construida en Next.js + TypeScript + Supabase. Se realizó una auditoría de código que identificó 10 correcciones puntuales de bajo esfuerzo y alto impacto ("Fase 0" de un roadmap mayor). Tu tarea es implementarlas **todas, completamente y sin dejar ninguna a medias**.

## REGLA MÁS IMPORTANTE

**No modifiques ningún comportamiento funcional que no esté explícitamente descrito en las tareas siguientes.** Esto es una fase de corrección y limpieza, no de rediseño ni de nuevas funcionalidades. Si al revisar un archivo detectas algo que parece "raro" pero no está en esta lista, no lo toques — anótalo al final en tu reporte para revisión posterior.

Antes de cada cambio, localiza el código real actual en el repositorio (no asumas que coincide exactamente con la descripción de abajo; puede haber cambiado). Si una tarea ya está resuelta en el código actual, indícalo en el reporte final en lugar de intentar "corregirla" de nuevo.

Al terminar cada tarea, verifica que el proyecto compile (`npm run build` o `tsc --noEmit`) antes de pasar a la siguiente.

---

## TAREAS A IMPLEMENTAR

### 1. Botón de "Cerrar sesión"
- **Dónde**: `src/components/layout/Sidebar.tsx` y/o `src/components/layout/Header.tsx`.
- **Problema actual**: no existe ningún botón de cerrar sesión visible en la interfaz.
- **Qué hacer**: agrega un botón de "Cerrar sesión" visible y accesible (idealmente en el footer del Sidebar, cerca del perfil del usuario). Debe llamar a la función `signOut()` que ya existe y está implementada en `src/context/AuthContext.tsx`. Al hacer clic, debe cerrar la sesión y redirigir al login (usa el mismo patrón de redirección que ya use el resto de la app tras logout, si existe).
- **Criterio de aceptación**: al hacer clic, la sesión de Supabase se cierra y el usuario termina en la pantalla de login.

### 2. Perfil real en el Sidebar
- **Dónde**: `src/components/layout/Sidebar.tsx`.
- **Problema actual**: el footer del sidebar muestra un nombre e iniciales hardcodeados (texto fijo tipo "Willians Administrador" / iniciales que no corresponden), sin relación con el usuario que inició sesión.
- **Qué hacer**: reemplaza ese texto fijo por los datos reales del usuario autenticado, obtenidos desde `AuthContext` (`profile` o el objeto equivalente ya expuesto por el contexto: nombre, rol, e iniciales calculadas dinámicamente a partir del nombre real).
- **Criterio de aceptación**: si inicias sesión con dos usuarios distintos, el sidebar muestra el nombre correspondiente a cada uno, no siempre el mismo texto.

### 3. Eliminar `case "usuarios"` duplicado
- **Dónde**: `src/components/layout/AppShell.tsx`.
- **Problema actual**: dentro del `switch` que decide qué módulo renderizar, existe un `case "usuarios":` que retorna el componente real `<Usuarios />`, y más abajo en el mismo switch un **segundo** `case "usuarios":` que retorna `<ModuloPlaceholder ... />`. Este segundo bloque es código muerto inalcanzable (JavaScript nunca llega a él).
- **Qué hacer**: elimina por completo el segundo bloque `case "usuarios":` (el que retorna `ModuloPlaceholder`). Verifica que no queden referencias sueltas ni imports que se vuelvan innecesarios tras el borrado.
- **Criterio de aceptación**: el switch tiene un único `case "usuarios"`, y el módulo de Usuarios sigue renderizando el componente real sin cambios visuales.

### 4. Completar el dropdown de estado de chasis
- **Dónde**: `src/modules/flota/components/Flota.tsx`, arreglo/objeto `OPCIONES_ESTADO_CHASIS` (o el nombre equivalente que tenga en el código actual).
- **Problema actual**: el enum real de la base de datos (`EstadoChasisDB` en `src/types/database.ts`) tiene 4 estados: `disponible`, `en_renta`, `en_flete`, `en_taller`. El dropdown de la UI solo ofrece 2: `disponible` y `en_taller`.
- **Qué hacer**: agrega las opciones faltantes (`en_renta`, `en_flete`) al arreglo/objeto de opciones, con su etiqueta en español y su color correspondiente, siguiendo el mismo patrón visual (badge con color) que ya usan las opciones existentes. Revisa si conviene reutilizar la paleta ya definida en `ESTADO_CHASIS_CONFIG` de `src/lib/constants.tsx` en vez de crear colores nuevos (ver tarea 6).
- **Criterio de aceptación**: el dropdown de estado de chasis en Flota permite seleccionar los 4 estados posibles, y cada uno se guarda correctamente en la base de datos.

### 5. Eliminar código muerto
- **Dónde y qué**:
  - `src/context/AppContext.tsx` (`AppProvider` / `useApp`): confirmar que ningún componente llama a `useApp()`. Si es así, eliminar el archivo y su uso en `layout.tsx` (quitar el `<AppProvider>` que envuelve la app).
  - `src/hooks/useTrackerViaje.ts`: archivo marcado como deprecado en su propio comentario. Confirmar que no se importa en ningún lado y eliminarlo.
  - `src/hooks/useStats.ts`: **no eliminar** — este hook se conectará en la Fase 1 del roadmap (Dashboard). Por ahora solo déjalo intacto, no forma parte de esta limpieza.
- **Qué hacer**: antes de borrar cualquier archivo, busca todas las referencias (`grep`/búsqueda global) para confirmar que efectivamente no se usan. Elimina el archivo y cualquier import roto que quede en otros archivos.
- **Criterio de aceptación**: el proyecto compila sin errores tras los borrados, y no quedan imports a archivos eliminados.

### 6. Unificar radio de bordes en tarjetas
- **Dónde**: `src/components/shared/KpiCard.tsx`.
- **Problema actual**: usa `rounded-xl`, mientras que el resto de tarjetas del sistema (contenedores de tabla, tarjetas de formulario, etc.) usan `rounded-2xl`.
- **Qué hacer**: cambia `rounded-xl` por `rounded-2xl` en el contenedor principal del componente.
- **Criterio de aceptación**: todas las tarjetas KPI del Dashboard (y donde se use `KpiCard`) tienen el mismo radio de esquina que el resto de la plataforma.

### 7. Unificar encabezado de tabla
- **Dónde**: `src/modules/viajes/components/Viajes.tsx` (y cualquier otro módulo que tenga la misma discrepancia).
- **Problema actual**: la fila `<thead><tr>` en Viajes usa `border-b border-slate-100 bg-slate-50/50`, mientras que en Pilotos, Flota y Clientes la misma fila usa solo `border-b border-slate-100` (sin fondo).
- **Qué hacer**: elige un único estándar para toda la plataforma (recomendado: sin el `bg-slate-50/50`, para mantener consistencia con la mayoría de los módulos ya existentes) y aplícalo en todos los módulos con tabla.
- **Criterio de aceptación**: todas las tablas de la plataforma (Viajes, Pilotos, Flota, Clientes, Usuarios) tienen el mismo estilo de encabezado.

### 8. Unificar tono de "rojo crítico"
- **Dónde**: cualquier componente que use badges o indicadores de estado negativo/crítico (`src/components/shared/Badge.tsx`, `src/components/shared/AlertaBadge.tsx`, `src/lib/constants.tsx` y configuraciones de color por módulo).
- **Problema actual**: el rojo usado para "crítico" o estados negativos varía entre `red-400`, `red-500` y `red-600` según el archivo.
- **Qué hacer**: define un único tono de rojo "crítico" para toda la plataforma (recomendado: `red-600` para texto/ícono y `red-50` o `red-100` para el fondo del badge, siguiendo el mismo patrón que ya usan los demás badges de la app) y actualiza todas las configuraciones de color que representen estados críticos/negativos para que usen ese mismo tono.
- **Criterio de aceptación**: buscando visualmente todos los indicadores rojos de "crítico" en la plataforma (alertas, estados cancelados/inactivos, etc.), todos usan exactamente el mismo tono.

### 9. Quitar el texto fijo "Actualizado hace 2 minutos"
- **Dónde**: `src/components/layout/Header.tsx`.
- **Problema actual**: el header muestra un subtítulo de texto fijo tipo "Actualizado hace 2 minutos" que nunca cambia ni refleja datos reales.
- **Qué hacer**: elimina ese texto. No lo reemplaces por un timestamp dinámico (eso no forma parte de esta fase); simplemente quítalo o sustitúyelo por algo neutral (por ejemplo, el nombre del módulo activo, si el diseño lo permite sin agregar lógica nueva).
- **Criterio de aceptación**: el header ya no muestra ninguna promesa de dato en tiempo real que no sea cierta.

### 10. Sacar `ai-export/project-export.md` del repositorio
- **Dónde**: raíz del repositorio, carpeta `ai-export/`.
- **Problema actual**: existe un archivo de decenas de miles de líneas con una copia antigua y completa del proyecto (export tipo repomix), sin ningún uso en producción ni en desarrollo.
- **Qué hacer**: elimina el archivo del control de versiones. Si se quiere conservar como referencia histórica, muévelo fuera del repositorio (por ejemplo, a un almacenamiento externo) y agrega la carpeta `ai-export/` al `.gitignore` para evitar que se vuelva a versionar contenido similar en el futuro.
- **Criterio de aceptación**: el archivo ya no existe dentro del repositorio versionado, y el `.gitignore` previene que se repita.

---

## ORDEN SUGERIDO DE EJECUCIÓN

Ejecuta las tareas en este orden (de menor a mayor dependencia con otras):

1. Tarea 10 (limpieza de repo, no toca código de la app)
2. Tarea 5 (código muerto, reduce ruido antes de tocar lo demás)
3. Tarea 3 (bug de switch duplicado)
4. Tarea 1 y 2 (Sidebar: logout + perfil real, se tocan juntas por estar en el mismo archivo)
5. Tarea 9 (Header)
6. Tarea 4 (dropdown de chasis)
7. Tareas 6, 7 y 8 (unificación visual: radios, encabezados, rojo crítico)

## AL FINALIZAR

Entrega un resumen con:
- Lista de las 10 tareas y su estado (completada / ya estaba resuelta / bloqueada — con motivo).
- Archivos modificados o eliminados.
- Cualquier hallazgo adicional fuera de esta lista que hayas detectado mientras trabajabas (sin corregirlo, solo reportarlo).
- Confirmación de que el proyecto compila correctamente al final de todas las tareas.

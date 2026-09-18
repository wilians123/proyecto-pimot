# CAMBIO UI — Armonización visual de módulos PIMOT

Actúa como desarrollador senior frontend sobre el proyecto **PIMOT** existente.

Tu tarea es realizar una mejora de **armonización visual e interacción de tablas** en los módulos:

- Pilotos y Viáticos
- Clientes
- Usuarios y Seguridad

La referencia visual y de interacción debe ser **exactamente el patrón que ya existe en Gestión de Flota**, especialmente en:

`src/modules/flota/components/Flota.tsx`

No diseñes un patrón nuevo. Primero inspecciona el código actual y reutiliza o extrae el patrón existente cuando sea conveniente.

---

## 1. REGLA PRINCIPAL

Este cambio es principalmente de **UI/UX**.

NO debes rediseñar los módulos completos.

NO debes modificar:

- modelo de datos;
- tablas de Supabase;
- relaciones;
- RLS;
- permisos;
- autenticación;
- API de usuarios;
- lógica de viáticos;
- lógica de viajes;
- lógica de clientes;
- reglas de negocio;
- estados permitidos en BD.

Solo debes mejorar la presentación e interacción visual de:

1. acciones de las filas;
2. dropdowns de estado;
3. dropdown de rol de usuarios.

Si una funcionalidad ya funciona correctamente, **no la reemplaces ni la reimplementes**.

---

# 2. REFERENCIA VISUAL: GESTIÓN DE FLOTA

Antes de modificar los módulos, inspecciona:

`src/modules/flota/components/Flota.tsx`

Identifica y utiliza como referencia los patrones existentes:

- `CeldaAcciones`
- `CeldaEstadoCabezal`
- `CeldaEstadoChasis`
- `EstadoBadge`
- `EstadoDropdownCabezal`
- `EstadoDropdownChasis`
- `OPCIONES_ESTADO_CABEZAL`
- `OPCIONES_ESTADO_CHASIS`

La apariencia debe conservar el mismo lenguaje visual:

### Botón editar

- borde `border-slate-200`;
- icono de lápiz;
- color naranja;
- hover naranja claro;
- borde naranja al hacer hover;
- tamaño y espaciado equivalente;
- `title` apropiado;
- transición suave.

### Botón eliminar

- borde `border-slate-200`;
- icono de basurero;
- color rojo;
- hover rojo claro;
- borde rojo al hacer hover;
- mismo tamaño que el botón de editar;
- `title` apropiado;
- transición suave.

No reemplaces los iconos por texto como "Editar" o "Eliminar" si Gestión de Flota utiliza iconos.

El resultado debe verse como una misma aplicación, no como tres diseños diferentes.

---

# 3. MÓDULO PILOTOS Y VIÁTICOS

Archivo principal:

`src/modules/pilotos/components/Pilotos.tsx`

Actualmente el módulo ya tiene:

- listado de pilotos;
- estado activo/inactivo;
- edición;
- información de viáticos.

Inspecciona primero cómo están implementadas actualmente esas acciones.

## 3.1 Estado del piloto

El estado `Activo/Inactivo` debe utilizar el mismo concepto visual de Gestión de Flota:

- badge compacto;
- punto de color;
- colores coherentes;
- badge clicable;
- dropdown flotante al hacer clic;
- opciones visualmente diferenciadas;
- opción actualmente seleccionada claramente identificable.

Para pilotos las opciones funcionales siguen siendo únicamente:

- `Activo`
- `Inactivo`

NO agregues nuevos estados.

El dropdown debe conservar la lógica existente para actualizar `activo`.

No conviertas el campo en un `<select>` HTML genérico si eso hace que pierda el diseño visual de Gestión de Flota.

## 3.2 Acciones de piloto

En la columna `Acciones`, reemplaza cualquier presentación diferente por el mismo patrón visual de Gestión de Flota:

- lápiz naranja para editar;
- basurero rojo para eliminar.

El botón de editar debe abrir el mecanismo de edición que ya existe actualmente.

El botón de eliminar debe utilizar la lógica de eliminación existente.

IMPORTANTE:

No cambies el comportamiento de eliminación ni agregues una eliminación diferente.

Si actualmente existe confirmación, loading o manejo de errores, consérvalo.

---

# 4. MÓDULO CLIENTES

Archivo:

`src/modules/clientes/components/Clientes.tsx`

## 4.1 Estado

El campo `activo` de los clientes debe visualizarse utilizando el mismo patrón de estado de Gestión de Flota.

Opciones:

- `Activo`
- `Inactivo`

La interacción debe ser:

1. El usuario ve el badge.
2. Hace clic.
3. Se abre el dropdown.
4. Selecciona el nuevo estado.
5. Se ejecuta la lógica de actualización que ya existe.
6. El badge refleja el nuevo estado.

No cambies la columna ni el significado de `activo`.

No agregues estados adicionales.

## 4.2 Acciones

La columna de acciones debe utilizar exactamente el mismo lenguaje visual de Gestión de Flota:

- lápiz naranja;
- basurero rojo;
- mismos tamaños aproximados;
- mismos bordes;
- mismos hover;
- mismos espaciados.

El lápiz debe continuar abriendo la edición existente.

El basurero debe continuar utilizando la eliminación existente.

No reemplaces el CRUD actual.

---

# 5. MÓDULO USUARIOS Y SEGURIDAD

Archivo:

`src/modules/usuarios/components/Usuarios.tsx`

Este módulo requiere dos armonizaciones:

1. Estado.
2. Rol.

---

## 5.1 Estado del usuario

El estado `Activo/Inactivo` debe adoptar el mismo patrón visual de Gestión de Flota.

Debe funcionar como dropdown visual y no como un `<select>` HTML genérico visible.

Opciones:

- `Activo`
- `Inactivo`

Debe conservar la lógica existente de actualización del perfil.

IMPORTANTE:

No modificar las restricciones de permisos.

La modificación del estado debe seguir respetando las reglas actuales del módulo y las políticas RLS.

---

# 6. DROPDOWN DE ROL DE USUARIOS

Este punto es especialmente importante.

Actualmente `Usuarios.tsx` ya dispone de:

```ts
type Rol = "admin" | "operativo" | "visualizador";
```

y de:

```ts
ROL_CONFIG;
```

con información visual para:

- Administrador
- Operativo
- Visualizador

Utiliza esa configuración existente para crear un dropdown visual consistente con el patrón de estados de Gestión de Flota.

## Opciones

Mantener exactamente:

- `Administrador`
- `Operativo`
- `Visualizador`

No cambiar los valores internos:

```text
admin
operativo
visualizador
```

Solo mejorar su presentación.

## Apariencia

El dropdown debe conservar la idea visual utilizada en Flota:

- badge compacto;
- punto de color;
- botón clicable;
- menú flotante;
- opciones con sus respectivos colores;
- opción seleccionada claramente identificable;
- hover;
- borde;
- sombra;
- transición.

Utiliza los colores que ya existen en `ROL_CONFIG`.

Por ejemplo, no inventes una nueva paleta si ya existe:

- Administrador → morado
- Operativo → azul
- Visualizador → gris

El objetivo es que el dropdown de rol parezca pertenecer al mismo sistema visual que los dropdowns de estado de Flota.

---

# 7. ACCIONES DE USUARIOS

Revisa las acciones actuales de `Usuarios.tsx`.

Si existen acciones de edición/eliminación, armonízalas con el patrón visual de Gestión de Flota:

### Editar

Icono de lápiz:

- naranja;
- borde;
- hover naranja;
- mismo tamaño que Flota.

### Eliminar

Icono de basurero:

- rojo;
- borde;
- hover rojo;
- mismo tamaño que Flota.

IMPORTANTE:

No debes introducir una eliminación de usuario mediante Supabase Auth directamente desde el cliente.

La lógica existente relacionada con usuarios debe permanecer intacta.

Si alguna acción todavía no tiene implementación funcional, no inventes una implementación nueva solamente para cumplir este cambio visual. En ese caso, adapta únicamente la presentación de la acción existente y reporta la limitación.

---

# 8. REUTILIZACIÓN DEL COMPONENTE VISUAL

Antes de duplicar grandes cantidades de JSX, analiza si conviene extraer un componente reutilizable.

La intención arquitectónica es evitar terminar con tres implementaciones casi idénticas de:

- badge;
- dropdown;
- opciones;
- botones de acciones.

Si puedes crear un componente compartido sin alterar el comportamiento actual, puedes hacerlo.

Por ejemplo, conceptualmente podría existir algo como:

`src/components/shared/EstadoDropdown.tsx`

o componentes equivalentes.

PERO:

No crees abstracciones innecesariamente complejas.

Si extraer el componente aumenta el riesgo o requiere modificar demasiados módulos, es preferible reutilizar el patrón existente de forma localizada.

La prioridad es:

1. consistencia visual;
2. mantener funcionalidad;
3. bajo riesgo;
4. código sencillo.

---

# 9. RESPONSIVE

La armonización debe funcionar tanto en:

- escritorio;
- tablet;
- móvil.

Gestión de Flota ya tiene una presentación diferenciada para desktop/móvil.

Respeta la estructura responsive existente de cada módulo.

No elimines las tarjetas móviles para forzar una tabla.

En móvil, los botones de editar/eliminar deben mantener el mismo lenguaje visual.

Los dropdowns no deben quedar cortados por:

- `overflow-hidden`;
- bordes de tablas;
- contenedores;
- tarjetas.

Revisa especialmente el posicionamiento `relative/absolute` de los dropdowns.

---

# 10. NO MODIFICAR FUNCIONALIDAD

Es obligatorio conservar:

### Pilotos

- creación;
- edición;
- eliminación;
- activo/inactivo;
- cálculo/consulta de viáticos;
- viajes asociados.

### Clientes

- creación;
- edición;
- eliminación;
- activo/inactivo;
- ingresos;
- relación con viajes;
- relación con rentas.

### Usuarios

- listado;
- creación;
- edición de rol;
- activo/inactivo;
- autenticación;
- API `/api/usuarios`;
- Supabase Auth;
- profiles;
- permisos;
- RLS.

No realices cambios de base de datos.

No crees migraciones.

No cambies tipos de BD.

No cambies endpoints.

No cambies políticas RLS.

---

# 11. ICONOS

Utiliza el mismo estilo de SVG que ya utiliza Gestión de Flota.

No agregues una librería de iconos nueva.

No instales dependencias.

Si `Flota.tsx` ya tiene los SVG necesarios, reutiliza ese patrón.

El lápiz debe ser claramente reconocible como edición.

El basurero debe ser claramente reconocible como eliminación.

---

# 12. CRITERIOS VISUALES DE ACEPTACIÓN

Al finalizar, al comparar las vistas:

### Gestión de Flota

Debe continuar igual.

### Pilotos y Viáticos

Debe parecer parte del mismo sistema visual.

### Clientes

Debe parecer parte del mismo sistema visual.

### Usuarios y Seguridad

Debe parecer parte del mismo sistema visual.

En particular:

```text
              GESTIÓN DE FLOTA
                     │
          ┌──────────┴──────────┐
          │                     │
       Estado                Acciones
          │                     │
       Dropdown             ✏️  🗑️
          │
          ▼
   mismo patrón visual
          │
    ┌─────┼─────────────┐
    ▼     ▼             ▼
 Pilotos Clientes     Usuarios
    │       │             │
 Estado   Estado      Estado + Rol
    │       │             │
    └───────┴─────────────┘
        mismo lenguaje
         visual/UX
```

No es necesario que internamente todos sean el mismo componente si eso complica innecesariamente la implementación. Lo importante es que el resultado visual y de interacción sea consistente.

---

# 13. VERIFICACIÓN ANTES DE TERMINAR

Después de implementar el cambio:

1. Ejecuta lint.
2. Ejecuta:

```bash
npm run build
```

o, si el proyecto no dispone de un build funcional por alguna razón ajena a este cambio:

```bash
npx tsc --noEmit
```

3. Comprueba que no existan errores TypeScript.
4. Comprueba que no existan imports sin utilizar.
5. Comprueba que los dropdowns no tengan problemas de `z-index` o `overflow`.
6. Comprueba que editar siga funcionando.
7. Comprueba que eliminar siga funcionando.
8. Comprueba que cambiar estado siga persistiendo.
9. Comprueba que cambiar rol siga utilizando la lógica existente.
10. Comprueba que las restricciones de permisos no hayan cambiado.

---

# 14. REPORTE FINAL

Al terminar, entrega un reporte breve con:

### Archivos modificados

Lista exacta de archivos.

### Componentes nuevos

Si creaste componentes compartidos, indícalos.

### Cambios visuales

Explica qué se armonizó en cada módulo.

### Funcionalidad preservada

Confirma que no se modificó la lógica de negocio, RLS, autenticación ni BD.

### Verificación

Indica:

- resultado de TypeScript;
- resultado de build/lint;
- cualquier advertencia.

### Riesgos o pendientes

Si existe algún comportamiento que no pudiste verificar, indícalo explícitamente.

No afirmes que algo funciona si no pudiste comprobarlo.

# Despliegue de geocercas PIMOT

Esta guía documenta la preparación de producción. El despliegue, la configuración de cron y la activación del webhook están fuera de esta fase.

## Variables de entorno de Vercel

Configura los nombres siguientes en los entornos correspondientes. Este documento no contiene valores:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NAVIXY_HASH`
- `GEOFENCE_CRON_SECRET`
- `PUSH_WEBHOOK_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
- `CAP_SERVER_URL` (solo Android)
- `NEXT_PUBLIC_ENABLE_ALERT_TESTS` (opcional; solo establece `1` para mostrar el botón de alertas de prueba)

No definas `GEOFENCE_SIM_ENABLED` en producción.

## Supabase

En Authentication → Settings:

1. Desactiva **Allow new users to sign up**.
2. Define Site URL con el dominio de producción.
3. Agrega a Redirect URLs los callback URLs de producción que use la aplicación.
4. Guarda en Vault la URL de producción y el secreto usado por el cron. Evita incluir secretos en SQL, repositorios o registros.

## Planificador de geocercas

La ruta `POST /api/geofence/process` ya está protegida con el secreto del cron y Navixy. Después de desplegar:

1. Confirma manualmente que el endpoint responde correctamente con el secreto configurado.
2. Habilita `pg_cron` versión 1.6.4 y usa la extensión `pg_net` ya instalada.
3. Con Vault, configura una solicitud POST al endpoint cada 30 segundos. Configura un timeout de al menos 10 segundos.
4. Programa el trabajo solo después de verificar el endpoint manualmente y anota su identificador para facilitar la reversa.

## Database Webhook y notificaciones

Configura un Database Webhook para `INSERT` en `alertas`, dirigido a `/api/notifications/push`, con la cabecera `x-webhook-secret`.

Una vez activo, las pruebas de integración y simulación pueden generar notificaciones reales porque el trigger de estados crea alertas con `canal_push=true`. Ejecuta esas pruebas solo cuando el webhook esté desactivado o contra una base de pruebas.

El botón **Generar alertas de prueba** está oculto por defecto. Solo se muestra si `NEXT_PUBLIC_ENABLE_ALERT_TESTS=1`; no habilites esa variable en producción mientras el Database Webhook pueda enviar notificaciones push reales.

## Pruebas de integración

Jest ejecuta con `NODE_ENV=test`; en ese modo `@next/env` no carga `.env.local`. `jest.env.setup.js` precarga antes de importar las suites únicamente `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. No imprime los valores. El cliente de service role se crea de forma perezosa después de activar ambas guardas.

Obtén estos tres valores en Supabase → Project Settings → API. La `SUPABASE_SERVICE_ROLE_KEY` es secreta: no la pegues en chats ni la confirmes en commits. El script `geofence:it:check` informa presencia y formato sin revelar valores:

```powershell
npm run geofence:it:check
```

Antes de ejecutar la suite, confirma que el Database Webhook de `alertas` no esté configurado y que no haya otras sesiones de la aplicación abiertas. La bandera es una confirmación del operador; el script no puede consultar ni desactivar ese webhook. Después:

Las pruebas de integración hacen llamadas remotas por cada lectura y pueden tardar varios minutos. Cada escenario se ejecuta por separado; el timeout individual es de cuatro minutos.

```powershell
$env:GEOFENCE_IT='1'; $env:GEOFENCE_IT_CONFIRM_NO_WEBHOOK='1'; npm run test:geofence
```

Al terminar, limpia las banderas de la sesión:

```powershell
Remove-Item Env:GEOFENCE_IT, Env:GEOFENCE_IT_CONFIRM_NO_WEBHOOK
```

## Firebase y Android

1. Rota la clave privada de la cuenta de servicio que estuvo en los archivos del proyecto y configura la nueva clave únicamente en Vercel.
2. Confirma que `google-services.json` corresponde al proyecto Firebase de producción.
3. Ejecuta `cap sync` con `CAP_SERVER_URL` apuntando al servidor de producción.

## Orden recomendado

1. Desplegar la aplicación.
2. Verificar manualmente `POST /api/geofence/process` con el secreto.
3. Programar el cron de `pg_cron`.
4. Configurar el Database Webhook.
5. Validar el flujo con un viaje real controlado.

## Validaciones posteriores y reversa

- Confirma que el cron recibe respuestas exitosas y que el resumen de acciones es razonable.
- Verifica una transición controlada y la alerta del estado alcanzado.
- Confirma que la ruta de push solo se activa después de configurar el webhook.
- Para revertir, desprograma el trabajo de `pg_cron` y desactiva el Database Webhook. La aplicación seguirá disponible y el estado automático dejará de actualizarse hasta reactivar el cron.

## Pendientes de producto

Los generadores de alertas por velocidad excesiva, retraso operativo e inactividad prolongada no están implementados. Esos tipos de alerta quedan fuera de esta fase.

## Endurecimiento posterior al despliegue

Queda como tarea posterior al despliegue preparar y aplicar una migración revisada para revocar a `anon` el acceso a los RPC de geocercas y retirar permisos `TRUNCATE`. No apliques esos cambios como parte de las pruebas de integración.

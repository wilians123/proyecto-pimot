const TIENE_ZONA = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const TOLERANCIA_FUTURO_MS = 5 * 60 * 1000;
const INTERVALO_ZONA_MS = 15 * 60 * 1000;

function parsearHoraNavixy(valor: string): number {
  const limpio = valor.trim();
  const normalizado = limpio.includes("T") ? limpio : limpio.replace(" ", "T");
  return Date.parse(TIENE_ZONA.test(limpio) ? normalizado : `${normalizado}Z`);
}

/**
 * Navixy entrega last_update y user_time como hora local sin zona en algunas
 * cuentas. Inferimos el desfase horario a partir de user_time y lo aplicamos
 * a last_update. Así la fecha resultante es estable entre ejecuciones del cron
 * mientras no cambie la última señal (y no se reinician las escaladas).
 */
export function convertirTimestampGps(
  ultimaActualizacion: string | null | undefined,
  horaServidorNavixy: string | null | undefined,
  relojServidorMs = Date.now(),
): string | null {
  if (!ultimaActualizacion) return null;

  const ultimaTieneZona = TIENE_ZONA.test(ultimaActualizacion.trim());
  const instanteExplicito = parsearHoraNavixy(ultimaActualizacion);
  if (!Number.isFinite(instanteExplicito)) return null;

  if (!horaServidorNavixy) {
    if (!ultimaTieneZona) return null;
    return instanteExplicito <= relojServidorMs + TOLERANCIA_FUTURO_MS
      ? new Date(instanteExplicito).toISOString()
      : null;
  }

  const servidorTieneZona = TIENE_ZONA.test(horaServidorNavixy.trim());
  const horaServidorMs = parsearHoraNavixy(horaServidorNavixy);
  if (!Number.isFinite(horaServidorMs)) return null;

  if (ultimaTieneZona) {
    if (!servidorTieneZona) return null;
    return instanteExplicito <= relojServidorMs + TOLERANCIA_FUTURO_MS
      ? new Date(instanteExplicito).toISOString()
      : null;
  }
  if (servidorTieneZona) return null;

  const antiguedadMs = horaServidorMs - instanteExplicito;
  if (antiguedadMs < -TOLERANCIA_FUTURO_MS) return null;

  // Los husos horarios actuales de Navixy usan incrementos de 15 minutos.
  // Redondear el desfase elimina pequeñas latencias de la consulta y mantiene
  // fijo el instante mientras last_update siga igual.
  const diferenciaRelojesMs = relojServidorMs - horaServidorMs;
  const desfaseZonaMs = Math.round(diferenciaRelojesMs / INTERVALO_ZONA_MS) * INTERVALO_ZONA_MS;
  const instanteAbsoluto = instanteExplicito + desfaseZonaMs;
  if (instanteAbsoluto > relojServidorMs + TOLERANCIA_FUTURO_MS) return null;

  return new Date(instanteAbsoluto).toISOString();
}

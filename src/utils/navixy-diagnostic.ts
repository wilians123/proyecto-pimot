let diagnosticoGpsEmitido = false;

export function registrarClavesGpsUnaVez(gps: unknown): void {
  if (process.env.NODE_ENV === "production" || diagnosticoGpsEmitido) return;
  const claves =
    gps !== null && typeof gps === "object" && !Array.isArray(gps)
      ? Object.keys(gps)
      : [];
  console.info("[Navixy diagnóstico] claves de state.gps:", claves);
  diagnosticoGpsEmitido = true;
}

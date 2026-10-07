const UBICACION_PREFIX = "pimot:ubicacion:";
const RENTA_UBICACION_KEY = "pimot:renta-chasis:ubicacion";

type UbicacionGuardada = {
  modulo?: string;
  seccion?: string;
};

function leerUbicacionGuardada(modulo: string): string | null {
  if (typeof window === "undefined") return null;
  const valor = sessionStorage.getItem(`${UBICACION_PREFIX}${modulo}`);
  if (!valor) return null;
  try {
    const ubicacion = JSON.parse(valor) as UbicacionGuardada;
    return ubicacion.modulo === modulo && ubicacion.seccion
      ? ubicacion.seccion
      : null;
  } catch {
    return null;
  }
}

export function leerSeccionInicial<T extends string>(
  modulo: string,
  predeterminada: T,
  permitidas: readonly T[],
): T {
  if (typeof window === "undefined") return predeterminada;
  const params = new URLSearchParams(window.location.search);
  const seccionUrl = params.get("seccion");
  if (
    params.get("modulo") === modulo &&
    seccionUrl &&
    permitidas.includes(seccionUrl as T)
  ) {
    return seccionUrl as T;
  }
  const seccionGuardada = leerUbicacionGuardada(modulo);
  return seccionGuardada && permitidas.includes(seccionGuardada as T)
    ? (seccionGuardada as T)
    : predeterminada;
}

export function sincronizarSeccion(modulo: string, seccion: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    `${UBICACION_PREFIX}${modulo}`,
    JSON.stringify({ modulo, seccion }),
  );
  const params = new URLSearchParams(window.location.search);
  params.set("modulo", modulo);
  params.set("seccion", seccion);
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}?${params.toString()}`,
  );
}

export function limpiarUbicacionesGuardadas() {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith(UBICACION_PREFIX) || key === RENTA_UBICACION_KEY) {
      sessionStorage.removeItem(key);
    }
  }
}

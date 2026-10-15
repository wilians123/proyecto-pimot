interface ViajeConUnidades {
  id: string;
  cabezal_id: string | null;
  chasis_id: string | null;
}

export function obtenerOcupadas<T extends ViajeConUnidades>(
  viajesActivos: readonly T[],
  excluirViajeId?: string,
): { cabezales: Set<string>; chasis: Set<string> } {
  const cabezales = new Set<string>();
  const chasis = new Set<string>();
  for (const viaje of viajesActivos) {
    if (viaje.id === excluirViajeId) continue;
    if (viaje.cabezal_id) cabezales.add(viaje.cabezal_id);
    if (viaje.chasis_id) chasis.add(viaje.chasis_id);
  }
  return { cabezales, chasis };
}

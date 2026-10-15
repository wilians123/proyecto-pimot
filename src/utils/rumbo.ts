export function normalizarRumbo(valor: unknown): number | null {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return null;
  return ((valor % 360) + 360) % 360;
}

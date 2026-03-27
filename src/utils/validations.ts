// ============================================================
// Validaciones de formularios PIMOT
// ============================================================

export function validarPlaca(placa: string): boolean {
  // Formato Guatemala: XXX-NNN o NNN-XXX
  return /^[A-Z0-9]{1,4}-[A-Z0-9]{1,4}$/.test(placa.toUpperCase())
}

export function validarCoordenadas(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export function validarFechaFutura(fecha: string): boolean {
  return new Date(fecha) > new Date()
}

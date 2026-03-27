// ============================================================
// Utilidades de formato de fechas para PIMOT
// ============================================================

export function formatFecha(fecha?: string | null, incluirHora = false): string {
  if (!fecha) return '—'
  const d = new Date(fecha)
  const opciones: Intl.DateTimeFormatOptions = {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Guatemala',
  }
  if (incluirHora) {
    opciones.hour   = '2-digit'
    opciones.minute = '2-digit'
  }
  return d.toLocaleDateString('es-GT', opciones)
}

export function formatDuracion(minutos?: number | null): string {
  if (!minutos) return '—'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function tiempoRelativo(fecha?: string | null): string {
  if (!fecha) return '—'
  const diff = Date.now() - new Date(fecha).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)   return 'Ahora'
  if (min < 60)  return `Hace ${min}m`
  const h = Math.floor(min / 60)
  if (h < 24)    return `Hace ${h}h`
  return `Hace ${Math.floor(h / 24)}d`
}

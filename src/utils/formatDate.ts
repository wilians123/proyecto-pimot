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

/** Convierte una fecha de datetime-local interpretada siempre en UTC-6 a ISO UTC. */
export function inputLocalAIso(valor: string | null | undefined): string | null {
  if (!valor) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor)
  if (!match) return null
  const [, anio, mes, dia, hora, minuto] = match
  const calendarioLocal = new Date(0)
  calendarioLocal.setUTCFullYear(Number(anio), Number(mes) - 1, Number(dia))
  calendarioLocal.setUTCHours(Number(hora), Number(minuto), 0, 0)
  if (
    Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 ||
    Number(hora) > 23 || Number(minuto) > 59 ||
    calendarioLocal.getUTCFullYear() !== Number(anio) ||
    calendarioLocal.getUTCMonth() + 1 !== Number(mes) ||
    calendarioLocal.getUTCDate() !== Number(dia) ||
    calendarioLocal.getUTCHours() !== Number(hora) ||
    calendarioLocal.getUTCMinutes() !== Number(minuto)
  ) return null
  const instante = new Date(`${anio}-${mes}-${dia}T${hora}:${minuto}:00-06:00`)
  if (!Number.isFinite(instante.getTime())) return null
  return instante.toISOString()
}

/** Presenta un instante ISO en la hora fija de Guatemala (UTC-6). */
export function isoAInputLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const fecha = new Date(iso)
  if (!Number.isFinite(fecha.getTime())) return ''
  const guatemala = new Date(fecha.getTime() - 6 * 60 * 60 * 1000)
  return `${guatemala.getUTCFullYear()}-${String(guatemala.getUTCMonth() + 1).padStart(2, '0')}-${String(guatemala.getUTCDate()).padStart(2, '0')}T${String(guatemala.getUTCHours()).padStart(2, '0')}:${String(guatemala.getUTCMinutes()).padStart(2, '0')}`
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

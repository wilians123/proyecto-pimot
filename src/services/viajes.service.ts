// ============================================================
// Viajes Service - Operaciones CRUD sobre viajes
// ============================================================
import { supabase } from '@/lib/supabase'
import type { EstadoViaje } from '@/types'
import type { Database } from '@/types/database'

type ViajeRow = Database['public']['Tables']['viajes']['Row']
type ViajeInsert = Database['public']['Tables']['viajes']['Insert']

export async function actualizarEstadoViaje(
  viajeId: string,
  nuevoEstado: EstadoViaje
): Promise<{ error: string | null }> {
  const updates: Record<string, unknown> = { estado: nuevoEstado }
  // CHANGE: geofence migration fix - keep geofence transitions idempotent by only updating from the expected current state.
  const estadoEsperadoPorDestino: Partial<Record<EstadoViaje, EstadoViaje>> = {
    en_transito: 'programado',
    en_destino: 'en_transito',
    de_vuelta: 'en_destino',
    finalizado: 'de_vuelta',
  }

  if (nuevoEstado === 'en_transito') {
    updates.fecha_inicio = new Date().toISOString()
    updates.bloqueado = true
    updates.lecturas_inicio_confirm = 0
  }
  if (nuevoEstado === 'en_destino') {
    updates.fecha_llegada_destino = new Date().toISOString()
    updates.lecturas_fuera_destino = 0
  }
  if (nuevoEstado === 'de_vuelta') {
    updates.fecha_salida_destino = new Date().toISOString()
    updates.lecturas_fuera_destino = 0
  }
  if (nuevoEstado === 'finalizado') {
    updates.fecha_fin = new Date().toISOString()
    updates.bloqueado = false
  }

  let query = supabase.from('viajes').update(updates).eq('id', viajeId)
  const estadoEsperado = estadoEsperadoPorDestino[nuevoEstado]
  if (estadoEsperado) query = query.eq('estado', estadoEsperado)

  const { error } = await query
  return { error: error?.message ?? null }
}

export async function crearViaje(datos: ViajeInsert): Promise<{ data: ViajeRow | null; error: string | null }> {
  const { data, error } = await supabase.from('viajes').insert(datos).select().single()
  return { data: data as ViajeRow, error: error?.message ?? null }
}

export async function incrementarLecturasDestino(
  viajeId: string
): Promise<{ error: string | null }> {
  const { data: viaje, error: fetchError } = await supabase
    .from('viajes')
    .select('estado, lecturas_fuera_destino')
    .eq('id', viajeId)
    .single()

  if (fetchError) return { error: fetchError.message }
  if (viaje?.estado !== 'en_destino') return { error: null }

  const conteoActual = (viaje?.lecturas_fuera_destino ?? 0) as number
  const { error: updateError } = await supabase
    .from('viajes')
    .update({ lecturas_fuera_destino: conteoActual + 1 })
    .eq('id', viajeId)
    .eq('estado', 'en_destino')
    .eq('lecturas_fuera_destino', conteoActual)

  return { error: updateError?.message ?? null }
}

export async function incrementarLecturasInicio(
  viajeId: string
): Promise<{ error: string | null }> {
  const { data: viaje, error: fetchError } = await supabase
    .from('viajes')
    .select('estado, lecturas_inicio_confirm')
    .eq('id', viajeId)
    .single()

  if (fetchError) return { error: fetchError.message }
  if (viaje?.estado !== 'programado') return { error: null }

  const conteoActual = ((viaje as { lecturas_inicio_confirm?: number | null })?.lecturas_inicio_confirm ?? 0) as number
  const { error: updateError } = await supabase
    .from('viajes')
    .update({ lecturas_inicio_confirm: conteoActual + 1 })
    .eq('id', viajeId)
    .eq('estado', 'programado')
    .eq('lecturas_inicio_confirm', conteoActual)

  return { error: updateError?.message ?? null }
}

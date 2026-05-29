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

  if (nuevoEstado === 'en_transito') {
    updates.fecha_inicio = new Date().toISOString()
    updates.bloqueado = true
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

  const { error } = await supabase.from('viajes').update(updates).eq('id', viajeId)
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
    .select('lecturas_fuera_destino')
    .eq('id', viajeId)
    .single()

  if (fetchError) return { error: fetchError.message }

  const conteoActual = (viaje?.lecturas_fuera_destino ?? 0) as number
  const { error: updateError } = await supabase
    .from('viajes')
    .update({ lecturas_fuera_destino: conteoActual + 1 })
    .eq('id', viajeId)

  return { error: updateError?.message ?? null }
}

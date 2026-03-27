// ============================================================
// Viajes Service - Operaciones CRUD sobre viajes
// ============================================================
import { supabase } from '@/lib/supabase'
import type { Viaje, EstadoViaje } from '@/types'

export async function actualizarEstadoViaje(
  viajeId: string,
  nuevoEstado: EstadoViaje
): Promise<{ error: string | null }> {
  const updates: Partial<Viaje> & Record<string, unknown> = { estado: nuevoEstado }

  if (nuevoEstado === 'en_transito') updates.fecha_inicio = new Date().toISOString()
  if (nuevoEstado === 'finalizado')  updates.fecha_fin    = new Date().toISOString()

  const { error } = await supabase.from('viajes').update(updates).eq('id', viajeId)
  return { error: error?.message ?? null }
}

export async function crearViaje(datos: Partial<Viaje>): Promise<{ data: Viaje | null; error: string | null }> {
  const { data, error } = await supabase.from('viajes').insert(datos).select().single()
  return { data: data as Viaje, error: error?.message ?? null }
}

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Viaje, EstadoViaje } from '@/types'

export function useViajes(filtroEstado?: EstadoViaje) {
  const [viajes, setViajes]   = useState<Viaje[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchViajes = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('viajes')
      .select(`*, piloto:pilotos(*), cabezal:cabezales(*), chasis:chasis(*), cliente:clientes(*)`)
      .order('created_at', { ascending: false })

    if (filtroEstado) query = query.eq('estado', filtroEstado)

    const { data, error } = await query
    if (error) setError(error.message)
    else setViajes(data as Viaje[])
    setLoading(false)
  }, [filtroEstado])

  useEffect(() => {
    fetchViajes()

    // Suscripción en tiempo real
    const channel = supabase
      .channel('viajes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viajes' }, () => {
        fetchViajes()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchViajes])

  return { viajes, loading, error, refetch: fetchViajes }
}

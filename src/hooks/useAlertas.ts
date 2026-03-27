import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Alerta } from '@/types'

export function useAlertas(soloActivas = false) {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAlertas = useCallback(async () => {
    let query = supabase
      .from('alertas')
      .select('*, viaje:viajes(codigo, origen, destino)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (soloActivas) query = query.in('estado', ['pendiente', 'enviada'])

    const { data } = await query
    setAlertas((data as Alerta[]) || [])
    setLoading(false)
  }, [soloActivas])

  useEffect(() => {
    fetchAlertas()
    const channel = supabase
      .channel('alertas-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, () => {
        fetchAlertas()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchAlertas])

  return { alertas, loading, refetch: fetchAlertas }
}

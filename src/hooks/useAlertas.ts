import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type AlertaRow = Database['public']['Tables']['alertas']['Row']

interface AlertaConViaje extends AlertaRow {
  viaje?: { codigo: string | null; origen: string; destino: string } | null
}

export function useAlertas(soloActivas = false) {
  const [alertas, setAlertas] = useState<AlertaConViaje[]>([])
  const [loading, setLoading] = useState(true)

  const soloActivasRef = useRef(soloActivas)
  // eslint-disable-next-line react-hooks/refs
  soloActivasRef.current = soloActivas

  // ── refetch para el listener de realtime ──────────────────
  const refetch = useCallback(async () => {
    let query = supabase
      .from('alertas')
      .select('*, viaje:viajes(codigo, origen, destino)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (soloActivasRef.current) {
      query = query.in('estado', ['pendiente', 'enviada'])
    }

    const { data } = await query
    setAlertas((data as AlertaConViaje[]) ?? [])
  }, [])

  // ── Carga inicial y suscripción ────────────────────────────
  useEffect(() => {
    let active = true

    async function fetchData() {
      setLoading(true)

      let query = supabase
        .from('alertas')
        .select('*, viaje:viajes(codigo, origen, destino)')
        .order('created_at', { ascending: false })
        .limit(50)

      if (soloActivasRef.current) {
        query = query.in('estado', ['pendiente', 'enviada'])
      }

      const { data } = await query
      if (!active) return
      setAlertas((data as AlertaConViaje[]) ?? [])
      setLoading(false)
    }

    fetchData()

    const channel = supabase
      .channel('alertas-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alertas' },
        () => { if (active) refetch() }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [refetch])

  return { alertas, loading, refetch }
}
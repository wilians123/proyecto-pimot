import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type AlertaRow = Database['public']['Tables']['alertas']['Row']

export interface AlertaConViaje extends AlertaRow {
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

  const marcarComoVista = useCallback(async (alertaId: string) => {
    const { error } = await supabase
      .from('alertas')
      .update({ estado: 'vista' })
      .eq('id', alertaId)
      .in('estado', ['pendiente', 'enviada'])

    if (error) throw error
    await refetch()
  }, [refetch])

  const generarAlertasPrueba = useCallback(async () => {
    const { error } = await supabase.from('alertas').insert([
      {
        tipo: 'inicio_viaje',
        nivel: 'info',
        mensaje: '[PRUEBA] El viaje TR-001 inició su recorrido.',
        estado: 'pendiente',
        canal_push: false,
      },
      {
        tipo: 'llegada_destino',
        nivel: 'info',
        mensaje: '[PRUEBA] El viaje TR-002 llegó a su destino.',
        estado: 'pendiente',
        canal_push: false,
      },
      {
        tipo: 'retraso_operativo',
        nivel: 'advertencia',
        mensaje: '[PRUEBA] El viaje TR-003 presenta retraso operativo.',
        estado: 'pendiente',
        canal_push: false,
      },
      {
        tipo: 'velocidad_excesiva',
        nivel: 'critico',
        mensaje: '[PRUEBA] El vehículo TR-004 superó la velocidad permitida.',
        estado: 'pendiente',
        canal_push: false,
      },
    ])

    if (error) throw error
    await refetch()
  }, [refetch])

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
      .channel(`alertas-realtime-${soloActivas ? 'activas' : 'todas'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alertas' },
        () => { if (active) refetch() }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [refetch, soloActivas])

  return { alertas, loading, refetch, marcarComoVista, generarAlertasPrueba }
}

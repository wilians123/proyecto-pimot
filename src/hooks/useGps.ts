import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { GpsLog } from '@/types'

export function useGps(viajeId?: string) {
  const [posicion, setPosicion] = useState<GpsLog | null>(null)
  const [historial, setHistorial] = useState<GpsLog[]>([])

  useEffect(() => {
    if (!viajeId) return

    async function fetchGps() {
      const { data } = await supabase
        .from('gps_logs')
        .select('*')
        .eq('viaje_id', viajeId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (data && data.length > 0) {
        setPosicion(data[0] as GpsLog)
        setHistorial(data as GpsLog[])
      }
    }

    fetchGps()

    const channel = supabase
      .channel(`gps-${viajeId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'gps_logs',
        filter: `viaje_id=eq.${viajeId}`
      }, (payload) => {
        setPosicion(payload.new as GpsLog)
        setHistorial(prev => [payload.new as GpsLog, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [viajeId])

  return { posicion, historial }
}

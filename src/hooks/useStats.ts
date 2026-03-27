import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StatsViajes } from '@/types'

export function useStats() {
  const [stats, setStats]     = useState<StatsViajes | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const { data } = await supabase.rpc('stats_viajes')
      setStats(data)
      setLoading(false)
    }
    fetchStats()
  }, [])

  return { stats, loading }
}

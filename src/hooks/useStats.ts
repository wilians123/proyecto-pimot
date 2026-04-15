import { useEffect, useState as useStateStats } from "react";
import { supabase as supabaseStats } from "@/lib/supabase";

type StatsViajes = {
  total: number;
  finalizados: number;
  en_transito: number;
  programados: number;
  cancelados: number;
  dur_prom_min: number;
  cumplimiento: number;
};

export function useStats() {
  const [stats, setStats] = useStateStats<StatsViajes | null>(null);
  const [loading, setLoading] = useStateStats(true);

  useEffect(() => {
    let active = true;

    async function fetchStats() {
      const { data } = await supabaseStats.rpc("stats_viajes");

      if (!active) return;

      // data es Json — cast seguro: Json → unknown → StatsViajes
      // Solo asignamos si es un objeto no-null (no string, número, etc.)
      if (data !== null && typeof data === "object" && !Array.isArray(data)) {
        setStats(data as unknown as StatsViajes);
      }
      setLoading(false);
    }

    fetchStats();
    return () => {
      active = false;
    };
  }, [setLoading, setStats]);

  return { stats, loading };
}

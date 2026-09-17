import { useCallback, useEffect, useState as useStateStats } from "react";
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

  const refetch = useCallback(async () => {
    const { data } = await supabaseStats.rpc("stats_viajes");

    if (data !== null && typeof data === "object" && !Array.isArray(data)) {
      setStats(data as unknown as StatsViajes);
    }
    setLoading(false);
  }, [setLoading, setStats]);

  useEffect(() => {
    let active = true;

    async function fetchStats() {
      const { data } = await supabaseStats.rpc("stats_viajes");
      if (!active) return;
      if (data !== null && typeof data === "object" && !Array.isArray(data)) {
        setStats(data as unknown as StatsViajes);
      }
      setLoading(false);
    }

    fetchStats();

    const channel = supabaseStats
      .channel("stats-viajes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "viajes" },
        () => {
          if (active) refetch();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabaseStats.removeChannel(channel);
    };
  }, [refetch, setLoading, setStats]);

  return { stats, loading };
}

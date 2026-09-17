import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { EstadoCabezalDB, EstadoChasisDB } from "@/types/database";

export interface DashboardOperationalStats {
  cabezales: Record<EstadoCabezalDB, number>;
  chasis: Record<EstadoChasisDB, number>;
  pilotoDestacado: { nombre: string; viajes: number } | null;
}

const initialStats: DashboardOperationalStats = {
  cabezales: { activo: 0, en_viaje: 0, en_mantenimiento: 0, inactivo: 0 },
  chasis: { disponible: 0, en_renta: 0, en_flete: 0, en_taller: 0 },
  pilotoDestacado: null,
};

function contarEstados<T extends string>(rows: Array<{ estado: T }>, estados: readonly T[]) {
  return estados.reduce((result, estado) => {
    result[estado] = rows.filter((row) => row.estado === estado).length;
    return result;
  }, {} as Record<T, number>);
}

export function useDashboardOperationalStats() {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);

    const [cabezalesResult, chasisResult, viajesResult] = await Promise.all([
      supabase.from("cabezales").select("estado"),
      supabase.from("chasis").select("estado"),
      supabase.from("viajes")
        .select("piloto_id, fecha_fin, estado, piloto:pilotos(nombre)")
        .eq("estado", "finalizado")
        .gte("fecha_fin", desde.toISOString()),
    ]);

    const cabezales = (cabezalesResult.data ?? []) as Array<{ estado: EstadoCabezalDB }>;
    const chasis = (chasisResult.data ?? []) as Array<{ estado: EstadoChasisDB }>;
    const viajes = (viajesResult.data ?? []) as Array<{
      piloto_id: string | null;
      piloto: { nombre: string } | null;
    }>;
    const porPiloto = new Map<string, { nombre: string; viajes: number }>();
    for (const viaje of viajes) {
      if (!viaje.piloto_id) continue;
      const actual = porPiloto.get(viaje.piloto_id) ?? {
        nombre: viaje.piloto?.nombre ?? "Sin nombre",
        viajes: 0,
      };
      actual.viajes += 1;
      porPiloto.set(viaje.piloto_id, actual);
    }

    setStats({
      cabezales: contarEstados(cabezales, ["activo", "en_viaje", "en_mantenimiento", "inactivo"]),
      chasis: contarEstados(chasis, ["disponible", "en_renta", "en_flete", "en_taller"]),
      pilotoDestacado: [...porPiloto.values()].sort((a, b) => b.viajes - a.viajes)[0] ?? null,
    });
  }, []);

  useEffect(() => {
    let active = true;
    async function cargar() {
      await refetch();
      if (active) setLoading(false);
    }
    cargar();
    const channel = supabase.channel("dashboard-operational-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cabezales" }, () => { if (active) refetch(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "chasis" }, () => { if (active) refetch(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "viajes" }, () => { if (active) refetch(); })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [refetch]);

  return { stats, loading };
}

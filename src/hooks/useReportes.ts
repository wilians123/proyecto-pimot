import { useCallback, useEffect, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { ReporteDatos, RentaReporte, ViajeReporte } from "@/utils/reportes/types";
import type { AlertaReporte, CabezalRow, ChasisRow, TrackerRow } from "@/utils/reportes/types";

const SELECT_VIAJES = "*, piloto:pilotos(*), cabezal:cabezales(*), chasis:chasis(*), cliente:clientes(*)";
const SELECT_RENTAS = "*, chasis:chasis(*), cliente:clientes(*), tipo_renta:tipos_renta(*)";

const DATOS_INICIALES: ReporteDatos = {
  viajes: [],
  rentas: [],
  alertas: [],
  cabezales: [],
  chasis: [],
  trackers: [],
};

function isoInicio(fecha: Date): string {
  return startOfDay(fecha).toISOString();
}

function isoFin(fecha: Date): string {
  return endOfDay(fecha).toISOString();
}

export function useReportes(desde: Date, hasta: Date) {
  const [datos, setDatos] = useState<ReporteDatos>(DATOS_INICIALES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    const desdeIso = isoInicio(desde);
    const hastaIso = isoFin(hasta);
    const desdeDia = desdeIso.slice(0, 10);
    const hastaDia = hastaIso.slice(0, 10);

    const [viajesResult, rentasResult, alertasResult, cabezalesResult, chasisResult, trackersResult] = await Promise.all([
      supabase
        .from("viajes")
        .select(SELECT_VIAJES, { count: "exact" })
        .is("deleted_at", null)
        .or(`fecha_inicio.gte.${desdeIso},and(fecha_inicio.is.null,created_at.gte.${desdeIso})`)
        .or(`fecha_inicio.lte.${hastaIso},and(fecha_inicio.is.null,created_at.lte.${hastaIso})`)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("rentas_chasis")
        .select(SELECT_RENTAS, { count: "exact" })
        .gte("fecha_inicio", desdeDia)
        .lte("fecha_inicio", hastaDia)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("alertas")
        .select("*", { count: "exact" })
        .gte("created_at", desdeIso)
        .lte("created_at", hastaIso)
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase.from("cabezales").select("*", { count: "exact" }).limit(1000),
      supabase.from("chasis").select("*", { count: "exact" }).limit(1000),
      supabase.from("navixy_trackers").select("*", { count: "exact" }).eq("activo", true).limit(1000),
    ]);

    const firstError = [viajesResult.error, rentasResult.error, alertasResult.error, cabezalesResult.error, chasisResult.error, trackersResult.error].find(Boolean);
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const limited = [viajesResult, rentasResult, alertasResult, cabezalesResult, chasisResult, trackersResult].some((result) => (result.count ?? 0) >= 1000);
    setLimitReached(limited);
    setDatos({
      viajes: (viajesResult.data as unknown as ViajeReporte[]) ?? [],
      rentas: (rentasResult.data as unknown as RentaReporte[]) ?? [],
      alertas: (alertasResult.data as unknown as AlertaReporte[]) ?? [],
      cabezales: (cabezalesResult.data as unknown as CabezalRow[]) ?? [],
      chasis: (chasisResult.data as unknown as ChasisRow[]) ?? [],
      trackers: (trackersResult.data as unknown as TrackerRow[]) ?? [],
    });
    setLoading(false);
  }, [desde, hasta]);

  useEffect(() => {
    async function loadReportes() {
      await refetch();
    }
    void loadReportes();
  }, [refetch]);

  return { datos, loading, error, refetch, limitReached };
}

// =============================================================
// MODIFICACIÓN: src/hooks/useGps.ts
//
// CORRECCIÓN: el error "string | undefined no asignable a string"
// ya está protegido por `if (!viajeId) return` pero TypeScript
// no puede inferirlo dentro de la función async interna.
// Solución: aserciones de tipo no-null explícitas después del guard.
// =============================================================

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type GpsLog = Database["public"]["Tables"]["gps_logs"]["Row"];

export function useGps(viajeId?: string) {
  const [posicion, setPosicion] = useState<GpsLog | null>(null);
  const [historial, setHistorial] = useState<GpsLog[]>([]);

  useEffect(() => {
    // Guard: si viajeId es undefined, no hacer nada
    if (!viajeId) return;

    // A partir de aquí, viajeId es string (no undefined)
    const id: string = viajeId;
    let active = true;

    async function fetchGps() {
      const { data } = await supabase
        .from("gps_logs")
        .select("*")
        .eq("viaje_id", id) // ← usa `id` tipado como string, no `viajeId`
        .order("created_at", { ascending: false })
        .limit(100);

      if (!active || !data || data.length === 0) return;
      setPosicion(data[0]);
      setHistorial(data);
    }

    fetchGps();

    const channel = supabase
      .channel(`gps-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gps_logs",
          filter: `viaje_id=eq.${id}`,
        },
        (payload) => {
          if (!active) return;
          const nuevo = payload.new as GpsLog;
          setPosicion(nuevo);
          setHistorial((prev) => [nuevo, ...prev]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [viajeId]);

  return { posicion, historial };
}

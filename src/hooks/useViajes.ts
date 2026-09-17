import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type ViajeRow = Database["public"]["Tables"]["viajes"]["Row"];
type PilotoRow = Database["public"]["Tables"]["pilotos"]["Row"];
type CabezalRow = Database["public"]["Tables"]["cabezales"]["Row"];
type ChasisRow = Database["public"]["Tables"]["chasis"]["Row"];
type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type EstadoViaje = ViajeRow["estado"];

// Viaje enriquecido con joins opcionales
export interface ViajeConRelaciones extends ViajeRow {
  piloto?: PilotoRow | null;
  cabezal?: CabezalRow | null;
  chasis?: ChasisRow | null;
  cliente?: ClienteRow | null;
}

export function useViajes(filtroEstado?: EstadoViaje) {
  const [viajes, setViajes] = useState<ViajeConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref para el filtro — evita que el useEffect se re-ejecute
  // cada render si el caller pasa un literal de string
  const filtroRef = useRef(filtroEstado);
  // eslint-disable-next-line react-hooks/refs
  filtroRef.current = filtroEstado;

  // ── refetch: se usa desde el listener de realtime (event handler) ──
  // No se llama desde el cuerpo del useEffect.
  const refetch = useCallback(async () => {
    let query = supabase
      .from("viajes")
      .select(
        "*, piloto:pilotos(*), cabezal:cabezales(*), chasis:chasis(*), cliente:clientes(*)",
      )
      .order("created_at", { ascending: false });

    if (filtroRef.current) {
      query = query.eq("estado", filtroRef.current);
    }

    const { data, error: err } = await query;
    if (err) {
      setError(err.message);
    } else {
      setViajes((data as ViajeConRelaciones[]) ?? []);
      setError(null);
    }
  }, []);

  // ── Carga inicial y suscripción realtime ───────────────────
  useEffect(() => {
    let active = true;

    // La función async vive DENTRO del efecto → no dispara la regla
    async function fetchData() {
      setLoading(true);

      let query = supabase
        .from("viajes")
        .select(
          "*, piloto:pilotos(*), cabezal:cabezales(*), chasis:chasis(*), cliente:clientes(*)",
        )
        .order("created_at", { ascending: false });

      if (filtroRef.current) {
        query = query.eq("estado", filtroRef.current);
      }

      const { data, error: err } = await query;

      if (!active) return; // componente desmontado, no actualizar

      if (err) {
        setError(err.message);
      } else {
        setViajes((data as ViajeConRelaciones[]) ?? []);
        setError(null);
      }
      setLoading(false);
    }

    fetchData();

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel("viajes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "viajes" },
        () => {
          // Aquí SÍ está permitido llamar refetch porque estamos
          // en un callback de evento, no en el cuerpo del efecto.
          if (active) refetch();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [refetch]); // refetch es estable (useCallback sin deps que cambien)

  return { viajes, loading, error, refetch };
}

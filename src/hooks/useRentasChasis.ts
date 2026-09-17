import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database, EstadoRentaChasisDB } from "@/types/database";

type RentaRow = Database["public"]["Tables"]["rentas_chasis"]["Row"];
type ChasisRow = Database["public"]["Tables"]["chasis"]["Row"];
type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type TipoRentaRow = Database["public"]["Tables"]["tipos_renta"]["Row"];

export type RentaChasisConRelaciones = RentaRow & {
  chasis: ChasisRow | null;
  cliente: ClienteRow | null;
  tipo_renta: TipoRentaRow | null;
};
export type RentaChasisInsert = Database["public"]["Tables"]["rentas_chasis"]["Insert"];

type RentaResultado = { error: string | null; renta?: RentaChasisConRelaciones };

const SELECT_RENTAS = "*, chasis:chasis(*), cliente:clientes(*), tipo_renta:tipos_renta(*)";

export function useRentasChasis(filtroEstado?: EstadoRentaChasisDB) {
  const [rentas, setRentas] = useState<RentaChasisConRelaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refetch = useCallback(async () => {
    let query = supabase.from("rentas_chasis").select(SELECT_RENTAS).order("created_at", { ascending: false });
    if (filtroEstado) query = query.eq("estado", filtroEstado);
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setRentas((data as unknown as RentaChasisConRelaciones[]) ?? []);
    setError(null);
  }, [filtroEstado]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      let query = supabase.from("rentas_chasis").select(SELECT_RENTAS).order("created_at", { ascending: false });
      if (filtroEstado) query = query.eq("estado", filtroEstado);
      const { data, error: fetchError } = await query;
      if (!active) return;
      if (fetchError) setError(fetchError.message);
      else {
        setRentas((data as unknown as RentaChasisConRelaciones[]) ?? []);
        setError(null);
      }
      setLoading(false);
    })();
    const channel = supabase.channel("rentas-chasis-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "rentas_chasis" }, () => {
        if (active) refetch();
      }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [filtroEstado, refetch]);

  const crearRenta = useCallback(async (payload: RentaChasisInsert): Promise<RentaResultado> => {
    const { data: chasisActual, error: chasisValidationError } = await supabase
      .from("chasis").select("estado").eq("id", payload.chasis_id).maybeSingle();
    if (chasisValidationError) return { error: `No se pudo validar el chasis: ${chasisValidationError.message}` };
    if (!chasisActual || chasisActual.estado !== "disponible") {
      return { error: "El chasis seleccionado ya no está disponible. Actualiza la lista e inténtalo de nuevo." };
    }
    const { data, error: insertError } = await supabase
      .from("rentas_chasis").insert({ ...payload, estado: "activa" }).select(SELECT_RENTAS).single();
    if (insertError || !data) return { error: insertError?.message ?? "No se pudo crear la renta." };
    const renta = data as unknown as RentaChasisConRelaciones;
    const { error: chasisError } = await supabase.from("chasis").update({ estado: "en_renta" }).eq("id", payload.chasis_id);
    await refetch();
    if (chasisError) return { renta, error: `La renta se creó, pero no se actualizó el estado del chasis: ${chasisError.message}` };
    return { renta, error: null };
  }, [refetch]);

  const finalizarRenta = useCallback(async (id: string): Promise<RentaResultado> => {
    const renta = rentas.find((item) => item.id === id);
    if (!renta) return { error: "No se encontró la renta seleccionada." };
    const { error: updateError } = await supabase.from("rentas_chasis").update({
      estado: "cerrada",
      fecha_fin: renta.fecha_fin ?? new Date().toISOString().slice(0, 10),
    }).eq("id", id);
    if (updateError) return { error: updateError.message };
    const { error: chasisError } = await supabase.from("chasis").update({ estado: "disponible" }).eq("id", renta.chasis_id);
    await refetch();
    return chasisError
      ? { error: `La renta se cerró, pero no se liberó el chasis: ${chasisError.message}` }
      : { error: null };
  }, [rentas, refetch]);

  const cancelarRenta = useCallback(async (id: string): Promise<RentaResultado> => {
    const renta = rentas.find((item) => item.id === id);
    if (!renta) return { error: "No se encontró la renta seleccionada." };
    const { error: updateError } = await supabase.from("rentas_chasis").update({ estado: "cancelada" }).eq("id", id);
    if (updateError) return { error: updateError.message };
    const { error: chasisError } = await supabase.from("chasis").update({ estado: "disponible" }).eq("id", renta.chasis_id);
    await refetch();
    return chasisError
      ? { error: `La renta se canceló, pero no se liberó el chasis: ${chasisError.message}` }
      : { error: null };
  }, [rentas, refetch]);

  return { rentas, loading, error, refetch, crearRenta, finalizarRenta, cancelarRenta };
}

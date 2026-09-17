import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database, ModalidadRentaDB } from "@/types/database";

export type TipoRentaRow = Database["public"]["Tables"]["tipos_renta"]["Row"];
export type TipoRentaInsert = Database["public"]["Tables"]["tipos_renta"]["Insert"];
export type TipoRentaUpdate = Database["public"]["Tables"]["tipos_renta"]["Update"];

export function useTiposRenta() {
  const [tipos, setTipos] = useState<TipoRentaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("tipos_renta")
      .select("*")
      .order("nombre", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setTipos(data ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("tipos_renta")
        .select("*")
        .order("nombre", { ascending: true });
      if (!active) return;
      if (fetchError) setError(fetchError.message);
      else {
        setTipos(data ?? []);
        setError(null);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const crearTipo = useCallback(async (payload: TipoRentaInsert) => {
    const { error: insertError } = await supabase.from("tipos_renta").insert(payload);
    if (insertError) return insertError.message;
    await refetch();
    return null;
  }, [refetch]);

  const actualizarTipo = useCallback(async (id: string, payload: TipoRentaUpdate) => {
    const { error: updateError } = await supabase.from("tipos_renta").update(payload).eq("id", id);
    if (updateError) return updateError.message;
    await refetch();
    return null;
  }, [refetch]);

  const eliminarTipo = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from("tipos_renta").delete().eq("id", id);
    if (deleteError) return deleteError.message;
    await refetch();
    return null;
  }, [refetch]);

  return { tipos, loading, error, refetch, crearTipo, actualizarTipo, eliminarTipo };
}

export function modalidadLabel(modalidad: ModalidadRentaDB) {
  return modalidad === "por_dia" ? "Por día" : modalidad === "mensual" ? "Mensual" : "Por viaje";
}

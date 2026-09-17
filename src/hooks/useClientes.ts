import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

export type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];

export function useClientes() {
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setClientes(data ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchClientes() {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setClientes(data ?? []);
        setError(null);
      }
      setLoading(false);
    }

    fetchClientes();

    const channel = supabase
      .channel("clientes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes" },
        () => {
          if (active) refetch();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { clientes, loading, error, refetch };
}

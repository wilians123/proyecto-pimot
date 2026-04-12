// =============================================================
// Hook que consulta /api/gps/estados cada N segundos y devuelve
// el estado actual de todos los trackers Navixy.
// Polling en lugar de WebSocket porque Navixy no ofrece
// WebSocket en su API REST v2. 15 segundos es suficiente para
// monitoreo operativo sin saturar la API.
// =============================================================

import { useEffect, useState, useCallback, useRef } from "react";
import type { TrackerEstado } from "@/app/api/gps/estados/route";

export type { TrackerEstado };

// Tracker enriquecido con datos del cabezal vinculado
export interface TrackerConCabezal extends TrackerEstado {
  label: string;
  cabezal_id: string | null;
  placa: string | null;
  marca: string | null;
}

interface UseNavixyOptions {
  /** Intervalo de polling en ms. Default: 15000 (15 s) */
  intervalo?: number;
  /** Si false, el polling no arranca. Default: true */
  activo?: boolean;
}

export function useNavixy(opciones: UseNavixyOptions = {}) {
  const { intervalo = 15_000, activo = true } = opciones;

  const [trackers, setTrackers] = useState<TrackerConCabezal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(
    null,
  );

  // Refs para evitar re-render innecesario en el setInterval
  const activoRef = useRef(activo);
  activoRef.current = activo;

  // ── Carga la lista de trackers vinculados (una sola vez) ────
  const [trackersMeta, setTrackersMeta] = useState<
    Record<
      number,
      {
        label: string;
        cabezal_id: string | null;
        placa: string | null;
        marca: string | null;
      }
    >
  >({});

  useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch("/api/gps/trackers");
        if (!res.ok) return;
        const json = (await res.json()) as {
          trackers: Array<{
            tracker_id: number;
            label: string;
            activo: boolean;
            cabezal: {
              id: string;
              placa: string;
              marca: string | null;
              estado: string;
            } | null;
          }>;
        };
        const meta: typeof trackersMeta = {};
        for (const t of json.trackers) {
          meta[t.tracker_id] = {
            label: t.label,
            cabezal_id: t.cabezal?.id ?? null,
            placa: t.cabezal?.placa ?? null,
            marca: t.cabezal?.marca ?? null,
          };
        }
        setTrackersMeta(meta);
      } catch {
        // No crítico — la etiqueta fallará al nombre del tracker_id
      }
    }
    fetchMeta();
  }, []);

  // ── Fetch de estados GPS ─────────────────────────────────────
  const fetchEstados = useCallback(async () => {
    try {
      const res = await fetch("/api/gps/estados");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }

      const json = (await res.json()) as { estados: TrackerEstado[] };

      const enriquecidos: TrackerConCabezal[] = json.estados.map((estado) => {
        const meta = trackersMeta[estado.tracker_id];
        return {
          ...estado,
          label: meta?.label ?? `Tracker ${estado.tracker_id}`,
          cabezal_id: meta?.cabezal_id ?? null,
          placa: meta?.placa ?? null,
          marca: meta?.marca ?? null,
        };
      });

      setTrackers(enriquecidos);
      setError(null);
      setUltimaActualizacion(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al consultar GPS");
    } finally {
      setLoading(false);
    }
  }, [trackersMeta]);

  // ── Polling ──────────────────────────────────────────────────
  useEffect(() => {
    if (!activo) return;

    // Fetch inmediato al montar
    fetchEstados();

    const id = setInterval(() => {
      if (activoRef.current) fetchEstados();
    }, intervalo);

    return () => clearInterval(id);
  }, [fetchEstados, activo, intervalo]);

  return {
    trackers,
    loading,
    error,
    ultimaActualizacion,
    refetch: fetchEstados,
  };
}

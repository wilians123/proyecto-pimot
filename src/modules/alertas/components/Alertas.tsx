"use client";

import { useEffect, useMemo, useState } from "react";
import AlertaBadge from "@/components/shared/AlertaBadge";
import KpiCard from "@/components/shared/KpiCard";
import { useAlertas } from "@/hooks/useAlertas";
import { alertaAResumen } from "@/utils/alertaView";
import { sincronizarSeccion } from "@/lib/seccion-url";
import { usePermisos } from "@/hooks/usePermisos";

function esHoy(fecha: string) {
  const date = new Date(fecha);
  const ahora = new Date();
  return (
    date.getFullYear() === ahora.getFullYear() &&
    date.getMonth() === ahora.getMonth() &&
    date.getDate() === ahora.getDate()
  );
}

export default function Alertas() {
  useEffect(() => {
    sincronizarSeccion("alertas", "principal");
  }, []);
  const { alertas, loading, marcarComoVista, generarAlertasPrueba } = useAlertas();
  const { rol } = usePermisos();
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activas = useMemo(
    () => alertas.filter((alerta) => ["pendiente", "enviada"].includes(alerta.estado)),
    [alertas],
  );
  const historial = useMemo(
    () => alertas.filter((alerta) => !["pendiente", "enviada"].includes(alerta.estado)),
    [alertas],
  );
  const enviadasHoy = alertas.filter(
    (alerta) => alerta.estado === "enviada" && esHoy(alerta.created_at),
  ).length;
  const resueltasHoy = alertas.filter(
    (alerta) => alerta.estado === "resuelta" && esHoy(alerta.updated_at),
  ).length;

  async function generarPruebas() {
    setGenerando(true);
    setError(null);
    try {
      await generarAlertasPrueba();
    } catch {
      setError("No se pudieron generar las alertas de prueba.");
    } finally {
      setGenerando(false);
    }
  }

  async function abrirAlerta(alertaId: string) {
    try {
      await marcarComoVista(alertaId);
    } catch {
      setError("No se pudo mover la alerta al historial.");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          titulo="Alertas Activas"
          valor={activas.length}
          color="text-red-600"
        />
        <KpiCard titulo="Enviadas Hoy" valor={enviadasHoy} />
        <KpiCard
          titulo="Resueltas Hoy"
          valor={resueltasHoy}
          color="text-green-700"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Alertas</h2>
        {rol === "admin" && (
          <button
            type="button"
            onClick={generarPruebas}
            disabled={generando}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generando ? "Generando…" : "Generar alertas de prueba"}
          </button>
        )}
      </div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Alertas activas</h3>
        </div>
        <div className="p-4 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Cargando alertas…
            </p>
          ) : activas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No hay alertas activas.
            </p>
          ) : (
            activas.map((alerta) => (
              <button
                key={alerta.id}
                type="button"
                onClick={() => abrirAlerta(alerta.id)}
                className="block w-full text-left"
                aria-label={`Abrir alerta: ${alerta.mensaje}`}
              >
                <AlertaBadge alerta={alertaAResumen(alerta)} />
              </button>
            ))
          )}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Historial de Alertas</h3>
        </div>
        <div className="p-4 space-y-3">
          {historial.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No hay alertas en el historial.
            </p>
          ) : (
            historial.map((alerta) => (
              <AlertaBadge key={alerta.id} alerta={alertaAResumen(alerta)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

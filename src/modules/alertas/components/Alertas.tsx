"use client";

import { useEffect, useMemo, useState } from "react";
import AlertaBadge from "@/components/shared/AlertaBadge";
import { useAlertas } from "@/hooks/useAlertas";
import { alertaAResumen } from "@/utils/alertaView";
import { sincronizarSeccion } from "@/lib/seccion-url";

export default function Alertas() {
  useEffect(() => {
    sincronizarSeccion("alertas", "principal");
  }, []);
  const { alertas, loading, marcarComoVista } = useAlertas();
  const [error, setError] = useState<string | null>(null);
  const [vistaAlertas, setVistaAlertas] = useState<"activas" | "historial">("activas");
  const activas = useMemo(
    () => alertas.filter((alerta) => ["pendiente", "enviada"].includes(alerta.estado)),
    [alertas],
  );
  const historial = useMemo(
    () => alertas.filter((alerta) => !["pendiente", "enviada"].includes(alerta.estado)),
    [alertas],
  );
  async function abrirAlerta(alertaId: string) {
    try {
      await marcarComoVista(alertaId);
    } catch {
      setError("No se pudo mover la alerta al historial.");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-center">
        <div className="inline-flex bg-white border border-slate-200 p-1 rounded-2xl shadow-sm gap-1 flex-wrap justify-center" role="tablist" aria-label="Vistas de alertas">
          <button
            type="button"
            role="tab"
            aria-selected={vistaAlertas === "activas"}
            onClick={() => setVistaAlertas("activas")}
            className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${vistaAlertas === "activas" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}
          >
            Alertas Activas
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none ${vistaAlertas === "activas" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
              {activas.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vistaAlertas === "historial"}
            onClick={() => setVistaAlertas("historial")}
            className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${vistaAlertas === "historial" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}
          >
            Historial de alertas
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none ${vistaAlertas === "historial" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
              {historial.length}
            </span>
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" role="tabpanel">
        <div className="p-4 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">Cargando alertas…</p>
          ) : vistaAlertas === "activas" ? (
            activas.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No hay alertas activas.</p>
            ) : activas.map((alerta) => (
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
          ) : historial.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No hay alertas en el historial.</p>
          ) : historial.map((alerta) => (
            <AlertaBadge key={alerta.id} alerta={alertaAResumen(alerta)} />
          ))}
        </div>
      </div>
    </div>
  );
}

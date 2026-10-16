"use client";

import { useEffect, useMemo, useState } from "react";
import AlertaBadge from "@/components/shared/AlertaBadge";
import { useAlertas } from "@/hooks/useAlertas";
import { alertaAResumen } from "@/utils/alertaView";
import { sincronizarSeccion } from "@/lib/seccion-url";
import { usePermisos } from "@/hooks/usePermisos";

const habilitarAlertasDePrueba = process.env.NEXT_PUBLIC_ENABLE_ALERT_TESTS === "1";

export default function Alertas() {
  useEffect(() => {
    sincronizarSeccion("alertas", "principal");
  }, []);
  const { alertas, loading, marcarComoVista, generarAlertasPrueba } = useAlertas();
  const { rol } = usePermisos();
  const [generando, setGenerando] = useState(false);
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
  async function generarPruebas() {
    if (!habilitarAlertasDePrueba) return;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Alertas</h2>
        {rol === "admin" && habilitarAlertasDePrueba && (
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
      {rol === "admin" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-bold text-slate-800">Escalamiento por falta de señal</h3>
          <p className="mt-1 text-sm text-slate-500">
            En viajes en tránsito se envía una alerta a los 10 minutos, un recordatorio a los 20 y un aviso prioritario a los 30 minutos sin señal GPS.
          </p>
        </section>
      )}
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="tablist" aria-label="Vistas de alertas">
          <button
            type="button"
            role="tab"
            aria-selected={vistaAlertas === "activas"}
            onClick={() => setVistaAlertas("activas")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${vistaAlertas === "activas" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Alertas Activas ({activas.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vistaAlertas === "historial"}
            onClick={() => setVistaAlertas("historial")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${vistaAlertas === "historial" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            Historial de alertas
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" role="tabpanel">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">
            {vistaAlertas === "activas" ? "Alertas Activas" : "Historial de alertas"}
          </h3>
        </div>
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

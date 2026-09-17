"use client";

import { useMemo } from "react";
import AlertaBadge from "@/components/shared/AlertaBadge";
import KpiCard from "@/components/shared/KpiCard";
import { useAlertas } from "@/hooks/useAlertas";
import { alertaAResumen } from "@/utils/alertaView";

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
  const { alertas, loading } = useAlertas();
  const activas = useMemo(
    () => alertas.filter((alerta) => ["pendiente", "enviada"].includes(alerta.estado)),
    [alertas],
  );
  const enviadasHoy = alertas.filter(
    (alerta) => alerta.estado === "enviada" && esHoy(alerta.created_at),
  ).length;
  const resueltasHoy = alertas.filter(
    (alerta) => alerta.estado === "resuelta" && esHoy(alerta.updated_at),
  ).length;

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
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Historial de Alertas</h3>
        </div>
        <div className="p-4 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Cargando alertas…
            </p>
          ) : alertas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No hay alertas registradas.
            </p>
          ) : (
            alertas.map((alerta) => (
              <AlertaBadge
                key={alerta.id}
                alerta={alertaAResumen(alerta)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

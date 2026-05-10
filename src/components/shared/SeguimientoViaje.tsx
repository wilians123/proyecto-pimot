"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useNavixy } from "@/hooks/useNavixy";

// MapaFlota solo monta cuando el modal está abierto → un solo Leaflet activo
const MapaFlota = dynamic(() => import("@/components/shared/MapaFlota"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-slate-100 animate-pulse flex items-center justify-center">
      <p className="text-xs text-slate-400">Cargando mapa…</p>
    </div>
  ),
});

interface SeguimientoViajeProps {
  /** UUID del cabezal en la tabla cabezales */
  cabezalId: string | null;
  /** Placa del cabezal para mostrar en labels */
  cabezalPlaca?: string | null;
}

export default function SeguimientoViaje({
  cabezalId,
  cabezalPlaca,
}: SeguimientoViajeProps) {
  const [modalAbierto, setModalAbierto] = useState(false);

  // useNavixy: polling de 15s, igual que en el Dashboard.
  // Enriquece cada tracker con cabezal_id desde /api/gps/trackers
  // (que lee navixy_trackers JOIN cabezales).
  // Solo activo si hay un cabezalId válido.
  const { trackers, ultimaActualizacion } = useNavixy({
    intervalo: 15_000,
    activo: !!cabezalId,
  });

  // Encontrar el tracker del viaje comparando cabezal_id (UUID).
  // TrackerConCabezal.cabezal_id viene del JOIN en /api/gps/trackers.
  // Esto funciona una vez que navixy_trackers.cabezal_id está vinculado.
  const datosTracker = useMemo(() => {
    if (!cabezalId) return null;
    return trackers.find((t) => t.cabezal_id === cabezalId) ?? null;
  }, [trackers, cabezalId]);

  // Estado para mostrar el tiempo transcurrido desde la última actualización.
  // Se calcula en un efecto con un intervalo de 1s para mantenerlo actualizado
  // sin llamar Date.now() durante el render (función impura en Strict Mode).
  const [tiempoActualizado, setTiempoActualizado] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!ultimaActualizacion) return;

    const calcular = () => {
      const segundos = Math.round(
        (Date.now() - ultimaActualizacion.getTime()) / 1000,
      );
      setTiempoActualizado(`Actualizado ${segundos}s atrás`);
    };

    calcular();
    const id = setInterval(calcular, 1_000);
    return () => clearInterval(id);
  }, [ultimaActualizacion]);

  // Estado de movimiento para estilos de badge
  const estadoMov = useMemo(() => {
    if (!datosTracker) return null;
    if (datosTracker.movimiento === "moving")
      return {
        label: "En movimiento",
        bg: "bg-blue-50",
        text: "text-blue-700",
        dot: "bg-blue-500",
      };
    if (datosTracker.movimiento === "parked")
      return {
        label: "Estacionado",
        bg: "bg-amber-50",
        text: "text-amber-700",
        dot: "bg-amber-500",
      };
    return {
      label: "Sin señal",
      bg: "bg-slate-100",
      text: "text-slate-500",
      dot: "bg-slate-300",
    };
  }, [datosTracker]);

  // ── Sin cabezal asignado ──────────────────────────────────────
  if (!cabezalId) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 text-slate-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 opacity-50 shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
        <p className="text-xs font-medium">Sin cabezal asignado al viaje</p>
      </div>
    );
  }

  // ── Cargando (trackers vacíos en el primer poll) ──────────────
  if (trackers.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-2 text-slate-400 animate-pulse">
        <span className="w-2 h-2 bg-slate-300 rounded-full" />
        <p className="text-xs font-medium">Obteniendo señal GPS…</p>
      </div>
    );
  }

  // ── Cabezal sin tracker Navixy vinculado ──────────────────────
  // Ocurre cuando navixy_trackers.cabezal_id sigue en NULL.
  // El SQL fix_navixy_trackers_link.sql corrige esto.
  if (!datosTracker) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 px-4 py-3 flex items-start gap-3">
        <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-slate-500"
          >
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
            <line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-600">
            Sin GPS vinculado
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            El cabezal {cabezalPlaca ?? ""} no tiene un dispositivo Navixy
            configurado.
          </p>
        </div>
      </div>
    );
  }

  // ── Tracker encontrado: tarjetas de datos + botón de mapa ─────
  return (
    <>
      <div className="space-y-2.5">
        {/* Header con label del tracker y tiempo de actualización */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              GPS — {datosTracker.label}
            </p>
          </div>
          {tiempoActualizado && (
            <p className="text-[11px] text-slate-400">{tiempoActualizado}</p>
          )}
        </div>

        {/* Tarjetas de datos live */}
        <div className="grid grid-cols-2 gap-2">
          {/* Velocidad */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
              Velocidad
            </p>
            <p className="text-lg font-black text-slate-800 tabular-nums leading-none">
              {datosTracker.velocidad}
              <span className="text-xs font-semibold text-slate-400 ml-1">
                km/h
              </span>
            </p>
          </div>

          {/* Estado de movimiento */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
              Estado
            </p>
            {estadoMov && (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${estadoMov.bg} ${estadoMov.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${estadoMov.dot}`} />
                {estadoMov.label}
              </span>
            )}
          </div>

          {/* Motor */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
              Motor
            </p>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${datosTracker.encendido ? "bg-green-500" : "bg-red-400"}`}
              />
              <p
                className={`text-sm font-bold ${datosTracker.encendido ? "text-green-700" : "text-red-600"}`}
              >
                {datosTracker.encendido ? "Encendido" : "Apagado"}
              </p>
            </div>
          </div>

          {/* Batería */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
            <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
              Batería
            </p>
            {datosTracker.bateria !== null ? (
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-800 tabular-nums">
                  {datosTracker.bateria}%
                </p>
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${datosTracker.bateria > 50 ? "bg-green-500" : datosTracker.bateria > 20 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${datosTracker.bateria}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">—</p>
            )}
          </div>
        </div>

        {/* Botón para abrir el mapa */}
        <button
          onClick={() => setModalAbierto(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4
            bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold
            rounded-xl transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Ver en mapa
        </button>
      </div>

      {/* Modal del mapa — MapaFlota solo existe mientras el modal está abierto */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalAbierto(false)}
          />

          {/* Panel */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden z-10"
            style={{ height: "min(80dvh, 600px)" }}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Seguimiento — {cabezalPlaca ?? datosTracker.label}
                  </p>
                  <p className="text-xs text-slate-400">{datosTracker.label}</p>
                </div>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors cursor-pointer text-slate-500"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* MapaFlota centrado en el tracker del viaje */}
            <div className="flex-1 overflow-hidden">
              <MapaFlota
                altura="h-full"
                className="h-full"
                highlightTrackerId={datosTracker.tracker_id}
                centerOnHighlight={true}
              />
            </div>

            {/* Footer con resumen de datos */}
            <div className="shrink-0 px-5 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                {datosTracker.velocidad} km/h
              </span>
              <span
                className={`font-semibold ${datosTracker.encendido ? "text-green-700" : "text-red-600"}`}
              >
                Motor {datosTracker.encendido ? "encendido" : "apagado"}
              </span>
              {datosTracker.bateria !== null && (
                <span className="text-slate-500">
                  Batería {datosTracker.bateria}%
                </span>
              )}
              {estadoMov && (
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${estadoMov.bg} ${estadoMov.text}`}
                >
                  {estadoMov.label}
                </span>
              )}
              {tiempoActualizado && (
                <span className="ml-auto text-slate-400">
                  {tiempoActualizado}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import "leaflet/dist/leaflet.css";

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavixy } from "@/hooks/useNavixy";
import type { TrackerConCabezal } from "@/hooks/useNavixy";

// ── Colores por estado de movimiento ─────────────────────────
const COLOR_MOVIMIENTO: Record<string, string> = {
  moving: "#2563EB",
  parked: "#F59E0B",
  stopped: "#94A3B8",
  unknown: "#94A3B8",
};

// ── SVG de marcador personalizado ────────────────────────────
function crearIconoSVG(
  color: string,
  encendido: boolean,
  seleccionado: boolean,
): string {
  const strokeColor = seleccionado
    ? "#F97316"
    : encendido
      ? "#FFFFFF"
      : "#CBD5E1";
  const strokeWidth = seleccionado ? 3 : 2;
  const scale = seleccionado ? 1.2 : 1;
  const w = Math.round(36 * scale);
  const h = Math.round(44 * scale);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 36 44">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
        fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
      <circle cx="18" cy="18" r="8" fill="white" opacity="0.92"/>
      <text x="18" y="22" text-anchor="middle" font-size="11" font-weight="bold"
        fill="${color}" font-family="system-ui,sans-serif">&#x1F69B;</text>
    </svg>
  `;
}

// ── Generar contenido del popup ───────────────────────────────
function crearPopupHTML(tracker: TrackerConCabezal): string {
  const estadoLabel =
    tracker.movimiento === "moving"
      ? "🟢 En movimiento"
      : tracker.movimiento === "parked"
        ? "🟡 Estacionado"
        : "⚪ Sin señal";
  return `
    <div style="font-family:system-ui,sans-serif;min-width:190px;padding:4px 2px">
      <div style="font-weight:700;font-size:14px;color:#1E293B;margin-bottom:8px;
        padding-bottom:6px;border-bottom:1px solid #E2E8F0">
        🚛 ${tracker.label}
      </div>
      ${
        tracker.placa
          ? `
        <div style="font-size:12px;color:#475569;margin-bottom:4px">
          Placa: <strong style="color:#1E293B">${tracker.placa}</strong>
        </div>`
          : ""
      }
      <div style="font-size:12px;color:#475569;margin-bottom:4px">
        Velocidad: <strong style="color:#1E293B">${tracker.velocidad} km/h</strong>
      </div>
      <div style="font-size:12px;color:#475569;margin-bottom:4px">
        ${estadoLabel}
      </div>
      <div style="font-size:12px;color:#475569;margin-bottom:4px">
        Motor: <strong>${tracker.encendido ? "🟢 Encendido" : "🔴 Apagado"}</strong>
      </div>
      ${
        tracker.bateria !== null
          ? `
        <div style="font-size:12px;color:#475569;margin-bottom:4px">
          Batería: <strong style="color:#1E293B">${tracker.bateria}%</strong>
        </div>`
          : ""
      }
      <div style="font-size:11px;color:#94A3B8;margin-top:6px;padding-top:6px;
        border-top:1px solid #E2E8F0">
        ${tracker.lat?.toFixed(6)}, ${tracker.lng?.toFixed(6)}
      </div>
    </div>
  `;
}

// ── Props del componente ──────────────────────────────────────
interface MapaFlotaProps {
  /** Clase de altura Tailwind. Default: "h-80" */
  altura?: string;
  className?: string;
  /**
   * tracker_id Navixy a destacar visualmente (marcador naranja ampliado).
   * Usado por MiniMapaTracker en el panel de detalle de viaje.
   */
  highlightTrackerId?: number | null;
  /**
   * Si true, hace flyTo hacia el tracker destacado una única vez
   * (se resetea cada vez que cambia highlightTrackerId).
   */
  centerOnHighlight?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function MapaFlota({
  altura = "h-80",
  className = "",
  highlightTrackerId = null,
  centerOnHighlight = false,
}: MapaFlotaProps) {
  // ── Refs de Leaflet ──────────────────────────────────────────
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const mapReadyRef = useRef(false);
  const initStartedRef = useRef(false);
  // Evita que el flyTo hacia el highlight se dispare más de una vez
  const highlightCenteredRef = useRef(false);

  // ── Estado del mini menú selector ───────────────────────────
  const [selectorOpen, setSelectorOpen] = useState(false);
  // El tracker elegido por el usuario desde el menú interno del mapa.
  // Es independiente de highlightTrackerId (que viene del componente padre).
  const [trackerSeleccionado, setTrackerSeleccionado] = useState<number | null>(
    null,
  );

  // ── Datos GPS (polling único via useNavixy) ──────────────────
  const { trackers, loading, error, ultimaActualizacion, refetch } = useNavixy({
    intervalo: 15_000,
    activo: true,
  });

  // ── Centrar mapa en un tracker y abrir su popup ──────────────
  const centrarEnTracker = useCallback(
    (trackerId: number) => {
      const tracker = trackers.find((t) => t.tracker_id === trackerId);
      if (!tracker || tracker.lat === null || tracker.lng === null) return;
      if (!leafletMapRef.current) return;

      setSelectorOpen(false);
      setTrackerSeleccionado(trackerId);

      leafletMapRef.current.flyTo([tracker.lat, tracker.lng], 15, {
        animate: true,
        duration: 1.2,
      });

      const marker = markersRef.current.get(trackerId);
      if (marker) {
        setTimeout(() => marker.openPopup(), 1300);
      }
    },
    [trackers],
  );

  // ── Inicializar Leaflet (una sola vez) ───────────────────────
  useEffect(() => {
    if (initStartedRef.current || !mapContainerRef.current) return;
    initStartedRef.current = true;

    const container = mapContainerRef.current;
    const markers = markersRef.current;
    const centro: [number, number] = [15.708, -88.598];

    import("leaflet").then((L) => {
      if (!container || leafletMapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(container, {
        center: centro,
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      leafletMapRef.current = map;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (leafletMapRef.current) {
            leafletMapRef.current.invalidateSize();
            mapReadyRef.current = true;
          }
        });
      });

      const ro = new ResizeObserver(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      });
      ro.observe(container);

      (container as HTMLDivElement & { _ro?: ResizeObserver })._ro = ro;
    });

    return () => {
      initStartedRef.current = false;
      mapReadyRef.current = false;
      highlightCenteredRef.current = false;

      const ro = (container as HTMLDivElement & { _ro?: ResizeObserver })._ro;
      if (ro) ro.disconnect();

      if (leafletMapRef.current) {
        markers.forEach((m) => m.remove());
        markers.clear();
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []); // Sin dependencias → solo corre al montar/desmontar

  // ── Actualizar marcadores cuando cambian los datos GPS ───────
  useEffect(() => {
    if (!leafletMapRef.current || trackers.length === 0) return;

    import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;

      const markers = markersRef.current;
      const idsActivos = new Set(trackers.map((t) => t.tracker_id));

      // Eliminar marcadores de trackers que ya no existen
      markers.forEach((marker, id) => {
        if (!idsActivos.has(id)) {
          map.removeLayer(marker);
          markers.delete(id);
        }
      });

      const posicionesValidas: [number, number][] = [];

      for (const tracker of trackers) {
        if (tracker.lat === null || tracker.lng === null) continue;

        const color =
          COLOR_MOVIMIENTO[tracker.movimiento] ?? COLOR_MOVIMIENTO.unknown;

        // Un tracker se muestra como "seleccionado" si:
        // - el usuario lo eligió desde el menú interno (trackerSeleccionado), O
        // - es el tracker que el padre quiere destacar (highlightTrackerId)
        const esSeleccionado =
          tracker.tracker_id === trackerSeleccionado ||
          tracker.tracker_id === highlightTrackerId;

        const svgStr = crearIconoSVG(color, tracker.encendido, esSeleccionado);
        const iconUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
        const iconSize: [number, number] = esSeleccionado ? [44, 53] : [36, 44];
        const iconAnchor: [number, number] = esSeleccionado
          ? [22, 53]
          : [18, 44];

        const icon = L.icon({
          iconUrl,
          iconSize,
          iconAnchor,
          popupAnchor: [0, -iconSize[1]],
        });

        const popupHTML = crearPopupHTML(tracker);
        const pos: [number, number] = [tracker.lat, tracker.lng];
        posicionesValidas.push(pos);

        if (markers.has(tracker.tracker_id)) {
          const m = markers.get(tracker.tracker_id)!;
          m.setLatLng(pos);
          m.setIcon(icon);
          m.setPopupContent(popupHTML);
        } else {
          const m = L.marker(pos, { icon })
            .addTo(map)
            .bindPopup(popupHTML, { maxWidth: 260, className: "pimot-popup" });
          markers.set(tracker.tracker_id, m);
        }

        // ── Centrar en el tracker destacado por el padre (una sola vez) ──
        if (
          highlightTrackerId !== null &&
          tracker.tracker_id === highlightTrackerId &&
          centerOnHighlight &&
          !highlightCenteredRef.current &&
          mapReadyRef.current
        ) {
          highlightCenteredRef.current = true;
          map.flyTo(pos, 15, { animate: true, duration: 1.2 });
          const marker = markers.get(tracker.tracker_id);
          if (marker) {
            setTimeout(() => marker.openPopup(), 1300);
          }
        }
      }

      // Ajustar vista global SOLO si no hay ningún tracker seleccionado
      // (ni por el usuario ni por el componente padre)
      const haySeleccionActiva =
        trackerSeleccionado !== null || highlightTrackerId !== null;

      if (
        posicionesValidas.length > 0 &&
        mapReadyRef.current &&
        !haySeleccionActiva
      ) {
        if (posicionesValidas.length === 1) {
          map.setView(posicionesValidas[0], 13, { animate: true });
        } else {
          try {
            map.fitBounds(L.latLngBounds(posicionesValidas), {
              padding: [40, 40],
              maxZoom: 14,
              animate: true,
            });
          } catch {
            map.setView(posicionesValidas[0], 11);
          }
        }
      }
    });
  }, [trackers, trackerSeleccionado, highlightTrackerId, centerOnHighlight]);

  // ── Resetear la bandera de centrado cuando cambia el highlight ─
  // Permite centrar de nuevo al seleccionar un viaje distinto
  useEffect(() => {
    highlightCenteredRef.current = false;
  }, [highlightTrackerId]);

  // ── Tiempo desde última actualización ────────────────────────
  const tiempoActualizacion = ultimaActualizacion
    ? `${Math.round((Date.now() - ultimaActualizacion.getTime()) / 1000)}s atrás`
    : "Esperando datos…";

  // ── Helpers de estilo para el mini menú ──────────────────────
  const badgeEstado = (movimiento: string) => {
    if (movimiento === "moving")
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        dot: "bg-blue-500",
        label: "En movimiento",
      };
    if (movimiento === "parked")
      return {
        bg: "bg-amber-100",
        text: "text-amber-800",
        dot: "bg-amber-500",
        label: "Estacionado",
      };
    return {
      bg: "bg-slate-100",
      text: "text-slate-600",
      dot: "bg-slate-400",
      label: "Sin señal",
    };
  };

  const trackersConPosicion = trackers.filter(
    (t) => t.lat !== null && t.lng !== null,
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col ${className}`}>
      {/* ── Área del mapa ── */}
      <div className={`relative ${altura}`}>
        <div
          ref={mapContainerRef}
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: 240 }}
        />

        {/* Overlay de carga — encima del mapa pero sin clipar */}
        {loading && (
          <div
            className="absolute inset-0 bg-slate-100/95 flex flex-col items-center
            justify-center gap-3 z-1000 pointer-events-none"
          >
            <div
              className="w-10 h-10 border-4 border-slate-200 border-t-blue-500
              rounded-full animate-spin"
            />
            <p className="text-sm text-slate-500 font-medium">
              Obteniendo ubicación GPS…
            </p>
          </div>
        )}

        {/* Overlay de error */}
        {!loading && error && (
          <div
            className="absolute inset-0 bg-slate-50/95 flex flex-col items-center
            justify-center gap-3 z-1000 px-6 text-center"
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-500 text-xl">⚠</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Sin conexión GPS
            </p>
            <p className="text-xs text-slate-400 max-w-xs">{error}</p>
            <button
              onClick={refetch}
              className="mt-1 px-4 py-2 bg-slate-800 text-white text-xs font-semibold
                rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Badge de cabezal en seguimiento (solo visible cuando viene del padre) */}
        {!loading && !error && highlightTrackerId !== null && (
          <div className="absolute top-3 left-3 z-1000">
            <div
              className="flex items-center gap-1.5 text-xs font-semibold
              px-2.5 py-1.5 rounded-full border shadow-md
              bg-orange-500 text-white border-orange-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Cabezal en seguimiento
            </div>
          </div>
        )}

        {/* ── Badge/Botón GPS activo — abre el mini menú ── */}
        {!loading && !error && (
          <div className="absolute top-3 right-3 z-1000">
            <button
              onClick={() => setSelectorOpen((v) => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold
                px-2.5 py-1.5 rounded-full border shadow-md transition-all cursor-pointer
                ${
                  selectorOpen
                    ? "bg-orange-500 text-white border-orange-400 shadow-orange-200"
                    : "bg-white/95 backdrop-blur-sm text-green-700 border-green-200 hover:border-green-400"
                }`}
              aria-label="Seleccionar equipo GPS"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  selectorOpen ? "bg-white" : "bg-green-500 animate-pulse"
                }`}
              />
              {selectorOpen
                ? "Cerrar"
                : `GPS activo · ${trackersConPosicion.length}/${trackers.length}`}
              {/* Chevron */}
              <svg
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-2.5 h-2.5 transition-transform duration-200 ${selectorOpen ? "rotate-180" : ""}`}
              >
                <polyline points="2 4 6 8 10 4" />
              </svg>
            </button>

            {/* ── Menú desplegable de selección de equipo ── */}
            {selectorOpen && (
              <div
                className="absolute top-full right-0 mt-1.5 w-56 bg-white rounded-2xl
                border border-slate-200 shadow-xl z-1001 overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Seleccionar equipo
                  </p>
                </div>

                <div className="py-1 max-h-52 overflow-y-auto">
                  {trackers.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-slate-400 text-center">
                      Sin equipos registrados
                    </p>
                  ) : (
                    trackers.map((tracker) => {
                      const badge = badgeEstado(tracker.movimiento);
                      const sinPos = tracker.lat === null;
                      const activo = tracker.tracker_id === trackerSeleccionado;

                      return (
                        <button
                          key={tracker.tracker_id}
                          onClick={() => {
                            if (sinPos) return;
                            centrarEnTracker(tracker.tracker_id);
                          }}
                          disabled={sinPos}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5
                            transition-colors text-left cursor-pointer
                            ${sinPos ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50"}
                            ${activo ? "bg-orange-50" : ""}`}
                        >
                          {/* Icono del camión con color del estado */}
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center
                            shrink-0 text-sm
                            ${activo ? "bg-orange-100" : "bg-slate-100"}`}
                          >
                            🚛
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold truncate leading-tight
                              ${activo ? "text-orange-700" : "text-slate-800"}`}
                            >
                              {tracker.placa ?? tracker.label}
                            </p>
                            {tracker.placa && (
                              <p className="text-xs text-slate-400 truncate leading-tight">
                                {tracker.label}
                              </p>
                            )}
                          </div>

                          {/* Badge de estado — mismo formato que equipos */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5
                            rounded-full text-[10px] font-semibold shrink-0
                            ${badge.bg} ${badge.text}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}
                            />
                            {badge.label}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Opción para volver a mostrar todos */}
                {trackerSeleccionado !== null && (
                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => {
                        setTrackerSeleccionado(null);
                        setSelectorOpen(false);
                        if (leafletMapRef.current) {
                          const posiciones = trackers
                            .filter((t) => t.lat !== null && t.lng !== null)
                            .map((t) => [t.lat!, t.lng!] as [number, number]);
                          if (posiciones.length > 0) {
                            import("leaflet").then((L) => {
                              leafletMapRef.current?.fitBounds(
                                L.latLngBounds(posiciones),
                                {
                                  padding: [40, 40],
                                  maxZoom: 14,
                                  animate: true,
                                },
                              );
                            });
                          }
                        }
                      }}
                      className="w-full text-xs font-semibold text-blue-600 hover:text-blue-700
                        py-2.5 px-3 text-center transition-colors cursor-pointer hover:bg-blue-50"
                    >
                      Ver todos los equipos
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Barra de estado + leyenda ── */}
      <div
        className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/60
        flex flex-wrap items-center justify-between gap-2 text-xs"
      >
        <div className="flex items-center gap-4 text-slate-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            En movimiento
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Estacionado
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
            Sin señal
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <button
            onClick={refetch}
            className="hover:text-slate-600 transition-colors cursor-pointer"
            title="Actualizar ahora"
          >
            ↻
          </button>
          <span>{tiempoActualizacion}</span>
        </div>
      </div>
    </div>
  );
}

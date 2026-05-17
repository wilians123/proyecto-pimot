"use client";

import "leaflet/dist/leaflet.css";

// Neutraliza el CSS por defecto de leaflet-div-icon (background blanco + borde)
// que causaba la cuadrícula de cajas blancas visible entre los tiles del mapa.
const ETA_LABEL_STYLE =
  typeof document !== "undefined" &&
  !document.getElementById("pimot-eta-style") &&
  (() => {
    const s = document.createElement("style");
    s.id = "pimot-eta-style";
    s.textContent =
      ".leaflet-eta-label { background:none !important; border:none !important; box-shadow:none !important; }";
    document.head.appendChild(s);
  })();
void ETA_LABEL_STYLE;

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
  altura?: string;
  className?: string;
  /** tracker_id Navixy a destacar. Muestra marcador naranja ampliado. */
  highlightTrackerId?: number | null;
  /** Si true, hace flyTo al tracker destacado (solo una vez por cambio). */
  centerOnHighlight?: boolean;
  /** Coordenadas del punto de destino del viaje. */
  destinoLat?: number | null;
  destinoLng?: number | null;
  /** Nombre resumido del destino para el popup del marcador. */
  destinoNombre?: string | null;
  /** Modo seguimiento: muestra solo la unidad rastreada con ruta y ETA. */
  modoSeguimiento?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function MapaFlota({
  altura = "h-80",
  className = "",
  highlightTrackerId = null,
  centerOnHighlight = false,
  destinoLat = null,
  destinoLng = null,
  destinoNombre = null,
  modoSeguimiento = false,
}: MapaFlotaProps) {
  // ── Refs de Leaflet ──────────────────────────────────────────
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const mapReadyRef = useRef(false);
  const initStartedRef = useRef(false);
  const highlightCenteredRef = useRef(false);
  const destinoMarkerRef = useRef<L.Marker | null>(null);
  const rutaShadowRef = useRef<L.Polyline | null>(null);
  const rutaPolylineRef = useRef<L.Polyline | null>(null);
  const etaMarkerRef = useRef<L.Marker | null>(null);
  // Estado reactivo: permite que el useEffect del marcador de destino
  // se re-ejecute cuando Leaflet termina de inicializarse (mapReadyRef no lo dispara).
  const [mapReady, setMapReady] = useState(false);

  // ── Estado del mini menú selector ───────────────────────────
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [trackerSeleccionado, setTrackerSeleccionado] = useState<number | null>(
    null,
  );

  // ── Datos GPS ────────────────────────────────────────────────
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

      // flyTo animado hacia el vehículo seleccionado
      leafletMapRef.current.flyTo([tracker.lat, tracker.lng], 15, {
        animate: true,
        duration: 1.2,
      });

      // Abrir el popup del marcador después de que termine la animación
      const marker = markersRef.current.get(trackerId);
      if (marker) {
        setTimeout(() => marker.openPopup(), 1300);
      }
    },
    [trackers],
  );

  // ── Inicializar Leaflet (una sola vez) ───────────────────────
  useEffect(() => {
    // Evita doble init en React StrictMode (que monta 2 veces en dev)
    if (initStartedRef.current || !mapContainerRef.current) return;
    initStartedRef.current = true;

    const container = mapContainerRef.current;
    const markers = markersRef.current;
    const centro: [number, number] = [15.708, -88.598];

    import("leaflet").then((L) => {
      // Doble-check: el cleanup puede haber corrido antes de que resuelva
      if (!container || leafletMapRef.current) return;

      // Corrige iconos rotos en Webpack/Next.js
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
            setMapReady(true);
          }
        });
      });

      // ResizeObserver: llama invalidateSize cuando el contenedor
      // cambia de tamaño (ej. colapso del sidebar, resize de ventana)
      const ro = new ResizeObserver(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      });
      ro.observe(container);

      // Guardar referencia al observer para el cleanup
      (container as HTMLDivElement & { _ro?: ResizeObserver })._ro = ro;
    });

    // ── Cleanup al desmontar ──────────────────────────────────
    return () => {
      initStartedRef.current = false;
      mapReadyRef.current = false;
      highlightCenteredRef.current = false;
      setMapReady(false);

      const ro = (container as HTMLDivElement & { _ro?: ResizeObserver })._ro;
      if (ro) ro.disconnect();

      if (leafletMapRef.current) {
        markers.forEach((m) => m.remove());
        markers.clear();
        if (destinoMarkerRef.current) {
          destinoMarkerRef.current.remove();
          destinoMarkerRef.current = null;
        }
        if (rutaShadowRef.current) {
          rutaShadowRef.current.remove();
          rutaShadowRef.current = null;
        }
        if (rutaPolylineRef.current) {
          rutaPolylineRef.current.remove();
          rutaPolylineRef.current = null;
        }
        if (etaMarkerRef.current) {
          etaMarkerRef.current.remove();
          etaMarkerRef.current = null;
        }
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
        if (
          modoSeguimiento &&
          highlightTrackerId !== null &&
          tracker.tracker_id !== highlightTrackerId
        ) {
          const existing = markers.get(tracker.tracker_id);
          if (existing) {
            map.removeLayer(existing);
            markers.delete(tracker.tracker_id);
          }
          continue;
        }

        if (tracker.lat === null || tracker.lng === null) continue;

        const color =
          COLOR_MOVIMIENTO[tracker.movimiento] ?? COLOR_MOVIMIENTO.unknown;
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

        // Centrar en el tracker destacado por el padre (solo una vez por cambio)
        if (
          highlightTrackerId !== null &&
          tracker.tracker_id === highlightTrackerId &&
          centerOnHighlight &&
          !highlightCenteredRef.current &&
          mapReadyRef.current
        ) {
          highlightCenteredRef.current = true;
          map.flyTo(pos, 15, { animate: true, duration: 1.2 });
          const m = markers.get(tracker.tracker_id);
          if (m) setTimeout(() => m.openPopup(), 1300);
        }
      }

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
  }, [
    trackers,
    trackerSeleccionado,
    highlightTrackerId,
    centerOnHighlight,
    modoSeguimiento,
  ]);

  // Resetea el flag de centrado cada vez que cambia el tracker a seguir
  useEffect(() => {
    highlightCenteredRef.current = false;
  }, [highlightTrackerId]);

  // Dibuja el marcador de destino cuando el mapa está listo y hay coordenadas.
  // Depende de mapReady (estado) para re-ejecutarse tras la init de Leaflet.
  useEffect(() => {
    if (!mapReady || !leafletMapRef.current) return;
    import("leaflet").then((L) => {
      const map = leafletMapRef.current;
      if (!map) return;
      if (destinoLat === null || destinoLng === null) {
        if (destinoMarkerRef.current) {
          destinoMarkerRef.current.remove();
          destinoMarkerRef.current = null;
        }
        return;
      }
      const pos: [number, number] = [destinoLat, destinoLng];
      const svgMeta = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z" fill="#16A34A" stroke="#fff" stroke-width="2"/>
        <circle cx="18" cy="18" r="8" fill="white" opacity="0.92"/>
        <text x="18" y="22" text-anchor="middle" font-size="11" font-family="system-ui,sans-serif">📍</text>
      </svg>`;
      const icon = L.icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgMeta)))}`,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -44],
      });
      const popupTexto = destinoNombre
        ? `<div style="font-family:system-ui,sans-serif;min-width:140px"><div style="font-size:12px;font-weight:700;color:#15803D;margin-bottom:2px">📍 Destino</div><div style="font-size:12px;color:#1E293B;line-height:1.4">${destinoNombre}</div></div>`
        : `<div style="font-family:system-ui,sans-serif;font-size:13px;font-weight:700;color:#15803D">📍 Punto de destino</div>`;
      if (destinoMarkerRef.current) {
        destinoMarkerRef.current.setLatLng(pos);
        destinoMarkerRef.current.setIcon(icon);
      } else {
        destinoMarkerRef.current = L.marker(pos, { icon })
          .addTo(map)
          .bindPopup(popupTexto, { maxWidth: 220 });
        destinoMarkerRef.current.openPopup();
      }
    });
  }, [mapReady, destinoLat, destinoLng, destinoNombre]);

  // Ruta y ETA: llama OSRM para trazar la ruta y calcular el tiempo estimado.
  // Se recalcula cada vez que el tracker actualiza posición (cada 15 s).
  // Con fallback haversine si OSRM no responde.
  useEffect(() => {
    if (!modoSeguimiento) {
      if (rutaShadowRef.current) {
        rutaShadowRef.current.remove();
        rutaShadowRef.current = null;
      }
      if (rutaPolylineRef.current) {
        rutaPolylineRef.current.remove();
        rutaPolylineRef.current = null;
      }
      if (etaMarkerRef.current) {
        etaMarkerRef.current.remove();
        etaMarkerRef.current = null;
      }
      return;
    }
    if (!mapReady || !leafletMapRef.current) return;
    if (
      highlightTrackerId === null ||
      destinoLat === null ||
      destinoLng === null
    )
      return;

    const trackerActual = trackers.find(
      (t) => t.tracker_id === highlightTrackerId,
    );
    if (
      !trackerActual ||
      trackerActual.lat === null ||
      trackerActual.lng === null
    )
      return;

    const originLat = trackerActual.lat;
    const originLng = trackerActual.lng;

    function haversineKm(
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ): number {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.asin(Math.sqrt(a));
    }

    function formatEta(seg: number): string {
      if (seg < 60) return "< 1 min";
      const h = Math.floor(seg / 3600);
      const m = Math.round((seg % 3600) / 60);
      return h === 0 ? `~${m} min` : `~${h}h ${m}m`;
    }

    function dibujarRutaYEta(coords: [number, number][], duracion: number) {
      import("leaflet").then((L) => {
        const map = leafletMapRef.current;
        if (!map) return;

        if (rutaShadowRef.current) {
          rutaShadowRef.current.setLatLngs(coords);
        } else {
          rutaShadowRef.current = L.polyline(coords, {
            color: "#1E3A5F",
            weight: 14,
            opacity: 0.35,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);
        }

        if (rutaPolylineRef.current) {
          rutaPolylineRef.current.setLatLngs(coords);
        } else {
          rutaPolylineRef.current = L.polyline(coords, {
            color: "#3B82F6",
            weight: 7,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);
        }

        const midPoint = coords[Math.floor(coords.length / 2)] ?? coords[0];
        // FIX CUADRÍCULA: className con reset explícito para anular el CSS por defecto
        // de leaflet-div-icon (background:white; border:1px solid #666) que causaba
        // la cuadrícula de cajas blancas visible entre los tiles del mapa.
        const etaIcon = L.divIcon({
          html: `<div style="transform:translate(-50%,calc(-100% - 8px));background:linear-gradient(135deg,#1E40AF,#2563EB);border:2.5px solid #fff;border-radius:10px;padding:8px 16px;font-family:system-ui,sans-serif;font-size:15px;font-weight:700;color:#fff;white-space:nowrap;box-shadow:0 4px 14px rgba(37,99,235,0.45);display:inline-flex;align-items:center;pointer-events:none">${formatEta(duracion)}</div>`,
          className: "leaflet-eta-label",
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        if (etaMarkerRef.current) {
          etaMarkerRef.current.setLatLng(midPoint);
          etaMarkerRef.current.setIcon(etaIcon);
        } else {
          etaMarkerRef.current = L.marker(midPoint, {
            icon: etaIcon,
            interactive: false,
            zIndexOffset: 500,
          }).addTo(map);
        }
      });
    }

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson`;
    fetch(osrmUrl)
      .then((r) => r.json())
      .then((data) => {
        if (!data.routes?.[0]) throw new Error("sin ruta");
        const coords: [number, number][] =
          data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng],
          );
        dibujarRutaYEta(coords, data.routes[0].duration);
      })
      .catch(() => {
        const dist = haversineKm(originLat, originLng, destinoLat, destinoLng);
        const vel = Math.max(trackerActual.velocidad, 40);
        dibujarRutaYEta(
          [
            [originLat, originLng],
            [destinoLat, destinoLng],
          ],
          (dist / vel) * 3600,
        );
      });
  }, [
    modoSeguimiento,
    mapReady,
    highlightTrackerId,
    destinoLat,
    destinoLng,
    trackers,
  ]);

  // ── Tiempo desde última actualización ────────────────────────
  const tiempoActualizacion = ultimaActualizacion
    ? `${Math.round((Date.now() - ultimaActualizacion.getTime()) / 1000)}s atrás`
    : "Esperando datos…";

  // ── Helpers de estilo para el mini menú ──────────────────────
  // Mismo formato visual que los badges de estado de equipos
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
          // style garantiza que Leaflet SIEMPRE tenga una altura mínima
          // incluso si la clase Tailwind no se aplicó aún
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

        {/* ── Badge/Botón GPS activo — abre el mini menú ── */}
        {!loading && !error && !modoSeguimiento && (
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
                        // Volver a ajustar la vista para incluir todos
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

      {/* Barra de leyenda — oculta en modoSeguimiento */}
      {!modoSeguimiento && (
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
      )}
    </div>
  );
}

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
      ".leaflet-eta-label { background:none !important; border:none !important; box-shadow:none !important; } .leaflet-truck-sat-icon { background:transparent !important; border:0 !important; box-shadow:none !important; padding:0 !important; } .leaflet-truck-sat-icon > div { background:transparent !important; border:0 !important; box-shadow:none !important; padding:0 !important; width:24px !important; height:64px !important; transform-origin:center center; } .leaflet-truck-sat-icon svg { display:block; overflow:visible; }";
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
function crearIconoSVG(): string {
  return `
    <svg style="width:24px;height:64px" width="24" height="64" viewBox="0 0 24 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="2" width="18" height="38" rx="2" fill="currentColor" stroke="#ffffff" stroke-width="2"/>
      <line x1="6" y1="10" x2="18" y2="10" stroke="#ffffff" stroke-width="1.5" opacity="0.3"/>
      <line x1="6" y1="22" x2="18" y2="22" stroke="#ffffff" stroke-width="1.5" opacity="0.3"/>
      <line x1="6" y1="32" x2="18" y2="32" stroke="#ffffff" stroke-width="1.5" opacity="0.3"/>
      <rect x="4" y="43" width="16" height="15" rx="3" fill="#1e293b" stroke="#ffffff" stroke-width="2"/>
      <path d="M6 54H18" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
      <rect x="1" y="46" width="2" height="4" fill="#ffffff" rx="0.5"/>
      <rect x="21" y="46" width="2" height="4" fill="#ffffff" rx="0.5"/>
    </svg>
  `;
}

// ── Generar contenido del popup ───────────────────────────────
function crearPopupHTML(tracker: TrackerConCabezal): string {
  const estadoLabel =
    tracker.movimiento === "moving"
      ? "En movimiento"
      : tracker.movimiento === "parked"
        ? "Estacionado"
        : tracker.movimiento === "stopped"
          ? "Detenido"
          : "Sin señal";
  const unidadPrincipal = tracker.placa ?? tracker.label;
  const detalleDispositivo = `Unidad ${tracker.label} · Tracker #${tracker.tracker_id}${tracker.bateria !== null ? ` · Batería ${tracker.bateria}%` : ""}`;
  const colorMotor = tracker.encendido ? "#10b981" : "#ef4444";
  const estadoMotor = tracker.encendido ? "Encendido" : "Apagado";
  return `
    <div style="font-family:system-ui,sans-serif;width:220px;max-width:220px;min-width:0;color:#0f172a;padding:2px 1px;box-sizing:border-box">
      <div style="padding:1px 2px 6px;border-bottom:1px solid #e2e8f0">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;font-size:15px;line-height:1.25;color:#0f172a">
          ${unidadPrincipal}
        </div>
        <div style="font-size:10px;line-height:1.3;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${detalleDispositivo}
        </div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;padding:6px 7px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px">
        <span style="font-size:11px;color:#64748b">Velocidad Actual</span>
        <strong style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;line-height:1;font-weight:700;color:#0f172a;white-space:nowrap">
          ${tracker.velocidad} km/h
        </strong>
      </div>

      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:0 0 6px">
        <div style="padding:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;min-width:0">
          <div style="font-size:9px;line-height:1.2;letter-spacing:.08em;color:#94a3b8;font-weight:700">MOVIMIENTO</div>
          <div style="font-size:11px;line-height:1.25;color:#0f172a;font-weight:600;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${estadoLabel}
          </div>
        </div>
        <div style="padding:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;min-width:0">
          <div style="font-size:9px;line-height:1.2;letter-spacing:.08em;color:#94a3b8;font-weight:700">MOTOR</div>
          <div style="font-size:11px;line-height:1.25;color:#0f172a;font-weight:600;margin-top:2px;white-space:nowrap">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${colorMotor};margin-right:5px;vertical-align:middle"></span>${estadoMotor}
          </div>
        </div>
      </div>

      <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;line-height:1.3;color:#94a3b8;margin-top:4px;padding:5px 2px 0;border-top:1px solid #e2e8f0">
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
  const ultimoRumboRef = useRef<Map<number, number>>(new Map());
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
        const trackerRumbo = tracker as TrackerConCabezal & {
          heading?: number;
          bearing?: number;
        };
        const rumboReportado = Number(
          trackerRumbo.heading ?? trackerRumbo.bearing,
        );
        const rumboValido = Number.isFinite(rumboReportado);
        const estacionado =
          tracker.velocidad === 0 ||
          tracker.movimiento === "stopped" ||
          tracker.movimiento === "parked";
        if (
          rumboValido &&
          (!estacionado || !ultimoRumboRef.current.has(tracker.tracker_id))
        ) {
          ultimoRumboRef.current.set(tracker.tracker_id, rumboReportado);
        }
        const rumbo = ultimoRumboRef.current.get(tracker.tracker_id) ?? 0;
        const rotacion = rumbo + 180;
        const escala = esSeleccionado ? 1.2 : 1;
        const icon = L.divIcon({
          html: `<div style="width:24px;height:64px;color:${color};transform:rotate(${rotacion}deg) scale(${escala});transform-origin:center center;">${crearIconoSVG()}</div>`,
          className: "leaflet-truck-sat-icon",
          iconSize: [24, 64],
          iconAnchor: [12, 32],
          popupAnchor: [0, -32],
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
              <span className="text-red-600 text-xl">⚠</span>
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

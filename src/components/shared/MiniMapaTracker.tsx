// Mini mapa Leaflet que muestra la posición en tiempo real
// de un tracker Navixy asociado a un cabezal específico.
// Se usa en el panel de detalle del viaje activo.

"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TrackerConCabezal } from "@/hooks/useNavixy";

interface MiniMapaTrackerProps {
  cabezalId: string | null;
}

const COLOR = {
  moving: "#2563EB",
  parked: "#F59E0B",
  stopped: "#94A3B8",
  unknown: "#94A3B8",
} as const;

function svgMarker(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 36 44">
    <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
      fill="${color}" stroke="#fff" stroke-width="2"/>
    <circle cx="18" cy="18" r="7" fill="white" opacity="0.9"/>
    <text x="18" y="22" text-anchor="middle" font-size="10"
      font-family="system-ui,sans-serif">🚛</text>
  </svg>`;
}

export default function MiniMapaTracker({ cabezalId }: MiniMapaTrackerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const initDoneRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [trackerId, setTrackerId] = useState<number | null>(null);
  const [estado, setEstado] = useState<TrackerConCabezal | null>(null);
  const [sinGPS, setSinGPS] = useState(false);

  // Paso 1: obtener el tracker_id vinculado al cabezal
  useEffect(() => {
    if (!cabezalId) {
      setTrackerId(null);
      return;
    }
    // Extraer como string tras el guard — mismo patrón que useGps.ts —
    // para que TypeScript no infiera string|null dentro del closure async.
    const id: string = cabezalId;

    let active = true;
    async function fetchTracker() {
      const { data } = await supabase
        .from("navixy_trackers")
        .select("tracker_id, label")
        .eq("cabezal_id", id)
        .eq("activo", true)
        .maybeSingle();
      if (active && data) setTrackerId(data.tracker_id);
      if (active && !data) setSinGPS(true);
    }
    fetchTracker();
    return () => {
      active = false;
    };
  }, [cabezalId]);

  // Paso 2: consultar la API de GPS para ese tracker (polling 15s)
  useEffect(() => {
    if (!trackerId) return;

    async function fetchGPS() {
      try {
        const res = await fetch("/api/gps/estados");
        if (!res.ok) return;
        const json = (await res.json()) as { estados: TrackerConCabezal[] };
        const t = json.estados.find((e) => e.tracker_id === trackerId);
        if (t) setEstado(t);
      } catch {
        /* silencioso */
      }
    }

    fetchGPS();
    intervalRef.current = setInterval(fetchGPS, 15_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [trackerId]);

  // Paso 3: inicializar Leaflet una sola vez
  useEffect(() => {
    if (initDoneRef.current || !containerRef.current) return;
    initDoneRef.current = true;

    const container = containerRef.current;

    import("leaflet").then((L) => {
      if (!container || mapRef.current) return;

      // Fix iconos Webpack
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
        center: [15.708, -88.598],
        zoom: 11,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Doble rAF — garantiza que el CSS de altura se aplicó antes de medir
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (mapRef.current) mapRef.current.invalidateSize();
        });
      });

      const ro = new ResizeObserver(() => mapRef.current?.invalidateSize());
      ro.observe(container);
      (container as HTMLDivElement & { _ro?: ResizeObserver })._ro = ro;
    });

    return () => {
      initDoneRef.current = false;
      const ro = (container as HTMLDivElement & { _ro?: ResizeObserver })._ro;
      if (ro) ro.disconnect();
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Paso 4: actualizar marcador cuando cambia el estado GPS
  useEffect(() => {
    if (!estado || estado.lat === null || estado.lng === null) return;
    if (!mapRef.current) return;

    // Extraer antes del import() para mantener el narrowing number (no number|null)
    // TypeScript pierde la estrechez de tipo dentro del callback de una Promise.
    const lat: number = estado.lat;
    const lng: number = estado.lng;

    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      const color =
        COLOR[estado.movimiento as keyof typeof COLOR] ?? COLOR.unknown;
      const iconUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgMarker(color))))}`;
      const icon = L.icon({
        iconUrl,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
      });

      const pos: [number, number] = [lat, lng];

      const popup = `<div style="font-family:system-ui,sans-serif;min-width:160px">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px">${estado.placa ?? estado.label}</div>
        <div style="font-size:12px;color:#475569">Velocidad: <strong>${estado.velocidad} km/h</strong></div>
        <div style="font-size:12px;color:#475569">Motor: <strong>${estado.encendido ? "🟢 Encendido" : "🔴 Apagado"}</strong></div>
        ${estado.bateria !== null ? `<div style="font-size:12px;color:#475569">Batería: <strong>${estado.bateria}%</strong></div>` : ""}
      </div>`;

      if (markerRef.current) {
        markerRef.current.setLatLng(pos);
        markerRef.current.setIcon(icon);
        markerRef.current.setPopupContent(popup);
      } else {
        markerRef.current = L.marker(pos, { icon })
          .addTo(map)
          .bindPopup(popup, { maxWidth: 220 });
        markerRef.current.openPopup();
      }

      map.flyTo(pos, 14, { animate: true, duration: 1 });
    });
  }, [estado]);

  // ── Sin cabezal asignado ──────────────────────────────────────
  if (!cabezalId) {
    return (
      <div
        className="h-44 bg-slate-50 rounded-xl border border-slate-200 flex flex-col
        items-center justify-center gap-2 text-slate-400"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8 opacity-40"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
        <p className="text-xs font-medium">Sin cabezal asignado</p>
      </div>
    );
  }

  // ── Sin tracker vinculado en Navixy ───────────────────────────
  if (sinGPS) {
    return (
      <div
        className="h-44 bg-slate-50 rounded-xl border border-slate-200 flex flex-col
        items-center justify-center gap-2 text-slate-400"
      >
        <span className="text-2xl opacity-50">📡</span>
        <p className="text-xs font-medium">Sin GPS vinculado a este cabezal</p>
        <p className="text-xs text-slate-300">Configura el tracker en Navixy</p>
      </div>
    );
  }

  // ── Mapa Leaflet ──────────────────────────────────────────────
  return (
    <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200">
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: 176 }}
      />

      {/* Badge de actualización */}
      {estado && (
        <div
          className="absolute bottom-2 left-2 z-1000 flex items-center gap-1.5
          bg-white/90 backdrop-blur-sm text-xs font-medium px-2 py-1 rounded-full
          border border-slate-200 shadow-sm text-slate-600"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              estado.movimiento === "moving"
                ? "bg-blue-500 animate-pulse"
                : "bg-amber-400"
            }`}
          />
          {estado.movimiento === "moving"
            ? `${estado.velocidad} km/h`
            : "Estacionado"}
        </div>
      )}
    </div>
  );
}

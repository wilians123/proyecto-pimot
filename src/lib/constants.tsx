// =============================================================
// Constantes globales de UI: iconos, configs de estado, nav
// =============================================================

import type { EstadoViajeUI, NivelAlertaUI, ModuloId, ViajeResumen, AlertaResumen } from '@/types/ui'

// ─── Iconos inline (sin dependencia externa) ─────────────────
export const icons = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M2 4a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm0 9a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2H4a2 2 0 01-2-2v-3zm9-9a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2V4zm0 9a2 2 0 012-2h3a2 2 0 012 2v3a2 2 0 01-2 2h-3a2 2 0 01-2-2v-3z" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM2 2.5A.5.5 0 012.5 2H11a.5.5 0 01.5.5v9H2V2.5zM11.5 4H14l2 3v3.5h-4.5V4z" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 004 13h12a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
  flota: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z"
        clipRule="evenodd"
      />
    </svg>
  ),
  pilot: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
        clipRule="evenodd"
      />
    </svg>
  ),
  security: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path
        fillRule="evenodd"
        d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path
        fillRule="evenodd"
        d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
}

// ─── Configuración visual de estados de viaje ─────────────────
export const ESTADO_CONFIG: Record<
  EstadoViajeUI,
  { label: string; bg: string; text: string; dot: string }
> = {
  programado:  { label: 'Programado',  bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  en_transito: { label: 'En Tránsito', bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500'  },
  en_destino:  { label: 'En Destino',  bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500' },
  finalizado:  { label: 'Finalizado',  bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500' },
  cancelado:   { label: 'Cancelado',   bg: 'bg-red-50',    text: 'text-red-600',   dot: 'bg-red-400'   },
}

// ─── Configuración visual de niveles de alerta ────────────────
export const ALERTA_CONFIG: Record<
  NivelAlertaUI,
  { bg: string; text: string; border: string; icon: string }
> = {
  info:        { bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-200',  icon: '●' },
  advertencia: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', icon: '▲' },
  critico:     { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200',   icon: '■' },
}

// ─── Ítems del menú de navegación ────────────────────────────
export const NAV_ITEMS: Array<{ id: ModuloId; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Panel Principal',      icon: icons.dashboard },
  { id: 'viajes',    label: 'Viajes',               icon: icons.truck     },
  { id: 'alertas',   label: 'Alertas',              icon: icons.bell      },
  { id: 'reportes',  label: 'Análisis y Reportes',  icon: icons.chart     },
  { id: 'flota',     label: 'Gestión de Flota',     icon: icons.flota     },
  { id: 'pilotos',   label: 'Pilotos y Viáticos',   icon: icons.pilot     },
  { id: 'usuarios',  label: 'Usuarios y Seguridad', icon: icons.security  },
]

// ─── Títulos de módulos para el Header ───────────────────────
export const MODULO_HEADERS: Record<ModuloId, string> = {
  dashboard: 'Panel Principal',
  viajes:    'Seguimiento de Viajes',
  alertas:   'Alertas y Notificaciones',
  reportes:  'Análisis y Reportes',
  flota:     'Gestión de Flota',
  pilotos:   'Pilotos y Viáticos',
  usuarios:  'Usuarios y Seguridad',
}

// ─── Datos de muestra (se reemplazarán por datos reales de Supabase) ──
export const VIAJES_MUESTRA: ViajeResumen[] = [
  { id: 'VJ-2026-0042', piloto: 'Carlos Ramírez',  origen: 'Puerto Barrios',          destino: 'Ciudad de Guatemala', estado: 'en_transito', inicio: '08:30', estimado: '14:00', cabezal: 'P-123ABC' },
  { id: 'VJ-2026-0041', piloto: 'Miguel Torres',   origen: 'Santo Tomás de Castilla', destino: 'Escuintla',           estado: 'en_destino',  inicio: '06:15', estimado: '11:30', cabezal: 'P-456DEF' },
  { id: 'VJ-2026-0040', piloto: 'Juan García',     origen: 'Ciudad de Guatemala',     destino: 'Zacapa',              estado: 'programado',  inicio: '15:00', estimado: '19:30', cabezal: 'P-789GHI' },
  { id: 'VJ-2026-0039', piloto: 'Roberto Méndez',  origen: 'Cobán',                   destino: 'Puerto Barrios',      estado: 'finalizado',  inicio: '05:00', estimado: '09:00', cabezal: 'P-321JKL' },
]

export const ALERTAS_MUESTRA: AlertaResumen[] = [
  { id: 1, tipo: 'inactividad_prolongada', nivel: 'advertencia', mensaje: 'Vehículo P-123ABC sin movimiento por 35 minutos', viaje: 'VJ-2026-0042', tiempo: 'hace 5 min'  },
  { id: 2, tipo: 'retraso_operativo',      nivel: 'critico',     mensaje: 'Viaje VJ-2026-0041 excede tiempo estimado por 25 min', viaje: 'VJ-2026-0041', tiempo: 'hace 12 min' },
  { id: 3, tipo: 'llegada_destino',        nivel: 'info',        mensaje: 'P-456DEF llegó al área de destino en Escuintla', viaje: 'VJ-2026-0041', tiempo: 'hace 18 min' },
]
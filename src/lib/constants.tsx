// =============================================================
// configs de estado actualizadas, tipos de flota añadidos
// =============================================================

import type {
  EstadoViajeUI, NivelAlertaUI, ModuloId,
  ViajeResumen, AlertaResumen,
  EstadoCabezal, EstadoChasisUI,
} from '@/types/ui'


// identificables para usuarios no técnicos
export const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M1 3h13v13H1z" />
      <path d="M14 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4"  />
      <line x1="6"  y1="20" x2="6"  y2="14" />
      <line x1="2"  y1="20" x2="22" y2="20" />
    </svg>
  ),
  flota: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7" />
      <circle cx="5.5"  cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
      <path d="M10.5 18.5h5" />
    </svg>
  ),
  pilot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  security: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  // Iconos de layout y acciones
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  chevronLeft: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  alertTriangle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
}

// ─── Configuración visual de estados de viaje ─────────────────
export const ESTADO_CONFIG: Record<
  EstadoViajeUI,
  { label: string; bg: string; text: string; dot: string }
> = {
  programado:  { label: 'Programado',  bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  en_transito: { label: 'En Tránsito', bg: 'bg-blue-100',  text: 'text-blue-800',  dot: 'bg-blue-500'  },
  en_destino:  { label: 'En Destino',  bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  finalizado:  { label: 'Finalizado',  bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-600' },
  cancelado:   { label: 'Cancelado',   bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-400'   },
}

// ─── Configuración visual de niveles de alerta ────────────────
export const ALERTA_CONFIG: Record<
  NivelAlertaUI,
  { bg: string; text: string; border: string; icon: string; labelBg: string; labelText: string }
> = {
  info:        { bg: 'bg-blue-50',  text: 'text-blue-800',  border: 'border-blue-200',  icon: 'ℹ',  labelBg: 'bg-blue-100',  labelText: 'text-blue-800'  },
  advertencia: { bg: 'bg-amber-50', text: 'text-amber-900', border: 'border-amber-300', icon: '⚠',  labelBg: 'bg-amber-100', labelText: 'text-amber-900' },
  critico:     { bg: 'bg-red-50',   text: 'text-red-800',   border: 'border-red-300',   icon: '🚨', labelBg: 'bg-red-100',   labelText: 'text-red-800'   },
}

// ─── Estados de cabezal ───────────────────────────────────────
export const ESTADO_CABEZAL_CONFIG: Record<
  EstadoCabezal,
  { label: string; bg: string; text: string; dot: string }
> = {
  activo:           { label: 'Disponible',   bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500'  },
  en_viaje:         { label: 'En Viaje',      bg: 'bg-blue-100',  text: 'text-blue-800',  dot: 'bg-blue-500'   },
  en_mantenimiento: { label: 'Mantenimiento', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500'  },
  inactivo:         { label: 'Inactivo',      bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400'  },
}

// ─── Estados de chasis ────────────────────────────────────────
export const ESTADO_CHASIS_CONFIG: Record<
  EstadoChasisUI,
  { label: string; bg: string; text: string; dot: string }
> = {
  disponible: { label: 'Disponible', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500'  },
  en_renta:   { label: 'En Renta',   bg: 'bg-purple-100',text: 'text-purple-800',dot: 'bg-purple-500' },
  en_flete:   { label: 'En Flete',   bg: 'bg-blue-100',  text: 'text-blue-800',  dot: 'bg-blue-500'   },
  en_taller:  { label: 'En Taller',  bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500'  },
}

// ─── Ítems de navegación ──────────────────────────────────────
export const NAV_ITEMS: Array<{ id: ModuloId; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: 'Panel Principal',      icon: icons.dashboard },
  { id: 'viajes',    label: 'Viajes',               icon: icons.truck     },
  { id: 'alertas',   label: 'Alertas',              icon: icons.bell      },
  { id: 'reportes',  label: 'Análisis y Reportes',  icon: icons.chart     },
  { id: 'flota',     label: 'Gestión de Flota',     icon: icons.flota     },
  { id: 'pilotos',   label: 'Pilotos y Viáticos',   icon: icons.pilot     },
  { id: 'usuarios',  label: 'Usuarios y Seguridad', icon: icons.security  },
]

// ─── Títulos de módulos ───────────────────────────────────────
export const MODULO_HEADERS: Record<ModuloId, string> = {
  dashboard: 'Panel Principal',
  viajes:    'Seguimiento de Viajes',
  alertas:   'Alertas y Notificaciones',
  reportes:  'Análisis y Reportes',
  flota:     'Gestión de Flota',
  pilotos:   'Pilotos y Viáticos',
  usuarios:  'Usuarios y Seguridad',
}

// ─── Datos de muestra ─────────────────────────────────────────
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
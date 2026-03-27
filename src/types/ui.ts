// =============================================================
// Agrega tipos para flota, notificaciones y panel móvil
// =============================================================

export type EstadoViajeUI = 'programado' | 'en_transito' | 'en_destino' | 'finalizado' | 'cancelado'
export type NivelAlertaUI = 'info' | 'advertencia' | 'critico'
export type ModuloId =
  | 'dashboard'
  | 'viajes'
  | 'alertas'
  | 'reportes'
  | 'flota'
  | 'pilotos'
  | 'usuarios'

// ── Tipos de flota ────────────────────────────────────────────
export type TipoEquipo   = 'cabezal' | 'chasis'
export type TamañoChasis = '20' | '40' | '45'
export type EstadoCabezal = 'activo' | 'en_viaje' | 'en_mantenimiento' | 'inactivo'
export type EstadoChasisUI = 'disponible' | 'en_renta' | 'en_flete' | 'en_taller'

export interface CabezalUI {
  id?: string
  placa: string
  marca?: string
  modelo?: string
  año?: number
  estado: EstadoCabezal
  notas?: string
}

export interface ChasisUI {
  id?: string
  placa: string
  tamaño: TamañoChasis
  estado: EstadoChasisUI
  notas?: string
}

// ── Datos de pantallas ────────────────────────────────────────
export interface ViajeResumen {
  id: string
  piloto: string
  origen: string
  destino: string
  estado: EstadoViajeUI
  inicio: string
  estimado: string
  cabezal: string
}

export interface AlertaResumen {
  id: number
  tipo: string
  nivel: NivelAlertaUI
  mensaje: string
  viaje: string
  tiempo: string
}

// ── Props de componentes ──────────────────────────────────────
export interface BadgeProps            { estado: EstadoViajeUI }
export interface KpiCardProps          { titulo: string; valor: string | number; subtexto?: string; color?: string; tendencia?: number; icon?: React.ReactNode }
export interface AlertaBadgeProps      { alerta: AlertaResumen }
export interface ModuloPlaceholderProps { titulo: string; descripcion: string }

export interface SidebarProps {
  modulo: ModuloId
  setModulo: (id: ModuloId) => void
  collapsed: boolean
  toggle: () => void
  mobileOpen: boolean
  setMobileOpen: (v: boolean) => void
}

export interface HeaderProps {
  titulo: string
  alertasCount: number
  onToggleMobile: () => void
  onToggleNotifications: () => void
  notificationsOpen: boolean
}
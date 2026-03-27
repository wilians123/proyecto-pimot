// =============================================================
// Tipos TypeScript para los componentes de UI de PIMOT
// =============================================================

// Estado de viaje — valores exactos que vienen de la BD
export type EstadoViajeUI = 'programado' | 'en_transito' | 'en_destino' | 'finalizado' | 'cancelado'

// Nivel de alerta — valores exactos de la BD
export type NivelAlertaUI = 'info' | 'advertencia' | 'critico'

// Módulos disponibles en el sidebar
export type ModuloId =
  | 'dashboard'
  | 'viajes'
  | 'alertas'
  | 'reportes'
  | 'flota'
  | 'pilotos'
  | 'usuarios'

// ── Datos de muestra tipados ──────────────────────────────────
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

// ── Props de componentes UI ───────────────────────────────────
export interface BadgeProps {
  estado: EstadoViajeUI
}

export interface KpiCardProps {
  titulo: string
  valor: string | number
  subtexto?: string
  color?: string
  tendencia?: number
}

export interface AlertaBadgeProps {
  alerta: AlertaResumen
}

export interface SidebarProps {
  modulo: ModuloId
  setModulo: (id: ModuloId) => void
  collapsed: boolean
  toggle: () => void
}

export interface HeaderProps {
  titulo: string
  alertasCount: number
}

export interface ModuloPlaceholderProps {
  titulo: string
  descripcion: string
}
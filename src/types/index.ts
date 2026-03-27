// ============================================================
// PIMOT - Tipos principales del sistema
// ============================================================

export type Rol = 'admin' | 'operativo' | 'visualizador'
export type EstadoViaje = 'programado' | 'en_transito' | 'en_destino' | 'finalizado' | 'cancelado'
export type EstadoCabezal = 'activo' | 'en_viaje' | 'en_mantenimiento' | 'inactivo'
export type EstadoChasis = 'disponible' | 'en_renta' | 'en_flete' | 'en_taller'
export type TipoAlerta = 'inactividad_prolongada' | 'llegada_destino' | 'retraso_operativo' | 'finalizacion_viaje' | 'velocidad_excesiva' | 'otro'
export type NivelAlerta = 'info' | 'advertencia' | 'critico'
export type EstadoAlerta = 'pendiente' | 'enviada' | 'vista' | 'resuelta'
export type TamañoChasis = '20' | '40' | '45'
export type ModalidadRenta = 'por_viaje' | 'mensual' | 'por_dia'

export interface Profile {
  id: string
  nombre: string
  telefono?: string
  rol: Rol
  activo: boolean
  avatar_url?: string
  created_at: string
}

export interface Cliente {
  id: string
  nombre: string
  tipo: 'directo' | 'indirecto'
  telefono?: string
  correo?: string
  direccion?: string
  activo: boolean
}

export interface Cabezal {
  id: string
  placa: string
  marca?: string
  modelo?: string
  año?: number
  estado: EstadoCabezal
  notas?: string
}

export interface Chasis {
  id: string
  placa: string
  tamaño: TamañoChasis
  estado: EstadoChasis
  notas?: string
}

export interface Piloto {
  id: string
  nombre: string
  licencia?: string
  telefono?: string
  viatico_monto: number
  activo: boolean
}

export interface Viaje {
  id: string
  codigo?: string
  origen: string
  destino: string
  lat_origen?: number
  lng_origen?: number
  lat_destino?: number
  lng_destino?: number
  radio_destino_metros: number
  estado: EstadoViaje
  fecha_inicio?: string
  fecha_estimada?: string
  fecha_fin?: string
  duracion_real_min?: number
  piloto_id?: string
  cabezal_id?: string
  chasis_id?: string
  chasis_externo_placa?: string
  cliente_id?: string
  tipo_servicio: 'flete' | 'renta'
  tipo_renta_id?: string
  viatico_monto?: number
  notas?: string
  piloto?: Piloto
  cabezal?: Cabezal
  chasis?: Chasis
  cliente?: Cliente
  created_at: string
}

export interface Alerta {
  id: string
  viaje_id?: string
  tipo: TipoAlerta
  nivel: NivelAlerta
  mensaje: string
  estado: EstadoAlerta
  canal_telegram: boolean
  canal_email: boolean
  canal_push: boolean
  created_at: string
  viaje?: Viaje
}

export interface GpsLog {
  id: number
  viaje_id: string
  lat: number
  lng: number
  velocidad?: number
  precision_m?: number
  created_at: string
}

export interface StatsViajes {
  total: number
  finalizados: number
  en_transito: number
  programados: number
  cancelados: number
  dur_prom_min: number
  cumplimiento: number
}

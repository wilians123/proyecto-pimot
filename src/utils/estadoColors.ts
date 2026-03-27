// ============================================================
// Colores y etiquetas por estado — consistencia visual
// ============================================================
import type { EstadoViaje, NivelAlerta, EstadoCabezal } from '@/types'

export const ESTADO_VIAJE_CONFIG: Record<EstadoViaje, { label: string; color: string; dot: string }> = {
  programado:  { label: 'Programado',  color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400'  },
  en_transito: { label: 'En Tránsito', color: 'bg-blue-50 text-blue-700',      dot: 'bg-blue-500'   },
  en_destino:  { label: 'En Destino',  color: 'bg-amber-50 text-amber-700',    dot: 'bg-amber-500'  },
  finalizado:  { label: 'Finalizado',  color: 'bg-green-50 text-green-700',    dot: 'bg-green-500'  },
  cancelado:   { label: 'Cancelado',   color: 'bg-red-50 text-red-600',        dot: 'bg-red-400'    },
}

export const NIVEL_ALERTA_CONFIG: Record<NivelAlerta, { label: string; color: string; icon: string }> = {
  info:         { label: 'Info',        color: 'bg-blue-50 text-blue-700 border-blue-200',     icon: 'ℹ️' },
  advertencia:  { label: 'Advertencia', color: 'bg-amber-50 text-amber-700 border-amber-200',  icon: '⚠️' },
  critico:      { label: 'Crítico',     color: 'bg-red-50 text-red-700 border-red-200',        icon: '🚨' },
}

export const ESTADO_CABEZAL_CONFIG: Record<EstadoCabezal, { label: string; color: string }> = {
  activo:           { label: 'Disponible',      color: 'bg-green-50 text-green-700'   },
  en_viaje:         { label: 'En Viaje',         color: 'bg-blue-50 text-blue-700'     },
  en_mantenimiento: { label: 'Mantenimiento',    color: 'bg-amber-50 text-amber-700'   },
  inactivo:         { label: 'Inactivo',         color: 'bg-slate-100 text-slate-500'  },
}

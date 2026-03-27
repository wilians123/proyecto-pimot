// =============================================================
// Componente de estado de viaje con punto de color
// =============================================================

import { ESTADO_CONFIG } from '@/lib/constants'
import type { BadgeProps } from '@/types/ui'

export default function Badge({ estado }: BadgeProps) {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.programado

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
// =============================================================
// Componente de alerta con nivel de severidad visual
// =============================================================

import { ALERTA_CONFIG } from '@/lib/constants'
import type { AlertaBadgeProps } from '@/types/ui'

export default function AlertaBadge({ alerta }: AlertaBadgeProps) {
  const cfg = ALERTA_CONFIG[alerta.nivel] ?? ALERTA_CONFIG.info

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg border text-sm ${cfg.bg} ${cfg.border}`}
    >
      <span className={`text-base shrink-0 mt-0.5 ${cfg.text}`}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-medium leading-snug ${cfg.text}`}>{alerta.mensaje}</p>
        <p className="text-xs text-slate-400 mt-1">
          {alerta.viaje} · {alerta.tiempo}
        </p>
      </div>
    </div>
  )
}
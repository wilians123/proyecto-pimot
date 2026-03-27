// =============================================================
// Tarjeta de indicador clave de desempeño
// =============================================================

import type { KpiCardProps } from '@/types/ui'

export default function KpiCard({
  titulo,
  valor,
  subtexto,
  color = 'text-slate-800',
  tendencia,
}: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{titulo}</p>
      <div className="flex items-end justify-between">
        <span className={`text-3xl font-semibold tabular-nums ${color}`}>{valor}</span>
        {tendencia !== undefined && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              tendencia > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
            }`}
          >
            {tendencia > 0 ? '↑' : '↓'} {Math.abs(tendencia)}%
          </span>
        )}
      </div>
      {subtexto && <p className="text-xs text-slate-400">{subtexto}</p>}
    </div>
  )
}
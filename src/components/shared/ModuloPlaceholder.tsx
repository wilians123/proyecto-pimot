// =============================================================
// Placeholder genérico para módulos en construcción
// =============================================================

import type { ModuloPlaceholderProps } from '@/types/ui'

export default function ModuloPlaceholder({ titulo, descripcion }: ModuloPlaceholderProps) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-slate-400 text-xl">🔧</span>
        </div>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">{titulo}</h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">{descripcion}</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs px-3 py-1.5 rounded-full font-medium">
          <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
          En desarrollo — Fase planificada
        </div>
      </div>
    </div>
  )
}
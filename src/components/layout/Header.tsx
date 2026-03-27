// =============================================================
// Barra superior: título de módulo, alertas, estado de conexión
// =============================================================

'use client'

import { icons } from '@/lib/constants'
import type { HeaderProps } from '@/types/ui'

export default function Header({ titulo, alertasCount }: HeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      {/* Título y timestamp */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{titulo}</h2>
        <p className="text-xs text-slate-400">Actualizado hace 2 minutos</p>
      </div>

      {/* Acciones derecha */}
      <div className="flex items-center gap-3">
        {alertasCount > 0 && (
          <button className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
            {icons.bell}
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {alertasCount}
            </span>
          </button>
        )}

        <div className="h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          En línea
        </div>
      </div>
    </div>
  )
}
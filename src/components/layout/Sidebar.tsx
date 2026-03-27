// =============================================================
// Barra lateral de navegación con colapso y perfil de usuario
// =============================================================

'use client'

import { icons, NAV_ITEMS } from '@/lib/constants'
import type { SidebarProps } from '@/types/ui'

export default function Sidebar({ modulo, setModulo, collapsed, toggle }: SidebarProps) {
  return (
    <aside
      className={`bg-slate-900 text-white flex flex-col transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-64'
      } shrink-0`}
    >
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-sm leading-tight text-white">PIMOT</h1>
            <p className="text-slate-400 text-xs leading-tight">Monitoreo de Transporte</p>
          </div>
        )}
      </div>

      {/* ── Navegación ── */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setModulo(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-none text-left ${
              modulo === item.id
                ? 'bg-slate-800 text-white border-l-2 border-orange-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* ── Footer con perfil ── */}
      <div className="border-t border-slate-800 p-4">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-xs font-medium">
              JA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">José Administrador</p>
              <p className="text-xs text-slate-400">Admin</p>
            </div>
          </div>
        )}
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center py-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Alternar sidebar"
        >
          {icons.menu}
        </button>
      </div>
    </aside>
  )
}
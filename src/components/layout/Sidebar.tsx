// =============================================================
// MODIFICACIÓN: src/components/layout/Sidebar.tsx
// Correcciones:
//   • Scroll sobrante eliminado: overflow-y-auto solo en nav,
//     el aside usa overflow-hidden para cortar cualquier scroll
//     de borde que aparecía al colapsar.
//   • Botón toggle movido al HEADER (junto al logo), no al footer.
//   • Reemplaza texto "Contraer menú" por ícono hamburger/flecha.
//   • Footer del sidebar muestra solo perfil (sin botón toggle).
//   • Comportamiento y tooltips idénticos a la versión anterior.
// =============================================================

'use client'

import { icons, NAV_ITEMS } from '@/lib/constants'
import type { SidebarProps } from '@/types/ui'

export default function Sidebar({
  modulo,
  setModulo,
  collapsed,
  toggle,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {
  function handleNav(id: typeof modulo) {
    setModulo(id)
    setMobileOpen(false)
  }

  // ── Sidebar desktop ───────────────────────────────────────────
  const sidebarContent = (
    <aside
      className={`bg-slate-900 text-white flex flex-col h-full overflow-hidden
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-18' : 'w-64'}`}
    >
      {/* ── Header: logo + botón toggle ── */}
      <div
        className={`flex items-center border-b border-slate-800 shrink-0 h-16
          ${collapsed ? 'justify-center px-0' : 'justify-between px-4'}`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
            <span className="text-white font-black text-base leading-none">P</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-black text-sm leading-tight text-white tracking-tight">PIMOT</h1>
              <p className="text-slate-400 text-[11px] leading-snug">Monitoreo de Transporte</p>
            </div>
          )}
        </div>

        {/* Botón toggle — solo desktop, en el header */}
        {!collapsed && (
          <button
            onClick={toggle}
            className="shrink-0 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700
              rounded-lg transition-colors cursor-pointer"
            aria-label="Contraer menú"
          >
            {icons.chevronLeft}
          </button>
        )}
      </div>

      {/* Cuando está colapsado el toggle va debajo del logo, centrado */}
      {collapsed && (
        <button
          onClick={toggle}
          className="flex items-center justify-center py-3 text-slate-400
            hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0
            border-b border-slate-800"
          aria-label="Expandir menú"
        >
          {icons.menu}
        </button>
      )}

      {/* ── Navegación — el único elemento con scroll ── */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map((item) => {
          const active = modulo === item.id
          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => handleNav(item.id)}
                aria-label={item.label}
                className={`w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer
                  ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
                  ${active
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <span className={`shrink-0 transition-transform duration-150
                  ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="text-sm font-medium leading-none truncate">{item.label}</span>
                )}
                {collapsed && active && (
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-orange-300 rounded-full" />
                )}
              </button>

              {/* Tooltip en modo colapsado */}
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50
                  pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="bg-slate-800 text-white text-sm font-medium px-3 py-1.5
                    rounded-lg whitespace-nowrap shadow-xl border border-slate-700">
                    {item.label}
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5
                    border-4 border-transparent border-r-slate-800" />
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Footer: solo perfil ── */}
      <div className="border-t border-slate-800 shrink-0 overflow-hidden">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-3 py-3">
            <div className="w-8 h-8 bg-linear-to-br from-orange-400 to-orange-600 rounded-full
              flex items-center justify-center text-xs font-bold shrink-0 shadow">
              JA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">José Administrador</p>
              <p className="text-[11px] text-slate-400">Administrador</p>
            </div>
          </div>
        ) : (
          /* Avatar centrado cuando está colapsado */
          <div className="flex justify-center py-3">
            <div className="w-8 h-8 bg-linear-to-br from-orange-400 to-orange-600 rounded-full
              flex items-center justify-center text-xs font-bold shadow">
              JA
            </div>
          </div>
        )}
      </div>
    </aside>
  )

  return (
    <>
      {/* ── Desktop: sidebar fijo ── */}
      <div className="hidden md:flex h-screen shrink-0">
        {sidebarContent}
      </div>

      {/* ── Móvil: drawer con overlay ── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 h-full md:hidden">
            <aside className="bg-slate-900 text-white flex flex-col h-full w-64 shadow-2xl overflow-hidden">
              {/* Header del drawer */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800 shrink-0 h-16">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-black text-base">P</span>
                  </div>
                  <div>
                    <h1 className="font-black text-sm text-white">PIMOT</h1>
                    <p className="text-slate-400 text-[11px]">Monitoreo de Transporte</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  aria-label="Cerrar menú"
                >
                  {icons.close}
                </button>
              </div>

              {/* Nav del drawer */}
              <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
                {NAV_ITEMS.map((item) => {
                  const active = modulo === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl
                        transition-all duration-150 cursor-pointer text-left
                        ${active
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              {/* Footer del drawer */}
              <div className="border-t border-slate-800 px-3 py-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-linear-to-br from-orange-400 to-orange-600 rounded-full
                    flex items-center justify-center text-xs font-bold shadow">
                    JA
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">José Administrador</p>
                    <p className="text-[11px] text-slate-400">Administrador</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  )
}
// =============================================================
// MODIFICACIÓN: src/components/layout/Sidebar.tsx
// Rediseño completo:
//   • Iconos 20×20 con trazo visible
//   • Tooltips en modo colapsado
//   • Overlay en móvil (drawer)
//   • Textos más grandes para usuarios mayores
//   • cursor-pointer en todos los elementos clicables
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
  // Handler unificado: navegar y cerrar drawer móvil
  function handleNav(id: typeof modulo) {
    setModulo(id)
    setMobileOpen(false)
  }

  const sidebarContent = (
    <aside
      className={`bg-slate-900 text-white flex flex-col h-full transition-all duration-300 ease-in-out
        ${collapsed ? 'w-18' : 'w-72'}`}
    >
      {/* ── Logo ── */}
      <div className={`flex items-center border-b border-slate-800 shrink-0
        ${collapsed ? 'justify-center px-3 py-5' : 'gap-3 px-5 py-5'}`}
      >
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
          <span className="text-white font-black text-lg leading-none">P</span>
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-black text-base leading-tight text-white tracking-tight">PIMOT</h1>
            <p className="text-slate-400 text-xs leading-snug mt-0.5">Monitoreo de Transporte</p>
          </div>
        )}
      </div>

      {/* ── Navegación ── */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const active = modulo === item.id
          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer
                  ${collapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3'}
                  ${active
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-900/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                aria-label={item.label}
              >
                {/* Icono siempre visible */}
                <span className={`shrink-0 transition-transform duration-150
                  ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
                  {item.icon}
                </span>
                {/* Label solo en estado expandido */}
                {!collapsed && (
                  <span className="text-sm font-medium leading-snug">{item.label}</span>
                )}
                {/* Punto activo en modo colapsado */}
                {collapsed && active && (
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-orange-300 rounded-full" />
                )}
              </button>

              {/* Tooltip en modo colapsado */}
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50
                  pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <div className="bg-slate-800 text-white text-sm font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl border border-slate-700">
                    {item.label}
                  </div>
                  {/* Flecha del tooltip */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5
                    border-4 border-transparent border-r-slate-800" />
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Footer: perfil + botón colapsar ── */}
      <div className="border-t border-slate-800 px-2 py-3 shrink-0 space-y-2">
        {/* Perfil */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/60">
            <div className="w-9 h-9 bg-linear-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow">
              JA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">José Administrador</p>
              <p className="text-xs text-slate-400">Administrador</p>
            </div>
          </div>
        )}
        {/* Botón colapsar — solo en desktop */}
        <button
          onClick={toggle}
          className={`hidden md:flex w-full items-center rounded-xl py-2.5 text-slate-400
            hover:text-white hover:bg-slate-800 transition-colors cursor-pointer
            ${collapsed ? 'justify-center' : 'gap-2.5 px-4'}`}
          aria-label="Alternar sidebar"
        >
          <span className="shrink-0">
            {collapsed ? icons.chevronRight : icons.chevronLeft}
          </span>
          {!collapsed && <span className="text-xs font-medium">Contraer menú</span>}
        </button>
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
          {/* Overlay oscuro */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer deslizante */}
          <div className="fixed inset-y-0 left-0 z-50 h-full md:hidden flex">
            {/* Siempre expandido en móvil */}
            <aside className="bg-slate-900 text-white flex flex-col h-full w-72 shadow-2xl">
              {/* Header del drawer */}
              <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-black text-lg">P</span>
                  </div>
                  <div>
                    <h1 className="font-black text-base text-white">PIMOT</h1>
                    <p className="text-slate-400 text-xs">Monitoreo de Transporte</p>
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
              <nav className="flex-1 py-3 overflow-y-auto space-y-0.5 px-2">
                {NAV_ITEMS.map((item) => {
                  const active = modulo === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl
                        transition-all duration-150 cursor-pointer text-left
                        ${active
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="text-base font-medium">{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              {/* Footer del drawer */}
              <div className="border-t border-slate-800 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-linear-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-sm font-bold shadow">
                    JA
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">José Administrador</p>
                    <p className="text-xs text-slate-400">Administrador</p>
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
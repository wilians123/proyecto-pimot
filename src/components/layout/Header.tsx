'use client'

import { useEffect, useRef } from 'react'
import { icons, ALERTA_CONFIG } from '@/lib/constants'
import { useAlertas } from '@/hooks/useAlertas'
import { usePermisos } from '@/hooks/usePermisos'
import { alertaAResumen } from '@/utils/alertaView'
import type { HeaderProps } from '@/types/ui'

interface NotificacionesProps { onToggle: () => void; onNavigateToAlertas: () => void; open: boolean }

function HeaderNotificaciones({ onToggle, onNavigateToAlertas, open }: NotificacionesProps) {
  const { alertas, marcarComoVista } = useAlertas(true)
  const panelRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const alertasCount = alertas.length

  async function abrirAlerta(alertaId: string) {
    await marcarComoVista(alertaId)
    onToggle()
  }

  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node) && btnRef.current && !btnRef.current.contains(event.target as Node)) onToggle()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onToggle])

  return (
    <div className="relative">
      <button ref={btnRef} onClick={onToggle} className={`relative p-2.5 rounded-xl transition-all cursor-pointer ${open ? 'bg-orange-50 text-orange-600 ring-2 ring-orange-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`} aria-label="Notificaciones">
        {icons.bell}
        {alertasCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">{alertasCount > 9 ? '9+' : alertasCount}</span>}
      </button>
      {open && (
        <div ref={panelRef} className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50"><div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-800">Alertas activas</span>{alertasCount > 0 && <span className="text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">{alertasCount}</span>}</div><button onClick={onToggle} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">{icons.close}</button></div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {alertas.length === 0 ? <div className="py-10 text-center"><div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3"><span className="text-green-500 text-xl">{icons.check}</span></div><p className="text-sm font-medium text-slate-700">Sin alertas activas</p><p className="text-xs text-slate-400 mt-1">Todo funciona correctamente</p></div> : alertas.map((alerta) => { const resumen = alertaAResumen(alerta); const cfg = ALERTA_CONFIG[alerta.nivel]; return <button key={alerta.id} type="button" onClick={() => abrirAlerta(alerta.id)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer ${cfg.bg}`}><span className="text-lg leading-none mt-0.5 shrink-0">{cfg.icon}</span><span className="flex-1 min-w-0"><span className="flex items-center gap-2 mb-0.5"><span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${cfg.labelBg} ${cfg.labelText}`}>{alerta.nivel}</span><span className="text-xs text-slate-400">{resumen.tiempo}</span></span><span className={`block text-sm font-medium leading-snug ${cfg.text}`}>{resumen.mensaje}</span><span className="block text-xs text-slate-400 mt-0.5 font-mono">{resumen.viaje}</span></span></button> })}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50"><button type="button" onClick={() => { onNavigateToAlertas(); onToggle() }} className="w-full text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer py-1">Ver todas las alertas →</button></div>
        </div>
      )}
    </div>
  )
}

export default function Header({ titulo, onToggleMobile, onToggleNotifications, onNavigateToAlertas, notificationsOpen }: HeaderProps) {
  const { puedeVerModulo } = usePermisos()
  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-4 shrink-0 z-30 relative">
      <div className="flex items-center gap-3 min-w-0"><button onClick={onToggleMobile} className="md:hidden p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0" aria-label="Abrir menú">{icons.menu}</button><div className="min-w-0"><h2 className="text-lg md:text-xl font-bold text-slate-800 leading-tight truncate">{titulo}</h2></div></div>
      <div className="flex items-center gap-2 shrink-0"><div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-200"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /><span className="text-xs font-medium text-green-700">En línea</span></div><div className="w-px h-6 bg-slate-200 hidden md:block" />{puedeVerModulo('alertas') && <HeaderNotificaciones onToggle={onToggleNotifications} onNavigateToAlertas={onNavigateToAlertas} open={notificationsOpen} />}</div>
    </header>
  )
}

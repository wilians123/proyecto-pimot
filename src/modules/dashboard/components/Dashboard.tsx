// =============================================================
// Panel principal: KPIs, mapa placeholder, tabla de viajes activos e indicadores rápidos de cumplimiento, flota y piloto destacado
// =============================================================

import KpiCard from '@/components/shared/KpiCard'
import AlertaBadge from '@/components/shared/AlertaBadge'
import Badge from '@/components/shared/Badge'
import { VIAJES_MUESTRA, ALERTAS_MUESTRA, icons } from '@/lib/constants'

// Icono de camión para KPI
const IconCamion = () => (
  <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
    <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  </div>
)
const IconClock = () => (
  <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
    <svg viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  </div>
)
const IconCheck = () => (
  <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
    <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  </div>
)
const IconAlert = () => (
  <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
    <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  </div>
)

export default function Dashboard() {
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto">

      {/* ── Saludo contextual ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-slate-800">Buenos días, José</h3>
          <p className="text-slate-500 text-sm mt-0.5">
            Hoy hay <span className="font-semibold text-blue-600">5 operaciones activas</span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>Sistema operando normalmente</span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {/* Viajes activos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
          <IconCamion />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activos</p>
            <p className="text-3xl font-black text-blue-600 tabular-nums leading-none mt-1">5</p>
            <p className="text-xs text-slate-400 mt-1 hidden sm:block">3 en ruta · 2 en destino</p>
          </div>
        </div>

        {/* Programados */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
          <IconClock />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Programados</p>
            <p className="text-3xl font-black text-slate-700 tabular-nums leading-none mt-1">8</p>
            <p className="text-xs text-slate-400 mt-1 hidden sm:block">Próximo: 15:00 hrs</p>
          </div>
        </div>

        {/* Finalizados hoy */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
          <IconCheck />
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Finalizados</p>
            <p className="text-3xl font-black text-green-600 tabular-nums leading-none mt-1">12</p>
            <p className="text-xs text-slate-400 mt-1 hidden sm:block">Promedio: 4.8h/viaje</p>
          </div>
        </div>

        {/* Alertas activas */}
        <div className="bg-white rounded-2xl border border-red-200 p-4 md:p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
          <IconAlert />
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Alertas</p>
            <p className="text-3xl font-black text-red-600 tabular-nums leading-none mt-1">2</p>
            <p className="text-xs text-red-400 mt-1 hidden sm:block">1 crítica · 1 aviso</p>
          </div>
        </div>
      </div>

      {/* ── Mapa + Alertas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">

        {/* Mapa GPS */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                {icons.truck}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Ubicación de Flota en Tiempo Real</h3>
                <p className="text-xs text-slate-400">2 vehículos con GPS activo</p>
              </div>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              GPS activo
            </span>
          </div>

          {/* Área del mapa */}
          <div className="relative bg-linear-to-br from-slate-100 to-slate-200 h-64 md:h-80">
            {/* Cuadrícula decorativa */}
            <div className="absolute inset-0 opacity-20">
              <svg viewBox="0 0 400 300" className="w-full h-full" preserveAspectRatio="none">
                {[50, 100, 150, 200, 250].map(y => (
                  <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="4 4"/>
                ))}
                {[80, 160, 240, 320].map(x => (
                  <line key={x} x1={x} y1="0" x2={x} y2="300" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="4 4"/>
                ))}
                {/* Ruta simulada */}
                <path d="M 50 200 Q 160 120 280 90" stroke="#3B82F6" strokeWidth="3" fill="none" strokeDasharray="8 4" opacity="0.6"/>
                <path d="M 80 220 Q 200 180 320 130" stroke="#F59E0B" strokeWidth="3" fill="none" strokeDasharray="8 4" opacity="0.6"/>
              </svg>
            </div>

            {/* Marcadores */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full">
                {/* Vehículo 1 — en tránsito */}
                <div className="absolute" style={{ left: '45%', top: '38%' }}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg ring-4 ring-blue-200 cursor-pointer hover:scale-110 transition-transform">
                      <span className="text-white text-base">🚛</span>
                    </div>
                    <div className="bg-white px-2.5 py-1 rounded-lg text-xs shadow-md text-slate-700 font-semibold whitespace-nowrap border border-slate-200">
                      P-123ABC
                      <span className="ml-1.5 text-blue-600">→ GUA</span>
                    </div>
                  </div>
                </div>

                {/* Vehículo 2 — en destino */}
                <div className="absolute" style={{ left: '62%', top: '55%' }}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-lg ring-4 ring-amber-200 cursor-pointer hover:scale-110 transition-transform">
                      <span className="text-white text-base">🚛</span>
                    </div>
                    <div className="bg-white px-2.5 py-1 rounded-lg text-xs shadow-md text-slate-700 font-semibold whitespace-nowrap border border-slate-200">
                      P-456DEF
                      <span className="ml-1.5 text-amber-600">Destino</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay inferior */}
            <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-slate-900/30 to-transparent px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-white/80 font-medium">Mapa interactivo — Leaflet.js + Evtracker</p>
              <button className="text-xs text-white/90 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium backdrop-blur-sm">
                Ver pantalla completa
              </button>
            </div>
          </div>

          {/* Leyenda */}
          <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-5 text-xs text-slate-500 bg-slate-50/50">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-blue-600 rounded-full" />
              En tránsito
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-500 rounded-full" />
              En destino
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-green-500 rounded-full" />
              Disponible
            </div>
          </div>
        </div>

        {/* Panel de alertas */}
        <div className="bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                {icons.alertTriangle}
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Alertas Recientes</h3>
            </div>
            <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
              2 activas
            </span>
          </div>
          <div className="flex-1 p-4 space-y-2.5 overflow-y-auto">
            {ALERTAS_MUESTRA.map((a) => (
              <AlertaBadge key={a.id} alerta={a} />
            ))}
          </div>
          <div className="px-4 py-3 border-t border-slate-100">
            <button className="w-full text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer py-1 hover:bg-orange-50 rounded-lg">
              Ver todas las alertas →
            </button>
          </div>
        </div>
      </div>

      {/* ── Viajes activos (tabla responsive) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Viajes en Curso</h3>
          <span className="text-xs text-slate-500 bg-blue-50 font-medium px-2.5 py-1 rounded-full border border-blue-200">
            5 operaciones activas
          </span>
        </div>

        {/* Desktop: tabla */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Código', 'Piloto', 'Origen → Destino', 'Estado', 'Hora Est.'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VIAJES_MUESTRA.filter((v) => v.estado !== 'finalizado').map((v) => (
                <tr key={v.id} className="border-b border-slate-50 hover:bg-orange-50/30 transition-colors cursor-pointer">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500 font-medium">{v.id}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                        {v.piloto.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-800 text-sm">{v.piloto}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <span className="text-sm">{v.origen}</span>
                    <span className="text-slate-300 mx-2 font-bold">→</span>
                    <span className="text-sm font-medium">{v.destino}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge estado={v.estado} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 tabular-nums font-medium">{v.estimado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Móvil: tarjetas apiladas */}
        <div className="md:hidden divide-y divide-slate-100">
          {VIAJES_MUESTRA.filter((v) => v.estado !== 'finalizado').map((v) => (
            <div key={v.id} className="px-4 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-bold text-slate-800">{v.piloto}</p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{v.id}</p>
                </div>
                <Badge estado={v.estado} />
              </div>
              <p className="text-sm text-slate-600">
                {v.origen} <span className="text-slate-400 mx-1 font-bold">→</span> {v.destino}
              </p>
              <p className="text-xs text-slate-400 mt-1">Cabezal {v.cabezal} · Est. {v.estimado}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Indicadores rápidos ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Cumplimiento */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-700">Cumplimiento de Tiempos</h4>
            <span className="text-lg font-black text-green-600">87%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-linear-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-700"
              style={{ width: '87%' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-xs text-slate-400">Último mes</p>
            <p className="text-xs text-slate-500 font-medium">Meta: <span className="text-green-600">90%</span></p>
          </div>
        </div>

        {/* Flota */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Estado de Flota</h4>
          <div className="grid grid-cols-3 gap-2">
            {[
              { n: 4, label: 'Disponibles', color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
              { n: 2, label: 'En viaje',    color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200'   },
              { n: 1, label: 'En taller',   color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
            ].map(({ n, label, color, bg }) => (
              <div key={label} className={`text-center p-2 rounded-xl border ${bg}`}>
                <p className={`text-2xl font-black ${color}`}>{n}</p>
                <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Piloto destacado */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Piloto Destacado</h4>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-linear-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-base font-black text-white shadow-md shrink-0">
              CR
            </div>
            <div>
              <p className="font-bold text-slate-800">Carlos Ramírez</p>
              <p className="text-xs text-slate-500 mt-0.5">14 viajes este mes</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 bg-slate-100 rounded-full h-1.5 w-20">
                  <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '94%' }} />
                </div>
                <span className="text-xs font-bold text-orange-600">94%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
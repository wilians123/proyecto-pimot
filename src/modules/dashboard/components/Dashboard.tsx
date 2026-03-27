// =============================================================
// Panel principal: KPIs, mapa placeholder, tabla de viajes activos e indicadores rápidos de cumplimiento, flota y piloto destacado
// =============================================================

import KpiCard from '@/components/shared/KpiCard'
import AlertaBadge from '@/components/shared/AlertaBadge'
import Badge from '@/components/shared/Badge'
import { VIAJES_MUESTRA, ALERTAS_MUESTRA } from '@/lib/constants'

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          titulo="Viajes Activos"
          valor="5"
          subtexto="3 en tránsito · 2 en destino"
          color="text-blue-700"
          tendencia={12}
        />
        <KpiCard
          titulo="Programados Hoy"
          valor="8"
          subtexto="Próximo a las 15:00"
        />
        <KpiCard
          titulo="Finalizados Hoy"
          valor="12"
          subtexto="Promedio 4.8h por viaje"
          color="text-green-700"
          tendencia={5}
        />
        <KpiCard
          titulo="Alertas Activas"
          valor="2"
          subtexto="1 crítica · 1 advertencia"
          color="text-amber-600"
          tendencia={-8}
        />
      </div>

      {/* ── Mapa + Alertas recientes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Mapa GPS placeholder */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 text-sm">Ubicación de Flota</h3>
            <span className="text-xs text-slate-400">GPS actualizado · 2 vehículos activos</span>
          </div>
          <div className="bg-slate-50 h-80 flex items-center justify-center relative">
            {/* Cuadrícula decorativa de fondo */}
            <div className="absolute inset-0 opacity-10">
              <svg viewBox="0 0 400 300" className="w-full h-full">
                <path d="M0 150 Q100 100 200 150 T400 150" stroke="currentColor" fill="none" strokeWidth="1" />
                <path d="M0 100 Q100 50 200 100 T400 100"  stroke="currentColor" fill="none" strokeWidth="0.5" />
                <path d="M0 200 Q100 150 200 200 T400 200" stroke="currentColor" fill="none" strokeWidth="0.5" />
                <line x1="100" y1="0" x2="100" y2="300" stroke="currentColor" strokeWidth="0.5" />
                <line x1="200" y1="0" x2="200" y2="300" stroke="currentColor" strokeWidth="0.5" />
                <line x1="300" y1="0" x2="300" y2="300" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>

            {/* Marcadores simulados */}
            <div className="relative z-10 text-center space-y-3">
              <div className="flex gap-8 justify-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs">🚛</span>
                  </div>
                  <div className="bg-white px-2 py-0.5 rounded text-xs shadow text-slate-700 font-medium">
                    P-123ABC
                  </div>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xs">🚛</span>
                  </div>
                  <div className="bg-white px-2 py-0.5 rounded text-xs shadow text-slate-700 font-medium">
                    P-456DEF
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">Mapa interactivo con Leaflet.js</p>
              <p className="text-xs text-slate-300">Integración GPS vía Evtracker API</p>
            </div>
          </div>
        </div>

        {/* Alertas recientes */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 text-sm">Alertas Recientes</h3>
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
              2 activas
            </span>
          </div>
          <div className="p-4 space-y-3">
            {ALERTAS_MUESTRA.map((a) => (
              <AlertaBadge key={a.id} alerta={a} />
            ))}
            <button className="w-full text-xs text-slate-400 hover:text-slate-600 py-2 transition-colors">
              Ver todas las alertas →
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabla de viajes en curso ── */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-700 text-sm">Viajes en Curso</h3>
          <span className="text-xs text-slate-400">5 operaciones activas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Código', 'Piloto', 'Ruta', 'Estado', 'Estimado'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {VIAJES_MUESTRA.filter((v) => v.estado !== 'finalizado').map((v) => (
                <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{v.id}</td>
                  <td className="px-5 py-3 font-medium text-slate-700">{v.piloto}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">
                    <span>{v.origen}</span>
                    <span className="text-slate-300 mx-1">→</span>
                    <span>{v.destino}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge estado={v.estado} />
                  </td>
                  <td className="px-5 py-3 text-slate-500 text-xs tabular-nums">{v.estimado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Indicadores rápidos ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Cumplimiento de tiempos */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Cumplimiento de Tiempos
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '87%' }} />
            </div>
            <span className="text-sm font-semibold text-slate-700 tabular-nums">87%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Último mes · Meta: 90%</p>
        </div>

        {/* Flota disponible */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Flota Disponible
          </h4>
          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-2xl font-semibold text-slate-800">4</p>
              <p className="text-xs text-green-600">Activos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-slate-800">2</p>
              <p className="text-xs text-blue-600">En viaje</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-slate-800">1</p>
              <p className="text-xs text-amber-600">Mant.</p>
            </div>
          </div>
        </div>

        {/* Piloto destacado */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Piloto Destacado
          </h4>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center text-sm font-semibold text-orange-700">
              CR
            </div>
            <div>
              <p className="font-semibold text-slate-700 text-sm">Carlos Ramírez</p>
              <p className="text-xs text-slate-400">14 viajes · 94% cumplimiento</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
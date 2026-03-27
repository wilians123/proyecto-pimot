// =============================================================
// Módulo de seguimiento de viajes: activos, historial, nuevo
// =============================================================

'use client'

import { useState } from 'react'
import Badge from '@/components/shared/Badge'
import { VIAJES_MUESTRA } from '@/lib/constants'
import type { ViajeResumen } from '@/types/ui'

// Tabs disponibles en el módulo
type TabId = 'activos' | 'historial' | 'nuevo'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'activos',   label: 'Viajes Activos' },
  { id: 'historial', label: 'Historial'       },
  { id: 'nuevo',     label: 'Nuevo Viaje'     },
]

// Opciones de tipo de chasis
type TipoChasis = 'propio' | 'ajeno'

export default function Viajes() {
  const [tab, setTab]                           = useState<TabId>('activos')
  const [tipoChasis, setTipoChasis]             = useState<TipoChasis>('propio')
  const [selectedViaje, setSelectedViaje]       = useState<ViajeResumen | null>(null)

  return (
    <div className="p-6 space-y-5">

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Activos ── */}
      {tab === 'activos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Lista de tarjetas */}
          <div className="lg:col-span-1 space-y-2">
            {VIAJES_MUESTRA.filter((v) => v.estado !== 'finalizado').map((v) => (
              <div
                key={v.id}
                onClick={() => setSelectedViaje(v)}
                className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
                  selectedViaje?.id === v.id
                    ? 'border-blue-400 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-mono text-xs text-slate-400">{v.id}</span>
                  <Badge estado={v.estado} />
                </div>
                <p className="font-medium text-sm text-slate-800">{v.piloto}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {v.origen} → {v.destino}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cabezal: {v.cabezal} · Est. {v.estimado}
                </p>
              </div>
            ))}
          </div>

          {/* Panel de detalle */}
          <div className="lg:col-span-2">
            {selectedViaje ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{selectedViaje.piloto}</h3>
                    <p className="text-xs text-slate-400 font-mono">{selectedViaje.id}</p>
                  </div>
                  <Badge estado={selectedViaje.estado} />
                </div>
                <div className="p-5 space-y-4">
                  {/* Datos del viaje */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Origen</p>
                      <p className="font-medium text-slate-700">{selectedViaje.origen}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Destino</p>
                      <p className="font-medium text-slate-700">{selectedViaje.destino}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Inicio</p>
                      <p className="font-medium text-slate-700">{selectedViaje.inicio}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Estimado</p>
                      <p className="font-medium text-slate-700">{selectedViaje.estimado}</p>
                    </div>
                  </div>

                  {/* Mapa placeholder */}
                  <div className="bg-slate-50 rounded-lg h-48 flex items-center justify-center border border-slate-100">
                    <div className="text-center">
                      <p className="text-slate-400 text-sm">Mapa GPS en tiempo real</p>
                      <p className="text-xs text-slate-300 mt-1">Leaflet.js + Evtracker</p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      Actualizar Estado
                    </button>
                    <button className="py-2 px-3 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors">
                      Ver Alertas
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 h-full min-h-50 flex items-center justify-center text-slate-400 text-sm">
                Selecciona un viaje para ver el detalle
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Nuevo viaje ── */}
      {tab === 'nuevo' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-semibold text-slate-800">Registrar Nuevo Viaje</h3>

            {/* Piloto + Cabezal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Piloto</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar piloto…</option>
                  <option>Carlos Ramírez</option>
                  <option>Miguel Torres</option>
                  <option>Juan García</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Cabezal</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar cabezal…</option>
                  <option>P-123ABC</option>
                  <option>P-456DEF</option>
                </select>
              </div>
            </div>

            {/* Origen + Destino */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Origen</label>
                <input
                  type="text"
                  placeholder="Puerto Barrios"
                  defaultValue="Puerto Barrios"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Destino</label>
                <input
                  type="text"
                  placeholder="Ciudad de Guatemala"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tipo de chasis */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Tipo de Chasis
              </label>
              <div className="flex gap-2">
                {([{ v: 'propio', l: 'Chasis Propio' }, { v: 'ajeno', l: 'Chasis Externo' }] as Array<{ v: TipoChasis; l: string }>).map(
                  (opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setTipoChasis(opt.v)}
                      className={`flex-1 py-2 px-3 text-sm rounded-lg border font-medium transition-colors ${
                        tipoChasis === opt.v
                          ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.l}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Tamaño + Placa de chasis */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Tamaño de Chasis
                </label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>20 pies</option>
                  <option>40 pies</option>
                  <option>45 pies</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  {tipoChasis === 'propio' ? 'Placa del Chasis' : 'Placa (Externo)'}
                </label>
                {tipoChasis === 'propio' ? (
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>CH-001</option>
                    <option>CH-002</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ej. CH-999XYZ"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>

            {/* Cliente + Fecha estimada */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Cliente</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleccionar cliente…</option>
                  <option>Empresa A</option>
                  <option>Empresa B</option>
                  <option value="nuevo">+ Agregar nuevo cliente</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Fecha/Hora Estimada
                </label>
                <input
                  type="datetime-local"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-2 flex gap-3">
              <button className="flex-1 py-2.5 bg-slate-800 text-white text-sm rounded-lg font-medium hover:bg-slate-700 transition-colors">
                Registrar Viaje
              </button>
              <button
                onClick={() => setTab('activos')}
                className="py-2.5 px-4 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Historial ── */}
      {tab === 'historial' && (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 text-sm">Historial de Viajes</h3>
            <div className="flex gap-2">
              <select className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white">
                <option>Último mes</option>
                <option>Últimos 3 meses</option>
                <option>Este año</option>
              </select>
              <button className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                Exportar PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Código', 'Piloto', 'Ruta', 'Estado', 'Inicio', 'Fin', 'Duración'].map((h) => (
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
                {VIAJES_MUESTRA.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{v.id}</td>
                    <td className="px-5 py-3 font-medium text-slate-700">{v.piloto}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {v.origen} → {v.destino}
                    </td>
                    <td className="px-5 py-3">
                      <Badge estado={v.estado} />
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums text-slate-500">{v.inicio}</td>
                    <td className="px-5 py-3 text-xs tabular-nums text-slate-500">
                      {v.estado === 'finalizado' ? '10:15' : '—'}
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums text-slate-500">
                      {v.estado === 'finalizado' ? '5h 15m' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
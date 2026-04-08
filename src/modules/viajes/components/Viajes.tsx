// =============================================================
// Módulo de seguimiento de viajes: activos, historial, nuevo
// =============================================================

'use client'

import { useState } from 'react'
import Badge from '@/components/shared/Badge'
import { VIAJES_MUESTRA, icons } from '@/lib/constants'
import type { ViajeResumen } from '@/types/ui'

type TabId = 'activos' | 'historial' | 'nuevo'
type TipoChasis = 'propio' | 'ajeno'

const TABS: Array<{ id: TabId; label: string; count?: number }> = [
  { id: 'activos',   label: 'Viajes Activos', count: 3 },
  { id: 'historial', label: 'Historial'                },
  { id: 'nuevo',     label: 'Nuevo Viaje'              },
]

export default function Viajes() {
  const [tab, setTab]               = useState<TabId>('activos')
  const [tipoChasis, setTipoChasis] = useState<TipoChasis>('propio')
  const [selected, setSelected]     = useState<ViajeResumen | null>(null)

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto">

      {/* ── Tabs centrados ── */}
      <div className="flex justify-center">
        <div className="inline-flex bg-white border border-slate-200 p-1 rounded-2xl shadow-sm gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-sm font-semibold
                transition-all duration-200 cursor-pointer
                ${tab === t.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none
                  ${tab === t.id ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                  {t.count}
                </span>
              )}
              {/* Indicador activo */}
              {t.id === 'nuevo' && tab === t.id && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ TAB: ACTIVOS ══════════════ */}
      {tab === 'activos' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">

          {/* Lista lateral */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              {VIAJES_MUESTRA.filter(v => v.estado !== 'finalizado').length} viajes en operación
            </p>
            {VIAJES_MUESTRA.filter((v) => v.estado !== 'finalizado').map((v) => (
              <div
                key={v.id}
                onClick={() => setSelected(v)}
                className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all duration-150
                  hover:shadow-md
                  ${selected?.id === v.id
                    ? 'border-orange-400 shadow-md ring-2 ring-orange-100'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-start justify-between mb-2.5 gap-2">
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    {v.id}
                  </span>
                  <Badge estado={v.estado} />
                </div>

                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 bg-linear-to-br from-slate-300 to-slate-400 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0">
                    {v.piloto.charAt(0)}
                  </div>
                  <p className="font-bold text-slate-800">{v.piloto}</p>
                </div>

                <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600">
                  <span className="font-medium">{v.origen}</span>
                  <span className="text-slate-400 mx-1.5 font-bold">→</span>
                  <span className="font-semibold text-slate-700">{v.destino}</span>
                </div>

                <div className="flex items-center justify-between mt-2.5 text-xs text-slate-400">
                  <span>Cabezal: <span className="font-mono font-semibold text-slate-600">{v.cabezal}</span></span>
                  <span>Est: <span className="font-semibold text-slate-600">{v.estimado}</span></span>
                </div>
              </div>
            ))}
          </div>

          {/* Panel de detalle */}
          <div className="lg:col-span-3">
            {selected ? (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-4">
                {/* Header del detalle */}
                <div className="px-5 py-4 bg-linear-to-r from-slate-800 to-slate-900 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-mono mb-0.5">{selected.id}</p>
                    <h3 className="font-bold text-white text-lg">{selected.piloto}</h3>
                  </div>
                  <Badge estado={selected.estado} />
                </div>

                <div className="p-5 space-y-4">
                  {/* Grid de datos */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Origen',   value: selected.origen    },
                      { label: 'Destino',  value: selected.destino   },
                      { label: 'Inicio',   value: selected.inicio    },
                      { label: 'Estimado', value: selected.estimado  },
                      { label: 'Cabezal',  value: selected.cabezal   },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-xl px-3.5 py-3">
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
                        <p className="font-bold text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mapa placeholder */}
                  <div className="bg-linear-to-br from-slate-100 to-slate-200 rounded-xl h-44 flex flex-col items-center justify-center border border-slate-200 gap-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {icons.truck}
                    </div>
                    <p className="text-sm font-medium text-slate-500">Mapa GPS en tiempo real</p>
                    <p className="text-xs text-slate-400">Leaflet.js + Evtracker</p>
                  </div>

                  {/* Acciones */}
                  <div className="grid grid-cols-2 gap-3">
                    <button className="py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-xl font-bold transition-colors cursor-pointer shadow-md shadow-orange-200">
                      Actualizar Estado
                    </button>
                    <button className="py-3 px-4 border-2 border-slate-200 text-slate-700 text-sm rounded-xl font-semibold hover:bg-slate-50 transition-colors cursor-pointer">
                      Ver Alertas
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 h-64 lg:h-full min-h-75 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                  {icons.truck}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-500">Selecciona un viaje</p>
                  <p className="text-sm text-slate-400 mt-1">para ver el detalle y el mapa GPS</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ TAB: NUEVO VIAJE ══════════════ */}
      {tab === 'nuevo' && (
        <div className="w-full">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Cabecera del formulario */}
            <div className="bg-linear-to-r from-slate-800 to-slate-900 px-6 md:px-8 py-5">
              <h3 className="font-bold text-white text-xl">Registrar Nuevo Viaje</h3>
              <p className="text-slate-400 text-sm mt-1">Complete todos los campos para crear la operación</p>
            </div>

            <div className="p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                {/* Sección: Personal */}
                <div className="xl:col-span-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-md flex items-center justify-center text-[10px] font-black">1</span>
                    Personal
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <FieldWrap label="Piloto asignado">
                      <select className="field-select">
                        <option value="">Seleccionar piloto…</option>
                        <option>Carlos Ramírez</option>
                        <option>Miguel Torres</option>
                        <option>Juan García</option>
                        <option>Roberto Méndez</option>
                      </select>
                    </FieldWrap>
                    <FieldWrap label="Cliente">
                      <select className="field-select">
                        <option value="">Seleccionar cliente…</option>
                        <option>Empresa A</option>
                        <option>Empresa B</option>
                        <option value="nuevo">+ Agregar nuevo cliente</option>
                      </select>
                    </FieldWrap>
                    <FieldWrap label="Tipo de servicio">
                      <select className="field-select">
                        <option value="flete">Flete</option>
                        <option value="renta">Renta de chasis</option>
                      </select>
                    </FieldWrap>
                  </div>
                </div>

                {/* Divider */}
                <div className="xl:col-span-3 border-t border-slate-100" />

                {/* Sección: Equipo */}
                <div className="xl:col-span-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center text-[10px] font-black">2</span>
                    Equipo
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <FieldWrap label="Cabezal">
                      <select className="field-select">
                        <option value="">Seleccionar cabezal…</option>
                        <option>P-123ABC</option>
                        <option>P-456DEF</option>
                        <option>P-789GHI</option>
                      </select>
                    </FieldWrap>

                    <FieldWrap label="Tipo de chasis">
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { v: 'propio', l: 'Propio' },
                          { v: 'ajeno',  l: 'Externo' },
                        ] as Array<{ v: TipoChasis; l: string }>).map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setTipoChasis(opt.v)}
                            className={`py-2.5 text-sm rounded-xl border-2 font-semibold transition-all cursor-pointer
                              ${tipoChasis === opt.v
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </FieldWrap>

                    <FieldWrap label="Tamaño de chasis">
                      <select className="field-select">
                        <option value="20">20 pies</option>
                        <option value="40">40 pies</option>
                        <option value="45">45 pies</option>
                      </select>
                    </FieldWrap>

                    <FieldWrap label={tipoChasis === 'propio' ? 'Placa del chasis' : 'Placa (chasis externo)'}>
                      {tipoChasis === 'propio' ? (
                        <select className="field-select">
                          <option>CH-001</option>
                          <option>CH-002</option>
                          <option>CH-003</option>
                        </select>
                      ) : (
                        <input type="text" placeholder="Ej. CH-999XYZ" className="field-input" />
                      )}
                    </FieldWrap>
                  </div>
                </div>

                {/* Divider */}
                <div className="xl:col-span-3 border-t border-slate-100" />

                {/* Sección: Ruta */}
                <div className="xl:col-span-3">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 bg-green-100 text-green-600 rounded-md flex items-center justify-center text-[10px] font-black">3</span>
                    Ruta y Horario
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <FieldWrap label="Punto de origen">
                      <input
                        type="text"
                        placeholder="Puerto Barrios"
                        defaultValue="Puerto Barrios"
                        className="field-input"
                      />
                    </FieldWrap>
                    <FieldWrap label="Punto de destino">
                      <input type="text" placeholder="Ciudad de Guatemala" className="field-input" />
                    </FieldWrap>
                    <FieldWrap label="Fecha y hora de inicio">
                      <input type="datetime-local" className="field-input" />
                    </FieldWrap>
                    <FieldWrap label="Fecha/hora estimada de llegada">
                      <input type="datetime-local" className="field-input" />
                    </FieldWrap>
                  </div>
                </div>

                {/* Divider */}
                <div className="xl:col-span-3 border-t border-slate-100" />

                {/* Notas */}
                <div className="xl:col-span-3">
                  <FieldWrap label="Notas adicionales (opcional)">
                    <textarea
                      rows={3}
                      placeholder="Instrucciones especiales, observaciones del viaje…"
                      className="field-input resize-none"
                    />
                  </FieldWrap>
                </div>
              </div>

              {/* Acciones del formulario */}
              <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 text-white text-base rounded-xl font-bold
                    transition-colors cursor-pointer shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
                >
                  <span>{icons.plus}</span>
                  Registrar Viaje
                </button>
                <button
                  type="button"
                  onClick={() => setTab('activos')}
                  className="sm:w-40 py-3.5 border-2 border-slate-200 text-slate-700 text-base rounded-xl font-semibold
                    hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: HISTORIAL ══════════════ */}
      {tab === 'historial' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-slate-800">Historial de Viajes</h3>
            <div className="flex gap-2">
              <select className="text-sm border border-slate-200 rounded-xl px-3 py-2 text-slate-600 bg-white cursor-pointer">
                <option>Último mes</option>
                <option>Últimos 3 meses</option>
                <option>Este año</option>
              </select>
              <button className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer font-semibold">
                Exportar PDF
              </button>
            </div>
          </div>

          {/* Desktop: tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Código', 'Piloto', 'Ruta', 'Estado', 'Inicio', 'Fin', 'Duración'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VIAJES_MUESTRA.map((v) => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-orange-50/20 transition-colors cursor-pointer">
                    <td className="px-5 py-4 font-mono text-xs text-slate-400 font-medium">{v.id}</td>
                    <td className="px-5 py-4 font-bold text-slate-800">{v.piloto}</td>
                    <td className="px-5 py-4 text-slate-600">{v.origen} → {v.destino}</td>
                    <td className="px-5 py-4"><Badge estado={v.estado} /></td>
                    <td className="px-5 py-4 text-slate-500 tabular-nums">{v.inicio}</td>
                    <td className="px-5 py-4 text-slate-500 tabular-nums">{v.estado === 'finalizado' ? '10:15' : '—'}</td>
                    <td className="px-5 py-4 text-slate-500 tabular-nums font-medium">{v.estado === 'finalizado' ? '5h 15m' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil */}
          <div className="md:hidden divide-y divide-slate-100">
            {VIAJES_MUESTRA.map((v) => (
              <div key={v.id} className="px-4 py-3.5 hover:bg-slate-50 cursor-pointer">
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <div>
                    <p className="font-bold text-slate-800">{v.piloto}</p>
                    <p className="font-mono text-xs text-slate-400">{v.id}</p>
                  </div>
                  <Badge estado={v.estado} />
                </div>
                <p className="text-sm text-slate-600">{v.origen} → {v.destino}</p>
                <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
                  <span>Inicio: {v.inicio}</span>
                  {v.estado === 'finalizado' && <span>Duración: 5h 15m</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente auxiliar para campos de formulario ─────────────
function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  )
}
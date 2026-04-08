// Módulo principal de gestión de flota (cabezales y chasis).
// Permite registrar, editar, eliminar y cambiar el estado de
// cada equipo directamente desde la tabla con un dropdown

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ESTADO_CABEZAL_CONFIG, ESTADO_CHASIS_CONFIG, icons } from '@/lib/constants'
import type { Database, EstadoCabezalDB, EstadoChasisDB, TamañoChasisDB } from '@/types/database'
import type { TipoEquipo } from '@/types/ui'

// ── Tipos derivados directamente de Database (fuente única de verdad) ──
type CabezalRow    = Database['public']['Tables']['cabezales']['Row']
type ChasisRow     = Database['public']['Tables']['chasis']['Row']
type CabezalInsert = Database['public']['Tables']['cabezales']['Insert']
type ChasisInsert  = Database['public']['Tables']['chasis']['Insert']
type CabezalUpdate = Database['public']['Tables']['cabezales']['Update']
type ChasisUpdate  = Database['public']['Tables']['chasis']['Update']

type TabFlota = 'cabezales' | 'chasis' | 'registrar'

// ── Estado de edición inline de estado ───────────────────────
interface EditingState {
  id: string
  campo: 'estado'
  valor: string
}

interface EquipoEditandoState {
  id: string
  tipo: TipoEquipo
}

// ── Opciones de estado con colores ───────────────────────────
const OPCIONES_ESTADO_CABEZAL: Array<{
  value: EstadoCabezalDB
  label: string
  bg: string
  text: string
  dot: string
  optionBg: string
  optionText: string
}> = [
  {
    value: 'activo',
    label: 'Disponible',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    optionBg: 'bg-emerald-50 hover:bg-emerald-100',
    optionText: 'text-emerald-700',
  },
  {
    value: 'en_mantenimiento',
    label: 'En mantenimiento',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    optionBg: 'bg-orange-50 hover:bg-orange-100',
    optionText: 'text-orange-700',
  },
  {
    value: 'inactivo',
    label: 'Inactivo',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    dot: 'bg-slate-400',
    optionBg: 'bg-slate-100 hover:bg-slate-200',
    optionText: 'text-slate-600',
  },
]

const OPCIONES_ESTADO_CHASIS: Array<{
  value: EstadoChasisDB
  label: string
  bg: string
  text: string
  dot: string
  optionBg: string
  optionText: string
}> = [
  {
    value: 'disponible',
    label: 'Disponible',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    optionBg: 'bg-emerald-50 hover:bg-emerald-100',
    optionText: 'text-emerald-700',
  },
  {
    value: 'en_taller',
    label: 'En taller',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    optionBg: 'bg-orange-50 hover:bg-orange-100',
    optionText: 'text-orange-700',
  },
]

// ── Íconos SVG ────────────────────────────────────────────────
function IconoCamion({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="2"  y="18" width="34" height="28" rx="3" fill="#F97316" />
      <rect x="6"  y="22" width="12" height="10" rx="1.5" fill="#FED7AA" />
      <rect x="2"  y="32" width="10" height="8"  rx="1"   fill="#EA580C" />
      <rect x="2"  y="36" width="10" height="10" rx="2"   fill="#C2410C" />
      <rect x="36" y="26" width="26" height="20" rx="2"   fill="#FB923C" />
      <rect x="40" y="30" width="10" height="8"  rx="1"   fill="#FED7AA" />
      <circle cx="14" cy="50" r="7"   fill="#1E293B" />
      <circle cx="14" cy="50" r="3.5" fill="#64748B" />
      <circle cx="44" cy="50" r="7"   fill="#1E293B" />
      <circle cx="44" cy="50" r="3.5" fill="#64748B" />
      <circle cx="56" cy="50" r="7"   fill="#1E293B" />
      <circle cx="56" cy="50" r="3.5" fill="#64748B" />
      <line x1="36" y1="18" x2="36" y2="46" stroke="#C2410C" strokeWidth="2" />
    </svg>
  )
}

function IconoChasis({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="4"  y="16" width="56" height="30" rx="3" fill="#64748B" />
      <rect x="8"  y="20" width="4"  height="22" rx="1" fill="#94A3B8" />
      <rect x="16" y="20" width="4"  height="22" rx="1" fill="#94A3B8" />
      <rect x="24" y="20" width="4"  height="22" rx="1" fill="#94A3B8" />
      <rect x="32" y="20" width="4"  height="22" rx="1" fill="#94A3B8" />
      <rect x="40" y="20" width="4"  height="22" rx="1" fill="#94A3B8" />
      <rect x="48" y="20" width="4"  height="22" rx="1" fill="#94A3B8" />
      <rect x="2"  y="28" width="6"  height="10" rx="2" fill="#475569" />
      <rect x="0"  y="31" width="4"  height="4"  rx="1" fill="#334155" />
      <circle cx="18" cy="50" r="7"   fill="#1E293B" />
      <circle cx="18" cy="50" r="3.5" fill="#64748B" />
      <circle cx="46" cy="50" r="7"   fill="#1E293B" />
      <circle cx="46" cy="50" r="3.5" fill="#64748B" />
      <rect x="4"  y="44" width="56" height="3"  rx="1" fill="#475569" />
    </svg>
  )
}

// ── Badge de estado ───────────────────────────────────────────
function EstadoBadge({ config }: { config: { label: string; bg: string; text: string; dot: string } }) {
  return (
    <span className={`inline-flex w-full min-w-full max-w-full justify-center items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

// ── Dropdown de estado con colores personalizados ─────────────
function EstadoDropdownCabezal({
  id,
  valorActual,
  onSelect,
  onClose,
}: {
  id: string
  valorActual: string
  onSelect: (id: string, valor: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('click', handleClickOutside)
return () => document.removeEventListener('click', handleClickOutside)
  }, [onClose])

  useEffect(() => {
  if (ref.current) {
    ref.current.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }
}, [])

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 z-50 w-full">
      <ul className="w-fit min-w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
        {OPCIONES_ESTADO_CABEZAL.map(opt => (
          <li key={opt.value}>
            <button
              type="button"
              onClick={() => onSelect(id, opt.value)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer
                ${opt.optionBg} ${opt.optionText}
                ${valorActual === opt.value ? 'ring-2 ring-inset ring-current opacity-90' : ''}`}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${opt.dot}`} />
              <span className="whitespace-nowrap">{opt.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EstadoDropdownChasis({
  id,
  valorActual,
  onSelect,
  onClose,
}: {
  id: string
  valorActual: string
  onSelect: (id: string, valor: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('click', handleClickOutside)
return () => document.removeEventListener('click', handleClickOutside)
  }, [onClose])

  useEffect(() => {
  if (ref.current) {
    ref.current.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }
}, [])

  return (
    <div ref={ref} className="absolute top-full left-0 mt-2 z-50 w-full">
      <ul className="w-fit min-w-full max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
        {OPCIONES_ESTADO_CHASIS.map(opt => (
          <li key={opt.value}>
            <button
              type="button"
              onClick={() => onSelect(id, opt.value)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer
                ${opt.optionBg} ${opt.optionText}
                ${valorActual === opt.value ? 'ring-2 ring-inset ring-current opacity-90' : ''}`}
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${opt.dot}`} />
              <span className="whitespace-nowrap">{opt.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Campo de formulario ───────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Clases base de campo ──────────────────────────────────────
const inputCls =
  'w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white ' +
  'focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 ' +
  'transition-all placeholder:text-slate-400'
const selectCls = `${inputCls} cursor-pointer`

// ── Skeleton de carga ─────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 h-20" />
      ))}
    </div>
  )
}

// ── Estado vacío ──────────────────────────────────────────────
function EmptyState({ tipo, onRegistrar }: { tipo: string; onRegistrar: () => void }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16
      flex flex-col items-center gap-4 text-center px-6">
      <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center">
        {tipo === 'cabezales' ? <IconoCamion size={48} /> : <IconoChasis size={48} />}
      </div>
      <div>
        <p className="font-bold text-slate-700 text-lg">Sin {tipo} registrados</p>
        <p className="text-sm text-slate-400 mt-1">Registra el primer equipo para comenzar</p>
      </div>
      <button
        onClick={onRegistrar}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white
          px-6 py-3 rounded-xl font-bold transition-colors cursor-pointer shadow-md shadow-orange-200"
      >
        <span>+</span>
        Registrar {tipo === 'cabezales' ? 'cabezal' : 'chasis'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function Flota() {
  // ── Estado de datos ──────────────────────────────────────────
  const [tab,       setTab]       = useState<TabFlota>('cabezales')
  const [cabezales, setCabezales] = useState<CabezalRow[]>([])
  const [chasis,    setChasis]    = useState<ChasisRow[]>([])
  const [loading,   setLoading]   = useState(false)

  // ── Estado del formulario de registro / edición ──────────────
  const [tipoEquipo,      setTipo]           = useState<TipoEquipo>('cabezal')
  const [saving,          setSaving]         = useState(false)
  const [saveSuccess,     setSaveSuccess]    = useState(false)
  const [saveError,       setSaveError]      = useState<string | null>(null)
  const [fPlaca,          setFPlaca]         = useState('')
  const [fMarca,          setFMarca]         = useState('')
  const [fModelo,         setFModelo]        = useState('')
  const [fSerie,          setFSerie]         = useState('')
  const [fNotas,          setFNotas]         = useState('')
  const [fEstadoCabezal,  setFEstadoCabezal] = useState<EstadoCabezalDB>('activo')
  const [fTamaño,         setFTamaño]        = useState<TamañoChasisDB>('40')
  const [fEstadoChasis,   setFEstadoChasis]  = useState<EstadoChasisDB>('disponible')

  // ── Estado de acciones inline (editar estado / eliminar) ─────
  const [editing,    setEditing]    = useState<EditingState | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  // ── Estado del modal de edición completa ─────────────────────
  // FIX: equipoEditando se renderiza a nivel raíz del componente,
  // no dentro del tab 'registrar', para que sea visible desde cualquier tab.
  const [equipoEditando, setEquipoEditando] = useState<EquipoEditandoState | null>(null)

  // ── Refetch ──────────────────────────────────────────────────
  const refetchCabezales = useCallback(async () => {
    const { data } = await supabase
      .from('cabezales').select('*').order('created_at', { ascending: false })
    if (data) setCabezales(data)
  }, [])

  const refetchChasis = useCallback(async () => {
    const { data } = await supabase
      .from('chasis').select('*').order('created_at', { ascending: false })
    if (data) setChasis(data)
  }, [])

  // ── Carga inicial al cambiar tab ─────────────────────────────
  useEffect(() => {
    if (tab === 'registrar') return
    let active = true

    async function fetchData() {
      setLoading(true)
      if (tab === 'cabezales') {
        const { data } = await supabase
          .from('cabezales').select('*').order('created_at', { ascending: false })
        if (active && data) setCabezales(data)
      }
      if (tab === 'chasis') {
        const { data } = await supabase
          .from('chasis').select('*').order('created_at', { ascending: false })
        if (active && data) setChasis(data)
      }
      if (active) setLoading(false)
    }

    fetchData()
    return () => { active = false }
  }, [tab])

  // ─────────────────────────────────────────────────────────────
  // GUARDAR NUEVO EQUIPO
  // ─────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    setSaveError(null)
    if (!fPlaca.trim()) { setSaveError('El número de placa es obligatorio.'); return }

    setSaving(true)

    if (tipoEquipo === 'cabezal') {
      const payload: CabezalInsert = {
        placa:        fPlaca.trim().toUpperCase(),
        marca:        fMarca.trim()  || null,
        modelo:       fModelo.trim() || null,
        numero_serie: fSerie.trim()  || null,
        estado:       fEstadoCabezal,
        notas:        fNotas.trim()  || null,
      }
      const { error } = await supabase.from('cabezales').insert(payload)
      setSaving(false)
      if (error) {
        setSaveError(
          error.code === '23505'
            ? `La placa "${fPlaca.toUpperCase()}" ya está registrada.`
            : `Error al guardar: ${error.message}`
        )
        return
      }
    } else {
      const payload: ChasisInsert = {
        placa:        fPlaca.trim().toUpperCase(),
        marca:        fMarca.trim()  || null,
        modelo:       fModelo.trim() || null,
        numero_serie: fSerie.trim()  || null,
        tamaño:       fTamaño,
        estado:       fEstadoChasis,
        notas:        fNotas.trim()  || null,
      }
      const { error } = await supabase.from('chasis').insert(payload)
      setSaving(false)
      if (error) {
        setSaveError(
          error.code === '23505'
            ? `La placa "${fPlaca.toUpperCase()}" ya está registrada.`
            : `Error al guardar: ${error.message}`
        )
        return
      }
    }

    setSaveSuccess(true)
    resetForm()
    if (tipoEquipo === 'cabezal') await refetchCabezales()
    else await refetchChasis()
    setTimeout(() => {
      setSaveSuccess(false)
      setTab(tipoEquipo === 'cabezal' ? 'cabezales' : 'chasis')
    }, 1600)
  }

  // ─────────────────────────────────────────────────────────────
  // ACTUALIZAR ESTADO (dropdown inline)
  // ─────────────────────────────────────────────────────────────
  const handleActualizarEstado = async (id: string, valor: string) => {
    setActionBusy(true)

    if (tab === 'cabezales') {
      const update: CabezalUpdate = { estado: valor as EstadoCabezalDB }
      await supabase.from('cabezales').update(update).eq('id', id)
      await refetchCabezales()
    } else {
      const update: ChasisUpdate = { estado: valor as EstadoChasisDB }
      await supabase.from('chasis').update(update).eq('id', id)
      await refetchChasis()
    }

    setEditing(null)
    setActionBusy(false)
  }

  // ─────────────────────────────────────────────────────────────
  // ABRIR MODAL DE EDICIÓN COMPLETA
  // FIX: ya no cambia de tab, simplemente abre el modal encima
  // ─────────────────────────────────────────────────────────────
  const handleAbrirEdicion = (id: string) => {
    resetAcciones()
    setSaveError(null)
    setSaveSuccess(false)

    if (tab === 'cabezales') {
      const equipo = cabezales.find(c => c.id === id)
      if (!equipo) return
      setTipo('cabezal')
      setFPlaca(equipo.placa ?? '')
      setFMarca(equipo.marca ?? '')
      setFModelo(equipo.modelo ?? '')
      setFSerie(equipo.numero_serie ?? '')
      setFNotas(equipo.notas ?? '')
      setFEstadoCabezal(equipo.estado)
      setFTamaño('40')
      setEquipoEditando({ id, tipo: 'cabezal' })
      return
    }

    const equipo = chasis.find(c => c.id === id)
    if (!equipo) return
    setTipo('chasis')
    setFPlaca(equipo.placa ?? '')
    setFMarca(equipo.marca ?? '')
    setFModelo(equipo.modelo ?? '')
    setFSerie(equipo.numero_serie ?? '')
    setFNotas(equipo.notas ?? '')
    setFTamaño(equipo.tamaño)
    setFEstadoChasis(equipo.estado)
    setEquipoEditando({ id, tipo: 'chasis' })
  }

  // ─────────────────────────────────────────────────────────────
  // GUARDAR EDICIÓN COMPLETA
  // ─────────────────────────────────────────────────────────────
  const handleGuardarEdicionCompleta = async () => {
    if (!equipoEditando) return

    setSaveError(null)
    if (!fPlaca.trim()) {
      setSaveError('El número de placa es obligatorio.')
      return
    }

    setSaving(true)

    if (equipoEditando.tipo === 'cabezal') {
      const payload: CabezalUpdate = {
        placa:        fPlaca.trim().toUpperCase(),
        marca:        fMarca.trim()  || null,
        modelo:       fModelo.trim() || null,
        numero_serie: fSerie.trim()  || null,
        estado:       fEstadoCabezal,
        notas:        fNotas.trim()  || null,
      }
      const { error } = await supabase
        .from('cabezales').update(payload).eq('id', equipoEditando.id)
      setSaving(false)
      if (error) {
        setSaveError(
          error.code === '23505'
            ? `La placa "${fPlaca.toUpperCase()}" ya está registrada.`
            : `Error al actualizar: ${error.message}`
        )
        return
      }
      await refetchCabezales()
    } else {
      const payload: ChasisUpdate = {
        placa:        fPlaca.trim().toUpperCase(),
        marca:        fMarca.trim()  || null,
        modelo:       fModelo.trim() || null,
        numero_serie: fSerie.trim()  || null,
        tamaño:       fTamaño,
        estado:       fEstadoChasis,
        notas:        fNotas.trim()  || null,
      }
      const { error } = await supabase
        .from('chasis').update(payload).eq('id', equipoEditando.id)
      setSaving(false)
      if (error) {
        setSaveError(
          error.code === '23505'
            ? `La placa "${fPlaca.toUpperCase()}" ya está registrada.`
            : `Error al actualizar: ${error.message}`
        )
        return
      }
      await refetchChasis()
    }

    setEquipoEditando(null)
    resetForm()
  }

  // ─────────────────────────────────────────────────────────────
  // ELIMINAR EQUIPO
  // ─────────────────────────────────────────────────────────────
  const handleConfirmarEliminacion = async () => {
    if (!deletingId) return
    setActionBusy(true)

    if (tab === 'cabezales') {
      await supabase.from('cabezales').delete().eq('id', deletingId)
      await refetchCabezales()
    } else {
      await supabase.from('chasis').delete().eq('id', deletingId)
      await refetchChasis()
    }

    setDeletingId(null)
    setActionBusy(false)
  }

  const resetForm = () => {
    setFPlaca('')
    setFMarca('')
    setFModelo('')
    setFSerie('')
    setFNotas('')
    setFEstadoCabezal('activo')
    setFTamaño('40')
    setFEstadoChasis('disponible')
    setSaveError(null)
    setSaveSuccess(false)
    setEquipoEditando(null)
  }

  const resetAcciones = () => {
    setEditing(null)
    setDeletingId(null)
  }

  const TABS_FLOTA = [
    { id: 'cabezales' as TabFlota, label: 'Cabezales', count: cabezales.length },
    { id: 'chasis'    as TabFlota, label: 'Chasis',    count: chasis.length    },
    { id: 'registrar' as TabFlota, label: '+ Registrar equipo' },
  ]

  // ── Celdas de acción ─────────────────────────────────────────
  function CeldaAcciones({ id }: { id: string }) {
    const isDeleting = deletingId === id

    if (isDeleting) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600 font-semibold mr-1">¿Eliminar?</span>
          <button
            onClick={handleConfirmarEliminacion}
            disabled={actionBusy}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600
              disabled:bg-red-300 text-white text-xs font-bold rounded-lg
              transition-colors cursor-pointer"
          >
            {actionBusy ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            Confirmar
          </button>
          <button
            onClick={resetAcciones}
            disabled={actionBusy}
            className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold
              rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            No
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleAbrirEdicion(id)}
          className="flex items-center justify-center
            w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10
            border border-slate-200 rounded-lg
            text-orange-500 hover:text-orange-600
            hover:bg-orange-50 hover:border-orange-300
            transition-colors cursor-pointer"
          title="Editar información completa"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 sm:w-5 sm:h-5"
          >
            <path d="M11.333 2a1.886 1.886 0 012.667 2.667L4.667 14H2v-2.667L11.333 2z" />
          </svg>
        </button>

        <button
          onClick={() => { resetAcciones(); setDeletingId(id) }}
          className="flex items-center justify-center
            w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10
            border border-slate-200 rounded-lg
            text-red-500 hover:text-red-600
            hover:bg-red-50 hover:border-red-300
            transition-colors cursor-pointer"
          title="Eliminar equipo"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 sm:w-5 sm:h-5"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      </div>
    )
  }

  // ── Celda de estado cabezal (badge clicable → dropdown coloreado) ──
  function CeldaEstadoCabezal({ row }: { row: CabezalRow }) {
    const isOpen = editing?.id === row.id && editing?.campo === 'estado'
    const opcion = OPCIONES_ESTADO_CABEZAL.find(o => o.value === row.estado)
    const config = opcion
      ? { label: opcion.label, bg: opcion.bg, text: opcion.text, dot: opcion.dot }
      : ESTADO_CABEZAL_CONFIG[row.estado]

    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setEditing(isOpen ? null : { id: row.id, campo: 'estado', valor: row.estado })
          }}
          className="cursor-pointer"
          title="Editar estado"
        >
          <EstadoBadge config={config} />
        </button>
        {isOpen && (
          <EstadoDropdownCabezal
            id={row.id}
            valorActual={row.estado}
            onSelect={handleActualizarEstado}
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    )
  }

  // ── Celda de estado chasis (badge clicable → dropdown coloreado) ──
  function CeldaEstadoChasis({ row }: { row: ChasisRow }) {
    const isOpen = editing?.id === row.id && editing?.campo === 'estado'
    const opcion = OPCIONES_ESTADO_CHASIS.find(o => o.value === row.estado)
    const config = opcion
      ? { label: opcion.label, bg: opcion.bg, text: opcion.text, dot: opcion.dot }
      : ESTADO_CHASIS_CONFIG[row.estado]

    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setEditing(isOpen ? null : { id: row.id, campo: 'estado', valor: row.estado })
          }}
          className="cursor-pointer"
          title="Editar estado"
        >
          <EstadoBadge config={config} />
        </button>
        {isOpen && (
          <EstadoDropdownChasis
            id={row.id}
            valorActual={row.estado}
            onSelect={handleActualizarEstado}
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto">

      {/* ── Tabs centrados ── */}
      <div className="flex justify-center">
        <div className="inline-flex bg-white border border-slate-200 p-1 rounded-2xl
          shadow-sm gap-1 flex-wrap justify-center">
          {TABS_FLOTA.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); resetAcciones() }}
              className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm
                font-semibold transition-all duration-200 cursor-pointer
                ${tab === t.id
                  ? t.id === 'registrar'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none
                  ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════ TAB: CABEZALES ══════════ */}
      {tab === 'cabezales' && (
        <div className="space-y-4">
          {loading ? <LoadingSkeleton /> : cabezales.length === 0 ? (
            <EmptyState tipo="cabezales" onRegistrar={() => { setTipo('cabezal'); setTab('registrar') }} />
          ) : (
            <>
              {/* Desktop */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hidden md:block">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                  <IconoCamion size={28} />
                  <h3 className="font-bold text-slate-800">Cabezales registrados</h3>
                  <span className="ml-auto text-xs text-slate-400">
                    Haz clic en Estado para editar directamente
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Placa', 'Marca', 'Modelo', 'N° Serie', 'Estado', 'Notas', 'Acciones'].map(h => (
                          <th key={h}
                            className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cabezales.map(c => (
                        <tr key={c.id}
                          className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">{c.placa}</td>
                          <td className="px-4 py-3.5 text-slate-600">{c.marca ?? '—'}</td>
                          <td className="px-4 py-3.5 text-slate-600">{c.modelo ?? '—'}</td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{c.numero_serie ?? '—'}</td>
                          <td className="px-4 py-3.5">
                            <CeldaEstadoCabezal row={c} />
                          </td>
                          <td className="px-4 py-3.5 text-slate-400 text-xs max-w-40 truncate">{c.notas ?? '—'}</td>
                          <td className="px-4 py-3.5">
                            <CeldaAcciones id={c.id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Móvil */}
              <div className="md:hidden space-y-3">
                {cabezales.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex items-center gap-2">
                        <IconoCamion size={24} />
                        <p className="font-mono font-bold text-slate-800 text-lg">{c.placa}</p>
                      </div>
                      <CeldaEstadoCabezal row={c} />
                    </div>
                    {(c.marca || c.modelo) && (
                      <p className="text-sm text-slate-600">{[c.marca, c.modelo].filter(Boolean).join(' · ')}</p>
                    )}
                    {c.numero_serie && (
                      <p className="text-xs font-mono text-slate-400 mt-1">Serie: {c.numero_serie}</p>
                    )}
                    {c.notas && <p className="text-xs text-slate-400 mt-1 italic">&quot;{c.notas}&quot;</p>}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <CeldaAcciones id={c.id} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ TAB: CHASIS ══════════ */}
      {tab === 'chasis' && (
        <div className="space-y-4">
          {loading ? <LoadingSkeleton /> : chasis.length === 0 ? (
            <EmptyState tipo="chasis" onRegistrar={() => { setTipo('chasis'); setTab('registrar') }} />
          ) : (
            <>
              {/* Desktop */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hidden md:block">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                  <IconoChasis size={28} />
                  <h3 className="font-bold text-slate-800">Chasis registrados</h3>
                  <span className="ml-auto text-xs text-slate-400">
                    Haz clic en Estado para editar directamente
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Placa', 'Marca', 'Modelo', 'N° Serie', 'Tamaño', 'Estado', 'Notas', 'Acciones'].map(h => (
                          <th key={h}
                            className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chasis.map(c => (
                        <tr key={c.id}
                          className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">{c.placa}</td>
                          <td className="px-4 py-3.5 text-slate-600">{c.marca ?? '—'}</td>
                          <td className="px-4 py-3.5 text-slate-600">{c.modelo ?? '—'}</td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{c.numero_serie ?? '—'}</td>
                          <td className="px-4 py-3.5">
                            <span className="bg-slate-100 text-slate-700 font-bold text-xs px-2.5 py-1 rounded-full">
                              {c.tamaño}&nbsp;pies
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <CeldaEstadoChasis row={c} />
                          </td>
                          <td className="px-4 py-3.5 text-slate-400 text-xs max-w-35 truncate">{c.notas ?? '—'}</td>
                          <td className="px-4 py-3.5">
                            <CeldaAcciones id={c.id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Móvil */}
              <div className="md:hidden space-y-3">
                {chasis.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex items-center gap-2">
                        <IconoChasis size={24} />
                        <p className="font-mono font-bold text-slate-800 text-lg">{c.placa}</p>
                      </div>
                      <CeldaEstadoChasis row={c} />
                    </div>
                    {(c.marca || c.modelo) && (
                      <p className="text-sm text-slate-600">{[c.marca, c.modelo].filter(Boolean).join(' · ')}</p>
                    )}
                    {c.numero_serie && (
                      <p className="text-xs font-mono text-slate-400 mt-1">Serie: {c.numero_serie}</p>
                    )}
                    <span className="inline-block mt-1.5 bg-slate-100 text-slate-700 font-bold text-xs px-2 py-0.5 rounded-full">
                      {c.tamaño} pies
                    </span>
                    {c.notas && <p className="text-xs text-slate-400 mt-1 italic">&quot;{c.notas}&quot;</p>}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <CeldaAcciones id={c.id} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ TAB: REGISTRAR ══════════ */}
      {tab === 'registrar' && (
        <div className="w-full">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-linear-to-r from-slate-800 to-slate-900 px-6 md:px-8 py-5">
              <h3 className="font-bold text-white text-xl text-center">Registrar Equipo de Flota</h3>
              <p className="text-slate-400 text-sm mt-1 text-center">
                El equipo quedará guardado en la base de datos inmediatamente
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-6">

              {/* Selector de tipo */}
              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">Tipo de equipo</p>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {([
                    { v: 'cabezal' as TipoEquipo, l: 'Cabezal', icono: <IconoCamion size={36} /> },
                    { v: 'chasis'  as TipoEquipo, l: 'Chasis',  icono: <IconoChasis size={36} /> },
                  ]).map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => { setTipo(opt.v); setSaveError(null) }}
                      className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2
                        font-semibold transition-all cursor-pointer
                        ${tipoEquipo === opt.v
                          ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-md'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      {opt.icono}
                      <span className="text-xs text-center leading-tight">{opt.l}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* Campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                <Field label="Número de Placa" required>
                  <input
                    type="text"
                    value={fPlaca}
                    onChange={e => setFPlaca(e.target.value.toUpperCase())}
                    placeholder={tipoEquipo === 'cabezal' ? 'Ej. C0 - 702BYK' : 'Ej. TC - 41CQG'}
                    className={inputCls}
                    maxLength={20}
                  />
                </Field>

                <Field label="Marca">
                  <input
                    type="text"
                    value={fMarca}
                    onChange={e => setFMarca(e.target.value)}
                    placeholder={tipoEquipo === 'cabezal' ? 'Ej. FREIGHTLINER' : 'Ej. MECOX'}
                    className={inputCls}
                  />
                </Field>

                <Field label="Modelo / Año">
                  <input
                    type="text"
                    value={fModelo}
                    onChange={e => setFModelo(e.target.value)}
                    placeholder={tipoEquipo === 'cabezal' ? 'Ej. 1995' : 'Ej. 2003'}
                    className={inputCls}
                  />
                </Field>

                <Field label="Número de Serie">
                  <input
                    type="text"
                    value={fSerie}
                    onChange={e => setFSerie(e.target.value.toUpperCase())}
                    placeholder={tipoEquipo === 'cabezal' ? 'Ej. 1FUYDZYB1SP875673' : 'Ej. P608192'}
                    className={inputCls}
                  />
                </Field>

                {tipoEquipo === 'chasis' && (
                  <Field label="Tamaño" required>
                    <select
                      value={fTamaño}
                      onChange={e => setFTamaño(e.target.value as TamañoChasisDB)}
                      className={selectCls}
                    >
                      <option value="20">20 pies</option>
                      <option value="40">40 pies</option>
                      <option value="45">45 pies</option>
                    </select>
                  </Field>
                )}

                <Field label="Estado inicial">
                  {tipoEquipo === 'cabezal' ? (
                    <select
                      value={fEstadoCabezal}
                      onChange={e => setFEstadoCabezal(e.target.value as EstadoCabezalDB)}
                      className={selectCls}
                    >
                      {OPCIONES_ESTADO_CABEZAL.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={fEstadoChasis}
                      onChange={e => setFEstadoChasis(e.target.value as EstadoChasisDB)}
                      className={selectCls}
                    >
                      {OPCIONES_ESTADO_CHASIS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </Field>

                <div className="md:col-span-2 xl:col-span-3">
                  <Field label="Notas (opcional)">
                    <textarea
                      value={fNotas}
                      onChange={e => setFNotas(e.target.value)}
                      rows={2}
                      placeholder="Observaciones, condición física, historial relevante…"
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                </div>
              </div>

              {saveError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <span className="text-base mt-0.5 shrink-0">{icons.alertTriangle}</span>
                  <p className="text-sm font-medium">{saveError}</p>
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
                  <span className="text-lg">✓</span>
                  <p className="text-sm font-bold">
                    {tipoEquipo === 'cabezal' ? 'Cabezal' : 'Chasis'} registrado correctamente.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleGuardar}
                  disabled={saving || saveSuccess}
                  className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300
                    text-white text-base rounded-xl font-bold transition-colors cursor-pointer
                    shadow-lg shadow-orange-200 flex items-center justify-center gap-2
                    disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    <><span>{icons.plus}</span> Guardar en sistema</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setTab('cabezales') }}
                  className="sm:w-44 py-3.5 border-2 border-slate-200 text-slate-700 rounded-xl
                    font-semibold hover:bg-slate-100 transition-colors cursor-pointer text-base"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL: EDITAR EQUIPO ══════════
          FIX: Renderizado a nivel raíz del componente (fuera de cualquier tab)
          para que sea accesible desde los tabs cabezales y chasis. ══════════ */}
      {equipoEditando && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl border border-slate-200 shadow-2xl">

            {/* Header */}
            <div className="sticky top-0 z-10 bg-linear-to-r from-slate-800 to-slate-900 px-6 md:px-8 py-5 rounded-t-3xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-xl">
                  Editar {equipoEditando.tipo === 'cabezal' ? 'Cabezal' : 'Chasis'}
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  Modifica la información del equipo y guarda los cambios
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white
                  flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 space-y-6">

              {/* Tipo visual (solo lectura) */}
              <div>
                <p className="text-sm font-bold text-slate-700 mb-3">Tipo de equipo</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                  <div className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 font-semibold
                    ${equipoEditando.tipo === 'cabezal'
                      ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-md'
                      : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                    <IconoCamion size={36} />
                    <span className="text-xs text-center leading-tight">Cabezal</span>
                  </div>
                  <div className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 font-semibold
                    ${equipoEditando.tipo === 'chasis'
                      ? 'bg-orange-50 border-orange-400 text-orange-700 shadow-md'
                      : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                    <IconoChasis size={36} />
                    <span className="text-xs text-center leading-tight">Chasis</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* Campos */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                <Field label="Número de Placa" required>
                  <input
                    type="text"
                    value={fPlaca}
                    onChange={e => setFPlaca(e.target.value.toUpperCase())}
                    placeholder={equipoEditando.tipo === 'cabezal' ? 'Ej. C0 - 702BYK' : 'Ej. TC - 41CQG'}
                    className={inputCls}
                    maxLength={20}
                  />
                </Field>

                <Field label="Marca">
                  <input
                    type="text"
                    value={fMarca}
                    onChange={e => setFMarca(e.target.value)}
                    placeholder={equipoEditando.tipo === 'cabezal' ? 'Ej. FREIGHTLINER' : 'Ej. MECOX'}
                    className={inputCls}
                  />
                </Field>

                <Field label="Modelo / Año">
                  <input
                    type="text"
                    value={fModelo}
                    onChange={e => setFModelo(e.target.value)}
                    placeholder={equipoEditando.tipo === 'cabezal' ? 'Ej. 1995' : 'Ej. 2003'}
                    className={inputCls}
                  />
                </Field>

                <Field label="Número de Serie">
                  <input
                    type="text"
                    value={fSerie}
                    onChange={e => setFSerie(e.target.value.toUpperCase())}
                    placeholder={equipoEditando.tipo === 'cabezal' ? 'Ej. 1FUYDZYB1SP875673' : 'Ej. P608192'}
                    className={inputCls}
                  />
                </Field>

                {equipoEditando.tipo === 'chasis' && (
                  <Field label="Tamaño" required>
                    <select
                      value={fTamaño}
                      onChange={e => setFTamaño(e.target.value as TamañoChasisDB)}
                      className={selectCls}
                    >
                      <option value="20">20 pies</option>
                      <option value="40">40 pies</option>
                      <option value="45">45 pies</option>
                    </select>
                  </Field>
                )}

                <Field label="Estado">
                  {equipoEditando.tipo === 'cabezal' ? (
                    <select
                      value={fEstadoCabezal}
                      onChange={e => setFEstadoCabezal(e.target.value as EstadoCabezalDB)}
                      className={selectCls}
                    >
                      {OPCIONES_ESTADO_CABEZAL.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={fEstadoChasis}
                      onChange={e => setFEstadoChasis(e.target.value as EstadoChasisDB)}
                      className={selectCls}
                    >
                      {OPCIONES_ESTADO_CHASIS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </Field>

                <div className="md:col-span-2 xl:col-span-3">
                  <Field label="Notas (opcional)">
                    <textarea
                      value={fNotas}
                      onChange={e => setFNotas(e.target.value)}
                      rows={3}
                      placeholder="Observaciones, condición física, historial relevante…"
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                </div>
              </div>

              {saveError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <span className="text-base mt-0.5 shrink-0">{icons.alertTriangle}</span>
                  <p className="text-sm font-medium">{saveError}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleGuardarEdicionCompleta}
                  disabled={saving}
                  className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300
                    text-white text-base rounded-xl font-bold transition-colors cursor-pointer
                    shadow-lg shadow-orange-200 flex items-center justify-center gap-2
                    disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando cambios…
                    </>
                  ) : (
                    <>Guardar cambios</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="sm:w-44 py-3.5 border-2 border-slate-200 text-slate-700 rounded-xl
                    font-semibold hover:bg-slate-100 transition-colors cursor-pointer text-base"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
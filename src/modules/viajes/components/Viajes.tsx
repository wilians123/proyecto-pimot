// Viajes.tsx
// Módulo completo de seguimiento de viajes.
// Carga pilotos, cabezales, chasis y clientes desde Supabase.
// El formulario incluye viáticos (Q200-Q250) vinculados al viaje.
// El panel de detalle muestra el mapa GPS en vivo del cabezal asignado
// a través de MiniMapaTracker (que reutiliza MapaFlota internamente).
//
// v2: handleActualizarEstado y handleConfirmarCancelacion corregidos.
// v3: Edición de viaje en estado "programado".
//   - Botón "Editar" en el header del panel de detalle (solo si estado === "programado").
//   - Reutiliza el mismo formulario del tab "nuevo" precargado con los datos del viaje.
//   - handleGuardarViaje bifurca: UPDATE si hay viajeEditando, INSERT si no.
//   - El tab "nuevo" dispara carga de catálogos también cuando viajeEditando !== null.
"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { icons } from "@/lib/constants";
import type { Database } from "@/types/database";

// MiniMapaTracker usa Leaflet → ssr:false obligatorio
const MiniMapaTracker = dynamic(
  () => import("@/components/shared/MiniMapaTracker"),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 bg-slate-100 rounded-xl animate-pulse" />
    ),
  },
);

// ── Tipos de base de datos ────────────────────────────────────
type PilotoRow = Database["public"]["Tables"]["pilotos"]["Row"];
type CabezalRow = Database["public"]["Tables"]["cabezales"]["Row"];
type ChasisRow = Database["public"]["Tables"]["chasis"]["Row"];
type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type ViajeRow = Database["public"]["Tables"]["viajes"]["Row"];
type ViajeInsert = Database["public"]["Tables"]["viajes"]["Insert"];
type EstadoViaje = Database["public"]["Tables"]["viajes"]["Row"]["estado"];

// Viaje enriquecido con relaciones
interface ViajeCompleto extends ViajeRow {
  piloto?: { nombre: string; telefono: string | null } | null;
  cabezal?: { placa: string; marca: string | null } | null;
  chasis?: { placa: string; tamaño: string } | null;
  cliente?: { nombre: string } | null;
}

type TabId = "activos" | "historial" | "nuevo";
type TipoChasis = "propio" | "ajeno";

const VIATICO_MIN = 200;
const VIATICO_MAX = 250;
const VIATICO_DEFAULT = 225;

const ESTADO_VIAJE_CONFIG: Record<
  EstadoViaje,
  { label: string; bg: string; text: string; dot: string }
> = {
  programado: {
    label: "Programado",
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
  },
  en_transito: {
    label: "En Tránsito",
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
  en_destino: {
    label: "En Destino",
    bg: "bg-amber-100",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  finalizado: {
    label: "Finalizado",
    bg: "bg-green-100",
    text: "text-green-800",
    dot: "bg-green-600",
  },
  cancelado: {
    label: "Cancelado",
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-400",
  },
};

// Transiciones válidas por estado actual
const SIGUIENTES_ESTADOS: Record<EstadoViaje, EstadoViaje[]> = {
  programado: ["en_transito", "cancelado"],
  en_transito: ["en_destino", "cancelado"],
  en_destino: ["finalizado", "cancelado"],
  finalizado: [],
  cancelado: [],
};

// ── Estilos reutilizables ─────────────────────────────────────
const inputCls =
  "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white " +
  "focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 " +
  "transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed";
const selectCls = `${inputCls} cursor-pointer`;

// ── Subcomponentes menores ────────────────────────────────────
function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function SectionHeader({
  num,
  label,
  color,
}: {
  num: string;
  label: string;
  color: string;
}) {
  return (
    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
      <span
        className={`w-5 h-5 ${color} rounded-md flex items-center justify-center text-[10px] font-black`}
      >
        {num}
      </span>
      {label}
    </h4>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200 p-5 h-20"
        />
      ))}
    </div>
  );
}

// ── Modal de confirmación de cancelación ──────────────────────
interface ModalCancelacionProps {
  viaje: ViajeCompleto;
  procesando: boolean;
  onClose: () => void;
  onConfirmar: (accion: "cancelar" | "eliminar") => Promise<void>;
}

function ModalCancelacion({
  viaje,
  procesando,
  onClose,
  onConfirmar,
}: ModalCancelacionProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay oscuro */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          if (!procesando) onClose();
        }}
      />
      {/* Panel del modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 z-10">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#DC2626"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">
              Confirmar cancelación
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {viaje.codigo ?? viaje.id.slice(0, 10)}
            </p>
          </div>
        </div>

        {/* Cuerpo */}
        <p className="text-sm text-slate-600 leading-relaxed">
          ¿Deseas cancelar este viaje? Puedes cancelar y conservar el registro o
          cancelar y eliminarlo permanentemente.
        </p>

        {/* Advertencia */}
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-red-500 mt-0.5 shrink-0">⚠️</span>
          <p className="text-xs text-red-700 font-medium">
            Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => onConfirmar("cancelar")}
            disabled={procesando}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300
              text-white text-sm rounded-xl font-bold transition-colors cursor-pointer
              disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {procesando && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Cancelar viaje
          </button>
          <button
            onClick={() => onConfirmar("eliminar")}
            disabled={procesando}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300
              text-white text-sm rounded-xl font-bold transition-colors cursor-pointer
              disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {procesando && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Cancelar y eliminar
          </button>
        </div>

        {/* Botón de volver */}
        <button
          onClick={onClose}
          disabled={procesando}
          className="w-full py-2 border-2 border-slate-200 text-slate-600 rounded-xl
            font-semibold text-sm hover:bg-slate-50 transition-colors cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Volver
        </button>
      </div>
    </div>
  );
}

// ── Indicador GPS inline (en el formulario de nuevo viaje) ────
function TrackerIndicador({
  cabezalId,
  placa,
}: {
  cabezalId: string;
  placa: string;
}) {
  const [estado, setEstado] = useState<"cargando" | "vinculado" | "sin_gps">(
    "cargando",
  );
  const [trackerLabel, setTrackerLabel] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      const { data } = await supabase
        .from("navixy_trackers")
        .select("tracker_id, label")
        .eq("cabezal_id", cabezalId)
        .eq("activo", true)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setEstado("vinculado");
        setTrackerLabel(data.label ?? "");
      } else {
        setEstado("sin_gps");
      }
    }
    check();
    return () => {
      active = false;
    };
  }, [cabezalId]);

  if (estado === "cargando")
    return (
      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 animate-pulse">
        <span className="w-2 h-2 bg-slate-300 rounded-full" />
        Verificando GPS…
      </div>
    );

  if (estado === "vinculado")
    return (
      <div className="mt-1 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        GPS vinculado:{" "}
        <span className="font-mono font-bold ml-1">{trackerLabel}</span>
      </div>
    );

  return (
    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
      Cabezal {placa} sin GPS vinculado
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export default function Viajes() {
  const [tab, setTab] = useState<TabId>("activos");

  // ── Listas de viajes ──────────────────────────────────────────
  const [viajesActivos, setViajesActivos] = useState<ViajeCompleto[]>([]);
  const [viajesHistorial, setViajesHistorial] = useState<ViajeCompleto[]>([]);
  const [loadingActivos, setLoadingActivos] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [viajeSelec, setViajeSelec] = useState<ViajeCompleto | null>(null);

  // ── Catálogos para el formulario ──────────────────────────────
  const [pilotos, setPilotos] = useState<PilotoRow[]>([]);
  const [cabezales, setCabezales] = useState<CabezalRow[]>([]);
  const [chasisList, setChasis] = useState<ChasisRow[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  // ── Campos del formulario nuevo viaje ─────────────────────────
  const [tipoChasis, setTipoChasis] = useState<TipoChasis>("propio");
  const [fPilotoId, setFPilotoId] = useState("");
  const [fCabezalId, setFCabezalId] = useState("");
  const [fChasisId, setFChasisId] = useState("");
  const [fChasisPlaca, setFChasisPlaca] = useState("");
  const [fTamano, setFTamano] = useState<"20" | "40" | "45">("40");
  const [fClienteId, setFClienteId] = useState("");
  const [fOrigen, setFOrigen] = useState("Puerto Barrios");
  const [fDestino, setFDestino] = useState("");
  const [fFechaInicio, setFInicio] = useState("");
  const [fFechaEst, setFEstimada] = useState("");
  const [fViatico, setFViatico] = useState(String(VIATICO_DEFAULT));
  const [fNotas, setFNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Derivados del formulario
  const pilotoSelec = pilotos.find((p) => p.id === fPilotoId) ?? null;
  const cabezalSelec = cabezales.find((c) => c.id === fCabezalId) ?? null;
  // En modo edición, el chasis ya asignado al viaje puede tener estado "en_uso".
  // Lo incluimos explícitamente para que aparezca seleccionado en el select.
  const chasisFiltrados = chasisList.filter(
    (c) =>
      c.tamaño === fTamano &&
      (c.estado === "disponible" ||
        (viajeEditando !== null && c.id === viajeEditando.chasis_id)),
  );

  // ── Estado del panel de detalle ───────────────────────────────
  const [nuevoEstado, setNuevoEstado] = useState<EstadoViaje | "">("");
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  // ── Modal de cancelación ──────────────────────────────────────
  const [mostrarModal, setMostrarModal] = useState(false);
  const [procesandoCancelacion, setProcesandoCancelacion] = useState(false);

  // ── Edición de viaje ──────────────────────────────────────────
  // Solo se puede editar cuando estado === "programado".
  // Al activar la edición se navega al tab "nuevo" con el formulario precargado.
  const [viajeEditando, setViajeEditando] = useState<ViajeCompleto | null>(
    null,
  );

  // ── Query helper (viajes con relaciones) ─────────────────────
  const SELECT_VIAJE =
    "*, piloto:pilotos(nombre,telefono), cabezal:cabezales(placa,marca), chasis:chasis(placa,tamaño), cliente:clientes(nombre)";

  // ── Carga de viajes activos ───────────────────────────────────
  const refetchActivos = useCallback(async () => {
    const { data, error } = await supabase
      .from("viajes")
      .select(SELECT_VIAJE)
      .in("estado", ["programado", "en_transito", "en_destino"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Viajes] Error refetch activos:", error.message);
      return;
    }
    if (data) setViajesActivos(data as unknown as ViajeCompleto[]);
  }, []);

  useEffect(() => {
    if (tab !== "activos") return;
    let active = true;

    async function load() {
      setLoadingActivos(true);
      const { data, error } = await supabase
        .from("viajes")
        .select(SELECT_VIAJE)
        .in("estado", ["programado", "en_transito", "en_destino"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) console.error("[Viajes] Error carga activos:", error.message);
      if (data) setViajesActivos(data as unknown as ViajeCompleto[]);
      setLoadingActivos(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [tab]);

  // ── Carga de historial ────────────────────────────────────────
  useEffect(() => {
    if (tab !== "historial") return;
    let active = true;

    async function load() {
      setLoadingHistorial(true);
      const { data, error } = await supabase
        .from("viajes")
        .select(SELECT_VIAJE)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!active) return;
      if (error)
        console.error("[Viajes] Error carga historial:", error.message);
      if (data) setViajesHistorial(data as unknown as ViajeCompleto[]);
      setLoadingHistorial(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [tab]);

  // ── Carga de catálogos ────────────────────────────────────────
  // Se dispara cuando el tab es "nuevo" O cuando hay un viajeEditando
  // (edición viene del tab "activos" → cambia tab a "nuevo" con datos precargados).
  useEffect(() => {
    if (tab !== "nuevo") return;
    let active = true;

    async function loadCatalogos() {
      setLoadingCatalogos(true);
      const [{ data: ps }, { data: cs }, { data: chs }, { data: cl }] =
        await Promise.all([
          supabase
            .from("pilotos")
            .select("*")
            .eq("activo", true)
            .order("nombre"),
          supabase
            .from("cabezales")
            .select("*")
            .eq("estado", "activo")
            .order("placa"),
          supabase.from("chasis").select("*").order("placa"),
          supabase
            .from("clientes")
            .select("*")
            .eq("activo", true)
            .order("nombre"),
        ]);

      if (!active) return;
      if (ps) setPilotos(ps);
      if (cs) setCabezales(cs);
      if (chs) setChasis(chs);
      if (cl) setClientes(cl);
      setLoadingCatalogos(false);
    }

    loadCatalogos();
    return () => {
      active = false;
    };
  }, [tab]);

  // ── Cargar viaje en formulario para edición ───────────────────
  // Popula todos los campos del form con los datos del viaje seleccionado.
  // El tamaño del chasis se resuelve buscando en chasisList (ya cargado).
  // Si chasisList aún no tiene datos (raro), se usa "40" como fallback.
  const cargarViajeEnFormulario = useCallback(
    (v: ViajeCompleto, chasisCatalogo: ChasisRow[]) => {
      setFPilotoId(v.piloto_id ?? "");
      setFCabezalId(v.cabezal_id ?? "");
      setFClienteId(v.cliente_id ?? "");
      setFOrigen(v.origen ?? "Puerto Barrios");
      setFDestino(v.destino ?? "");
      setFInicio(
        v.fecha_inicio
          ? new Date(v.fecha_inicio).toISOString().slice(0, 16)
          : "",
      );
      setFEstimada(
        v.fecha_estimada
          ? new Date(v.fecha_estimada).toISOString().slice(0, 16)
          : "",
      );
      setFViatico(
        v.viatico_monto !== null
          ? String(v.viatico_monto)
          : String(VIATICO_DEFAULT),
      );
      setFNotas(v.notas ?? "");
      setSaveError(null);
      setSaveOk(false);

      // Chasis: determinar si es propio (chasis_id) o ajeno (chasis_externo_placa)
      if (v.chasis_id) {
        setTipoChasis("propio");
        setFChasisId(v.chasis_id);
        setFChasisPlaca("");
        // Resolver tamaño desde el catálogo
        const chasisEncontrado = chasisCatalogo.find(
          (c) => c.id === v.chasis_id,
        );
        setFTamano((chasisEncontrado?.tamaño as "20" | "40" | "45") ?? "40");
      } else if (v.chasis_externo_placa) {
        setTipoChasis("ajeno");
        setFChasisId("");
        setFChasisPlaca(v.chasis_externo_placa);
        setFTamano("40"); // tamaño no aplica para chasis ajeno
      } else {
        setTipoChasis("propio");
        setFChasisId("");
        setFChasisPlaca("");
        setFTamano("40");
      }
    },
    [],
  );

  // ── Iniciar edición de un viaje ───────────────────────────────
  // Solo disponible cuando estado === "programado".
  // Carga catálogos si no están disponibles aún, luego popula el form.
  const handleEditarViaje = useCallback(
    async (v: ViajeCompleto) => {
      setViajeEditando(v);
      setSaveError(null);
      setSaveOk(false);

      // Si los catálogos no están cargados aún, cargarlos primero
      let catalogoChasis = chasisList;
      if (chasisList.length === 0) {
        const [{ data: ps }, { data: cs }, { data: chs }, { data: cl }] =
          await Promise.all([
            supabase
              .from("pilotos")
              .select("*")
              .eq("activo", true)
              .order("nombre"),
            supabase
              .from("cabezales")
              .select("*")
              .eq("estado", "activo")
              .order("placa"),
            supabase.from("chasis").select("*").order("placa"),
            supabase
              .from("clientes")
              .select("*")
              .eq("activo", true)
              .order("nombre"),
          ]);
        if (ps) setPilotos(ps);
        if (cs) setCabezales(cs);
        if (chs) {
          setChasis(chs);
          catalogoChasis = chs;
        }
        if (cl) setClientes(cl);
      }

      cargarViajeEnFormulario(v, catalogoChasis);
      setTab("nuevo");
    },
    [chasisList, cargarViajeEnFormulario],
  );

  // ── Actualizar estado del viaje ───────────────────────────────
  // CORRECCIÓN: se tipan los campos de fecha como string (ISO) para que
  // Supabase los acepte, y se re-sincroniza viajeSelec desde el array
  // refrescado en lugar de usar el objeto stale anterior.
  const handleActualizarEstado = async (estadoDestino: EstadoViaje) => {
    if (!viajeSelec) return;

    setActualizandoEstado(true);
    setErrorEstado(null);

    const ahora = new Date().toISOString();

    // Construimos el objeto de actualización con los campos exactos de la tabla.
    // Usamos Record<string, string | null> para evitar conflictos con el tipo generado
    // (que puede no incluir deleted_at en el tipado base).
    const updates: Record<string, string | null> = {
      estado: estadoDestino,
    };

    // Registrar timestamps según el estado destino
    if (estadoDestino === "en_transito") {
      updates.fecha_inicio = ahora;
    }
    if (estadoDestino === "finalizado") {
      updates.fecha_fin = ahora;
    }

    const { error } = await supabase
      .from("viajes")
      .update(updates)
      .eq("id", viajeSelec.id);

    if (error) {
      console.error("[Viajes] Error actualizando estado:", error.message);
      setErrorEstado(`Error al actualizar: ${error.message}`);
      setActualizandoEstado(false);
      return;
    }

    // Refrescar la lista y re-sincronizar el viaje seleccionado
    await refetchActivos();
    setActualizandoEstado(false);
    setNuevoEstado("");

    // Buscamos el viaje actualizado en el array fresco
    // Usamos un callback de setState para leer el valor más reciente del array
    setViajesActivos((prev) => {
      const actualizado = prev.find((v) => v.id === viajeSelec.id);
      if (actualizado) {
        setViajeSelec(actualizado);
      } else {
        // El viaje ya no está en activos (p.ej. pasó a finalizado/cancelado)
        setViajeSelec(null);
      }
      return prev;
    });
  };

  // ── Abrir modal o actualizar directo según estado elegido ─────
  const handleConfirmarCambioEstado = () => {
    if (!nuevoEstado || !viajeSelec) return;
    if (nuevoEstado === "cancelado") {
      setMostrarModal(true);
    } else {
      handleActualizarEstado(nuevoEstado as EstadoViaje);
    }
  };

  // ── Cancelar / soft-delete desde el modal ────────────────────
  // Record<string, string | null> permite incluir deleted_at sin conflictos
  // con el tipo generado de Supabase (que no incluye esa columna por defecto).
  const handleConfirmarCancelacion = async (
    accion: "cancelar" | "eliminar",
  ) => {
    if (!viajeSelec) return;

    setProcesandoCancelacion(true);
    setErrorEstado(null);

    const ahora = new Date().toISOString();
    const updates: Record<string, string | null> = {
      estado: "cancelado",
      fecha_fin: ahora,
    };

    // Soft-delete: marca deleted_at para excluir de queries activas
    if (accion === "eliminar") {
      updates.deleted_at = ahora;
    }

    const { error } = await supabase
      .from("viajes")
      .update(updates)
      .eq("id", viajeSelec.id);

    setProcesandoCancelacion(false);

    if (error) {
      console.error("[Viajes] Error cancelando viaje:", error.message);
      setErrorEstado(`Error al cancelar: ${error.message}`);
      return;
    }

    // Cerrar modal, limpiar selección y refrescar lista
    setMostrarModal(false);
    setNuevoEstado("");
    setViajeSelec(null);
    await refetchActivos();
  };

  // ── Guardar nuevo viaje o actualizar viaje editado ───────────
  const handleGuardarViaje = async () => {
    setSaveError(null);

    if (!fPilotoId) {
      setSaveError("Selecciona un piloto.");
      return;
    }
    if (!fCabezalId) {
      setSaveError("Selecciona un cabezal.");
      return;
    }
    if (!fDestino.trim()) {
      setSaveError("Ingresa el punto de destino.");
      return;
    }
    if (tipoChasis === "propio" && !fChasisId) {
      setSaveError("Selecciona un chasis.");
      return;
    }
    if (tipoChasis === "ajeno" && !fChasisPlaca.trim()) {
      setSaveError("Ingresa la placa del chasis externo.");
      return;
    }

    const montoViatico = parseFloat(fViatico);
    if (
      isNaN(montoViatico) ||
      montoViatico < VIATICO_MIN ||
      montoViatico > VIATICO_MAX
    ) {
      setSaveError(
        `El viático debe estar entre Q${VIATICO_MIN} y Q${VIATICO_MAX}.`,
      );
      return;
    }

    setSaving(true);

    // ── Modo edición: UPDATE ──────────────────────────────────
    if (viajeEditando) {
      const updatePayload: Record<string, string | number | null> = {
        origen: fOrigen.trim() || "Puerto Barrios",
        destino: fDestino.trim(),
        piloto_id: fPilotoId,
        cabezal_id: fCabezalId,
        chasis_id: tipoChasis === "propio" ? fChasisId : null,
        chasis_externo_placa:
          tipoChasis === "ajeno" ? fChasisPlaca.trim().toUpperCase() : null,
        cliente_id: fClienteId || null,
        viatico_monto: montoViatico,
        fecha_inicio: fFechaInicio || null,
        fecha_estimada: fFechaEst || null,
        notas: fNotas.trim() || null,
      };

      const { error } = await supabase
        .from("viajes")
        .update(updatePayload)
        .eq("id", viajeEditando.id);

      setSaving(false);

      if (error) {
        setSaveError(`Error al actualizar: ${error.message}`);
        return;
      }

      setSaveOk(true);
      await refetchActivos();
      // Re-sincronizar panel de detalle con los datos frescos
      setViajesActivos((prev) => {
        const actualizado = prev.find((v) => v.id === viajeEditando.id);
        if (actualizado) setViajeSelec(actualizado);
        return prev;
      });

      setTimeout(() => {
        setSaveOk(false);
        setViajeEditando(null);
        resetForm();
        setTab("activos");
      }, 1400);
      return;
    }

    // ── Modo creación: INSERT ─────────────────────────────────
    const payload: ViajeInsert = {
      origen: fOrigen.trim() || "Puerto Barrios",
      destino: fDestino.trim(),
      estado: "programado",
      piloto_id: fPilotoId,
      cabezal_id: fCabezalId,
      chasis_id: tipoChasis === "propio" ? fChasisId : null,
      chasis_externo_placa:
        tipoChasis === "ajeno" ? fChasisPlaca.trim().toUpperCase() : null,
      cliente_id: fClienteId || null,
      tipo_servicio: "flete",
      viatico_monto: montoViatico,
      fecha_inicio: fFechaInicio || null,
      fecha_estimada: fFechaEst || null,
      notas: fNotas.trim() || null,
    };

    const { error } = await supabase.from("viajes").insert(payload);
    setSaving(false);

    if (error) {
      setSaveError(`Error al guardar: ${error.message}`);
      return;
    }

    setSaveOk(true);
    resetForm();
    setTimeout(() => {
      setSaveOk(false);
      setTab("activos");
    }, 1600);
  };

  const resetForm = () => {
    setFPilotoId("");
    setFCabezalId("");
    setFChasisId("");
    setFChasisPlaca("");
    setFClienteId("");
    setFOrigen("Puerto Barrios");
    setFDestino("");
    setFInicio("");
    setFEstimada("");
    setFViatico(String(VIATICO_DEFAULT));
    setFNotas("");
    setTipoChasis("propio");
    setSaveError(null);
    // Limpiar modo edición para que el siguiente uso del formulario sea creación
    setViajeEditando(null);
  };

  // ── Utilidades de formato ─────────────────────────────────────
  const formatFecha = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("es-GT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const formatMoneda = (n: number | null) =>
    n !== null
      ? `Q${n.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`
      : "—";

  const TABS = [
    {
      id: "activos" as TabId,
      label: "Viajes Activos",
      count: viajesActivos.length,
    },
    { id: "historial" as TabId, label: "Historial" },
    { id: "nuevo" as TabId, label: "+ Nuevo Viaje" },
  ];

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Modal de cancelación — se monta sobre todo */}
      {mostrarModal && viajeSelec && (
        <ModalCancelacion
          viaje={viajeSelec}
          procesando={procesandoCancelacion}
          onClose={() => {
            if (!procesandoCancelacion) setMostrarModal(false);
          }}
          onConfirmar={handleConfirmarCancelacion}
        />
      )}

      <div className="p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto">
        {/* ── Tabs ── */}
        <div className="flex justify-center">
          <div className="inline-flex bg-white border border-slate-200 p-1 rounded-2xl shadow-sm gap-1 flex-wrap justify-center">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setViajeSelec(null);
                  setNuevoEstado("");
                  setErrorEstado(null);
                  // Si se navega a otro tab manualmente, salir del modo edición
                  if (t.id !== "nuevo") {
                    setViajeEditando(null);
                    resetForm();
                  }
                }}
                className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm
                  font-semibold transition-all duration-200 cursor-pointer
                  ${
                    tab === t.id
                      ? t.id === "nuevo"
                        ? "bg-orange-500 text-white shadow-md"
                        : "bg-slate-900 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none
                    ${tab === t.id ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"}`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════ TAB: ACTIVOS ══════════════ */}
        {tab === "activos" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
            {/* Lista lateral */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                {loadingActivos
                  ? "Cargando…"
                  : `${viajesActivos.length} viajes en operación`}
              </p>

              {loadingActivos ? (
                <LoadingSkeleton />
              ) : viajesActivos.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-12 flex flex-col items-center gap-3 text-center px-6">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                    {icons.truck}
                  </div>
                  <p className="text-sm font-semibold text-slate-500">
                    Sin viajes activos
                  </p>
                  <button
                    onClick={() => setTab("nuevo")}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    + Registrar nuevo viaje
                  </button>
                </div>
              ) : (
                viajesActivos.map((v) => {
                  const cfg = ESTADO_VIAJE_CONFIG[v.estado];
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        setViajeSelec(v);
                        setNuevoEstado("");
                        setErrorEstado(null);
                      }}
                      className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all
                        duration-150 hover:shadow-md
                        ${
                          viajeSelec?.id === v.id
                            ? "border-orange-400 shadow-md ring-2 ring-orange-100"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-start justify-between mb-2.5 gap-2">
                        <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {v.codigo ?? v.id.slice(0, 10)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                            text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                          />
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 bg-linear-to-br from-slate-300 to-slate-500 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0">
                          {(v.piloto?.nombre ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          {v.piloto?.nombre ?? "—"}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-600">
                        <span className="font-medium">{v.origen}</span>
                        <span className="text-slate-400 mx-1.5 font-bold">
                          →
                        </span>
                        <span className="font-semibold text-slate-700">
                          {v.destino}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2.5 text-xs text-slate-400">
                        <span>
                          Cabezal:{" "}
                          <span className="font-mono font-semibold text-slate-600">
                            {v.cabezal?.placa ?? "—"}
                          </span>
                        </span>
                        {v.fecha_estimada && (
                          <span>
                            Est:{" "}
                            {new Date(v.fecha_estimada).toLocaleTimeString(
                              "es-GT",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Panel de detalle */}
            <div className="lg:col-span-3">
              {viajeSelec ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-4">
                  {/* Header */}
                  <div className="px-5 py-4 bg-linear-to-r from-slate-800 to-slate-900 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-mono mb-0.5">
                        {viajeSelec.codigo ?? viajeSelec.id.slice(0, 10)}
                      </p>
                      <h3 className="font-bold text-white text-lg">
                        {viajeSelec.piloto?.nombre ?? "—"}
                      </h3>
                      {viajeSelec.cliente && (
                        <p className="text-xs text-slate-300 mt-0.5">
                          {viajeSelec.cliente.nombre}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Botón Editar — solo visible cuando el viaje aún no ha iniciado */}
                      {viajeSelec.estado === "programado" && (
                        <button
                          onClick={() => handleEditarViaje(viajeSelec)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10
                            hover:bg-white/20 text-white text-xs font-semibold rounded-lg
                            border border-white/20 transition-colors cursor-pointer"
                          title="Editar viaje"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3.5 h-3.5"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Editar
                        </button>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                          text-xs font-semibold
                          ${ESTADO_VIAJE_CONFIG[viajeSelec.estado].bg}
                          ${ESTADO_VIAJE_CONFIG[viajeSelec.estado].text}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${ESTADO_VIAJE_CONFIG[viajeSelec.estado].dot}`}
                        />
                        {ESTADO_VIAJE_CONFIG[viajeSelec.estado].label}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Datos del viaje */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Origen", value: viajeSelec.origen },
                        { label: "Destino", value: viajeSelec.destino },
                        {
                          label: "Cabezal",
                          value: `${viajeSelec.cabezal?.placa ?? "—"}${
                            viajeSelec.cabezal?.marca
                              ? ` · ${viajeSelec.cabezal.marca}`
                              : ""
                          }`,
                        },
                        {
                          label: "Chasis",
                          value:
                            viajeSelec.chasis?.placa ??
                            viajeSelec.chasis_externo_placa ??
                            "—",
                        },
                        {
                          label: "Inicio",
                          value: formatFecha(viajeSelec.fecha_inicio),
                        },
                        {
                          label: "Estimado",
                          value: formatFecha(viajeSelec.fecha_estimada),
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="bg-slate-50 rounded-xl px-3.5 py-2.5"
                        >
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">
                            {label}
                          </p>
                          <p className="font-bold text-slate-800 text-sm truncate">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Viático */}
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                          Viático del viaje
                        </p>
                        <p className="text-xl font-black text-amber-800 tabular-nums">
                          {formatMoneda(viajeSelec.viatico_monto)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-amber-600">
                        <p>Piloto: {viajeSelec.piloto?.nombre}</p>
                        {viajeSelec.piloto?.telefono && (
                          <p>{viajeSelec.piloto.telefono}</p>
                        )}
                      </div>
                    </div>

                    {/* Mini mapa GPS — reutiliza MapaFlota vía MiniMapaTracker */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        GPS en tiempo real —{" "}
                        {viajeSelec.cabezal?.placa ?? "Sin cabezal"}
                      </p>
                      <MiniMapaTracker cabezalId={viajeSelec.cabezal_id} />
                    </div>

                    {/* ── Cambio de estado ── */}
                    {SIGUIENTES_ESTADOS[viajeSelec.estado].length > 0 && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <select
                            value={nuevoEstado}
                            onChange={(e) => {
                              setNuevoEstado(
                                e.target.value as EstadoViaje | "",
                              );
                              setErrorEstado(null);
                            }}
                            className={`flex-1 ${selectCls}`}
                          >
                            <option value="">Cambiar estado a…</option>
                            {SIGUIENTES_ESTADOS[viajeSelec.estado].map((s) => (
                              <option key={s} value={s}>
                                {ESTADO_VIAJE_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleConfirmarCambioEstado}
                            disabled={!nuevoEstado || actualizandoEstado}
                            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600
                              disabled:bg-orange-300 text-white text-sm rounded-xl font-bold
                              transition-colors cursor-pointer disabled:cursor-not-allowed
                              flex items-center gap-2"
                          >
                            {actualizandoEstado ? (
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              icons.check
                            )}
                            Confirmar
                          </button>
                        </div>

                        {/* Mensaje de ayuda cuando no hay estado seleccionado */}
                        {!nuevoEstado && !errorEstado && (
                          <p className="text-xs text-slate-400 px-1">
                            Selecciona el nuevo estado del viaje para habilitar
                            Confirmar.
                          </p>
                        )}

                        {/* Error de actualización */}
                        {errorEstado && (
                          <p className="text-xs text-red-600 px-1 font-medium">
                            {errorEstado}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Viaje finalizado o cancelado */}
                    {(viajeSelec.estado === "finalizado" ||
                      viajeSelec.estado === "cancelado") && (
                      <div
                        className={`px-4 py-3 rounded-xl text-sm font-medium text-center
                        ${
                          viajeSelec.estado === "finalizado"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-red-50 text-red-600 border border-red-200"
                        }`}
                      >
                        Viaje{" "}
                        {ESTADO_VIAJE_CONFIG[
                          viajeSelec.estado
                        ].label.toLowerCase()}{" "}
                        · {formatFecha(viajeSelec.fecha_fin)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 h-64 lg:h-full min-h-80 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                    {icons.truck}
                  </div>
                  <p className="font-semibold text-slate-500">
                    Selecciona un viaje
                  </p>
                  <p className="text-xs text-center max-w-xs">
                    para ver el detalle, el mapa GPS en tiempo real y gestionar
                    el estado
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ TAB: HISTORIAL ══════════════ */}
        {tab === "historial" && (
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

            {loadingHistorial ? (
              <div className="p-6">
                <LoadingSkeleton />
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        {[
                          "Código",
                          "Piloto",
                          "Ruta",
                          "Estado",
                          "Inicio",
                          "Fin",
                          "Viático",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viajesHistorial.map((v) => {
                        const cfg = ESTADO_VIAJE_CONFIG[v.estado];
                        return (
                          <tr
                            key={v.id}
                            className="border-b border-slate-50 hover:bg-orange-50/20 transition-colors cursor-pointer"
                            onClick={() => {
                              setTab("activos");
                              setViajeSelec(v);
                            }}
                          >
                            <td className="px-4 py-3.5 font-mono text-xs text-slate-400">
                              {v.codigo ?? v.id.slice(0, 8)}
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-800">
                              {v.piloto?.nombre ?? "—"}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 text-xs">
                              {v.origen}
                              <span className="text-slate-300 mx-1">→</span>
                              {v.destino}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                                />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 tabular-nums text-xs">
                              {formatFecha(v.fecha_inicio)}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 tabular-nums text-xs">
                              {formatFecha(v.fecha_fin)}
                            </td>
                            <td className="px-4 py-3.5">
                              {v.viatico_monto !== null ? (
                                <span
                                  className={`font-semibold tabular-nums ${
                                    v.estado === "finalizado"
                                      ? "text-green-700"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {formatMoneda(v.viatico_monto)}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {viajesHistorial.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-8 text-center text-slate-400 text-sm"
                          >
                            Sin viajes registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Móvil */}
                <div className="md:hidden divide-y divide-slate-100">
                  {viajesHistorial.map((v) => {
                    const cfg = ESTADO_VIAJE_CONFIG[v.estado];
                    return (
                      <div
                        key={v.id}
                        className="px-4 py-3.5 hover:bg-slate-50 cursor-pointer"
                        onClick={() => {
                          setTab("activos");
                          setViajeSelec(v);
                        }}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <div>
                            <p className="font-bold text-slate-800">
                              {v.piloto?.nombre ?? "—"}
                            </p>
                            <p className="font-mono text-xs text-slate-400">
                              {v.codigo ?? v.id.slice(0, 8)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                            />
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {v.origen} → {v.destino}
                        </p>
                        <div className="flex justify-between mt-1.5 text-xs text-slate-400">
                          <span>{formatFecha(v.fecha_inicio)}</span>
                          {v.viatico_monto !== null && (
                            <span className="font-semibold text-amber-700">
                              {formatMoneda(v.viatico_monto)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {viajesHistorial.length === 0 && (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm">
                      Sin viajes registrados
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════ TAB: NUEVO VIAJE ══════════════ */}
        {tab === "nuevo" && (
          <div className="w-full">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-linear-to-r from-slate-800 to-slate-900 px-6 md:px-8 py-5">
                <h3 className="font-bold text-white text-xl">
                  {viajeEditando ? "Editar Viaje" : "Registrar Nuevo Viaje"}
                </h3>
                <p className="text-slate-400 text-sm mt-1">
                  {viajeEditando
                    ? `Modificando ${viajeEditando.codigo ?? viajeEditando.id.slice(0, 10)} · Solo disponible mientras el viaje esté programado`
                    : "Complete todos los campos para crear la operación"}
                </p>
              </div>

              {loadingCatalogos ? (
                <div className="p-8">
                  <LoadingSkeleton />
                </div>
              ) : (
                <div className="p-6 md:p-8 space-y-6">
                  {/* ── SECCIÓN 1: Personal ── */}
                  <div className="space-y-4">
                    <SectionHeader
                      num="1"
                      label="Personal y cliente"
                      color="bg-orange-100 text-orange-700"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      <Field label="Piloto asignado" required>
                        <select
                          value={fPilotoId}
                          onChange={(e) => setFPilotoId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Seleccionar piloto…</option>
                          {pilotos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                        {pilotoSelec && (
                          <div className="flex items-center gap-2 mt-1 p-2 bg-green-50 rounded-lg border border-green-200">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {pilotoSelec.nombre.charAt(0)}
                            </div>
                            <div className="text-xs text-green-800">
                              <span className="font-semibold">
                                {pilotoSelec.nombre}
                              </span>
                              {pilotoSelec.telefono && (
                                <span className="text-green-600 ml-2">
                                  {pilotoSelec.telefono}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Field>

                      <Field label="Cliente">
                        <select
                          value={fClienteId}
                          onChange={(e) => setFClienteId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Sin cliente asignado</option>
                          {clientes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ── SECCIÓN 2: Equipo ── */}
                  <div className="space-y-4">
                    <SectionHeader
                      num="2"
                      label="Equipo asignado"
                      color="bg-blue-100 text-blue-700"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                      <Field label="Cabezal" required>
                        <select
                          value={fCabezalId}
                          onChange={(e) => setFCabezalId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Seleccionar cabezal…</option>
                          {cabezales.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.placa}
                              {c.marca ? ` · ${c.marca}` : ""}
                            </option>
                          ))}
                        </select>
                        {cabezalSelec && (
                          <TrackerIndicador
                            cabezalId={cabezalSelec.id}
                            placa={cabezalSelec.placa}
                          />
                        )}
                      </Field>

                      <Field label="Tipo de chasis">
                        <div className="grid grid-cols-2 gap-2">
                          {(["propio", "ajeno"] as TipoChasis[]).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setTipoChasis(v)}
                              className={`py-2.5 text-sm rounded-xl border-2 font-semibold
                                transition-all cursor-pointer
                                ${
                                  tipoChasis === v
                                    ? "bg-blue-600 border-blue-600 text-white shadow-md"
                                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                            >
                              {v === "propio" ? "Propio" : "Externo"}
                            </button>
                          ))}
                        </div>
                      </Field>

                      <Field label="Tamaño de chasis">
                        <select
                          value={fTamano}
                          onChange={(e) =>
                            setFTamano(e.target.value as "20" | "40" | "45")
                          }
                          className={selectCls}
                        >
                          <option value="20">20 pies</option>
                          <option value="40">40 pies</option>
                          <option value="45">45 pies</option>
                        </select>
                      </Field>

                      <Field
                        label={
                          tipoChasis === "propio"
                            ? `Chasis (${chasisFiltrados.length} disponibles)`
                            : "Placa chasis externo"
                        }
                        required
                      >
                        {tipoChasis === "propio" ? (
                          <select
                            value={fChasisId}
                            onChange={(e) => setFChasisId(e.target.value)}
                            className={selectCls}
                          >
                            <option value="">Seleccionar chasis…</option>
                            {chasisFiltrados.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.placa} · {c.tamaño} pies
                              </option>
                            ))}
                            {chasisFiltrados.length === 0 && (
                              <option disabled>
                                Sin chasis disponibles de este tamaño
                              </option>
                            )}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={fChasisPlaca}
                            onChange={(e) =>
                              setFChasisPlaca(e.target.value.toUpperCase())
                            }
                            placeholder="Ej. TC-41CQG"
                            className={inputCls}
                          />
                        )}
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ── SECCIÓN 3: Ruta y horario ── */}
                  <div className="space-y-4">
                    <SectionHeader
                      num="3"
                      label="Ruta y horario"
                      color="bg-green-100 text-green-700"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                      <Field label="Punto de origen">
                        <input
                          type="text"
                          value={fOrigen}
                          onChange={(e) => setFOrigen(e.target.value)}
                          placeholder="Puerto Barrios"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Punto de destino" required>
                        <input
                          type="text"
                          value={fDestino}
                          onChange={(e) => setFDestino(e.target.value)}
                          placeholder="Ciudad de Guatemala"
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Fecha y hora de inicio">
                        <input
                          type="datetime-local"
                          value={fFechaInicio}
                          onChange={(e) => setFInicio(e.target.value)}
                          className={inputCls}
                        />
                      </Field>
                      <Field label="Fecha/hora estimada de llegada">
                        <input
                          type="datetime-local"
                          value={fFechaEst}
                          onChange={(e) => setFEstimada(e.target.value)}
                          className={inputCls}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ── SECCIÓN 4: Viáticos ── */}
                  <div className="space-y-4">
                    <SectionHeader
                      num="4"
                      label="Viáticos del piloto"
                      color="bg-amber-100 text-amber-700"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      <Field
                        label={`Monto de viático (Q${VIATICO_MIN}–Q${VIATICO_MAX})`}
                        required
                        hint={`Rango permitido: Q${VIATICO_MIN} – Q${VIATICO_MAX} por viaje`}
                      >
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500 pointer-events-none">
                            Q
                          </span>
                          <input
                            type="number"
                            value={fViatico}
                            min={VIATICO_MIN}
                            max={VIATICO_MAX}
                            step={25}
                            onChange={(e) => setFViatico(e.target.value)}
                            className={`${inputCls} pl-8 tabular-nums`}
                          />
                        </div>
                      </Field>

                      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 md:col-span-1 xl:col-span-2">
                        <span className="text-2xl">💰</span>
                        <div>
                          <p className="text-xs font-semibold text-amber-700">
                            Viático a registrar en este viaje
                          </p>
                          <p className="text-2xl font-black text-amber-800 tabular-nums">
                            Q
                            {parseFloat(fViatico || "0").toLocaleString(
                              "es-GT",
                              {
                                minimumFractionDigits: 2,
                              },
                            )}
                          </p>
                          {pilotoSelec && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              Para: {pilotoSelec.nombre}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100" />

                  {/* ── SECCIÓN 5: Notas ── */}
                  <Field label="Notas adicionales (opcional)">
                    <textarea
                      rows={3}
                      value={fNotas}
                      onChange={(e) => setFNotas(e.target.value)}
                      placeholder="Instrucciones especiales, observaciones del viaje…"
                      className={`${inputCls} resize-none`}
                    />
                  </Field>

                  {/* Mensajes de error / éxito */}
                  {saveError && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                      <span className="text-base mt-0.5 shrink-0">⚠️</span>
                      <p className="text-sm font-medium">{saveError}</p>
                    </div>
                  )}
                  {saveOk && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
                      <span className="text-lg">✓</span>
                      <p className="text-sm font-bold">
                        {viajeEditando
                          ? "Viaje actualizado correctamente."
                          : "Viaje registrado correctamente."}
                      </p>
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleGuardarViaje}
                      disabled={saving || saveOk}
                      className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600
                        disabled:bg-orange-300 text-white text-base rounded-xl font-bold
                        transition-colors cursor-pointer shadow-lg shadow-orange-200
                        flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {viajeEditando ? "Actualizando…" : "Guardando…"}
                        </>
                      ) : (
                        <>
                          <span>
                            {viajeEditando ? icons.check : icons.plus}
                          </span>
                          {viajeEditando
                            ? "Guardar cambios"
                            : "Registrar Viaje"}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setTab("activos");
                      }}
                      className="sm:w-44 py-3.5 border-2 border-slate-200 text-slate-700
                        rounded-xl font-semibold hover:bg-slate-100 transition-colors
                        cursor-pointer text-base"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

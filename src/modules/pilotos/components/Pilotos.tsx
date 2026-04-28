// Módulo de gestión de pilotos y viáticos.
// Registrar conductores, editar estado/viático inline,
// y consultar el historial de viáticos por piloto.

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

// ── Tipos derivados de Database ───────────────────────────────
type PilotoRow = Database["public"]["Tables"]["pilotos"]["Row"];
type PilotoInsert = Database["public"]["Tables"]["pilotos"]["Insert"];
type PilotoUpdate = Database["public"]["Tables"]["pilotos"]["Update"];
type ViajeRow = Database["public"]["Tables"]["viajes"]["Row"];

type TabPilotos = "lista" | "viaticos" | "registrar";

interface ResumenViaticos {
  piloto_id: string;
  piloto_nombre: string;
  viatico_por_viaje: number;
  total_viajes: number;
  viajes_finalizados: number;
  total_viaticos_pagados: number;
  ultimo_viaje: string | null;
}

interface ViajeConPiloto extends ViajeRow {
  piloto?: { nombre: string } | null;
}

interface EditandoState {
  id: string;
  campo: "viatico_monto" | "activo";
  valor: string;
}

const VIATICO_MIN = 200;
const VIATICO_MAX = 250;
const VIATICO_DEFAULT = 225;

// ── Clases de campo (idénticas a Flota.tsx) ───────────────────
const inputCls =
  "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white " +
  "focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 " +
  "transition-all placeholder:text-slate-400";

// ─────────────────────────────────────────────────────────────
// Subcomponentes (fuera del componente principal para evitar
// redefinirlos en cada render — mismo patrón que Flota.tsx)
// ─────────────────────────────────────────────────────────────
function BadgeActivo({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      text-xs font-semibold
      ${activo ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${activo ? "bg-green-500" : "bg-slate-400"}`}
      />
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-200 p-5 h-16"
        />
      ))}
    </div>
  );
}

// Ícono de piloto SVG inline
function IconoPiloto({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="22" r="14" fill="#64748B" />
      <circle cx="32" cy="22" r="10" fill="#94A3B8" />
      <ellipse cx="32" cy="52" rx="20" ry="12" fill="#64748B" />
      <rect x="24" y="28" width="16" height="8" rx="2" fill="#475569" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export default function Pilotos() {
  const [tab, setTab] = useState<TabPilotos>("lista");

  // Datos
  const [pilotos, setPilotos] = useState<PilotoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState<ResumenViaticos[]>([]);
  const [loadingResumen, setLoadingResumen] = useState(false);

  // Formulario de registro
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fNombre, setFNombre] = useState("");
  const [fTelefono, setFTelefono] = useState("");
  const [fLicencia, setFLicencia] = useState("");
  const [fViatico, setFViatico] = useState(String(VIATICO_DEFAULT));

  // Acciones inline
  const [editando, setEditando] = useState<EditandoState | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Detalle de viáticos de un piloto
  const [pilotoDetalle, setPilotoDetalle] = useState<PilotoRow | null>(null);
  const [viajesDetalle, setViajesDetalle] = useState<ViajeConPiloto[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // ─────────────────────────────────────────────────────────
  // Carga de datos (patrón flag `active` — igual que Flota.tsx)
  // ─────────────────────────────────────────────────────────
  const refetchPilotos = useCallback(async () => {
    const { data } = await supabase.from("pilotos").select("*").order("nombre");
    if (data) setPilotos(data);
  }, []);

  useEffect(() => {
    if (tab !== "lista") return;
    let active = true;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("pilotos")
        .select("*")
        .order("nombre");
      if (active && data) setPilotos(data);
      if (active) setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "viaticos") return;
    let active = true;
    async function loadResumen() {
      setLoadingResumen(true);
      const [{ data: ps }, { data: vs }] = await Promise.all([
        supabase.from("pilotos").select("*").order("nombre"),
        supabase
          .from("viajes")
          .select("id, piloto_id, estado, viatico_monto, created_at")
          .not("piloto_id", "is", null),
      ]);
      if (!active) return;
      if (ps && vs) {
        const r: ResumenViaticos[] = ps.map((p) => {
          const vp = vs.filter((v) => v.piloto_id === p.id);
          const fin = vp.filter((v) => v.estado === "finalizado");
          const totalPagado = fin.reduce(
            (acc, v) => acc + (v.viatico_monto ?? 0),
            0,
          );
          const ultimo =
            vp.length > 0
              ? [...vp].sort((a, b) =>
                  b.created_at.localeCompare(a.created_at),
                )[0].created_at
              : null;
          return {
            piloto_id: p.id,
            piloto_nombre: p.nombre,
            viatico_por_viaje: p.viatico_monto,
            total_viajes: vp.length,
            viajes_finalizados: fin.length,
            total_viaticos_pagados: totalPagado,
            ultimo_viaje: ultimo,
          };
        });
        setResumen(r);
      }
      if (active) setLoadingResumen(false);
    }
    loadResumen();
    return () => {
      active = false;
    };
  }, [tab]);

  const cargarDetalleViaticos = useCallback(async (piloto: PilotoRow) => {
    setPilotoDetalle(piloto);
    setLoadingDetalle(true);
    const { data } = await supabase
      .from("viajes")
      .select("*, piloto:pilotos(nombre)")
      .eq("piloto_id", piloto.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setViajesDetalle((data as unknown as ViajeConPiloto[]) ?? []);
    setLoadingDetalle(false);
  }, []);

  // ─────────────────────────────────────────────────────────
  // Guardar nuevo piloto
  // ─────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    setSaveError(null);
    if (!fNombre.trim()) {
      setSaveError("El nombre es obligatorio.");
      return;
    }
    const montoNum = parseFloat(fViatico);
    if (isNaN(montoNum) || montoNum < VIATICO_MIN || montoNum > VIATICO_MAX) {
      setSaveError(
        `El viático debe estar entre Q${VIATICO_MIN} y Q${VIATICO_MAX}.`,
      );
      return;
    }
    setSaving(true);
    const payload: PilotoInsert = {
      nombre: fNombre.trim(),
      telefono: fTelefono.trim() || null,
      licencia: fLicencia.trim() || null,
      viatico_monto: montoNum,
      activo: true,
    };
    const { error } = await supabase.from("pilotos").insert(payload);
    setSaving(false);
    if (error) {
      setSaveError(`Error al guardar: ${error.message}`);
      return;
    }
    setSaveOk(true);
    resetForm();
    await refetchPilotos();
    setTimeout(() => {
      setSaveOk(false);
      setTab("lista");
    }, 1600);
  };

  // Confirmar edición inline (viatico_monto o activo)
  const handleConfirmarEdicion = async () => {
    if (!editando) return;
    setActionBusy(true);
    let update: PilotoUpdate = {};
    if (editando.campo === "viatico_monto") {
      const val = parseFloat(editando.valor);
      if (!isNaN(val) && val >= VIATICO_MIN && val <= VIATICO_MAX) {
        update = { viatico_monto: val };
      }
    } else {
      update = { activo: editando.valor === "true" };
    }
    await supabase.from("pilotos").update(update).eq("id", editando.id);
    await refetchPilotos();
    setEditando(null);
    setActionBusy(false);
  };

  const handleConfirmarEliminacion = async () => {
    if (!eliminando) return;
    setActionBusy(true);
    await supabase.from("pilotos").delete().eq("id", eliminando);
    await refetchPilotos();
    setEliminando(null);
    setActionBusy(false);
  };

  const resetForm = () => {
    setFNombre("");
    setFTelefono("");
    setFLicencia("");
    setFViatico(String(VIATICO_DEFAULT));
    setSaveError(null);
  };
  const resetAcciones = () => {
    setEditando(null);
    setEliminando(null);
  };

  const formatFecha = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("es-GT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";
  const formatMoneda = (n: number) =>
    `Q${n.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

  const TABS = [
    { id: "lista" as TabPilotos, label: "Pilotos", count: pilotos.length },
    { id: "viaticos" as TabPilotos, label: "Viáticos" },
    { id: "registrar" as TabPilotos, label: "+ Registrar piloto" },
  ];

  // ─────────────────────────────────────────────────────────
  // Celdas inline de estado, viático y acciones
  // ─────────────────────────────────────────────────────────
  function CeldaEstado({ p }: { p: PilotoRow }) {
    if (editando?.id === p.id && editando.campo === "activo") {
      return (
        <select
          value={editando.valor}
          onChange={(e) =>
            setEditando((prev) =>
              prev ? { ...prev, valor: e.target.value } : null,
            )
          }
          autoFocus
          className="border-2 border-blue-300 rounded-lg px-2 py-1 text-xs text-slate-800
            bg-white focus:outline-none focus:border-blue-400 cursor-pointer min-w-27.5"
        >
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </select>
      );
    }
    return <BadgeActivo activo={p.activo} />;
  }

  function CeldaViatico({ p }: { p: PilotoRow }) {
    if (editando?.id === p.id && editando.campo === "viatico_monto") {
      return (
        <input
          type="number"
          value={editando.valor}
          min={VIATICO_MIN}
          max={VIATICO_MAX}
          onChange={(e) =>
            setEditando((prev) =>
              prev ? { ...prev, valor: e.target.value } : null,
            )
          }
          autoFocus
          className="border-2 border-amber-300 rounded-lg px-2 py-1 text-xs text-slate-800
            bg-white focus:outline-none focus:border-amber-400 w-24 tabular-nums"
        />
      );
    }
    return (
      <span className="tabular-nums font-medium text-slate-700">
        {formatMoneda(p.viatico_monto)}
      </span>
    );
  }

  function CeldaAcciones({ p }: { p: PilotoRow }) {
    const isEditing = editando?.id === p.id;
    const isDeleting = eliminando === p.id;

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={handleConfirmarEdicion}
            disabled={actionBusy}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600
              disabled:bg-green-300 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            {actionBusy ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "✓"
            )}
            Guardar
          </button>
          <button
            onClick={resetAcciones}
            disabled={actionBusy}
            className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold
              rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      );
    }

    if (isDeleting) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600 font-semibold">¿Eliminar?</span>
          <button
            onClick={handleConfirmarEliminacion}
            disabled={actionBusy}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600
              disabled:bg-red-300 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            {actionBusy && (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
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
      );
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => {
            resetAcciones();
            setEditando({ id: p.id, campo: "activo", valor: String(p.activo) });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700
            text-xs font-semibold rounded-lg hover:bg-blue-50 hover:border-blue-300
            hover:text-blue-700 transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <path d="M11.333 2a1.886 1.886 0 012.667 2.667L4.667 14H2v-2.667L11.333 2z" />
          </svg>
          Estado
        </button>
        <button
          onClick={() => {
            resetAcciones();
            setEditando({
              id: p.id,
              campo: "viatico_monto",
              valor: String(p.viatico_monto),
            });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700
            text-xs font-semibold rounded-lg hover:bg-amber-50 hover:border-amber-300
            hover:text-amber-700 transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <path d="M8 2v12M5 5h4.5a2.5 2.5 0 010 5H5M5 10h5" />
          </svg>
          Viático
        </button>
        <button
          onClick={() => {
            resetAcciones();
            setEliminando(p.id);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700
            text-xs font-semibold rounded-lg hover:bg-red-50 hover:border-red-300
            hover:text-red-600 transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <path d="M2 4h12M5.333 4V2.667h5.334V4M6.667 7.333v4M9.333 7.333v4M3.333 4l.667 9.333h8L12.667 4" />
          </svg>
          Eliminar
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto">
      {/* ── Tabs centrados (idénticos a Flota.tsx) ── */}
      <div className="flex justify-center">
        <div
          className="inline-flex bg-white border border-slate-200 p-1 rounded-2xl
          shadow-sm gap-1 flex-wrap justify-center"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                resetAcciones();
                setPilotoDetalle(null);
              }}
              className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm
                font-semibold transition-all duration-200 cursor-pointer
                ${
                  tab === t.id
                    ? t.id === "registrar"
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-slate-900 text-white shadow-md"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-full leading-none
                  ${tab === t.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ TAB: LISTA ══════════════ */}
      {tab === "lista" && (
        <div className="space-y-4">
          {loading ? (
            <LoadingSkeleton />
          ) : pilotos.length === 0 ? (
            <div
              className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16
              flex flex-col items-center gap-4 text-center px-6"
            >
              <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center">
                <IconoPiloto size={48} />
              </div>
              <div>
                <p className="font-bold text-slate-700 text-lg">
                  Sin pilotos registrados
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Registra el primer conductor para comenzar
                </p>
              </div>
              <button
                onClick={() => setTab("registrar")}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white
                  px-6 py-3 rounded-xl font-bold transition-colors cursor-pointer shadow-md shadow-orange-200"
              >
                + Registrar piloto
              </button>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hidden md:block">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                  <IconoPiloto size={28} />
                  <h3 className="font-bold text-slate-800">
                    Pilotos registrados
                  </h3>
                  <span className="ml-auto text-xs text-slate-400">
                    {pilotos.filter((p) => p.activo).length} activos de{" "}
                    {pilotos.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {[
                          "Nombre",
                          "Teléfono",
                          "Licencia",
                          "Viático",
                          "Estado",
                          "Acciones",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left px-4 py-3 text-xs font-bold
                            text-slate-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pilotos.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-8 h-8 bg-linear-to-br from-slate-300 to-slate-500
                                rounded-full flex items-center justify-center text-xs font-black
                                text-white shrink-0"
                              >
                                {p.nombre.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-800">
                                {p.nombre}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 tabular-nums">
                            {p.telefono ?? "—"}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                            {p.licencia ?? "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <CeldaViatico p={p} />
                          </td>
                          <td className="px-4 py-3.5">
                            <CeldaEstado p={p} />
                          </td>
                          <td className="px-4 py-3.5">
                            <CeldaAcciones p={p} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Móvil */}
              <div className="md:hidden space-y-3">
                {pilotos.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 bg-linear-to-br from-slate-300 to-slate-500
                          rounded-full flex items-center justify-center text-sm font-black
                          text-white shrink-0"
                        >
                          {p.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{p.nombre}</p>
                          {p.telefono && (
                            <p className="text-xs text-slate-400">
                              {p.telefono}
                            </p>
                          )}
                        </div>
                      </div>
                      <CeldaEstado p={p} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span>
                        Licencia:{" "}
                        <span className="font-mono">{p.licencia ?? "—"}</span>
                      </span>
                      <span className="font-semibold text-slate-700">
                        Viático: {formatMoneda(p.viatico_monto)}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-slate-100">
                      <CeldaAcciones p={p} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════ TAB: VIÁTICOS ══════════════ */}
      {tab === "viaticos" && (
        <div className="space-y-4">
          {pilotoDetalle ? (
            /* Detalle de viajes de un piloto */
            <div className="space-y-4">
              <button
                onClick={() => {
                  setPilotoDetalle(null);
                  setViajesDetalle([]);
                }}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800
                  transition-colors cursor-pointer"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <polyline points="10 12 6 8 10 4" />
                </svg>
                Volver al resumen ·{" "}
                <span className="font-bold text-slate-700">
                  {pilotoDetalle.nombre}
                </span>
              </button>

              {/* KPIs del piloto */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: "Total viajes",
                    valor: viajesDetalle.length.toString(),
                    color: "text-slate-800",
                  },
                  {
                    label: "Finalizados",
                    valor: viajesDetalle
                      .filter((v) => v.estado === "finalizado")
                      .length.toString(),
                    color: "text-green-700",
                  },
                  {
                    label: "Viático/viaje",
                    valor: formatMoneda(pilotoDetalle.viatico_monto),
                    color: "text-amber-700",
                  },
                  {
                    label: "Total pagado",
                    valor: formatMoneda(
                      viajesDetalle
                        .filter((v) => v.estado === "finalizado")
                        .reduce((a, v) => a + (v.viatico_monto ?? 0), 0),
                    ),
                    color: "text-blue-700",
                  },
                ].map(({ label, valor, color }) => (
                  <div
                    key={label}
                    className="bg-white rounded-xl border border-slate-200 p-4"
                  >
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {label}
                    </p>
                    <p
                      className={`text-2xl font-black tabular-nums leading-tight mt-1 ${color}`}
                    >
                      {valor}
                    </p>
                  </div>
                ))}
              </div>

              {loadingDetalle ? (
                <LoadingSkeleton />
              ) : viajesDetalle.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                  <p className="text-slate-400 text-sm">
                    Este piloto no tiene viajes registrados aún
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hidden md:block">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                      <h4 className="font-bold text-slate-800 text-sm">
                        Historial de viajes
                      </h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            {[
                              "Código",
                              "Ruta",
                              "Estado",
                              "Fecha",
                              "Viático",
                            ].map((h) => (
                              <th
                                key={h}
                                className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {viajesDetalle.map((v) => {
                            const cfg = (
                              {
                                programado: {
                                  bg: "bg-slate-100",
                                  text: "text-slate-600",
                                  dot: "bg-slate-400",
                                },
                                en_transito: {
                                  bg: "bg-blue-100",
                                  text: "text-blue-800",
                                  dot: "bg-blue-500",
                                },
                                en_destino: {
                                  bg: "bg-amber-100",
                                  text: "text-amber-800",
                                  dot: "bg-amber-500",
                                },
                                finalizado: {
                                  bg: "bg-green-100",
                                  text: "text-green-800",
                                  dot: "bg-green-600",
                                },
                                cancelado: {
                                  bg: "bg-red-100",
                                  text: "text-red-700",
                                  dot: "bg-red-400",
                                },
                              } as Record<
                                string,
                                { bg: string; text: string; dot: string }
                              >
                            )[v.estado] ?? {
                              bg: "bg-slate-100",
                              text: "text-slate-600",
                              dot: "bg-slate-400",
                            };
                            return (
                              <tr
                                key={v.id}
                                className="border-b border-slate-50 hover:bg-slate-50/60"
                              >
                                <td className="px-4 py-3 font-mono text-xs text-slate-400">
                                  {v.codigo ?? v.id.slice(0, 8)}
                                </td>
                                <td className="px-4 py-3 text-slate-600 text-xs">
                                  {v.origen}
                                  <span className="text-slate-300 mx-1">→</span>
                                  {v.destino}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                                    />
                                    {v.estado.replace("_", " ")}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-xs tabular-nums">
                                  {formatFecha(v.created_at)}
                                </td>
                                <td className="px-4 py-3">
                                  {v.estado === "finalizado" ? (
                                    <span className="font-semibold text-green-700 tabular-nums">
                                      {formatMoneda(v.viatico_monto ?? 0)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">
                                      Pendiente
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Móvil */}
                  <div className="md:hidden space-y-2">
                    {viajesDetalle.map((v) => (
                      <div
                        key={v.id}
                        className="bg-white rounded-xl border border-slate-200 px-4 py-3"
                      >
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span className="font-mono">
                            {v.codigo ?? v.id.slice(0, 8)}
                          </span>
                          <span>{formatFecha(v.created_at)}</span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {v.origen} → {v.destino}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-500 capitalize">
                            {v.estado.replace("_", " ")}
                          </span>
                          <span
                            className={`text-sm font-bold tabular-nums ${v.estado === "finalizado" ? "text-green-700" : "text-slate-400"}`}
                          >
                            {v.estado === "finalizado"
                              ? formatMoneda(v.viatico_monto ?? 0)
                              : "Pendiente"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Resumen general de viáticos */
            <>
              {loadingResumen ? (
                <LoadingSkeleton />
              ) : resumen.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                  <p className="text-slate-400 text-sm">
                    Sin datos de viáticos aún
                  </p>
                </div>
              ) : (
                <>
                  {/* KPIs globales */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      {
                        label: "Total pagado",
                        valor: formatMoneda(
                          resumen.reduce(
                            (a, r) => a + r.total_viaticos_pagados,
                            0,
                          ),
                        ),
                        color: "text-green-700",
                        bg: "border-green-200",
                      },
                      {
                        label: "Viajes finalizados",
                        valor: resumen
                          .reduce((a, r) => a + r.viajes_finalizados, 0)
                          .toString(),
                        color: "text-blue-700",
                        bg: "border-blue-200",
                      },
                      {
                        label: "Pilotos activos",
                        valor: pilotos
                          .filter((p) => p.activo)
                          .length.toString(),
                        color: "text-slate-800",
                        bg: "",
                      },
                    ].map(({ label, valor, color, bg }) => (
                      <div
                        key={label}
                        className={`bg-white rounded-xl border border-slate-200 p-4 ${bg}`}
                      >
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          {label}
                        </p>
                        <p
                          className={`text-2xl font-black tabular-nums ${color}`}
                        >
                          {valor}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Tabla desktop */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hidden md:block">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-bold text-slate-800">
                        Resumen por piloto
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            {[
                              "Piloto",
                              "Viático/viaje",
                              "Viajes",
                              "Finalizados",
                              "Total pagado",
                              "Último viaje",
                              "",
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
                          {resumen.map((r) => (
                            <tr
                              key={r.piloto_id}
                              className="border-b border-slate-50 hover:bg-orange-50/20 transition-colors"
                            >
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className="w-7 h-7 bg-linear-to-br from-orange-300 to-orange-500
                                    rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                                  >
                                    {r.piloto_nombre.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-slate-800">
                                    {r.piloto_nombre}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 tabular-nums text-amber-700 font-medium">
                                {formatMoneda(r.viatico_por_viaje)}
                              </td>
                              <td className="px-4 py-3.5 text-slate-600 tabular-nums text-center">
                                {r.total_viajes}
                              </td>
                              <td className="px-4 py-3.5 text-green-700 tabular-nums font-medium text-center">
                                {r.viajes_finalizados}
                              </td>
                              <td className="px-4 py-3.5 tabular-nums font-bold text-slate-800">
                                {formatMoneda(r.total_viaticos_pagados)}
                              </td>
                              <td className="px-4 py-3.5 text-slate-400 text-xs tabular-nums">
                                {formatFecha(r.ultimo_viaje)}
                              </td>
                              <td className="px-4 py-3.5">
                                <button
                                  onClick={() => {
                                    const p = pilotos.find(
                                      (p) => p.id === r.piloto_id,
                                    );
                                    if (p) cargarDetalleViaticos(p);
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 border
                                    border-blue-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                >
                                  Ver detalle
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Móvil */}
                  <div className="md:hidden space-y-3">
                    {resumen.map((r) => (
                      <div
                        key={r.piloto_id}
                        className="bg-white rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex items-center gap-2.5 mb-3">
                          <div
                            className="w-9 h-9 bg-linear-to-br from-orange-300 to-orange-500
                            rounded-full flex items-center justify-center text-xs font-black text-white"
                          >
                            {r.piloto_nombre.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-bold text-slate-800">
                            {r.piloto_nombre}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          {[
                            {
                              label: "Viático/viaje",
                              valor: formatMoneda(r.viatico_por_viaje),
                              color: "text-amber-700",
                            },
                            {
                              label: "Total pagado",
                              valor: formatMoneda(r.total_viaticos_pagados),
                              color: "text-green-700",
                            },
                            {
                              label: "Viajes",
                              valor: String(r.total_viajes),
                              color: "text-slate-700",
                            },
                            {
                              label: "Finalizados",
                              valor: String(r.viajes_finalizados),
                              color: "text-blue-700",
                            },
                          ].map(({ label, valor, color }) => (
                            <div
                              key={label}
                              className="bg-slate-50 rounded-lg p-2"
                            >
                              <p className="text-slate-400 mb-0.5">{label}</p>
                              <p className={`font-bold tabular-nums ${color}`}>
                                {valor}
                              </p>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => {
                            const p = pilotos.find((p) => p.id === r.piloto_id);
                            if (p) cargarDetalleViaticos(p);
                          }}
                          className="w-full text-xs font-semibold text-blue-600 py-2 border
                            border-blue-200 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          Ver detalle de viajes →
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════ TAB: REGISTRAR ══════════════ */}
      {tab === "registrar" && (
        <div className="w-full">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header idéntico al de Flota.tsx */}
            <div className="bg-linear-to-r from-slate-800 to-slate-900 px-6 md:px-8 py-5">
              <h3 className="font-bold text-white text-xl">Registrar Piloto</h3>
              <p className="text-slate-400 text-sm mt-1">
                El piloto quedará disponible para asignar en viajes
                inmediatamente
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                <Field label="Nombre completo" required>
                  <input
                    type="text"
                    value={fNombre}
                    onChange={(e) => setFNombre(e.target.value)}
                    placeholder="Ej. Carlos Ramírez"
                    className={inputCls}
                  />
                </Field>

                <Field label="Número de teléfono">
                  <input
                    type="tel"
                    value={fTelefono}
                    onChange={(e) => setFTelefono(e.target.value)}
                    placeholder="Ej. 5555-1234"
                    className={inputCls}
                  />
                </Field>

                <Field label="Número de licencia">
                  <input
                    type="text"
                    value={fLicencia}
                    onChange={(e) => setFLicencia(e.target.value.toUpperCase())}
                    placeholder="Ej. 1234567"
                    className={inputCls}
                  />
                </Field>

                <Field
                  label={`Monto de viático (Q${VIATICO_MIN}–Q${VIATICO_MAX})`}
                  required
                >
                  <div className="relative">
                    <span
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold
                      text-slate-500 pointer-events-none"
                    >
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
                  <p className="text-xs text-slate-400 mt-1">
                    Rango: Q{VIATICO_MIN} – Q{VIATICO_MAX} por viaje
                  </p>
                </Field>
              </div>

              {saveError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <span className="text-base mt-0.5 shrink-0">⚠</span>
                  <p className="text-sm font-medium">{saveError}</p>
                </div>
              )}
              {saveOk && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
                  <span className="text-lg">✓</span>
                  <p className="text-sm font-bold">
                    Piloto registrado correctamente.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleGuardar}
                  disabled={saving || saveOk}
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
                    "+ Guardar piloto"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setTab("lista");
                  }}
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
  );
}

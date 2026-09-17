// Módulo de gestión de clientes directos e indirectos.
// Interfaz visual completa — funcionalidad Supabase en siguiente fase.

"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useClientes } from "@/hooks/useClientes";
import { useViajes } from "@/hooks/useViajes";

type TabId = "lista" | "ingresos" | "registrar";
type TipoCliente = "directo" | "indirecto";

interface IngresoClienteUI {
  cliente_id: string;
  cliente_nombre: string;
  tipo: TipoCliente;
  fletes: number;
  rentas: number;
  total_servicios: number;
  total_ingresos: number | null;
  ultimo_servicio: string | null;
}

const TIPO_CONFIG: Record<
  TipoCliente,
  { label: string; bg: string; text: string; dot: string }
> = {
  directo: {
    label: "Directo",
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
  },
  indirecto: {
    label: "Indirecto",
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
  },
};

const inputCls =
  "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white " +
  "focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 " +
  "transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed";

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

function TipoBadge({ tipo }: { tipo: TipoCliente }) {
  const cfg = TIPO_CONFIG[tipo];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// Icono SVG decorativo para el encabezado de la tabla
function IconoClientes({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-blue-600"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export default function Clientes() {
  const { clientes, loading, error, refetch } = useClientes();
  const { viajes } = useViajes();
  const [tab, setTab] = useState<TabId>("lista");

  // Estado de acciones inline (visual, sin lógica aún)
  const [accionId, setAccionId] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Formulario
  const [fNombre, setFNombre] = useState("");
  const [fTipo, setFTipo] = useState<TipoCliente>("directo");
  const [fTelefono, setFTelefono] = useState("");
  const [fCorreo, setFCorreo] = useState("");
  const [fDireccion, setFDireccion] = useState("");

  const ingresos = useMemo<IngresoClienteUI[]>(
    () =>
      clientes.map((cliente) => {
        const viajesCliente = viajes.filter(
          (viaje) => viaje.cliente_id === cliente.id,
        );
        const ultimo = [...viajesCliente].sort((a, b) =>
          b.created_at.localeCompare(a.created_at),
        )[0];
        return {
          cliente_id: cliente.id,
          cliente_nombre: cliente.nombre,
          tipo: cliente.tipo,
          fletes: viajesCliente.filter((viaje) => viaje.tipo_servicio === "flete").length,
          rentas: viajesCliente.filter((viaje) => viaje.tipo_servicio === "renta").length,
          total_servicios: viajesCliente.length,
          total_ingresos: null,
          ultimo_servicio: ultimo?.created_at ?? null,
        };
      }),
    [clientes, viajes],
  );

  const formatMoneda = (n: number | null) =>
    n === null
      ? "—"
      : `Q${n.toLocaleString("es-GT", { minimumFractionDigits: 2 })}`;

  function resetForm() {
    setEditandoId(null);
    setFNombre("");
    setFTipo("directo");
    setFTelefono("");
    setFCorreo("");
    setFDireccion("");
  }

  function iniciarEdicion(cliente: (typeof clientes)[number]) {
    setEditandoId(cliente.id);
    setFNombre(cliente.nombre);
    setFTipo(cliente.tipo);
    setFTelefono(cliente.telefono ?? "");
    setFCorreo(cliente.correo ?? "");
    setFDireccion(cliente.direccion ?? "");
    setMensaje(null);
    setTab("registrar");
  }

  async function handleGuardarCliente() {
    if (!fNombre.trim()) {
      setMensaje("El nombre del cliente es obligatorio.");
      return;
    }

    setGuardando(true);
    setMensaje(null);
    const payload = {
      nombre: fNombre.trim(),
      tipo: fTipo,
      telefono: fTelefono.trim() || null,
      correo: fCorreo.trim() || null,
      direccion: fDireccion.trim() || null,
    };

    const result = editandoId
      ? await supabase.from("clientes").update(payload).eq("id", editandoId)
      : await supabase.from("clientes").insert(payload);

    setGuardando(false);
    if (result.error) {
      setMensaje(result.error.message);
      return;
    }

    await refetch();
    resetForm();
    setMensaje(null);
    setTab("lista");
  }

  async function handleToggleActivo(cliente: (typeof clientes)[number]) {
    setAccionId(null);
    const { error: updateError } = await supabase
      .from("clientes")
      .update({ activo: !cliente.activo })
      .eq("id", cliente.id);
    if (updateError) {
      setMensaje(updateError.message);
      return;
    }
    await refetch();
  }

  const TABS = [
    { id: "lista" as TabId, label: "Clientes", count: clientes.length },
    { id: "ingresos" as TabId, label: "Ingresos" },
    { id: "registrar" as TabId, label: "+ Registrar cliente" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto">
      {(loading || error) && (
        <p className={`text-sm ${error ? "text-red-600" : "text-slate-400"}`}>
          {error ?? "Cargando clientes…"}
        </p>
      )}
      {/* ── Tabs centrados ── */}
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
                setAccionId(null);
                setDetalleId(null);
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
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Total clientes",
                valor: clientes.length,
                color: "text-slate-800",
              },
              {
                label: "Activos",
                valor: clientes.filter((c) => c.activo).length,
                color: "text-green-700",
              },
              {
                label: "Directos",
                valor: clientes.filter((c) => c.tipo === "directo").length,
                color: "text-blue-700",
              },
              {
                label: "Indirectos",
                valor: clientes.filter((c) => c.tipo === "indirecto")
                  .length,
                color: "text-slate-600",
              },
            ].map(({ label, valor, color }) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {label}
                </p>
                <p className={`text-2xl font-black tabular-nums mt-1 ${color}`}>
                  {valor}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hidden md:block">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <IconoClientes size={18} />
              </div>
              <h3 className="font-bold text-slate-800">Clientes registrados</h3>
              <span className="ml-auto text-xs text-slate-400">
                {clientes.filter((c) => c.activo).length} activos de{" "}
                {clientes.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      "Cliente",
                      "Tipo",
                      "Teléfono",
                      "Correo",
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
                  {clientes.map((c) => {
                    const isAction = accionId === c.id;
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Nombre */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center
                              text-xs font-black text-white shrink-0
                              ${
                                c.tipo === "directo"
                                  ? "bg-linear-to-br from-blue-400 to-blue-600"
                                  : "bg-linear-to-br from-slate-300 to-slate-500"
                              }`}
                            >
                              {c.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {c.nombre}
                              </p>
                              {c.direccion && (
                                <p className="text-xs text-slate-400 truncate max-w-50">
                                  {c.direccion}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Tipo */}
                        <td className="px-4 py-3.5">
                          <TipoBadge tipo={c.tipo} />
                        </td>
                        {/* Teléfono */}
                        <td className="px-4 py-3.5 text-slate-500 tabular-nums text-sm">
                          {c.telefono ?? "—"}
                        </td>
                        {/* Correo */}
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          {c.correo ?? "—"}
                        </td>
                        {/* Estado */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1
                            rounded-full text-xs font-semibold
                            ${c.activo ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full
                              ${c.activo ? "bg-green-500" : "bg-slate-400"}`}
                            />
                            {c.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        {/* Acciones */}
                        <td className="px-4 py-3.5">
                          {isAction ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium mr-1">
                                {c.activo ? "¿Desactivar?" : "¿Activar?"}
                              </span>
                               <button
                                 onClick={() => handleToggleActivo(c)}
                                className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg
                                  transition-colors cursor-pointer
                                  ${c.activo ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setAccionId(null)}
                                className="px-3 py-1.5 border border-slate-200 text-slate-600
                                  text-xs font-semibold rounded-lg hover:bg-slate-100
                                  transition-colors cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                             <div className="flex items-center gap-2">
                               <button
                                 onClick={() => iniciarEdicion(c)}
                                 className="flex items-center gap-1.5 px-3 py-1.5 border
                                   border-slate-200 text-slate-700 text-xs font-semibold rounded-lg
                                   hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700
                                   transition-colors cursor-pointer"
                               >
                                 Editar
                               </button>
                               {/* Ver ingresos */}
                              <button
                                onClick={() => {
                                  setTab("ingresos");
                                  setDetalleId(c.id);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 border
                                  border-slate-200 text-slate-700 text-xs font-semibold rounded-lg
                                  hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700
                                  transition-colors cursor-pointer"
                              >
                                <svg
                                  viewBox="0 0 14 14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-3 h-3"
                                >
                                  <path d="M7 2v10M4 5h4.5a2 2 0 010 4H4M4 9h5" />
                                </svg>
                                Ingresos
                              </button>
                              {/* Activar / Desactivar */}
                              <button
                                onClick={() => setAccionId(c.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 border
                                  text-xs font-semibold rounded-lg transition-colors cursor-pointer
                                  ${
                                    c.activo
                                      ? "border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                                      : "border-slate-200 text-slate-700 hover:bg-green-50 hover:border-green-300 hover:text-green-600"
                                  }`}
                              >
                                {c.activo ? (
                                  <>
                                    <svg
                                      viewBox="0 0 14 14"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      className="w-3 h-3"
                                    >
                                      <circle cx="7" cy="7" r="5" />
                                      <line
                                        x1="4.5"
                                        y1="4.5"
                                        x2="9.5"
                                        y2="9.5"
                                      />
                                      <line
                                        x1="9.5"
                                        y1="4.5"
                                        x2="4.5"
                                        y2="9.5"
                                      />
                                    </svg>
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      viewBox="0 0 14 14"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="w-3 h-3"
                                    >
                                      <polyline points="2 7 5.5 10.5 12 3.5" />
                                    </svg>
                                    Activar
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Móvil: cards */}
          <div className="md:hidden space-y-3">
            {clientes.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center
                      text-sm font-black text-white shrink-0
                      ${
                        c.tipo === "directo"
                          ? "bg-linear-to-br from-blue-400 to-blue-600"
                          : "bg-linear-to-br from-slate-300 to-slate-500"
                      }`}
                    >
                      {c.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{c.nombre}</p>
                      {c.telefono && (
                        <p className="text-xs text-slate-400">{c.telefono}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                    text-xs font-semibold shrink-0
                    ${c.activo ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${c.activo ? "bg-green-500" : "bg-slate-400"}`}
                    />
                    {c.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mb-3">
                  <TipoBadge tipo={c.tipo} />
                  {c.correo && (
                    <span className="text-slate-400 truncate ml-2 max-w-40">
                      {c.correo}
                    </span>
                  )}
                </div>
                {c.direccion && (
                  <p className="text-xs text-slate-400 mb-3">{c.direccion}</p>
                )}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setTab("ingresos");
                      setDetalleId(c.id);
                    }}
                    className="flex-1 py-2 text-xs font-semibold text-blue-700 border
                      border-blue-200 rounded-xl hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    Ver ingresos
                  </button>
                  <button
                    onClick={() => handleToggleActivo(c)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border
                      transition-colors cursor-pointer
                      ${
                        c.activo
                          ? "text-red-600 border-red-200 hover:bg-red-50"
                          : "text-green-700 border-green-200 hover:bg-green-50"
                      }`}
                  >
                    {c.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ TAB: INGRESOS ══════════════ */}
      {tab === "ingresos" && (
        <div className="space-y-4">
          {/* Información derivada de los viajes reales */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="#2563EB"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 shrink-0 mt-0.5"
            >
              <circle cx="10" cy="10" r="8" />
              <line x1="10" y1="6" x2="10" y2="10" />
              <line x1="10" y1="14" x2="10.01" y2="14" />
            </svg>
            <p className="text-sm text-blue-800">
                <span className="font-bold">Datos reales de viajes.</span>{" "}
                Los servicios se calculan desde la tabla de viajes. La tabla
                actual no contiene un importe de ingreso por servicio, por eso
                ese total se muestra como no disponible.
            </p>
          </div>

          {/* KPIs globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Total ingresos",
                valor: formatMoneda(
                  ingresos.reduce((a, r) => a + (r.total_ingresos ?? 0), 0),
                ),
                color: "text-green-700",
              },
              {
                label: "Fletes facturados",
                valor: String(ingresos.reduce((a, r) => a + r.fletes, 0)),
                color: "text-blue-700",
              },
              {
                label: "Rentas facturadas",
                valor: String(ingresos.reduce((a, r) => a + r.rentas, 0)),
                color: "text-purple-700",
              },
              {
                label: "Servicios totales",
                valor: String(
                  ingresos.reduce((a, r) => a + r.total_servicios, 0),
                ),
                color: "text-slate-800",
              },
            ].map(({ label, valor, color }) => (
              <div
                key={label}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {label}
                </p>
                <p className={`text-xl font-black tabular-nums mt-1 ${color}`}>
                  {valor}
                </p>
              </div>
            ))}
          </div>

          {/* Tabla de ingresos — desktop */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hidden md:block">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Ingresos por cliente</h3>
              <span className="text-xs text-slate-400">
                Ordenado por total generado
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      "Cliente",
                      "Tipo",
                      "Fletes",
                      "Rentas",
                      "Total servicios",
                      "Total ingresos",
                      "Último servicio",
                      "",
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
                  {[...ingresos].sort(
                    (a, b) => (b.total_ingresos ?? 0) - (a.total_ingresos ?? 0),
                  ).map((r, i) => (
                    <tr
                      key={r.cliente_id}
                      className={`border-b border-slate-50 hover:bg-orange-50/20 transition-colors
                        ${detalleId === r.cliente_id ? "bg-blue-50/40" : ""}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {/* Ranking visual */}
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center
                            text-[11px] font-black shrink-0
                            ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-500"}`}
                          >
                            {i + 1}
                          </div>
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center
                            text-xs font-black text-white shrink-0
                            ${
                              r.tipo === "directo"
                                ? "bg-linear-to-br from-blue-400 to-blue-600"
                                : "bg-linear-to-br from-slate-300 to-slate-500"
                            }`}
                          >
                            {r.cliente_nombre.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-800">
                            {r.cliente_nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <TipoBadge tipo={r.tipo} />
                      </td>
                      <td className="px-4 py-3.5 text-blue-700 font-semibold tabular-nums text-center">
                        {r.fletes}
                      </td>
                      <td className="px-4 py-3.5 text-purple-700 font-semibold tabular-nums text-center">
                        {r.rentas}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 tabular-nums text-center">
                        {r.total_servicios}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-green-700 tabular-nums">
                        {formatMoneda(r.total_ingresos)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                        {r.ultimo_servicio ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() =>
                            setDetalleId(
                              detalleId === r.cliente_id ? null : r.cliente_id,
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 border
                            border-blue-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer
                            whitespace-nowrap"
                        >
                          {detalleId === r.cliente_id
                            ? "Cerrar"
                            : "Ver detalle"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Fila de totales */}
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td
                      className="px-4 py-3 font-bold text-slate-700"
                      colSpan={2}
                    >
                      Total general
                    </td>
                    <td className="px-4 py-3 font-bold text-blue-700 tabular-nums text-center">
                      {ingresos.reduce((a, r) => a + r.fletes, 0)}
                    </td>
                    <td className="px-4 py-3 font-bold text-purple-700 tabular-nums text-center">
                      {ingresos.reduce((a, r) => a + r.rentas, 0)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700 tabular-nums text-center">
                      {ingresos.reduce((a, r) => a + r.total_servicios, 0)}
                    </td>
                    <td className="px-4 py-3 font-black text-green-700 tabular-nums text-lg">
                      {formatMoneda(
                        ingresos.reduce((a, r) => a + (r.total_ingresos ?? 0), 0),
                      )}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Móvil: cards de ingresos */}
          <div className="md:hidden space-y-3">
            {[...ingresos].sort(
              (a, b) => (b.total_ingresos ?? 0) - (a.total_ingresos ?? 0),
            ).map((r, i) => (
              <div
                key={r.cliente_id}
                className="bg-white rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center
                    text-[11px] font-black shrink-0
                    ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    {i + 1}
                  </div>
                  <p className="font-bold text-slate-800">{r.cliente_nombre}</p>
                  <TipoBadge tipo={r.tipo} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  {[
                    {
                      label: "Total ingresos",
                      valor: formatMoneda(r.total_ingresos),
                      color: "text-green-700",
                    },
                    {
                      label: "Servicios",
                      valor: String(r.total_servicios),
                      color: "text-slate-700",
                    },
                    {
                      label: "Fletes",
                      valor: String(r.fletes),
                      color: "text-blue-700",
                    },
                    {
                      label: "Rentas",
                      valor: String(r.rentas),
                      color: "text-purple-700",
                    },
                  ].map(({ label, valor, color }) => (
                    <div key={label} className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400 mb-0.5">{label}</p>
                      <p className={`font-bold tabular-nums ${color}`}>
                        {valor}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  Último servicio: {r.ultimo_servicio ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ TAB: REGISTRAR ══════════════ */}
      {tab === "registrar" && (
        <div className="w-full">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-linear-to-r from-slate-800 to-slate-900 px-6 md:px-8 py-5">
                <h3 className="font-bold text-white text-xl">
                {editandoId ? "Editar Cliente" : "Registrar Cliente"}
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                El cliente quedará disponible para asociar a fletes y rentas
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {/* Sección 1: Identificación */}
              <div className="space-y-4">
                <h4
                  className="text-xs font-black text-slate-500 uppercase tracking-widest
                  flex items-center gap-2"
                >
                  <span
                    className="w-5 h-5 bg-blue-100 text-blue-700 rounded-md flex items-center
                    justify-center text-[10px] font-black"
                  >
                    1
                  </span>
                  Identificación
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Nombre o razón social" required>
                    <input
                      type="text"
                      value={fNombre}
                      onChange={(event) => setFNombre(event.target.value)}
                      placeholder="Ej. Importaciones del Norte S.A."
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Tipo de cliente" required>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        {
                          v: "directo" as TipoCliente,
                          l: "Directo",
                          desc: "Contrata el servicio directamente",
                        },
                        {
                          v: "indirecto" as TipoCliente,
                          l: "Indirecto",
                          desc: "A través de intermediario",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setFTipo(opt.v)}
                          className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2
                            font-semibold transition-all cursor-pointer text-left
                            ${
                              fTipo === opt.v
                                ? "bg-blue-50 border-blue-400 text-blue-800 shadow-sm"
                                : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                        >
                          <span className="text-sm font-bold">{opt.l}</span>
                          <span className="text-xs font-normal opacity-70 leading-tight">
                            {opt.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>

              <div className="border-t border-slate-100" />

              {/* Sección 2: Contacto */}
              <div className="space-y-4">
                <h4
                  className="text-xs font-black text-slate-500 uppercase tracking-widest
                  flex items-center gap-2"
                >
                  <span
                    className="w-5 h-5 bg-green-100 text-green-700 rounded-md flex items-center
                    justify-center text-[10px] font-black"
                  >
                    2
                  </span>
                  Información de contacto
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  <Field label="Número de teléfono">
                    <input
                      type="tel"
                      value={fTelefono}
                      onChange={(event) => setFTelefono(event.target.value)}
                      placeholder="Ej. 2345-6789"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Correo electrónico">
                    <input
                      type="email"
                      value={fCorreo}
                      onChange={(event) => setFCorreo(event.target.value)}
                      placeholder="contacto@empresa.gt"
                      className={inputCls}
                    />
                  </Field>
                  <div className="md:col-span-2 xl:col-span-1">
                    <Field label="Dirección">
                      <input
                        type="text"
                        value={fDireccion}
                        onChange={(event) => setFDireccion(event.target.value)}
                        placeholder="Ej. Zona Industrial, Guatemala"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              {/* Aviso funcionalidad */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 shrink-0 mt-0.5"
                >
                  <path d="M8.57 3.43L1.5 15.5a1.67 1.67 0 001.43 2.5h13.14a1.67 1.67 0 001.43-2.5L10.43 3.43a1.67 1.67 0 00-2.86 0z" />
                  <line x1="10" y1="8" x2="10" y2="12" />
                  <line x1="10" y1="15" x2="10.01" y2="15" />
                </svg>
                <p className="text-sm text-amber-800">
                  <span className="font-bold">
                    {mensaje ?? "Los cambios se guardarán en Supabase."}
                  </span>
                </p>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleGuardarCliente}
                  disabled={guardando}
                  className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-base rounded-xl
                    font-bold transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <line x1="8" y1="2" x2="8" y2="14" />
                    <line x1="2" y1="8" x2="14" y2="8" />
                  </svg>
                  {guardando ? "Guardando…" : editandoId ? "Guardar cambios" : "Guardar cliente"}
                </button>
                <button
                  type="button"
                   onClick={() => { resetForm(); setTab("lista"); }}
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

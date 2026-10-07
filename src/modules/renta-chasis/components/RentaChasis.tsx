"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  useRentasChasis,
  type RentaChasisConRelaciones,
  type RentaChasisInsert,
} from "@/hooks/useRentasChasis";
import { modalidadLabel, useTiposRenta } from "@/hooks/useTiposRenta";
import type { Database, ModalidadRentaDB } from "@/types/database";

type ChasisRow = Database["public"]["Tables"]["chasis"]["Row"];
type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type RentaChasisUpdate = Database["public"]["Tables"]["rentas_chasis"]["Update"];
type EstadoFiltro = "activa" | "cerrada" | "cancelada" | "todas";
type AccionRenta = "cerrar" | "cancelar";
type VistaRenta = "rentas" | "historial" | "nueva";

const RENTA_UBICACION_KEY = "pimot:renta-chasis:ubicacion";

function leerUbicacionInicial(): { vista: VistaRenta; rentaId: string | null } {
  if (typeof window === "undefined") return { vista: "rentas", rentaId: null };
  const params = new URLSearchParams(window.location.search);
  const almacenada = sessionStorage.getItem(RENTA_UBICACION_KEY);
  let respaldo: Partial<{ vista: VistaRenta; rentaId: string | null }> = {};
  if (almacenada) {
    try {
      respaldo = JSON.parse(almacenada) as typeof respaldo;
    } catch {
      respaldo = {};
    }
  }
  const vistaParam = params.get("seccion");
  const vistaDesdeUrl = vistaParam === "rentas" || vistaParam === "historial" || vistaParam === "nueva"
    ? vistaParam
    : null;
  const vista: VistaRenta = vistaDesdeUrl
    ?? (respaldo.vista === "rentas" || respaldo.vista === "historial" || respaldo.vista === "nueva"
      ? respaldo.vista
      : "rentas");
  return {
    vista,
    rentaId: vistaDesdeUrl ? params.get("rentaId") : params.get("rentaId") ?? respaldo.rentaId ?? null,
  };
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

function money(value: number) {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
  }).format(value);
}

function daysBetween(start: string, end: string) {
  if (!start || !end) return 1;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1,
  );
}

function estadoConfig(estado: string) {
  if (estado === "activa") {
    return {
      label: "Activa",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    };
  }
  return {
    label: "Cerrada",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-500",
  };
}

function tipoRentaTexto(nombre: string, modalidad: ModalidadRentaDB) {
  const modalidadTexto = modalidadLabel(modalidad);
  return nombre.toLocaleLowerCase().includes(modalidadTexto.toLocaleLowerCase())
    ? nombre
    : `${nombre} · ${modalidadTexto}`;
}

function EditarIcono() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 sm:w-5 sm:h-5"
      aria-hidden="true"
    >
      <path d="M11.333 2a1.886 1.886 0 012.667 2.667L4.667 14H2v-2.667L11.333 2z" />
    </svg>
  );
}

function EliminarIcono() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 sm:w-5 sm:h-5"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function RentaChasis() {
  const pathname = usePathname();
  const [ubicacionInicial] = useState(leerUbicacionInicial);
  const { profile } = useAuth();
  const esAdmin = profile?.rol === "admin";
  const puedeGestionar = esAdmin || profile?.rol === "operativo";
  const {
    rentas,
    loading,
    error,
    refetch,
    crearRenta,
    finalizarRenta,
    cancelarRenta,
  } = useRentasChasis();
  const {
    tipos,
    loading: tiposLoading,
    error: tiposError,
    crearTipo,
    actualizarTipo,
    eliminarTipo,
  } = useTiposRenta();
  const [chasis, setChasis] = useState<ChasisRow[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [vista, setVista] = useState<VistaRenta>(ubicacionInicial.vista);
  const [rentaId, setRentaId] = useState<string | null>(ubicacionInicial.rentaId);
  const [filtro, setFiltro] = useState<EstadoFiltro>(
    ubicacionInicial.vista === "historial" ? "todas" : "activa",
  );
  const [seccion, setSeccion] = useState<"rentas" | "catalogo">("rentas");
  const [mostrarFormulario, setMostrarFormulario] = useState(ubicacionInicial.vista === "nueva");
  const [rentaEditando, setRentaEditando] =
    useState<RentaChasisConRelaciones | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [form, setForm] = useState({
    chasis_id: "",
    cliente_id: "",
    tipo_renta_id: "",
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: "",
    dias_extra: "0",
    notas: "",
  });
  const [confirmando, setConfirmando] = useState<{
    id: string;
    accion: AccionRenta;
  } | null>(null);
  const [estadoAbierto, setEstadoAbierto] = useState<string | null>(null);
  const [tipoEditando, setTipoEditando] = useState<string | null>(null);
  const [tipoForm, setTipoForm] = useState({
    nombre: "",
    modalidad: "por_viaje" as ModalidadRentaDB,
    precio_base: "",
    dias_incluidos: "0",
    precio_dia_extra: "0",
  });

  async function cargarCatalogos() {
    const [chasisResult, clientesResult] = await Promise.all([
      supabase
        .from("chasis")
        .select("*")
        .eq("estado", "disponible")
        .order("placa"),
      supabase.from("clientes").select("*").eq("activo", true).order("nombre"),
    ]);
    setChasis(chasisResult.data ?? []);
    setClientes(clientesResult.data ?? []);
  }

  useEffect(() => {
    let active = true;
    async function cargar() {
      const [chasisResult, clientesResult] = await Promise.all([
        supabase
          .from("chasis")
          .select("*")
          .eq("estado", "disponible")
          .order("placa"),
        supabase
          .from("clientes")
          .select("*")
          .eq("activo", true)
          .order("nombre"),
      ]);
      if (!active) return;
      setChasis(chasisResult.data ?? []);
      setClientes(clientesResult.data ?? []);
    }
    cargar();
    return () => {
      active = false;
    };
  }, [rentas.length]);

  const tipoSeleccionado = tipos.find((tipo) => tipo.id === form.tipo_renta_id);
  const dias = daysBetween(form.fecha_inicio, form.fecha_fin);
  const diasExtra = Math.max(0, Number(form.dias_extra) || 0);
  const costoPreview = tipoSeleccionado
    ? tipoSeleccionado.modalidad === "por_dia"
      ? tipoSeleccionado.precio_base * (form.fecha_fin ? dias : 1)
      : tipoSeleccionado.precio_base +
        diasExtra * tipoSeleccionado.precio_dia_extra
    : 0;
  const rentasFiltradas = useMemo(
    () =>
      filtro === "todas"
        ? rentas
        : rentas.filter((renta) => renta.estado === filtro),
    [filtro, rentas],
  );

  useEffect(() => {
    const ubicacion = { modulo: "renta-chasis", vista, rentaId };
    sessionStorage.setItem(RENTA_UBICACION_KEY, JSON.stringify(ubicacion));
    const params = new URLSearchParams();
    params.set("modulo", "renta-chasis");
    params.set("seccion", vista);
    if (rentaId) params.set("rentaId", rentaId);
    const query = params.toString();
    if (window.location.search.slice(1) !== query) {
      window.history.replaceState(window.history.state, "", `${pathname}?${query}`);
    }
  }, [pathname, rentaId, vista]);

  function limpiarFormulario() {
    setForm({
      chasis_id: "",
      cliente_id: "",
      tipo_renta_id: "",
      fecha_inicio: new Date().toISOString().slice(0, 10),
      fecha_fin: "",
      dias_extra: "0",
      notas: "",
    });
  }

  async function handleCrearRenta(event: React.FormEvent) {
    event.preventDefault();
    if (!puedeGestionar) return;
    if (!form.chasis_id || !form.cliente_id || !form.tipo_renta_id) {
      setMensaje("Completa chasis, cliente y tipo de renta.");
      return;
    }
    setGuardando(true);
    setMensaje(null);
    if (rentaEditando) {
      const payload: RentaChasisUpdate = {
        fecha_fin: form.fecha_fin || null,
        dias_extra: diasExtra,
        costo_total: costoPreview,
        notas: form.notas.trim() || null,
      };
      const { error: updateError } = await supabase
        .from("rentas_chasis")
        .update(payload)
        .eq("id", rentaEditando.id);
      setGuardando(false);
      if (updateError) {
        setMensaje(updateError.message);
        return;
      }
      setMensaje("Renta actualizada correctamente.");
      setRentaEditando(null);
      setRentaId(null);
      setVista("rentas");
      limpiarFormulario();
      setMostrarFormulario(false);
      await refetch();
      return;
    }
    const payload: RentaChasisInsert = {
      chasis_id: form.chasis_id,
      cliente_id: form.cliente_id,
      tipo_renta_id: form.tipo_renta_id,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      dias_extra: diasExtra,
      costo_total: costoPreview,
      notas: form.notas.trim() || null,
      creado_por: profile?.id ?? null,
    };
    const result = await crearRenta(payload);
    setGuardando(false);
    if (result.error) {
      setMensaje(result.error);
      return;
    }
    setMensaje("Renta creada y chasis marcado como en renta.");
    setVista("rentas");
    limpiarFormulario();
    setMostrarFormulario(false);
    await cargarCatalogos();
  }

  function prepararEdicion(renta: RentaChasisConRelaciones) {
    setRentaEditando(renta);
    setRentaId(renta.id);
    setVista("nueva");
    setFiltro("activa");
    setMostrarFormulario(true);
    setMensaje(null);
    setForm({
      chasis_id: renta.chasis_id,
      cliente_id: renta.cliente_id,
      tipo_renta_id: renta.tipo_renta_id,
      fecha_inicio: renta.fecha_inicio,
      fecha_fin: renta.fecha_fin ?? "",
      dias_extra: String(renta.dias_extra),
      notas: renta.notas ?? "",
    });
  }

  function cancelarEdicion() {
    setRentaEditando(null);
    setRentaId(null);
    setVista("rentas");
    limpiarFormulario();
    setMostrarFormulario(false);
  }

  useEffect(() => {
    if (!rentaId || rentaEditando) return;
    const renta = rentas.find((item) => item.id === rentaId);
    if (!renta) return;
    let activo = true;
    const frame = window.requestAnimationFrame(() => {
      if (activo) prepararEdicion(renta);
    });
    return () => {
      activo = false;
      window.cancelAnimationFrame(frame);
    };
  }, [rentaId, rentaEditando, rentas]);

  function cambiarEstadoInline(renta: RentaChasisConRelaciones, estado: "activa" | "cerrada") {
    setEstadoAbierto(null);
    if (estado === "cerrada" && renta.estado === "activa") {
      setConfirmando({ id: renta.id, accion: "cerrar" });
    }
  }

  function EstadoRenta({ renta, soloConsulta = false }: { renta: RentaChasisConRelaciones; soloConsulta?: boolean }) {
    const config = estadoConfig(renta.estado);
    const abierto = estadoAbierto === renta.id;
    const buttonRef = useRef<HTMLButtonElement>(null);
    const abrirEstado = () => {
      setEstadoAbierto(abierto ? null : renta.id);
      if (!abierto) {
        requestAnimationFrame(() => {
          buttonRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      }
    };
    return (
      <div className="relative inline-block">
        {soloConsulta ? (
          <span className={`inline-flex w-full min-w-full max-w-full justify-center items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${config.bg} ${config.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            {config.label}
          </span>
        ) : (
          <button
            ref={buttonRef}
            type="button"
            onClick={abrirEstado}
            className="cursor-pointer"
            title="Editar estado"
            aria-label={`Estado ${config.label}. Editar estado`}
            aria-expanded={abierto}
            aria-haspopup="listbox"
          >
            <span className={`inline-flex w-full min-w-full max-w-full justify-center items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${config.bg} ${config.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              {config.label}
            </span>
          </button>
        )}
        {!soloConsulta && abierto && (
          <div role="listbox" aria-label="Estados de la renta" className="absolute left-0 top-full z-20 mt-2 min-w-32 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            {(["activa", "cerrada"] as const).map((estado) => (
              <button
                type="button"
                role="option"
                aria-selected={renta.estado === estado}
                key={estado}
                onClick={() => cambiarEstadoInline(renta, estado)}
                disabled={renta.estado === "cerrada" && estado === "activa"}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${estado === "activa" ? "text-emerald-700" : "text-red-700"}`}
              >
                <span className={`mr-2 h-1.5 w-1.5 rounded-full ${estado === "activa" ? "bg-emerald-500" : "bg-red-500"}`} />
                {estado === "activa" ? "Activa" : "Cerrada"}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  function AccionesRenta({ renta }: { renta: RentaChasisConRelaciones }) {
    const confirmandoEsta = confirmando?.id === renta.id;
    if (confirmandoEsta) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600 font-semibold mr-1">¿Eliminar?</span>
          <button
            type="button"
            onClick={ejecutarAccion}
            disabled={guardando}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {guardando && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(null)}
            disabled={guardando}
            className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            No
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => prepararEdicion(renta)}
          className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 border border-slate-200 rounded-lg text-orange-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer"
          title="Editar información completa"
        >
          <EditarIcono />
        </button>
        <button
          type="button"
          onClick={() => setConfirmando({ id: renta.id, accion: "cancelar" })}
          className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 border border-slate-200 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer"
          title="Eliminar renta"
        >
          <EliminarIcono />
        </button>
      </div>
    );
  }

  async function ejecutarAccion() {
    if (!confirmando || !puedeGestionar) return;
    setGuardando(true);
    setMensaje(null);
    setEstadoAbierto(null);
    const result =
      confirmando.accion === "cerrar"
        ? await finalizarRenta(confirmando.id)
        : await cancelarRenta(confirmando.id);
    setGuardando(false);
    setConfirmando(null);
    setMensaje(
      result.error ??
        (confirmando.accion === "cerrar"
          ? "Renta cerrada y chasis liberado."
          : "Renta eliminada y chasis liberado."),
    );
    await cargarCatalogos();
  }

  function editarTipo(tipo: (typeof tipos)[number]) {
    setTipoEditando(tipo.id);
    setTipoForm({
      nombre: tipo.nombre,
      modalidad: tipo.modalidad,
      precio_base: String(tipo.precio_base),
      dias_incluidos: String(tipo.dias_incluidos),
      precio_dia_extra: String(tipo.precio_dia_extra),
    });
  }

  async function guardarTipo(event: React.FormEvent) {
    event.preventDefault();
    if (!esAdmin || !tipoForm.nombre.trim()) return;
    const payload = {
      nombre: tipoForm.nombre.trim(),
      modalidad: tipoForm.modalidad,
      precio_base: Number(tipoForm.precio_base) || 0,
      dias_incluidos: Number(tipoForm.dias_incluidos) || 0,
      precio_dia_extra: Number(tipoForm.precio_dia_extra) || 0,
      activo: true,
    };
    const result = tipoEditando
      ? await actualizarTipo(tipoEditando, payload)
      : await crearTipo(payload);
    if (result) setMensaje(result);
    else {
      setMensaje(tipoEditando ? "Tipo actualizado." : "Tipo creado.");
      setTipoEditando(null);
      setTipoForm({
        nombre: "",
        modalidad: "por_viaje",
        precio_base: "",
        dias_incluidos: "0",
        precio_dia_extra: "0",
      });
    }
  }

  const esHistorial = vista === "historial";

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto">
      <div>
        <div className="flex justify-center mt-4">
          <div className="inline-flex max-w-full bg-white border border-slate-200 p-1 rounded-2xl shadow-sm gap-1 flex-wrap justify-center">
            <button
              onClick={() => {
                setSeccion("rentas");
                setVista("rentas");
                setRentaId(null);
                setRentaEditando(null);
                setFiltro("activa");
                setMostrarFormulario(false);
              }}
              className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${seccion === "rentas" && filtro === "activa" && !mostrarFormulario ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}
            >
              Rentas
            </button>
            <button
              onClick={() => {
                setSeccion("rentas");
                setVista("historial");
                setRentaId(null);
                setRentaEditando(null);
                setFiltro("todas");
                setMostrarFormulario(false);
              }}
              className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${seccion === "rentas" && filtro === "todas" && !mostrarFormulario ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}
            >
              Historial
            </button>
            <button
              onClick={() => {
                setSeccion("rentas");
                setVista("nueva");
                setRentaId(null);
                setRentaEditando(null);
                limpiarFormulario();
                setFiltro("activa");
                setMostrarFormulario(true);
                setMensaje(null);
              }}
              className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${mostrarFormulario ? "bg-orange-500 text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}
            >
              Nueva Renta
            </button>
          </div>
        </div>
      </div>

      {mensaje && (
        <div role="status" aria-live="polite" className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">
          {mensaje}
        </div>
      )}

      {seccion === "rentas" || !esAdmin ? (
        <>
          {mostrarFormulario && (
            <form
              onSubmit={handleCrearRenta}
              aria-busy={guardando}
              className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="bg-linear-to-r from-slate-800 to-slate-900 px-6 md:px-8 py-5">
                <h3 className="font-bold text-white text-xl text-center">
                  {rentaEditando ? "Editar Renta de Chasis" : "Registrar Renta de Chasis"}
                </h3>
                <p className="text-slate-400 text-sm mt-1 text-center">
                  {rentaEditando
                    ? "Modifica la información de la renta y guarda los cambios"
                    : "La renta quedará guardada en la base de datos inmediatamente"}
                </p>
              </div>
              <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <label className="text-sm font-semibold text-slate-700">
                  Chasis disponible
                  <select
                    className={`${inputClass} mt-1`}
                    value={form.chasis_id}
                    onChange={(e) =>
                      setForm({ ...form, chasis_id: e.target.value })
                    }
                    disabled={Boolean(rentaEditando)}
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {rentaEditando?.chasis &&
                      !chasis.some((item) => item.id === rentaEditando.chasis_id) && (
                        <option value={rentaEditando.chasis_id}>
                          {rentaEditando.chasis.placa} · {rentaEditando.chasis.tamaño}&apos;
                        </option>
                      )}
                    {chasis.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.placa} · {item.tamaño}&apos;
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Cliente
                  <select
                    className={`${inputClass} mt-1`}
                    value={form.cliente_id}
                    onChange={(e) =>
                      setForm({ ...form, cliente_id: e.target.value })
                    }
                    disabled={Boolean(rentaEditando)}
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {clientes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Tipo de renta
                  <select
                    className={`${inputClass} mt-1`}
                    value={form.tipo_renta_id}
                    onChange={(e) =>
                      setForm({ ...form, tipo_renta_id: e.target.value })
                    }
                    disabled={Boolean(rentaEditando)}
                    required
                  >
                    <option value="">Seleccionar…</option>
                    {tipos
                      .filter((tipo) => tipo.activo)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {tipoRentaTexto(item.nombre, item.modalidad)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Fecha de inicio
                  <input
                    className={`${inputClass} mt-1`}
                    type="date"
                    value={form.fecha_inicio}
                    onChange={(e) =>
                      setForm({ ...form, fecha_inicio: e.target.value })
                    }
                    disabled={Boolean(rentaEditando)}
                    required
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Fecha de fin (opcional)
                  <input
                    className={`${inputClass} mt-1`}
                    type="date"
                    min={form.fecha_inicio}
                    value={form.fecha_fin}
                    onChange={(e) =>
                      setForm({ ...form, fecha_fin: e.target.value })
                    }
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Días extra
                  <input
                    className={`${inputClass} mt-1`}
                    type="number"
                    min="0"
                    value={form.dias_extra}
                    onChange={(e) =>
                      setForm({ ...form, dias_extra: e.target.value })
                    }
                    disabled={tipoSeleccionado?.modalidad === "por_dia"}
                  />
                </label>
                <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                  Notas
                  <input
                    className={`${inputClass} mt-1`}
                    value={form.notas}
                    onChange={(e) =>
                      setForm({ ...form, notas: e.target.value })
                    }
                    placeholder="Observaciones opcionales"
                  />
                </label>
              </div>
              {tipoSeleccionado && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 flex flex-wrap gap-x-5 gap-y-1">
                  <span>
                    Base: <b>{money(tipoSeleccionado.precio_base)}</b>
                  </span>
                  <span>
                    Días incluidos: <b>{tipoSeleccionado.dias_incluidos}</b>
                  </span>
                  <span>
                    Preview:{" "}
                    <b className="text-orange-600">{money(costoPreview)}</b>
                  </span>
                  {tipoSeleccionado.modalidad === "por_dia" &&
                    form.fecha_fin && <span>{dias} días calculados</span>}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-base rounded-xl font-bold transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {rentaEditando ? "Guardando cambios…" : "Guardando…"}
                    </>
                  ) : (
                    <>{rentaEditando ? "Guardar cambios" : "Crear renta"}</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={rentaEditando ? cancelarEdicion : () => {
                    setMostrarFormulario(false);
                    setVista("rentas");
                    setRentaId(null);
                    setMensaje(null);
                  }}
                  disabled={guardando}
                  className="sm:w-44 py-3.5 border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 transition-colors cursor-pointer text-base disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
              </div>
            </form>
          )}

          {vista !== "nueva" && <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-center text-sm text-slate-400">
                Cargando rentas…
              </p>
            ) : error ? (
              <p className="p-8 text-center text-sm text-red-600">{error}</p>
            ) : rentasFiltradas.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">
                No hay rentas para este filtro.
              </p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Chasis",
                          "Cliente",
                          "Tipo",
                          "Fechas",
                          "Costo",
                          "Estado",
                          ...(esHistorial ? [] : ["Acciones"]),
                        ].map((header) => (
                          <th
                            key={header}
                            className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rentasFiltradas.map((renta) => (
                        <tr
                          key={renta.id}
                          className="border-t border-slate-100"
                        >
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {renta.chasis?.placa ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {renta.cliente?.nombre ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {renta.tipo_renta
                              ? tipoRentaTexto(renta.tipo_renta.nombre, renta.tipo_renta.modalidad)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {renta.fecha_inicio} →{" "}
                            {renta.fecha_fin ?? "Abierta"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                            {money(renta.costo_total)}
                          </td>
                          <td className="px-4 py-3">
                            <EstadoRenta renta={renta} soloConsulta={esHistorial} />
                          </td>
                          {!esHistorial && (
                            <td className="px-4 py-3 whitespace-nowrap">
                              <AccionesRenta renta={renta} />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-3 p-3">
                  {rentasFiltradas.map((renta) => (
                    <div
                      key={renta.id}
                      className="rounded-xl border border-slate-100 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800">
                            {renta.chasis?.placa ?? "—"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {renta.cliente?.nombre ?? "—"}
                          </p>
                        </div>
                        <EstadoRenta renta={renta} soloConsulta={esHistorial} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <span>
                          Tipo:{" "}
                          <b className="text-slate-700">
                            {renta.tipo_renta
                              ? tipoRentaTexto(renta.tipo_renta.nombre, renta.tipo_renta.modalidad)
                              : "—"}
                          </b>
                        </span>
                        <span>
                          Costo:{" "}
                          <b className="text-slate-700">
                            {money(renta.costo_total)}
                          </b>
                        </span>
                        <span className="col-span-2">
                          {renta.fecha_inicio} → {renta.fecha_fin ?? "Abierta"}
                        </span>
                      </div>
                      {!esHistorial && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <AccionesRenta renta={renta} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>}
        </>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">
                Catálogo de tipos de renta
              </h3>
              <p className="text-sm text-slate-500">
                Los cambios de precios se reflejan en el preview de nuevas
                rentas.
              </p>
            </div>
            {!esAdmin && (
              <span className="text-xs font-semibold text-slate-400">
                Solo administradores pueden editar
              </span>
            )}
          </div>
          {esAdmin && (
            <form
              onSubmit={guardarTipo}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <input
                className={inputClass}
                placeholder="Nombre"
                value={tipoForm.nombre}
                onChange={(e) =>
                  setTipoForm({ ...tipoForm, nombre: e.target.value })
                }
                required
              />
              <select
                className={inputClass}
                value={tipoForm.modalidad}
                onChange={(e) =>
                  setTipoForm({
                    ...tipoForm,
                    modalidad: e.target.value as ModalidadRentaDB,
                  })
                }
              >
                <option value="por_viaje">Por viaje</option>
                <option value="mensual">Mensual</option>
                <option value="por_dia">Por día</option>
              </select>
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio base"
                value={tipoForm.precio_base}
                onChange={(e) =>
                  setTipoForm({ ...tipoForm, precio_base: e.target.value })
                }
                required
              />
              <input
                className={inputClass}
                type="number"
                min="0"
                placeholder="Días incluidos"
                value={tipoForm.dias_incluidos}
                onChange={(e) =>
                  setTipoForm({ ...tipoForm, dias_incluidos: e.target.value })
                }
              />
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio día extra"
                value={tipoForm.precio_dia_extra}
                onChange={(e) =>
                  setTipoForm({ ...tipoForm, precio_dia_extra: e.target.value })
                }
              />
              <button className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white md:col-span-2 xl:col-span-5">
                {tipoEditando ? "Guardar cambios" : "Agregar tipo"}
              </button>
            </form>
          )}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Nombre",
                    "Modalidad",
                    "Base",
                    "Incluidos",
                    "Día extra",
                    "Estado",
                    "Acciones",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tiposLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Cargando catálogo…
                    </td>
                  </tr>
                ) : (
                  tipos.map((tipo) => (
                    <tr key={tipo.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {tipo.nombre}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {modalidadLabel(tipo.modalidad)}
                      </td>
                      <td className="px-4 py-3">{money(tipo.precio_base)}</td>
                      <td className="px-4 py-3">{tipo.dias_incluidos}</td>
                      <td className="px-4 py-3">
                        {money(tipo.precio_dia_extra)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${tipo.activo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {tipo.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {esAdmin && (
                          <span className="inline-flex gap-3">
                            <button
                              onClick={() => editarTipo(tipo)}
                              className="text-xs font-semibold text-blue-600"
                            >
                              Editar
                            </button>
                            <button
                              onClick={async () => {
                                const result = await eliminarTipo(tipo.id);
                                if (result) setMensaje(result);
                              }}
                              className="text-xs font-semibold text-red-600"
                            >
                              Eliminar
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {tiposError && <p className="text-sm text-red-600">{tiposError}</p>}
        </section>
      )}
    </div>
  );
}

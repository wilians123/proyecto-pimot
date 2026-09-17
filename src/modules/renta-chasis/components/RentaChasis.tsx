"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRentasChasis, type RentaChasisInsert } from "@/hooks/useRentasChasis";
import { modalidadLabel, useTiposRenta } from "@/hooks/useTiposRenta";
import type { Database, ModalidadRentaDB } from "@/types/database";

type ChasisRow = Database["public"]["Tables"]["chasis"]["Row"];
type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
type EstadoFiltro = "activa" | "cerrada" | "cancelada" | "todas";
type AccionRenta = "cerrar" | "cancelar";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

function money(value: number) {
  return new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(value);
}

function daysBetween(start: string, end: string) {
  if (!start || !end) return 1;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
}

function estadoConfig(estado: string) {
  if (estado === "activa") return "bg-green-100 text-green-700";
  if (estado === "cerrada") return "bg-slate-100 text-slate-600";
  return "bg-red-100 text-red-700";
}

export default function RentaChasis() {
  const { profile } = useAuth();
  const esAdmin = profile?.rol === "admin";
  const { rentas, loading, error, crearRenta, finalizarRenta, cancelarRenta } = useRentasChasis();
  const { tipos, loading: tiposLoading, error: tiposError, crearTipo, actualizarTipo, eliminarTipo } = useTiposRenta();
  const [chasis, setChasis] = useState<ChasisRow[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [filtro, setFiltro] = useState<EstadoFiltro>("activa");
  const [seccion, setSeccion] = useState<"rentas" | "catalogo">("rentas");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [form, setForm] = useState({ chasis_id: "", cliente_id: "", tipo_renta_id: "", fecha_inicio: new Date().toISOString().slice(0, 10), fecha_fin: "", dias_extra: "0", notas: "" });
  const [confirmando, setConfirmando] = useState<{ id: string; accion: AccionRenta } | null>(null);
  const [tipoEditando, setTipoEditando] = useState<string | null>(null);
  const [tipoForm, setTipoForm] = useState({ nombre: "", modalidad: "por_viaje" as ModalidadRentaDB, precio_base: "", dias_incluidos: "0", precio_dia_extra: "0" });

  async function cargarCatalogos() {
    const [chasisResult, clientesResult] = await Promise.all([
      supabase.from("chasis").select("*").eq("estado", "disponible").order("placa"),
      supabase.from("clientes").select("*").eq("activo", true).order("nombre"),
    ]);
    setChasis(chasisResult.data ?? []);
    setClientes(clientesResult.data ?? []);
  }

  useEffect(() => {
    let active = true;
    async function cargar() {
      const [chasisResult, clientesResult] = await Promise.all([
        supabase.from("chasis").select("*").eq("estado", "disponible").order("placa"),
        supabase.from("clientes").select("*").eq("activo", true).order("nombre"),
      ]);
      if (!active) return;
      setChasis(chasisResult.data ?? []);
      setClientes(clientesResult.data ?? []);
    }
    cargar();
    return () => { active = false; };
  }, [rentas.length]);

  const tipoSeleccionado = tipos.find((tipo) => tipo.id === form.tipo_renta_id);
  const dias = daysBetween(form.fecha_inicio, form.fecha_fin);
  const diasExtra = Math.max(0, Number(form.dias_extra) || 0);
  const costoPreview = tipoSeleccionado
    ? tipoSeleccionado.modalidad === "por_dia"
      ? tipoSeleccionado.precio_base * (form.fecha_fin ? dias : 1)
      : tipoSeleccionado.precio_base + diasExtra * tipoSeleccionado.precio_dia_extra
    : 0;
  const rentasFiltradas = useMemo(() => filtro === "todas" ? rentas : rentas.filter((renta) => renta.estado === filtro), [filtro, rentas]);

  function limpiarFormulario() {
    setForm({ chasis_id: "", cliente_id: "", tipo_renta_id: "", fecha_inicio: new Date().toISOString().slice(0, 10), fecha_fin: "", dias_extra: "0", notas: "" });
  }

  async function handleCrearRenta(event: React.FormEvent) {
    event.preventDefault();
    if (!form.chasis_id || !form.cliente_id || !form.tipo_renta_id) { setMensaje("Completa chasis, cliente y tipo de renta."); return; }
    setGuardando(true); setMensaje(null);
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
    if (result.error) { setMensaje(result.error); return; }
    setMensaje("Renta creada y chasis marcado como en renta.");
    limpiarFormulario(); setMostrarFormulario(false);
    await cargarCatalogos();
  }

  async function ejecutarAccion() {
    if (!confirmando) return;
    setGuardando(true); setMensaje(null);
    const result = confirmando.accion === "cerrar" ? await finalizarRenta(confirmando.id) : await cancelarRenta(confirmando.id);
    setGuardando(false); setConfirmando(null);
    setMensaje(result.error ?? (confirmando.accion === "cerrar" ? "Renta cerrada y chasis liberado." : "Renta cancelada y chasis liberado."));
    await cargarCatalogos();
  }

  function editarTipo(tipo: typeof tipos[number]) {
    setTipoEditando(tipo.id);
    setTipoForm({ nombre: tipo.nombre, modalidad: tipo.modalidad, precio_base: String(tipo.precio_base), dias_incluidos: String(tipo.dias_incluidos), precio_dia_extra: String(tipo.precio_dia_extra) });
  }

  async function guardarTipo(event: React.FormEvent) {
    event.preventDefault();
    if (!esAdmin || !tipoForm.nombre.trim()) return;
    const payload = { nombre: tipoForm.nombre.trim(), modalidad: tipoForm.modalidad, precio_base: Number(tipoForm.precio_base) || 0, dias_incluidos: Number(tipoForm.dias_incluidos) || 0, precio_dia_extra: Number(tipoForm.precio_dia_extra) || 0, activo: true };
    const result = tipoEditando ? await actualizarTipo(tipoEditando, payload) : await crearTipo(payload);
    if (result) setMensaje(result);
    else { setMensaje(tipoEditando ? "Tipo actualizado." : "Tipo creado."); setTipoEditando(null); setTipoForm({ nombre: "", modalidad: "por_viaje", precio_base: "", dias_incluidos: "0", precio_dia_extra: "0" }); }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Administración de activos rentados</p>
          <h2 className="text-xl font-bold text-slate-800">Renta de Chasis</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSeccion("rentas")} className={`px-4 py-2 rounded-xl text-sm font-semibold ${seccion === "rentas" ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>Rentas</button>
          <button onClick={() => setSeccion("catalogo")} className={`px-4 py-2 rounded-xl text-sm font-semibold ${seccion === "catalogo" ? "bg-slate-900 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>Catálogo</button>
        </div>
      </div>

      {mensaje && <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800">{mensaje}</div>}

      {seccion === "rentas" ? <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(["activa", "todas", "cerrada", "cancelada"] as EstadoFiltro[]).map((value) => <button key={value} onClick={() => setFiltro(value)} className={`rounded-xl px-3 py-2 text-xs font-semibold ${filtro === value ? "bg-orange-500 text-white" : "bg-white text-slate-500 border border-slate-200"}`}>{value === "todas" ? "Historial" : value[0].toUpperCase() + value.slice(1)}</button>)}
          </div>
          <button onClick={() => { setMostrarFormulario((value) => !value); setMensaje(null); }} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-200">{mostrarFormulario ? "Cerrar formulario" : "+ Nueva renta"}</button>
        </div>

        {mostrarFormulario && <form onSubmit={handleCrearRenta} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <label className="text-sm font-semibold text-slate-700">Chasis disponible<select className={`${inputClass} mt-1`} value={form.chasis_id} onChange={(e) => setForm({ ...form, chasis_id: e.target.value })} required><option value="">Seleccionar…</option>{chasis.map((item) => <option key={item.id} value={item.id}>{item.placa} · {item.tamaño}&apos;</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">Cliente<select className={`${inputClass} mt-1`} value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} required><option value="">Seleccionar…</option>{clientes.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">Tipo de renta<select className={`${inputClass} mt-1`} value={form.tipo_renta_id} onChange={(e) => setForm({ ...form, tipo_renta_id: e.target.value })} required><option value="">Seleccionar…</option>{tipos.filter((tipo) => tipo.activo).map((item) => <option key={item.id} value={item.id}>{item.nombre} · {modalidadLabel(item.modalidad)}</option>)}</select></label>
            <label className="text-sm font-semibold text-slate-700">Fecha de inicio<input className={`${inputClass} mt-1`} type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} required /></label>
            <label className="text-sm font-semibold text-slate-700">Fecha de fin (opcional)<input className={`${inputClass} mt-1`} type="date" min={form.fecha_inicio} value={form.fecha_fin} onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })} /></label>
            <label className="text-sm font-semibold text-slate-700">Días extra<input className={`${inputClass} mt-1`} type="number" min="0" value={form.dias_extra} onChange={(e) => setForm({ ...form, dias_extra: e.target.value })} disabled={tipoSeleccionado?.modalidad === "por_dia"} /></label>
            <label className="text-sm font-semibold text-slate-700 md:col-span-2">Notas<input className={`${inputClass} mt-1`} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Observaciones opcionales" /></label>
          </div>
          {tipoSeleccionado && <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 flex flex-wrap gap-x-5 gap-y-1"><span>Base: <b>{money(tipoSeleccionado.precio_base)}</b></span><span>Días incluidos: <b>{tipoSeleccionado.dias_incluidos}</b></span><span>Preview: <b className="text-orange-600">{money(costoPreview)}</b></span>{tipoSeleccionado.modalidad === "por_dia" && form.fecha_fin && <span>{dias} días calculados</span>}</div>}
          <button disabled={guardando} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Crear renta"}</button>
        </form>}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {loading ? <p className="p-8 text-center text-sm text-slate-400">Cargando rentas…</p> : error ? <p className="p-8 text-center text-sm text-red-600">{error}</p> : rentasFiltradas.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">No hay rentas para este filtro.</p> : <>
            <div className="hidden md:block overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Chasis", "Cliente", "Tipo", "Fechas", "Costo", "Estado", "Acciones"].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{header}</th>)}</tr></thead><tbody>{rentasFiltradas.map((renta) => <tr key={renta.id} className="border-t border-slate-100"><td className="px-4 py-3 font-bold text-slate-800">{renta.chasis?.placa ?? "—"}</td><td className="px-4 py-3 text-slate-600">{renta.cliente?.nombre ?? "—"}</td><td className="px-4 py-3 text-slate-600">{renta.tipo_renta ? `${renta.tipo_renta.nombre} · ${modalidadLabel(renta.tipo_renta.modalidad)}` : "—"}</td><td className="px-4 py-3 text-slate-600 whitespace-nowrap">{renta.fecha_inicio} → {renta.fecha_fin ?? "Abierta"}</td><td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{money(renta.costo_total)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${estadoConfig(renta.estado)}`}>{renta.estado}</span></td><td className="px-4 py-3 whitespace-nowrap">{renta.estado === "activa" && <>{confirmando?.id === renta.id ? <span className="inline-flex items-center gap-2"><button disabled={guardando} onClick={ejecutarAccion} className="text-xs font-bold text-orange-600">Confirmar</button><button onClick={() => setConfirmando(null)} className="text-xs text-slate-400">Cancelar</button></span> : <span className="inline-flex gap-3"><button onClick={() => setConfirmando({ id: renta.id, accion: "cerrar" })} className="text-xs font-semibold text-green-600">Cerrar</button><button onClick={() => setConfirmando({ id: renta.id, accion: "cancelar" })} className="text-xs font-semibold text-red-600">Cancelar</button></span>}</>}</td></tr>)}</tbody></table></div>
            <div className="md:hidden space-y-3 p-3">{rentasFiltradas.map((renta) => <div key={renta.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-800">{renta.chasis?.placa ?? "—"}</p><p className="text-xs text-slate-500 mt-0.5">{renta.cliente?.nombre ?? "—"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${estadoConfig(renta.estado)}`}>{renta.estado}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500"><span>Tipo: <b className="text-slate-700">{renta.tipo_renta?.nombre ?? "—"}</b></span><span>Costo: <b className="text-slate-700">{money(renta.costo_total)}</b></span><span className="col-span-2">{renta.fecha_inicio} → {renta.fecha_fin ?? "Abierta"}</span></div>{renta.estado === "activa" && <div className="mt-3 flex gap-3 border-t border-slate-100 pt-3">{confirmando?.id === renta.id ? <><button disabled={guardando} onClick={ejecutarAccion} className="text-xs font-bold text-orange-600">Confirmar</button><button onClick={() => setConfirmando(null)} className="text-xs text-slate-400">Cancelar</button></> : <><button onClick={() => setConfirmando({ id: renta.id, accion: "cerrar" })} className="text-xs font-semibold text-green-600">Cerrar</button><button onClick={() => setConfirmando({ id: renta.id, accion: "cancelar" })} className="text-xs font-semibold text-red-600">Cancelar</button></>}</div>}</div>)}</div>
          </>}
        </div>
      </> : <section className="space-y-4">
        <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-800">Catálogo de tipos de renta</h3><p className="text-sm text-slate-500">Los cambios de precios se reflejan en el preview de nuevas rentas.</p></div>{!esAdmin && <span className="text-xs font-semibold text-slate-400">Solo administradores pueden editar</span>}</div>
        {esAdmin && <form onSubmit={guardarTipo} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 rounded-2xl border border-slate-200 bg-white p-4"><input className={inputClass} placeholder="Nombre" value={tipoForm.nombre} onChange={(e) => setTipoForm({ ...tipoForm, nombre: e.target.value })} required /><select className={inputClass} value={tipoForm.modalidad} onChange={(e) => setTipoForm({ ...tipoForm, modalidad: e.target.value as ModalidadRentaDB })}><option value="por_viaje">Por viaje</option><option value="mensual">Mensual</option><option value="por_dia">Por día</option></select><input className={inputClass} type="number" min="0" step="0.01" placeholder="Precio base" value={tipoForm.precio_base} onChange={(e) => setTipoForm({ ...tipoForm, precio_base: e.target.value })} required /><input className={inputClass} type="number" min="0" placeholder="Días incluidos" value={tipoForm.dias_incluidos} onChange={(e) => setTipoForm({ ...tipoForm, dias_incluidos: e.target.value })} /><input className={inputClass} type="number" min="0" step="0.01" placeholder="Precio día extra" value={tipoForm.precio_dia_extra} onChange={(e) => setTipoForm({ ...tipoForm, precio_dia_extra: e.target.value })} /><button className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white md:col-span-2 xl:col-span-5">{tipoEditando ? "Guardar cambios" : "Agregar tipo"}</button></form>}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>{["Nombre", "Modalidad", "Base", "Incluidos", "Día extra", "Estado", "Acciones"].map((header) => <th key={header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{header}</th>)}</tr></thead><tbody>{tiposLoading ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">Cargando catálogo…</td></tr> : tipos.map((tipo) => <tr key={tipo.id} className="border-t border-slate-100"><td className="px-4 py-3 font-bold text-slate-800">{tipo.nombre}</td><td className="px-4 py-3 text-slate-600">{modalidadLabel(tipo.modalidad)}</td><td className="px-4 py-3">{money(tipo.precio_base)}</td><td className="px-4 py-3">{tipo.dias_incluidos}</td><td className="px-4 py-3">{money(tipo.precio_dia_extra)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tipo.activo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{tipo.activo ? "Activo" : "Inactivo"}</span></td><td className="px-4 py-3">{esAdmin && <span className="inline-flex gap-3"><button onClick={() => editarTipo(tipo)} className="text-xs font-semibold text-blue-600">Editar</button><button onClick={async () => { const result = await eliminarTipo(tipo.id); if (result) setMensaje(result); }} className="text-xs font-semibold text-red-600">Eliminar</button></span>}</td></tr>)}</tbody></table></div>
        {tiposError && <p className="text-sm text-red-600">{tiposError}</p>}
      </section>}
    </div>
  );
}

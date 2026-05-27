// Módulo de usuarios y seguridad — interfaz visual completa.
// Gestión de cuentas, asignación de roles y matriz de permisos.
// Funcionalidad pendiente de implementar en fase siguiente.

"use client";

import { useState } from "react";

type TabId = "usuarios" | "roles" | "invitar";
type Rol = "admin" | "operativo" | "visualizador";

// ── Datos de muestra (se reemplazarán con Supabase Auth) ──────
interface UsuarioUI {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  ultimaSesion: string | null;
  avatar: string;
}

const USUARIOS_MOCK: UsuarioUI[] = [
  {
    id: "1",
    nombre: "José Administrador",
    email: "admin@empresa.gt",
    rol: "admin",
    activo: true,
    ultimaSesion: "Hoy, 09:14",
    avatar: "JA",
  },
  {
    id: "2",
    nombre: "María López",
    email: "mlopez@empresa.gt",
    rol: "operativo",
    activo: true,
    ultimaSesion: "Ayer, 16:42",
    avatar: "ML",
  },
  {
    id: "3",
    nombre: "Carlos Méndez",
    email: "cmendez@empresa.gt",
    rol: "operativo",
    activo: true,
    ultimaSesion: "Hace 2 días",
    avatar: "CM",
  },
  {
    id: "4",
    nombre: "Ana García",
    email: "agarcia@empresa.gt",
    rol: "visualizador",
    activo: false,
    ultimaSesion: "Hace 15 días",
    avatar: "AG",
  },
];

// ── Configuración visual de roles ─────────────────────────────
const ROL_CONFIG: Record<
  Rol,
  { label: string; bg: string; text: string; dot: string; descripcion: string }
> = {
  admin: {
    label: "Administrador",
    bg: "bg-purple-100",
    text: "text-purple-800",
    dot: "bg-purple-500",
    descripcion: "Acceso total al sistema",
  },
  operativo: {
    label: "Operativo",
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
    descripcion: "Gestión de viajes y flota",
  },
  visualizador: {
    label: "Visualizador",
    bg: "bg-slate-100",
    text: "text-slate-700",
    dot: "bg-slate-400",
    descripcion: "Solo lectura",
  },
};

// ── Matriz de permisos por rol ────────────────────────────────
interface Permiso {
  modulo: string;
  icono: string;
  admin: boolean | "parcial";
  operativo: boolean | "parcial";
  visualizador: boolean | "parcial";
}

const PERMISOS: Permiso[] = [
  {
    modulo: "Dashboard",
    icono: "📊",
    admin: true,
    operativo: true,
    visualizador: true,
  },
  {
    modulo: "Ver viajes",
    icono: "🚛",
    admin: true,
    operativo: true,
    visualizador: true,
  },
  {
    modulo: "Crear / editar viajes",
    icono: "✏️",
    admin: true,
    operativo: true,
    visualizador: false,
  },
  {
    modulo: "Cambiar estado viaje",
    icono: "🔄",
    admin: true,
    operativo: true,
    visualizador: false,
  },
  {
    modulo: "Gestión de flota",
    icono: "🏗️",
    admin: true,
    operativo: true,
    visualizador: "parcial",
  },
  {
    modulo: "Gestión de pilotos",
    icono: "👤",
    admin: true,
    operativo: true,
    visualizador: false,
  },
  {
    modulo: "GPS y rastreo",
    icono: "📡",
    admin: true,
    operativo: true,
    visualizador: true,
  },
  {
    modulo: "Alertas",
    icono: "🔔",
    admin: true,
    operativo: true,
    visualizador: "parcial",
  },
  {
    modulo: "Reportes y exportar",
    icono: "📄",
    admin: true,
    operativo: "parcial",
    visualizador: false,
  },
  {
    modulo: "Usuarios y seguridad",
    icono: "🔒",
    admin: true,
    operativo: false,
    visualizador: false,
  },
];

// ── Clases de campo ───────────────────────────────────────────
const inputCls =
  "w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-white " +
  "focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 " +
  "transition-all placeholder:text-slate-400";
const selectCls = `${inputCls} cursor-pointer`;

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

// Celda de permiso con ícono visual
function CeldaPermiso({ valor }: { valor: boolean | "parcial" }) {
  if (valor === true)
    return (
      <div className="flex justify-center">
        <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="#16A34A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <polyline points="2 6 5 9 10 3" />
          </svg>
        </span>
      </div>
    );
  if (valor === "parcial")
    return (
      <div className="flex justify-center">
        <span className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="#D97706"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="w-3 h-3"
          >
            <line x1="2" y1="6" x2="10" y2="6" />
          </svg>
        </span>
      </div>
    );
  return (
    <div className="flex justify-center">
      <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center">
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="w-3 h-3"
        >
          <line x1="3" y1="3" x2="9" y2="9" />
          <line x1="9" y1="3" x2="3" y2="9" />
        </svg>
      </span>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function Usuarios() {
  const [tab, setTab] = useState<TabId>("usuarios");

  // Estado visual de acciones (sin lógica real aún)
  const [accionId, setAccionId] = useState<string | null>(null);
  const [editandoRol, setEditRol] = useState<string | null>(null);

  const TABS = [
    { id: "usuarios" as TabId, label: "Usuarios", count: USUARIOS_MOCK.length },
    { id: "roles" as TabId, label: "Roles y Permisos" },
    { id: "invitar" as TabId, label: "+ Invitar usuario" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-2xl mx-auto">
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
                setEditRol(null);
              }}
              className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm
                font-semibold transition-all duration-200 cursor-pointer
                ${
                  tab === t.id
                    ? t.id === "invitar"
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

      {/* ══════════════ TAB: USUARIOS ══════════════ */}
      {tab === "usuarios" && (
        <div className="space-y-4">
          {/* KPIs rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Total usuarios",
                valor: USUARIOS_MOCK.length,
                color: "text-slate-800",
              },
              {
                label: "Activos",
                valor: USUARIOS_MOCK.filter((u) => u.activo).length,
                color: "text-green-700",
              },
              {
                label: "Administradores",
                valor: USUARIOS_MOCK.filter((u) => u.rol === "admin").length,
                color: "text-purple-700",
              },
              {
                label: "Operativos",
                valor: USUARIOS_MOCK.filter((u) => u.rol === "operativo")
                  .length,
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
                <p className={`text-2xl font-black tabular-nums mt-1 ${color}`}>
                  {valor}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop: tabla */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hidden md:block">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <h3 className="font-bold text-slate-800">Usuarios del sistema</h3>
              <span className="ml-auto text-xs text-slate-400">
                {USUARIOS_MOCK.filter((u) => u.activo).length} activos de{" "}
                {USUARIOS_MOCK.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      "Usuario",
                      "Correo electrónico",
                      "Rol",
                      "Estado",
                      "Última sesión",
                      "Acciones",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-bold text-slate-500
                        uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {USUARIOS_MOCK.map((u) => {
                    const rolCfg = ROL_CONFIG[u.rol];
                    const isAction = accionId === u.id;
                    const isEditRol = editandoRol === u.id;

                    return (
                      <tr
                        key={u.id}
                        className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Usuario */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center
                              text-xs font-black text-white shrink-0
                              ${
                                u.rol === "admin"
                                  ? "bg-linear-to-br from-purple-400 to-purple-600"
                                  : u.rol === "operativo"
                                    ? "bg-linear-to-br from-blue-400 to-blue-600"
                                    : "bg-linear-to-br from-slate-300 to-slate-500"
                              }`}
                            >
                              {u.avatar}
                            </div>
                            <span className="font-semibold text-slate-800">
                              {u.nombre}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          {u.email}
                        </td>

                        {/* Rol — select inline al editar */}
                        <td className="px-4 py-3.5">
                          {isEditRol ? (
                            <select
                              defaultValue={u.rol}
                              className="border-2 border-purple-300 rounded-lg px-2 py-1 text-xs
                                text-slate-800 bg-white focus:outline-none cursor-pointer min-w-35"
                            >
                              <option value="admin">Administrador</option>
                              <option value="operativo">Operativo</option>
                              <option value="visualizador">Visualizador</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                              text-xs font-semibold ${rolCfg.bg} ${rolCfg.text}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${rolCfg.dot}`}
                              />
                              {rolCfg.label}
                            </span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                            text-xs font-semibold ${u.activo ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${u.activo ? "bg-green-500" : "bg-slate-400"}`}
                            />
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>

                        {/* Última sesión */}
                        <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {u.ultimaSesion ?? "—"}
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3.5">
                          {isEditRol ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setEditRol(null)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500
                                  hover:bg-green-600 text-white text-xs font-bold rounded-lg
                                  transition-colors cursor-pointer"
                              >
                                ✓ Guardar
                              </button>
                              <button
                                onClick={() => setEditRol(null)}
                                className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs
                                  font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : isAction ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium mr-1">
                                {u.activo ? "¿Desactivar?" : "¿Activar?"}
                              </span>
                              <button
                                onClick={() => setAccionId(null)}
                                className={`px-3 py-1.5 text-white text-xs font-bold rounded-lg
                                  transition-colors cursor-pointer
                                  ${u.activo ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setAccionId(null)}
                                className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs
                                  font-semibold rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {/* Editar rol */}
                              <button
                                onClick={() => {
                                  setAccionId(null);
                                  setEditRol(u.id);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200
                                  text-slate-700 text-xs font-semibold rounded-lg hover:bg-purple-50
                                  hover:border-purple-300 hover:text-purple-700 transition-colors cursor-pointer"
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
                                  <path d="M9.917 1.75a1.65 1.65 0 012.333 2.333L4.083 12.25H1.75V9.917L9.917 1.75z" />
                                </svg>
                                Rol
                              </button>
                              {/* Activar / Desactivar */}
                              <button
                                onClick={() => {
                                  setEditRol(null);
                                  setAccionId(u.id);
                                }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs
                                  font-semibold rounded-lg transition-colors cursor-pointer
                                  ${
                                    u.activo
                                      ? "border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                                      : "border-slate-200 text-slate-700 hover:bg-green-50 hover:border-green-300 hover:text-green-600"
                                  }`}
                              >
                                {u.activo ? (
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
            {USUARIOS_MOCK.map((u) => {
              const rolCfg = ROL_CONFIG[u.rol];
              return (
                <div
                  key={u.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center
                        text-sm font-black text-white shrink-0
                        ${
                          u.rol === "admin"
                            ? "bg-linear-to-br from-purple-400 to-purple-600"
                            : u.rol === "operativo"
                              ? "bg-linear-to-br from-blue-400 to-blue-600"
                              : "bg-linear-to-br from-slate-300 to-slate-500"
                        }`}
                      >
                        {u.avatar}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{u.nombre}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full
                      text-xs font-semibold ${u.activo ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${u.activo ? "bg-green-500" : "bg-slate-400"}`}
                      />
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-100">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                      font-semibold ${rolCfg.bg} ${rolCfg.text}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${rolCfg.dot}`}
                      />
                      {rolCfg.label}
                    </span>
                    <span>Sesión: {u.ultimaSesion ?? "—"}</span>
                  </div>
                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={() =>
                        setEditRol(editandoRol === u.id ? null : u.id)
                      }
                      className="flex-1 py-2 text-xs font-semibold text-purple-700 border
                        border-purple-200 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer"
                    >
                      Cambiar rol
                    </button>
                    <button
                      onClick={() =>
                        setAccionId(accionId === u.id ? null : u.id)
                      }
                      className={`flex-1 py-2 text-xs font-semibold rounded-xl border
                        transition-colors cursor-pointer
                        ${
                          u.activo
                            ? "text-red-600 border-red-200 hover:bg-red-50"
                            : "text-green-700 border-green-200 hover:bg-green-50"
                        }`}
                    >
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════ TAB: ROLES Y PERMISOS ══════════════ */}
      {tab === "roles" && (
        <div className="space-y-4">
          {/* Tarjetas de roles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              Object.entries(ROL_CONFIG) as [Rol, (typeof ROL_CONFIG)[Rol]][]
            ).map(([rol, cfg]) => (
              <div
                key={rol}
                className="bg-white rounded-2xl border border-slate-200 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                    text-sm font-bold ${cfg.bg} ${cfg.text}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{cfg.descripcion}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">
                    {USUARIOS_MOCK.filter((u) => u.rol === rol).length}
                  </span>{" "}
                  usuario
                  {USUARIOS_MOCK.filter((u) => u.rol === rol).length !== 1
                    ? "s"
                    : ""}{" "}
                  con este rol
                </div>
              </div>
            ))}
          </div>

          {/* Matriz de permisos */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">
                Matriz de permisos por rol
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                La funcionalidad se aplica mediante políticas RLS en Supabase
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th
                      className="text-left px-5 py-3 text-xs font-bold text-slate-500
                      uppercase tracking-wider w-1/2"
                    >
                      Funcionalidad
                    </th>
                    {(
                      Object.entries(ROL_CONFIG) as [
                        Rol,
                        (typeof ROL_CONFIG)[Rol],
                      ][]
                    ).map(([rol, cfg]) => (
                      <th key={rol} className="px-4 py-3 text-center w-[16%]">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full
                          text-xs font-bold ${cfg.bg} ${cfg.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                          />
                          {cfg.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISOS.map((p, i) => (
                    <tr
                      key={p.modulo}
                      className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                    >
                      <td className="px-5 py-3.5 text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{p.icono}</span>
                          <span className="font-medium text-sm">
                            {p.modulo}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <CeldaPermiso valor={p.admin} />
                      </td>
                      <td className="px-4 py-3.5">
                        <CeldaPermiso valor={p.operativo} />
                      </td>
                      <td className="px-4 py-3.5">
                        <CeldaPermiso valor={p.visualizador} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Leyenda */}
            <div
              className="px-5 py-3 border-t border-slate-100 bg-slate-50/50
              flex flex-wrap items-center gap-5 text-xs text-slate-500"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-2.5 h-2.5"
                  >
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                </span>
                Acceso completo
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="w-2.5 h-2.5"
                  >
                    <line x1="2" y1="6" x2="10" y2="6" />
                  </svg>
                </span>
                Acceso parcial (solo lectura)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center">
                  <svg
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="w-2.5 h-2.5"
                  >
                    <line x1="3" y1="3" x2="9" y2="9" />
                    <line x1="9" y1="3" x2="3" y2="9" />
                  </svg>
                </span>
                Sin acceso
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: INVITAR USUARIO ══════════════ */}
      {tab === "invitar" && (
        <div className="w-full">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Header igual que otros formularios */}
            <div className="bg-linear-to-r from-slate-800 to-slate-900 px-6 md:px-8 py-5">
              <h3 className="font-bold text-white text-xl">
                Invitar nuevo usuario
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                El usuario recibirá un correo con un enlace para configurar su
                contraseña
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Nombre completo" required>
                  <input
                    type="text"
                    placeholder="Ej. María González"
                    className={inputCls}
                    disabled
                  />
                </Field>

                <Field label="Correo electrónico" required>
                  <input
                    type="email"
                    placeholder="correo@empresa.gt"
                    className={inputCls}
                    disabled
                  />
                </Field>

                <Field label="Rol asignado" required>
                  <select className={selectCls} disabled>
                    <option value="operativo">Operativo</option>
                    <option value="visualizador">Visualizador</option>
                    <option value="admin">Administrador</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    El rol puede modificarse después desde la tabla de usuarios
                  </p>
                </Field>
              </div>

              {/* Vista previa del rol seleccionado */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Permisos del rol Operativo
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PERMISOS.filter((p) => p.operativo !== false).map((p) => (
                    <div
                      key={p.modulo}
                      className="flex items-center gap-2 text-xs text-slate-600"
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0
                        ${p.operativo === true ? "bg-green-100" : "bg-amber-100"}`}
                      >
                        {p.operativo === true ? (
                          <svg
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="#16A34A"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-2.5 h-2.5"
                          >
                            <polyline points="1.5 5 4 7.5 8.5 2.5" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="#D97706"
                            strokeWidth="2"
                            strokeLinecap="round"
                            className="w-2 h-2"
                          >
                            <line x1="2" y1="5" x2="8" y2="5" />
                          </svg>
                        )}
                      </span>
                      <span>{p.modulo}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Field label="Mensaje personalizado (opcional)">
                <textarea
                  rows={3}
                  placeholder="Bienvenido al sistema PIMOT…"
                  className={`${inputCls} resize-none`}
                  disabled
                />
              </Field>

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled
                  className="flex-1 py-3.5 bg-orange-300 text-white text-base rounded-xl
                    font-bold cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4"
                  >
                    <path d="M3 8l7-5 7 5v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8z" />
                    <polyline points="9 21 9 13 11 13 11 21" />
                  </svg>
                  Enviar invitación
                </button>
                <button
                  type="button"
                  onClick={() => setTab("usuarios")}
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

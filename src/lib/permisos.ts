import type { ModuloId } from "@/types/ui";

export type Rol = "admin" | "operativo" | "visualizador";

export type Accion =
  | "viajes.crear"
  | "viajes.editar"
  | "viajes.cancelar"
  | "viajes.eliminar"
  | "viajes.verHistorial"
  | "viajes.verViaticos"
  | "viajes.seguimientoEscritura"
  | "pilotos.verLicencia"
  | "pilotos.verViaticos"
  | "pilotos.registrar"
  | "flota.crear"
  | "flota.eliminar"
  | "flota.cambiarEstado"
  | "clientes.eliminar"
  | "clientes.desactivar"
  | "rentas.eliminar"
  | "rentas.gestionarCatalogo"
  | "reportes.exportar"
  | "usuarios.administrar";

export type NivelPermiso = boolean | "parcial";

export interface PermisoMatriz {
  modulo: string;
  icono: string;
  admin: NivelPermiso;
  operativo: NivelPermiso;
  visualizador: NivelPermiso;
}

export const MODULOS_POR_ROL: Record<Rol, ModuloId[]> = {
  admin: [
    "dashboard",
    "viajes",
    "alertas",
    "reportes",
    "flota",
    "pilotos",
    "clientes",
    "renta-chasis",
    "usuarios",
  ],
  operativo: [
    "dashboard",
    "viajes",
    "alertas",
    "reportes",
    "flota",
    "pilotos",
    "clientes",
    "renta-chasis",
  ],
  visualizador: ["viajes", "pilotos"],
};

const ACCIONES_POR_ROL: Record<Rol, readonly Accion[]> = {
  admin: [
    "viajes.crear",
    "viajes.editar",
    "viajes.cancelar",
    "viajes.eliminar",
    "viajes.verHistorial",
    "viajes.verViaticos",
    "viajes.seguimientoEscritura",
    "pilotos.verLicencia",
    "pilotos.verViaticos",
    "pilotos.registrar",
    "flota.crear",
    "flota.eliminar",
    "flota.cambiarEstado",
    "clientes.eliminar",
    "clientes.desactivar",
    "rentas.eliminar",
    "rentas.gestionarCatalogo",
    "reportes.exportar",
    "usuarios.administrar",
  ],
  operativo: [
    "viajes.crear",
    "viajes.editar",
    "viajes.verHistorial",
    "viajes.verViaticos",
    "viajes.seguimientoEscritura",
    "pilotos.verLicencia",
    "pilotos.verViaticos",
    "flota.cambiarEstado",
    "reportes.exportar",
  ],
  visualizador: [],
};

export function esRol(value: unknown): value is Rol {
  return value === "admin" || value === "operativo" || value === "visualizador";
}

export function puedeVerModulo(rol: Rol | null | undefined, modulo: ModuloId): boolean {
  return rol !== null && rol !== undefined && MODULOS_POR_ROL[rol]?.includes(modulo) === true;
}

export function puede(rol: Rol | null | undefined, accion: Accion): boolean {
  return rol !== null && rol !== undefined && ACCIONES_POR_ROL[rol]?.includes(accion) === true;
}

export function moduloInicial(rol: Rol | null | undefined): ModuloId {
  return rol === "visualizador" ? "viajes" : "dashboard";
}

const nivelesPorRol = (
  resolver: (rol: Rol) => NivelPermiso,
): Pick<PermisoMatriz, "admin" | "operativo" | "visualizador"> => ({
  admin: resolver("admin"),
  operativo: resolver("operativo"),
  visualizador: resolver("visualizador"),
});

export const MATRIZ_PERMISOS: PermisoMatriz[] = [
  { modulo: "Panel Principal", icono: "📊", ...nivelesPorRol((rol) => puedeVerModulo(rol, "dashboard")) },
  { modulo: "Viajes activos", icono: "🚛", ...nivelesPorRol((rol) => rol === "visualizador" ? "parcial" : puedeVerModulo(rol, "viajes")) },
  { modulo: "Viajes · historial", icono: "📚", ...nivelesPorRol((rol) => puede(rol, "viajes.verHistorial")) },
  { modulo: "Viajes · nuevo", icono: "➕", ...nivelesPorRol((rol) => puede(rol, "viajes.crear") || puede(rol, "viajes.editar")) },
  { modulo: "Viajes · crear/editar/estado", icono: "✏️", ...nivelesPorRol((rol) => puede(rol, "viajes.crear") && puede(rol, "viajes.editar") && puede(rol, "viajes.seguimientoEscritura")) },
  { modulo: "Viajes · cancelar/eliminar", icono: "⏹️", ...nivelesPorRol((rol) => puede(rol, "viajes.cancelar") && puede(rol, "viajes.eliminar")) },
  { modulo: "Viajes · viáticos", icono: "💰", ...nivelesPorRol((rol) => puede(rol, "viajes.verViaticos")) },
  { modulo: "Seguimiento GPS", icono: "📡", ...nivelesPorRol((rol) => rol === "visualizador" ? "parcial" : puede(rol, "viajes.seguimientoEscritura")) },
  { modulo: "Alertas", icono: "🔔", ...nivelesPorRol((rol) => puedeVerModulo(rol, "alertas")) },
  { modulo: "Reportes · ver", icono: "📄", ...nivelesPorRol((rol) => puedeVerModulo(rol, "reportes")) },
  { modulo: "Reportes · exportar", icono: "⬇️", ...nivelesPorRol((rol) => puede(rol, "reportes.exportar")) },
  { modulo: "Flota · ver", icono: "🏗️", ...nivelesPorRol((rol) => puedeVerModulo(rol, "flota")) },
  { modulo: "Flota · crear/editar/eliminar", icono: "🛠️", ...nivelesPorRol((rol) => puede(rol, "flota.crear") && puede(rol, "flota.eliminar")) },
  { modulo: "Flota · cambiar estado", icono: "🔄", ...nivelesPorRol((rol) => puede(rol, "flota.cambiarEstado")) },
  { modulo: "Pilotos · lista/contacto", icono: "👤", ...nivelesPorRol((rol) => rol === "visualizador" ? "parcial" : puedeVerModulo(rol, "pilotos")) },
  { modulo: "Pilotos · licencia", icono: "🪪", ...nivelesPorRol((rol) => puede(rol, "pilotos.verLicencia")) },
  { modulo: "Pilotos · viáticos", icono: "💰", ...nivelesPorRol((rol) => rol === "operativo" ? "parcial" : puede(rol, "pilotos.verViaticos")) },
  { modulo: "Pilotos · registrar", icono: "➕", ...nivelesPorRol((rol) => puede(rol, "pilotos.registrar")) },
  { modulo: "Clientes · ver/crear/editar", icono: "👥", ...nivelesPorRol((rol) => puedeVerModulo(rol, "clientes")) },
  { modulo: "Clientes · desactivar/eliminar", icono: "⏸️", ...nivelesPorRol((rol) => puede(rol, "clientes.desactivar") && puede(rol, "clientes.eliminar")) },
  { modulo: "Renta de chasis · operar", icono: "🚚", ...nivelesPorRol((rol) => puedeVerModulo(rol, "renta-chasis")) },
  { modulo: "Rentas · eliminar/catálogo", icono: "⚙️", ...nivelesPorRol((rol) => puede(rol, "rentas.eliminar") && puede(rol, "rentas.gestionarCatalogo")) },
  { modulo: "Usuarios y seguridad", icono: "🔒", ...nivelesPorRol((rol) => puede(rol, "usuarios.administrar")) },
];

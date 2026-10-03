import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import type { EstadoViajeDB } from "@/types/database";
import type {
  AlertaReporte,
  CabezalRow,
  ClienteReporte,
  ConteoReporte,
  ChasisRow,
  PilotoReporte,
  RentaAgrupadaReporte,
  RentaReporte,
  SemanaReporte,
  TrackerRow,
  ViajeReporte,
} from "./types";

/** Campos mínimos requeridos para considerar trazable un viaje. */
export const CAMPOS_TRAZABILIDAD = [
  "piloto_id",
  "cabezal_id",
  "chasis_id_o_chasis_externo_placa",
  "cliente_id",
  "destino",
  "lat_destino",
  "lng_destino",
  "fecha_inicio",
  "fecha_estimada",
  "viatico_monto",
] as const;

function tieneValor(valor: unknown): boolean {
  return valor !== null && valor !== undefined && (typeof valor !== "string" || valor.trim().length > 0);
}

export function esViajeCompleto(viaje: ViajeReporte): boolean {
  const camposCompletos =
    tieneValor(viaje.piloto_id) &&
    tieneValor(viaje.cabezal_id) &&
    (tieneValor(viaje.chasis_id) || tieneValor(viaje.chasis_externo_placa)) &&
    tieneValor(viaje.cliente_id) &&
    tieneValor(viaje.destino) &&
    tieneValor(viaje.lat_destino) &&
    tieneValor(viaje.lng_destino) &&
    tieneValor(viaje.fecha_inicio) &&
    tieneValor(viaje.fecha_estimada) &&
    tieneValor(viaje.viatico_monto);

  return camposCompletos && (viaje.estado !== "finalizado" || tieneValor(viaje.fecha_fin));
}

export function porcentajeTrazabilidad(viajes: ViajeReporte[]): number | null {
  const elegibles = viajes.filter((viaje) => viaje.estado !== "cancelado");
  if (elegibles.length === 0) return null;
  return (elegibles.filter(esViajeCompleto).length / elegibles.length) * 100;
}

function duracionViaje(viaje: ViajeReporte): number | null {
  if (typeof viaje.duracion_real_min === "number" && Number.isFinite(viaje.duracion_real_min)) {
    return viaje.duracion_real_min;
  }
  if (!viaje.fecha_inicio || !viaje.fecha_fin) return null;
  const minutos = (new Date(viaje.fecha_fin).getTime() - new Date(viaje.fecha_inicio).getTime()) / 60000;
  return Number.isFinite(minutos) && minutos >= 0 ? minutos : null;
}

export function duracionPromedioMin(viajes: ViajeReporte[]): number | null {
  const duraciones = viajes.filter((viaje) => viaje.estado === "finalizado").map(duracionViaje).filter((value): value is number => value !== null);
  if (duraciones.length === 0) return null;
  return duraciones.reduce((total, value) => total + value, 0) / duraciones.length;
}

export function porcentajeCumplimientoEta(viajes: ViajeReporte[]): number | null {
  const elegibles = viajes.filter((viaje) => viaje.estado === "finalizado" && viaje.fecha_estimada && viaje.fecha_fin);
  if (elegibles.length === 0) return null;
  const aTiempo = elegibles.filter((viaje) => new Date(viaje.fecha_fin as string).getTime() <= new Date(viaje.fecha_estimada as string).getTime());
  return (aTiempo.length / elegibles.length) * 100;
}

function agrupar<T>(items: T[], clave: (item: T) => string | null | undefined): ConteoReporte[] {
  const conteos = new Map<string, number>();
  items.forEach((item) => {
    const valor = clave(item) || "Sin dato";
    conteos.set(valor, (conteos.get(valor) ?? 0) + 1);
  });
  return Array.from(conteos, ([clave, total]) => ({ clave, total })).sort((a, b) => b.total - a.total || a.clave.localeCompare(b.clave));
}

export const viajesPorEstado = (viajes: ViajeReporte[]) => agrupar(viajes, (viaje) => viaje.estado);
export const alertasPorTipo = (alertas: AlertaReporte[]) => agrupar(alertas, (alerta) => alerta.tipo);
export const alertasPorNivel = (alertas: AlertaReporte[]) => agrupar(alertas, (alerta) => alerta.nivel);
export const alertasPorEstado = (alertas: AlertaReporte[]) => agrupar(alertas, (alerta) => alerta.estado);
export const cabezalesPorEstado = (cabezales: CabezalRow[]) => agrupar(cabezales, (cabezal) => cabezal.estado);
export const chasisPorEstado = (chasis: ChasisRow[]) => agrupar(chasis, (item) => item.estado);

export function viajesPorSemana(viajes: ViajeReporte[]): SemanaReporte[] {
  const conteos = new Map<string, number>();
  viajes.forEach((viaje) => {
    const fecha = viaje.fecha_inicio ?? viaje.created_at;
    const semana = startOfWeek(new Date(fecha), { weekStartsOn: 1 });
    const clave = format(semana, "yyyy-MM-dd");
    conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
  });
  return Array.from(conteos, ([clave, total]) => ({ clave, total, etiqueta: format(new Date(`${clave}T00:00:00`), "dd MMM", { locale: es }) })).sort((a, b) => a.clave.localeCompare(b.clave));
}

export function alertasPorSemana(alertas: AlertaReporte[]): SemanaReporte[] {
  const conteos = new Map<string, number>();
  alertas.forEach((alerta) => {
    const semana = startOfWeek(new Date(alerta.created_at), { weekStartsOn: 1 });
    const clave = format(semana, "yyyy-MM-dd");
    conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
  });
  return Array.from(conteos, ([clave, total]) => ({ clave, total, etiqueta: format(new Date(`${clave}T00:00:00`), "dd MMM", { locale: es }) })).sort((a, b) => a.clave.localeCompare(b.clave));
}

export function viajesPorPiloto(viajes: ViajeReporte[]): PilotoReporte[] {
  const mapa = new Map<string, PilotoReporte>();
  viajes.forEach((viaje) => {
    const id = viaje.piloto_id ?? "sin-piloto";
    const actual = mapa.get(id) ?? { id, nombre: viaje.piloto?.nombre ?? "Sin piloto", viajes: 0, finalizados: 0, duracionPromedioMin: null, viaticosTotales: 0 };
    const duracion = viaje.estado === "finalizado" ? duracionViaje(viaje) : null;
    const duraciones = actual.duracionPromedioMin === null ? (duracion === null ? [] : [duracion]) : duracion === null ? [] : [actual.duracionPromedioMin, duracion];
    actual.viajes += 1;
    if (viaje.estado === "finalizado") actual.finalizados += 1;
    actual.viaticosTotales += viaje.viatico_monto ?? 0;
    actual.duracionPromedioMin = duraciones.length ? duraciones.reduce((sum, value) => sum + value, 0) / duraciones.length : actual.duracionPromedioMin;
    mapa.set(id, actual);
  });
  return Array.from(mapa.values()).sort((a, b) => b.viajes - a.viajes || a.nombre.localeCompare(b.nombre));
}

export function viajesPorCliente(viajes: ViajeReporte[]): ClienteReporte[] {
  const mapa = new Map<string, ClienteReporte>();
  viajes.forEach((viaje) => {
    const id = viaje.cliente_id ?? "sin-cliente";
    const actual = mapa.get(id) ?? { id, nombre: viaje.cliente?.nombre ?? "Sin cliente", viajes: 0, fletes: 0, rentas: 0 };
    actual.viajes += 1;
    if (viaje.tipo_servicio === "flete") actual.fletes += 1;
    if (viaje.tipo_servicio === "renta") actual.rentas += 1;
    mapa.set(id, actual);
  });
  return Array.from(mapa.values()).sort((a, b) => b.viajes + b.rentas - a.viajes - a.rentas || a.nombre.localeCompare(b.nombre));
}

export const viaticosPorPiloto = (viajes: ViajeReporte[]) => viajesPorPiloto(viajes).map(({ id, nombre, viaticosTotales }) => ({ id, nombre, total: viaticosTotales }));
export const rentasPorEstado = (rentas: RentaReporte[]) => rentas.map((renta) => renta.estado).filter(Boolean).reduce<ConteoReporte[]>((result, estado) => { const item = result.find((entry) => entry.clave === estado); if (item) item.total += 1; else result.push({ clave: estado, total: 1 }); return result; }, []);

function agruparRentas(rentas: RentaReporte[], clave: (renta: RentaReporte) => string): RentaAgrupadaReporte[] {
  const mapa = new Map<string, RentaAgrupadaReporte>();
  rentas.forEach((renta) => {
    const valor = clave(renta) || "Sin dato";
    const actual = mapa.get(valor) ?? { clave: valor, total: 0, ingresos: 0 };
    actual.total += 1;
    actual.ingresos += renta.costo_total ?? 0;
    mapa.set(valor, actual);
  });
  return Array.from(mapa.values()).sort((a, b) => b.ingresos - a.ingresos || b.total - a.total);
}

export const rentasPorTipo = (rentas: RentaReporte[]) => agruparRentas(rentas, (renta) => renta.tipo_renta?.nombre ?? renta.tipo_renta_id);
export const ingresosPorClienteRenta = (rentas: RentaReporte[]) => agruparRentas(rentas, (renta) => renta.cliente?.nombre ?? renta.cliente_id);
export const ingresoTotalRentas = (rentas: RentaReporte[]) => rentas.reduce((total, renta) => total + (renta.costo_total ?? 0), 0);
export const diasExtraTotales = (rentas: RentaReporte[]) => rentas.reduce((total, renta) => total + (renta.dias_extra ?? 0), 0);

export function coberturaGps(cabezales: CabezalRow[], trackers: TrackerRow[]): number | null {
  if (cabezales.length === 0) return null;
  const vinculados = new Set(trackers.filter((tracker) => tracker.activo && tracker.cabezal_id).map((tracker) => tracker.cabezal_id as string));
  return (cabezales.filter((cabezal) => vinculados.has(cabezal.id)).length / cabezales.length) * 100;
}

export function viajesPorCabezal(viajes: ViajeReporte[]): ConteoReporte[] {
  return agrupar(viajes, (viaje) => viaje.cabezal?.placa ?? viaje.cabezal_id);
}

export function kpisViajes(viajes: ViajeReporte[]) {
  const porEstado = new Map(viajesPorEstado(viajes).map((item) => [item.clave, item.total]));
  return {
    totalViajes: viajes.length,
    finalizados: porEstado.get("finalizado") ?? 0,
    cancelados: porEstado.get("cancelado") ?? 0,
    enCurso: viajes.filter((viaje) => ["en_transito", "en_destino", "de_vuelta"].includes(viaje.estado as EstadoViajeDB)).length,
    duracionPromedioMin: duracionPromedioMin(viajes),
    cumplimientoEta: porcentajeCumplimientoEta(viajes),
    trazabilidad: porcentajeTrazabilidad(viajes),
  };
}

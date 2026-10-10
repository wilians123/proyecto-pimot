import {
  diasExtraTotales,
  esViajeCompleto,
  ingresoTotalRentas,
  kpisViajes,
  viajesPorPiloto,
} from "./calculos";
import type { ReporteDatos } from "./types";

export interface ExportacionReporte {
  datos: ReporteDatos;
  desde: Date;
  hasta: Date;
  usuario: string;
}

function fechaArchivo(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function fechaReal(valor: string | null | undefined): Date | null {
  return valor ? new Date(valor) : null;
}

function agregarEncabezado(hoja: { addRow: (data: unknown[]) => { font: { bold?: boolean }; fill: unknown } }, columnas: string[]) {
  const fila = hoja.addRow(columnas);
  fila.font = { bold: true };
  fila.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
}

function ajustarColumnas(hoja: { columns: Array<{ width?: number }> }, anchos: number[]) {
  anchos.forEach((width, index) => {
    if (hoja.columns[index]) hoja.columns[index].width = width;
  });
}

interface FechaWorksheet {
  eachRow: (callback: (row: FechaRow) => void) => void;
}

interface FechaRow {
  eachCell: (callback: (cell: FechaCell) => void) => void;
}

interface FechaCell {
  value?: unknown;
  numFmt?: string;
}

function formatearFechas(hoja: FechaWorksheet) {
  hoja.eachRow((row) => row.eachCell((cell) => {
    if (cell.value instanceof Date) cell.numFmt = "dd/mm/yyyy";
  }));
}

export async function exportarExcel({ datos, desde, hasta, usuario }: ExportacionReporte): Promise<void> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PIMOT";
  workbook.created = new Date();
  const kpis = kpisViajes(datos.viajes);

  const resumen = workbook.addWorksheet("Resumen");
  resumen.addRow(["PIMOT - Reporte de operaciones"]);
  resumen.addRow(["Rango", desde, hasta]);
  resumen.addRow(["Fecha de generación", new Date()]);
  resumen.addRow(["Usuario que exporta", usuario]);
  resumen.addRow([]);
  agregarEncabezado(resumen, ["Indicador", "Valor"]);
  [
    ["Total de viajes", kpis.totalViajes],
    ["Finalizados", kpis.finalizados],
    ["Cancelados", kpis.cancelados],
    ["En curso", kpis.enCurso],
    ["Duración promedio (min)", kpis.duracionPromedioMin ?? ""],
    ["Cumplimiento ETA (%)", kpis.cumplimientoEta ?? ""],
    ["Trazabilidad (%)", kpis.trazabilidad ?? ""],
    ["Rentas de chasis", datos.rentas.length],
    ["Ingresos de rentas", ingresoTotalRentas(datos.rentas)],
    ["Días extra de rentas", diasExtraTotales(datos.rentas)],
    ["Alertas", datos.alertas.length],
  ].forEach((row) => resumen.addRow(row));
  ajustarColumnas(resumen, [30, 22, 22]);
  formatearFechas(resumen);

  const viajes = workbook.addWorksheet("Viajes");
  agregarEncabezado(viajes, ["Código", "Inicio", "Fin", "Estado", "Destino", "Piloto", "Cabezal", "Chasis", "Cliente", "Tipo de servicio", "Viático", "Registro completo"]);
  datos.viajes.forEach((viaje) => viajes.addRow([
    viaje.codigo ?? "",
    fechaReal(viaje.fecha_inicio),
    fechaReal(viaje.fecha_fin),
    viaje.estado,
    viaje.destino,
    viaje.piloto?.nombre ?? "Sin dato",
    viaje.cabezal?.placa ?? "Sin dato",
    viaje.chasis?.placa ?? viaje.chasis_externo_placa ?? "Sin dato",
    viaje.cliente?.nombre ?? "Sin dato",
    viaje.tipo_servicio,
    viaje.viatico_monto ?? 0,
    esViajeCompleto(viaje) ? "Sí" : "No",
  ]));
  viajes.getColumn(11).numFmt = '"Q" #,##0.00';
  ajustarColumnas(viajes, [16, 14, 14, 16, 36, 24, 14, 14, 24, 18, 14, 18]);
  formatearFechas(viajes);

  const pilotos = workbook.addWorksheet("Pilotos");
  agregarEncabezado(pilotos, ["Piloto", "Viajes", "Finalizados", "Duración promedio (min)", "Viáticos totales"]);
  viajesPorPiloto(datos.viajes).forEach((piloto) => pilotos.addRow([piloto.nombre, piloto.viajes, piloto.finalizados, piloto.duracionPromedioMin ?? "", piloto.viaticosTotales]));
  pilotos.getColumn(5).numFmt = '"Q" #,##0.00';
  ajustarColumnas(pilotos, [28, 12, 14, 24, 20]);

  const flota = workbook.addWorksheet("Flota");
  agregarEncabezado(flota, ["Tipo", "Placa / etiqueta", "Estado", "Tracker activo"]);
  datos.cabezales.forEach((cabezal) => flota.addRow(["Cabezal", cabezal.placa, cabezal.estado, datos.trackers.some((tracker) => tracker.activo && tracker.cabezal_id === cabezal.id) ? "Sí" : "No"]));
  datos.chasis.forEach((chasis) => flota.addRow(["Chasis", chasis.placa, chasis.estado, "No aplica"]));
  ajustarColumnas(flota, [14, 24, 22, 18]);

  const rentas = workbook.addWorksheet("Rentas");
  agregarEncabezado(rentas, ["Inicio", "Fin", "Estado", "Chasis", "Cliente", "Tipo de renta", "Días extra", "Costo total"]);
  datos.rentas.forEach((renta) => rentas.addRow([fechaReal(renta.fecha_inicio), fechaReal(renta.fecha_fin), renta.estado, renta.chasis?.placa ?? "Sin dato", renta.cliente?.nombre ?? "Sin dato", renta.tipo_renta?.nombre ?? "Sin dato", renta.dias_extra, renta.costo_total]));
  rentas.getColumn(8).numFmt = '"Q" #,##0.00';
  ajustarColumnas(rentas, [14, 14, 16, 16, 26, 24, 14, 18]);
  formatearFechas(rentas);

  const alertas = workbook.addWorksheet("Alertas");
  agregarEncabezado(alertas, ["Fecha", "Tipo", "Nivel", "Estado", "Mensaje", "Canales"]);
  datos.alertas.forEach((alerta) => alertas.addRow([fechaReal(alerta.created_at), alerta.tipo, alerta.nivel, alerta.estado, alerta.mensaje, alerta.canal_push ? "Push" : ""]));
  ajustarColumnas(alertas, [14, 24, 16, 16, 60, 28]);
  formatearFechas(alertas);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `pimot-reporte_${fechaArchivo(desde)}_a_${fechaArchivo(hasta)}.xlsx`;
  enlace.click();
  URL.revokeObjectURL(url);
  void ingresoTotalRentas(datos.rentas);
  void diasExtraTotales(datos.rentas);
}

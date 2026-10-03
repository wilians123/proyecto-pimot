import {
  alertasPorEstado,
  alertasPorNivel,
  alertasPorTipo,
  cabezalesPorEstado,
  chasisPorEstado,
  diasExtraTotales,
  ingresoTotalRentas,
  ingresosPorClienteRenta,
  kpisViajes,
  rentasPorEstado,
  rentasPorTipo,
  viajesPorCliente,
  viajesPorPiloto,
} from "./calculos";
import type { ReporteDatos } from "./types";

export interface ExportacionPdf {
  datos: ReporteDatos;
  desde: Date;
  hasta: Date;
  usuario: string;
}

function fechaArchivo(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function formatoFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-GT", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Guatemala" });
}

function moneda(valor: number): string {
  return `Q ${valor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function tabla(doc: { lastAutoTable?: { finalY: number } }, autoTable: (doc: unknown, options: Record<string, unknown>) => void, titulo: string, encabezados: string[], filas: Array<Array<string | number>>) {
  const y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 12 : 42;
  autoTable(doc, { startY: y, head: [encabezados], body: filas, theme: "grid", headStyles: { fillColor: [249, 115, 22] }, styles: { font: "helvetica", fontSize: 8 }, didDrawPage: (data: { settings: { startY: number } }) => { if (data.settings.startY === y) { /* el titulo se escribe antes de la tabla */ } } });
  void titulo;
}

export async function exportarPdf({ datos, desde, hasta, usuario }: ExportacionPdf): Promise<void> {
  const { default: JsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new JsPDF({ unit: "mm", format: "a4" });
  const docWithTable = doc as typeof doc & { lastAutoTable?: { finalY: number } };
  const kpis = kpisViajes(datos.viajes);
  const reporteTitulo = "PIMOT - Reporte de operaciones";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(reporteTitulo, 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Rango: ${formatoFecha(desde)} a ${formatoFecha(hasta)}`, 14, 25);
  doc.text(`Generado: ${formatoFecha(new Date())} | Usuario: ${usuario}`, 14, 30);
  doc.setFontSize(11);
  doc.text("Indicadores clave", 14, 39);

  const filasKpi: Array<[string, string]> = [
    ["Total de viajes", String(kpis.totalViajes)],
    ["Finalizados", String(kpis.finalizados)],
    ["Cancelados", String(kpis.cancelados)],
    ["En curso", String(kpis.enCurso)],
    ["Duracion promedio", kpis.duracionPromedioMin === null ? "Sin dato" : `${kpis.duracionPromedioMin.toFixed(1)} min`],
    ["Cumplimiento ETA", kpis.cumplimientoEta === null ? "Sin dato" : `${kpis.cumplimientoEta.toFixed(1)}%`],
    ["Trazabilidad", kpis.trazabilidad === null ? "Sin dato" : `${kpis.trazabilidad.toFixed(1)}%`],
  ];
  autoTable(doc, { startY: 42, head: [["Indicador", "Valor"]], body: filasKpi, theme: "grid", headStyles: { fillColor: [249, 115, 22] }, styles: { font: "helvetica", fontSize: 9 } });

  const agregarSeccion = (titulo: string, encabezados: string[], filas: Array<Array<string | number>>) => {
    const y = (docWithTable.lastAutoTable?.finalY ?? 42) + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(titulo, 14, y - 3);
    tabla(docWithTable, autoTable, titulo, encabezados, filas);
  };

  agregarSeccion("Detalle de viajes", ["Codigo", "Destino", "Piloto", "Cliente", "Estado"], datos.viajes.map((viaje) => [viaje.codigo ?? "Sin dato", viaje.destino, viaje.piloto?.nombre ?? "Sin dato", viaje.cliente?.nombre ?? "Sin dato", viaje.estado]));
  agregarSeccion("Viajes por piloto", ["Piloto", "Viajes", "Finalizados", "Viaticos"], viajesPorPiloto(datos.viajes).map((item) => [item.nombre, item.viajes, item.finalizados, moneda(item.viaticosTotales)]));
  agregarSeccion("Viajes por cliente", ["Cliente", "Viajes", "Fletes", "Rentas"], viajesPorCliente(datos.viajes).map((item) => [item.nombre, item.viajes, item.fletes, item.rentas]));
  agregarSeccion("Flota", ["Tipo", "Estado", "Total"], [...cabezalesPorEstado(datos.cabezales).map((item) => ["Cabezal", item.clave, item.total]), ...chasisPorEstado(datos.chasis).map((item) => ["Chasis", item.clave, item.total])]);
  const rentasResumen = rentasPorEstado(datos.rentas).map((item) => {
    const rentasEstado = datos.rentas.filter((renta) => renta.estado === item.clave);
    return [item.clave, item.total, moneda(rentasEstado.reduce((total, renta) => total + renta.costo_total, 0)), rentasEstado.reduce((total, renta) => total + renta.dias_extra, 0)];
  });
  rentasResumen.push(["Total", datos.rentas.length, moneda(ingresoTotalRentas(datos.rentas)), diasExtraTotales(datos.rentas)]);
  agregarSeccion("Rentas de chasis", ["Estado", "Rentas", "Ingresos", "Días extra"], rentasResumen);
  agregarSeccion("Tipos de renta", ["Tipo", "Rentas", "Ingresos"], rentasPorTipo(datos.rentas).map((item) => [item.clave, item.total, moneda(item.ingresos)]));
  agregarSeccion("Ingresos por cliente", ["Cliente", "Rentas", "Ingresos"], ingresosPorClienteRenta(datos.rentas).map((item) => [item.clave, item.total, moneda(item.ingresos)]));
  agregarSeccion("Alertas", ["Grupo", "Total"], [...alertasPorTipo(datos.alertas).map((item) => [`Tipo: ${item.clave}`, item.total]), ...alertasPorNivel(datos.alertas).map((item) => [`Nivel: ${item.clave}`, item.total]), ...alertasPorEstado(datos.alertas).map((item) => [`Estado: ${item.clave}`, item.total])]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Tiempo de respuesta: no disponible. La tabla de alertas aun no registra la hora de deteccion y de envio.", 14, (docWithTable.lastAutoTable?.finalY ?? 42) + 10);

  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.text(`Pagina ${pagina} de ${paginas}`, 180, 290, { align: "right" });
  }
  doc.save(`pimot-reporte_${fechaArchivo(desde)}_a_${fechaArchivo(hasta)}.pdf`);
}

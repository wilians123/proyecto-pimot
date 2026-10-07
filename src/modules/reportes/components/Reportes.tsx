"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/context/AuthContext";
import KpiCard from "@/components/shared/KpiCard";
import Badge from "@/components/shared/Badge";
import { icons } from "@/lib/constants";
import { useReportes } from "@/hooks/useReportes";
import { exportarExcel } from "@/utils/reportes/exportarExcel";
import { exportarPdf } from "@/utils/reportes/exportarPdf";
import {
  alertasPorEstado,
  alertasPorNivel,
  alertasPorSemana,
  alertasPorTipo,
  cabezalesPorEstado,
  chasisPorEstado,
  coberturaGps,
  diasExtraTotales,
  ingresoTotalRentas,
  ingresosPorClienteRenta,
  kpisViajes,
  rentasPorEstado,
  rentasPorTipo,
  viajesPorCabezal,
  viajesPorCliente,
  viajesPorEstado,
  viajesPorPiloto,
  viajesPorSemana,
} from "@/utils/reportes/calculos";
import type {
  ConteoReporte,
  ReporteDatos,
  SemanaReporte,
} from "@/utils/reportes/types";
import type { EstadoViajeUI } from "@/types/ui";
import { leerSeccionInicial, sincronizarSeccion } from "@/lib/seccion-url";

type RangoId = "30" | "mes" | "anterior" | "60" | "personalizado";
type TabId = "resumen" | "viajes" | "flota" | "rentas" | "alertas";

const SECCIONES_REPORTES: readonly TabId[] = [
  "resumen",
  "viajes",
  "flota",
  "rentas",
  "alertas",
];

const NARANJA = "#f97316";
const GRISES = [
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
  "#475569",
  "#fdba74",
  "#334155",
];
const ETIQUETAS: Record<string, string> = {
  programado: "Programado",
  en_transito: "En tránsito",
  en_destino: "En destino",
  de_vuelta: "De vuelta",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
  activo: "Activo",
  en_viaje: "En viaje",
  en_mantenimiento: "Mantenimiento",
  inactivo: "Inactivo",
  disponible: "Disponible",
  en_renta: "En renta",
  en_flete: "En flete",
  en_taller: "En taller",
  activa: "Activa",
  cerrada: "Cerrada",
  cancelada: "Cancelada",
  info: "Información",
  advertencia: "Advertencia",
  critico: "Crítico",
  pendiente: "Pendiente",
  enviada: "Enviada",
  vista: "Vista",
  resuelta: "Resuelta",
};

function textoEstado(estado: string): string {
  return ETIQUETAS[estado] ?? estado.replaceAll("_", " ");
}
function valorMoneda(valor: number): string {
  return `Q ${valor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function valorPorcentaje(valor: number | null): string {
  return valor === null ? "—" : `${valor.toFixed(1)}%`;
}
function valorDuracion(minutos: number | null): string {
  if (minutos === null) return "—";
  const total = Math.round(minutos);
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}
function fechaInput(fecha: Date): string {
  return format(fecha, "yyyy-MM-dd");
}
function fechaLocal(valor: string): Date {
  return new Date(`${valor}T00:00:00`);
}
function rangoPreset(rango: RangoId): [Date, Date] {
  const hoy = new Date();
  if (rango === "mes") return [startOfMonth(hoy), endOfMonth(hoy)];
  if (rango === "anterior") {
    const anterior = subMonths(hoy, 1);
    return [startOfMonth(anterior), endOfMonth(anterior)];
  }
  if (rango === "60") return [subDays(hoy, 59), hoy];
  return [subDays(hoy, 29), hoy];
}

function Panel({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 min-w-0">
      <h3 className="font-semibold text-slate-800 mb-4">{titulo}</h3>
      {children}
    </section>
  );
}
function Vacio() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
      Sin datos en el rango seleccionado
    </div>
  );
}
function Skeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 animate-pulse">
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="h-64 rounded-2xl bg-slate-200 md:col-span-2" />
      <div className="h-64 rounded-2xl bg-slate-200 md:col-span-2" />
    </div>
  );
}

function TablaConteos({
  filas,
  titulo = "Categoría",
}: {
  filas: ConteoReporte[];
  titulo?: string;
}) {
  if (!filas.length)
    return (
      <p className="text-sm text-slate-400 py-6 text-center">
        Sin datos en el rango seleccionado
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[320px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="py-2 pr-4 font-medium">{titulo}</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.clave} className="border-b border-slate-50">
              <td className="py-2.5 pr-4 text-slate-700">
                {textoEstado(fila.clave)}
              </td>
              <td className="py-2.5 text-right font-semibold text-slate-800">
                {fila.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function TablaEstadosViaje({ filas }: { filas: ConteoReporte[] }) {
  if (!filas.length)
    return (
      <p className="text-sm text-slate-400 py-6 text-center">
        Sin datos en el rango seleccionado
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[320px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.clave} className="border-b border-slate-50">
              <td className="py-2.5 pr-4">
                <Badge estado={fila.clave as EstadoViajeUI} />
              </td>
              <td className="py-2.5 text-right font-semibold text-slate-800">
                {fila.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GraficaSemanas({ datos }: { datos: SemanaReporte[] }) {
  return (
    <div className="h-64 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#e2e8f0"
          />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar
            dataKey="total"
            name="Viajes"
            fill={NARANJA}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
function GraficaConteos({ datos }: { datos: ConteoReporte[] }) {
  return (
    <div className="h-64 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={datos}
          layout="vertical"
          margin={{ left: 8, right: 12 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="#e2e8f0"
          />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="clave"
            width={90}
            tick={{ fontSize: 10 }}
            tickFormatter={textoEstado}
          />
          <Tooltip />
          <Bar
            dataKey="total"
            name="Total"
            fill={NARANJA}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
function GraficaCircular({ datos }: { datos: ConteoReporte[] }) {
  return (
    <div className="h-64 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={datos}
            dataKey="total"
            nameKey="clave"
            cx="50%"
            cy="45%"
            outerRadius={78}
            label={({ name, value }) =>
              `${textoEstado(String(name))}: ${value}`
            }
          >
            <>
              {datos.map((dato, index) => (
                <Cell
                  key={dato.clave}
                  fill={index === 0 ? NARANJA : GRISES[index % GRISES.length]}
                />
              ))}
            </>
          </Pie>
          <Tooltip />
          <Legend formatter={(value) => textoEstado(String(value))} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TablaPilotos({
  datos,
}: {
  datos: ReturnType<typeof viajesPorPiloto>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[620px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="py-2 pr-4 font-medium">Piloto</th>
            <th className="py-2 pr-4 font-medium">Viajes</th>
            <th className="py-2 pr-4 font-medium">Finalizados</th>
            <th className="py-2 pr-4 font-medium">Duración promedio</th>
            <th className="py-2 text-right font-medium">Viáticos</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((fila) => (
            <tr key={fila.id} className="border-b border-slate-50">
              <td className="py-2.5 pr-4 text-slate-700">{fila.nombre}</td>
              <td className="py-2.5 pr-4">{fila.viajes}</td>
              <td className="py-2.5 pr-4">{fila.finalizados}</td>
              <td className="py-2.5 pr-4">
                {valorDuracion(fila.duracionPromedioMin)}
              </td>
              <td className="py-2.5 text-right font-medium">
                {valorMoneda(fila.viaticosTotales)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function TablaClientes({
  datos,
}: {
  datos: ReturnType<typeof viajesPorCliente>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[520px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="py-2 pr-4 font-medium">Cliente</th>
            <th className="py-2 pr-4 font-medium">Viajes</th>
            <th className="py-2 pr-4 font-medium">Fletes</th>
            <th className="py-2 text-right font-medium">Rentas</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((fila) => (
            <tr key={fila.id} className="border-b border-slate-50">
              <td className="py-2.5 pr-4 text-slate-700">{fila.nombre}</td>
              <td className="py-2.5 pr-4">{fila.viajes}</td>
              <td className="py-2.5 pr-4">{fila.fletes}</td>
              <td className="py-2.5 text-right">{fila.rentas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function TablaDetalleViajes({ datos }: { datos: ReporteDatos["viajes"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[760px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="py-2 pr-4 font-medium">Código</th>
            <th className="py-2 pr-4 font-medium">Destino</th>
            <th className="py-2 pr-4 font-medium">Piloto</th>
            <th className="py-2 pr-4 font-medium">Cliente</th>
            <th className="py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((viaje) => (
            <tr key={viaje.id} className="border-b border-slate-50">
              <td className="py-2.5 pr-4">{viaje.codigo ?? "—"}</td>
              <td className="py-2.5 pr-4 text-slate-700">{viaje.destino}</td>
              <td className="py-2.5 pr-4">{viaje.piloto?.nombre ?? "—"}</td>
              <td className="py-2.5 pr-4">{viaje.cliente?.nombre ?? "—"}</td>
              <td className="py-2.5">
                <Badge estado={viaje.estado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function TablaRentas({ datos }: { datos: ReporteDatos["rentas"] }) {
  if (!datos.length) return <Vacio />;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="py-2 pr-4 font-medium">Inicio</th>
            <th className="py-2 pr-4 font-medium">Chasis</th>
            <th className="py-2 pr-4 font-medium">Cliente</th>
            <th className="py-2 pr-4 font-medium">Tipo</th>
            <th className="py-2 pr-4 font-medium">Estado</th>
            <th className="py-2 pr-4 font-medium">Días extra</th>
            <th className="py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((renta) => (
            <tr key={renta.id} className="border-b border-slate-50">
              <td className="py-2.5 pr-4">
                {format(
                  fechaLocal(renta.fecha_inicio.slice(0, 10)),
                  "dd/MM/yyyy",
                )}
              </td>
              <td className="py-2.5 pr-4">{renta.chasis?.placa ?? "—"}</td>
              <td className="py-2.5 pr-4">{renta.cliente?.nombre ?? "—"}</td>
              <td className="py-2.5 pr-4">{renta.tipo_renta?.nombre ?? "—"}</td>
              <td className="py-2.5 pr-4">{textoEstado(renta.estado)}</td>
              <td className="py-2.5 pr-4">{renta.dias_extra}</td>
              <td className="py-2.5 text-right font-medium">
                {valorMoneda(renta.costo_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Reportes() {
  const hoy = new Date();
  const [rango, setRango] = useState<RangoId>("30");
  const [desde, setDesde] = useState<Date>(() => subDays(hoy, 29));
  const [hasta, setHasta] = useState<Date>(() => hoy);
  const [tab, setTab] = useState<TabId>(() =>
    leerSeccionInicial("reportes", "resumen", SECCIONES_REPORTES),
  );

  useEffect(() => {
    sincronizarSeccion("reportes", tab);
  }, [tab]);
  const [exportando, setExportando] = useState<"excel" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { datos, loading, error, refetch, limitReached } = useReportes(
    desde,
    hasta,
  );
  const kpis = useMemo(() => kpisViajes(datos.viajes), [datos.viajes]);
  const sinDatos =
    datos.viajes.length + datos.rentas.length + datos.alertas.length === 0;
  const rangoValido = desde <= hasta;
  const usuario = profile?.nombre?.trim() || "Usuario";
  const rangoTexto = `${format(desde, "dd/MM/yyyy", { locale: es })} a ${format(hasta, "dd/MM/yyyy", { locale: es })}`;
  const cambiarRango = (valor: RangoId) => {
    setRango(valor);
    if (valor !== "personalizado") {
      const [nuevoDesde, nuevoHasta] = rangoPreset(valor);
      setDesde(nuevoDesde);
      setHasta(nuevoHasta);
    }
  };
  const exportar = async (tipo: "excel" | "pdf") => {
    if (sinDatos || !rangoValido) return;
    setExportando(tipo);
    setExportError(null);
    try {
      if (tipo === "excel")
        await exportarExcel({ datos, desde, hasta, usuario });
      else await exportarPdf({ datos, desde, hasta, usuario });
    } catch (exportacionError) {
      setExportError(
        exportacionError instanceof Error
          ? exportacionError.message
          : "No se pudo generar el archivo.",
      );
    } finally {
      setExportando(null);
    }
  };
  const tabs: Array<[TabId, string]> = [
    ["resumen", "Resumen"],
    ["viajes", "Viajes"],
    ["flota", "Flota y GPS"],
    ["rentas", "Rentas de chasis"],
    ["alertas", "Alertas"],
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5 shrink-0 text-slate-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v3M17.25 3v3M4.5 8.25h15M5.25 5.25h13.5A1.5 1.5 0 0 1 20.25 6.75v12A1.5 1.5 0 0 1 18.75 20.25H5.25a1.5 1.5 0 0 1-1.5-1.5v-12a1.5 1.5 0 0 1 1.5-1.5Z"
            />
          </svg>
          <span className="truncate text-sm font-medium text-slate-700">
            Indicadores de operaciones: {rangoTexto}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative">
            <span className="sr-only">Rango</span>
            <select
              value={rango}
              onChange={(event) => cambiarRango(event.target.value as RangoId)}
              className="h-10 min-w-44 appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="30">Últimos 30 días</option>
              <option value="mes">Mes actual</option>
              <option value="anterior">Mes anterior</option>
              <option value="60">Últimos 60 días</option>
              <option value="personalizado">Personalizado</option>
            </select>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m5 7.5 5 5 5-5"
              />
            </svg>
          </label>
          {rango === "personalizado" && (
            <>
              <label className="sr-only" htmlFor="reportes-desde">
                Desde
              </label>
              <input
                id="reportes-desde"
                type="date"
                aria-label="Desde"
                value={fechaInput(desde)}
                onChange={(event) => setDesde(fechaLocal(event.target.value))}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
              <label className="sr-only" htmlFor="reportes-hasta">
                Hasta
              </label>
              <input
                id="reportes-hasta"
                type="date"
                aria-label="Hasta"
                value={fechaInput(hasta)}
                onChange={(event) => setHasta(fechaLocal(event.target.value))}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </>
          )}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={loading || !rangoValido}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 11a8.1 8.1 0 0 0-14.6-4.8L4 8m0 0V4m0 4h4M4 13a8.1 8.1 0 0 0 14.6 4.8L20 16m0 0v4m0-4h-4"
              />
            </svg>
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => void exportar("excel")}
            disabled={
              loading || sinDatos || !rangoValido || exportando !== null
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#f25c05] px-4 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path strokeLinecap="round" d="M4 9h16M9 9v11M14 9v11" />
            </svg>
            {exportando === "excel" ? "Generando…" : "Exportar Excel"}
          </button>
          <button
            type="button"
            onClick={() => void exportar("pdf")}
            disabled={
              loading || sinDatos || !rangoValido || exportando !== null
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-4 w-4 text-red-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 3.75h7l4 4v12.5H7a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 7 3.75Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 3.75v4h4M8.5 15.5h7M8.5 12.5h5"
              />
            </svg>
            {exportando === "pdf" ? "Generando…" : "Exportar PDF"}
          </button>
        </div>
      </div>
      {!rangoValido && (
        <p className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">
          La fecha Desde debe ser anterior o igual a Hasta.
        </p>
      )}
      {limitReached && (
        <p className="bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-sm">
          Resultados limitados a 1000 registros; acorta el rango.
        </p>
      )}
      {exportError && (
        <p className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">
          {exportError}
        </p>
      )}
      {error && (
        <p className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-sm">
          No se pudieron cargar los reportes: {error}
        </p>
      )}
      <div className="flex justify-center">
        <div className="inline-flex max-w-full bg-white border border-slate-200 p-1 rounded-2xl shadow-sm gap-1 flex-wrap justify-center">
          {tabs.map(([id, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${tab === id ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <Skeleton />
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-red-600">
          No se pudieron cargar los datos del reporte.
        </div>
      ) : sinDatos ? (
        <Vacio />
      ) : (
        <>
          {tab === "resumen" && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard titulo="Total de viajes" valor={kpis.totalViajes} />
                <KpiCard
                  titulo="Finalizados"
                  valor={kpis.finalizados}
                  color="text-green-700"
                />
                <KpiCard
                  titulo="Cancelados"
                  valor={kpis.cancelados}
                  color="text-red-600"
                />
                <KpiCard
                  titulo="En curso"
                  valor={kpis.enCurso}
                  color="text-orange-600"
                />
                <KpiCard
                  titulo="Duración promedio"
                  valor={valorDuracion(kpis.duracionPromedioMin)}
                />
                <KpiCard
                  titulo="Cumplimiento ETA"
                  valor={valorPorcentaje(kpis.cumplimientoEta)}
                />
                <KpiCard
                  titulo="Trazabilidad"
                  valor={valorPorcentaje(kpis.trazabilidad)}
                />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel titulo="Viajes por semana">
                  <GraficaSemanas datos={viajesPorSemana(datos.viajes)} />
                </Panel>
                <Panel titulo="Viajes por estado">
                  <GraficaCircular datos={viajesPorEstado(datos.viajes)} />
                </Panel>
              </div>
            </div>
          )}
          {tab === "viajes" && (
            <div className="space-y-5">
              <Panel titulo="Detalle de viajes">
                <TablaDetalleViajes datos={datos.viajes} />
              </Panel>
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel titulo="Resumen por piloto">
                  <TablaPilotos datos={viajesPorPiloto(datos.viajes)} />
                </Panel>
                <Panel titulo="Resumen por cliente">
                  <TablaClientes datos={viajesPorCliente(datos.viajes)} />
                </Panel>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel titulo="Viajes por piloto">
                  <GraficaConteos
                    datos={viajesPorPiloto(datos.viajes).map((piloto) => ({
                      clave: piloto.nombre,
                      total: piloto.viajes,
                    }))}
                  />
                </Panel>
                <Panel titulo="Viajes por estado">
                  <TablaEstadosViaje filas={viajesPorEstado(datos.viajes)} />
                </Panel>
              </div>
            </div>
          )}
          {tab === "flota" && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard titulo="Cabezales" valor={datos.cabezales.length} />
                <KpiCard titulo="Chasis" valor={datos.chasis.length} />
                <KpiCard
                  titulo="Cobertura GPS"
                  valor={valorPorcentaje(
                    coberturaGps(datos.cabezales, datos.trackers),
                  )}
                />
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel titulo="Cabezales por estado">
                  <TablaConteos filas={cabezalesPorEstado(datos.cabezales)} />
                </Panel>
                <Panel titulo="Chasis por estado">
                  <TablaConteos filas={chasisPorEstado(datos.chasis)} />
                </Panel>
              </div>
              <Panel titulo="Viajes por cabezal">
                <TablaConteos
                  filas={viajesPorCabezal(datos.viajes)}
                  titulo="Cabezal"
                />
              </Panel>
            </div>
          )}
          {tab === "rentas" && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard titulo="Rentas" valor={datos.rentas.length} />
                <KpiCard
                  titulo="Ingresos totales"
                  valor={valorMoneda(ingresoTotalRentas(datos.rentas))}
                />
                <KpiCard
                  titulo="Días extra"
                  valor={diasExtraTotales(datos.rentas)}
                />
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                <Panel titulo="Rentas por estado">
                  <TablaConteos filas={rentasPorEstado(datos.rentas)} />
                </Panel>
                <Panel titulo="Ingresos por tipo de renta">
                  <TablaConteos
                    filas={rentasPorTipo(datos.rentas).map((item) => ({
                      clave: `${item.clave} (${valorMoneda(item.ingresos)})`,
                      total: item.total,
                    }))}
                    titulo="Tipo"
                  />
                </Panel>
                <Panel titulo="Ingresos por cliente">
                  <TablaConteos
                    filas={ingresosPorClienteRenta(datos.rentas).map(
                      (item) => ({
                        clave: `${item.clave} (${valorMoneda(item.ingresos)})`,
                        total: item.total,
                      }),
                    )}
                    titulo="Cliente"
                  />
                </Panel>
              </div>
              <TablaRentas datos={datos.rentas} />
            </div>
          )}
          {tab === "alertas" && (
            <div className="space-y-5">
              <Panel titulo="Tiempo de respuesta">
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                  Tiempo de respuesta: no disponible. La tabla de alertas aún no
                  registra la hora de detección y de envío.
                </div>
              </Panel>
              <div className="grid gap-5 lg:grid-cols-3">
                <Panel titulo="Por tipo">
                  <TablaConteos filas={alertasPorTipo(datos.alertas)} />
                </Panel>
                <Panel titulo="Por nivel">
                  <TablaConteos filas={alertasPorNivel(datos.alertas)} />
                </Panel>
                <Panel titulo="Por estado">
                  <TablaConteos filas={alertasPorEstado(datos.alertas)} />
                </Panel>
              </div>
              <Panel titulo="Alertas por semana">
                <GraficaSemanas datos={alertasPorSemana(datos.alertas)} />
              </Panel>
              <Panel titulo="Detalle de alertas">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                        <th className="py-2 pr-4 font-medium">Fecha</th>
                        <th className="py-2 pr-4 font-medium">Tipo</th>
                        <th className="py-2 pr-4 font-medium">Nivel</th>
                        <th className="py-2 pr-4 font-medium">Estado</th>
                        <th className="py-2 font-medium">Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datos.alertas.map((alerta) => (
                        <tr
                          key={alerta.id}
                          className="border-b border-slate-50"
                        >
                          <td className="py-2.5 pr-4">
                            {format(new Date(alerta.created_at), "dd/MM/yyyy")}
                          </td>
                          <td className="py-2.5 pr-4">{alerta.tipo}</td>
                          <td className="py-2.5 pr-4">
                            <span
                              className={
                                alerta.nivel === "critico"
                                  ? "bg-red-50 text-red-600 px-2 py-1 rounded-full text-xs"
                                  : "text-slate-600"
                              }
                            >
                              {textoEstado(alerta.nivel)}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4">
                            {textoEstado(alerta.estado)}
                          </td>
                          <td className="py-2.5">{alerta.mensaje}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}

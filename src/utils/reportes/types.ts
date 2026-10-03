import type { Database } from "@/types/database";

export type ViajeRow = Database["public"]["Tables"]["viajes"]["Row"];
export type PilotoRow = Database["public"]["Tables"]["pilotos"]["Row"];
export type CabezalRow = Database["public"]["Tables"]["cabezales"]["Row"];
export type ChasisRow = Database["public"]["Tables"]["chasis"]["Row"];
export type ClienteRow = Database["public"]["Tables"]["clientes"]["Row"];
export type AlertaRow = Database["public"]["Tables"]["alertas"]["Row"];
export type RentaRow = Database["public"]["Tables"]["rentas_chasis"]["Row"];
export type TipoRentaRow = Database["public"]["Tables"]["tipos_renta"]["Row"];
export type TrackerRow = Database["public"]["Tables"]["navixy_trackers"]["Row"];

export type ViajeReporte = ViajeRow & {
  piloto?: PilotoRow | null;
  cabezal?: CabezalRow | null;
  chasis?: ChasisRow | null;
  cliente?: ClienteRow | null;
};

export type RentaReporte = RentaRow & {
  chasis?: ChasisRow | null;
  cliente?: ClienteRow | null;
  tipo_renta?: TipoRentaRow | null;
};

export type AlertaReporte = AlertaRow;

export interface ReporteDatos {
  viajes: ViajeReporte[];
  rentas: RentaReporte[];
  alertas: AlertaReporte[];
  cabezales: CabezalRow[];
  chasis: ChasisRow[];
  trackers: TrackerRow[];
}

export interface ConteoReporte {
  clave: string;
  total: number;
}

export interface SemanaReporte extends ConteoReporte {
  etiqueta: string;
}

export interface PilotoReporte {
  id: string;
  nombre: string;
  viajes: number;
  finalizados: number;
  duracionPromedioMin: number | null;
  viaticosTotales: number;
}

export interface ClienteReporte {
  id: string;
  nombre: string;
  viajes: number;
  fletes: number;
  rentas: number;
}

export interface RentaAgrupadaReporte extends ConteoReporte {
  ingresos: number;
}

export interface ReporteKpis {
  totalViajes: number;
  finalizados: number;
  cancelados: number;
  enCurso: number;
  duracionPromedioMin: number | null;
  cumplimientoEta: number | null;
  trazabilidad: number | null;
}

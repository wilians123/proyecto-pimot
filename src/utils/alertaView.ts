import type { AlertaConViaje } from "@/hooks/useAlertas";
import type { AlertaResumen } from "@/types/ui";

export function formatTiempoAlerta(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return "—";

  const minutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} días`;
}

export function alertaAResumen(alerta: AlertaConViaje): AlertaResumen {
  return {
    id: alerta.id,
    tipo: alerta.tipo,
    nivel: alerta.nivel,
    mensaje: alerta.mensaje,
    viaje: alerta.viaje?.codigo ?? alerta.viaje_id ?? "Sin viaje asociado",
    tiempo: formatTiempoAlerta(alerta.created_at),
  };
}

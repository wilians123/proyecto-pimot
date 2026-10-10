import type { TipoAlerta, NivelAlerta } from "@/types";

export interface Contenido {
  title: string;
  body: string;
  data: Record<string, string>;
}

interface AlertaParaPush {
  id: string;
  tipo: TipoAlerta | string;
  nivel: NivelAlerta | string;
  mensaje: string;
}

export function construirContenido(alerta: AlertaParaPush): Contenido {
  const titulos: Record<string, string> = {
    inicio_viaje: "🚛 Viaje iniciado",
    llegada_destino: "📍 Llegada a destino",
    retorno_viaje: "↩️ Viaje de vuelta",
    finalizacion_viaje: "✅ Viaje finalizado",
  };
  const title = titulos[alerta.tipo] ?? (
    alerta.nivel === "critico" ? "🚨 Alerta crítica" :
      alerta.nivel === "advertencia" ? "⚠️ Advertencia" : "🔔 PIMOT"
  );
  return {
    title,
    body: alerta.mensaje,
    data: {
      alertaId: String(alerta.id),
      tipo: String(alerta.tipo),
      nivel: String(alerta.nivel),
      url: "/?modulo=alertas",
    },
  };
}

import { construirContenido } from "../contenido";

describe("construirContenido", () => {
  test("U7: títulos de los eventos de viaje", () => {
    const expected = {
      inicio_viaje: "🚛 Viaje iniciado",
      llegada_destino: "📍 Llegada a destino",
      retorno_viaje: "↩️ Viaje de vuelta",
      finalizacion_viaje: "✅ Viaje finalizado",
    };
    for (const [tipo, title] of Object.entries(expected)) {
      expect(construirContenido({ id: "a", tipo, nivel: "info", mensaje: "m" }).title).toBe(title);
    }
  });
  test("U8: títulos por nivel para tipos desconocidos", () => {
    expect(construirContenido({ id: "a", tipo: "otro", nivel: "critico", mensaje: "m" }).title).toBe("🚨 Alerta crítica");
    expect(construirContenido({ id: "a", tipo: "otro", nivel: "advertencia", mensaje: "m" }).title).toBe("⚠️ Advertencia");
    expect(construirContenido({ id: "a", tipo: "otro", nivel: "info", mensaje: "m" }).title).toBe("🔔 PIMOT");
  });
  test("U9: conserva el mensaje y serializa data", () => {
    const c = construirContenido({ id: "42", tipo: "otro", nivel: "info", mensaje: "texto" });
    expect(c.body).toBe("texto");
    expect(c.data).toEqual({ alertaId: "42", tipo: "otro", nivel: "info", url: "/?modulo=alertas" });
    expect(Object.values(c.data).every((value) => typeof value === "string")).toBe(true);
  });
});

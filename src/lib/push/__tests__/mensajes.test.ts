import { construirMensaje, type AndroidMessage, type WebMessage } from "../mensajes";

const contenido = { title: "Título", body: "Cuerpo", data: { alertaId: "a", tipo: "otro", nivel: "info", url: "/?modulo=alertas" } };

describe("construirMensaje", () => {
  test("U10: web usa únicamente data", () => {
    const mensaje = construirMensaje("web", "token", contenido) as WebMessage;
    expect(mensaje).not.toHaveProperty("notification");
    expect(mensaje.data.title).toBe("Título");
    expect(mensaje.data.body).toBe("Cuerpo");
    expect(mensaje.webpush.headers.Urgency).toBe("high");
  });
  test("U11: android usa canal y prioridad alta", () => {
    const mensaje = construirMensaje("android", "token", contenido) as AndroidMessage;
    expect(mensaje.notification.title).toBe("Título");
    expect(mensaje.notification.body).toBe("Cuerpo");
    expect(mensaje.android.priority).toBe("high");
    expect(mensaje.android.notification.channelId).toBe("alertas");
    expect(mensaje.android.notification.tag).toBe("a");
  });
  test("U12: data siempre contiene strings", () => {
    for (const plataforma of ["web", "android"] as const) {
      const mensaje = construirMensaje(plataforma, "token", contenido);
      expect(Object.values(mensaje.data).every((value) => typeof value === "string")).toBe(true);
    }
  });
});

import type { Contenido } from "./contenido";

export interface WebMessage {
  token: string;
  data: Record<string, string>;
  webpush: { headers: { Urgency: string; TTL: string } };
}

export interface AndroidMessage {
  token: string;
  notification: { title: string; body: string };
  data: Record<string, string>;
  android: {
    priority: "high";
    ttl: number;
    notification: { channelId: string; tag: string };
  };
}

export type PushMessage = WebMessage | AndroidMessage;

export function construirMensaje(plataforma: "web" | "android", token: string, c: Contenido): PushMessage {
  if (plataforma === "web") {
    return {
      token,
      data: { ...c.data, title: c.title, body: c.body },
      webpush: { headers: { Urgency: "high", TTL: "3600" } },
    };
  }
  return {
    token,
    notification: { title: c.title, body: c.body },
    data: c.data,
    android: {
      priority: "high",
      ttl: 3600000,
      notification: { channelId: "alertas", tag: c.data.alertaId },
    },
  };
}

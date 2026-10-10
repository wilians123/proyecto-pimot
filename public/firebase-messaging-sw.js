self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};
      try {
        payload = event.data ? event.data.json() : {};
      } catch {
        payload = {};
      }
      const d = payload.data || payload.notification || payload;
      const lista = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (lista.some((c) => c.visibilityState === "visible")) {
        lista.forEach((c) => c.postMessage({ type: "PIMOT_PUSH", data: d }));
        return;
      }
      await self.registration.showNotification(d.title || "PIMOT", {
        body: d.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-72.png",
        tag: d.alertaId || undefined,
        data: { url: d.url || "/?modulo=alertas" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(
    event.notification.data?.url || "/?modulo=alertas",
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const lista = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of lista) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          await c.focus();
          if ("navigate" in c) await c.navigate(destino);
          return;
        }
      }
      await self.clients.openWindow(destino);
    })(),
  );
});

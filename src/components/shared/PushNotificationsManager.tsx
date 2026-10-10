"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/context/AuthContext";
import { usePermisos } from "@/hooks/usePermisos";
import { registrarNativo, registrarWeb, webPushSoportado, type PushEvento } from "@/lib/push/push-client";

interface Toast extends PushEvento {
  id: number;
}

const BANNER_KEY = "pimot:push-banner-descartado";

export default function PushNotificationsManager() {
  const { user } = useAuth();
  const { rol, activo } = usePermisos();
  const [banner, setBanner] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(0);
  const cleanupNative = useRef<(() => void) | null>(null);
  const allowed = Boolean(user && activo && (rol === "admin" || rol === "operativo"));

  const agregarToast = useCallback((evento: PushEvento) => {
    const id = ++nextToastId.current;
    setToasts((actuales) => [{ ...evento, id }, ...actuales].slice(0, 3));
    window.setTimeout(() => setToasts((actuales) => actuales.filter((toast) => toast.id !== id)), 7000);
  }, []);

  useEffect(() => {
    let activoEfecto = true;
    let removeMessage: (() => void) | undefined;

    async function iniciar() {
      if (!allowed) return;
      try {
        const plataforma = Capacitor.getPlatform();
        if (plataforma === "ios") return;
        if (plataforma === "android") {
          cleanupNative.current?.();
          cleanupNative.current = await registrarNativo(agregarToast);
          return;
        }
        if (typeof Notification === "undefined") return;
        if (!(await webPushSoportado())) return;
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === "PIMOT_PUSH") agregarToast(event.data.data ?? {});
        };
        navigator.serviceWorker?.addEventListener("message", handleMessage);
        removeMessage = () => navigator.serviceWorker?.removeEventListener("message", handleMessage);
        if (Notification.permission === "granted") {
          await registrarWeb();
        } else if (Notification.permission === "default" && localStorage.getItem(BANNER_KEY) !== "1" && activoEfecto) {
          setBanner(true);
        }
      } catch (error) {
        console.error("[push] inicialización", error);
      }
    }
    iniciar();
    return () => {
      activoEfecto = false;
      removeMessage?.();
      cleanupNative.current?.();
      cleanupNative.current = null;
    };
  }, [allowed, activo, agregarToast]);

  if (!allowed) return null;

  async function activar() {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await registrarWeb();
        setBanner(false);
      }
    } catch (error) {
      console.error("[push] permiso", error);
    }
  }

  function descartar() {
    localStorage.setItem(BANNER_KEY, "1");
    setBanner(false);
  }

  return (
    <>
      {banner && (
        <aside className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl" role="status">
          <p className="mb-3 text-sm text-slate-700">🔔 Activa las notificaciones para enterarte al instante de los cambios en tus viajes</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={descartar} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500">Ahora no</button>
            <button type="button" onClick={activar} className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white hover:bg-orange-600">Activar</button>
          </div>
        </aside>
      )}
      <div className="fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <button key={toast.id} type="button" onClick={() => window.location.assign(toast.url ?? "/?modulo=alertas")} className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-xl">
            <span className="flex items-start gap-3">
              <span className="rounded-full bg-orange-100 p-2">🔔</span>
              <span><span className="block text-sm font-bold text-slate-800">{toast.title}</span><span className="block text-xs text-slate-500">{toast.body}</span></span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

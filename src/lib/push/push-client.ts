"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { supabase } from "@/lib/supabase";

export const TOKEN_KEY = "pimot:push-token";

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

export async function guardarToken(token: string, plataforma: "web" | "android" | "ios") {
  const { error } = await supabase.rpc("registrar_dispositivo_push", {
    p_token: token,
    p_plataforma: plataforma,
    p_user_agent: typeof navigator === "undefined" ? undefined : navigator.userAgent.slice(0, 250),
  });
  if (error) throw error;
  localStorage.setItem(TOKEN_KEY, token);
}

export async function desregistrarPush(): Promise<void> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await supabase.from("dispositivos_push").delete().eq("token", token);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // El logout nunca debe quedar bloqueado por la limpieza del token.
  }
}

export async function webPushSoportado(): Promise<boolean> {
  if (typeof Notification === "undefined" || typeof navigator === "undefined" || !navigator.serviceWorker) return false;
  const { isSupported } = await import("firebase/messaging");
  return isSupported();
}

export async function registrarWeb(): Promise<void> {
  const { getMessaging, getToken } = await import("firebase/messaging");
  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(getFirebaseApp()), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: reg,
  });
  if (token) await guardarToken(token, "web");
}

export interface PushEvento {
  title: string;
  body: string;
  url?: string;
}

export async function registrarNativo(onEvento: (evento: PushEvento) => void): Promise<() => void> {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt") perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return () => {};
  await PushNotifications.createChannel({
    id: "alertas",
    name: "Alertas PIMOT",
    description: "Cambios de estado de viajes y alertas",
    importance: 4,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: "#F97316",
  });
  const handles = await Promise.all([
    PushNotifications.addListener("registration", (t) => {
      guardarToken(t.value, "android").catch((error) => console.error("[push] registro", error));
    }),
    PushNotifications.addListener("registrationError", (e) => console.error("[push] registro", e)),
    PushNotifications.addListener("pushNotificationReceived", (n) => onEvento({
      title: n.title ?? "PIMOT",
      body: n.body ?? "",
      url: n.data?.url,
    })),
    PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
      window.location.assign(a.notification.data?.url ?? "/?modulo=alertas");
    }),
  ]);
  await PushNotifications.register();
  return () => handles.forEach((handle) => handle.remove());
}

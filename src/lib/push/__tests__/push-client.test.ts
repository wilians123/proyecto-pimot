/** @jest-environment jsdom */
import { guardarToken, desregistrarPush, TOKEN_KEY } from "../push-client";
import { supabase } from "@/lib/supabase";
import { getFirebaseApp, webPushSoportado, registrarWeb, registrarNativo } from "../push-client";

jest.mock("@/lib/supabase", () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));
jest.mock("firebase/messaging", () => ({ isSupported: jest.fn(async () => true), getMessaging: jest.fn(() => ({})), getToken: jest.fn(async () => "web-token") }));
jest.mock("@capacitor/push-notifications", () => ({ PushNotifications: {
  checkPermissions: jest.fn(async () => ({ receive: "granted" })),
  requestPermissions: jest.fn(async () => ({ receive: "granted" })),
  createChannel: jest.fn(async () => {}),
  addListener: jest.fn(async () => ({ remove: jest.fn() })),
  register: jest.fn(async () => {}),
} }));

const mockedSupabase = supabase as unknown as { rpc: jest.Mock; from: jest.Mock };

describe("push-client", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedSupabase.rpc.mockResolvedValue({ error: null });
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "x".repeat(400) });
    Object.defineProperty(globalThis, "Notification", { configurable: true, value: { permission: "granted" } });
  });
  test("U27: guarda el token tras registrar la RPC", async () => {
    mockedSupabase.rpc.mockResolvedValue({ error: null });
    await guardarToken("token-123456789012345678901234", "web");
    expect(mockedSupabase.rpc).toHaveBeenCalledWith("registrar_dispositivo_push", expect.objectContaining({ p_token: expect.any(String), p_plataforma: "web", p_user_agent: expect.any(String) }));
    expect(mockedSupabase.rpc.mock.calls[0][1].p_user_agent).toHaveLength(250);
    expect(localStorage.getItem(TOKEN_KEY)).toBe("token-123456789012345678901234");
  });
  test("U28: error RPC no guarda token", async () => {
    mockedSupabase.rpc.mockResolvedValue({ error: new Error("rpc") });
    await expect(guardarToken("token-123456789012345678901234", "web")).rejects.toThrow("rpc");
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
  test("U29: desregistra y limpia el token", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    mockedSupabase.from.mockReturnValue({ delete: () => ({ eq }) });
    localStorage.setItem(TOKEN_KEY, "token");
    await desregistrarPush();
    expect(mockedSupabase.from).toHaveBeenCalledWith("dispositivos_push");
    expect(eq).toHaveBeenCalledWith("token", "token");
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
  test("U30: sin token o con error no lanza", async () => {
    await expect(desregistrarPush()).resolves.toBeUndefined();
    expect(mockedSupabase.from).not.toHaveBeenCalled();
    localStorage.setItem(TOKEN_KEY, "token");
    mockedSupabase.from.mockImplementation(() => { throw new Error("offline"); });
    await expect(desregistrarPush()).resolves.toBeUndefined();
  });
  test("cubre soporte web, app Firebase y registro web", async () => {
    expect(getFirebaseApp()).toBeDefined();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { register: jest.fn(async () => ({})), ready: Promise.resolve({}) } });
    expect(await webPushSoportado()).toBe(true);
    await registrarWeb();
    expect(mockedSupabase.rpc).toHaveBeenCalledWith("registrar_dispositivo_push", expect.objectContaining({ p_token: "web-token", p_plataforma: "web" }));
  });
  test("cubre registro nativo, solicitud prompt y limpieza", async () => {
    const pushModule = await import("@capacitor/push-notifications");
    const push = pushModule.PushNotifications as unknown as { checkPermissions: jest.Mock; requestPermissions: jest.Mock };
    push.checkPermissions.mockResolvedValueOnce({ receive: "prompt" });
    const cleanup = await registrarNativo(jest.fn());
    expect(push.requestPermissions).toHaveBeenCalled();
    cleanup();
  });
  test("procesa listeners nativos de registro y recepción", async () => {
    const pushModule = await import("@capacitor/push-notifications");
    const push = pushModule.PushNotifications as unknown as Record<string, jest.Mock>;
    const callbacks: Record<string, (value: unknown) => void> = {};
    push.addListener.mockImplementation(async (name: string, callback: (value: unknown) => void) => {
      callbacks[name] = callback;
      return { remove: jest.fn() };
    });
    const onEvento = jest.fn();
    await registrarNativo(onEvento);
    callbacks.registration({ value: "native-token-123456789012345678901234" });
    callbacks.registrationError({ code: "x" });
    callbacks.pushNotificationReceived({ title: "T", body: "B", data: { url: "/u" } });
    await Promise.resolve();
    expect(onEvento).toHaveBeenCalledWith({ title: "T", body: "B", url: "/u" });
  });
});

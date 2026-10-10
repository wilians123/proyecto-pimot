/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PushNotificationsManager from "@/components/shared/PushNotificationsManager";
import { useAuth } from "@/context/AuthContext";
import { usePermisos } from "@/hooks/usePermisos";
import { Capacitor } from "@capacitor/core";
import { registrarNativo, registrarWeb } from "../push-client";

jest.mock("@/context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("@/hooks/usePermisos", () => ({ usePermisos: jest.fn() }));
jest.mock("@/lib/push/push-client", () => ({
  registrarNativo: jest.fn().mockResolvedValue(jest.fn()),
  registrarWeb: jest.fn().mockResolvedValue(undefined),
  webPushSoportado: jest.fn().mockResolvedValue(true),
}));
jest.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: jest.fn(() => "web") } }));

const authMock = useAuth as jest.Mock;
const permissionsMock = usePermisos as jest.Mock;
const platformMock = Capacitor.getPlatform as jest.Mock;
const webRegisterMock = registrarWeb as jest.Mock;
const nativeRegisterMock = registrarNativo as jest.Mock;

function configure({ user = true, rol = "admin", activo = true, permission = "default", platform = "web" } = {}) {
  authMock.mockReturnValue({ user: user ? { id: "u1" } : null });
  permissionsMock.mockReturnValue({ rol, activo });
  platformMock.mockReturnValue(platform);
  Object.defineProperty(globalThis, "Notification", { configurable: true, value: { permission, requestPermission: jest.fn(async () => "granted") } });
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { addEventListener: jest.fn(), removeEventListener: jest.fn() } });
}

describe("PushNotificationsManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    configure();
  });
  test("U31: visualizador no registra ni muestra banner", async () => {
    configure({ rol: "visualizador" });
    render(<PushNotificationsManager />);
    await act(async () => {});
    expect(screen.queryByText(/Activa las notificaciones/)).toBeNull();
    expect(webRegisterMock).not.toHaveBeenCalled();
  });
  test("U32: usuario inactivo o sin sesión no registra", async () => {
    configure({ activo: false });
    render(<PushNotificationsManager />);
    await act(async () => {});
    expect(webRegisterMock).not.toHaveBeenCalled();
    configure({ user: false, activo: true });
    render(<PushNotificationsManager />);
    expect(webRegisterMock).not.toHaveBeenCalled();
  });
  test("U33: banner y Ahora no", async () => {
    render(<PushNotificationsManager />);
    expect(await screen.findByText(/Activa las notificaciones/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));
    expect(localStorage.getItem("pimot:push-banner-descartado")).toBe("1");
    expect(screen.queryByText(/Activa las notificaciones/)).toBeNull();
  });
  test("U34: Activar solicita permiso y registra", async () => {
    render(<PushNotificationsManager />);
    fireEvent.click(await screen.findByRole("button", { name: "Activar" }));
    await waitFor(() => expect(webRegisterMock).toHaveBeenCalled());
  });
  test("U35: permiso granted registra automáticamente", async () => {
    configure({ permission: "granted" });
    render(<PushNotificationsManager />);
    await waitFor(() => expect(webRegisterMock).toHaveBeenCalled());
    expect(screen.queryByText(/Activa las notificaciones/)).toBeNull();
  });
  test("U36: permiso denied no registra", async () => {
    configure({ permission: "denied" });
    render(<PushNotificationsManager />);
    await act(async () => {});
    expect(webRegisterMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Activa las notificaciones/)).toBeNull();
  });
  test("U37: Android registra y iOS no hace nada", async () => {
    configure({ platform: "android", permission: "granted" });
    render(<PushNotificationsManager />);
    await waitFor(() => expect(nativeRegisterMock).toHaveBeenCalled());
    jest.clearAllMocks();
    configure({ platform: "ios", permission: "granted" });
    render(<PushNotificationsManager />);
    await act(async () => {});
    expect(nativeRegisterMock).not.toHaveBeenCalled();
    expect(webRegisterMock).not.toHaveBeenCalled();
  });
  test("U38: toasts limitados a tres y expiran en siete segundos", async () => {
    jest.useFakeTimers();
    const addEventListener = jest.fn();
    configure();
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { addEventListener, removeEventListener: jest.fn() } });
    render(<PushNotificationsManager />);
    await waitFor(() => expect(addEventListener).toHaveBeenCalled());
    const listener = addEventListener.mock.calls[0][1];
    act(() => {
      listener({ data: { type: "PIMOT_PUSH", data: { title: "1", body: "b" } } });
      listener({ data: { type: "PIMOT_PUSH", data: { title: "2", body: "b" } } });
      listener({ data: { type: "PIMOT_PUSH", data: { title: "3", body: "b" } } });
      listener({ data: { type: "PIMOT_PUSH", data: { title: "4", body: "b" } } });
    });
    expect(screen.getAllByText("b")).toHaveLength(3);
    act(() => { jest.advanceTimersByTime(7000); });
    expect(screen.queryAllByText("b")).toHaveLength(0);
    jest.useRealTimers();
  });
});

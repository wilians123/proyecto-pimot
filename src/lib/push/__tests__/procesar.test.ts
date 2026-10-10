import { procesarPush, type PushDeps } from "../procesar";

const perfil = (id: string, rol: "admin" | "operativo" | "visualizador", activo = true) => ({ id, rol, activo });
const dispositivo = (id: string, user_id: string, plataforma: "web" | "android" | "ios" = "web") => ({ id, user_id, token: `${id}-token-abcdefghijklmnopqrstuvwxyz`, plataforma });
const alerta = { id: "a1", tipo: "inicio_viaje", nivel: "info", mensaje: "m", estado: "pendiente", viaje_id: null } as const;

function makeDeps(overrides: Partial<PushDeps> = {}) {
  const logs: Array<Record<string, unknown>> = [];
  const devices = [dispositivo("d1", "u1"), dispositivo("d2", "u2"), dispositivo("d3", "u3")];
  const deps: PushDeps = {
    cargarAlerta: async () => alerta,
    cargarDestinatarios: async () => [perfil("u1", "admin"), perfil("u2", "visualizador"), perfil("u3", "operativo", false)],
    cargarDispositivos: async () => devices,
    cargarLogsAlerta: async () => logs as never,
    borrarLogsFallidos: async () => { for (let i = logs.length - 1; i >= 0; i -= 1) if (logs[i].estado === "fallido") logs.splice(i, 1); },
    insertarLogs: async (filas) => { logs.push(...filas as never[]); },
    desactivarDispositivos: async () => {},
    marcarAlertaEnviada: async () => {},
    enviarLote: async (mensajes) => mensajes.map((_, i) => ({ success: true, messageId: `m${i}` })),
    ...overrides,
  };
  return { deps, logs, devices };
}

describe("procesarPush", () => {
  test("U13: solo usuarios activos autorizados reciben", async () => {
    const { deps } = makeDeps();
    const result = await procesarPush(deps, { modo: "test" });
    expect(result).toMatchObject({ destinatarios: 1, enviados: 1 });
  });
  test("U14: alerta inexistente no envía", async () => {
    const { deps } = makeDeps({ cargarAlerta: async () => null, enviarLote: jest.fn() });
    expect(await procesarPush(deps, { modo: "webhook", alertaId: "missing" })).toEqual({ ok: false, code: "alerta_no_encontrada" });
    expect(deps.enviarLote).not.toHaveBeenCalled();
  });
  test("U15/U16: éxito, marcado e idempotencia", async () => {
    const { deps, logs } = makeDeps();
    const marcar = jest.spyOn(deps, "marcarAlertaEnviada");
    const first = await procesarPush(deps, { modo: "webhook", alertaId: "a1" });
    expect(first).toMatchObject({ enviados: 1, omitidos: 0 });
    expect(logs[0]).toMatchObject({ estado: "enviado", fcm_message_id: "m0" });
    expect(marcar).toHaveBeenCalledTimes(1);
    const second = await procesarPush(deps, { modo: "webhook", alertaId: "a1" });
    expect(second).toMatchObject({ enviados: 0, omitidos: 1 });
    expect(logs).toHaveLength(1);
  });
  test("U17: token inválido se desactiva y no detiene los demás", async () => {
    const desactivar = jest.fn();
    const { deps, logs } = makeDeps({ desactivarDispositivos: desactivar, enviarLote: async () => [{ success: false, error: { code: "messaging/registration-token-not-registered" } }] });
    const result = await procesarPush(deps, { modo: "webhook", alertaId: "a1" });
    expect(result).toMatchObject({ invalidos: 1, enviados: 0 });
    expect(logs[0]).toMatchObject({ estado: "token_invalido" });
    expect(desactivar).toHaveBeenCalledWith(["d1"]);
  });
  test("U18: error genérico se registra y no marca la alerta", async () => {
    const marcar = jest.fn();
    const { deps, logs } = makeDeps({ marcarAlertaEnviada: marcar, enviarLote: async () => [{ success: false, error: { code: "messaging/internal-error" } }] });
    const result = await procesarPush(deps, { modo: "webhook", alertaId: "a1" });
    expect(result).toMatchObject({ fallidos: 1, enviados: 0 });
    expect(logs[0]).toMatchObject({ estado: "fallido", error: "messaging/internal-error" });
    expect(marcar).not.toHaveBeenCalled();
  });
  test("U19: borra fallidos antes del reintento", async () => {
    const borrado = jest.fn();
    const { deps } = makeDeps({ borrarLogsFallidos: borrado });
    await procesarPush(deps, { modo: "webhook", alertaId: "a1" });
    expect(borrado).toHaveBeenCalledWith("a1");
  });
  test("U20: test no escribe ni marca y restringe por usuario", async () => {
    const { deps, logs } = makeDeps();
    const cargar = jest.spyOn(deps, "cargarDestinatarios");
    const marcar = jest.spyOn(deps, "marcarAlertaEnviada");
    const result = await procesarPush(deps, { modo: "test", userId: "u1" });
    expect(result).toMatchObject({ alerta_id: "test", enviados: 1 });
    expect(cargar).toHaveBeenCalledWith("u1");
    expect(logs).toHaveLength(0);
    expect(marcar).not.toHaveBeenCalled();
  });
  test("U21: divide lotes de 500", async () => {
    const sizes: number[] = [];
    const many = Array.from({ length: 1001 }, (_, i) => dispositivo(`d${i}`, "u1"));
    const { deps } = makeDeps({ cargarDestinatarios: async () => [perfil("u1", "admin")], cargarDispositivos: async () => many, enviarLote: async (messages) => { sizes.push(messages.length); return messages.map(() => ({ success: true })); } });
    await procesarPush(deps, { modo: "test" });
    expect(sizes).toEqual([500, 500, 1]);
  });
  test("U22: ignora iOS", async () => {
    const { deps } = makeDeps({ cargarDispositivos: async () => [dispositivo("ios", "u1", "ios")] });
    expect(await procesarPush(deps, { modo: "test" })).toMatchObject({ destinatarios: 0, enviados: 0 });
  });
});

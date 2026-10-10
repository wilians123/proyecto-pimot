import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

type WorkerEvent = {
  data?: { json: () => unknown };
  notification?: { close: () => void; data?: { url?: string } };
  waitUntil: (promise: Promise<unknown>) => void;
};
type WorkerClient = {
  visibilityState?: string;
  url?: string;
  postMessage?: (message: unknown) => void;
  focus?: () => Promise<void>;
  navigate?: (url: string) => Promise<void>;
};

function createWorker() {
  const handlers: Record<string, (event: WorkerEvent) => void> = {};
  const state = { notifications: [] as Array<{ title: string; options: unknown }>, opened: [] as string[], messages: [] as unknown[], focused: 0, navigated: [] as string[] };
  const clients: { windows: WorkerClient[]; matchAll: jest.Mock<Promise<WorkerClient[]>, []>; openWindow: jest.Mock<Promise<void>, [string]> } = {
    windows: [] as WorkerClient[],
    matchAll: jest.fn(async () => clients.windows),
    openWindow: jest.fn(async (url: string) => { state.opened.push(url); }),
  };
  const self = {
    location: { origin: "https://pimot.test" },
    clients,
    registration: { claim: jest.fn(), showNotification: jest.fn(async (title: string, options: unknown) => state.notifications.push({ title, options })) },
    addEventListener: jest.fn((name: string, handler: (event: WorkerEvent) => void) => { handlers[name] = handler; }),
    skipWaiting: jest.fn(),
  };
  const code = fs.readFileSync(path.join(process.cwd(), "public/firebase-messaging-sw.js"), "utf8");
  vm.runInNewContext(code, { self, URL, console });
  return { handlers, clients, state, self };
}

function eventWithData(data: unknown, state: ReturnType<typeof createWorker>["state"]) {
  let promise: Promise<unknown> | undefined;
  return {
    data: data === undefined ? undefined : { json: () => data },
    waitUntil: (p: Promise<unknown>) => { promise = p; },
    done: async () => promise,
    state,
  };
}

describe("firebase-messaging-sw", () => {
  test("U23: visible posts message instead of notification", async () => {
    const worker = createWorker();
    const postMessage = jest.fn();
    worker.clients.windows.push({ visibilityState: "visible", postMessage });
    const event = eventWithData({ data: { title: "T", body: "B" } }, worker.state);
    worker.handlers.push(event);
    await event.done();
    expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "PIMOT_PUSH" }));
    expect(worker.state.notifications).toHaveLength(0);
  });
  test("U24/U25: sin ventanas muestra la notificación y usa defaults", async () => {
    const worker = createWorker();
    const event = eventWithData({ data: { title: "T", body: "B", alertaId: "a" } }, worker.state);
    worker.handlers.push(event);
    await event.done();
    expect(worker.state.notifications[0]).toMatchObject({ title: "T", options: { body: "B", icon: "/icons/icon-192.png", badge: "/icons/badge-72.png", tag: "a" } });
    const empty = eventWithData("corrupto", worker.state);
    worker.handlers.push(empty);
    await empty.done();
    expect(worker.state.notifications[1].title).toBe("PIMOT");
  });
  test("U26: click enfoca/navega o abre una ventana", async () => {
    const worker = createWorker();
    const focus = jest.fn(async () => { worker.state.focused += 1; });
    const navigate = jest.fn(async (url: string) => { worker.state.navigated.push(url); });
    worker.clients.windows.push({ url: "https://pimot.test/", focus, navigate });
    const close = jest.fn();
    let promise: Promise<unknown> | undefined;
    worker.handlers.notificationclick({ notification: { close, data: { url: "/?modulo=alertas" } }, waitUntil: (p: Promise<unknown>) => { promise = p; } });
    await promise;
    expect(close).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("https://pimot.test/?modulo=alertas");
    worker.clients.windows.length = 0;
    worker.handlers.notificationclick({ notification: { close: jest.fn(), data: {} }, waitUntil: (p: Promise<unknown>) => { promise = p; } });
    await promise;
    expect(worker.clients.openWindow).toHaveBeenCalled();
  });
});

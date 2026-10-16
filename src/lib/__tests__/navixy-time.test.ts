import { convertirTimestampGps } from "@/lib/navixy-time";

describe("convertirTimestampGps", () => {
  const ahora = Date.parse("2026-10-15T18:00:00.000Z");

  it("conserva la antigüedad real de horas locales Navixy sin zona", () => {
    expect(
      convertirTimestampGps(
        "2026-10-15 11:58:00",
        "2026-10-15 12:00:00",
        ahora,
      ),
    ).toBe(new Date(ahora - 2 * 60_000).toISOString());
  });

  it("detecta seis horas reales sin interpretar la hora local como UTC de Vercel", () => {
    expect(
      convertirTimestampGps(
        "2026-10-15 06:00:00",
        "2026-10-15 12:00:00",
        ahora,
      ),
    ).toBe(new Date(ahora - 6 * 60 * 60_000).toISOString());
  });

  it("mantiene la marca de última señal estable entre consultas del cron", () => {
    const primera = convertirTimestampGps(
      "2026-10-15 11:58:00",
      "2026-10-15 12:00:00",
      ahora,
    );
    const segunda = convertirTimestampGps(
      "2026-10-15 11:58:00",
      "2026-10-15 12:00:30",
      ahora + 30_000,
    );

    expect(segunda).toBe(primera);
  });

  it("no inventa una antigüedad para una hora local sin user_time de Navixy", () => {
    expect(convertirTimestampGps("2026-10-15 11:58:00", null, ahora)).toBeNull();
  });

  it("acepta timestamps con zona horaria explícita", () => {
    const valor = "2026-10-15T17:58:00.000Z";
    expect(convertirTimestampGps(valor, null, ahora)).toBe(valor);
  });
});

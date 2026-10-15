import { inputLocalAIso, isoAInputLocal } from "@/utils/formatDate";

describe("conversión fija Guatemala UTC-6", () => {
  it("interpreta datetime-local con el offset fijo -06:00", () => {
    expect(inputLocalAIso("2026-10-07T03:05")).toBe("2026-10-07T09:05:00.000Z");
  });

  it("hace ida y vuelta con el mismo instante", () => {
    const iso = inputLocalAIso("2026-10-07T03:05");
    expect(isoAInputLocal(iso)).toBe("2026-10-07T03:05");
  });

  it("rechaza valores inválidos y maneja ausencia", () => {
    expect(inputLocalAIso("2026-02-30T03:05")).toBeNull();
    expect(inputLocalAIso("2026-10-07T25:05")).toBeNull();
    expect(isoAInputLocal(null)).toBe("");
    expect(isoAInputLocal("no es fecha")).toBe("");
  });
});

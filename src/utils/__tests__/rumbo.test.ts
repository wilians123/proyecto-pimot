import { normalizarRumbo } from "@/utils/rumbo";

describe("normalizarRumbo", () => {
  it.each([[360, 0], [-90, 270], [450, 90]])("normaliza %s a %s", (entrada, esperado) => {
    expect(normalizarRumbo(entrada)).toBe(esperado);
  });

  it.each([Number.NaN, undefined, null, "45"])("rechaza %s", (entrada) => {
    expect(normalizarRumbo(entrada)).toBeNull();
  });
});

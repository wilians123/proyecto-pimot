import { secretoValido } from "../auth";

describe("secretoValido", () => {
  test("U1: acepta el secreto correcto", () => expect(secretoValido("abc123", "abc123")).toBe(true));
  test("U2: rechaza el secreto incorrecto de igual longitud", () => expect(secretoValido("abc124", "abc123")).toBe(false));
  test("U3: rechaza longitudes distintas sin lanzar", () => expect(() => secretoValido("x", "abc123")).not.toThrow());
  test("U4: rechaza valores faltantes", () => {
    expect(secretoValido(null, "abc123")).toBe(false);
    expect(secretoValido("abc123", undefined)).toBe(false);
  });
});

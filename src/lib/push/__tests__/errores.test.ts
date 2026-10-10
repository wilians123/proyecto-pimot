import { clasificarErrorFcm } from "../errores";

describe("clasificarErrorFcm", () => {
  test("U5: clasifica los tokens inválidos", () => {
    for (const code of ["messaging/registration-token-not-registered", "messaging/invalid-registration-token", "messaging/invalid-argument"]) {
      expect(clasificarErrorFcm(code)).toBe("token_invalido");
    }
  });
  test("U6: clasifica otros errores como fallidos", () => {
    expect(clasificarErrorFcm("messaging/internal-error")).toBe("fallido");
    expect(clasificarErrorFcm("messaging/quota-exceeded")).toBe("fallido");
    expect(clasificarErrorFcm()).toBe("fallido");
  });
});

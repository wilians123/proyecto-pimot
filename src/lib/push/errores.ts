const ERRORES_TOKEN_INVALIDO = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

export function clasificarErrorFcm(code?: string): "token_invalido" | "fallido" {
  return code && ERRORES_TOKEN_INVALIDO.has(code) ? "token_invalido" : "fallido";
}

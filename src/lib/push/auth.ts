import { timingSafeEqual } from "node:crypto";

export function secretoValido(recibido: string | null, esperado: string | undefined): boolean {
  if (!recibido || !esperado) return false;
  const recibidoBuffer = Buffer.from(recibido);
  const esperadoBuffer = Buffer.from(esperado);
  if (recibidoBuffer.length !== esperadoBuffer.length) return false;
  return timingSafeEqual(recibidoBuffer, esperadoBuffer);
}

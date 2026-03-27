// ============================================================
// Email Service - Reportes y notificaciones formales
// Uso: solo desde API Routes (servidor)
// ============================================================

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
}

export async function enviarEmail(payload: EmailPayload): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch (err) {
    console.error('[Email Service]', err)
    return false
  }
}

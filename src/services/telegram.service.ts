// ============================================================
// Telegram Service - Notificaciones operativas
// Uso: solo desde API Routes (servidor)
// ============================================================

export async function enviarMensajeTelegram(mensaje: string): Promise<boolean> {
  const token   = process.env.TELEGRAM_BOT_TOKEN
  const groupId = process.env.TELEGRAM_GROUP_ID
  if (!token || !groupId) return false

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: groupId, text: mensaje, parse_mode: 'HTML' }),
    })
    return res.ok
  } catch (err) {
    console.error('[Telegram Service]', err)
    return false
  }
}

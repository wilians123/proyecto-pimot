// ============================================================
// GPS Service - Adaptador para Evtracker
// Patrón adaptador: aísla la lógica de integración externa
// ============================================================

export interface PosicionGPS {
  lat: number
  lng: number
  velocidad?: number
  precision_m?: number
  timestamp: string
}

export async function obtenerPosicionVehiculo(placaOId: string): Promise<PosicionGPS | null> {
  try {
    const res = await fetch(`/api/gps/posicion?id=${encodeURIComponent(placaOId)}`)
    if (!res.ok) throw new Error(`GPS API error: ${res.status}`)
    return await res.json()
  } catch (err) {
    console.error('[GPS Service]', err)
    return null // fallback: retorna null, el cliente usa última posición de Supabase
  }
}

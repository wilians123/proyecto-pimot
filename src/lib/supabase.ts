// =============================================================
// Se conserva persistSession: true y autoRefreshToken: true
// para que la sesión JWT se guarde en localStorage y se
// restaure automáticamente al recargar — esto es lo que
// garantiza que auth.uid() no sea null en el cliente.
// =============================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    // persistSession: true → guarda el JWT en localStorage para
    // que la sesión sobreviva recargas de página.
    persistSession:   true,
    // autoRefreshToken: true → renueva el JWT antes de que expire,
    // evitando que auth.uid() se vuelva null por token vencido.
    autoRefreshToken: true,
    // detectSessionInUrl: true → necesario para el flujo de
    // confirmación de email (magic link / OAuth).
    detectSessionInUrl: true,
    // storageKey: clave unica para este proyecto en localStorage.
    storageKey: 'pimot-auth-token',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})
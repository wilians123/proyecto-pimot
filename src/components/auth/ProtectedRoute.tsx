// =============================================================
// CREACIÓN: src/components/auth/ProtectedRoute.tsx
//
// Componente que implementa el punto 7 del reporte técnico:
// "si no hay sesión activa el usuario sea redirigido al login
//  en lugar de permitirle abrir Flota.tsx"
//
// Comportamiento:
//   • Mientras loading === true  → muestra pantalla de carga
//   • Si !isAuthenticated        → renderiza <LoginPage />
//   • Si isAuthenticated         → renderiza los children
//
// Esto garantiza que ningún módulo protegido (Flota, Viajes,
// Dashboard, etc.) se monte sin sesión válida, evitando que
// los inserts a Supabase lleguen como usuario anónimo.
//
// NOTA: se evita useRouter/redirect de Next.js porque AppShell
// es un Client Component sin lógica de routing basada en URL.
// El patrón de renderizado condicional es más simple y compatible
// con la arquitectura SPA actual del proyecto.
// =============================================================

'use client'

import { useAuth } from '@/context/AuthContext'
import LoginPage from '@/app/auth/login/page'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { loading, isAuthenticated } = useAuth()

  // ── Mientras se verifica la sesión inicial ─────────────────
  // (solo ocurre en el primer render, dura < 500ms normalmente)
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Logo */}
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-2xl">P</span>
          </div>
          {/* Spinner */}
          <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Verificando sesión…</p>
        </div>
      </div>
    )
  }

  // ── Sin sesión: mostrar login ──────────────────────────────
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // ── Con sesión: renderizar la app ─────────────────────────
  return <>{children}</>
}
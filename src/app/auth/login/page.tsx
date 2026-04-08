// =============================================================
// Página de login para centralizar la lógica de autenticación.
// =============================================================

'use client'

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    // Validaciones básicas del lado del cliente
    if (!email.trim()) { setError('Ingresa tu correo electrónico.'); return }
    if (!password)     { setError('Ingresa tu contraseña.'); return }

    setLoading(true)
    const { error: authError } = await signIn(email.trim(), password)
    setLoading(false)

    if (authError) {
      // Traducir mensajes de Supabase al español
      if (authError.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos. Verifica tus datos.')
      } else if (authError.includes('Email not confirmed')) {
        setError('Debes confirmar tu correo antes de iniciar sesión.')
      } else if (authError.includes('Too many requests')) {
        setError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
      } else {
        setError(`Error de acceso: ${authError}`)
      }
    }
    // Si no hay error, AuthContext actualiza isAuthenticated y
    // ProtectedRoute deja de mostrar esta pantalla automáticamente.
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* ── Encabezado ── */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center
            mx-auto mb-4 shadow-lg shadow-orange-200">
            <span className="text-white font-black text-3xl leading-none">P</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">PIMOT</h1>
          <p className="text-slate-500 text-sm mt-1">Plataforma de Monitoreo de Transporte</p>
        </div>

        {/* ── Tarjeta del formulario ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-linear-to-r from-slate-800 to-slate-900 px-6 py-5">
            <h2 className="text-white font-bold text-lg">Iniciar sesión</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5" noValidate>

            {/* Correo */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                disabled={loading}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm
                  text-slate-800 bg-white placeholder:text-slate-400
                  focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100
                  disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              />
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm
                    text-slate-800 bg-white placeholder:text-slate-400
                    focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100
                    disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                />
                {/* Botón mostrar/ocultar contraseña */}
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
                    hover:text-slate-600 transition-colors cursor-pointer p-1"
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? (
                    // Ojo tachado
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="w-4 h-4">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    // Ojo abierto
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className="w-4 h-4">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200
                rounded-xl text-red-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="w-4 h-4 shrink-0 mt-0.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p className="text-sm font-medium leading-snug">{error}</p>
              </div>
            )}

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600
                disabled:bg-orange-300 disabled:cursor-not-allowed
                text-white text-base font-bold rounded-xl
                transition-colors cursor-pointer shadow-md shadow-orange-200
                flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white
                    rounded-full animate-spin" />
                  Ingresando…
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>
        </div>

        {/* Pie de página */}
        <p className="text-center text-xs text-slate-400 mt-6">
          PIMOT — Sistema de Monitoreo de Operaciones de Transporte
        </p>
      </div>
    </div>
  )
}
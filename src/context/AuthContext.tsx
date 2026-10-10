'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { limpiarUbicacionesGuardadas } from '@/lib/seccion-url'
import { desregistrarPush } from '@/lib/push/push-client'

// ── Tipo del perfil (subset de la tabla profiles) ─────────────
export interface Profile {
  id:         string
  nombre:     string
  rol:        'admin' | 'operativo' | 'visualizador'
  activo:     boolean
  avatar_url?: string | null
}

// ── Contrato público del contexto ─────────────────────────────
interface AuthContextType {
  user:            User | null
  session:         Session | null
  profile:         Profile | null
  loading:         boolean           // true mientras se verifica la sesión inicial
  profileLoaded:    boolean           // true cuando terminó el intento de cargar el perfil
  isAuthenticated: boolean           // true cuando user y session no son null
  signIn:  (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

// ── Valor por defecto del contexto (antes de montar el Provider) ──
const AuthContext = createContext<AuthContextType>({
  user:            null,
  session:         null,
  profile:         null,
  loading:         true,
  profileLoaded:    false,
  isAuthenticated: false,
  signIn:  async () => ({ error: null }),
  signOut: async () => {},
})

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const currentUserId = useRef<string | null>(null)

  // ── CORRECCIÓN 1: fetchProfile como useCallback, declarado
  // ANTES del useEffect que lo invoca. ──────────────────────────
  const fetchProfile = useCallback(async (userId: string, isMounted: () => boolean) => {
    setProfileLoaded(false)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, rol, activo, avatar_url')
        .eq('id', userId)
        .single()

      if (!isMounted()) return

      if (!error && data) {
        setProfile(data as Profile)
      } else {
        // El perfil puede no existir si el trigger handle_new_user
        // aún no lo creó. No es un error fatal.
        setProfile(null)
      }
    } catch {
      if (!isMounted()) return
      setProfile(null)
    } finally {
      if (!isMounted()) return
      // loading siempre termina aquí, con o sin perfil
      setLoading(false)
      setProfileLoaded(true)
    }
  }, [])

  const mostrarLogin = useCallback(() => {
    limpiarUbicacionesGuardadas()
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', '/auth/login')
    }
  }, [])

  // ── CORRECCIÓN 2 y 3: flujo de sesión estabilizado ───────────
  useEffect(() => {
    let mounted = true  // evita setState en componente desmontado

    // Supabase emite INITIAL_SESSION después de restaurar la sesión
    // persistida. El registro ocurre antes de cualquier lectura explícita
    // para que no haya dos flujos compitiendo por el lock de autenticación.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        if (!mounted) return
        const nextUserId = s?.user?.id ?? null
        const userChanged = nextUserId !== currentUserId.current
        currentUserId.current = nextUserId

        setSession(s)
        setUser(s?.user ?? null)

        if (s?.user) {
          if (_event === 'INITIAL_SESSION' || userChanged) {
            // No llamar APIs de Supabase dentro de onAuthStateChange: el
            // callback puede ejecutarse mientras supabase-js sostiene su lock
            // durante un refresh al volver a enfocar la pestaña.
            setTimeout(() => {
              if (mounted) void fetchProfile(s.user.id, () => mounted)
            }, 0)
          }
        } else {
          setProfile(null)
          setLoading(false)
          setProfileLoaded(true)
          mostrarLogin()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile, mostrarLogin])

  // ── signIn: centraliza el login para que LoginPage no importe supabase ──
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return { error: null }
    },
    []
  )

  // ── signOut ───────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try { await desregistrarPush() } catch {}
    await supabase.auth.signOut()
    limpiarUbicacionesGuardadas()
    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', '/auth/login')
    }
    // El listener onAuthStateChange limpiará user/session/profile
  }, [])

  const isAuthenticated = Boolean(user && session)

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, profileLoaded, isAuthenticated, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook de consumo ───────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}

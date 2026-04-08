'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ── Tipo del perfil (subset de la tabla profiles) ─────────────
interface Profile {
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

  // ── CORRECCIÓN 1: fetchProfile como useCallback, declarado
  // ANTES del useEffect que lo invoca. ──────────────────────────
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, rol, activo, avatar_url')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setProfile(data as Profile)
    } else {
      // El perfil puede no existir si el trigger handle_new_user
      // aún no lo creó. No es un error fatal.
      setProfile(null)
    }
    // loading siempre termina aquí, con o sin perfil
    setLoading(false)
  }, [])

  // ── CORRECCIÓN 2 y 3: flujo de sesión estabilizado ───────────
  useEffect(() => {
    let mounted = true  // evita setState en componente desmontado

    // Paso 1: leer sesión existente del localStorage (persistida)
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      setUser(s?.user ?? null)

      if (s?.user) {
        // Hay sesión → cargar perfil (setLoading(false) ocurre dentro)
        fetchProfile(s.user.id)
      } else {
        // No hay sesión → loading termina aquí
        setLoading(false)
      }
    })

    // Paso 2: suscribirse a cambios futuros (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        if (!mounted) return
        setSession(s)
        setUser(s?.user ?? null)

        if (s?.user) {
          fetchProfile(s.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])  // fetchProfile es estable (useCallback sin deps)

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
    await supabase.auth.signOut()
    // El listener onAuthStateChange limpiará user/session/profile
  }, [])

  const isAuthenticated = Boolean(user && session)

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, isAuthenticated, signIn, signOut }}
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
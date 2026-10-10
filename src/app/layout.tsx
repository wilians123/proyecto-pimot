import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import PushNotificationsManager from '@/components/shared/PushNotificationsManager'

export const metadata: Metadata = {
  title:       'PIMOT — Monitoreo de Transporte',
  description: 'Plataforma Inteligente de Monitoreo de Operaciones de Transporte',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/* AuthProvider inicializa la sesión de Supabase y la expone a toda la app. */}
        <AuthProvider>
          <PushNotificationsManager />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

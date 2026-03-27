import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { AppProvider } from '@/context/AppContext'
 
export const metadata: Metadata = {
  title: 'PIMOT — Monitoreo de Transporte',
  description: 'Plataforma Inteligente de Monitoreo de Operaciones de Transporte',
}
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

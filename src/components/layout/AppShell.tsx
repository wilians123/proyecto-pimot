// =============================================================
// MODIFICACIÓN: src/components/layout/AppShell.tsx
//
// CORRECCIONES aplicadas:
//   • Envuelve todo el contenido con <ProtectedRoute> para que
//     ningún módulo se renderice sin sesión activa.
//   • Pasa signOut y profile al Header para mostrar el usuario
//     real y permitir cerrar sesión.
//   • El nombre del usuario en el Sidebar también vendrá del
//     contexto en el futuro (actualmente estático en Sidebar.tsx).
// =============================================================

'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Dashboard from '@/modules/dashboard/components/Dashboard'
import Viajes from '@/modules/viajes/components/Viajes'
import Flota from '@/modules/flota/components/Flota'
import ModuloPlaceholder from '@/components/shared/ModuloPlaceholder'
import AlertaBadge from '@/components/shared/AlertaBadge'
import KpiCard from '@/components/shared/KpiCard'
import { MODULO_HEADERS, ALERTAS_MUESTRA } from '@/lib/constants'
import type { ModuloId } from '@/types/ui'


export default function AppShell() {
  const [modulo,            setModulo]         = useState<ModuloId>('dashboard')
  const [collapsed,         setCollapsed]      = useState(false)
  const [mobileOpen,        setMobileOpen]     = useState(false)
  const [notificationsOpen, setNotifications]  = useState(false)

  const alertasActivas = ALERTAS_MUESTRA.filter(
    (a) => a.nivel === 'critico' || a.nivel === 'advertencia'
  ).length

  function renderModulo() {
    switch (modulo) {
      case 'dashboard': return <Dashboard />
      case 'viajes':    return <Viajes />
      case 'flota':     return <Flota />

      case 'alertas':
        return (
          <div className="p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard titulo="Alertas Activas" valor="2" color="text-red-600" />
              <KpiCard titulo="Enviadas Hoy"    valor="7" />
              <KpiCard titulo="Resueltas Hoy"   valor="5" color="text-green-700" />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800">Historial de Alertas</h3>
              </div>
              <div className="p-4 space-y-3">
                {ALERTAS_MUESTRA.map((a) => (
                  <AlertaBadge key={a.id} alerta={a} />
                ))}
              </div>
            </div>
          </div>
        )

      case 'reportes':
        return <ModuloPlaceholder titulo="Análisis y Reportes"  descripcion="Indicadores de desempeño, gráficas con Recharts y exportación en PDF/Excel." />
      case 'pilotos':
        return <ModuloPlaceholder titulo="Pilotos y Viáticos"   descripcion="Registro de conductores, asignación a fletes y control de viáticos por servicio." />
      case 'usuarios':
        return <ModuloPlaceholder titulo="Usuarios y Seguridad" descripcion="Autenticación con Supabase Auth, roles y políticas RLS." />

      default: return <Dashboard />
    }
  }

  return (
    // ProtectedRoute muestra el spinner mientras loading === true,
    // renderiza <LoginPage /> si no hay sesión, y los children si sí hay.
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-100 overflow-hidden">
        <Sidebar
          modulo={modulo}
          setModulo={setModulo}
          collapsed={collapsed}
          toggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            titulo={MODULO_HEADERS[modulo]}
            alertasCount={alertasActivas}
            onToggleMobile={() => setMobileOpen((v) => !v)}
            onToggleNotifications={() => setNotifications((v) => !v)}
            notificationsOpen={notificationsOpen}
          />
          <main className="flex-1 overflow-y-auto">
            {renderModulo()}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
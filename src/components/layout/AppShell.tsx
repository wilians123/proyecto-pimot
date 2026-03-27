// =============================================================
// Shell principal: Sidebar + Header + área de contenido Orquesta el estado de navegación entre módulos
// =============================================================

'use client'

import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import Dashboard from '@/modules/dashboard/components/Dashboard'
import Viajes from '@/modules/viajes/components/Viajes'
import ModuloPlaceholder from '@/components/shared/ModuloPlaceholder'
import AlertaBadge from '@/components/shared/AlertaBadge'
import KpiCard from '@/components/shared/KpiCard'
import { MODULO_HEADERS, ALERTAS_MUESTRA } from '@/lib/constants'
import type { ModuloId } from '@/types/ui'

export default function AppShell() {
  const [modulo, setModulo]       = useState<ModuloId>('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  function renderModulo() {
    switch (modulo) {
      case 'dashboard':
        return <Dashboard />

      case 'viajes':
        return <Viajes />

      // ── Alertas: implementación básica inline ─────────────
      case 'alertas':
        return (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard titulo="Alertas Activas" valor="2" color="text-red-600" />
              <KpiCard titulo="Enviadas Hoy"    valor="7" />
              <KpiCard titulo="Resueltas Hoy"   valor="5" color="text-green-700" />
            </div>
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700 text-sm">Historial de Alertas</h3>
              </div>
              <div className="p-4 space-y-3">
                {ALERTAS_MUESTRA.map((a) => (
                  <AlertaBadge key={a.id} alerta={a} />
                ))}
              </div>
            </div>
          </div>
        )

      // ── Módulos pendientes de desarrollo ─────────────────
      case 'reportes':
        return (
          <ModuloPlaceholder
            titulo="Análisis y Reportes"
            descripcion="Indicadores de desempeño, gráficas con Recharts y exportación en PDF/Excel."
          />
        )
      case 'flota':
        return (
          <ModuloPlaceholder
            titulo="Gestión de Flota"
            descripcion="Registro de cabezales y chasis, estados, modalidades de renta y control de disponibilidad."
          />
        )
      case 'pilotos':
        return (
          <ModuloPlaceholder
            titulo="Pilotos y Viáticos"
            descripcion="Registro de conductores, asignación a fletes y control de viáticos por servicio."
          />
        )
      case 'usuarios':
        return (
          <ModuloPlaceholder
            titulo="Usuarios y Seguridad"
            descripcion="Autenticación con Supabase Auth, roles (admin, operativo, visualizador) y políticas RLS."
          />
        )

      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        modulo={modulo}
        setModulo={setModulo}
        collapsed={collapsed}
        toggle={() => setCollapsed((c) => !c)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          titulo={MODULO_HEADERS[modulo]}
          alertasCount={2}
        />
        <main className="flex-1 overflow-y-auto">
          {renderModulo()}
        </main>
      </div>
    </div>
  )
}
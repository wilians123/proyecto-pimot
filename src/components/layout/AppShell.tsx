// Shell principal de la aplicación. Gestiona el enrutamiento
// entre módulos, el estado del sidebar y el panel de notificaciones.

"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Dashboard from "@/modules/dashboard/components/Dashboard";
import Viajes from "@/modules/viajes/components/Viajes";
import Flota from "@/modules/flota/components/Flota";
import Clientes from "@/modules/clientes/components/Clientes";
import Pilotos from "@/modules/pilotos/components/Pilotos";
import ModuloPlaceholder from "@/components/shared/ModuloPlaceholder";
import Usuarios from "@/modules/usuarios/components/Usuarios";
import Alertas from "@/modules/alertas";
import RentaChasis from "@/modules/renta-chasis";
import { MODULO_HEADERS } from "@/lib/constants";
import type { ModuloId } from "@/types/ui";

export default function AppShell() {
  const [modulo, setModulo] = useState<ModuloId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotifications] = useState(false);

  function renderModulo() {
    switch (modulo) {
      case "dashboard":
        return <Dashboard />;
      case "viajes":
        return <Viajes />;
      case "flota":
        return <Flota />;
      case "pilotos":
        return <Pilotos />;
      case "usuarios":
        return <Usuarios />;
      case "clientes":
        return <Clientes />;
      case "renta-chasis":
        return <RentaChasis />;

      case "alertas":
        return <Alertas />;

      case "reportes":
        return (
          <ModuloPlaceholder
            titulo="Análisis y Reportes"
            descripcion="Indicadores de desempeño, gráficas con Recharts y exportación en PDF/Excel."
          />
        );
      default:
        return <Dashboard />;
    }
  }

  return (
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
            onToggleMobile={() => setMobileOpen((v) => !v)}
            onToggleNotifications={() => setNotifications((v) => !v)}
            notificationsOpen={notificationsOpen}
          />
          <main className="flex-1 overflow-y-auto">{renderModulo()}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

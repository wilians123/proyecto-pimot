// Shell principal de la aplicación. Gestiona el enrutamiento
// entre módulos, el estado del sidebar y el panel de notificaciones.

"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Dashboard from "@/modules/dashboard/components/Dashboard";
import Viajes from "@/modules/viajes/components/Viajes";
import Flota from "@/modules/flota/components/Flota";
import Clientes from "@/modules/clientes/components/Clientes";
import Pilotos from "@/modules/pilotos/components/Pilotos";
import Usuarios from "@/modules/usuarios/components/Usuarios";
import Alertas from "@/modules/alertas";
import RentaChasis from "@/modules/renta-chasis";
import Reportes from "@/modules/reportes";
import { MODULO_HEADERS } from "@/lib/constants";
import type { ModuloId } from "@/types/ui";
import { usePermisos } from "@/hooks/usePermisos";
import AccesoRestringido from "@/components/shared/AccesoRestringido";

const MODULOS_URL: ModuloId[] = [
  "dashboard",
  "viajes",
  "flota",
  "pilotos",
  "usuarios",
  "clientes",
  "renta-chasis",
  "alertas",
  "reportes",
];

export default function AppShell() {
  return (
    <ProtectedRoute>
      <AppShellContent />
    </ProtectedRoute>
  );
}

function AppShellContent() {
  const { puedeVerModulo, moduloInicial } = usePermisos();
  const [modulo, setModulo] = useState<ModuloId>(() => {
    if (typeof window !== "undefined") {
      const moduloUrl = new URLSearchParams(window.location.search).get("modulo");
      if (moduloUrl && MODULOS_URL.includes(moduloUrl as ModuloId)) {
        return moduloUrl as ModuloId;
      }
    }
    return moduloInicial();
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotifications] = useState(false);

  const moduloPermitido = puedeVerModulo(modulo);
  const moduloVisible = moduloPermitido ? modulo : moduloInicial();

  useEffect(() => {
    const moduloUrl = new URLSearchParams(window.location.search).get("modulo");
    if (!moduloUrl || moduloUrl === moduloVisible) return;
    const params = new URLSearchParams(window.location.search);
    params.set("modulo", moduloVisible);
    params.delete("seccion");
    params.delete("rentaId");
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  }, [modulo, moduloVisible]);

  function cambiarModulo(moduloSiguiente: ModuloId) {
    setModulo(moduloSiguiente);
    const params = new URLSearchParams(window.location.search);
    params.set("modulo", moduloSiguiente);
    if (moduloSiguiente !== "renta-chasis") {
      params.delete("seccion");
      params.delete("rentaId");
    }
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params.toString()}`);
  }

  function renderModulo() {
    switch (moduloVisible) {
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
        return <Reportes />;
      default:
        return <AccesoRestringido />;
    }
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
        <Sidebar
            modulo={moduloVisible}
            setModulo={cambiarModulo}
          collapsed={collapsed}
          toggle={() => setCollapsed((c) => !c)}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            titulo={MODULO_HEADERS[moduloVisible]}
            onToggleMobile={() => setMobileOpen((v) => !v)}
            onToggleNotifications={() => setNotifications((v) => !v)}
            notificationsOpen={notificationsOpen}
          />
          <main className="flex-1 overflow-y-auto">{renderModulo()}</main>
        </div>
      </div>
  );
}

"use client";

import { useAuth } from "@/context/AuthContext";
import {
  esRol,
  moduloInicial as moduloInicialPorRol,
  puede as puedePorRol,
  puedeVerModulo as puedeVerModuloPorRol,
  type Accion,
  type Rol,
} from "@/lib/permisos";
import type { ModuloId } from "@/types/ui";

export function usePermisos() {
  const { profile } = useAuth();
  const rol: Rol | null = profile && esRol(profile.rol) ? profile.rol : null;
  const activo = profile?.activo === true;
  const rolValido = activo && rol !== null;

  return {
    rol,
    activo,
    puede: (accion: Accion) => rolValido && puedePorRol(rol, accion),
    puedeVerModulo: (modulo: ModuloId) => rolValido && puedeVerModuloPorRol(rol, modulo),
    moduloInicial: () => moduloInicialPorRol(rolValido ? rol : null),
  };
}

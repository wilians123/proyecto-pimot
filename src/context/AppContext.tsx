'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

type SidebarState = 'expanded' | 'collapsed'

interface AppContextType {
  sidebarState: SidebarState
  toggleSidebar: () => void
  activeModule: string
  setActiveModule: (mod: string) => void
}

const AppContext = createContext<AppContextType>({
  sidebarState: 'expanded',
  toggleSidebar: () => {},
  activeModule: 'dashboard',
  setActiveModule: () => {},
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded')
  const [activeModule, setActiveModule] = useState('dashboard')

  const toggleSidebar = () =>
    setSidebarState(s => s === 'expanded' ? 'collapsed' : 'expanded')

  return (
    <AppContext.Provider value={{ sidebarState, toggleSidebar, activeModule, setActiveModule }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)

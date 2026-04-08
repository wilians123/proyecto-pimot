export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Alias de tipos de estado — fuente única de verdad
export type EstadoCabezalDB  = 'activo' | 'en_viaje' | 'en_mantenimiento' | 'inactivo'
export type EstadoChasisDB   = 'disponible' | 'en_renta' | 'en_flete' | 'en_taller'
export type TamañoChasisDB   = '20' | '40' | '45'
export type EstadoViajeDB    = 'programado' | 'en_transito' | 'en_destino' | 'finalizado' | 'cancelado'
export type NivelAlertaDB    = 'info' | 'advertencia' | 'critico'
export type EstadoAlertaDB   = 'pendiente' | 'enviada' | 'vista' | 'resuelta'
export type RolUsuarioDB     = 'admin' | 'operativo' | 'visualizador'
export type TipoServicioViajeDB = 'flete' | 'renta'
export type TipoClienteDB    = 'directo' | 'indirecto'

export interface Database {
  public: {
    Tables: {

      // ── profiles ──────────────────────────────────────────────
      profiles: {
        Row: {
          id:          string
          nombre:      string
          telefono:    string | null
          rol:         RolUsuarioDB
          activo:      boolean
          avatar_url:  string | null
          created_at:  string
          updated_at:  string
        }
        Insert: {
          id:          string
          nombre:      string
          telefono?:   string | null
          rol?:        RolUsuarioDB
          activo?:     boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          nombre?:     string
          telefono?:   string | null
          rol?:        RolUsuarioDB
          activo?:     boolean
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }

      // ── cabezales ─────────────────────────────────────────────
      cabezales: {
        Row: {
          id:           string
          placa:        string
          marca:        string | null
          modelo:       string | null
          numero_serie: string | null
          estado:       EstadoCabezalDB
          notas:        string | null
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id?:           string
          placa:         string
          marca?:        string | null
          modelo?:       string | null
          numero_serie?: string | null
          estado?:       EstadoCabezalDB
          notas?:        string | null
          created_at?:   string
          updated_at?:   string
        }
        Update: {
          placa?:        string
          marca?:        string | null
          modelo?:       string | null
          numero_serie?: string | null
          estado?:       EstadoCabezalDB
          notas?:        string | null
          updated_at?:   string
        }
        Relationships: []
      }

      // ── chasis ────────────────────────────────────────────────
      chasis: {
        Row: {
          id:           string
          placa:        string
          marca:        string | null
          modelo:       string | null
          numero_serie: string | null
          tamaño:       TamañoChasisDB
          estado:       EstadoChasisDB
          notas:        string | null
          created_at:   string
          updated_at:   string
        }
        Insert: {
          id?:           string
          placa:         string
          marca?:        string | null
          modelo?:       string | null
          numero_serie?: string | null
          tamaño:        TamañoChasisDB
          estado?:       EstadoChasisDB
          notas?:        string | null
          created_at?:   string
          updated_at?:   string
        }
        Update: {
          placa?:        string
          marca?:        string | null
          modelo?:       string | null
          numero_serie?: string | null
          tamaño?:       TamañoChasisDB
          estado?:       EstadoChasisDB
          notas?:        string | null
          updated_at?:   string
        }
        Relationships: []
      }

      // ── pilotos ───────────────────────────────────────────────
      pilotos: {
        Row: {
          id:            string
          nombre:        string
          licencia:      string | null
          telefono:      string | null
          viatico_monto: number
          activo:        boolean
          created_at:    string
          updated_at:    string
        }
        Insert: {
          id?:            string
          nombre:         string
          licencia?:      string | null
          telefono?:      string | null
          viatico_monto?: number
          activo?:        boolean
          created_at?:    string
          updated_at?:    string
        }
        Update: {
          nombre?:        string
          licencia?:      string | null
          telefono?:      string | null
          viatico_monto?: number
          activo?:        boolean
          updated_at?:    string
        }
        Relationships: []
      }

      // ── clientes ──────────────────────────────────────────────
      clientes: {
        Row: {
          id:         string
          nombre:     string
          tipo:       TipoClienteDB
          telefono:   string | null
          correo:     string | null
          direccion:  string | null
          activo:     boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:        string
          nombre:     string
          tipo?:      TipoClienteDB
          telefono?:  string | null
          correo?:    string | null
          direccion?: string | null
          activo?:    boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          nombre?:    string
          tipo?:      TipoClienteDB
          telefono?:  string | null
          correo?:    string | null
          direccion?: string | null
          activo?:    boolean
          updated_at?: string
        }
        Relationships: []
      }

      // ── viajes ────────────────────────────────────────────────
      viajes: {
        Row: {
          id:                   string
          codigo:               string | null
          origen:               string
          destino:              string
          lat_origen:           number | null
          lng_origen:           number | null
          lat_destino:          number | null
          lng_destino:          number | null
          radio_destino_metros: number
          estado:               EstadoViajeDB
          fecha_inicio:         string | null
          fecha_estimada:       string | null
          fecha_fin:            string | null
          duracion_real_min:    number | null
          piloto_id:            string | null
          cabezal_id:           string | null
          chasis_id:            string | null
          chasis_externo_placa: string | null
          cliente_id:           string | null
          tipo_servicio:        TipoServicioViajeDB
          tipo_renta_id:        string | null
          viatico_monto:        number | null
          notas:                string | null
          creado_por:           string | null
          created_at:           string
          updated_at:           string
        }

        // Insert explicito — sin auto-referencia
        Insert: {
          id?:                   string
          codigo?:               string | null
          origen:                string
          destino:               string
          lat_origen?:           number | null
          lng_origen?:           number | null
          lat_destino?:          number | null
          lng_destino?:          number | null
          radio_destino_metros?: number
          estado?:               EstadoViajeDB
          fecha_inicio?:         string | null
          fecha_estimada?:       string | null
          fecha_fin?:            string | null
          piloto_id?:            string | null
          cabezal_id?:           string | null
          chasis_id?:            string | null
          chasis_externo_placa?: string | null
          cliente_id?:           string | null
          tipo_servicio:         TipoServicioViajeDB
          tipo_renta_id?:        string | null
          viatico_monto?:        number | null
          notas?:                string | null
          creado_por?:           string | null
          created_at?:           string
          updated_at?:           string
        }
        Update: {
          codigo?:               string | null
          origen?:               string
          destino?:              string
          lat_origen?:           number | null
          lng_origen?:           number | null
          lat_destino?:          number | null
          lng_destino?:          number | null
          radio_destino_metros?: number
          estado?:               EstadoViajeDB
          fecha_inicio?:         string | null
          fecha_estimada?:       string | null
          fecha_fin?:            string | null
          piloto_id?:            string | null
          cabezal_id?:           string | null
          chasis_id?:            string | null
          chasis_externo_placa?: string | null
          cliente_id?:           string | null
          tipo_servicio?:        TipoServicioViajeDB
          tipo_renta_id?:        string | null
          viatico_monto?:        number | null
          notas?:                string | null
          creado_por?:           string | null
          updated_at?:           string
        }
        Relationships: []
      }

      // ── alertas ───────────────────────────────────────────────
      alertas: {
        Row: {
          id:             string
          viaje_id:       string | null
          tipo:           string
          nivel:          NivelAlertaDB
          mensaje:        string
          estado:         EstadoAlertaDB
          canal_telegram: boolean
          canal_email:    boolean
          canal_push:     boolean
          created_at:     string
          updated_at:     string
        }
        Insert: {
          id?:             string
          viaje_id?:       string | null
          tipo:            string
          nivel?:          NivelAlertaDB
          mensaje:         string
          estado?:         EstadoAlertaDB
          canal_telegram?: boolean
          canal_email?:    boolean
          canal_push?:     boolean
          created_at?:     string
          updated_at?:     string
        }
        Update: {
          viaje_id?:       string | null
          tipo?:           string
          nivel?:          NivelAlertaDB
          mensaje?:        string
          estado?:         EstadoAlertaDB
          canal_telegram?: boolean
          canal_email?:    boolean
          canal_push?:     boolean
          updated_at?:     string
        }
        Relationships: []
      }

      // ── gps_logs ──────────────────────────────────────────────
      gps_logs: {
        Row: {
          id:          number
          viaje_id:    string
          lat:         number
          lng:         number
          velocidad:   number | null
          precision_m: number | null
          fuente:      string | null
          created_at:  string
        }
        Insert: {
          viaje_id:     string
          lat:          number
          lng:          number
          velocidad?:   number | null
          precision_m?: number | null
          fuente?:      string | null
          created_at?:  string
        }
        Update: {
          velocidad?:   number | null
          precision_m?: number | null
          fuente?:      string | null
        }
        Relationships: []
      }
    }

    Views: Record<string, never>
    CompositeTypes: Record<string, never>

    Functions: {
      get_user_rol: {
        Args:    Record<never, never>
        Returns: string
      }
      stats_viajes: {
        Args:    { p_desde?: string; p_hasta?: string }
        Returns: Json
      }
    }

    Enums: Record<string, string[]>
  }
}
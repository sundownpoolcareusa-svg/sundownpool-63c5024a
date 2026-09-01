export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      business_profiles: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          created_at: string
          id: string
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          client_type: string
          contacts: Json
          created_at: string
          email: string | null
          equipment_notes: string | null
          equipment_photos: string[]
          filter_cleaning_count: number
          filter_last_changed_at: string | null
          filter_last_cleaned_at: string | null
          gate_code: string | null
          has_salt_system: boolean
          has_spa: boolean
          id: string
          last_service_date: string | null
          lat: number | null
          lng: number | null
          monthly_value: number
          name: string
          notes: string | null
          notify_chemical_products: boolean
          notify_chemicals: boolean
          notify_chemicals_since: string | null
          notify_on_way: boolean
          notify_on_way_since: string | null
          notify_photo: boolean
          notify_photo_since: string | null
          phone: string | null
          pool_capacity_gallons: number | null
          pool_filter_type: string | null
          pool_photos: string[]
          route_position: number | null
          service_days: string[]
          service_frequency: string | null
          stage: string
          state: string | null
          status: string
          technician_id: string | null
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          client_type?: string
          contacts?: Json
          created_at?: string
          email?: string | null
          equipment_notes?: string | null
          equipment_photos?: string[]
          filter_cleaning_count?: number
          filter_last_changed_at?: string | null
          filter_last_cleaned_at?: string | null
          gate_code?: string | null
          has_salt_system?: boolean
          has_spa?: boolean
          id?: string
          last_service_date?: string | null
          lat?: number | null
          lng?: number | null
          monthly_value?: number
          name: string
          notes?: string | null
          notify_chemical_products?: boolean
          notify_chemicals?: boolean
          notify_chemicals_since?: string | null
          notify_on_way?: boolean
          notify_on_way_since?: string | null
          notify_photo?: boolean
          notify_photo_since?: string | null
          phone?: string | null
          pool_capacity_gallons?: number | null
          pool_filter_type?: string | null
          pool_photos?: string[]
          route_position?: number | null
          service_days?: string[]
          service_frequency?: string | null
          stage?: string
          state?: string | null
          status?: string
          technician_id?: string | null
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          client_type?: string
          contacts?: Json
          created_at?: string
          email?: string | null
          equipment_notes?: string | null
          equipment_photos?: string[]
          filter_cleaning_count?: number
          filter_last_changed_at?: string | null
          filter_last_cleaned_at?: string | null
          gate_code?: string | null
          has_salt_system?: boolean
          has_spa?: boolean
          id?: string
          last_service_date?: string | null
          lat?: number | null
          lng?: number | null
          monthly_value?: number
          name?: string
          notes?: string | null
          notify_chemical_products?: boolean
          notify_chemicals?: boolean
          notify_chemicals_since?: string | null
          notify_on_way?: boolean
          notify_on_way_since?: string | null
          notify_photo?: boolean
          notify_photo_since?: string | null
          phone?: string | null
          pool_capacity_gallons?: number | null
          pool_filter_type?: string | null
          pool_photos?: string[]
          route_position?: number | null
          service_days?: string[]
          service_frequency?: string | null
          stage?: string
          state?: string | null
          status?: string
          technician_id?: string | null
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_items: {
        Row: {
          created_at: string
          description: string | null
          estimate_id: string
          id: string
          name: string
          position: number
          qty: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          estimate_id: string
          id?: string
          name: string
          position?: number
          qty?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          estimate_id?: string
          id?: string
          name?: string
          position?: number
          qty?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimate_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          billing_type: string
          client_id: string
          created_at: string
          discount: number
          estimate_date: string
          id: string
          notes: string | null
          number: string
          public_token: string
          status: string
          subtotal: number
          title: string | null
          total: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          billing_type?: string
          client_id: string
          created_at?: string
          discount?: number
          estimate_date?: string
          id?: string
          notes?: string | null
          number: string
          public_token?: string
          status?: string
          subtotal?: number
          title?: string | null
          total?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          billing_type?: string
          client_id?: string
          created_at?: string
          discount?: number
          estimate_date?: string
          id?: string
          notes?: string | null
          number?: string
          public_token?: string
          status?: string
          subtotal?: number
          title?: string | null
          total?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          position: number
          qty: number
          rate: number
          service: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          position?: number
          qty?: number
          rate?: number
          service?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          position?: number
          qty?: number
          rate?: number
          service?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string
          created_at: string
          discount: number
          due_date: string | null
          estimate_id: string | null
          id: string
          invoice_date: string
          notes: string | null
          number: string
          payment_method: string | null
          public_token: string
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          discount?: number
          due_date?: string | null
          estimate_id?: string | null
          id?: string
          invoice_date?: string
          notes?: string | null
          number: string
          payment_method?: string | null
          public_token?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          discount?: number
          due_date?: string | null
          estimate_id?: string | null
          id?: string
          invoice_date?: string
          notes?: string | null
          number?: string
          payment_method?: string | null
          public_token?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      product_costs: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          product_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          product_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          product_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          technician_id: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          technician_id: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          technician_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          chemicals_email_sent_at: string | null
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          manual: boolean
          notes: string | null
          on_way_email_sent_at: string | null
          photo_email_sent_at: string | null
          photo_taken_at: string | null
          position: number
          route_id: string
          scheduled_time: string | null
          started_at: string | null
          status: string
          updated_at: string
          visit_photos: string[]
        }
        Insert: {
          chemicals_email_sent_at?: string | null
          client_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          manual?: boolean
          notes?: string | null
          on_way_email_sent_at?: string | null
          photo_email_sent_at?: string | null
          photo_taken_at?: string | null
          position?: number
          route_id: string
          scheduled_time?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          visit_photos?: string[]
        }
        Update: {
          chemicals_email_sent_at?: string | null
          client_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          manual?: boolean
          notes?: string | null
          on_way_email_sent_at?: string | null
          photo_email_sent_at?: string | null
          photo_taken_at?: string | null
          position?: number
          route_id?: string
          scheduled_time?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          visit_photos?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          id: string
          route_date: string
          status: string
          technician_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          route_date: string
          status?: string
          technician_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          route_date?: string
          status?: string
          technician_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      service_jobs: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          priority: string | null
          reminder_enabled: boolean
          reminder_minutes_before: number | null
          reminder_sent_at: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_types: string[]
          status: string
          technician_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          reminder_enabled?: boolean
          reminder_minutes_before?: number | null
          reminder_sent_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_types?: string[]
          status?: string
          technician_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          reminder_enabled?: boolean
          reminder_minutes_before?: number | null
          reminder_sent_at?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_types?: string[]
          status?: string
          technician_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_jobs_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "technicians"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stop_chemicals: {
        Row: {
          body_type: string
          calcium_hardness: number | null
          created_at: string
          free_chlorine: number | null
          id: string
          notes: string | null
          ph: number | null
          products: Json
          route_stop_id: string
          salt: number | null
          stabilizer: number | null
          total_alkalinity: number | null
          updated_at: string
        }
        Insert: {
          body_type?: string
          calcium_hardness?: number | null
          created_at?: string
          free_chlorine?: number | null
          id?: string
          notes?: string | null
          ph?: number | null
          products?: Json
          route_stop_id: string
          salt?: number | null
          stabilizer?: number | null
          total_alkalinity?: number | null
          updated_at?: string
        }
        Update: {
          body_type?: string
          calcium_hardness?: number | null
          created_at?: string
          free_chlorine?: number | null
          id?: string
          notes?: string | null
          ph?: number | null
          products?: Json
          route_stop_id?: string
          salt?: number | null
          stabilizer?: number | null
          total_alkalinity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stop_chemicals_route_stop_id_fkey"
            columns: ["route_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          active: boolean
          auth_user_id: string | null
          can_manage_clients: boolean
          can_manage_estimates: boolean
          can_manage_invoices: boolean
          can_manage_routes: boolean
          can_manage_services: boolean
          can_manage_users: boolean
          can_view_earnings: boolean
          color: string
          created_at: string
          home_address: string | null
          home_lat: number | null
          home_lng: number | null
          id: string
          is_owner: boolean
          name: string
          phone: string | null
          photo_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          auth_user_id?: string | null
          can_manage_clients?: boolean
          can_manage_estimates?: boolean
          can_manage_invoices?: boolean
          can_manage_routes?: boolean
          can_manage_services?: boolean
          can_manage_users?: boolean
          can_view_earnings?: boolean
          color?: string
          created_at?: string
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          is_owner?: boolean
          name: string
          phone?: string | null
          photo_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          auth_user_id?: string | null
          can_manage_clients?: boolean
          can_manage_estimates?: boolean
          can_manage_invoices?: boolean
          can_manage_routes?: boolean
          can_manage_services?: boolean
          can_manage_users?: boolean
          can_view_earnings?: boolean
          color?: string
          created_at?: string
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          is_owner?: boolean
          name?: string
          phone?: string | null
          photo_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_client_photo: { Args: { p_name: string }; Returns: boolean }
      complete_my_service_job: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      create_my_service_job: {
        Args: {
          p_client_id: string
          p_duration_minutes?: number
          p_notes?: string
          p_priority?: string
          p_reminder_enabled?: boolean
          p_reminder_minutes_before?: number
          p_scheduled_date?: string
          p_scheduled_time?: string
          p_service_types?: string[]
          p_title: string
        }
        Returns: string
      }
      delete_my_push_subscription: {
        Args: { p_endpoint: string }
        Returns: undefined
      }
      ensure_my_technician_stops: {
        Args: { p_date: string }
        Returns: undefined
      }
      get_estimate_public: { Args: { _token: string }; Returns: Json }
      get_invoice_public: { Args: { _token: string }; Returns: Json }
      get_my_client_chemicals_history: {
        Args: { p_client_id: string }
        Returns: {
          body_type: string
          calcium_hardness: number
          free_chlorine: number
          notes: string
          ph: number
          products: Json
          route_date: string
          route_stop_id: string
          salt: number
          stabilizer: number
          total_alkalinity: number
        }[]
      }
      get_my_client_invoices: {
        Args: { p_client_id: string }
        Returns: {
          due_date: string
          id: string
          invoice_date: string
          number: string
          status: string
          total: number
        }[]
      }
      get_my_client_visit_history: {
        Args: { p_client_id: string }
        Returns: {
          completed_at: string
          notes: string
          route_date: string
          route_stop_id: string
          started_at: string
          status: string
        }[]
      }
      get_my_service_jobs: {
        Args: { p_status?: string }
        Returns: {
          client_id: string
          client_name: string
          completed_at: string
          created_at: string
          duration_minutes: number
          job_id: string
          next_visit_date: string
          notes: string
          priority: string
          reminder_enabled: boolean
          reminder_minutes_before: number
          scheduled_date: string
          scheduled_time: string
          service_types: string[]
          status: string
          title: string
        }[]
      }
      get_my_stop_chemicals:
        | {
            Args: { p_stop_id: string }
            Returns: {
              calcium_hardness: number
              free_chlorine: number
              notes: string
              ph: number
              products: Json
              stabilizer: number
              total_alkalinity: number
            }[]
          }
        | {
            Args: { p_body_type?: string; p_stop_id: string }
            Returns: {
              calcium_hardness: number
              free_chlorine: number
              notes: string
              ph: number
              products: Json
              salt: number
              stabilizer: number
              total_alkalinity: number
            }[]
          }
      get_my_stop_chemicals_history: {
        Args: { p_stop_id: string }
        Returns: {
          body_type: string
          calcium_hardness: number
          free_chlorine: number
          notes: string
          ph: number
          products: Json
          route_date: string
          route_stop_id: string
          salt: number
          stabilizer: number
          total_alkalinity: number
        }[]
      }
      get_my_stop_detail: {
        Args: { p_stop_id: string }
        Returns: {
          client_address: string
          client_city: string
          client_name: string
          client_notify_photo: boolean
          client_state: string
          client_type: string
          client_zip: string
          filter_cleaning_count: number
          filter_last_cleaned_at: string
          has_salt_system: boolean
          has_spa: boolean
          position: number
          status: string
          stop_id: string
          visit_photos: string[]
        }[]
      }
      get_my_technician_alerts: {
        Args: { p_date: string }
        Returns: {
          alert_type: string
          client_name: string
          days: number
        }[]
      }
      get_my_technician_clients: {
        Args: never
        Returns: {
          address: string
          city: string
          client_id: string
          client_type: string
          email: string
          equipment_notes: string
          equipment_photos: string[]
          filter_last_changed_at: string
          has_salt_system: boolean
          has_spa: boolean
          monthly_value: number
          name: string
          notes: string
          phone: string
          pool_photos: string[]
          service_days: string[]
          state: string
          status: string
          zip: string
        }[]
      }
      get_my_technician_dashboard: {
        Args: { p_date: string }
        Returns: {
          avg_cost_per_visit: number
          avg_revenue_per_pool: number
          clients_today: number
          completed_today: number
          estimated_route_revenue: number
          filters_overdue: number
          overdue_invoices: number
          pools_with_alert: number
          qua_routes: number
          qui_routes: number
          seg_routes: number
          sex_routes: number
          ter_routes: number
          total_pools: number
        }[]
      }
      get_my_technician_stops: {
        Args: { p_date: string }
        Returns: {
          client_address: string
          client_city: string
          client_id: string
          client_lat: number
          client_lng: number
          client_name: string
          client_notify_photo: boolean
          client_phone: string
          client_state: string
          client_type: string
          client_zip: string
          completed_at: string
          has_chemicals: boolean
          has_visit_photo: boolean
          position: number
          route_id: string
          scheduled_time: string
          started_at: string
          status: string
          stop_id: string
          stop_notes: string
        }[]
      }
      get_my_technicians_admin: {
        Args: never
        Returns: {
          active: boolean
          auth_email: string
          auth_user_id: string
          can_manage_clients: boolean
          can_manage_estimates: boolean
          can_manage_invoices: boolean
          can_manage_routes: boolean
          can_manage_services: boolean
          can_manage_users: boolean
          can_view_earnings: boolean
          color: string
          created_at: string
          home_address: string
          home_lat: number
          home_lng: number
          id: string
          is_owner: boolean
          name: string
          phone: string
          photo_path: string
        }[]
      }
      log_my_client_filter_change: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      log_my_stop_filter_cleaning: {
        Args: { p_stop_id: string }
        Returns: {
          filter_cleaning_count: number
          filter_last_cleaned_at: string
        }[]
      }
      reorder_my_stops: { Args: { p_stop_ids: string[] }; Returns: undefined }
      reschedule_my_stop: {
        Args: { p_all_future?: boolean; p_new_date: string; p_stop_id: string }
        Returns: undefined
      }
      save_my_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_p256dh: string }
        Returns: undefined
      }
      save_my_stop_chemicals: {
        Args: {
          p_body_type?: string
          p_calcium_hardness: number
          p_free_chlorine: number
          p_notes: string
          p_ph: number
          p_products: Json
          p_salt?: number
          p_stabilizer: number
          p_stop_id: string
          p_total_alkalinity: number
        }
        Returns: undefined
      }
      save_my_stop_visit_photos: {
        Args: { p_photos: string[]; p_stop_id: string }
        Returns: undefined
      }
      save_stop_visit_photos: {
        Args: { p_photos: string[]; p_stop_id: string }
        Returns: undefined
      }
      update_my_client_equipment: {
        Args: { p_client_id: string; p_notes: string; p_photos: string[] }
        Returns: undefined
      }
      update_my_client_notes: {
        Args: { p_client_id: string; p_notes: string }
        Returns: undefined
      }
      update_my_client_pool_photos: {
        Args: { p_client_id: string; p_photos: string[] }
        Returns: undefined
      }
      update_my_service_job: {
        Args: {
          p_client_id: string
          p_duration_minutes?: number
          p_job_id: string
          p_notes?: string
          p_priority?: string
          p_reminder_enabled?: boolean
          p_reminder_minutes_before?: number
          p_scheduled_date?: string
          p_scheduled_time?: string
          p_service_types?: string[]
          p_title: string
        }
        Returns: undefined
      }
      update_my_stop_status: {
        Args: { p_status: string; p_stop_id: string }
        Returns: undefined
      }
      update_my_technician_profile: {
        Args: {
          p_home_address: string
          p_home_lat: number
          p_home_lng: number
          p_phone: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

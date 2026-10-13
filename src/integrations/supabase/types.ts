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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bot_config: {
        Row: {
          config: Json
          id: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          config: Json
          id?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          config?: Json
          id?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      engine_commands: {
        Row: {
          acked_at: string | null
          command: string
          created_at: string
          created_by: string | null
          id: number
          payload: Json | null
        }
        Insert: {
          acked_at?: string | null
          command: string
          created_at?: string
          created_by?: string | null
          id?: number
          payload?: Json | null
        }
        Update: {
          acked_at?: string | null
          command?: string
          created_at?: string
          created_by?: string | null
          id?: number
          payload?: Json | null
        }
        Relationships: []
      }
      engine_status: {
        Row: {
          heartbeat_at: string | null
          id: number
          status: Json
        }
        Insert: {
          heartbeat_at?: string | null
          id?: number
          status?: Json
        }
        Update: {
          heartbeat_at?: string | null
          id?: number
          status?: Json
        }
        Relationships: []
      }
      events: {
        Row: {
          component: string
          data: Json | null
          id: number
          level: string
          message: string
          ts: string
        }
        Insert: {
          component: string
          data?: Json | null
          id?: number
          level: string
          message: string
          ts?: string
        }
        Update: {
          component?: string
          data?: Json | null
          id?: number
          level?: string
          message?: string
          ts?: string
        }
        Relationships: []
      }
      fills: {
        Row: {
          client_order_id: string | null
          fee: number
          id: string
          position_id: string | null
          price: number
          qty: number
          realized_pnl: number
          side: string
          simulated: boolean
          symbol: string
          ts: string
        }
        Insert: {
          client_order_id?: string | null
          fee?: number
          id: string
          position_id?: string | null
          price: number
          qty: number
          realized_pnl?: number
          side: string
          simulated?: boolean
          symbol: string
          ts?: string
        }
        Update: {
          client_order_id?: string | null
          fee?: number
          id?: string
          position_id?: string | null
          price?: number
          qty?: number
          realized_pnl?: number
          side?: string
          simulated?: boolean
          symbol?: string
          ts?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          avg_price: number | null
          client_order_id: string
          created_at: string
          exchange_order_id: string | null
          filled_qty: number
          market: string
          position_id: string | null
          price: number | null
          purpose: string
          qty: number
          raw: Json | null
          reduce_only: boolean
          side: string
          simulated: boolean
          status: string
          stop_price: number | null
          symbol: string
          type: string
          updated_at: string
        }
        Insert: {
          avg_price?: number | null
          client_order_id: string
          created_at?: string
          exchange_order_id?: string | null
          filled_qty?: number
          market: string
          position_id?: string | null
          price?: number | null
          purpose: string
          qty: number
          raw?: Json | null
          reduce_only?: boolean
          side: string
          simulated?: boolean
          status: string
          stop_price?: number | null
          symbol: string
          type: string
          updated_at?: string
        }
        Update: {
          avg_price?: number | null
          client_order_id?: string
          created_at?: string
          exchange_order_id?: string | null
          filled_qty?: number
          market?: string
          position_id?: string | null
          price?: number | null
          purpose?: string
          qty?: number
          raw?: Json | null
          reduce_only?: boolean
          side?: string
          simulated?: boolean
          status?: string
          stop_price?: number | null
          symbol?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          closed_at: string | null
          entry: number
          entry_reason: Json | null
          exit_reason: string | null
          fees: number
          id: string
          initial_stop: number
          mark: number | null
          market: string
          opened_at: string
          qty: number
          realized_pnl: number
          score: number | null
          side: string
          simulated: boolean
          status: string
          stop: number
          strategy: string | null
          symbol: string
          targets: Json
          trail: Json | null
          unrealized_pnl: number | null
        }
        Insert: {
          closed_at?: string | null
          entry: number
          entry_reason?: Json | null
          exit_reason?: string | null
          fees?: number
          id: string
          initial_stop: number
          mark?: number | null
          market: string
          opened_at?: string
          qty: number
          realized_pnl?: number
          score?: number | null
          side: string
          simulated?: boolean
          status: string
          stop: number
          strategy?: string | null
          symbol: string
          targets?: Json
          trail?: Json | null
          unrealized_pnl?: number | null
        }
        Update: {
          closed_at?: string | null
          entry?: number
          entry_reason?: Json | null
          exit_reason?: string | null
          fees?: number
          id?: string
          initial_stop?: number
          mark?: number | null
          market?: string
          opened_at?: string
          qty?: number
          realized_pnl?: number
          score?: number | null
          side?: string
          simulated?: boolean
          status?: string
          stop?: number
          strategy?: string | null
          symbol?: string
          targets?: Json
          trail?: Json | null
          unrealized_pnl?: number | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          accepted: boolean
          change_pct: number | null
          created_at: string
          entry: number | null
          factors: Json
          id: string
          market: string
          price: number | null
          reasons: Json
          rr: number | null
          score: number
          side: string
          simulated: boolean
          stop: number | null
          strategy: string
          symbol: string
          targets: Json
          volume_24h: number | null
        }
        Insert: {
          accepted: boolean
          change_pct?: number | null
          created_at?: string
          entry?: number | null
          factors?: Json
          id?: string
          market: string
          price?: number | null
          reasons?: Json
          rr?: number | null
          score: number
          side: string
          simulated?: boolean
          stop?: number | null
          strategy: string
          symbol: string
          targets?: Json
          volume_24h?: number | null
        }
        Update: {
          accepted?: boolean
          change_pct?: number | null
          created_at?: string
          entry?: number | null
          factors?: Json
          id?: string
          market?: string
          price?: number | null
          reasons?: Json
          rr?: number | null
          score?: number
          side?: string
          simulated?: boolean
          stop?: number | null
          strategy?: string
          symbol?: string
          targets?: Json
          volume_24h?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

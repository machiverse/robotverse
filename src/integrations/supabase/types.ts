export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      document_uploads: {
        Row: {
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_at: string
          user_id: string
        }
        Insert: {
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          user_id: string
        }
        Update: {
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string | null
          finance_type: string[] | null
          financing_for: string[] | null
          full_name: string | null
          government_scheme_support: boolean | null
          id: string
          location: string | null
          logistics_region: string | null
          logistics_type: string | null
          mobile_number: string | null
          mou_agreed: boolean | null
          mou_agreed_at: string | null
          phone: string | null
          primary_user_type:
            | Database["public"]["Enums"]["user_type_enum"]
            | null
          seller_roles: string[] | null
          service_categories: string[] | null
          target_audience: string[] | null
          transport_modes: string[] | null
          updated_at: string
          user_id: string
          user_type: string | null
          warehouse_storage: boolean | null
        }
        Insert: {
          account_type?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          finance_type?: string[] | null
          financing_for?: string[] | null
          full_name?: string | null
          government_scheme_support?: boolean | null
          id?: string
          location?: string | null
          logistics_region?: string | null
          logistics_type?: string | null
          mobile_number?: string | null
          mou_agreed?: boolean | null
          mou_agreed_at?: string | null
          phone?: string | null
          primary_user_type?:
            | Database["public"]["Enums"]["user_type_enum"]
            | null
          seller_roles?: string[] | null
          service_categories?: string[] | null
          target_audience?: string[] | null
          transport_modes?: string[] | null
          updated_at?: string
          user_id: string
          user_type?: string | null
          warehouse_storage?: boolean | null
        }
        Update: {
          account_type?: string | null
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          finance_type?: string[] | null
          financing_for?: string[] | null
          full_name?: string | null
          government_scheme_support?: boolean | null
          id?: string
          location?: string | null
          logistics_region?: string | null
          logistics_type?: string | null
          mobile_number?: string | null
          mou_agreed?: boolean | null
          mou_agreed_at?: string | null
          phone?: string | null
          primary_user_type?:
            | Database["public"]["Enums"]["user_type_enum"]
            | null
          seller_roles?: string[] | null
          service_categories?: string[] | null
          target_audience?: string[] | null
          transport_modes?: string[] | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
          warehouse_storage?: boolean | null
        }
        Relationships: []
      }
      robots: {
        Row: {
          availability: string | null
          category_tags: string[] | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          images: string[] | null
          location: string | null
          model: string | null
          name: string
          price: number | null
          quantity: number
          robot_type: string
          seller_id: string
          technical_specifications: Json | null
          updated_at: string
        }
        Insert: {
          availability?: string | null
          category_tags?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          model?: string | null
          name: string
          price?: number | null
          quantity?: number
          robot_type: string
          seller_id: string
          technical_specifications?: Json | null
          updated_at?: string
        }
        Update: {
          availability?: string | null
          category_tags?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          model?: string | null
          name?: string
          price?: number | null
          quantity?: number
          robot_type?: string
          seller_id?: string
          technical_specifications?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "robots_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          price_range: string | null
          provider_id: string
          service_type: string
          specializations: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          price_range?: string | null
          provider_id: string
          service_type: string
          specializations?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          price_range?: string | null
          provider_id?: string
          service_type?: string
          specializations?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      spare_parts: {
        Row: {
          category_tags: string[] | null
          compatible_robots: string[] | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          images: string[] | null
          location: string | null
          name: string
          part_number: string | null
          price: number | null
          quantity: number
          seller_id: string
          specifications: Json | null
          updated_at: string
        }
        Insert: {
          category_tags?: string[] | null
          compatible_robots?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          name: string
          part_number?: string | null
          price?: number | null
          quantity?: number
          seller_id: string
          specifications?: Json | null
          updated_at?: string
        }
        Update: {
          category_tags?: string[] | null
          compatible_robots?: string[] | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          location?: string | null
          name?: string
          part_number?: string | null
          price?: number | null
          quantity?: number
          seller_id?: string
          specifications?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spare_parts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      seller_role_enum: "robot_seller" | "parts_seller" | "service_provider"
      user_type_enum:
        | "buyer"
        | "robot_seller"
        | "parts_seller"
        | "service_provider"
        | "logistics_provider"
        | "finance_provider"
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
    Enums: {
      seller_role_enum: ["robot_seller", "parts_seller", "service_provider"],
      user_type_enum: [
        "buyer",
        "robot_seller",
        "parts_seller",
        "service_provider",
        "logistics_provider",
        "finance_provider",
      ],
    },
  },
} as const

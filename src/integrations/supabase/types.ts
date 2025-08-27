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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      button_interactions: {
        Row: {
          additional_data: Json | null
          button_name: string
          button_type: string
          created_at: string
          id: string
          item_id: string | null
          item_type: string | null
          page_url: string | null
          seller_id: string | null
          seller_name: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          additional_data?: Json | null
          button_name: string
          button_type: string
          created_at?: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          page_url?: string | null
          seller_id?: string | null
          seller_name?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          additional_data?: Json | null
          button_name?: string
          button_type?: string
          created_at?: string
          id?: string
          item_id?: string | null
          item_type?: string | null
          page_url?: string | null
          seller_id?: string | null
          seller_name?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      coverage_areas: {
        Row: {
          area_name: string
          area_type: string
          base_rate: number
          country_name: string | null
          created_at: string
          delivery_time: string
          id: string
          is_active: boolean | null
          per_kg_rate: number
          provider_id: string
          state_name: string | null
          updated_at: string
          zone_type: string
        }
        Insert: {
          area_name: string
          area_type?: string
          base_rate?: number
          country_name?: string | null
          created_at?: string
          delivery_time?: string
          id?: string
          is_active?: boolean | null
          per_kg_rate?: number
          provider_id: string
          state_name?: string | null
          updated_at?: string
          zone_type?: string
        }
        Update: {
          area_name?: string
          area_type?: string
          base_rate?: number
          country_name?: string | null
          created_at?: string
          delivery_time?: string
          id?: string
          is_active?: boolean | null
          per_kg_rate?: number
          provider_id?: string
          state_name?: string | null
          updated_at?: string
          zone_type?: string
        }
        Relationships: []
      }
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
      loan_applications: {
        Row: {
          amount_requested: number
          applicant_email: string | null
          applicant_id: string | null
          applicant_name: string
          applicant_phone: string | null
          application_id: string
          applied_date: string | null
          business_type: string | null
          business_vintage_months: number | null
          collateral_offered: string | null
          created_at: string
          credit_score: number | null
          documents_submitted: string[] | null
          id: string
          loan_type: string
          monthly_income: number | null
          notes: string | null
          provider_id: string | null
          purpose: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount_requested: number
          applicant_email?: string | null
          applicant_id?: string | null
          applicant_name: string
          applicant_phone?: string | null
          application_id?: string
          applied_date?: string | null
          business_type?: string | null
          business_vintage_months?: number | null
          collateral_offered?: string | null
          created_at?: string
          credit_score?: number | null
          documents_submitted?: string[] | null
          id?: string
          loan_type: string
          monthly_income?: number | null
          notes?: string | null
          provider_id?: string | null
          purpose?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount_requested?: number
          applicant_email?: string | null
          applicant_id?: string | null
          applicant_name?: string
          applicant_phone?: string | null
          application_id?: string
          applied_date?: string | null
          business_type?: string | null
          business_vintage_months?: number | null
          collateral_offered?: string | null
          created_at?: string
          credit_score?: number | null
          documents_submitted?: string[] | null
          id?: string
          loan_type?: string
          monthly_income?: number | null
          notes?: string | null
          provider_id?: string | null
          purpose?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loan_products: {
        Row: {
          collateral_required: boolean | null
          created_at: string
          description: string | null
          digital_process: boolean | null
          eligibility_criteria: string | null
          id: string
          is_active: boolean | null
          loan_type: string[]
          max_amount: number
          max_interest_rate: number | null
          max_tenure_months: number | null
          min_amount: number | null
          min_interest_rate: number | null
          min_tenure_months: number | null
          prepayment_allowed: boolean | null
          processing_fee_percentage: number | null
          product_name: string
          provider_id: string
          quick_approval: boolean | null
          required_documents: string[] | null
          updated_at: string
        }
        Insert: {
          collateral_required?: boolean | null
          created_at?: string
          description?: string | null
          digital_process?: boolean | null
          eligibility_criteria?: string | null
          id?: string
          is_active?: boolean | null
          loan_type: string[]
          max_amount: number
          max_interest_rate?: number | null
          max_tenure_months?: number | null
          min_amount?: number | null
          min_interest_rate?: number | null
          min_tenure_months?: number | null
          prepayment_allowed?: boolean | null
          processing_fee_percentage?: number | null
          product_name: string
          provider_id: string
          quick_approval?: boolean | null
          required_documents?: string[] | null
          updated_at?: string
        }
        Update: {
          collateral_required?: boolean | null
          created_at?: string
          description?: string | null
          digital_process?: boolean | null
          eligibility_criteria?: string | null
          id?: string
          is_active?: boolean | null
          loan_type?: string[]
          max_amount?: number
          max_interest_rate?: number | null
          max_tenure_months?: number | null
          min_amount?: number | null
          min_interest_rate?: number | null
          min_tenure_months?: number | null
          prepayment_allowed?: boolean | null
          processing_fee_percentage?: number | null
          product_name?: string
          provider_id?: string
          quick_approval?: boolean | null
          required_documents?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loan_products_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      loan_schemes: {
        Row: {
          created_at: string
          description: string | null
          eligibility_criteria: string | null
          features: string[] | null
          id: string
          interest_rate_max: number
          interest_rate_min: number
          is_active: boolean | null
          is_government_scheme: boolean | null
          max_amount: number
          max_tenure_months: number
          min_tenure_months: number | null
          processing_fee_percentage: number | null
          provider_id: string
          scheme_name: string
          scheme_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          eligibility_criteria?: string | null
          features?: string[] | null
          id?: string
          interest_rate_max: number
          interest_rate_min: number
          is_active?: boolean | null
          is_government_scheme?: boolean | null
          max_amount: number
          max_tenure_months: number
          min_tenure_months?: number | null
          processing_fee_percentage?: number | null
          provider_id: string
          scheme_name: string
          scheme_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          eligibility_criteria?: string | null
          features?: string[] | null
          id?: string
          interest_rate_max?: number
          interest_rate_min?: number
          is_active?: boolean | null
          is_government_scheme?: boolean | null
          max_amount?: number
          max_tenure_months?: number
          min_tenure_months?: number | null
          processing_fee_percentage?: number | null
          provider_id?: string
          scheme_name?: string
          scheme_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      logistics_coverage: {
        Row: {
          area_name: string
          base_rate: number
          created_at: string | null
          delivery_time: string
          id: string
          is_active: boolean | null
          per_kg_rate: number
          provider_id: string | null
          updated_at: string | null
          zone_type: string
        }
        Insert: {
          area_name: string
          base_rate: number
          created_at?: string | null
          delivery_time: string
          id?: string
          is_active?: boolean | null
          per_kg_rate: number
          provider_id?: string | null
          updated_at?: string | null
          zone_type: string
        }
        Update: {
          area_name?: string
          base_rate?: number
          created_at?: string | null
          delivery_time?: string
          id?: string
          is_active?: boolean | null
          per_kg_rate?: number
          provider_id?: string | null
          updated_at?: string | null
          zone_type?: string
        }
        Relationships: []
      }
      logistics_fleet: {
        Row: {
          capacity_volume: number | null
          capacity_weight: number
          created_at: string | null
          current_location: string | null
          driver_license: string | null
          driver_name: string
          driver_phone: string | null
          fuel_type: string | null
          id: string
          insurance_expiry: string | null
          last_maintenance: string | null
          license_plate: string
          provider_id: string | null
          status: string | null
          updated_at: string | null
          vehicle_type: string
        }
        Insert: {
          capacity_volume?: number | null
          capacity_weight: number
          created_at?: string | null
          current_location?: string | null
          driver_license?: string | null
          driver_name: string
          driver_phone?: string | null
          fuel_type?: string | null
          id?: string
          insurance_expiry?: string | null
          last_maintenance?: string | null
          license_plate: string
          provider_id?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_type: string
        }
        Update: {
          capacity_volume?: number | null
          capacity_weight?: number
          created_at?: string | null
          current_location?: string | null
          driver_license?: string | null
          driver_name?: string
          driver_phone?: string | null
          fuel_type?: string | null
          id?: string
          insurance_expiry?: string | null
          last_maintenance?: string | null
          license_plate?: string
          provider_id?: string | null
          status?: string | null
          updated_at?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      logistics_services: {
        Row: {
          base_price: number | null
          container_20ft_max: number | null
          container_20ft_min: number | null
          container_40ft_max: number | null
          container_40ft_min: number | null
          coverage_areas: string[] | null
          created_at: string
          delivery_time_hours: number | null
          description: string | null
          emergency_delivery: boolean | null
          id: string
          insurance_included: boolean | null
          international_coverage: string[] | null
          is_active: boolean | null
          is_international: boolean | null
          max_volume_m3: number | null
          max_weight_kg: number | null
          price_per_kg: number | null
          price_per_km: number | null
          provider_id: string
          service_name: string
          service_type: string
          special_handling: boolean | null
          tracking_available: boolean | null
          transport_modes: string[] | null
          updated_at: string
        }
        Insert: {
          base_price?: number | null
          container_20ft_max?: number | null
          container_20ft_min?: number | null
          container_40ft_max?: number | null
          container_40ft_min?: number | null
          coverage_areas?: string[] | null
          created_at?: string
          delivery_time_hours?: number | null
          description?: string | null
          emergency_delivery?: boolean | null
          id?: string
          insurance_included?: boolean | null
          international_coverage?: string[] | null
          is_active?: boolean | null
          is_international?: boolean | null
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          price_per_kg?: number | null
          price_per_km?: number | null
          provider_id: string
          service_name: string
          service_type: string
          special_handling?: boolean | null
          tracking_available?: boolean | null
          transport_modes?: string[] | null
          updated_at?: string
        }
        Update: {
          base_price?: number | null
          container_20ft_max?: number | null
          container_20ft_min?: number | null
          container_40ft_max?: number | null
          container_40ft_min?: number | null
          coverage_areas?: string[] | null
          created_at?: string
          delivery_time_hours?: number | null
          description?: string | null
          emergency_delivery?: boolean | null
          id?: string
          insurance_included?: boolean | null
          international_coverage?: string[] | null
          is_active?: boolean | null
          is_international?: boolean | null
          max_volume_m3?: number | null
          max_weight_kg?: number | null
          price_per_kg?: number | null
          price_per_km?: number | null
          provider_id?: string
          service_name?: string
          service_type?: string
          special_handling?: boolean | null
          tracking_available?: boolean | null
          transport_modes?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      logistics_shipments: {
        Row: {
          actual_delivery: string | null
          cargo_type: string
          client_email: string | null
          client_name: string
          cost: number
          created_at: string | null
          currency: string | null
          delivery_location: string
          estimated_delivery: string
          id: string
          pickup_location: string
          provider_id: string
          shipment_id: string
          status: string | null
          tracking_number: string
          updated_at: string | null
          weight: number
        }
        Insert: {
          actual_delivery?: string | null
          cargo_type: string
          client_email?: string | null
          client_name: string
          cost: number
          created_at?: string | null
          currency?: string | null
          delivery_location: string
          estimated_delivery: string
          id?: string
          pickup_location: string
          provider_id: string
          shipment_id?: string
          status?: string | null
          tracking_number?: string
          updated_at?: string | null
          weight: number
        }
        Update: {
          actual_delivery?: string | null
          cargo_type?: string
          client_email?: string | null
          client_name?: string
          cost?: number
          created_at?: string | null
          currency?: string | null
          delivery_location?: string
          estimated_delivery?: string
          id?: string
          pickup_location?: string
          provider_id?: string
          shipment_id?: string
          status?: string | null
          tracking_number?: string
          updated_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "logistics_shipments_provider_id_fkey"
            columns: ["provider_id"]
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
          company_logo_url: string | null
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
          primary_role: string | null
          primary_user_type:
            | Database["public"]["Enums"]["user_type_enum"]
            | null
          registration_complete: boolean | null
          seller_roles: string[] | null
          service_categories: string[] | null
          target_audience: string[] | null
          transport_modes: string[] | null
          updated_at: string
          user_id: string
          user_roles: string[] | null
          user_type: string | null
          warehouse_storage: boolean | null
        }
        Insert: {
          account_type?: string | null
          avatar_url?: string | null
          company_logo_url?: string | null
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
          primary_role?: string | null
          primary_user_type?:
            | Database["public"]["Enums"]["user_type_enum"]
            | null
          registration_complete?: boolean | null
          seller_roles?: string[] | null
          service_categories?: string[] | null
          target_audience?: string[] | null
          transport_modes?: string[] | null
          updated_at?: string
          user_id: string
          user_roles?: string[] | null
          user_type?: string | null
          warehouse_storage?: boolean | null
        }
        Update: {
          account_type?: string | null
          avatar_url?: string | null
          company_logo_url?: string | null
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
          primary_role?: string | null
          primary_user_type?:
            | Database["public"]["Enums"]["user_type_enum"]
            | null
          registration_complete?: boolean | null
          seller_roles?: string[] | null
          service_categories?: string[] | null
          target_audience?: string[] | null
          transport_modes?: string[] | null
          updated_at?: string
          user_id?: string
          user_roles?: string[] | null
          user_type?: string | null
          warehouse_storage?: boolean | null
        }
        Relationships: []
      }
      robot_ai_analysis: {
        Row: {
          analysis_data: Json
          created_at: string
          id: string
          recommendations: Json
          robot_id: string
          updated_at: string
        }
        Insert: {
          analysis_data: Json
          created_at?: string
          id?: string
          recommendations?: Json
          robot_id: string
          updated_at?: string
        }
        Update: {
          analysis_data?: Json
          created_at?: string
          id?: string
          recommendations?: Json
          robot_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      robot_custom_fields: {
        Row: {
          created_at: string
          field_name: string
          field_value: string
          id: string
          robot_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_name: string
          field_value: string
          id?: string
          robot_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_name?: string
          field_value?: string
          id?: string
          robot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "robot_custom_fields_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: false
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
        ]
      }
      robot_reports: {
        Row: {
          created_at: string
          id: string
          report_content: string
          robot_data: Json | null
          robot_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_content: string
          robot_data?: Json | null
          robot_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report_content?: string
          robot_data?: Json | null
          robot_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      robot_view_counts: {
        Row: {
          created_at: string
          id: string
          robot_id: string
          total_views: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          robot_id: string
          total_views?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          robot_id?: string
          total_views?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "robot_view_counts_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: true
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
        ]
      }
      robots: {
        Row: {
          applications: string[] | null
          availability: string | null
          brand: string | null
          brochure_url: string | null
          category_tags: string[] | null
          certification_standards: string[] | null
          condition: string | null
          controller_type: string | null
          created_at: string
          currency: string | null
          description: string | null
          financing_available: boolean
          id: string
          images: string[] | null
          included_accessories: string[] | null
          installation_service: boolean
          location: string | null
          maintenance_contract: boolean
          model: string | null
          name: string
          operating_environment: string | null
          payload_capacity: number | null
          pincode: string | null
          power_consumption: number | null
          price: number | null
          quantity: number
          reach: number | null
          repeatability: number | null
          robot_type: string
          seller_id: string
          state: string | null
          technical_specifications: Json | null
          training_included: boolean
          updated_at: string | null
          video_type: string | null
          video_url: string | null
          warranty_info: string | null
          year_manufactured: number | null
        }
        Insert: {
          applications?: string[] | null
          availability?: string | null
          brand?: string | null
          brochure_url?: string | null
          category_tags?: string[] | null
          certification_standards?: string[] | null
          condition?: string | null
          controller_type?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          financing_available?: boolean
          id?: string
          images?: string[] | null
          included_accessories?: string[] | null
          installation_service?: boolean
          location?: string | null
          maintenance_contract?: boolean
          model?: string | null
          name: string
          operating_environment?: string | null
          payload_capacity?: number | null
          pincode?: string | null
          power_consumption?: number | null
          price?: number | null
          quantity?: number
          reach?: number | null
          repeatability?: number | null
          robot_type: string
          seller_id: string
          state?: string | null
          technical_specifications?: Json | null
          training_included?: boolean
          updated_at?: string | null
          video_type?: string | null
          video_url?: string | null
          warranty_info?: string | null
          year_manufactured?: number | null
        }
        Update: {
          applications?: string[] | null
          availability?: string | null
          brand?: string | null
          brochure_url?: string | null
          category_tags?: string[] | null
          certification_standards?: string[] | null
          condition?: string | null
          controller_type?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          financing_available?: boolean
          id?: string
          images?: string[] | null
          included_accessories?: string[] | null
          installation_service?: boolean
          location?: string | null
          maintenance_contract?: boolean
          model?: string | null
          name?: string
          operating_environment?: string | null
          payload_capacity?: number | null
          pincode?: string | null
          power_consumption?: number | null
          price?: number | null
          quantity?: number
          reach?: number | null
          repeatability?: number | null
          robot_type?: string
          seller_id?: string
          state?: string | null
          technical_specifications?: Json | null
          training_included?: boolean
          updated_at?: string | null
          video_type?: string | null
          video_url?: string | null
          warranty_info?: string | null
          year_manufactured?: number | null
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
      service_appointments: {
        Row: {
          appointment_date: string
          client_id: string | null
          created_at: string | null
          duration_hours: number | null
          id: string
          location: string | null
          notes: string | null
          provider_id: string | null
          service_request_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          client_id?: string | null
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          provider_id?: string | null
          service_request_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          client_id?: string | null
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          provider_id?: string | null
          service_request_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_appointments_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          budget_range: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          completion_date: string | null
          created_at: string | null
          description: string
          id: string
          location: string
          provider_id: string | null
          request_id: string
          scheduled_date: string | null
          service_id: string | null
          service_type: string
          special_requirements: string | null
          status: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          budget_range?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          completion_date?: string | null
          created_at?: string | null
          description: string
          id?: string
          location: string
          provider_id?: string | null
          request_id?: string
          scheduled_date?: string | null
          service_id?: string | null
          service_type: string
          special_requirements?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          budget_range?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string
          id?: string
          location?: string
          provider_id?: string | null
          request_id?: string
          scheduled_date?: string | null
          service_id?: string | null
          service_type?: string
          special_requirements?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reviews: {
        Row: {
          client_id: string | null
          communication_rating: number | null
          created_at: string | null
          id: string
          provider_id: string | null
          quality_rating: number | null
          rating: number | null
          response_time_rating: number | null
          review_text: string | null
          service_request_id: string | null
        }
        Insert: {
          client_id?: string | null
          communication_rating?: number | null
          created_at?: string | null
          id?: string
          provider_id?: string | null
          quality_rating?: number | null
          rating?: number | null
          response_time_rating?: number | null
          review_text?: string | null
          service_request_id?: string | null
        }
        Update: {
          client_id?: string | null
          communication_rating?: number | null
          created_at?: string | null
          id?: string
          provider_id?: string | null
          quality_rating?: number | null
          rating?: number | null
          response_time_rating?: number | null
          review_text?: string | null
          service_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "service_reviews_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          coverage: string | null
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
          coverage?: string | null
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
          coverage?: string | null
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
          brand: string | null
          category_tags: string[] | null
          compatible_robots: string[] | null
          condition: string | null
          created_at: string
          currency: string | null
          description: string | null
          duty_amount: number | null
          id: string
          images: string[] | null
          is_international: boolean | null
          location: string | null
          model: string | null
          name: string
          part_number: string | null
          pincode: string | null
          price: number | null
          quantity: number
          seller_id: string
          shipping_amount: number | null
          specifications: Json | null
          state: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category_tags?: string[] | null
          compatible_robots?: string[] | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          duty_amount?: number | null
          id?: string
          images?: string[] | null
          is_international?: boolean | null
          location?: string | null
          model?: string | null
          name: string
          part_number?: string | null
          pincode?: string | null
          price?: number | null
          quantity?: number
          seller_id: string
          shipping_amount?: number | null
          specifications?: Json | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category_tags?: string[] | null
          compatible_robots?: string[] | null
          condition?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          duty_amount?: number | null
          id?: string
          images?: string[] | null
          is_international?: boolean | null
          location?: string | null
          model?: string | null
          name?: string
          part_number?: string | null
          pincode?: string | null
          price?: number | null
          quantity?: number
          seller_id?: string
          shipping_amount?: number | null
          specifications?: Json | null
          state?: string | null
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
      states: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_user_profile: {
        Args: {
          p_account_type?: string
          p_company_name?: string
          p_email: string
          p_finance_type?: string[]
          p_financing_for?: string[]
          p_full_name?: string
          p_government_scheme_support?: boolean
          p_location?: string
          p_logistics_region?: string
          p_logistics_type?: string
          p_mobile_number?: string
          p_seller_roles?: string[]
          p_target_audience?: string[]
          p_transport_modes?: string[]
          p_user_id: string
          p_user_type?: string
          p_warehouse_storage?: boolean
        }
        Returns: string
      }
      create_complete_user_profile: {
        Args: {
          p_account_type?: string
          p_company_name?: string
          p_email: string
          p_finance_type?: string[]
          p_financing_for?: string[]
          p_full_name?: string
          p_government_scheme_support?: boolean
          p_location?: string
          p_logistics_region?: string
          p_logistics_type?: string
          p_mobile_number?: string
          p_seller_roles?: string[]
          p_target_audience?: string[]
          p_transport_modes?: string[]
          p_user_id: string
          p_user_type?: string
          p_warehouse_storage?: boolean
        }
        Returns: string
      }
      create_user_profile: {
        Args: {
          p_account_type?: string
          p_company_name?: string
          p_email: string
          p_full_name?: string
          p_location?: string
          p_mobile_number?: string
          p_user_id: string
          p_user_type?: string
        }
        Returns: string
      }
      generate_random_string: {
        Args: { length: number }
        Returns: string
      }
      get_logistics_data: {
        Args: { provider_id: string; table_name: string }
        Returns: Json
      }
      get_provider_business_info: {
        Args: { provider_user_id: string }
        Returns: {
          account_type: string
          company_name: string
          full_name: string
          location: string
          registration_complete: boolean
          service_categories: string[]
          user_id: string
          user_roles: string[]
          user_type: string
        }[]
      }
      get_provider_public_info: {
        Args: { provider_user_id: string }
        Returns: {
          account_type: string
          company_name: string
          full_name: string
          location: string
          registration_complete: boolean
          service_categories: string[]
          user_id: string
          user_roles: string[]
          user_type: string
        }[]
      }
      get_public_provider_profile: {
        Args: { provider_user_id: string }
        Returns: {
          account_type: string
          company_name: string
          full_name: string
          location: string
          registration_complete: boolean
          service_categories: string[]
          user_id: string
          user_roles: string[]
          user_type: string
        }[]
      }
      get_robot_view_count: {
        Args: { p_robot_id: string }
        Returns: number
      }
      increment_robot_view_count: {
        Args: { p_robot_id: string }
        Returns: number
      }
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

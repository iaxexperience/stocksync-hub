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
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          location: string | null
          model: string | null
          name: string
          notes: string | null
          organization_id: string
          power: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          sale_price: number
          serial_number: string | null
          sku: string | null
          status: Database["public"]["Enums"]["product_status"]
          stock_current: number
          stock_max: number
          stock_min: number
          supplier_id: string | null
          unit_id: string | null
          updated_at: string
          voltage: string | null
          warranty_months: number | null
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          model?: string | null
          name: string
          notes?: string | null
          organization_id: string
          power?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          sale_price?: number
          serial_number?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_current?: number
          stock_max?: number
          stock_min?: number
          supplier_id?: string | null
          unit_id?: string | null
          updated_at?: string
          voltage?: string | null
          warranty_months?: number | null
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          power?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          sale_price?: number
          serial_number?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_current?: number
          stock_max?: number
          stock_min?: number
          supplier_id?: string | null
          unit_id?: string | null
          updated_at?: string
          voltage?: string | null
          warranty_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_org_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active_org_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active_org_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_org_id_fkey"
            columns: ["active_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          organization_id: string
          product_id: string
          quantity: number
          reason: string | null
          reference: string | null
          unit_cost: number
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          organization_id: string
          product_id: string
          quantity: number
          reason?: string | null
          reference?: string | null
          unit_cost?: number
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          organization_id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference?: string | null
          unit_cost?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          legal_name: string
          notes: string | null
          organization_id: string
          phone: string | null
          state: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          state?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          abbreviation: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          abbreviation: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          abbreviation?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_main: boolean
          location: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_main?: boolean
          location?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_main?: boolean
          location?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          id: string
          organization_id: string
          customer_type: string
          name: string
          trade_name: string | null
          cpf_cnpj: string
          rg_state_registration: string | null
          birth_or_opening_date: string | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          photo_url: string | null
          status: string
          notes: string | null
          is_deleted: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          customer_type: string
          name: string
          trade_name?: string | null
          cpf_cnpj: string
          rg_state_registration?: string | null
          birth_or_opening_date?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          photo_url?: string | null
          status?: string
          notes?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          customer_type?: string
          name?: string
          trade_name?: string | null
          cpf_cnpj?: string
          rg_state_registration?: string | null
          birth_or_opening_date?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          photo_url?: string | null
          status?: string
          notes?: string | null
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      customer_addresses: {
        Row: {
          id: string
          customer_id: string
          zip_code: string | null
          street: string | null
          number: string | null
          complement: string | null
          neighborhood: string | null
          city: string | null
          state: string | null
          reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          zip_code?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          zip_code?: string | null
          street?: string | null
          number?: string | null
          complement?: string | null
          neighborhood?: string | null
          city?: string | null
          state?: string | null
          reference?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          organization_id: string
          customer_id: string
          seller_id: string | null
          order_number: string
          order_type: string
          subtotal: number
          discount: number
          shipping_fee: number
          installation_fee: number
          total_amount: number
          payment_method: string
          installments: number
          status: string
          payment_status: string
          delivery_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          customer_id: string
          seller_id?: string | null
          order_number: string
          order_type: string
          subtotal?: number
          discount?: number
          shipping_fee?: number
          installation_fee?: number
          total_amount?: number
          payment_method: string
          installments?: number
          status?: string
          payment_status?: string
          delivery_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          customer_id?: string
          seller_id?: string | null
          order_number?: string
          order_type?: string
          subtotal?: number
          discount?: number
          shipping_fee?: number
          installation_fee?: number
          total_amount?: number
          payment_method?: string
          installments?: number
          status?: string
          payment_status?: string
          delivery_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          discount: number
          additional_fee: number
          total_amount: number
          warranty_days: number | null
          serial_number: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price?: number
          discount?: number
          additional_fee?: number
          total_amount?: number
          warranty_days?: number | null
          serial_number?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          discount?: number
          additional_fee?: number
          total_amount?: number
          warranty_days?: number | null
          serial_number?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      installments: {
        Row: {
          id: string
          order_id: string
          installment_number: number
          due_date: string
          amount: number
          payment_date: string | null
          payment_method: string | null
          status: string
          receipt_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          installment_number: number
          due_date: string
          amount: number
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          receipt_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          installment_number?: number
          due_date?: string
          amount?: number
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          receipt_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      customer_signatures: {
        Row: {
          id: string
          customer_id: string
          order_id: string | null
          signature_url: string
          signed_at: string
          signed_by: string | null
          device_information: string | null
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          contract_url: string | null
          contract_version: string
        }
        Insert: {
          id?: string
          customer_id: string
          order_id?: string | null
          signature_url: string
          signed_at?: string
          signed_by?: string | null
          device_information?: string | null
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          contract_url?: string | null
          contract_version?: string
        }
        Update: {
          id?: string
          customer_id?: string
          order_id?: string | null
          signature_url?: string
          signed_at?: string
          signed_by?: string | null
          device_information?: string | null
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          contract_url?: string | null
          contract_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_signatures_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_signatures_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          organization_id: string
          table_name: string
          record_id: string
          action: string
          old_data: Json | null
          new_data: Json | null
          performed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          table_name: string
          record_id: string
          action: string
          old_data?: Json | null
          new_data?: Json | null
          performed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_data?: Json | null
          new_data?: Json | null
          performed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_org_role: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      user_org_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      app_role:
        | "admin"
        | "gerente"
        | "estoquista"
        | "comprador"
        | "financeiro"
        | "vendedor"
        | "visualizador"
      movement_type: "entrada" | "saida" | "transferencia" | "ajuste"
      product_status:
        | "ativo"
        | "inativo"
        | "manutencao"
        | "defeito"
        | "descartado"
      product_type:
        | "material_consumo"
        | "material_permanente"
        | "eletrodomestico"
        | "equipamento"
        | "peca"
        | "acessorio"
        | "produto_venda"
        | "produto_uso_interno"
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
      app_role: [
        "admin",
        "gerente",
        "estoquista",
        "comprador",
        "financeiro",
        "vendedor",
        "visualizador",
      ],
      movement_type: ["entrada", "saida", "transferencia", "ajuste"],
      product_status: [
        "ativo",
        "inativo",
        "manutencao",
        "defeito",
        "descartado",
      ],
      product_type: [
        "material_consumo",
        "material_permanente",
        "eletrodomestico",
        "equipamento",
        "peca",
        "acessorio",
        "produto_venda",
        "produto_uso_interno",
      ],
    },
  },
} as const

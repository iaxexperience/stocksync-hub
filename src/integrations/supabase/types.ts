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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      customer_addresses: {
        Row: {
          city: string | null
          complement: string | null
          created_at: string
          customer_id: string
          id: string
          is_primary: boolean
          neighborhood: string | null
          number: string | null
          reference: string | null
          state: string | null
          street: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_primary?: boolean
          neighborhood?: string | null
          number?: string | null
          reference?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_primary?: boolean
          neighborhood?: string | null
          number?: string | null
          reference?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_signatures: {
        Row: {
          contract_url: string | null
          contract_version: string | null
          created_at: string
          customer_id: string
          device_information: string | null
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          order_id: string
          signature_url: string | null
          signed_at: string
          signed_by: string | null
        }
        Insert: {
          contract_url?: string | null
          contract_version?: string | null
          created_at?: string
          customer_id: string
          device_information?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          order_id: string
          signature_url?: string | null
          signed_at?: string
          signed_by?: string | null
        }
        Update: {
          contract_url?: string | null
          contract_version?: string | null
          created_at?: string
          customer_id?: string
          device_information?: string | null
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          order_id?: string
          signature_url?: string | null
          signed_at?: string
          signed_by?: string | null
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
          },
        ]
      }
      customers: {
        Row: {
          birth_or_opening_date: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          customer_type: string
          deleted_at: string | null
          email: string | null
          id: string
          is_deleted: boolean
          marital_status: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          photo_url: string | null
          profession: string | null
          rg_state_registration: string | null
          status: string
          trade_name: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          birth_or_opening_date?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_deleted?: boolean
          marital_status?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          rg_state_registration?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          birth_or_opening_date?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_deleted?: boolean
          marital_status?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          rg_state_registration?: string | null
          status?: string
          trade_name?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          order_id: string
          payment_date: string | null
          payment_method: string | null
          receipt_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          order_id: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          order_id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          additional_fee: number
          created_at: string
          discount: number
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          serial_number: string | null
          status: string
          total_amount: number
          unit_price: number
          warranty_days: number | null
        }
        Insert: {
          additional_fee?: number
          created_at?: string
          discount?: number
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          serial_number?: string | null
          status?: string
          total_amount?: number
          unit_price?: number
          warranty_days?: number | null
        }
        Update: {
          additional_fee?: number
          created_at?: string
          discount?: number
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          serial_number?: string | null
          status?: string
          total_amount?: number
          unit_price?: number
          warranty_days?: number | null
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
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          delivery_date: string | null
          discount: number
          first_due_date: string | null
          id: string
          installation_fee: number
          installments: number
          notes: string | null
          order_number: string
          order_type: string
          organization_id: string
          payment_method: string | null
          payment_status: string
          seller_id: string | null
          shipping_fee: number
          status: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_date?: string | null
          discount?: number
          first_due_date?: string | null
          id?: string
          installation_fee?: number
          installments?: number
          notes?: string | null
          order_number: string
          order_type?: string
          organization_id: string
          payment_method?: string | null
          payment_status?: string
          seller_id?: string | null
          shipping_fee?: number
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_date?: string | null
          discount?: number
          first_due_date?: string | null
          id?: string
          installation_fee?: number
          installments?: number
          notes?: string | null
          order_number?: string
          order_type?: string
          organization_id?: string
          payment_method?: string | null
          payment_status?: string
          seller_id?: string | null
          shipping_fee?: number
          status?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          address: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
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

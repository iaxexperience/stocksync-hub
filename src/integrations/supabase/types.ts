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
          id: string
          organization_id: string
          table_name: string | null
          record_id: string | null
          action: string
          old_data: Json | null
          new_data: Json | null
          performed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          table_name?: string | null
          record_id?: string | null
          action: string
          old_data?: Json | null
          new_data?: Json | null
          performed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          table_name?: string | null
          record_id?: string | null
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
      cash_register_sessions: {
        Row: {
          additions: number
          closed_at: string | null
          closed_by: string | null
          closing_balance: number | null
          created_at: string
          expected_balance: number | null
          id: string
          notes: string | null
          opened_at: string
          opened_by: string
          opening_balance: number
          organization_id: string
          status: string
          updated_at: string
          withdrawals: number
        }
        Insert: {
          additions?: number
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          created_at?: string
          expected_balance?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_balance?: number
          organization_id: string
          status?: string
          updated_at?: string
          withdrawals?: number
        }
        Update: {
          additions?: number
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number | null
          created_at?: string
          expected_balance?: number | null
          id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_balance?: number
          organization_id?: string
          status?: string
          updated_at?: string
          withdrawals?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sessions_organization_id_fkey"
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
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          organization_id: string
          payment_method: string | null
          reference_id: string | null
          type: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          organization_id: string
          payment_method?: string | null
          reference_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          organization_id?: string
          payment_method?: string | null
          reference_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_organization_id_fkey"
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
          amount_paid: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          order_id: string
          payment_date: string | null
          payment_method: string | null
          receipt_url: string | null
          status: string
        }
        Insert: {
          amount?: number
          amount_paid?: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          order_id: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          order_id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          status?: string
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
      installment_payments: {
        Row: {
          id: string
          installment_id: string
          organization_id: string
          amount: number
          payment_method: string
          payment_date: string
          notes: string | null
          client_request_id: string
          status: string
          cancelled_at: string | null
          cancelled_by: string | null
          cancellation_reason: string | null
          financial_transaction_id: string | null
          reversal_transaction_id: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          installment_id: string
          organization_id: string
          amount: number
          payment_method: string
          payment_date?: string
          notes?: string | null
          client_request_id: string
          status?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          financial_transaction_id?: string | null
          reversal_transaction_id?: string | null
          created_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          installment_id?: string
          organization_id?: string
          amount?: number
          payment_method?: string
          payment_date?: string
          notes?: string | null
          client_request_id?: string
          status?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancellation_reason?: string | null
          financial_transaction_id?: string | null
          reversal_transaction_id?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_payments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_payments_financial_transaction_id_fkey"
            columns: ["financial_transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
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
      organization_settings: {
        Row: {
          company_logo_url: string | null
          created_at: string
          email_integration_enabled: boolean | null
          email_template: string | null
          id: string
          inactivity_action: string | null
          inactivity_timeout_minutes: number | null
          lgpd_consent_text: string | null
          lgpd_cookies_enabled: boolean | null
          lgpd_data_deletion_instructions: string | null
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          smtp_encryption: string | null
          smtp_host: string | null
          smtp_password: string | null
          smtp_port: number | null
          smtp_user: string | null
          updated_at: string
          whatsapp_api_token: string | null
          whatsapp_business_account_id: string | null
          whatsapp_integration_enabled: boolean | null
          whatsapp_integration_type: string | null
          whatsapp_phone_number: string | null
          whatsapp_phone_number_id: string | null
          whatsapp_template: string | null
          whatsapp_template_name: string | null
        }
        Insert: {
          company_logo_url?: string | null
          created_at?: string
          email_integration_enabled?: boolean | null
          email_template?: string | null
          id?: string
          inactivity_action?: string | null
          inactivity_timeout_minutes?: number | null
          lgpd_consent_text?: string | null
          lgpd_cookies_enabled?: boolean | null
          lgpd_data_deletion_instructions?: string | null
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          smtp_encryption?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
          whatsapp_api_token?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_integration_enabled?: boolean | null
          whatsapp_integration_type?: string | null
          whatsapp_phone_number?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_template?: string | null
          whatsapp_template_name?: string | null
        }
        Update: {
          company_logo_url?: string | null
          created_at?: string
          email_integration_enabled?: boolean | null
          email_template?: string | null
          id?: string
          inactivity_action?: string | null
          inactivity_timeout_minutes?: number | null
          lgpd_consent_text?: string | null
          lgpd_cookies_enabled?: boolean | null
          lgpd_data_deletion_instructions?: string | null
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          smtp_encryption?: string | null
          smtp_host?: string | null
          smtp_password?: string | null
          smtp_port?: number | null
          smtp_user?: string | null
          updated_at?: string
          whatsapp_api_token?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_integration_enabled?: boolean | null
          whatsapp_integration_type?: string | null
          whatsapp_phone_number?: string | null
          whatsapp_phone_number_id?: string | null
          whatsapp_template?: string | null
          whatsapp_template_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
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
      product_damages: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          organization_id: string
          product_id: string
          quantity: number
          reason: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          product_id: string
          quantity: number
          reason: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          product_id?: string
          quantity?: number
          reason?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_damages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_damages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      public_storefront_products: {
        Row: {
          id: string
          name: string
          image_url: string | null
          stock_current: number
          category_id: string | null
          category_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_new_organization: {
        Args: {
          org_document?: string
          org_email?: string
          org_name: string
          org_phone?: string
        }
        Returns: string
      }
      create_new_user_by_admin: {
        Args: {
          p_email: string
          p_full_name: string
          p_org_id: string
          p_password: string
          p_role: string
        }
        Returns: string
      }
      has_org_role: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      user_org_ids: { Args: never; Returns: string[] }
      fn_receive_installment_payment: {
        Args: {
          p_installment_id: string
          p_payment_method: string
          p_amount?: number | null
          p_notes?: string | null
          p_client_request_id?: string
        }
        Returns: Database["public"]["Tables"]["installment_payments"]["Row"]
      }
      fn_cancel_installment_payment: {
        Args: { p_payment_id: string; p_reason?: string | null }
        Returns: Database["public"]["Tables"]["installment_payments"]["Row"]
      }
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

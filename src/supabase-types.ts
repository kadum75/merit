export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          uid: string
          email: string
          display_name: string | null
          photo_url: string | null
          is_pro: boolean
          preview_count: number
          last_preview_reset: string
          stripe_customer_id: string | null
          subscription_id: string | null
          subscription_status: string
          plan_type: string | null
          created_at: string | null
          last_login_at: string | null
          gdpr_consent: boolean
          gdpr_consent_date: string | null
          marketing_consent: boolean | null
        }
        Insert: {
          id?: string
          uid: string
          email: string
          display_name?: string | null
          photo_url?: string | null
          is_pro?: boolean
          preview_count?: number
          last_preview_reset?: string
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string
          plan_type?: string | null
          created_at?: string | null
          last_login_at?: string | null
          gdpr_consent?: boolean
          gdpr_consent_date?: string | null
          marketing_consent?: boolean | null
        }
        Update: {
          id?: string
          uid?: string
          email?: string
          display_name?: string | null
          photo_url?: string | null
          is_pro?: boolean
          preview_count?: number
          last_preview_reset?: string
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string
          plan_type?: string | null
          created_at?: string | null
          last_login_at?: string | null
          gdpr_consent?: boolean
          gdpr_consent_date?: string | null
          marketing_consent?: boolean | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

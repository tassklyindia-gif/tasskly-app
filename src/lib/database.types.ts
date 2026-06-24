export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bids: {
        Row: {
          id: string
          job_id: string
          bidder_id: string
          amount: number
          message: string
          delivery_days: number
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          bidder_id: string
          amount: number
          message: string
          delivery_days: number
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          bidder_id?: string
          amount?: number
          message?: string
          delivery_days?: number
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string
          avatar_url: string | null
          role: 'poster' | 'worker' | 'admin'
          wallet_balance: number
          is_verified: boolean
          verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
          upi_id: string | null
          phone: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_ifsc_code: string | null
          bank_account_holder_name: string | null
          tasskly_id: string | null
          internship_password: string | null
          bank_verification_status: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email: string
          avatar_url?: string | null
          role?: 'poster' | 'worker' | 'admin'
          wallet_balance?: number
          is_verified?: boolean
          verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
          upi_id?: string | null
          phone?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          bank_account_holder_name?: string | null
          tasskly_id?: string | null
          internship_password?: string | null
          bank_verification_status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string
          avatar_url?: string | null
          role?: 'poster' | 'worker' | 'admin'
          wallet_balance?: number
          is_verified?: boolean
          verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
          upi_id?: string | null
          phone?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_ifsc_code?: string | null
          bank_account_holder_name?: string | null
          tasskly_id?: string | null
          internship_password?: string | null
          bank_verification_status?: string | null
          created_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          poster_id: string
          worker_id: string | null
          title: string
          description: string
          budget: number
          platform_fee: number
          worker_payout: number
          category: string
          status: 'open' | 'accepted' | 'submitted' | 'completed' | 'disputed'
          instructions: string | null
          instructions_locked: boolean
          deadline: string | null
          skills: string[]
          is_quick_task: boolean
          campus_only: boolean
          campus_name: string | null
          is_urgent: boolean
          urgent_time: string | null
          is_team_task: boolean
          team_roles: string[]
          is_mentoring: boolean
          payment_type: string
          created_at: string
        }
        Insert: {
          id?: string
          poster_id: string
          worker_id?: string | null
          title: string
          description: string
          budget: number
          platform_fee?: number
          worker_payout?: number
          category: string
          status?: 'open' | 'accepted' | 'submitted' | 'completed' | 'disputed'
          instructions?: string | null
          instructions_locked?: boolean
          deadline?: string | null
          skills?: string[]
          is_quick_task?: boolean
          campus_only?: boolean
          campus_name?: string | null
          is_urgent?: boolean
          urgent_time?: string | null
          is_team_task?: boolean
          team_roles?: string[]
          is_mentoring?: boolean
          payment_type?: string
          created_at?: string
        }
        Update: {
          id?: string
          poster_id?: string
          worker_id?: string | null
          title?: string
          description?: string
          budget?: number
          platform_fee?: number
          worker_payout?: number
          category?: string
          status?: 'open' | 'accepted' | 'submitted' | 'completed' | 'disputed'
          instructions?: string | null
          instructions_locked?: boolean
          deadline?: string | null
          skills?: string[]
          is_quick_task?: boolean
          campus_only?: boolean
          campus_name?: string | null
          is_urgent?: boolean
          urgent_time?: string | null
          is_team_task?: boolean
          team_roles?: string[]
          is_mentoring?: boolean
          payment_type?: string
          created_at?: string
        }
      }
      job_files: {
        Row: {
          id: string
          job_id: string
          uploader_id: string
          file_url: string
          file_name: string
          file_type: string
          is_submission: boolean
          is_watermarked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          uploader_id: string
          file_url: string
          file_name: string
          file_type: string
          is_submission?: boolean
          is_watermarked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          uploader_id?: string
          file_url?: string
          file_name?: string
          file_type?: string
          is_submission?: boolean
          is_watermarked?: boolean
          created_at?: string
        }
      }
      escrow_transactions: {
        Row: {
          id: string
          job_id: string
          poster_id: string
          worker_id: string | null
          total_amount: number
          platform_fee: number
          worker_amount: number
          status: 'held' | 'released' | 'refunded' | 'disputed'
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          created_at: string
          released_at: string | null
        }
        Insert: {
          id?: string
          job_id: string
          poster_id: string
          worker_id?: string | null
          total_amount: number
          platform_fee: number
          worker_amount: number
          status?: 'held' | 'released' | 'refunded' | 'disputed'
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          created_at?: string
          released_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          poster_id?: string
          worker_id?: string | null
          total_amount?: number
          platform_fee?: number
          worker_amount?: number
          status?: 'held' | 'released' | 'refunded' | 'disputed'
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          created_at?: string
          released_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          job_id: string
          sender_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          sender_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          sender_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
        }
      }
      admin_ledger: {
        Row: {
          id: string
          job_id: string | null
          type: 'fee_collected' | 'escrow_held' | 'escrow_released' | 'refund'
          amount: number
          from_user_id: string
          to_user_id: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id?: string | null
          type: 'fee_collected' | 'escrow_held' | 'escrow_released' | 'refund'
          amount: number
          from_user_id: string
          to_user_id?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string | null
          type?: 'fee_collected' | 'escrow_held' | 'escrow_released' | 'refund'
          amount?: number
          from_user_id?: string
          to_user_id?: string | null
          note?: string | null
          created_at?: string
        }
      }
      verification_requests: {
        Row: {
          id: string
          user_id: string
          id_type: 'student_id' | 'aadhaar' | 'pan'
          id_number: string
          front_image_url: string
          back_image_url: string | null
          selfie_url: string
          status: 'pending' | 'verified' | 'rejected'
          admin_note: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          id_type: 'student_id' | 'aadhaar' | 'pan'
          id_number: string
          front_image_url: string
          back_image_url?: string | null
          selfie_url: string
          status?: 'pending' | 'verified' | 'rejected'
          admin_note?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          id_type?: 'student_id' | 'aadhaar' | 'pan'
          id_number?: string
          front_image_url?: string
          back_image_url?: string | null
          selfie_url?: string
          status?: 'pending' | 'verified' | 'rejected'
          admin_note?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
      }
      withdrawals: {
        Row: {
          id: string
          user_id: string
          amount: number
          status: 'pending' | 'approved' | 'rejected'
          bank_name: string
          bank_account_number: string
          bank_ifsc_code: string
          bank_account_holder_name: string
          admin_note: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          status?: 'pending' | 'approved' | 'rejected'
          bank_name: string
          bank_account_number: string
          bank_ifsc_code: string
          bank_account_holder_name: string
          admin_note?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          status?: 'pending' | 'approved' | 'rejected'
          bank_name?: string
          bank_account_number?: string
          bank_ifsc_code?: string
          bank_account_holder_name?: string
          admin_note?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

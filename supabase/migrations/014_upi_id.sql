-- MIGRATION: 014_upi_id.sql
-- Adds UPI ID field to profiles table (mandatory for receiving payments)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Add a comment to explain the purpose of this column
COMMENT ON COLUMN public.profiles.upi_id IS 'User UPI ID required for receiving payments (e.g. name@upi or phone@bank)';

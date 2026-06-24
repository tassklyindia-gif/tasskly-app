-- MIGRATION: 022_ensure_bank_columns.sql
-- Ensure all bank-related columns exist on the profiles table
-- Uses IF NOT EXISTS so it is safe to run multiple times

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_ifsc_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_verification_status TEXT DEFAULT 'unverified';

-- Backfill any users who already have bank_account_number set to 'verified'
UPDATE public.profiles
SET bank_verification_status = 'verified'
WHERE bank_account_number IS NOT NULL
  AND (bank_verification_status IS NULL OR bank_verification_status = 'unverified');

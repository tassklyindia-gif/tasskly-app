-- MIGRATION: 021_bank_verification.sql
-- 1. Add bank_verification_status column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_verification_status TEXT DEFAULT 'unverified';

-- 2. Backfill existing users who already have bank details saved as 'verified'
UPDATE public.profiles
SET bank_verification_status = 'verified'
WHERE bank_account_number IS NOT NULL AND bank_verification_status = 'unverified';

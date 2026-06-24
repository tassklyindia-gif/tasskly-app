-- MIGRATION: 009_job_rejection.sql
-- Add rejection_reason column to jobs table so poster can explain why they rejected work.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add payment_due_at if missing
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ;

-- Add accepted_bid_id if missing
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS accepted_bid_id UUID;

-- 003_job_flow_updates.sql

-- 1. Add 'payment_pending' to job_status enum
-- Note: We use a DO block to safely add the enum value if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'job_status' AND e.enumlabel = 'payment_pending') THEN
        ALTER TYPE job_status ADD VALUE 'payment_pending';
    END IF;
END
$$;

-- 2. Add payment_due_at to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ;

-- 3. Add system message for payment timer start
-- This will be handled in the hook, but we ensure RLS allows it.

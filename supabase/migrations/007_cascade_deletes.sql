-- MIGRATION: 007_cascade_deletes.sql
-- Fixes foreign key constraints to allow deleting users (profiles) by cascading deletes to related records.

-- 1. JOBS
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_poster_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_poster_id_fkey 
  FOREIGN KEY (poster_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_worker_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. JOB FILES
ALTER TABLE public.job_files DROP CONSTRAINT IF EXISTS job_files_uploader_id_fkey;
ALTER TABLE public.job_files ADD CONSTRAINT job_files_uploader_id_fkey 
  FOREIGN KEY (uploader_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. ESCROW TRANSACTIONS
ALTER TABLE public.escrow_transactions DROP CONSTRAINT IF EXISTS escrow_transactions_poster_id_fkey;
ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_poster_id_fkey 
  FOREIGN KEY (poster_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.escrow_transactions DROP CONSTRAINT IF EXISTS escrow_transactions_worker_id_fkey;
ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. MESSAGES
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. ADMIN LEDGER
ALTER TABLE public.admin_ledger DROP CONSTRAINT IF EXISTS admin_ledger_from_user_id_fkey;
ALTER TABLE public.admin_ledger ADD CONSTRAINT admin_ledger_from_user_id_fkey 
  FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.admin_ledger DROP CONSTRAINT IF EXISTS admin_ledger_to_user_id_fkey;
ALTER TABLE public.admin_ledger ADD CONSTRAINT admin_ledger_to_user_id_fkey 
  FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. VERIFICATION REQUESTS
ALTER TABLE public.verification_requests DROP CONSTRAINT IF EXISTS verification_requests_user_id_fkey;
ALTER TABLE public.verification_requests ADD CONSTRAINT verification_requests_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 7. BIDS (Assuming standard constraint names if they exist)
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bids') THEN
    ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_bidder_id_fkey;
    ALTER TABLE public.bids ADD CONSTRAINT bids_bidder_id_fkey 
      FOREIGN KEY (bidder_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
      
    ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_job_id_fkey;
    ALTER TABLE public.bids ADD CONSTRAINT bids_job_id_fkey 
      FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
  END IF;
END $$;

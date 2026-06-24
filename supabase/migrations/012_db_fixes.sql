-- MIGRATION: 012_db_fixes.sql
-- 1. Ensure foreign key constraints on escrow_transactions and admin_ledger cascade delete on job deletion.

ALTER TABLE public.escrow_transactions DROP CONSTRAINT IF EXISTS escrow_transactions_job_id_fkey;
ALTER TABLE public.escrow_transactions ADD CONSTRAINT escrow_transactions_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.admin_ledger DROP CONSTRAINT IF EXISTS admin_ledger_job_id_fkey;
ALTER TABLE public.admin_ledger ADD CONSTRAINT admin_ledger_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

-- 2. Relax public access for job brief files (is_submission = false)

-- Re-create SELECT policy on job_files table
DROP POLICY IF EXISTS "Participants can view job files" ON public.job_files;
DROP POLICY IF EXISTS "Participants and public brief view" ON public.job_files;

CREATE POLICY "Participants and public brief view" ON public.job_files
  FOR SELECT USING (
    (is_submission = false) OR 
    (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_id AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid())))
  );

-- Re-create SELECT policy on storage.objects for the 'job-files' bucket
DROP POLICY IF EXISTS "Job participants can view job files" ON storage.objects;

CREATE POLICY "Job participants can view job files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-files' AND
    (
      -- Either it's a brief file (is_submission = false)
      EXISTS (
        SELECT 1 FROM public.job_files
        WHERE job_files.file_url = name AND job_files.is_submission = false
      )
      OR
      -- Or the user is a participant of the job
      EXISTS (
        SELECT 1 FROM public.jobs
        WHERE jobs.id::text = (storage.foldername(name))[1]
          AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid())
      )
    )
  );

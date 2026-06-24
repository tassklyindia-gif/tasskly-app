-- MIGRATION: 010_storage_job_files_policy.sql
-- Ensure job-files bucket exists and has correct access policies.

-- Re-create bucket if not existing (safe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-files', 'job-files', false)
ON CONFLICT (id) DO NOTHING;

-- Drop any old permissive policies
DROP POLICY IF EXISTS "Public can view job files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view job files" ON storage.objects;
DROP POLICY IF EXISTS "Job participants can view job files" ON storage.objects;
DROP POLICY IF EXISTS "Job participants can upload job files" ON storage.objects;

-- SELECT: only poster or accepted worker
CREATE POLICY "Job participants can view job files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-files' AND
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id::text = (storage.foldername(name))[1]
        AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid())
    )
  );

-- INSERT: only participants
CREATE POLICY "Job participants can upload job files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'job-files' AND
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id::text = (storage.foldername(name))[1]
        AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid())
    )
  );

-- Admins can view all files
CREATE POLICY "Admins can view all job files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-files' AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

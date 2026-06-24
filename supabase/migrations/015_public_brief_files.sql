-- MIGRATION: 015_public_brief_files.sql
-- Allow anyone (even anonymous/unauthenticated) to read brief (non-submission) job files.
-- Submission files remain restricted to job participants only.

-- Drop old restrictive storage policy
DROP POLICY IF EXISTS "Job participants can view job files" ON storage.objects;

-- New: public can view brief files, participants can view submission files
CREATE POLICY "Public can view brief job files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-files' AND
    (
      -- Brief files: anyone can view (is_submission = false)
      EXISTS (
        SELECT 1 FROM public.job_files
        WHERE job_files.file_url = name AND job_files.is_submission = false
      )
      OR
      -- Submission files: only job participants
      (
        auth.uid() IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM public.jobs
          WHERE jobs.id::text = (storage.foldername(name))[1]
            AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid())
        )
      )
    )
  );

-- Also allow public SELECT on job_files table for brief files (is_submission = false)
DROP POLICY IF EXISTS "Participants and public brief view" ON public.job_files;
CREATE POLICY "Participants and public brief view" ON public.job_files
  FOR SELECT USING (
    (is_submission = false)
    OR
    (auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_id
        AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid())
    ))
  );

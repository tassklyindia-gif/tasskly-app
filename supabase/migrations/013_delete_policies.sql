-- MIGRATION: 013_delete_policies.sql
-- Enables DELETE policies for jobs, bids, and job_files tables, and cleans up demo/test users.

-- 1. Enable DELETE policies for public.jobs
DROP POLICY IF EXISTS "Posters can delete own jobs" ON public.jobs;
CREATE POLICY "Posters can delete own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = poster_id);

DROP POLICY IF EXISTS "Admins can delete any jobs" ON public.jobs;
CREATE POLICY "Admins can delete any jobs" ON public.jobs
  FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 2. Enable DELETE policies for public.bids
DROP POLICY IF EXISTS "Bidders can delete own bids" ON public.bids;
CREATE POLICY "Bidders can delete own bids" ON public.bids
  FOR DELETE USING (auth.uid() = bidder_id);

DROP POLICY IF EXISTS "Admins can delete any bids" ON public.bids;
CREATE POLICY "Admins can delete any bids" ON public.bids
  FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 3. Enable DELETE policies for public.job_files
DROP POLICY IF EXISTS "Uploaders can delete own files" ON public.job_files;
CREATE POLICY "Uploaders can delete own files" ON public.job_files
  FOR DELETE USING (auth.uid() = uploader_id);

DROP POLICY IF EXISTS "Job posters can delete any files for their job" ON public.job_files;
CREATE POLICY "Job posters can delete any files for their job" ON public.job_files
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_id AND jobs.poster_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can delete any job files" ON public.job_files;
CREATE POLICY "Admins can delete any job files" ON public.job_files
  FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 4. Clean up the specific test poster user created in the database during RLS tests
DELETE FROM public.profiles WHERE email LIKE 'testuser_%@example.com';

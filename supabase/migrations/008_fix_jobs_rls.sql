-- MIGRATION: 008_fix_jobs_rls.sql
-- 1. Allow workers to "claim" open jobs by updating the worker_id and status
DROP POLICY IF EXISTS "Users can claim open jobs" ON jobs;
CREATE POLICY "Users can claim open jobs" ON jobs 
FOR UPDATE 
USING (status = 'open' AND worker_id IS NULL)
WITH CHECK (auth.uid() = worker_id);

-- 2. Allow workers to update jobs they are assigned to
DROP POLICY IF EXISTS "Workers can update assigned jobs" ON jobs;
CREATE POLICY "Workers can update assigned jobs" ON jobs 
FOR UPDATE 
USING (auth.uid() = worker_id);

-- 3. Ensure posters can update their own jobs
DROP POLICY IF EXISTS "Posters can update own jobs" ON jobs;
CREATE POLICY "Posters can update own jobs" ON jobs 
FOR UPDATE 
USING (auth.uid() = poster_id);

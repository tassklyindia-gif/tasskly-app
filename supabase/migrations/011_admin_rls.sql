-- MIGRATION: 011_admin_rls.sql
-- Add RLS policies so admin users can view all data across all tables.

-- Profiles: Admin can view all
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Jobs: Admin can view all
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
CREATE POLICY "Admins can view all jobs"
  ON public.jobs FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Escrow: Admin can manage all
DROP POLICY IF EXISTS "Admins can manage escrow" ON public.escrow_transactions;
CREATE POLICY "Admins can manage escrow"
  ON public.escrow_transactions FOR ALL
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Job files: Admin can view all
DROP POLICY IF EXISTS "Admins can view all job_files" ON public.job_files;
CREATE POLICY "Admins can view all job_files"
  ON public.job_files FOR SELECT
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

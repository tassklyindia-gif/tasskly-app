-- MIGRATION: 005_jobs_expansion.sql
-- Adds missing feature columns to the jobs table to align with frontend requirements

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS is_quick_task BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS campus_only BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS campus_name TEXT,
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS urgent_time TEXT,
ADD COLUMN IF NOT EXISTS is_team_task BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS team_roles TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS is_mentoring BOOLEAN DEFAULT FALSE;

-- Ensure RLS (policies usually apply to all columns unless specified otherwise, 
-- but we verify that the existing policies cover these new fields).
-- Since the existing policies use `auth.uid() = poster_id` etc., 
-- they automatically cover these new columns for SELECT/UPDATE.

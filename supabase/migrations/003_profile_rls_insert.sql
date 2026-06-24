-- Migration 003: Profile RLS Insert
-- Allow authenticated users to insert their own profile record.
-- This is a fallback for when the Auth trigger fails or for legacy users.

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

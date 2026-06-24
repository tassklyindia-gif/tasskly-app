-- Migration: Add rating column to jobs table for poster feedback
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS rating NUMERIC CHECK (rating >= 1 AND rating <= 5);

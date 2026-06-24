# Tasskly Deployment Guide

## Vercel Environment Variables (add in Vercel Dashboard):
  VITE_SUPABASE_URL=YOUR_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
  VITE_RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID

## Supabase Edge Function Secrets (add in Supabase Dashboard):
  RAZORPAY_KEY_ID=YOUR_RAZORPAY_KEY_ID
  RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_KEY_SECRET

## Pre-deploy checklist:
  - [ ] Run 001_init.sql in Supabase SQL Editor
  - [ ] Run 002_verification.sql in Supabase SQL Editor
  - [ ] Run 003_realtime.sql in Supabase SQL Editor
  - [ ] Set admin user role in Supabase profiles table
  - [ ] All 4 storage buckets created (job-files, submissions, verification-docs, avatars)
  - [ ] RLS enabled on all tables
  - [ ] .env file is in .gitignore

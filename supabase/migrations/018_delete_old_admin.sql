-- MIGRATION: 018_delete_old_admin.sql
-- Delete the old admin profile and auth.users record from the database

-- 1. Delete profile (associated items will cascade delete)
DELETE FROM public.profiles WHERE email = 'karshikalamvamshi48@gmail.com';

-- 2. Delete user account from auth schema
DELETE FROM auth.users WHERE email = 'karshikalamvamshi48@gmail.com';

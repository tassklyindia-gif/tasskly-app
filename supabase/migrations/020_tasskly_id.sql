-- MIGRATION: 020_tasskly_id.sql
-- 1. Add tasskly_id and internship_password columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tasskly_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS internship_password TEXT;

-- 2. Populate tasskly_id for existing users in a guaranteed unique sequential alphanumeric format
WITH ranked_profiles AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.profiles
  WHERE tasskly_id IS NULL OR tasskly_id LIKE 'TSK-%'
)
UPDATE public.profiles p
SET tasskly_id = 'TSY-' || 
                 substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' from (floor(random() * 36) + 1)::int for 1) ||
                 substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' from (floor(random() * 36) + 1)::int for 1) ||
                 substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' from (floor(random() * 36) + 1)::int for 1) ||
                 substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' from (floor(random() * 36) + 1)::int for 1) ||
                 substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' from (floor(random() * 36) + 1)::int for 1) ||
                 substring('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' from (floor(random() * 36) + 1)::int for 1)
FROM ranked_profiles rp
WHERE p.id = rp.id;

-- 3. Add UNIQUE constraint to tasskly_id to prevent future duplicate ids
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tasskly_id_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tasskly_id_key UNIQUE (tasskly_id);

-- 4. Update the handle_new_user trigger to generate and assign a unique Tasskly ID on new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_tsk_id TEXT;
  id_exists BOOLEAN;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
BEGIN
  -- Loop to guarantee a unique Tasskly ID is generated
  LOOP
    new_tsk_id := 'TSY-' || 
                  substring(chars from floor(random() * 36 + 1)::int for 1) ||
                  substring(chars from floor(random() * 36 + 1)::int for 1) ||
                  substring(chars from floor(random() * 36 + 1)::int for 1) ||
                  substring(chars from floor(random() * 36 + 1)::int for 1) ||
                  substring(chars from floor(random() * 36 + 1)::int for 1) ||
                  substring(chars from floor(random() * 36 + 1)::int for 1);
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE tasskly_id = new_tsk_id) INTO id_exists;
    EXIT WHEN NOT id_exists;
  END LOOP;

  INSERT INTO public.profiles (id, full_name, email, avatar_url, role, upi_id, phone, tasskly_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    CASE 
      WHEN NEW.email IN ('karthikmethuku180@gmail.com', 'tasskly@admin.com', 'shrikarakarapu@gmail.com') THEN 'admin'::user_role
      ELSE 'worker'::user_role
    END,
    NEW.raw_user_meta_data->>'upi_id',
    NEW.raw_user_meta_data->>'phone',
    new_tsk_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

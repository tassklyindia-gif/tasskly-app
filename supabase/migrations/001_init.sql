-- INIT MIGRATION: 001_init.sql

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('poster', 'worker', 'admin');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE job_status AS ENUM ('open', 'accepted', 'submitted', 'completed', 'disputed');
CREATE TYPE escrow_status AS ENUM ('held', 'released', 'refunded', 'disputed');
CREATE TYPE ledger_type AS ENUM ('fee_collected', 'escrow_held', 'escrow_released', 'refund');

-- 2. PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'worker' NOT NULL,
  wallet_balance NUMERIC DEFAULT 0 NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE NOT NULL,
  verification_status verification_status DEFAULT 'unverified' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. JOBS
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID REFERENCES profiles(id) NOT NULL,
  worker_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget NUMERIC NOT NULL,
  platform_fee NUMERIC GENERATED ALWAYS AS (budget * 0.10) STORED,
  worker_payout NUMERIC GENERATED ALWAYS AS (budget * 0.90) STORED,
  category TEXT NOT NULL,
  status job_status DEFAULT 'open' NOT NULL,
  instructions TEXT,
  instructions_locked BOOLEAN DEFAULT TRUE NOT NULL,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. JOB FILES
CREATE TABLE job_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  uploader_id UUID REFERENCES profiles(id) NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  is_submission BOOLEAN DEFAULT FALSE NOT NULL,
  is_watermarked BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. ESCROW TRANSACTIONS
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  poster_id UUID REFERENCES profiles(id) NOT NULL,
  worker_id UUID REFERENCES profiles(id),
  total_amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  worker_amount NUMERIC NOT NULL,
  status escrow_status DEFAULT 'held' NOT NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  released_at TIMESTAMPTZ
);

-- 6. MESSAGES
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. ADMIN LEDGER
CREATE TABLE admin_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  type ledger_type NOT NULL,
  amount NUMERIC NOT NULL,
  from_user_id UUID REFERENCES profiles(id) NOT NULL,
  to_user_id UUID REFERENCES profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_ledger ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read, only owner can update
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Jobs: Open jobs visible to all; full access for poster/worker
CREATE POLICY "Jobs are viewable by everyone" ON jobs FOR SELECT USING (true);
CREATE POLICY "Posters can insert jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = poster_id);
CREATE POLICY "Posters/Workers can update their jobs" ON jobs FOR UPDATE USING (auth.uid() = poster_id OR auth.uid() = worker_id);

-- Job Files: Only participants can read/insert
CREATE POLICY "Participants can view job files" ON job_files FOR SELECT USING (
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid()))
);
CREATE POLICY "Participants can insert job files" ON job_files FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid()))
);

-- Escrow: Participants and Admins only
CREATE POLICY "Participants and admins can view escrow" ON escrow_transactions FOR SELECT USING (
  auth.uid() = poster_id OR auth.uid() = worker_id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Messages: Participants only
CREATE POLICY "Participants can view messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid()))
);
CREATE POLICY "Participants can insert messages" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid()))
);

-- Admin Ledger: Admins only
CREATE POLICY "Admins can view ledger" ON admin_ledger FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- 9. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('job-files', 'job-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-docs', 'verification-docs', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- 10. STORAGE POLICIES

-- Avatars: public read, authenticated users can upload their own
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Job files: only job participants can read/upload (folder = job_id)
CREATE POLICY "Job participants can view job files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'job-files' AND
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id::text = (storage.foldername(name))[1]
      AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid())
    )
  );
CREATE POLICY "Job participants can upload job files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'job-files' AND
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id::text = (storage.foldername(name))[1]
      AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid())
    )
  );

-- Submissions: only job participants can read/upload
CREATE POLICY "Job participants can view submissions" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions' AND
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id::text = (storage.foldername(name))[1]
      AND (jobs.poster_id = auth.uid() OR jobs.worker_id = auth.uid())
    )
  );
CREATE POLICY "Workers can upload submissions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'submissions' AND
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id::text = (storage.foldername(name))[1]
      AND jobs.worker_id = auth.uid()
    )
  );

-- Verification docs: only the uploader can insert, only admins can read
CREATE POLICY "Users can upload verification docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-docs' AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Admins can view verification docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-docs' AND
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 11. PROFILE AUTO-INSERT TRIGGER (creates profile row on auth.users signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'worker')
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. REALTIME (enable for chat messages)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

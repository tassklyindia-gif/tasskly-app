CREATE TABLE verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  id_type text CHECK (id_type IN ('student_id', 'aadhaar', 'pan')),
  id_number text NOT NULL,
  front_image_url text NOT NULL,
  back_image_url text,
  selfie_url text NOT NULL,
  status text DEFAULT 'pending' 
    CHECK (status IN ('pending','verified','rejected')),
  admin_note text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- User can only see their own requests
CREATE POLICY "users_own_verification" ON verification_requests
  FOR SELECT USING (auth.uid() = user_id);

-- User can only insert their own request
CREATE POLICY "users_insert_verification" ON verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can see all
CREATE POLICY "admin_all_verification" ON verification_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

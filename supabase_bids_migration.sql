-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/njlrsszxksbkclkveoyi/sql)

-- 1. Create bids table
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  message TEXT NOT NULL,
  delivery_days INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Anyone authenticated can read bids for a job
CREATE POLICY "Authenticated users can read bids" ON public.bids
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only the bidder can insert their own bid
CREATE POLICY "Bidders can insert own bids" ON public.bids
  FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- Only the bidder can update their own bid (for withdrawal)
CREATE POLICY "Bidders can update own bids" ON public.bids
  FOR UPDATE USING (auth.uid() = bidder_id);

-- Job poster can update bid status (accept/reject)
CREATE POLICY "Job poster can update bid status" ON public.bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = bids.job_id AND jobs.poster_id = auth.uid()
    )
  );

-- 4. Add payment_due_at column to jobs if not exists
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ;

-- 5. Add accepted_bid_id to jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS accepted_bid_id UUID REFERENCES public.bids(id);

-- 6. Enable realtime for bids table (for live notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;

-- escrow_transactions: Allow poster to insert
CREATE POLICY "Posters can insert escrow" 
ON public.escrow_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = poster_id);

-- admin_ledger: Allow poster to insert (for escrow_held and potential fees)
CREATE POLICY "Posters can insert ledger entries" 
ON public.admin_ledger 
FOR INSERT 
WITH CHECK (auth.uid() = from_user_id);

-- Add missing columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'money';

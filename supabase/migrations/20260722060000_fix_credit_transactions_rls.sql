-- Fix: Allow players to insert their own credit_transactions
-- Timestamp: 20260722060000

-- Add INSERT policy so players can submit their own credit purchase requests
DROP POLICY IF EXISTS "players_insert_own_transactions" ON public.credit_transactions;
CREATE POLICY "players_insert_own_transactions"
ON public.credit_transactions
FOR INSERT
TO authenticated
WITH CHECK (player_id = auth.uid());

-- Add policy to allow users to search for other players
-- This allows authenticated users to read basic profile info (name, player_id) of other users
-- for the purpose of searching and starting conversations

DROP POLICY IF EXISTS "users_search_profiles" ON public.user_profiles;
CREATE POLICY "users_search_profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (true);

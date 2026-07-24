-- Fix RLS policy to allow users to see other participants in conversations they are part of
-- This is necessary for messaging to work - users need to know who else is in their conversations

DROP POLICY IF EXISTS "users_view_conversation_participants" ON public.conversation_participants;
CREATE POLICY "users_view_conversation_participants"
ON public.conversation_participants FOR SELECT TO authenticated
USING (
  -- Allow viewing participants in conversations the user is part of
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

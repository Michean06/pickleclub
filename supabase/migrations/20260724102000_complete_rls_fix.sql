-- Complete RLS fix for messaging system
-- This fixes issues where conversations disappear on refresh and other players can't see messages

-- 1. Add INSERT policy for conversations (needed for creating new conversations)
DROP POLICY IF EXISTS "users_create_conversations" ON public.conversations;
CREATE POLICY "users_create_conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- 2. Add INSERT policy for conversation_participants (needed for adding users to conversations)
DROP POLICY IF EXISTS "users_join_conversations" ON public.conversation_participants;
CREATE POLICY "users_join_conversations"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3. Replace the restrictive participation policy with the broader one
DROP POLICY IF EXISTS "users_view_own_participation" ON public.conversation_participants;
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

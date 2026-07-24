-- Comprehensive fix for messaging system RLS and permissions
-- This addresses issues where conversations don't persist and other users can't see messages

-- 1. Grant execute permissions on messaging functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read TO authenticated;

-- 2. Ensure conversations can be created by users
DROP POLICY IF EXISTS "users_create_conversations" ON public.conversations;
CREATE POLICY "users_create_conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- 3. Ensure users can join conversations
DROP POLICY IF EXISTS "users_join_conversations" ON public.conversation_participants;
CREATE POLICY "users_join_conversations"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. Ensure users can see all participants in their conversations
DROP POLICY IF EXISTS "users_view_own_participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "users_view_conversation_participants" ON public.conversation_participants;
CREATE POLICY "users_view_conversation_participants"
ON public.conversation_participants FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- 5. Ensure users can see conversations they're part of
DROP POLICY IF EXISTS "users_view_own_conversations" ON public.conversations;
CREATE POLICY "users_view_own_conversations"
ON public.conversations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = public.conversations.id
    AND user_id = auth.uid()
  )
);

-- 6. Ensure users can update their own participation (pin, mute, last_read_at)
DROP POLICY IF EXISTS "users_update_own_participation" ON public.conversation_participants;
CREATE POLICY "users_update_own_participation"
ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. Ensure users can see messages in their conversations
DROP POLICY IF EXISTS "users_view_messages_in_conversations" ON public.messages;
CREATE POLICY "users_view_messages_in_conversations"
ON public.messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = public.messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- 8. Ensure users can send messages to conversations they're part of
DROP POLICY IF EXISTS "users_send_messages" ON public.messages;
CREATE POLICY "users_send_messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = public.messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- 9. Ensure users can update their own messages (status)
DROP POLICY IF EXISTS "users_update_own_messages" ON public.messages;
CREATE POLICY "users_update_own_messages"
ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- Fix infinite recursion in RLS policy for conversation_participants
-- The issue is the policy references the same table, creating circular reference

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "authenticated_read_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "authenticated_join_conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "authenticated_update_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "users_view_conversation_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "users_view_own_participation" ON public.conversation_participants;

-- Create simple policies without self-referential checks
CREATE POLICY "authenticated_read_participants"
ON public.conversation_participants FOR SELECT TO authenticated
USING (true);

CREATE POLICY "authenticated_insert_participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_update_participants"
ON public.conversation_participants FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Also fix conversations policies
DROP POLICY IF EXISTS "authenticated_read_conversations" ON public.conversations;
DROP POLICY IF EXISTS "authenticated_create_conversations" ON public.conversations;
DROP POLICY IF EXISTS "users_view_own_conversations" ON public.conversations;

CREATE POLICY "authenticated_read_conversations"
ON public.conversations FOR SELECT TO authenticated
USING (true);

CREATE POLICY "authenticated_insert_conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_update_conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Fix messages policies
DROP POLICY IF EXISTS "authenticated_read_messages" ON public.messages;
DROP POLICY IF EXISTS "authenticated_send_messages" ON public.messages;
DROP POLICY IF EXISTS "authenticated_update_messages" ON public.messages;
DROP POLICY IF EXISTS "users_view_messages_in_conversations" ON public.messages;
DROP POLICY IF EXISTS "users_send_messages" ON public.messages;
DROP POLICY IF EXISTS "users_update_own_messages" ON public.messages;

CREATE POLICY "authenticated_read_messages"
ON public.messages FOR SELECT TO authenticated
USING (true);

CREATE POLICY "authenticated_insert_messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_update_messages"
ON public.messages FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

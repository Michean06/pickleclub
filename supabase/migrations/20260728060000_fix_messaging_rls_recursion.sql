-- Remove the recursive RLS policies created by 001_create_messaging_tables.sql.
--
-- "Users can read conversation members" selects from conversation_members inside
-- a policy on conversation_members, so Postgres raises
--   42P17 infinite recursion detected in policy for relation "conversation_members"
-- for any authenticated read of conversation_members, and for conversations /
-- messages / typing_status whose policies reference that table.
--
-- Membership checks now go through a SECURITY DEFINER helper, which runs with
-- RLS bypassed and therefore cannot recurse.

CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_member(UUID) TO authenticated;

-- conversation_members
DROP POLICY IF EXISTS "Users can read conversation members" ON public.conversation_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.conversation_members;

CREATE POLICY "members_read_own_conversations"
ON public.conversation_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_conversation_member(conversation_id));

-- conversations
DROP POLICY IF EXISTS "Users can read own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Conversation admins can update" ON public.conversations;

-- messages
DROP POLICY IF EXISTS "Users can read own conversation messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

DROP POLICY IF EXISTS "conversations_read_members" ON public.conversations;
CREATE POLICY "conversations_read_members"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_conversation_member(id));

DROP POLICY IF EXISTS "conversations_insert_authenticated" ON public.conversations;
CREATE POLICY "conversations_insert_authenticated"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "messages_read_members" ON public.messages;
CREATE POLICY "messages_read_members"
ON public.messages FOR SELECT TO authenticated
USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id));

-- typing_status
DROP POLICY IF EXISTS "Users can read typing status" ON public.typing_status;
DROP POLICY IF EXISTS "Users can update typing status" ON public.typing_status;

CREATE POLICY "typing_status_read_members"
ON public.typing_status FOR SELECT TO authenticated
USING (public.is_conversation_member(conversation_id));

CREATE POLICY "typing_status_write_own"
ON public.typing_status FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

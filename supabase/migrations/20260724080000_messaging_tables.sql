-- Messaging System Tables Migration
-- Timestamp: 20260724080000

-- ============================================================
-- 1. TYPES (ENUMs)
-- ============================================================
DROP TYPE IF EXISTS public.message_status CASCADE;
CREATE TYPE public.message_status AS ENUM ('sent', 'delivered', 'read');

DROP TYPE IF EXISTS public.conversation_type CASCADE;
CREATE TYPE public.conversation_type AS ENUM ('direct', 'group');

-- ============================================================
-- 2. MESSAGING TABLES
-- ============================================================

-- Conversations (represents a chat between users or a group)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.conversation_type DEFAULT 'direct'::public.conversation_type,
  name TEXT DEFAULT '', -- For group chats
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Conversation Participants (users in a conversation)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  pinned BOOLEAN DEFAULT false,
  muted BOOLEAN DEFAULT false,
  last_read_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  status public.message_status DEFAULT 'sent'::public.message_status,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- Function to get or create a direct conversation between two users
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Security check: user1_id must be the current user
  IF user1_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only create conversations for yourself';
  END IF;
  
  -- Check if conversation already exists between these two users
  SELECT cp1.conversation_id INTO conv_id
  FROM public.conversation_participants cp1
  INNER JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  INNER JOIN public.conversations c ON cp1.conversation_id = c.id
  WHERE cp1.user_id = user1_id
    AND cp2.user_id = user2_id
    AND c.type = 'direct'
    AND (SELECT COUNT(*) FROM public.conversation_participants WHERE conversation_id = cp1.conversation_id) = 2
  LIMIT 1;

  -- If not exists, create new conversation
  IF conv_id IS NULL THEN
    -- Insert conversation
    INSERT INTO public.conversations (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO conv_id;
    
    -- Add both users as participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conv_id, user1_id), (conv_id, user2_id);
  END IF;

  RETURN conv_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation TO authenticated;

-- Function to send a message
CREATE OR REPLACE FUNCTION public.send_message(conversation_id UUID, sender_id UUID, message_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_id UUID;
BEGIN
  INSERT INTO public.messages (conversation_id, sender_id, text, status)
  VALUES (conversation_id, sender_id, message_text, 'sent')
  RETURNING id INTO message_id;

  -- Update conversation updated_at
  UPDATE public.conversations
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = conversation_id;

  RETURN message_id;
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(conversation_id UUID, user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update last_read_at for the participant
  UPDATE public.conversation_participants
  SET last_read_at = CURRENT_TIMESTAMP
  WHERE conversation_id = conversation_id AND user_id = user_id;

  -- Mark messages as read if sent by others
  UPDATE public.messages
  SET status = 'read'
  WHERE conversation_id = conversation_id
    AND sender_id != user_id
    AND status != 'read';
END;
$$;

-- ============================================================
-- 5. ENABLE RLS
-- ============================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- conversations: users can only see conversations they are part of
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

-- conversation_participants: users can see their own participation
DROP POLICY IF EXISTS "users_view_own_participation" ON public.conversation_participants;
CREATE POLICY "users_view_own_participation"
ON public.conversation_participants FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- conversation_participants: users can update their own participation (pin, mute, last_read_at)
DROP POLICY IF EXISTS "users_update_own_participation" ON public.conversation_participants;
CREATE POLICY "users_update_own_participation"
ON public.conversation_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- messages: users can only see messages in conversations they are part of
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

-- messages: users can send messages to conversations they are part of
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

-- messages: users can update their own messages (status)
DROP POLICY IF EXISTS "users_update_own_messages" ON public.messages;
CREATE POLICY "users_update_own_messages"
ON public.messages FOR UPDATE TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- ============================================================
-- 7. TRIGGERS
-- ============================================================

-- Helper function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Update updated_at timestamp on conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

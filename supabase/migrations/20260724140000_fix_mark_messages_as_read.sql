-- Fix ambiguous column reference in mark_messages_as_read function
-- Use table aliases to avoid ambiguity between parameters and columns

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(conversation_id UUID, user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_read_at for the participant using table alias
  UPDATE public.conversation_participants cp
  SET last_read_at = CURRENT_TIMESTAMP
  FROM public.conversation_participants
  WHERE cp.conversation_id = mark_messages_as_read.conversation_id 
    AND cp.user_id = mark_messages_as_read.user_id;

  -- Mark messages as read if sent by others using table alias
  UPDATE public.messages m
  SET status = 'read'
  FROM public.messages
  WHERE m.conversation_id = mark_messages_as_read.conversation_id
    AND m.sender_id != mark_messages_as_read.user_id
    AND m.status != 'read';
END;
$$;

-- Re-grant execute permission
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read TO authenticated;

-- Fix ambiguous column reference in mark_messages_as_read function
-- Use parameter aliases to avoid column name conflicts
-- Drop trigger that causes updated_at issues

DROP FUNCTION IF EXISTS public.mark_messages_as_read(UUID, UUID);
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last_read_at for the participant
  UPDATE public.conversation_participants
  SET last_read_at = CURRENT_TIMESTAMP
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;

  -- Mark messages as read if sent by others
  UPDATE public.messages
  SET status = 'read'
  WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND status != 'read';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read TO authenticated;

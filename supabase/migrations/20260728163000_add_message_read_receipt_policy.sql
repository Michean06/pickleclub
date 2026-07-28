-- Add RLS policy to allow message status updates for read receipts
-- This allows the mark_messages_as_read function to update message status

DROP POLICY IF EXISTS "Users can update message status for read receipts" ON public.messages;

CREATE POLICY "Users can update message status for read receipts"
    ON public.messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE public.conversation_participants.conversation_id = public.messages.conversation_id
            AND public.conversation_participants.user_id = auth.uid()
        )
    )
    WITH CHECK (
        status = 'read' AND
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE public.conversation_participants.conversation_id = public.messages.conversation_id
            AND public.conversation_participants.user_id = auth.uid()
        )
    );

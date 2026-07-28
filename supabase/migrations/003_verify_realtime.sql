-- Verify realtime replication is enabled for messaging tables
-- Run this in Supabase SQL Editor to check replication status

SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN tablename IN ('messages', 'conversations', 'conversation_members', 'typing_status') 
        THEN '✓ Should be enabled'
        ELSE 'Optional'
    END as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- If any messaging tables are missing from the results above, run these commands:

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;

-- Enable Supabase Real-Time replication for live court status updates
-- Timestamp: 20260722025000

-- Add courts, active_matches, and queue_entries to the supabase_realtime publication
-- This enables real-time change events (INSERT, UPDATE, DELETE) on these tables

DO $$
BEGIN
  -- Add courts table to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'courts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.courts;
    RAISE NOTICE 'Added public.courts to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'public.courts already in supabase_realtime publication';
  END IF;

  -- Add active_matches table to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'active_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.active_matches;
    RAISE NOTICE 'Added public.active_matches to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'public.active_matches already in supabase_realtime publication';
  END IF;

  -- Add queue_entries table to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'queue_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
    RAISE NOTICE 'Added public.queue_entries to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'public.queue_entries already in supabase_realtime publication';
  END IF;
END $$;

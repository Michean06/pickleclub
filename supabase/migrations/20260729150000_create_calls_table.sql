-- Create calls table for WebRTC call management
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  callee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'connected', 'ended', 'rejected')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_signals table for WebRTC signaling
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

-- Policies for calls table
DROP POLICY IF EXISTS "Users can view calls they are involved in" ON calls;
CREATE POLICY "Users can view calls they are involved in"
  ON calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

DROP POLICY IF EXISTS "Users can create calls as caller" ON calls;
CREATE POLICY "Users can create calls as caller"
  ON calls FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "Users can update calls they are involved in" ON calls;
CREATE POLICY "Users can update calls they are involved in"
  ON calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Policies for call_signals table
DROP POLICY IF EXISTS "Users can view signals for their calls" ON call_signals;
CREATE POLICY "Users can view signals for their calls"
  ON call_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_signals.call_id
      AND (calls.caller_id = auth.uid() OR calls.callee_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert signals for their calls" ON call_signals;
CREATE POLICY "Users can insert signals for their calls"
  ON call_signals FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM calls
      WHERE calls.id = call_signals.call_id
      AND (calls.caller_id = auth.uid() OR calls.callee_id = auth.uid())
    )
  );

-- Create indexes for better performance
DROP INDEX IF EXISTS idx_calls_caller_id;
CREATE INDEX idx_calls_caller_id ON calls(caller_id);

DROP INDEX IF EXISTS idx_calls_callee_id;
CREATE INDEX idx_calls_callee_id ON calls(callee_id);

DROP INDEX IF EXISTS idx_calls_status;
CREATE INDEX idx_calls_status ON calls(status);

DROP INDEX IF EXISTS idx_calls_created_at;
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);

DROP INDEX IF EXISTS idx_call_signals_call_id;
CREATE INDEX idx_call_signals_call_id ON call_signals(call_id);

DROP INDEX IF EXISTS idx_call_signals_sender_id;
CREATE INDEX idx_call_signals_sender_id ON call_signals(sender_id);

DROP INDEX IF EXISTS idx_call_signals_created_at;
CREATE INDEX idx_call_signals_created_at ON call_signals(created_at);

-- Enable realtime for calls table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE calls;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
  END IF;
END $$;

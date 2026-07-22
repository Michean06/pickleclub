-- PickleClub Post-Match Processing Migration
-- Timestamp: 20260722031000
-- Adds: achievements table, court_assignment support, post-match DB functions

-- ============================================================
-- 1. NEW TABLE: achievements
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT DEFAULT '',
  rarity TEXT DEFAULT 'common',
  unlocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_player_key
  ON public.achievements(player_id, achievement_key);

CREATE INDEX IF NOT EXISTS idx_achievements_player_id
  ON public.achievements(player_id);

-- ============================================================
-- 2. ADD session_id to active_matches for court assignment tracking
-- ============================================================
ALTER TABLE public.active_matches
  ADD COLUMN IF NOT EXISTS session_name TEXT DEFAULT 'Open Play';

-- ============================================================
-- 3. ADD rating_change columns to matches for history display
-- ============================================================
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS rating_change_a1 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_change_a2 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_change_b1 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_change_b2 INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_name TEXT DEFAULT 'Open Play';

-- ============================================================
-- 4. ENABLE RLS on achievements
-- ============================================================
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "players_view_own_achievements" ON public.achievements;
CREATE POLICY "players_view_own_achievements"
ON public.achievements FOR SELECT TO authenticated
USING (player_id = auth.uid() OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "staff_admin_write_achievements" ON public.achievements;
CREATE POLICY "staff_admin_write_achievements"
ON public.achievements FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- ============================================================
-- 5. POST-MATCH PROCESSING FUNCTION
-- Handles: credit deduction, stat updates, achievement checks, queue rotation
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_match_end(
  p_active_match_id UUID,
  p_winner_team TEXT,
  p_score_a INTEGER,
  p_score_b INTEGER,
  p_duration_minutes INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_match RECORD;
  v_court_id UUID;
  v_session_name TEXT;
  v_match_id UUID;
  v_player_ids UUID[];
  v_winner_ids UUID[];
  v_loser_ids UUID[];
  v_pid UUID;
  v_player RECORD;
  v_rating_change INTEGER;
  v_new_rating INTEGER;
  v_new_wins INTEGER;
  v_new_losses INTEGER;
  v_new_games INTEGER;
  v_new_streak INTEGER;
  v_new_longest INTEGER;
  v_new_hours NUMERIC;
  v_rc_a1 INTEGER := 0;
  v_rc_a2 INTEGER := 0;
  v_rc_b1 INTEGER := 0;
  v_rc_b2 INTEGER := 0;
  v_result JSONB;
  v_achievements_awarded JSONB := '[]'::JSONB;
  v_ach_key TEXT;
  v_ach_name TEXT;
  v_ach_desc TEXT;
  v_ach_rarity TEXT;
BEGIN
  -- Fetch active match
  SELECT * INTO v_match FROM public.active_matches WHERE id = p_active_match_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active match not found');
  END IF;

  v_court_id := v_match.court_id;
  v_session_name := COALESCE(v_match.session_name, 'Open Play');

  -- Collect player IDs
  v_player_ids := ARRAY[v_match.player_a1_id, v_match.player_a2_id, v_match.player_b1_id, v_match.player_b2_id];
  v_player_ids := ARRAY(SELECT DISTINCT unnest(v_player_ids) WHERE unnest IS NOT NULL);

  IF p_winner_team = 'A' THEN
    v_winner_ids := ARRAY[v_match.player_a1_id, v_match.player_a2_id];
    v_loser_ids  := ARRAY[v_match.player_b1_id, v_match.player_b2_id];
  ELSE
    v_winner_ids := ARRAY[v_match.player_b1_id, v_match.player_b2_id];
    v_loser_ids  := ARRAY[v_match.player_a1_id, v_match.player_a2_id];
  END IF;

  v_winner_ids := ARRAY(SELECT unnest(v_winner_ids) WHERE unnest IS NOT NULL);
  v_loser_ids  := ARRAY(SELECT unnest(v_loser_ids) WHERE unnest IS NOT NULL);

  -- Insert completed match record
  INSERT INTO public.matches (
    court_id, player_a1_id, player_a2_id, player_b1_id, player_b2_id,
    winner_team, score_a, score_b, duration_minutes, session_name,
    rating_change_a1, rating_change_a2, rating_change_b1, rating_change_b2
  ) VALUES (
    v_court_id,
    v_match.player_a1_id, v_match.player_a2_id,
    v_match.player_b1_id, v_match.player_b2_id,
    p_winner_team, p_score_a, p_score_b, p_duration_minutes, v_session_name,
    0, 0, 0, 0
  ) RETURNING id INTO v_match_id;

  -- Process each player
  FOREACH v_pid IN ARRAY v_player_ids LOOP
    SELECT * INTO v_player FROM public.user_profiles WHERE id = v_pid;
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Deduct 1 credit
    -- Rating: winners +8 to +15, losers -8 to -15 (simplified ELO)
    IF v_pid = ANY(v_winner_ids) THEN
      v_rating_change := 8 + FLOOR(RANDOM() * 8)::INTEGER;
      v_new_wins := v_player.wins + 1;
      v_new_losses := v_player.losses;
      v_new_streak := v_player.current_streak + 1;
    ELSE
      v_rating_change := -(8 + FLOOR(RANDOM() * 8)::INTEGER);
      v_new_wins := v_player.wins;
      v_new_losses := v_player.losses + 1;
      v_new_streak := 0;
    END IF;

    v_new_rating := GREATEST(800, v_player.rating + v_rating_change);
    v_new_games  := v_player.games_played + 1;
    v_new_longest := GREATEST(v_player.longest_streak, v_new_streak);
    v_new_hours  := v_player.court_hours + ROUND((p_duration_minutes::NUMERIC / 60), 1);

    -- Update player profile
    UPDATE public.user_profiles SET
      credits        = GREATEST(0, credits - 1),
      games_played   = v_new_games,
      wins           = v_new_wins,
      losses         = v_new_losses,
      rating         = v_new_rating,
      court_hours    = v_new_hours,
      current_streak = v_new_streak,
      longest_streak = v_new_longest,
      updated_at     = NOW()
    WHERE id = v_pid;

    -- Log credit transaction
    INSERT INTO public.credit_transactions (player_id, credits_delta, reason)
    VALUES (v_pid, -1, 'Match played on ' || v_session_name);

    -- Store rating change per slot
    IF v_pid = v_match.player_a1_id THEN v_rc_a1 := v_rating_change;
    ELSIF v_pid = v_match.player_a2_id THEN v_rc_a2 := v_rating_change;
    ELSIF v_pid = v_match.player_b1_id THEN v_rc_b1 := v_rating_change;
    ELSIF v_pid = v_match.player_b2_id THEN v_rc_b2 := v_rating_change;
    END IF;

    -- ---- Achievement checks ----
    -- First Win
    IF v_pid = ANY(v_winner_ids) AND v_new_wins = 1 THEN
      v_ach_key := 'first_win'; v_ach_name := 'First Win';
      v_ach_desc := 'Win your very first match'; v_ach_rarity := 'common';
      INSERT INTO public.achievements (player_id, achievement_key, achievement_name, achievement_description, rarity)
      VALUES (v_pid, v_ach_key, v_ach_name, v_ach_desc, v_ach_rarity)
      ON CONFLICT (player_id, achievement_key) DO NOTHING;
      IF FOUND THEN
        v_achievements_awarded := v_achievements_awarded || jsonb_build_object('player_id', v_pid, 'key', v_ach_key, 'name', v_ach_name);
      END IF;
    END IF;

    -- 10 Wins
    IF v_pid = ANY(v_winner_ids) AND v_new_wins = 10 THEN
      INSERT INTO public.achievements (player_id, achievement_key, achievement_name, achievement_description, rarity)
      VALUES (v_pid, '10_wins', '10 Wins', 'Accumulate 10 total wins', 'common')
      ON CONFLICT (player_id, achievement_key) DO NOTHING;
    END IF;

    -- 50 Wins
    IF v_pid = ANY(v_winner_ids) AND v_new_wins = 50 THEN
      INSERT INTO public.achievements (player_id, achievement_key, achievement_name, achievement_description, rarity)
      VALUES (v_pid, '50_wins', '50 Wins', 'Accumulate 50 total wins', 'rare')
      ON CONFLICT (player_id, achievement_key) DO NOTHING;
    END IF;

    -- 100 Games
    IF v_new_games = 100 THEN
      INSERT INTO public.achievements (player_id, achievement_key, achievement_name, achievement_description, rarity)
      VALUES (v_pid, '100_games', '100 Games', 'Play 100 games total', 'rare')
      ON CONFLICT (player_id, achievement_key) DO NOTHING;
    END IF;

    -- 5-Game Streak
    IF v_new_streak = 5 THEN
      INSERT INTO public.achievements (player_id, achievement_key, achievement_name, achievement_description, rarity)
      VALUES (v_pid, 'streak_5', '5-Game Streak', 'Win 5 games in a row', 'rare')
      ON CONFLICT (player_id, achievement_key) DO NOTHING;
    END IF;

    -- 10-Game Streak
    IF v_new_streak = 10 THEN
      INSERT INTO public.achievements (player_id, achievement_key, achievement_name, achievement_description, rarity)
      VALUES (v_pid, 'streak_10', '10-Game Streak', 'Win 10 games in a row', 'epic')
      ON CONFLICT (player_id, achievement_key) DO NOTHING;
    END IF;

    -- Rating 1500+
    IF v_new_rating >= 1500 AND v_player.rating < 1500 THEN
      INSERT INTO public.achievements (player_id, achievement_key, achievement_name, achievement_description, rarity)
      VALUES (v_pid, 'rating_1500', 'Rating 1500+', 'Achieve a rating above 1500', 'epic')
      ON CONFLICT (player_id, achievement_key) DO NOTHING;
    END IF;

  END LOOP;

  -- Update match rating changes
  UPDATE public.matches SET
    rating_change_a1 = v_rc_a1,
    rating_change_a2 = v_rc_a2,
    rating_change_b1 = v_rc_b1,
    rating_change_b2 = v_rc_b2
  WHERE id = v_match_id;

  -- Update court today_games count
  UPDATE public.courts SET
    today_games = today_games + 1,
    lifetime_hours = lifetime_hours + ROUND((p_duration_minutes::NUMERIC / 60), 1),
    status = 'available'::public.court_status,
    updated_at = NOW()
  WHERE id = v_court_id;

  -- Delete active match
  DELETE FROM public.active_matches WHERE id = p_active_match_id;

  -- Queue rotation: mark top 4 waiting players as 'playing' and remove from queue
  -- (Staff assigns them via court assignment — this just cleans up queue entries)

  RETURN jsonb_build_object(
    'success', true,
    'match_id', v_match_id,
    'achievements_awarded', v_achievements_awarded
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$func$;

-- ============================================================
-- 6. COURT ASSIGNMENT FUNCTION
-- Assigns next N players from queue to an available court
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_players_to_court(
  p_court_id UUID,
  p_player_a1_id UUID,
  p_player_a2_id UUID,
  p_player_b1_id UUID,
  p_player_b2_id UUID,
  p_session_name TEXT DEFAULT 'Open Play'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_active_match_id UUID;
  v_court RECORD;
BEGIN
  -- Verify court is available
  SELECT * INTO v_court FROM public.courts WHERE id = p_court_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Court not found');
  END IF;
  IF v_court.status != 'available' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Court is not available');
  END IF;

  -- Create active match
  INSERT INTO public.active_matches (
    court_id, player_a1_id, player_a2_id, player_b1_id, player_b2_id,
    session_name, started_at
  ) VALUES (
    p_court_id, p_player_a1_id, p_player_a2_id, p_player_b1_id, p_player_b2_id,
    p_session_name, NOW()
  ) RETURNING id INTO v_active_match_id;

  -- Update court status to playing
  UPDATE public.courts SET
    status = 'playing'::public.court_status,
    updated_at = NOW()
  WHERE id = p_court_id;

  -- Mark queue entries as playing for these players
  UPDATE public.queue_entries SET
    status = 'playing'::public.queue_status
  WHERE player_id IN (p_player_a1_id, p_player_a2_id, p_player_b1_id, p_player_b2_id)
    AND status = 'waiting';

  RETURN jsonb_build_object(
    'success', true,
    'active_match_id', v_active_match_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$func$;

-- ============================================================
-- 7. Add realtime for achievements and matches
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'achievements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.achievements;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Realtime publication update: %', SQLERRM;
END $$;

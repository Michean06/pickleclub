-- PickleClub Management System — Full Schema Migration
-- Timestamp: 20260722023957

-- ============================================================
-- 1. TYPES (ENUMs)
-- ============================================================
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('player', 'staff', 'admin');

DROP TYPE IF EXISTS public.skill_level CASCADE;
CREATE TYPE public.skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'pro');

DROP TYPE IF EXISTS public.court_status CASCADE;
CREATE TYPE public.court_status AS ENUM ('available', 'playing', 'maintenance');

DROP TYPE IF EXISTS public.queue_status CASCADE;
CREATE TYPE public.queue_status AS ENUM ('waiting', 'playing', 'done', 'cancelled');

-- ============================================================
-- 2. CORE TABLES
-- ============================================================

-- User Profiles (linked to auth.users via trigger)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role public.user_role DEFAULT 'player'::public.user_role,
  player_id TEXT UNIQUE,
  skill_level public.skill_level DEFAULT 'beginner'::public.skill_level,
  credits INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 1200,
  court_hours NUMERIC(6,1) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  member_since TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Courts
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  court_number INTEGER NOT NULL UNIQUE,
  status public.court_status DEFAULT 'available'::public.court_status,
  maintenance_note TEXT DEFAULT '',
  today_games INTEGER DEFAULT 0,
  lifetime_hours NUMERIC(8,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Active Matches (courts currently in play)
CREATE TABLE IF NOT EXISTS public.active_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE,
  player_a1_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  player_a2_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  player_b1_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  player_b2_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Completed Matches
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
  player_a1_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  player_a2_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  player_b1_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  player_b2_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  winner_team TEXT CHECK (winner_team IN ('A', 'B')),
  score_a INTEGER DEFAULT 0,
  score_b INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Waiting Queue
CREATE TABLE IF NOT EXISTS public.queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  queue_number INTEGER NOT NULL,
  session_name TEXT DEFAULT 'Open Play',
  status public.queue_status DEFAULT 'waiting'::public.queue_status,
  checked_in_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Credit Packages
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_php INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Credit Transactions
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.credit_packages(id) ON DELETE SET NULL,
  credits_delta INTEGER NOT NULL,
  reason TEXT DEFAULT '',
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_player_id ON public.user_profiles(player_id);
CREATE INDEX IF NOT EXISTS idx_courts_status ON public.courts(status);
CREATE INDEX IF NOT EXISTS idx_active_matches_court_id ON public.active_matches(court_id);
CREATE INDEX IF NOT EXISTS idx_matches_played_at ON public.matches(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON public.queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_player_id ON public.queue_entries(player_id);

-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- Auto-generate player_id like PKL-2026-XXXX
CREATE OR REPLACE FUNCTION public.generate_player_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_id TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM public.user_profiles WHERE player_id IS NOT NULL;
  new_id := 'PKL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_id;
END;
$$;

-- Trigger function: create user_profiles row on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assigned_role public.user_role;
  assigned_player_id TEXT;
BEGIN
  assigned_role := COALESCE(
    (NEW.raw_user_meta_data->>'role')::public.user_role,
    'player'::public.user_role
  );

  IF assigned_role = 'player' THEN
    assigned_player_id := public.generate_player_id();
  ELSE
    assigned_player_id := NULL;
  END IF;

  INSERT INTO public.user_profiles (
    id, email, full_name, avatar_url, role, player_id,
    skill_level, credits
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    assigned_role,
    assigned_player_id,
    COALESCE(
      (NEW.raw_user_meta_data->>'skill_level')::public.skill_level,
      'beginner'::public.skill_level
    ),
    0
  );
  RETURN NEW;
END;
$$;

-- Role check helper (safe — queries auth.users not user_profiles)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(raw_user_meta_data->>'role', 'player')
  FROM auth.users
  WHERE id = auth.uid();
$$;

-- Staff/admin check
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      raw_user_meta_data->>'role' IN ('staff', 'admin')
      OR raw_app_meta_data->>'role' IN ('staff', 'admin')
    )
  );
$$;

-- Admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      raw_user_meta_data->>'role' = 'admin'
      OR raw_app_meta_data->>'role' = 'admin'
    )
  );
$$;

-- ============================================================
-- 5. ENABLE RLS
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- user_profiles: own row + staff/admin full access
DROP POLICY IF EXISTS "users_manage_own_profile" ON public.user_profiles;
CREATE POLICY "users_manage_own_profile"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "staff_admin_view_all_profiles" ON public.user_profiles;
CREATE POLICY "staff_admin_view_all_profiles"
ON public.user_profiles FOR SELECT TO authenticated
USING (public.is_staff_or_admin());

DROP POLICY IF EXISTS "staff_admin_update_profiles" ON public.user_profiles;
CREATE POLICY "staff_admin_update_profiles"
ON public.user_profiles FOR UPDATE TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- courts: all authenticated can read; staff/admin can write
DROP POLICY IF EXISTS "all_read_courts" ON public.courts;
CREATE POLICY "all_read_courts"
ON public.courts FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "staff_admin_write_courts" ON public.courts;
CREATE POLICY "staff_admin_write_courts"
ON public.courts FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- active_matches: all authenticated can read; staff/admin can write
DROP POLICY IF EXISTS "all_read_active_matches" ON public.active_matches;
CREATE POLICY "all_read_active_matches"
ON public.active_matches FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "staff_admin_write_active_matches" ON public.active_matches;
CREATE POLICY "staff_admin_write_active_matches"
ON public.active_matches FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- matches: all authenticated can read; staff/admin can write
DROP POLICY IF EXISTS "all_read_matches" ON public.matches;
CREATE POLICY "all_read_matches"
ON public.matches FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "staff_admin_write_matches" ON public.matches;
CREATE POLICY "staff_admin_write_matches"
ON public.matches FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- queue_entries: players see own; staff/admin see all
DROP POLICY IF EXISTS "players_view_own_queue" ON public.queue_entries;
CREATE POLICY "players_view_own_queue"
ON public.queue_entries FOR SELECT TO authenticated
USING (player_id = auth.uid() OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "players_insert_own_queue" ON public.queue_entries;
CREATE POLICY "players_insert_own_queue"
ON public.queue_entries FOR INSERT TO authenticated
WITH CHECK (player_id = auth.uid() OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "staff_admin_update_queue" ON public.queue_entries;
CREATE POLICY "staff_admin_update_queue"
ON public.queue_entries FOR UPDATE TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

DROP POLICY IF EXISTS "staff_admin_delete_queue" ON public.queue_entries;
CREATE POLICY "staff_admin_delete_queue"
ON public.queue_entries FOR DELETE TO authenticated
USING (public.is_staff_or_admin());

-- credit_packages: all authenticated can read; admin can write
DROP POLICY IF EXISTS "all_read_credit_packages" ON public.credit_packages;
CREATE POLICY "all_read_credit_packages"
ON public.credit_packages FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "admin_write_credit_packages" ON public.credit_packages;
CREATE POLICY "admin_write_credit_packages"
ON public.credit_packages FOR ALL TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- credit_transactions: players see own; staff/admin see all
DROP POLICY IF EXISTS "players_view_own_transactions" ON public.credit_transactions;
CREATE POLICY "players_view_own_transactions"
ON public.credit_transactions FOR SELECT TO authenticated
USING (player_id = auth.uid() OR public.is_staff_or_admin());

DROP POLICY IF EXISTS "staff_admin_write_transactions" ON public.credit_transactions;
CREATE POLICY "staff_admin_write_transactions"
ON public.credit_transactions FOR ALL TO authenticated
USING (public.is_staff_or_admin()) WITH CHECK (public.is_staff_or_admin());

-- ============================================================
-- 7. TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 8. MOCK DATA
-- ============================================================
DO $$
DECLARE
  admin_uuid UUID := gen_random_uuid();
  staff_uuid UUID := gen_random_uuid();
  player1_uuid UUID := gen_random_uuid();
  player2_uuid UUID := gen_random_uuid();
  player3_uuid UUID := gen_random_uuid();
  player4_uuid UUID := gen_random_uuid();
  court1_uuid UUID := gen_random_uuid();
  court2_uuid UUID := gen_random_uuid();
  court3_uuid UUID := gen_random_uuid();
  court4_uuid UUID := gen_random_uuid();
  court5_uuid UUID := gen_random_uuid();
  court6_uuid UUID := gen_random_uuid();
  pkg1_uuid UUID := gen_random_uuid();
  pkg2_uuid UUID := gen_random_uuid();
  pkg3_uuid UUID := gen_random_uuid();
BEGIN
  -- Auth users (trigger creates user_profiles automatically)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at, email_change_token_new, email_change,
    email_change_sent_at, email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at, phone, phone_change,
    phone_change_token, phone_change_sent_at
  ) VALUES
    (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'admin@pickleclub.ph', crypt('admin123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Admin User', 'role', 'admin'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (staff_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'staff@pickleclub.ph', crypt('staff123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Juan Reyes', 'role', 'staff'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (player1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'juan@pickleclub.ph', crypt('player123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Juan Dela Cruz', 'role', 'player', 'skill_level', 'advanced'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (player2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'maria@pickleclub.ph', crypt('player123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Maria Santos', 'role', 'player', 'skill_level', 'intermediate'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (player3_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'shawn@pickleclub.ph', crypt('player123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Shawn Cruz', 'role', 'player', 'skill_level', 'beginner'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
    (player4_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'peter@pickleclub.ph', crypt('player123', gen_salt('bf', 10)), now(), now(), now(),
     jsonb_build_object('full_name', 'Peter Lim', 'role', 'player', 'skill_level', 'intermediate'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
  ON CONFLICT (id) DO NOTHING;

  -- Update player stats (trigger creates profiles, we update stats after)
  UPDATE public.user_profiles SET
    credits = 9, games_played = 145, wins = 91, losses = 54,
    rating = 1515, court_hours = 53.4, current_streak = 3, longest_streak = 11
  WHERE id = player1_uuid;

  UPDATE public.user_profiles SET
    credits = 7, games_played = 88, wins = 52, losses = 36,
    rating = 1480, court_hours = 32.1, current_streak = 1, longest_streak = 7
  WHERE id = player2_uuid;

  UPDATE public.user_profiles SET
    credits = 5, games_played = 34, wins = 14, losses = 20,
    rating = 1250, court_hours = 12.5, current_streak = 0, longest_streak = 3
  WHERE id = player3_uuid;

  UPDATE public.user_profiles SET
    credits = 12, games_played = 67, wins = 38, losses = 29,
    rating = 1390, court_hours = 24.8, current_streak = 2, longest_streak = 6
  WHERE id = player4_uuid;

  -- Courts
  INSERT INTO public.courts (id, name, court_number, status, today_games, lifetime_hours) VALUES
    (court1_uuid, 'Court 1', 1, 'playing'::public.court_status, 3, 1240.5),
    (court2_uuid, 'Court 2', 2, 'playing'::public.court_status, 2, 980.0),
    (court3_uuid, 'Court 3', 3, 'playing'::public.court_status, 4, 1560.2),
    (court4_uuid, 'Court 4', 4, 'playing'::public.court_status, 1, 820.7),
    (court5_uuid, 'Court 5', 5, 'available'::public.court_status, 0, 650.3),
    (court6_uuid, 'Court 6', 6, 'maintenance'::public.court_status, 0, 430.1)
  ON CONFLICT (court_number) DO NOTHING;

  -- Active matches
  INSERT INTO public.active_matches (court_id, player_a1_id, player_a2_id, player_b1_id, player_b2_id, started_at) VALUES
    (court1_uuid, player1_uuid, player2_uuid, player3_uuid, player4_uuid, NOW() - INTERVAL '18 minutes')
  ON CONFLICT (id) DO NOTHING;

  -- Queue entries
  INSERT INTO public.queue_entries (player_id, queue_number, session_name, status) VALUES
    (player1_uuid, 4, 'Morning Open Play', 'waiting'::public.queue_status),
    (player2_uuid, 5, 'Morning Open Play', 'waiting'::public.queue_status),
    (player3_uuid, 6, 'Morning Open Play', 'waiting'::public.queue_status)
  ON CONFLICT (id) DO NOTHING;

  -- Credit packages
  INSERT INTO public.credit_packages (id, name, price_php, credits) VALUES
    (pkg1_uuid, 'Starter', 250, 5),
    (pkg2_uuid, 'Standard', 450, 10),
    (pkg3_uuid, 'Premium', 800, 20)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data error: %', SQLERRM;
END $$;

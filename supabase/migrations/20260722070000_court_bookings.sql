-- court_bookings module
-- Adds court_bookings table with confirm flow for staff/admin

-- 1. Enum type
DROP TYPE IF EXISTS public.booking_status CASCADE;
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- 2. Table
CREATE TABLE IF NOT EXISTS public.court_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  court_name TEXT NOT NULL DEFAULT '',
  court_surface TEXT NOT NULL DEFAULT 'Hardcourt',
  booking_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 1,
  players_count INTEGER NOT NULL DEFAULT 2,
  status public.booking_status NOT NULL DEFAULT 'pending'::public.booking_status,
  total_credits INTEGER NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  confirmed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_court_bookings_player_id ON public.court_bookings(player_id);
CREATE INDEX IF NOT EXISTS idx_court_bookings_status ON public.court_bookings(status);
CREATE INDEX IF NOT EXISTS idx_court_bookings_booking_date ON public.court_bookings(booking_date);

-- 4. Helper function to check staff/admin role (BEFORE RLS policies)
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('staff', 'admin')
  )
$$;

-- 5. Enable RLS
ALTER TABLE public.court_bookings ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Players can view their own bookings
DROP POLICY IF EXISTS "players_view_own_bookings" ON public.court_bookings;
CREATE POLICY "players_view_own_bookings"
ON public.court_bookings
FOR SELECT
TO authenticated
USING (player_id = auth.uid() OR public.is_staff_or_admin());

-- Players can insert their own bookings
DROP POLICY IF EXISTS "players_insert_own_bookings" ON public.court_bookings;
CREATE POLICY "players_insert_own_bookings"
ON public.court_bookings
FOR INSERT
TO authenticated
WITH CHECK (player_id = auth.uid());

-- Players can cancel their own pending bookings; staff/admin can update any booking
DROP POLICY IF EXISTS "bookings_update_policy" ON public.court_bookings;
CREATE POLICY "bookings_update_policy"
ON public.court_bookings
FOR UPDATE
TO authenticated
USING (player_id = auth.uid() OR public.is_staff_or_admin())
WITH CHECK (player_id = auth.uid() OR public.is_staff_or_admin());

-- Only staff/admin can delete bookings
DROP POLICY IF EXISTS "staff_admin_delete_bookings" ON public.court_bookings;
CREATE POLICY "staff_admin_delete_bookings"
ON public.court_bookings
FOR DELETE
TO authenticated
USING (public.is_staff_or_admin());

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_court_bookings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_court_bookings_updated_at ON public.court_bookings;
CREATE TRIGGER trg_court_bookings_updated_at
BEFORE UPDATE ON public.court_bookings
FOR EACH ROW EXECUTE FUNCTION public.set_court_bookings_updated_at();

-- 8. Mock data
DO $$
DECLARE
  player_id UUID;
  staff_id UUID;
BEGIN
  SELECT id INTO player_id FROM public.user_profiles WHERE role = 'player' LIMIT 1;
  SELECT id INTO staff_id FROM public.user_profiles WHERE role IN ('staff', 'admin') LIMIT 1;

  IF player_id IS NOT NULL THEN
    INSERT INTO public.court_bookings (
      id, player_id, court_name, court_surface, booking_date, time_slot,
      duration, players_count, status, total_credits, notes, confirmed_by, confirmed_at
    ) VALUES
      (
        gen_random_uuid(), player_id, 'Court 3', 'Cushioned',
        CURRENT_DATE + 2, '10:00', 2, 4,
        'pending'::public.booking_status, 40,
        'Please arrive 10 minutes early for warm-up.', NULL, NULL
      ),
      (
        gen_random_uuid(), player_id, 'Court 1', 'Hardcourt',
        CURRENT_DATE + 4, '16:00', 1, 2,
        'pending'::public.booking_status, 20,
        '', NULL, NULL
      ),
      (
        gen_random_uuid(), player_id, 'Court 5', 'Hardcourt',
        CURRENT_DATE - 2, '08:00', 1, 4,
        'cancelled'::public.booking_status, 0,
        '', NULL, NULL
      )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'No player found for mock court_bookings data.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock court_bookings data failed: %', SQLERRM;
END $$;

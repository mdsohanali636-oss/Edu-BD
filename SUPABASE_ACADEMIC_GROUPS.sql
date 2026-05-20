-- SUPABASE ACADEMIC GROUPS SYNC
-- This script adds support for academic groups (Science, Humanities, Commerce)

-- 1. Create Academic Groups Table
CREATE TABLE IF NOT EXISTS public.academic_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE, -- Science, Humanities, Commerce, etc.
  active BOOLEAN DEFAULT TRUE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial groups if not exists
INSERT INTO public.academic_groups (name, "order")
VALUES 
  ('Science', 1),
  ('Humanities', 2),
  ('Commerce', 3)
ON CONFLICT (name) DO NOTHING;

-- 2. Add academic_group to all relevant tables
DO $$ 
DECLARE
    t TEXT;
BEGIN 
    -- Content tables
    FOR t IN ARRAY ARRAY['notes', 'books', 'video_classes', 'practice_sheets', 'question_papers', 'external_links', 'playlists', 'exams', 'questions', 'subjects'] LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS academic_group TEXT DEFAULT ''All''', t);
    END LOOP;
END $$;

-- 3. Add academic_group to Profiles for user preference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS academic_group TEXT DEFAULT 'All';

-- 4. Enable RLS on academic_groups
ALTER TABLE public.academic_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public View Academic Groups" ON public.academic_groups;
CREATE POLICY "Public View Academic Groups" ON public.academic_groups FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admin Manage Academic Groups" ON public.academic_groups;
CREATE POLICY "Admin Manage Academic Groups" ON public.academic_groups FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

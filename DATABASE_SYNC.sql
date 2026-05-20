-- COMPLETE DATABASE RECOVERY & SYNC SCRIPT
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- ==========================================
-- 1. ENSURE BASE TABLES EXIST
-- ==========================================

-- Profiles (User Data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user',
  can_upload BOOLEAN DEFAULT FALSE,
  full_name TEXT,
  phone_number TEXT,
  photo_url TEXT,
  has_premium_access BOOLEAN DEFAULT FALSE,
  premium_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources (Notes, Books, Question Papers)
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  academic_class TEXT,
  subject TEXT,
  url TEXT NOT NULL,
  thumbnail TEXT,
  chapter TEXT,
  chapter_id UUID,
  tags TEXT[],
  author_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlists (YouTube Playlists)
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_ids TEXT[],
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  thumbnail TEXT,
  author_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- External Resources (Shortcuts)
CREATE TABLE IF NOT EXISTS public.external_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '🌐',
  thumbnail TEXT,
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exams
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  chapter_name_custom TEXT,
  exam_type TEXT DEFAULT 'mcq',
  time_limit INTEGER DEFAULT 30,
  total_questions_to_show INTEGER DEFAULT 30,
  negative_marking BOOLEAN DEFAULT FALSE,
  negative_value REAL DEFAULT 0.25,
  created_by UUID REFERENCES auth.users(id),
  is_premium BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  topic_ids TEXT[],
  mcq_count INTEGER,
  written_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer INTEGER,
  explanation TEXT,
  points INTEGER DEFAULT 1,
  type TEXT DEFAULT 'mcq',
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  topic_id TEXT,
  question_image TEXT,
  option_a_image TEXT,
  option_b_image TEXT,
  option_c_image TEXT,
  option_d_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. ENABLE RLS & POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------
-- RESOURCES POLICIES
-- ------------------------------------------
DROP POLICY IF EXISTS "Public View Resources" ON public.resources;
CREATE POLICY "Public View Resources" ON public.resources 
FOR SELECT USING (
  status = 'approved' 
  OR auth.uid() = author_id 
  OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Upload Resources" ON public.resources;
CREATE POLICY "Upload Resources" ON public.resources 
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR can_upload = true)
);

DROP POLICY IF EXISTS "Update Resources" ON public.resources;
CREATE POLICY "Update Resources" ON public.resources 
FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
  OR (auth.uid() = author_id)
);

DROP POLICY IF EXISTS "Delete Resources" ON public.resources;
CREATE POLICY "Delete Resources" ON public.resources 
FOR DELETE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- ------------------------------------------
-- PLAYLISTS POLICIES
-- ------------------------------------------
DROP POLICY IF EXISTS "Public View Playlists" ON public.playlists;
CREATE POLICY "Public View Playlists" ON public.playlists 
FOR SELECT USING (status = 'approved' OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

DROP POLICY IF EXISTS "Manage Playlists" ON public.playlists;
CREATE POLICY "Manage Playlists" ON public.playlists 
FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR can_upload = true));

-- ------------------------------------------
-- EXTERNAL RESOURCES POLICIES
-- ------------------------------------------
DROP POLICY IF EXISTS "Public View Externals" ON public.external_resources;
CREATE POLICY "Public View Externals" ON public.external_resources 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Externals" ON public.external_resources;
CREATE POLICY "Manage Externals" ON public.external_resources 
FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- ------------------------------------------
-- EXAMS & QUESTIONS POLICIES
-- ------------------------------------------
DROP POLICY IF EXISTS "Public View Exams" ON public.exams;
CREATE POLICY "Public View Exams" ON public.exams 
FOR SELECT USING (status = 'approved' OR auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR can_upload = true));

DROP POLICY IF EXISTS "Manage Exams" ON public.exams;
CREATE POLICY "Manage Exams" ON public.exams 
FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR can_upload = true));

DROP POLICY IF EXISTS "Public View Questions" ON public.questions;
CREATE POLICY "Public View Questions" ON public.questions 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage Questions" ON public.questions;
CREATE POLICY "Manage Questions" ON public.questions 
FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin' OR can_upload = true));

-- ==========================================
-- 3. FINAL SYNC CHECK (Add columns if missing or fix constraints)
-- ==========================================
DO $$ 
BEGIN 
  -- Sync profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'can_upload') THEN
    ALTER TABLE public.profiles ADD COLUMN can_upload BOOLEAN DEFAULT FALSE;
  END IF;

  -- Explicitly sync admin role for the main user
  UPDATE public.profiles 
  SET role = 'admin', can_upload = true 
  WHERE email = 'mdsohanali636@gmail.com';

  -- Sync resources
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resources' AND table_schema = 'public') THEN
    -- If 'type' column exists, make it nullable to avoid insert errors
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'resources' AND table_schema = 'public' AND column_name = 'type') THEN
      ALTER TABLE public.resources ALTER COLUMN "type" DROP NOT NULL;
    END IF;
  END IF;
END $$;

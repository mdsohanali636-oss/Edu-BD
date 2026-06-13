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
  explanation TEXT, -- Holds serialized solutions if columns below are missing
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
  academic_group TEXT DEFAULT 'All',
  
  -- CENTRALISED QUESTION BANK EXTRA OPTIONAL COLUMNS (Auto-safe fallback if not physically run)
  difficulty TEXT DEFAULT 'medium',
  is_premium BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'published',
  tags TEXT[] DEFAULT '{}',
  explanation_image TEXT,
  negative_marks REAL DEFAULT 0.25,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: If you are upgrading an existing table, you can execute these statements:
-- ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
-- ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
-- ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
-- ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
-- ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation_image TEXT;
-- ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS negative_marks REAL DEFAULT 0.25;
-- ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS academic_group TEXT DEFAULT 'All';

-- ==========================================
-- 2. ENABLE RLS & POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
) WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

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

  -- Sync subscription_settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_settings' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_settings' AND column_name = 'global_premium_mode') THEN
      ALTER TABLE public.subscription_settings ADD COLUMN global_premium_mode BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_settings' AND column_name = 'global_premium_last_enabled_at') THEN
      ALTER TABLE public.subscription_settings ADD COLUMN global_premium_last_enabled_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_settings' AND column_name = 'global_premium_last_disabled_at') THEN
      ALTER TABLE public.subscription_settings ADD COLUMN global_premium_last_disabled_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscription_settings' AND column_name = 'global_premium_enabled_by') THEN
      ALTER TABLE public.subscription_settings ADD COLUMN global_premium_enabled_by TEXT;
    END IF;
  END IF;
END $$;

-- SUBSCRIPTION SYSTEM TABLES
CREATE TABLE IF NOT EXISTS public.subscription_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  current_price NUMERIC NOT NULL DEFAULT 500,
  old_price NUMERIC DEFAULT 1000,
  discount_percent NUMERIC DEFAULT 50,
  poster_image_url TEXT,
  poster_title TEXT DEFAULT 'Parodorshhi Premium',
  poster_description TEXT DEFAULT 'Get access to premium exams, performance analytics, and practice sheets',
  payment_number_bkash TEXT DEFAULT '01700000000',
  payment_number_nagad TEXT DEFAULT '01900000000',
  is_subscription_enabled BOOLEAN DEFAULT TRUE,
  global_premium_mode BOOLEAN DEFAULT FALSE,
  global_premium_last_enabled_at TIMESTAMPTZ,
  global_premium_last_disabled_at TIMESTAMPTZ,
  global_premium_enabled_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select settings" ON public.subscription_settings;
CREATE POLICY "Allow public select settings" ON public.subscription_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin all settings" ON public.subscription_settings;
CREATE POLICY "Allow admin all settings" ON public.subscription_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.subscription_settings (id, current_price, old_price, discount_percent, poster_image_url, poster_title, poster_description, payment_number_bkash, payment_number_nagad, is_subscription_enabled)
VALUES ('default', 500, 1000, 50, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop', 'Parodorshhi Premium', 'Get full access to all premium exams, in-depth subject-specific interactive analytics, exclusive books and notes, and automatic future premium modules.', '01712345678', '01912345678', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.subscription_packages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  duration_days INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  old_price NUMERIC,
  discount_percent NUMERIC,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select packages" ON public.subscription_packages;
CREATE POLICY "Allow public select packages" ON public.subscription_packages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin all packages" ON public.subscription_packages;
CREATE POLICY "Allow admin all packages" ON public.subscription_packages FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.subscription_packages (name, duration_days, price, old_price, discount_percent, is_active)
VALUES 
  ('1 Month', 30, 500, 1000, 50, TRUE),
  ('3 Months', 90, 1200, 2400, 50, TRUE),
  ('6 Months', 180, 2000, 4000, 50, TRUE),
  ('12 Months', 365, 3500, 7000, 50, TRUE)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.subscription_benefits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_benefits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select benefits" ON public.subscription_benefits;
CREATE POLICY "Allow public select benefits" ON public.subscription_benefits FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin all benefits" ON public.subscription_benefits;
CREATE POLICY "Allow admin all benefits" ON public.subscription_benefits FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.subscription_benefits (text, is_active)
VALUES 
  ('Premium Exams', TRUE),
  ('Advanced Performance Analytics', TRUE),
  ('Exclusive Resources', TRUE),
  ('Future Premium Features', TRUE)
ON CONFLICT (text) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_id TEXT UNIQUE NOT NULL,
  payment_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own request" ON public.subscription_requests;
CREATE POLICY "Users can view own request" ON public.subscription_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own request" ON public.subscription_requests;
CREATE POLICY "Users can insert own request" ON public.subscription_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage subscription requests" ON public.subscription_requests;
CREATE POLICY "Admins can manage subscription requests" ON public.subscription_requests FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));


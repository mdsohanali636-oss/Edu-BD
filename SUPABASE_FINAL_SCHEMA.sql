-- FINAL HARMONIZED TYPE-SPECIFIC SCHEMA
-- This schema defines dedicated tables for each content type with only relevant fields.

-- 1. NOTES Table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail TEXT,
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  chapter_id UUID REFERENCES public.chapters(id),
  topic_id UUID REFERENCES public.topics(id),
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  status TEXT DEFAULT 'pending',
  active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BOOKS Table
CREATE TABLE IF NOT EXISTS public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail TEXT,
  year TEXT,
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  chapter_id UUID REFERENCES public.chapters(id),
  topic_id UUID REFERENCES public.topics(id),
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  status TEXT DEFAULT 'pending',
  active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VIDEO CLASSES Table
CREATE TABLE IF NOT EXISTS public.video_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL, -- YouTube ID
  thumbnail TEXT,
  channel_name TEXT,
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  chapter_id UUID REFERENCES public.chapters(id),
  topic_id UUID REFERENCES public.topics(id),
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  status TEXT DEFAULT 'pending',
  active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRACTICE SHEETS Table
CREATE TABLE IF NOT EXISTS public.practice_sheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail TEXT,
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  chapter_id UUID REFERENCES public.chapters(id),
  topic_id UUID REFERENCES public.topics(id),
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  status TEXT DEFAULT 'pending',
  active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. QUESTION PAPERS Table
CREATE TABLE IF NOT EXISTS public.question_papers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail TEXT,
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  chapter_id UUID REFERENCES public.chapters(id),
  topic_id UUID REFERENCES public.topics(id),
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  status TEXT DEFAULT 'pending',
  active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EXTERNAL LINKS Table
CREATE TABLE IF NOT EXISTS public.external_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '🌐',
  thumbnail TEXT,
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  chapter_id UUID REFERENCES public.chapters(id),
  topic_id UUID REFERENCES public.topics(id),
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  status TEXT DEFAULT 'pending',
  active BOOLEAN DEFAULT TRUE,
  is_premium BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PLAYLISTS Table
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  author_id UUID REFERENCES auth.users(id),
  type TEXT DEFAULT 'youtube', -- 'youtube' or 'custom'
  youtube_playlist_id TEXT,
  video_ids TEXT[],
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  chapter_id UUID REFERENCES public.chapters(id),
  topic_id UUID REFERENCES public.topics(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT FALSE
);

-- ENABLE RLS on all tables
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_links ENABLE ROW LEVEL SECURITY;

-- 8. USER_ROLES Table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT DEFAULT 'user',
  can_upload BOOLEAN DEFAULT FALSE,
  can_manage_exams BOOLEAN DEFAULT FALSE,
  can_manage_questions BOOLEAN DEFAULT FALSE,
  can_manage_resources BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public user_roles viewable by everyone" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins can manage all user_roles" ON public.user_roles ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Users can insert own roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

-- RE-APPLY POLICIES (Handled in SUPABASE_POLICIES_V2.sql)

-- SUPABASE_SYNC_COMPLETE.sql
-- COMPLETE SCHEMA SYNC FOR RESOURCE TABLES
-- This script safely creates and harmonizes all tables used by the frontend.

-- 1. BASE CONTENT TABLES (Shared Schema + Type-Specific Fields)
DO $$ 
DECLARE
    t TEXT;
BEGIN 
    -- List of all specialized content tables
    FOR t IN ARRAY ARRAY['notes', 'books', 'video_classes', 'practice_sheets', 'question_papers', 'external_links'] LOOP
        EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (id UUID DEFAULT gen_random_uuid() PRIMARY KEY)', t);
        
        -- Essential Metadata
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS title TEXT NOT NULL', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS description TEXT', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS url TEXT NOT NULL', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS thumbnail TEXT', t);
        
        -- Categorization (Harmonization)
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS academic_class TEXT', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS subject TEXT', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS chapter TEXT', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id)', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id)', t);
        
        -- Identity & State
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id)', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS author_name TEXT', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS status TEXT DEFAULT ''pending''', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tags TEXT[]', t);
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()', t);
    END LOOP;
END $$;

-- 2. TYPE-SPECIFIC COLUMN AUDIT (Adding unique fields)
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS year TEXT;
ALTER TABLE public.video_classes ADD COLUMN IF NOT EXISTS channel_name TEXT;
ALTER TABLE public.external_links ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🌐';

-- 3. PLAYLISTS TABLE (Structured for Content Aggregation)
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
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS ENFORCEMENT (Audit & Re-apply)
DO $$ 
DECLARE
    t TEXT;
BEGIN 
    FOR t IN ARRAY ARRAY['notes', 'books', 'video_classes', 'practice_sheets', 'question_papers', 'external_links', 'playlists'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        
        -- View Policy: Public approved or Private author/admin
        EXECUTE format('DROP POLICY IF EXISTS "View Policy %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "View Policy %I" ON public.%I FOR SELECT USING (
            active = true AND (status = ''approved'' OR auth.uid() = author_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''admin'')
        )', t, t);

        -- Modification Policy: Author or Admin
        EXECUTE format('DROP POLICY IF EXISTS "Mod Policy %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Mod Policy %I" ON public.%I FOR ALL USING (
            auth.uid() = author_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''admin''
        )', t, t);
    END LOOP;
END $$;

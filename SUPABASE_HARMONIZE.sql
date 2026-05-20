-- HARMONIZE SUPABASE TABLES SCHEMA
-- This script ensures all content tables have a fully consistent schema.
-- Add missing columns to: notes, books, practice_sheets, video_classes, playlists, external_links

DO $$ 
DECLARE
    table_names TEXT[] := ARRAY['notes', 'books', 'practice_sheets', 'video_classes', 'playlists', 'external_links'];
    t TEXT;
BEGIN 
    FOREACH t IN ARRAY table_names LOOP
        -- academic_class
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'academic_class') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN academic_class TEXT', t);
        END IF;

        -- subject
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'subject') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN subject TEXT', t);
        END IF;

        -- chapter
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'chapter') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN chapter TEXT', t);
        END IF;

        -- chapter_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'chapter_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN chapter_id UUID', t);
        END IF;

        -- topic_id
        -- Add active column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'active') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN active BOOLEAN DEFAULT true', t);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'topic_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN topic_id UUID', t);
        END IF;

        -- author_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'author_id') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN author_id UUID REFERENCES auth.users(id)', t);
        END IF;

        -- author_name
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'author_name') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN author_name TEXT', t);
        END IF;

        -- status
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'status') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN status TEXT DEFAULT ''approved''', t);
        END IF;

        -- is_premium
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'is_premium') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN is_premium BOOLEAN DEFAULT FALSE', t);
        END IF;

        -- active
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'active') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN active BOOLEAN DEFAULT TRUE', t);
        END IF;

        -- description
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'description') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN description TEXT', t);
        END IF;

        -- thumbnail
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'thumbnail') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN thumbnail TEXT', t);
        END IF;

        -- tags
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'tags') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN tags TEXT[]', t);
        END IF;
    END LOOP;

    -- Special columns for specific tables (added to all for consistency as requested)
    FOREACH t IN ARRAY table_names LOOP
        -- channel_name
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'channel_name') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN channel_name TEXT', t);
        END IF;

        -- year
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'year') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN year TEXT', t);
        END IF;

        -- url (playlists already has video_ids/youtube_playlist_id)
        IF t != 'playlists' AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'url') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN url TEXT', t);
        END IF;
    END LOOP;
END $$;

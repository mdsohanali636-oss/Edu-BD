-- SUPABASE SCHEMA CLEANUP
-- Remove unnecessary shared fields from unrelated resource types.

DO $$ 
BEGIN 
    -- Notes
    ALTER TABLE public.notes DROP COLUMN IF EXISTS year;
    ALTER TABLE public.notes DROP COLUMN IF EXISTS channel_name;
    ALTER TABLE public.notes DROP COLUMN IF EXISTS icon;
    ALTER TABLE public.notes DROP COLUMN IF EXISTS youtube_playlist_id;
    ALTER TABLE public.notes DROP COLUMN IF EXISTS video_ids;

    -- Practice Sheets
    ALTER TABLE public.practice_sheets DROP COLUMN IF EXISTS year;
    ALTER TABLE public.practice_sheets DROP COLUMN IF EXISTS channel_name;
    ALTER TABLE public.practice_sheets DROP COLUMN IF EXISTS icon;
    ALTER TABLE public.practice_sheets DROP COLUMN IF EXISTS youtube_playlist_id;
    ALTER TABLE public.practice_sheets DROP COLUMN IF EXISTS video_ids;

    -- Book Table (keep year)
    ALTER TABLE public.books DROP COLUMN IF EXISTS channel_name;
    ALTER TABLE public.books DROP COLUMN IF EXISTS icon;
    ALTER TABLE public.books DROP COLUMN IF EXISTS youtube_playlist_id;
    ALTER TABLE public.books DROP COLUMN IF EXISTS video_ids;

    -- Video Classes (keep channel_name)
    ALTER TABLE public.video_classes DROP COLUMN IF EXISTS year;
    ALTER TABLE public.video_classes DROP COLUMN IF EXISTS icon;
    ALTER TABLE public.video_classes DROP COLUMN IF EXISTS youtube_playlist_id;
    ALTER TABLE public.video_classes DROP COLUMN IF EXISTS video_ids;

    -- External Links (keep icon)
    ALTER TABLE public.external_links DROP COLUMN IF EXISTS year;
    ALTER TABLE public.external_links DROP COLUMN IF EXISTS channel_name;
    ALTER TABLE public.external_links DROP COLUMN IF EXISTS youtube_playlist_id;
    ALTER TABLE public.external_links DROP COLUMN IF EXISTS video_ids;

    -- Playlists (keep youtube_playlist_id, video_ids)
    ALTER TABLE public.playlists DROP COLUMN IF EXISTS year;
    ALTER TABLE public.playlists DROP COLUMN IF EXISTS channel_name;
    ALTER TABLE public.playlists DROP COLUMN IF EXISTS icon;
    ALTER TABLE public.playlists DROP COLUMN IF EXISTS url;

END $$;

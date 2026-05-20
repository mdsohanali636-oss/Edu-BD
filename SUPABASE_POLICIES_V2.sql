-- FINAL HARMONIZED RLS POLICIES FOR ALL CONTENT TABLES
-- Tables: notes, books, video_classes, practice_sheets, playlists, external_links

DO $$ 
DECLARE
    table_names TEXT[] := ARRAY['notes', 'books', 'video_classes', 'practice_sheets', 'playlists', 'external_links'];
    t TEXT;
BEGIN 
    FOREACH t IN ARRAY table_names LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        -- SELECT Policy
        EXECUTE format('DROP POLICY IF EXISTS "Public View %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Public View %I" ON public.%I FOR SELECT USING (
            active = true 
            AND (status = ''approved'' OR auth.uid() = author_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''admin'')
        )', t, t);

        -- INSERT Policy
        EXECUTE format('DROP POLICY IF EXISTS "Insert %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Insert %I" ON public.%I FOR INSERT WITH CHECK (
            auth.uid() IS NOT NULL 
            AND (
                (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''admin'' 
                OR (SELECT can_upload FROM public.profiles WHERE id = auth.uid()) = true
            )
        )', t, t);

        -- UPDATE Policy
        EXECUTE format('DROP POLICY IF EXISTS "Update %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Update %I" ON public.%I FOR UPDATE USING (
            auth.uid() = author_id 
            OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''admin''
        )', t, t);

        -- DELETE Policy
        EXECUTE format('DROP POLICY IF EXISTS "Delete %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Delete %I" ON public.%I FOR DELETE USING (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''admin''
            OR auth.uid() = author_id
        )', t, t);
    END LOOP;
END $$;

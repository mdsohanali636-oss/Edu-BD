-- DEDICATED POSTER STORAGE SETUP FOR SUPABASE
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Create a dedicated storage bucket for poster uploads (if not already existing)
INSERT INTO storage.buckets (id, name, public)
VALUES ('posters', 'posters', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Note: RLS is already enabled on storage.objects by default in Supabase.
-- Attempting to run ALTER TABLE on it will fail with a "must be owner of table objects" error.
-- We skip ALTER TABLE and directly declare our custom policies:

-- 2. Clear existing policies to avoid duplications
DROP POLICY IF EXISTS "Anyone can access posters" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload posters" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update posters" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete posters" ON storage.objects;

-- 3. Create Policies for SELECT, INSERT, UPDATE, DELETE

-- Allow everyone (including public anonymous visitors) to view uploaded posters
CREATE POLICY "Anyone can access posters"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posters' );

-- Allow authenticated users with admin status to upload poster files
-- This queries the public.profiles table to check if role is 'admin'
CREATE POLICY "Admins can upload posters"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posters' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated admins to update files in this bucket
CREATE POLICY "Admins can update posters"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'posters' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow authenticated admins to delete files in this bucket
CREATE POLICY "Admins can delete posters"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'posters' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

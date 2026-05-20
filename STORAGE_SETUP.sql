-- STORAGE BUCKET SETUP
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. DROP EXISTING POLICIES (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can access resources" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload resources" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete resources" ON storage.objects;

-- 4. CREATE CLEAN POLICIES

-- Policy: Allow public read access to all files in the 'resources' bucket
CREATE POLICY "Anyone can access resources"
ON storage.objects FOR SELECT
USING ( bucket_id = 'resources' );

-- Policy: Allow authenticated users to upload files to the 'resources' bucket
CREATE POLICY "Authenticated users can upload resources"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resources' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their own files (or any file in this bucket if preferred)
CREATE POLICY "Users can update resources"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resources' 
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete files (or restrict to admins)
CREATE POLICY "Admins can delete resources"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resources' 
  AND auth.role() = 'authenticated'
);

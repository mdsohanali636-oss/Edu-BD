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

-- 9. NEWSLETTER_EMAIL_LOGS Table
CREATE TABLE IF NOT EXISTS public.newsletter_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_email TEXT,
  subject TEXT,
  message TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.newsletter_email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view email logs" ON public.newsletter_email_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage email logs" ON public.newsletter_email_logs ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 10. SUBSCRIPTION_SETTINGS Table
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select settings" ON public.subscription_settings FOR SELECT USING (true);
CREATE POLICY "Allow admin all settings" ON public.subscription_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.subscription_settings (id, current_price, old_price, discount_percent, poster_image_url, poster_title, poster_description, payment_number_bkash, payment_number_nagad, is_subscription_enabled)
VALUES ('default', 500, 1000, 50, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop', 'Parodorshhi Premium', 'Get full access to all premium exams, in-depth subject-specific interactive analytics, exclusive books and notes, and automatic future premium modules.', '01712345678', '01912345678', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 11. SUBSCRIPTION_PACKAGES Table
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
CREATE POLICY "Allow public select packages" ON public.subscription_packages FOR SELECT USING (true);
CREATE POLICY "Allow admin all packages" ON public.subscription_packages FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.subscription_packages (name, duration_days, price, old_price, discount_percent, is_active)
VALUES 
  ('1 Month', 30, 500, 1000, 50, TRUE),
  ('3 Months', 90, 1200, 2400, 50, TRUE),
  ('6 Months', 180, 2000, 4000, 50, TRUE),
  ('12 Months', 365, 3500, 7000, 50, TRUE)
ON CONFLICT (name) DO NOTHING;

-- 12. SUBSCRIPTION_BENEFITS Table
CREATE TABLE IF NOT EXISTS public.subscription_benefits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscription_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select benefits" ON public.subscription_benefits FOR SELECT USING (true);
CREATE POLICY "Allow admin all benefits" ON public.subscription_benefits FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.subscription_benefits (text, is_active)
VALUES 
  ('Premium Exams', TRUE),
  ('Advanced Performance Analytics', TRUE),
  ('Exclusive Resources', TRUE),
  ('Future Premium Features', TRUE)
ON CONFLICT (text) DO NOTHING;

-- 13. SUBSCRIPTION_REQUESTS Table
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
CREATE POLICY "Users can view own request" ON public.subscription_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own request" ON public.subscription_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage subscription requests" ON public.subscription_requests FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RE-APPLY POLICIES (Handled in SUPABASE_POLICIES_V2.sql)

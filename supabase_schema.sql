-- PROFILES table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  academic_class TEXT,
  can_upload BOOLEAN DEFAULT FALSE,
  photo_url TEXT,
  phone_number TEXT,
  has_premium_access BOOLEAN DEFAULT FALSE,
  premium_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
) WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- RESOURCES table (Renamed from CONTENTS)
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  academic_class TEXT,
  subject TEXT,
  url TEXT,
  thumbnail TEXT,
  year TEXT,
  author_name TEXT,
  channel_name TEXT,
  author_id UUID REFERENCES auth.users,
  status TEXT DEFAULT 'pending',
  chapter TEXT,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved resources are viewable by everyone" ON public.resources FOR SELECT USING (status = 'approved');
CREATE POLICY "Admins can view all resources" ON public.resources FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Authors or admins can insert resources" ON public.resources FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR can_upload = true))
);
CREATE POLICY "Authors or admins can update resources" ON public.resources FOR UPDATE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Authors or admins can delete resources" ON public.resources FOR DELETE USING (
  auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- PLAYLISTS table
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  author_id UUID REFERENCES auth.users,
  type TEXT,
  youtube_playlist_id TEXT,
  video_ids TEXT[],
  academic_class TEXT,
  subject TEXT,
  status TEXT DEFAULT 'pending',
  chapter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_premium BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved playlists are viewable by everyone" ON public.playlists FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can view own playlists" ON public.playlists FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Admins can view all playlists" ON public.playlists FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Authenticated users can create playlists" ON public.playlists FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own playlists" ON public.playlists FOR UPDATE USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can delete own playlists" ON public.playlists FOR DELETE USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- EXTERNAL_RESOURCES table
CREATE TABLE IF NOT EXISTS public.external_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '🌐',
  thumbnail TEXT,
  chapter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.external_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "External resources are viewable by everyone" ON public.external_resources FOR SELECT USING (true);
CREATE POLICY "Admins can manage external resources" ON public.external_resources ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- EXAMS table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  academic_class TEXT,
  subject TEXT,
  chapter TEXT,
  chapter_name_custom TEXT,
  topic_ids TEXT[],
  time_limit INTEGER,
  exam_type TEXT,
  total_questions_to_show INTEGER,
  mcq_count INTEGER,
  written_count INTEGER,
  negative_marking BOOLEAN DEFAULT FALSE,
  negative_value FLOAT DEFAULT 0.0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users,
  is_premium BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved exams are viewable by everyone" ON public.exams FOR SELECT USING (status = 'approved');
CREATE POLICY "Admins can view all exams" ON public.exams FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can manage exams" ON public.exams ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- QUESTIONS table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams ON DELETE CASCADE,
  type TEXT,
  question_text TEXT NOT NULL,
  options TEXT[],
  correct_answer TEXT,
  explanation TEXT,
  points INTEGER DEFAULT 1,
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

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions are viewable by everyone" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage questions" ON public.questions ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- EXAM_ATTEMPTS table
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  exam_id UUID REFERENCES public.exams,
  answers JSONB,
  score FLOAT,
  total_questions INTEGER,
  time_taken INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  user_name TEXT,
  total_marks FLOAT,
  correct_count INTEGER,
  wrong_count INTEGER,
  unanswered_count INTEGER,
  is_premium BOOLEAN DEFAULT FALSE,
  academic_class TEXT,
  academic_group TEXT,
  subject TEXT,
  chapter TEXT,
  topic TEXT
);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own exam_attempts" ON public.exam_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all exam_attempts" ON public.exam_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Authenticated users can save exam_attempts" ON public.exam_attempts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- EXAM_ANSWERS table
CREATE TABLE IF NOT EXISTS public.exam_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID REFERENCES public.exam_attempts ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions ON DELETE CASCADE,
  selected_option TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own answers via attempt" ON public.exam_answers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.exam_attempts WHERE id = attempt_id AND user_id = auth.uid())
);

-- LEADERBOARDS table
CREATE TABLE IF NOT EXISTS public.leaderboards (
  id TEXT PRIMARY KEY, -- userId_examId
  academic_class TEXT,
  exam_id UUID REFERENCES public.exams,
  user_id UUID REFERENCES auth.users,
  user_name TEXT,
  user_photo TEXT,
  best_score FLOAT,
  time_taken INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  exam_title TEXT,
  first_submission_at TIMESTAMPTZ DEFAULT NOW(),
  total_attempts INTEGER DEFAULT 1,
  accuracy FLOAT DEFAULT 0.0,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  badge TEXT DEFAULT 'Bronze',
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  unanswered_count INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0
);

ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leaderboards are viewable by everyone" ON public.leaderboards FOR SELECT USING (true);
CREATE POLICY "Users can upsert own leaderboard entries" ON public.leaderboards ALL USING (auth.uid() = user_id);

-- USER_STATS table
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  user_name TEXT,
  user_photo TEXT,
  total_exams INTEGER DEFAULT 0,
  average_score FLOAT DEFAULT 0.0,
  highest_score FLOAT DEFAULT 0.0,
  total_correct INTEGER DEFAULT 0,
  total_wrong INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  badge TEXT DEFAULT 'Bronze',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User stats are viewable by everyone" ON public.user_stats FOR SELECT USING (true);
CREATE POLICY "Users can upsert own user stats" ON public.user_stats ALL USING (auth.uid() = user_id);

-- ACADEMIC_CLASSES table
CREATE TABLE IF NOT EXISTS public.academic_classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Academic classes are viewable by everyone" ON public.academic_classes FOR SELECT USING (true);
CREATE POLICY "Admins can manage academic classes" ON public.academic_classes ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- SUBJECTS table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class_id UUID REFERENCES public.academic_classes ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  "order" INTEGER DEFAULT 0,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subjects are viewable by everyone" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- CHAPTERS table
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects ON DELETE CASCADE,
  class_id UUID REFERENCES public.academic_classes ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  "order" INTEGER DEFAULT 0,
  mcq_count INTEGER DEFAULT 0,
  written_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chapters are viewable by everyone" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Admins can manage chapters" ON public.chapters ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- TOPICS table
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  chapter_id UUID REFERENCES public.chapters ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects ON DELETE CASCADE,
  class_id UUID REFERENCES public.academic_classes ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  "order" INTEGER DEFAULT 0,
  tags TEXT[],
  mcq_count INTEGER DEFAULT 0,
  written_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics are viewable by everyone" ON public.topics FOR SELECT USING (true);
CREATE POLICY "Admins can manage topics" ON public.topics ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- FEEDBACK table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  user_name TEXT,
  content TEXT,
  status TEXT DEFAULT 'unread',
  reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view feedback" ON public.feedback FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update feedback" ON public.feedback FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can view own feedback" ON public.feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can submit feedback" ON public.feedback FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- BOOKMARKS table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  content_id UUID REFERENCES public.resources,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks ALL USING (auth.uid() = user_id);

-- EXAM_TEMPLATES table
CREATE TABLE IF NOT EXISTS public.exam_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.exam_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own exam templates" ON public.exam_templates ALL USING (auth.uid() = user_id);

-- NEWSLETTER_SUBSCRIBERS table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can view subscribers" ON public.newsletter_subscribers FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Public can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);

-- NEWSLETTER_EMAIL_LOGS table
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

-- SUBSCRIPTION_SETTINGS table
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
CREATE POLICY "Allow public select settings" ON public.subscription_settings FOR SELECT USING (true);
CREATE POLICY "Allow admin all settings" ON public.subscription_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.subscription_settings (id, current_price, old_price, discount_percent, poster_image_url, poster_title, poster_description, payment_number_bkash, payment_number_nagad, is_subscription_enabled)
VALUES ('default', 500, 1000, 50, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop', 'Parodorshhi Premium', 'Get full access to all premium exams, in-depth subject-specific interactive analytics, exclusive books and notes, and automatic future premium modules.', '01712345678', '01912345678', TRUE)
ON CONFLICT (id) DO NOTHING;

-- SUBSCRIPTION_PACKAGES table
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

-- SUBSCRIPTION_BENEFITS table
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

-- SUBSCRIPTION_REQUESTS table
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



-- PROFILES table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  academic_class TEXT DEFAULT 'Class 9',
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

-- ATTEMPTS table (Renamed from EXAM_ATTEMPTS)
CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  exam_id UUID REFERENCES public.exams,
  answers JSONB,
  score FLOAT,
  total_questions INTEGER,
  time_taken INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  user_name TEXT,
  user_class TEXT,
  total_marks FLOAT,
  correct_count INTEGER,
  wrong_count INTEGER,
  unanswered_count INTEGER,
  is_premium BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own attempts" ON public.attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all attempts" ON public.attempts FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Authenticated users can save attempts" ON public.attempts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ANSWERS table
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID REFERENCES public.attempts ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions ON DELETE CASCADE,
  selected_option TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(attempt_id, question_id)
);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own answers via attempt" ON public.answers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.attempts WHERE id = attempt_id AND user_id = auth.uid())
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
  total_attempts INTEGER DEFAULT 1
);

ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leaderboards are viewable by everyone" ON public.leaderboards FOR SELECT USING (true);
CREATE POLICY "Users can upsert own leaderboard entries" ON public.leaderboards ALL USING (auth.uid() = user_id);

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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view feedback" ON public.feedback FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
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

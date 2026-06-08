export type Category = 'Notes' | 'Books' | 'Question Papers' | 'YouTube Classes' | 'External Resources' | 'Practice Sheet';
export type AcademicClass = string;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  academicClass: AcademicClass;
  academicGroup?: string;
  role: 'user' | 'admin';
  hasPremiumAccess: boolean;
  premiumExpiry?: string | null;
  canUpload?: boolean;
  createdAt: string;
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  academicClass: AcademicClass;
  academic_class?: AcademicClass; // Compatibility
  subject: string;
  academicGroup?: string;
  academic_group?: string; // Compatibility
  url: string; // Dynamic URL (PDF, Video ID, Link)
  thumbnail?: string;
  thumbnail_url?: string; // Compatibility
  year?: string;          // Books only
  channelName?: string;   // YouTube Classes only
  icon?: string;          // External Link only
  authorName?: string;
  authorId?: string;
  author_id?: string;     // Compatibility
  status: 'pending' | 'approved' | 'rejected';
  chapter?: string;
  chapterId?: string;
  chapter_id?: string;    // Compatibility
  topicId?: string;
  topic_id?: string;      // Compatibility
  tags?: string[];
  createdAt: string;
  created_at?: string;    // Compatibility
  isPremium: boolean;
  is_premium?: boolean;   // Compatibility
  active?: boolean;
}

export interface Bookmark {
  id: string;
  userId: string;
  contentId: string;
  createdAt: string;
}

export interface ExternalResource {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
  thumbnail?: string;
  category: string;
  chapter?: string;
  chapterId?: string;
  chapter_id?: string;
  topicId?: string;
  topic_id?: string;
  academicClass?: string;
  academic_class?: string;
  subject?: string;
  academicGroup?: string;
  academic_group?: string;
  isPremium: boolean;
  is_premium?: boolean;
  active: boolean;
  createdAt: string;
}

export interface Feedback {
  id: string;
  userId?: string | null;
  user_id?: string | null; // Compatibility
  userEmail: string;
  user_email?: string; // Compatibility
  userName: string;
  user_name?: string; // Compatibility
  message: string;
  status: 'unread' | 'read' | 'resolved' | string;
  reply?: string | null;
  admin_reply?: string | null; // Compatibility
  createdAt: string;
  created_at?: string; // Compatibility
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  thumbnail_url?: string; // Compatibility
  authorId: string;
  author_id?: string; // Compatibility
  type: 'youtube' | 'custom';
  youtubePlaylistId?: string;
  youtube_playlist_id?: string; // Compatibility
  videoIds?: string[]; // For custom playlists
  video_ids?: string[]; // Compatibility
  academicClass: AcademicClass;
  academic_class?: AcademicClass; // Compatibility
  subject: string;
  academicGroup?: string;
  academic_group?: string; // Compatibility
  status: 'pending' | 'approved' | 'rejected';
  chapter?: string;
  chapterId?: string;
  topicId?: string;
  createdAt: string;
  created_at?: string; // Compatibility
  isPremium: boolean;
  is_premium?: boolean; // Compatibility
}

export interface Question {
  id: string;
  examId: string;
  exam_id?: string; // Compatibility
  type: 'mcq' | 'written';
  questionText: string;
  question_text?: string; // Compatibility
  options?: string[];
  correctAnswer?: number | string;
  correct_answer?: number | string; // Compatibility
  points: number;
  class: AcademicClass;
  subject: string;
  academicGroup?: string;
  academic_group?: string; // Compatibility
  chapter: string;
  topicId?: string;
  topic_id?: string; // Compatibility
  createdAt: string;
  created_at?: string; // Compatibility
  question_image?: string;
  option_a_image?: string;
  option_b_image?: string;
  option_c_image?: string;
  option_d_image?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  status?: 'draft' | 'published' | 'hidden' | string;
  isPremium?: boolean;
  tags?: string[];
  explanation?: string;
  explanationImage?: string;
  explanationVideo?: string;
  explanationText?: string;
  isPlaceholder?: boolean;
  negativeMarks?: number;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  class: AcademicClass;
  academicClass?: AcademicClass; // Compatibility field
  academic_class?: AcademicClass; // Database field compatibility
  subject: string;
  academicGroup?: string;
  academic_group?: string; // Compatibility
  chapter: string;
  chapterNameCustom?: string;
  chapter_name_custom?: string; // Compatibility
  topicIds?: string[];
  timeLimit: number;
  time_limit?: number; // Compatibility
  examType: 'mcq' | 'written';
  exam_type?: 'mcq' | 'written'; // Compatibility
  totalQuestionsToShow: number;
  total_questions_to_show?: number; // Compatibility
  mcqCount?: number;
  writtenCount?: number;
  negativeMarking: boolean;
  negative_marking?: boolean; // Compatibility
  negativeValue: number;
  negative_value?: number; // Compatibility
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  created_at?: string; // Compatibility
  updatedAt?: string;
  updated_at?: string; // Compatibility
  createdBy: string;
  created_by?: string; // Compatibility
  isPremium: boolean;
  is_premium?: boolean; // Compatibility
  questions: Question[];
}

export interface ExamAttempt {
  id: string;
  userId: string;
  examId: string;
  answers: (string | number)[];
  score: number;
  totalQuestions: number;
  timeTaken: number; // in seconds
  completedAt: string;
  // Internal tracking fields below
  userName: string;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number; // Corrected typo here
  isPremium?: boolean;
  academicClass: string;
  academicGroup: string;
  subject: string;
  chapter: string;
  topic: string;
}

export interface ExamAttemptDB {
  id?: string;
  user_id: string | null;
  exam_id: string | null;
  answers: Record<string, any>;
  score: number;
  total_questions: number;
  time_taken: number;
  completed_at: string;
  user_name: string;
  total_marks: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  is_premium: boolean;
  academic_class: string;
  academic_group: string;
  subject: string;
  chapter: string;
  topic: string;
}

export interface LeaderboardEntry {
  id: string; // userId_examId
  class: AcademicClass; 
  examId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  bestScore: number;
  timeTaken: number; // Low time priority
  lastUpdated: string;
  examTitle: string;
  firstSubmissionAt: string;
  totalAttempts: number;
  accuracy?: number;
  xp?: number;
  streak?: number;
  badge?: string;
  correctCount?: number;
  wrongCount?: number;
  unansweredCount?: number;
  totalQuestions?: number;
}

export interface UserStats {
  userId: string;
  userName: string;
  userPhoto?: string;
  totalExams: number;
  averageScore: number;
  highestScore: number;
  totalCorrect: number;
  totalWrong: number;
  totalSkipped: number;
  totalXp: number;
  streak: number;
  badge: string;
  updatedAt: string;
}

export interface AcademicClassInfo {
  id: string;
  name: string;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt?: string;
  has_groups?: boolean;
  hasGroups?: boolean;
  short_name?: string;
  shortName?: string;
  slug?: string;
}

export interface AcademicSubject {
  id: string;
  name: string;
  classId: string;
  academicGroup?: string;
  academic_group?: string; // Compatibility
  active: boolean;
  order: number;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AcademicChapter {
  id: string;
  name: string;
  subjectId: string;
  classId: string;
  active: boolean;
  order: number;
  mcqCount?: number;
  writtenCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AcademicTopic {
  id: string;
  name: string;
  chapterId: string;
  subjectId: string;
  classId: string;
  academicGroup?: string;
  academic_group?: string;
  active: boolean;
  order: number;
  tags?: string[]; // e.g., 'Important', 'Board Favorite'
  mcqCount?: number;
  writtenCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  mcqCount: number;
  writtenCount: number;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface CustomExamSettings {
  classId?: string;
  subjects: string[];
  chapters: string[]; // List of chapter IDs
  topics: string[]; // List of topic IDs
  mcqCount: number;
  writtenCount: number;
  duration: number; // in minutes
  difficulty: 'Easy' | 'Medium' | 'Hard';
  difficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
  negativeMarking: boolean;
  marksPerMcq: number;
  marksPerWritten: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  strictMode: boolean;
  fullscreenMode: boolean;
  tabSwitchDetection: boolean;
  preventCopyPaste: boolean;
  instantResult: boolean;
}

export interface ExamTemplate {
  id: string;
  user_id: string;
  userId?: string; // Compatibility
  name: string;
  settings: CustomExamSettings;
  created_at: string;
  createdAt?: string; // Compatibility
}

export interface UserAnalytics {
  userId: string;
  accuracy: number;
  speed: number;
  strongChapters: string[];
  weakChapters: string[];
  strongTopics: string[];
  weakTopics: string[];
  improvementData: { date: number; score: number }[];
  mistakePatterns: string[];
  fastestSubject: string;
  fastestSpeed: number;
  slowestSubject: string;
  slowestSpeed: number;
  examDNA: {
    traits: string[];
    description: string;
  };
  consistency?: number;
  streak?: number;
  predictiveScore?: number;
  skippedPatterns?: string[];
  smartRoadmap?: string[];
  subjectPerformance?: { name: string; accuracy: number; totalExams: number }[];
}

export interface AcademicGroup {
  id: string;
  name: string;
  active: boolean;
  order: number;
  createdAt: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function serializeExplanation(explanationText: string, meta: {
  difficulty?: string;
  is_premium?: boolean;
  tags?: string[];
  status?: string;
  explanation_image?: string;
  negative_marks?: number;
}) {
  const metaStr = JSON.stringify(meta);
  return `${explanationText || ''} [META:${metaStr}]`;
}

export function deserializeExplanation(fullExplanation: string) {
  if (!fullExplanation) {
    return {
      text: '',
      difficulty: 'medium',
      is_premium: false,
      tags: [],
      status: 'published',
      explanation_image: '',
      negative_marks: 0
    };
  }
  const match = fullExplanation.match(/\[META:(.*?)\]$/);
  if (match) {
    try {
      const meta = JSON.parse(match[1]);
      const text = fullExplanation.replace(/\[META:.*?\]$/, '').trim();
      return {
        text,
        difficulty: meta.difficulty || 'medium',
        is_premium: !!meta.is_premium,
        tags: meta.tags || [],
        status: meta.status || 'published',
        explanation_image: meta.explanation_image || '',
        negative_marks: meta.negative_marks || 0
      };
    } catch (e) {
      // fallback
    }
  }
  return {
    text: fullExplanation,
    difficulty: 'medium',
    is_premium: false,
    tags: [],
    status: 'published',
    explanation_image: '',
    negative_marks: 0
  };
}

export interface SubscriptionSettings {
  id: string;
  current_price: number;
  old_price: number;
  discount_percent: number;
  poster_image_url: string | null;
  poster_title: string;
  poster_description: string;
  payment_number_bkash: string;
  payment_number_nagad: string;
  is_subscription_enabled: boolean;
  updated_at?: string;
  // Custom stats section fields (Feature 2)
  stats_members?: number;
  stats_exams?: number;
  stats_notes?: number;
  stats_sheets?: number;
}

export interface SubscriptionPackage {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  old_price?: number;
  discount_percent?: number;
  is_active: boolean;
  created_at?: string;
  // Highlight flag (Feature 1)
  is_most_popular?: boolean;
}

export interface SubscriptionBenefit {
  id: string;
  text: string;
  is_active: boolean;
  created_at?: string;
}

export interface SubscriptionRequest {
  id: string;
  user_id: string;
  package_name: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  payment_number: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  user_profiles?: {
    full_name: string;
    email: string;
  };
  // Extra fields for coupon and review notes support (Features 3, 4, 6, 9)
  admin_note?: string | null;
  coupon_code?: string | null;
  original_amount?: number | null;
  discount_amount?: number | null;
}

export interface SubscriptionCoupon {
  id: string;
  code: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  expiry_date?: string | null;
  usage_limit?: number | null;
  is_active: boolean;
  created_at?: string;
  used_count?: number;
}

export interface SavedQuestion {
  id: string;
  user_id: string;
  question_id: string;
  saved_at: string;
  question?: Question; // Related question fetched from questions table
}

export interface WrongQuestion {
  id: string;
  user_id: string;
  question_id: string;
  user_answer: string;
  correct_answer: string;
  exam_id?: string | null;
  exam_type?: string;
  created_at: string;
  question?: Question; // Related question fetched from questions table
}




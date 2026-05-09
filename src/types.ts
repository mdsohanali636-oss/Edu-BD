export type Category = 'Notes' | 'Books' | 'Question Papers' | 'YouTube Classes' | 'External Resources' | 'Practice Sheet';
export type AcademicClass = 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 10' | 'Class 11' | 'Class 12' | 'SSC' | 'HSC' | 'Admission' | 'Job Prep' | 'General' | 'Engineering Admission-science' | 'Medical Admission-science' | 'Varsity Admission-science' | 'Varsity Admission-humanities' | 'Varsity Admission-commerce';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phoneNumber?: string;
  class: AcademicClass;
  role: 'user' | 'admin';
  hasPremiumAccess: boolean;
  premiumExpiry?: number;
  canUpload?: boolean;
  createdAt: number;
}

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  academicClass: AcademicClass;
  subject: string;
  url: string; // PDF URL or YouTube Video ID or External Link
  thumbnail?: string;
  year?: string;
  author?: string;
  channelName?: string; // For YouTube
  authorId?: string;
  status: 'pending' | 'approved' | 'rejected';
  chapter?: string;
  tags?: string[];
  createdAt: number;
  isPremium: boolean;
}

export interface Bookmark {
  id: string;
  contentId: string;
  savedAt: number;
}

export interface ExternalResource {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
  thumbnail?: string;
  chapter?: string;
  createdAt: number;
}

export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  text: string;
  createdAt: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  authorId: string;
  type: 'youtube' | 'custom';
  youtubePlaylistId?: string;
  videoIds?: string[]; // For custom playlists
  academicClass: AcademicClass;
  subject: string;
  status: 'pending' | 'approved' | 'rejected';
  chapter?: string;
  createdAt: number;
  isPremium: boolean;
}

export interface Question {
  id: string;
  examId: string;
  type: 'mcq' | 'written';
  questionText: string;
  options?: string[];
  correctAnswer?: number | string;
  points: number;
  class: AcademicClass;
  subject: string;
  chapter: string;
  topicId?: string;
  createdAt: number;
}

export interface Exam {
  id: string;
  title: string;
  class: AcademicClass;
  subject: string;
  chapter: string;
  chapterNameCustom?: string;
  topicIds?: string[];
  timeLimit: number; // Added back as it's essential for timer logic
  examType: 'mcq' | 'written';
  totalQuestionsToShow: number;
  negativeMarking: boolean;
  negativeValue: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  updatedAt?: number;
  createdBy: string;
  isPremium: boolean;
}

export interface ExamAttempt {
  id: string;
  userId: string;
  examId: string;
  answers: (string | number)[]; // The user requested answers[]
  score: number;
  totalQuestions: number;
  timeTaken: number; // in seconds
  submittedAt: number;
  // Internal tracking fields below
  userName: string;
  userClass: AcademicClass;
  maxScore: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  startTime: number;
  examTitle: string;
  isPremium?: boolean;
}

export interface LeaderboardEntry {
  id: string; // userId_examId
  class: AcademicClass; // Changed from academicClass
  examId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  bestScore: number;
  timeTaken: number; // Low time priority
  lastUpdated: number;
  // Helpful metadata
  examTitle: string;
  firstSubmissionAt: number;
  totalAttempts: number;
}

export interface AcademicClassInfo {
  id: string;
  name: string;
  active: boolean;
  order: number;
  createdAt: number;
  updatedAt?: number;
}

export interface AcademicSubject {
  id: string;
  name: string;
  classId: string;
  active: boolean;
  order: number;
  icon?: string;
  color?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface AcademicChapter {
  id: string;
  name: string;
  subjectId: string;
  classId: string;
  active: boolean;
  order: number;
  createdAt: number;
  updatedAt?: number;
}

export interface AcademicTopic {
  id: string;
  name: string;
  chapterId: string;
  subjectId: string;
  classId: string;
  active: boolean;
  order: number;
  tags?: string[]; // e.g., 'Important', 'Board Favorite'
  mcqCount?: number;
  writtenCount?: number;
  createdAt: number;
  updatedAt?: number;
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
  userId: string;
  name: string;
  settings: CustomExamSettings;
  createdAt: number;
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

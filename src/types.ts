export type Category = 'Notes' | 'Books' | 'Question Papers' | 'YouTube Classes' | 'External Resources' | 'Practice Sheet';
export type AcademicClass = 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 10' | 'Class 11' | 'Class 12' | 'General' | 'Engineering Admission-science' | 'Medical Admission-science' | 'Varsity Admission-science' | 'Varsity Admission-humanities' | 'Varsity Admission-commerce';

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
  createdAt: number;
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
  createdAt: number;
}

export interface Exam {
  id: string;
  title: string;
  class: AcademicClass;
  subject: string;
  chapter: string;
  chapterNameCustom?: string;
  timeLimit: number; // Added back as it's essential for timer logic
  examType: 'mcq' | 'written';
  totalQuestionsToShow: number;
  negativeMarking: boolean;
  negativeValue: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  updatedAt?: number;
  createdBy: string;
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

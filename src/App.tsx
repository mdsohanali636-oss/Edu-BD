import { GoogleGenAI, Type } from "@google/genai";
import React, { useState, useMemo, useEffect, useRef, ChangeEvent, FormEvent, cloneElement, useCallback } from 'react';
import parodorshhiLogo from './assets/images/parodorshhi_logo_1780464304136.png';
import { 
  MathQuestionContent, 
  MathOptionContent, 
  parseQuestionText, 
  parseOption, 
  serializeQuestionText 
} from './components/Exam/MathQuestionContent';
import { RevisionCenter } from './components/RevisionCenter';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { 
  Search, 
  BookOpen, 
  FileText, 
  History, 
  Youtube, 
  ExternalLink, 
  Bookmark, 
  Settings, 
  Plus, 
  Trash2, 
  Users,
  CheckCircle,
  Activity,
  Send,
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  RefreshCcw,
  RefreshCw,
  Home,
  Brain as BrainIcon,
  Download, 
  Eye, 
  Moon, 
  Sun,
  X,
  Filter,
  Save,
  GraduationCap,
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  Languages,
  Monitor,
  Upload,
  LogOut,
  User as UserIcon,
  Globe,
  Pencil,
  Lock,
  Facebook,
  Twitter,
  Instagram,
  Github,
  Mail,
  Phone,
  MessageSquare,
  List,
  Play,
  Maximize2,
  Minimize2,
  Clock,
  Timer,
  CheckCircle2,
  AlertCircle,
  Trophy,
  ClipboardList,
  Dice6,
  Check,
  Crown,
  HelpCircle,
  Database,
  Calendar,
  Menu,
  LayoutGrid,
  Sparkles,
  Zap,
  MousePointer2,
  File as FileIcon,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Badge } from './components/ui/Base';
import { INITIAL_DATA, MOCK_EXAMS } from './data/mockData';
import { ContentItem, Category, AcademicClass, ExternalResource, Feedback, Playlist, Exam, Question, ExamAttempt, ExamAttemptDB, LeaderboardEntry, CustomExamSettings, AcademicClassInfo, AcademicSubject, AcademicChapter, AcademicTopic, AcademicGroup, OperationType, FirestoreErrorInfo, deserializeExplanation, serializeExplanation, UserStats } from './types';

export const padQuestionsWithPlaceholders = (
  realQuestions: Question[], 
  targetTotalCount: number, 
  examType: 'mcq' | 'written' | 'hybrid' | string = 'mcq',
  settingsOrExam: any = {}
): Question[] => {
  const finalQuestions = [...realQuestions];
  const missingCount = targetTotalCount - realQuestions.length;
  if (missingCount <= 0) return finalQuestions;

  for (let i = 0; i < missingCount; i++) {
    const placeholderIdx = realQuestions.length + i + 1;
    const isWritten = examType === 'written' || (examType === 'hybrid' && i % 2 !== 0);
    
    finalQuestions.push({
      id: `placeholder_${isWritten ? 'written' : 'mcq'}_${placeholderIdx}`,
      examId: settingsOrExam.id || settingsOrExam.examId || 'custom',
      type: isWritten ? 'written' : 'mcq',
      questionText: `Upcoming Question ${placeholderIdx}: This question is under preparation.`,
      options: ["Option 1", "Option 2", "Option 3", "Option 4"],
      correctAnswer: -1,
      points: Number((isWritten ? settingsOrExam.marksPerWritten || settingsOrExam.written_points : settingsOrExam.marksPerMcq || settingsOrExam.mcq_points) || 1),
      class: settingsOrExam.class || settingsOrExam.academicClass || 'Premium',
      subject: settingsOrExam.subject || 'General',
      chapter: settingsOrExam.chapter || 'General',
      createdAt: new Date().toISOString(),
      isPlaceholder: true
    } as unknown as Question);
  }
  return finalQuestions;
};
import { supabase } from './supabaseClient';
import { useLocalStorage } from './hooks/useLocalStorage';
import { PremiumExamSection } from './components/PremiumExam/PremiumExamSection';
import { AcademicManagement } from './components/Admin/AcademicManagement';
import { PremiumSubscriptionPage } from './components/PremiumSubscription/PremiumSubscriptionPage';
import { AdminSubscriptionManager } from './components/PremiumSubscription/AdminSubscriptionManager';
import { LandingPage } from './components/Landing/LandingPage';
import { PdfViewer, prefetchPdfUrl } from './components/ui/PdfViewer';
import { TiltContainer, FlyInteraction, MiniRobot, WaveDivider, ScrollSection } from './components/Landing/LandingComponents';
import { supabaseService, TABLE_MAP } from './services/supabaseService';
import { User } from '@supabase/supabase-js';

// Firebase utilities from types.ts were already imported, removing local duplicates.

function handleSupabaseError(error: any, operationType: OperationType, path: string | null, setError?: (err: string | null) => void) {
  const message = error?.message || error?.details || (typeof error === 'string' ? error : JSON.stringify(error));
  const errInfo = {
    error: message,
    operationType,
    path
  };
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  if (setError) {
    setError(`Supabase ${operationType} error at ${path}: ${message}`);
  }
}

// const STANDARD_SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'ICT', 'General Knowledge', 'General'];

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
};

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    if (typeof date === 'number') return new Date(date).toLocaleString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleString();
    if (date.toDate && typeof date.toDate === 'function') return date.toDate().toLocaleString();
    return new Date(date).toLocaleString();
  } catch (e) {
    return 'Invalid Date';
  }
};

// TiltContainer moved to LandingComponents.tsx

// WaveDivider and ScrollSection moved to LandingComponents.tsx

const getYouTubePlaylistId = (url: string) => {
  // Support formats like:
  // https://www.youtube.com/playlist?list=ID
  // https://youtube.com/playlist?list=ID
  // https://www.youtube.com/watch?v=VIDEO_ID&list=ID
  // or just the ID itself
  const regExp = /[&?]list=([^#&?]+)/;
  const match = url.match(regExp);
  if (match) return match[1];
  
  // If it's just an ID (usually starts with PL)
  if (url.startsWith('PL') && url.length > 10) return url;
  
  return url;
};

const getEmbedUrl = (url: string | null) => {
  if (!url) return '';
  
  // Google Drive Link Handling
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([^\/]+)/) || url.match(/id=([^\&]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }

  // Handle PDF files directly using Google Docs Viewer proxy
  // This is the most reliable way to bypass browser "Blocked" or CSP issues
  if (url.toLowerCase().endsWith('.pdf') || url.includes('/storage/v1/object/public/')) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
  }
  
  return url;
};



// CharacterSpeechBubble and CinematicBackground moved to LandingComponents.tsx

// FlyInteraction moved to LandingComponents.tsx

// NewBoyCharacter moved to LandingComponents.tsx



// Landing page components moved to LandingPage.tsx and LandingComponents.tsx

interface FeedbackCardProps {
  feedback: Feedback;
  onUpdate: () => void;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ feedback, onUpdate }) => {
  const [replyText, setReplyText] = useState((feedback.reply || feedback.admin_reply) || '');
  const [isEditingReply, setIsEditingReply] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await supabaseService.updateFeedbackStatus(feedback.id, newStatus);
      setSuccessMsg(`Status updated to ${newStatus}!`);
      onUpdate();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await supabaseService.replyToFeedback(feedback.id, replyText.trim());
      setSuccessMsg('Reply saved successfully!');
      setIsEditingReply(false);
      onUpdate();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit reply.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'read':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
  };

  const emailText = feedback.userEmail || feedback.user_email || 'guest@educationalportal.org';
  const nameText = feedback.userName || feedback.user_name || 'Guest Student';

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-bold">
            {nameText.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-black text-zinc-900 dark:text-white flex items-center gap-2">
              {nameText}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getStatusColor(feedback.status)}`}>
                {feedback.status}
              </span>
            </h4>
            <p className="text-[10px] text-zinc-500 font-medium">{emailText}</p>
          </div>
        </div>
        {/* Date */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest sm:text-right">
          <Clock size={12} />
          {formatDate(feedback.createdAt)}
        </div>
      </div>

      {/* Message Content */}
      <div className="space-y-2">
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 whitespace-pre-wrap">
          {feedback.message}
        </p>
      </div>

      {/* Admin Action Row */}
      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/85 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 mr-1">Status:</span>
            <button
              type="button"
              onClick={() => handleStatusChange('unread')}
              disabled={loading}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                feedback.status === 'unread'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
              }`}
            >
              Unread
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('read')}
              disabled={loading}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                feedback.status === 'read'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
              }`}
            >
              Read
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange('resolved')}
              disabled={loading}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                feedback.status === 'resolved'
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
              }`}
            >
              Resolved
            </button>
          </div>

          {/* Reply Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditingReply(!isEditingReply)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 px-2 py-1 rounded-lg"
          >
            <MessageSquare size={14} className="mr-1.5 inline" />
            {(feedback.reply || feedback.admin_reply) ? 'Edit Reply' : 'Reply'}
          </Button>
        </div>

        {/* Display response if exists and not editing */}
        {(feedback.reply || feedback.admin_reply) && !isEditingReply && (
          <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/10 p-4 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-1">
            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              A
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">Admin Response</span>
                <span className="text-[9px] text-emerald-500 font-extrabold uppercase tracking-wide">solved</span>
              </div>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {feedback.reply || feedback.admin_reply}
              </p>
            </div>
          </div>
        )}

        {/* Reply Composer Form */}
        {isEditingReply && (
          <form onSubmit={handleReplySubmit} className="space-y-3 pt-1 animate-in slide-in-from-top-2 duration-200">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-widest pl-1">Write Administrator Response</label>
                {replyText && (
                  <span className="text-[9px] text-zinc-400 font-medium font-mono">Auto-marks feedback as Resolved</span>
                )}
              </div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your response here..."
                disabled={loading}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-2xl outline-none text-xs dark:text-white min-h-[90px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-zinc-400"
                required
              />
            </div>
            <div className="flex items-center justify-end gap-2 text-xs">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditingReply(false);
                  setReplyText((feedback.reply || feedback.admin_reply) || '');
                }}
                disabled={loading}
                className="rounded-xl px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !replyText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/10"
              >
                {loading ? <RefreshCcw className="animate-spin" size={14} /> : <Check size={14} />}
                Save Reply
              </Button>
            </div>
          </form>
        )}

        {/* Local Error & Success Alerts */}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={14} />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <AlertCircle size={14} />
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};

const Logo = ({ className = "h-10 w-auto", alt = "Parodorshhi Logo" }: { className?: string, alt?: string }) => {
  const [error, setError] = useState(false);
  const paths = [
    parodorshhiLogo,
    "/api/v1/files/input_file_2.png",
    "/api/v1/files/input_file_1.png",
    "/api/v1/files/input_file_0.png",
    "/api/v1/files/Gemini_Generated_Image_ro03d6ro03d6ro03.png"
  ];
  const [pathIndex, setPathIndex] = useState(0);

  if (error && pathIndex >= paths.length - 1) {
    return <span className="font-black text-rose-500 tracking-tighter">Paro</span>;
  }

  return (
    <img 
      src={paths[pathIndex]} 
      alt={alt} 
      className={`${className} object-contain transition-all duration-300 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]`}
      referrerPolicy="no-referrer"
      onError={() => {
        if (pathIndex < paths.length - 1) {
          setPathIndex(pathIndex + 1);
        } else {
          setError(true);
        }
      }}
    />
  );
};

export default function App() {
  const queryClient = useQueryClient();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [externalResources, setExternalResources] = useState<ExternalResource[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [adminUserSearchQuery, setAdminUserSearchQuery] = useState('');
  const [adminUserCategory, setAdminUserCategory] = useState<'all' | 'normal' | 'premium'>('all');
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [dynamicClasses, setDynamicClasses] = useState<AcademicClassInfo[]>([]);
  const [dynamicSubjects, setDynamicSubjects] = useState<AcademicSubject[]>([]);
  const [dynamicChapters, setDynamicChapters] = useState<AcademicChapter[]>([]);
  const [dynamicTopics, setDynamicTopics] = useState<AcademicTopic[]>([]);
  const [academicGroups, setAcademicGroups] = useState<AcademicGroup[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  const [canManageExams, setCanManageExams] = useState(false);
  const [canManageQuestions, setCanManageQuestions] = useState(false);
  const [canManageResources, setCanManageResources] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [globalPremiumMode, setGlobalPremiumMode] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 10000); // Dynamic timer that ticks every 10 seconds to ensure real-time subscription expiry checks
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncGlobalPremium = async () => {
      try {
        const settings = await supabaseService.getSubscriptionSettings();
        setGlobalPremiumMode(!!settings.global_premium_mode);
      } catch (err) {
        console.error("Failed loading subscription settings for global premium:", err);
      }
    };

    syncGlobalPremium();

    const channel = supabase
      .channel('public:subscription_settings_app_sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscription_settings'
      }, (payload: any) => {
        console.log("[SETTINGS REALTIME APP SYNC PAYLOAD]:", payload);
        if (payload.new) {
          setGlobalPremiumMode(!!payload.new.global_premium_mode);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const hasPremiumAccess = useMemo(() => {
    if (userRole === 'admin') return true;
    if (globalPremiumMode) return true;
    const basePremium = isPremium || firestoreUser?.hasPremiumAccess === true;
    if (basePremium && firestoreUser?.premiumExpiry) {
      if (new Date(firestoreUser.premiumExpiry).getTime() < Date.now()) {
        return false;
      }
    }
    return basePremium;
  }, [isPremium, firestoreUser?.hasPremiumAccess, firestoreUser?.premiumExpiry, userRole, tick, globalPremiumMode]);

  const hasAdminAccess = useMemo(() => {
    return userRole === 'admin' || canUpload || canManageExams || canManageQuestions || canManageResources;
  }, [userRole, canUpload, canManageExams, canManageQuestions, canManageResources]);

  const usersWithRealtimeExpiry = useMemo(() => {
    return allUsers.map(u => {
      const isExpired = u.premium_expiry && new Date(u.premium_expiry).getTime() < Date.now();
      if (isExpired) {
        return {
          ...u,
          hasPremiumAccess: false,
          isPremium: false
        };
      }
      return u;
    });
  }, [allUsers, tick]);

  const filteredUsers = useMemo(() => {
    let users = usersWithRealtimeExpiry;
    if (adminUserCategory === 'normal') {
      users = usersWithRealtimeExpiry.filter(u => !(u.hasPremiumAccess || u.isPremium));
    } else if (adminUserCategory === 'premium') {
      users = usersWithRealtimeExpiry.filter(u => (u.hasPremiumAccess || u.isPremium));
    }

    if (!adminUserSearchQuery.trim()) return users;
    const query = adminUserSearchQuery.trim().toLowerCase();
    return users.filter(u => 
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.name && u.name.toLowerCase().includes(query)) ||
      (u.id && u.id.toLowerCase().includes(query))
    );
  }, [usersWithRealtimeExpiry, adminUserSearchQuery, adminUserCategory]);

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'home' | 'category' | 'saved' | 'admin' | 'dashboard' | 'exam' | 'leaderboard' | 'privacy' | 'terms' | 'cookies' | 'premium-exam' | 'premium-subscription' | 'revision' | 'reset-password'>('home');
  const [savedQuestionIds, setSavedQuestionIds] = useState<Set<string>>(new Set());

  const handleToggleSaveQuestion = async (questionId: string) => {
    if (!user) {
      setGlobalError("দয়া করে প্রশ্ন সেভ করতে প্রথমে লগইন করুন।");
      return;
    }
    try {
      const isCurrentlySaved = savedQuestionIds.has(questionId);
      if (isCurrentlySaved) {
        await supabaseService.unsaveQuestion(user.id, questionId);
      } else {
        await supabaseService.saveQuestion(user.id, questionId);
      }
      refetchSavedQuestions();
    } catch (err: any) {
      console.error("Error toggling saved question:", err);
      setGlobalError("প্রশ্নটি সেভ করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isUserMenuOpen]);
  const [isDarkMode, setIsDarkMode] = useLocalStorage('parodorshhi_darkmode', false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'resources' | 'playlists' | 'users' | 'feedback' | 'exams' | 'questions' | 'leaderboards' | 'academics' | 'newsletter' | 'subscriptions'>('resources');
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);

  const [contentTypeFilter, setContentTypeFilter] = useState<'free' | 'premium'>('free');
  const [showPremiumPromptModal, setShowPremiumPromptModal] = useState(false);

  // Newsletter Admin States
  const [newsletterSubject, setNewsletterSubject] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');
  const [isSendingLogs, setIsSendingLogs] = useState(false);
  const [sendingStats, setSendingStats] = useState<{ total: number; sent: number; duplicates: number; failed: number } | null>(null);
  const [sendingStatusText, setSendingStatusText] = useState('');
  const [newsletterSearchFilter, setNewsletterSearchFilter] = useState('');
  const [newsletterSubTab, setNewsletterSubTab] = useState<'subscribers' | 'logs'>('subscribers');

  // Filters
  const [classFilter, setClassFilter] = useState<AcademicClass | 'All'>('All');
  const [groupFilter, setGroupFilter] = useState<string>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [examClassFilter, setExamClassFilter] = useState<AcademicClass | 'All'>('All');
  const [examGroupFilter, setExamGroupFilter] = useState<string>('All');
  const [questionClassFilter, setQuestionClassFilter] = useState<string>('All');
  const [questionGroupFilter, setQuestionGroupFilter] = useState<string>('All');

  const isGroupNeeded = (className: any) => {
    if (!className || typeof className !== 'string') return false;
    const foundClass = dynamicClasses.find(c => c.name === className);
    if (foundClass) {
      return foundClass.has_groups ?? (foundClass as any).hasGroups ?? false;
    }
    // Fallback default logic if not loaded: SSC, HSC, Admission have groups
    const nameLower = className.toLowerCase();
    if (nameLower === 'ssc' || nameLower === 'hsc' || nameLower === 'admission') {
      return true;
    }
    return false;
  };

  // Reset group filter when class changes to non-stream level
  useEffect(() => {
    if (!isGroupNeeded(classFilter)) {
      setGroupFilter('All');
    }
  }, [classFilter]);

  useEffect(() => {
    if (!isGroupNeeded(examClassFilter)) {
      setExamGroupFilter('All');
    }
  }, [examClassFilter]);

  useEffect(() => {
    if (!isGroupNeeded(questionClassFilter)) {
      setQuestionGroupFilter('All');
    }
  }, [questionClassFilter]);

  const getSubjectNamesForClass = useCallback((className: string | 'All', groupName: string = 'All') => {
    if (className === 'All') {
      // Return unique names if multiple classes have same subject name
      return Array.from(new Set(dynamicSubjects.map(s => s.name)));
    }
    const matchedClass = dynamicClasses.find(c => c.name === className);
    if (!matchedClass) return [];
    
    const subjectNames = dynamicSubjects.filter(s => {
      const matchClass = s.classId === matchedClass.id;
      const sGroup = (s.academicGroup || (s as any).academic_group || 'All').trim().toLowerCase();
      const filterGroup = (groupName || 'All').trim().toLowerCase();
      const matchGroup = filterGroup === 'all' || sGroup === filterGroup || sGroup === 'all';
      return matchClass && matchGroup;
    }).map(s => s.name);
    return Array.from(new Set(subjectNames));
  }, [dynamicSubjects, dynamicClasses]);

  const currentSubjects = useMemo(() => getSubjectNamesForClass(classFilter, groupFilter), [getSubjectNamesForClass, classFilter, groupFilter]);
  const examSubjects = useMemo(() => getSubjectNamesForClass(examClassFilter, examGroupFilter), [getSubjectNamesForClass, examClassFilter, examGroupFilter]);
  const questionSubjects = useMemo(() => getSubjectNamesForClass(questionClassFilter, questionGroupFilter), [getSubjectNamesForClass, questionClassFilter, questionGroupFilter]);

  // Modals
  const [activePdf, setActivePdf] = useState<{ url: string; isRestricted: boolean } | null>(null);
  const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [fetchedPlaylistVideos, setFetchedPlaylistVideos] = useState<any[]>([]);
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);

  // Exam Mode State
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examAnswers, setExamAnswers] = useState<Record<string, string | number>>({});
  const [examTimeLeft, setExamTimeLeft] = useState(0);
  const [examResults, setExamResults] = useState<ExamAttempt | null>(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ 
    displayName: '', 
    academicClass: (dynamicClasses?.[0]?.name || 'SSC') as AcademicClass,
    academicGroup: 'All'
  });
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isAvatarRemoved, setIsAvatarRemoved] = useState<boolean>(false);
  const [examSubjectFilter, setExamSubjectFilter] = useState('All');
  const [examChapterFilter, setExamChapterFilter] = useState<string>('');
  const [examTopicFilter, setExamTopicFilter] = useState<string>('All');
  const [examSetup, setExamSetup] = useState<{
    academicClass: AcademicClass;
    subject: string;
    chapter: string;
  }>({
     academicClass: dynamicClasses?.[0]?.name || 'SSC',
     subject: '',
     chapter: 'All Chapters'
   });
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);

  const handlePremiumExamClick = () => {
    if (!hasPremiumAccess) {
      setShowPremiumPromptModal(true);
    } else {
      setView('premium-exam');
    }
    setActiveExam(null);
  };

  const ai = useMemo(() => {
    try {
      const key = process.env.GEMINI_API_KEY || "";
      if (!key) return null;
      return new GoogleGenAI({ apiKey: key });
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI:", err);
      return null;
    }
  }, []);

  // History management
  const isPopState = useRef(false);
  useEffect(() => {
    const handlePopAction = (e: PopStateEvent) => {
      if (e.state) {
        isPopState.current = true;
        setView(e.state.view);
        setSelectedCategory(e.state.category);
      }
    };
    window.addEventListener('popstate', handlePopAction);
    window.history.replaceState({ view: 'home', category: null }, '');
    return () => window.removeEventListener('popstate', handlePopAction);
  }, []);

  useEffect(() => {
    // Prevent double pushing when navigateTo is called
    if (isPopState.current) {
      isPopState.current = false;
    } else {
      // Debounce or just push? Let's just push for now, usually view/category are set together in one render cycle
      window.history.pushState({ view, category: selectedCategory }, '');
    }
  }, [view, selectedCategory]);

  const handleBack = () => window.history.back();
  const handleForward = () => window.history.forward();

  const fetchPlaylistVideos = async (playlistId: string) => {
    // 1. First, attempt to fetch videos from our lightweight Express proxy
    try {
      console.log(`Querying scraper proxy for playlist ${playlistId}...`);
      const response = await fetch(`/api/youtube/playlist/${playlistId}`);
      if (response.ok) {
        const proxyData = await response.json();
        if (Array.isArray(proxyData) && proxyData.length > 0) {
          console.log(`Successfully fetched ${proxyData.length} videos from Express proxy for playlist:`, playlistId);
          return proxyData;
        }
      }
      console.warn("Express proxy playlist fetched empty or failed, trying Gemini fallback...");
    } catch (e) {
      console.error("Express proxy playlist fetch error:", e);
    }

    // 2. Fallback to Gemini AI if the local proxy fails to parse
    try {
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        console.warn("Gemini API key is not configured inside environment for playlist video fetching fallback.");
        return [];
      }
      const genAI = ai || new GoogleGenAI({ apiKey });
      const prompt = `Find and retrieve a complete, search-grounded list of videos from the YouTube playlist with URL: https://www.youtube.com/playlist?list=${playlistId}.
      
      Instructions:
      1. Perform a Google search for the playlist and extract the 'title', the unique YouTube video 'url' (like https://www.youtube.com/watch?v=VIDEO_ID), and a short 'description' for each video listed on the playlist.
      2. Return a JSON array containing these video objects. No block markdown format, just solid JSON array.`;

      const result = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "url", "description"]
            }
          },
          tools: [{ googleSearch: {} }]
        }
      });
      const data = JSON.parse(result.text || "[]");
      // Safely handle duplicates in case the AI hallucinates
      const unique = data.reduce((acc: any[], current: any) => {
        const id = getYouTubeId(current.url);
        if (id && !acc.find(item => getYouTubeId(item.url) === id)) {
          acc.push(current);
        }
        return acc;
      }, []);
      return unique;
    } catch (error) {
      console.error("Error fetching playlist videos via Gemini fallback:", error);
      return [];
    }
  };

  useEffect(() => {
    if (!activePlaylist) {
      setFetchedPlaylistVideos([]);
      setIsFetchingPlaylist(false);
      return;
    }

    if (activePlaylist.type === 'youtube' && activePlaylist.youtubePlaylistId) {
      const fetchVideos = async () => {
        setIsFetchingPlaylist(true);
        setFetchedPlaylistVideos([]);
        const videos = await fetchPlaylistVideos(activePlaylist.youtubePlaylistId!);
        setFetchedPlaylistVideos(videos);
        setIsFetchingPlaylist(false);
      };
      fetchVideos();
    } else {
      setFetchedPlaylistVideos([]);
      setIsFetchingPlaylist(false);
    }
  }, [activePlaylist?.id]);

  useEffect(() => {
    if (activePlaylist && !activeVideo) {
      if (activePlaylist.type === 'youtube' && fetchedPlaylistVideos.length > 0) {
        setActiveVideo(getYouTubeId(fetchedPlaylistVideos[0].url));
      } else if (activePlaylist.type === 'custom' && activePlaylist.videoIds?.length > 0) {
        const firstVideo = contents.find(c => c.id === activePlaylist.videoIds![0]);
        if (firstVideo) {
          setActiveVideo(getYouTubeId(firstVideo.url));
        }
      }
    }
  }, [activePlaylist, activeVideo, fetchedPlaylistVideos, contents]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isAddingExternal, setIsAddingExternal] = useState(false);
  const [externalThumbnailFile, setExternalThumbnailFile] = useState<File | null>(null);
  const [externalThumbnailPreview, setExternalThumbnailPreview] = useState<string | null>(null);

  const handleExternalThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExternalThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setExternalThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const [isUploadingExternal, setIsUploadingExternal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<{ thumbnail?: File, resource?: File }>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState<string>('All');

  const [examPrep, setExamPrep] = useState<Exam | null>(null);

  // Exam Mode Handlers
  const getFallbackQuestions = (subject: string, className: string, examId: string): any[] => {
    const isScience = (subject || '').toLowerCase().includes('math') || 
                      (subject || '').toLowerCase().includes('phys') || 
                      (subject || '').toLowerCase().includes('chem') || 
                      (subject || '').toLowerCase().includes('gk') || 
                      (subject || '').toLowerCase().includes('general') || 
                      (subject || '').toLowerCase().includes('science') || 
                      (subject || '').toLowerCase().includes('biol');
    
    if (isScience) {
      return [
        {
          id: `${examId}-fall-1`,
          examId: examId,
          type: 'mcq',
          questionText: JSON.stringify({
            text: "What is the correct solution for the quadratic equation: $x^2 - 5x + 6 = 0$?",
            image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&auto=format&fit=crop&q=60"
          }),
          options: [
            JSON.stringify({ text: "x = 2 or x = 3", image: "" }),
            JSON.stringify({ text: "x = -2 or x = -3", image: "" }),
            JSON.stringify({ text: "x = 1 or x = 5", image: "" }),
            JSON.stringify({ text: "x = 0 or x = 6", image: "" })
          ],
          correctAnswer: 0,
          points: 1.5,
          class: className,
          subject: subject,
          chapter: "Algebra"
        },
        {
          id: `${examId}-fall-2`,
          examId: examId,
          type: 'mcq',
          questionText: JSON.stringify({
            text: "In a right-angled triangle, if the base measures 3 units and the height is 4 units, calculate the length of its hypotenuse.",
            image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&auto=format&fit=crop&q=60"
          }),
          options: [
            JSON.stringify({ text: "5 units", image: "" }),
            JSON.stringify({ text: "7 units", image: "" }),
            JSON.stringify({ text: "12 units", image: "" }),
            JSON.stringify({ text: "25 units", image: "" })
          ],
          correctAnswer: 0,
          points: 1.5,
          class: className,
          subject: subject,
          chapter: "Geometry"
        },
        {
          id: `${examId}-fall-3`,
          examId: examId,
          type: 'mcq',
          questionText: JSON.stringify({
            text: "Which of the following describes the correct derivative of $\\sin(x)$ with respect to $x$?",
            image: ""
          }),
          options: [
            JSON.stringify({ text: "$\\cos(x)$", image: "" }),
            JSON.stringify({ text: "$-\\cos(x)$", image: "" }),
            JSON.stringify({ text: "$\\sin(x)$", image: "" }),
            JSON.stringify({ text: "$\\sec^2(x)$", image: "" })
          ],
          correctAnswer: 0,
          points: 2.0,
          class: className,
          subject: subject,
          chapter: "Calculus"
        },
        {
          id: `${examId}-fall-4`,
          examId: examId,
          type: 'mcq',
          questionText: "Which unit is used to measure the rate of doing work (Power)?",
          options: [
            "Joule (J)",
            "Watt (W)",
            "Newton (N)",
            "Pascal (Pa)"
          ],
          correctAnswer: 1,
          points: 1.0,
          class: className,
          subject: subject,
          chapter: "Force & Power"
        }
      ];
    } else {
      return [
        {
          id: `${examId}-fall-g1`,
          examId: examId,
          type: 'mcq',
          questionText: "Which gas is most abundant in the Earth's atmosphere?",
          options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
          correctAnswer: 1,
          points: 1.0,
          class: className,
          subject: subject,
          chapter: "Atmosphere"
        },
        {
          id: `${examId}-fall-g2`,
          examId: examId,
          type: 'mcq',
          questionText: "What is the capital city of Bangladesh?",
          options: ["Dhaka", "Chittagong", "Sylhet", "Khulna"],
          correctAnswer: 0,
          points: 1.0,
          class: className,
          subject: subject,
          chapter: "Geography"
        }
      ];
    }
  };

  const handleStartExam = async (exam: Exam) => {
    if (exam.isPremium && !hasPremiumAccess) {
      setShowPremiumPromptModal(true);
      return;
    }

    setIsGeneratingExam(true);
    setExamPrep(null);
    setGlobalError(null);
    
    console.log('--- STARTING NEW EXAM SYSTEM ---');

    try {
      // Create attempt safely
      const currentUserName = user ? (firestoreUser?.display_name || user.user_metadata?.full_name || 'Student') : 'Guest Student';
      const currentUserClass = user ? (firestoreUser?.academic_class || dynamicClasses?.[0]?.name || 'SSC') : (dynamicClasses?.[0]?.name || 'SSC');
      
      let attemptId = '';
      if (user) {
        try {
          const attempt = await supabaseService.createAttempt({
            user_id: user.id,
            exam_id: exam.id,
            user_name: currentUserName,
            academic_class: String(exam.class || exam.academicClass || exam.academic_class || currentUserClass || 'SSC').trim(),
            academic_group: String(exam.academicGroup || exam.academic_group || 'General').trim(),
            subject: String(exam.subject || 'All').trim(),
            chapter: String(exam.chapter || 'All').trim(),
            topic: String((exam as any).topic || 'All').trim()
          });
          if (attempt && attempt.id) {
            attemptId = attempt.id;
          }
        } catch (dbErr) {
          console.warn("Could not write attempt to Supabase, falling back to local guest mode:", dbErr);
        }
      }

      if (!attemptId) {
        attemptId = `local-fallback-attempt-${Date.now()}`;
      }
      setCurrentAttemptId(attemptId);

      // 2. Fetch questions from the specific exam with fallback
      let pool: Question[] = [];
      try {
        pool = await supabaseService.fetchQuestions(exam);
      } catch (poolErr) {
        console.warn("Could not fetch questions from db: ", poolErr);
      }
      
      // Selection Logic: Shuffle / slice based on totalQuestionsToShow / total_questions_to_show
      const limitCount = exam.totalQuestionsToShow || exam.total_questions_to_show || pool.length || 10;
      let finalQuestions = [...pool];
      if ((exam as any).randomizeQuestions !== false) {
        finalQuestions.sort(() => Math.random() - 0.5);
      }
      finalQuestions = finalQuestions.slice(0, limitCount);

      // Pad with pristine placeholders if we have less questions in DB than configured/expected
      if (finalQuestions.length < limitCount) {
        finalQuestions = padQuestionsWithPlaceholders(
          finalQuestions,
          limitCount,
          exam.examType || exam.exam_type || 'mcq',
          exam
        );
      }
      
      console.log(`Pool size: ${pool.length}, Selected: ${finalQuestions.length}`);

      const timeLimit = exam.timeLimit || exam.time_limit || 30;

      setActiveExam({ 
        ...exam, 
        questions: finalQuestions,
        timeLimit: Math.round(timeLimit)
      } as any);
      
      setExamAnswers({});
      setExamTimeLeft(Math.round(timeLimit) * 60);
      setExamResults(null);
      setIsExamActive(true);
      setView('exam');
      setExamPrep(null);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('--- EXAM GENERATION FAILED ---');
      setGlobalError(error.message || "Failed to generate exam.");
    } finally {
      setIsGeneratingExam(false);
    }
  };

  const handleExamAnswer = async (questionId: string, value: string | number) => {
    setExamAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));

    if (currentAttemptId && !currentAttemptId.startsWith('local-fallback-attempt-')) {
      try {
        await supabaseService.upsertAnswer({
          attempt_id: currentAttemptId,
          question_id: questionId,
          selected_option: value
        });
      } catch (error) {
        console.error("Error saving answer to Supabase:", error);
      }
    }
  };

  const handleCustomExamFinished = (customExam: any, result: any) => {
    setActiveExam(customExam);
    setExamResults(result);
    const answersObj: any = {};
    if (result.answers) {
      if (Array.isArray(result.answers)) {
        customExam.questions.forEach((q: any, idx: number) => {
          answersObj[q.id] = result.answers[idx];
        });
      } else {
        Object.assign(answersObj, result.answers);
      }
    }
    setExamAnswers(answersObj);
    setView('exam');
  };

  const handleExamSubmit = async () => {
    // Step 0: Initial guards and state checks
    console.log("--- STARTING EXAM SUBMISSION FLOW ---");
    if (!activeExam) {
      console.warn("[handleExamSubmit][Step 0] Blocked submission: activeExam is null or undefined.");
      return;
    }

    if (isGeneratingExam) {
      console.warn("[handleExamSubmit][Step 0] Blocked submission: Submission already in progress (isGeneratingExam is true).");
      return;
    }

    console.log("[handleExamSubmit][Step 1] Preparing transition states. Active exam ID:", activeExam?.id);
    setIsExamActive(false);
    setIsGeneratingExam(true); // Reuse as overall loading state
    setGlobalError(null);
    
    try {
      // Step 2: Extract attributes with safe fallback values
      console.log("[handleExamSubmit][Step 2] Processing exam parameters with safe defensive fallbacks...");
      const examQuestions = Array.isArray(activeExam?.questions) 
        ? activeExam.questions.filter((q: any) => q && !q.isPlaceholder)
        : [];
      
      const examTitleFallback = activeExam?.title || "Practice Match";
      const examSubjectFallback = activeExam?.subject || "General";
      const examChapterFallback = activeExam?.chapter || (activeExam as any)?.academicChapter || "General";
      const examTopicFallback = (activeExam as any)?.topic_id || (activeExam as any)?.topicId || (activeExam as any)?.topic || "General";
      const examAcademicGroupFallback = activeExam?.academicGroup || (activeExam as any)?.academic_group || "General";
      const examAnswersFallback = examAnswers || {};
      const examTimeLimitFallback = Number(activeExam?.timeLimit || 30);
      const isPremiumExamFallback = activeExam?.isPremium ?? (activeExam as any)?.is_premium ?? false;

      console.log("[handleExamSubmit][Step 2] Parameter stats resolved:", {
        questionsCount: examQuestions.length,
        title: examTitleFallback,
        subject: examSubjectFallback,
        chapter: examChapterFallback,
        topic: examTopicFallback,
        academic_group: examAcademicGroupFallback,
        time_limit: examTimeLimitFallback
      });

      // Step 3: Local answer evaluation & score calculation
      console.log("[handleExamSubmit][Step 3] Initiating local score evaluation...");
      let score = 0;
      let wrongCount = 0;
      let unansweredCount = 0;

      examQuestions.forEach((q: any, index: number) => {
        if (!q) {
          console.warn(`[handleExamSubmit][Step 3] Warning: Question at index ${index} is null or undefined.`);
          return;
        }
        const userSelectedOption = examAnswersFallback[q.id];
        const correctAnswers = q?.correctAnswer ?? q?.correct_answer;

        if (userSelectedOption === undefined || userSelectedOption === null || userSelectedOption === '') {
          unansweredCount++;
        } else if (String(userSelectedOption).trim() === String(correctAnswers).trim()) {
          score += Number(q?.points || 1);
        } else {
          wrongCount++;
        }
      });

      const totalMarks = examQuestions.reduce((acc: number, q: any) => acc + (q?.points ? Number(q.points) : 1), 0);
      const timeSpent = Math.max(0, Math.round(examTimeLimitFallback * 60 - examTimeLeft));
      const percentageScore = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0;
      const correctCount = examQuestions.length - wrongCount - unansweredCount;

      console.log("[handleExamSubmit][Step 3] Local score evaluation results:", {
        calculatedScore: score,
        totalMarks,
        timeSpentSeconds: timeSpent,
        percentageScore,
        correctCount,
        wrongCount,
        unansweredCount
      });

      const currentUserName = user ? (firestoreUser?.display_name || user.user_metadata?.full_name || 'Student') : 'Guest Student';
      const currentUserClass = user ? (firestoreUser?.academic_class || dynamicClasses?.[0]?.name || 'SSC') : (dynamicClasses?.[0]?.name || 'SSC');

      // Step 4: Construct the database insert payload - matching public.exam_attempts exactly
      const cleanPayload: ExamAttemptDB = {
        exam_id: activeExam?.id || null,
        user_id: user?.id || null,
        answers: examAnswersFallback,
        score: Math.max(0, isNaN(score) ? 0 : score),
        total_questions: Math.max(0, isNaN(examQuestions.length) ? 0 : examQuestions.length),
        time_taken: Math.max(0, isNaN(timeSpent) ? 0 : timeSpent),
        completed_at: new Date().toISOString(),
        user_name: String(currentUserName || 'Student').trim(),
        total_marks: Math.max(0, isNaN(totalMarks) ? 0 : totalMarks),
        correct_count: Math.max(0, isNaN(correctCount) ? 0 : correctCount),
        wrong_count: Math.max(0, isNaN(wrongCount) ? 0 : wrongCount),
        unanswered_count: Math.max(0, isNaN(unansweredCount) ? 0 : unansweredCount),
        is_premium: Boolean(isPremiumExamFallback),
        academic_class: String(activeExam?.class || activeExam?.academicClass || activeExam?.academic_class || currentUserClass || 'SSC').trim(),
        academic_group: String(activeExam?.academicGroup || activeExam?.academic_group || 'General').trim(),
        subject: String(activeExam?.subject || 'All').trim(),
        chapter: String(activeExam?.chapter || 'All').trim(),
        topic: String((activeExam as any)?.topic || 'All').trim()
      };

      let isUpsert = false;
      if (currentAttemptId && !currentAttemptId.startsWith('local-fallback-attempt-')) {
        cleanPayload.id = currentAttemptId;
        isUpsert = true;
      }

      console.log(`[handleExamSubmit][Step 4] DB WRITE PREPARATION. Mode: ${isUpsert ? 'UPSERT' : 'INSERT'}`);
      console.log("[handleExamSubmit][Step 4] Final frontend payload to transmit:", cleanPayload);

      // Step 5: Save to Database
      console.log("[handleExamSubmit][Step 5] Triggering supabaseService.safeWrite transaction...");
      const savedAttempt = await supabaseService.safeWrite(
        'exam_attempts',
        cleanPayload,
        isUpsert ? 'upsert' : 'insert'
      );

      if (!savedAttempt || !savedAttempt.id) {
        console.error("[handleExamSubmit][Step 5] DB Save failed! Result is empty or missing ID column response.");
        throw new Error("Supabase insert/upsert returned null or empty result. Row was not saved successfully.");
      }

      console.log("[handleExamSubmit][Step 5] DB Save SUCCESS. Supabase response returned row:", savedAttempt);

      // Automatically track wrong/correct questions for MCQ checks
      if (user && user.id) {
        examQuestions.forEach((q: any) => {
          if (q && q.type === 'mcq' && q.id) {
            const userSelectedOption = examAnswersFallback[q.id];
            const correctOption = q?.correctAnswer ?? q?.correct_answer;
            if (userSelectedOption !== undefined && userSelectedOption !== null && userSelectedOption !== '') {
              if (String(userSelectedOption).trim() === String(correctOption).trim()) {
                supabaseService.removeWrongQuestion(user.id, q.id).catch(e => {
                  console.warn("[handleExamSubmit] Failed to remove correct question from wrong track:", e);
                });
              } else {
                supabaseService.recordWrongQuestion(
                  user.id,
                  q.id,
                  String(userSelectedOption),
                  String(correctOption),
                  activeExam?.id || null,
                  'Standard Exam'
                ).catch(e => {
                  console.warn("[handleExamSubmit] Failed to record wrong question:", e);
                });
              }
            }
          }
        });
      }

      // Step 6: Update local results state with all UI attributes
      console.log("[handleExamSubmit][Step 6] Updating local results page client-side state...");
      setExamResults({
        ...savedAttempt,
        id: savedAttempt.id,
        user_id: savedAttempt.user_id || user?.id || 'guest',
        exam_id: activeExam.id,
        user_name: savedAttempt.user_name || currentUserName,
        academicClass: savedAttempt.academic_class || currentUserClass,
        academicGroup: savedAttempt.academic_group || 'General',
        subject: savedAttempt.subject || 'All',
        chapter: savedAttempt.chapter || 'All',
        topic: savedAttempt.topic || 'All',
        score: savedAttempt.score !== undefined ? Number(savedAttempt.score) : score,
        wrong_count: savedAttempt.wrong_count !== undefined ? Number(savedAttempt.wrong_count) : wrongCount,
        unanswered_count: savedAttempt.unanswered_count !== undefined ? Number(savedAttempt.unanswered_count) : unansweredCount,
        total_questions: savedAttempt.total_questions !== undefined ? Number(savedAttempt.total_questions) : examQuestions.length,
        time_taken: savedAttempt.time_taken !== undefined ? Number(savedAttempt.time_taken) : timeSpent,
        completed_at: savedAttempt.completed_at || new Date().toISOString(),
        userName: savedAttempt.user_name || currentUserName,
        totalQuestions: examQuestions.length,
        examTitle: examTitleFallback,
        totalMarks: totalMarks,
        answers: examAnswersFallback,
        percentage: percentageScore
      } as any);

      // Step 7: Update leaderboards, achievements, streaks, and user stats on success path
      if (user && user.id) {
        try {
          console.log("[handleExamSubmit][Step 7] Automatically syncing achievements, stats, XP, and streaks...");
          
          await supabaseService.syncLeaderboardAndStats(user.id, activeExam.id, {
            score: Math.max(0, score),
            time_taken: timeSpent,
            correct_count: correctCount,
            wrong_count: wrongCount,
            unanswered_count: unansweredCount,
            total_questions: examQuestions.length,
            user_name: currentUserName,
            user_class: currentUserClass,
            exam_title: examTitleFallback,
            user_photo: user?.user_metadata?.avatar_url || '',
            subject: String(activeExam?.subject || 'All').trim(),
            chapter: String(activeExam?.chapter || 'All').trim(),
            topic: String((activeExam as any)?.topic || 'All').trim(),
            academic_group: String(activeExam?.academicGroup || activeExam?.academic_group || 'General').trim()
          });
          
          console.log("[handleExamSubmit][Step 7] Achievements & User Stats update SUCCESS.");
          
          // Trigger instant real-time scoreboard fetch
          console.log("[handleExamSubmit][Step 7] Requesting instant leaderboard update...");
          await fetchLeaderboards();
          console.log("[handleExamSubmit][Step 7] Leaderboards update complete!");
        } catch (syncErr: any) {
          console.error("[handleExamSubmit][Step 7] Warning: Achievements & statistics synchronization failed (Attempt was saved successfully though):", syncErr);
        }
      }

      console.log("[handleExamSubmit][Final State] Redirecting view to results...");
      setView('exam');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error("[handleExamSubmit] CRITICAL SUBMISSION FAILURE INTERRUPTED:", error);
      console.error("[handleExamSubmit] Structural error logs:", {
        errorMessage: error.message || error,
        errorDetails: error.details || "",
        errorCode: error.code || ""
      });
      setGlobalError("Submission failed: " + (error.message || "Database insert error occurred. Please try again."));
    } finally {
      setIsGeneratingExam(false);
      setCurrentAttemptId(null);
      console.log("--- EXAM SUBMISSION FLOW WORKFLOW TERMINATED ---");
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamActive && examTimeLeft > 0) {
      timer = setInterval(() => {
        setExamTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (examTimeLeft === 0 && isExamActive) {
      handleExamSubmit();
    }
    return () => clearInterval(timer);
  }, [isExamActive, examTimeLeft]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null);

  // Footer States
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<Partial<ContentItem>>({
    category: 'Notes',
    academicClass: dynamicClasses?.[0]?.name || 'SSC',
    subject: '',
    chapter: '',
    chapterId: '',
    topicId: '',
    academicGroup: 'All',
    title: '',
    description: '',
    url: '',
    thumbnail: '',
    isPremium: false,
    tags: [],
  });

  const [newPlaylist, setNewPlaylist] = useState<Partial<Playlist>>({
    title: '',
    description: '',
    type: 'youtube',
    youtubePlaylistId: '',
    videoIds: [],
    academicClass: dynamicClasses?.[0]?.name || 'SSC',
    academicGroup: 'All',
    subject: '',
    chapter: '',
    thumbnail: '',
    isPremium: false
  });
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    title: '',
    class: dynamicClasses?.[0]?.name || 'SSC',
    academicGroup: 'All',
    subject: 'Math',
    chapter: '',
    chapterNameCustom: '',
    topicIds: [],
    examType: 'mcq',
    timeLimit: 30,
    totalQuestionsToShow: 30,
    negativeMarking: false,
    negativeValue: 0.25,
    status: 'approved'
  });

  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    examId: '',
    type: 'mcq',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 1,
    class: dynamicClasses?.[0]?.name || 'SSC',
    academicGroup: 'All',
    subject: '',
    chapter: '',
    topicId: ''
  });

  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
  const [optionImageFiles, setOptionImageFiles] = useState<(File | null)[]>([null, null, null, null]);
  const [optionImagePreviews, setOptionImagePreviews] = useState<(string | null)[]>([null, null, null, null]);
  const [explanationImageFile, setExplanationImageFile] = useState<File | null>(null);
  const [explanationImagePreview, setExplanationImagePreview] = useState<string | null>(null);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (file.size < 150 * 1024) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 1000;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.substring(0, file.name.lastIndexOf('.')) + '.webp', {
                type: 'image/webp',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          }, 'image/webp', 0.82);
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleTriggerEditQuestion = (q: any) => {
    const rawText = q.questionText || q.question_text || "";
    const parsedText = parseQuestionText(rawText);
    const imageFromText = parsedText.image;
    const directQuestionImage = q.question_image || imageFromText || null;

    const rawOptions = q.options || ['', '', '', ''];
    const parsedOptions: string[] = [];
    const parsedOptionImages: (string | null)[] = [null, null, null, null];

    rawOptions.forEach((opt: any, idx: number) => {
      const parsedOpt = parseOption(opt);
      parsedOptions[idx] = parsedOpt.text;
      parsedOptionImages[idx] = parsedOpt.image || null;
    });

    if (q.option_a_image) parsedOptionImages[0] = q.option_a_image;
    if (q.option_b_image) parsedOptionImages[1] = q.option_b_image;
    if (q.option_c_image) parsedOptionImages[2] = q.option_c_image;
    if (q.option_d_image) parsedOptionImages[3] = q.option_d_image;

    const parsedExplanation = deserializeExplanation(q.explanation || q.explanationText || '');

    setNewQuestion({
      ...q,
      questionText: parsedText.text,
      options: parsedOptions,
      correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : q.correct_answer,
      explanation: parsedExplanation.text,
      difficulty: q.difficulty || parsedExplanation.difficulty,
      isPremium: q.is_premium !== undefined ? q.is_premium : (q.isPremium !== undefined ? q.isPremium : parsedExplanation.is_premium),
      tags: q.tags || parsedExplanation.tags,
      status: q.status || parsedExplanation.status,
      negativeMarks: q.negative_marks !== undefined ? q.negative_marks : (q.negativeMarks !== undefined ? q.negativeMarks : parsedExplanation.negative_marks)
    });

    setQuestionImageFile(null);
    setQuestionImagePreview(directQuestionImage);
    setOptionImageFiles([null, null, null, null]);
    setOptionImagePreviews(parsedOptionImages);
    setExplanationImageFile(null);
    setExplanationImagePreview(q.explanation_image || parsedExplanation.explanation_image || null);

    setEditingQuestionId(q.id);
    setIsAddingQuestion(true);
  };

  const [temporaryQuestions, setTemporaryQuestions] = useState<Question[]>([]);
  const [allLeaderboards, setAllLeaderboards] = useState<LeaderboardEntry[]>([]);
  const [allUserStats, setAllUserStats] = useState<UserStats[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<'global' | 'exam'>('global');
  
  const fetchLeaderboards = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
  }, [queryClient]);

  const [leaderboardClassFilter, setLeaderboardClassFilter] = useState<string>('');
  const [leaderboardExamId, setLeaderboardExamId] = useState<string | null>(null);
  const [questionBankExamId, setQuestionBankExamId] = useState<string>('global');

  const getClassGroup = (academicClass: string | null | undefined): string => {
    if (!academicClass) return '';
    return String(academicClass).trim().toLowerCase();
  };

  const compressAndCropAvatar = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 300; // 300x300 pixels
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file); // fallback
            return;
          }

          // Center crop the source image
          const minDimension = Math.min(img.width, img.height);
          const sourceX = (img.width - minDimension) / 2;
          const sourceY = (img.height - minDimension) / 2;

          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            minDimension,
            minDimension,
            0,
            0,
            size,
            size
          );

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = (e) => reject(e);
        img.src = event.target?.result as string;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const uploadProfileImage = async (file: File | Blob, originalName: string): Promise<string> => {
    console.log("[STORAGE] Starting profile picture upload log:", {
      fileName: originalName,
      fileSize: file.size,
      fileType: file.type
    });

    if (!user) throw new Error("User session expired. Please sign in again.");

    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `avatars/${user.id}/${Date.now()}.${ext}`;

    try {
      // 1. Try "profile-images" bucket first
      console.log("[STORAGE] Attempting upload to bucket 'profile-images' at path:", filePath);
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type || 'image/jpeg'
        });

      if (error) {
        console.warn("[STORAGE] 'profile-images' bucket upload failed, attempting fallback to 'resources':", error);
        
        // 2. Fall back to "resources" bucket if "profile-images" failed
        console.log("[STORAGE] Falling back to bucket 'resources' at path:", filePath);
        const { error: fallbackError } = await supabase.storage
          .from('resources')
          .upload(filePath, file, {
            cacheControl: '31536000',
            upsert: true,
            contentType: file.type || 'image/jpeg'
          });

        if (fallbackError) {
          console.error("[STORAGE] Fallback upload to 'resources' bucket also failed:", fallbackError);
          throw fallbackError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);

        console.log("[STORAGE] Upload to fallback bucket 'resources' successful. URL:", publicUrl);
        return publicUrl;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      console.log("[STORAGE] Upload to bucket 'profile-images' successful. URL:", publicUrl);
      return publicUrl;
    } catch (err: any) {
      console.error("[STORAGE] Profile storage error / upload failures captured:", err);
      throw new Error(`Profile image upload failed: ${err.message || err}`);
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    setGlobalError(null);

    // Detailed console logs as requested
    console.log("[fetchLeaderboards] Initiating profile update for user:", user.id);
    console.log("[fetchLeaderboards] Profile form data payload:", profileFormData);
    console.log("[fetchLeaderboards] Avatar modification state:", { selectedAvatarFile: !!selectedAvatarFile, isAvatarRemoved });

    try {
      let finalAvatarUrl: string | null = firestoreUser?.avatarUrl || firestoreUser?.avatar_url || firestoreUser?.photoURL || user?.user_metadata?.avatar_url || null;

      if (isAvatarRemoved) {
        finalAvatarUrl = null;
        console.log("[fetchLeaderboards] User explicitly requested to remove avatar.");
      } else if (selectedAvatarFile) {
        console.log("[fetchLeaderboards] Compressing selected avatar file.");
        try {
          const croppedBlob = await compressAndCropAvatar(selectedAvatarFile);
          console.log("[fetchLeaderboards] Image compressed successfully. Size:", croppedBlob.size);
          
          finalAvatarUrl = await uploadProfileImage(croppedBlob, selectedAvatarFile.name);
          console.log("[fetchLeaderboards] Profile image uploaded. Final URL:", finalAvatarUrl);
        } catch (uploadErr: any) {
          console.error("[fetchLeaderboards] Profile picture upload/storage error:", uploadErr);
          throw new Error(`Profile picture save failed: ${uploadErr.message || uploadErr}`);
        }
      }

      // Update Supabase Auth metadata
      console.log("[fetchLeaderboards] Updating Supabase Auth user metadata.");
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          full_name: profileFormData.displayName,
          academic_class: profileFormData.academicClass,
          academic_group: profileFormData.academicGroup,
          avatar_url: finalAvatarUrl
        }
      });

      if (authError) {
        console.error("[fetchLeaderboards] Supabase Auth update failed:", authError);
        throw authError;
      }

      // Update profiles table. Column name is full_name, avatar_url, updated_at, and NOT display_name!
      console.log("[fetchLeaderboards] Updating profiles table with payload:", {
        full_name: profileFormData.displayName,
        academic_class: profileFormData.academicClass,
        academic_group: profileFormData.academicGroup,
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString()
      });

      const { data: updateResp, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileFormData.displayName,
          academic_class: profileFormData.academicClass,
          academic_group: profileFormData.academicGroup,
          avatar_url: finalAvatarUrl,
          photo_url: finalAvatarUrl, // Keep both in sync to prevent broken photoURL references in existing parts
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (profileError) {
        console.error("[fetchLeaderboards] Supabase profiles update failed:", profileError);
        throw profileError;
      }

      console.log("[fetchLeaderboards] Supabase profiles update response:", updateResp);

      // Update local state instantly so everything synchronizes in real-time
      setUser(prev => prev ? { 
        ...prev, 
        user_metadata: { 
          ...prev.user_metadata, 
          full_name: profileFormData.displayName,
          avatar_url: finalAvatarUrl
        } 
      } : null);

      setFirestoreUser(prev => prev ? { 
        ...prev, 
        displayName: profileFormData.displayName,
        display_name: profileFormData.displayName,
        name: profileFormData.displayName,
        academicClass: profileFormData.academicClass,
        academic_class: profileFormData.academicClass,
        academicGroup: profileFormData.academicGroup,
        academic_group: profileFormData.academicGroup,
        avatar_url: finalAvatarUrl,
        avatarUrl: finalAvatarUrl,
        photoURL: finalAvatarUrl
      } : null);

      // Instantly synchronize changes directly to both leaderboards and user_stats caches
      console.log("[fetchLeaderboards] Syncing profile changes directly to leaderboards table.");
      const { error: syncLeadErr } = await supabase
        .from('leaderboards')
        .update({
          user_photo: finalAvatarUrl,
          user_name: profileFormData.displayName
        })
        .eq('user_id', user.id);
      if (syncLeadErr) {
        console.warn("[fetchLeaderboards] Warning: failed syncing updated photo to leaderboards cached rows:", syncLeadErr);
      }

      console.log("[fetchLeaderboards] Syncing profile changes directly to user_stats table.");
      const { error: syncStatsErr } = await supabase
        .from('user_stats')
        .update({
          user_photo: finalAvatarUrl,
          user_name: profileFormData.displayName
        })
        .eq('user_id', user.id);
      if (syncStatsErr) {
        console.warn("[fetchLeaderboards] Warning: failed syncing updated photo to user_stats cached rows:", syncStatsErr);
      }

      // Re-trigger global leaderboard fetch so all elements are updated instantly in the current layout
      fetchLeaderboards();

      setIsEditingProfile(false);
      console.log("[fetchLeaderboards] Profile update accomplished successfully.");
    } catch (error: any) {
      console.error("[fetchLeaderboards] Profiles update general caught exception:", error);
      // Requirement 7: Show REAL error messages in development mode
      const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('ais-dev') || window.location.hostname.includes('run.app');
      const errorMsg = error.message || error.details || "Failed to update profile";
      setGlobalError(isDev ? `Error: ${errorMsg}` : "Failed to update profile. Please try again.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const [newExternal, setNewExternal] = useState<Partial<ExternalResource>>({
    title: '',
    description: '',
    url: '',
    icon: '🌐',
    chapter: '',
    thumbnail: ''
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, field: 'thumbnail' | 'url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit check: 300MB
    if (file.size > 300 * 1024 * 1024) {
      setUploadError("File size exceeds 300MB limit.");
      return;
    }

    if (field === 'thumbnail') {
      setSelectedFiles(prev => ({ ...prev, thumbnail: file }));
      // Preview for thumbnail
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isAddingPlaylist) {
          setNewPlaylist(prev => ({ ...prev, thumbnail: reader.result as string }));
        } else {
          setNewItem(prev => ({ ...prev, thumbnail: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFiles(prev => ({ ...prev, resource: file }));
      setNewItem(prev => ({ ...prev, url: file.name })); // Temporary show filename
    }
  };

  const resetToHome = () => {
    setView('home');
    setSelectedCategory(null);
    setClassFilter('All');
    setSubjectFilter('All');
    setSearchQuery('');
    setActiveExam(null);
    setIsExamActive(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const normalizeClassName = (name: string) => {
    if (!name) return '';
    const n = name.trim().toLowerCase();
    if (n === 'class 10' || n === 'ssc' || n === 'class x' || n === 'class-10') return 'ssc';
    if (n === 'class 12' || n === 'hsc' || n === 'class xii' || n === 'class-12') return 'hsc';
    return n;
  };

  const getSubjectsForClass = (className: string) => {
    const norm = normalizeClassName(className);
    const matchedClass = dynamicClasses.find(c => normalizeClassName(c.name) === norm);
    if (!matchedClass) return [];
    return dynamicSubjects.filter(s => s.classId === matchedClass.id);
  };

  const getChaptersForSubject = (subjectName: string, className: string) => {
    const norm = normalizeClassName(className);
    const matchedClass = dynamicClasses.find(c => normalizeClassName(c.name) === norm);
    if (!matchedClass) return [];
    const matchedSubject = dynamicSubjects.find(s => s.name?.toLowerCase() === subjectName?.toLowerCase() && s.classId === matchedClass.id);
    if (!matchedSubject) return [];
    return dynamicChapters.filter(c => c.subjectId === matchedSubject.id);
  };

  const getTopicsForChapter = (chapterName: string, subjectName: string, className: string) => {
    const norm = normalizeClassName(className);
    const matchedClass = dynamicClasses.find(c => normalizeClassName(c.name) === norm);
    if (!matchedClass) return [];
    const matchedSubject = dynamicSubjects.find(s => s.name?.toLowerCase() === subjectName?.toLowerCase() && s.classId === matchedClass.id);
    if (!matchedSubject) return [];
    const matchedChapter = dynamicChapters.find(c => c.name?.toLowerCase() === chapterName?.toLowerCase() && c.subjectId === matchedSubject.id);
    if (!matchedChapter) return [];
    return dynamicTopics.filter(t => t.chapterId === matchedChapter.id);
  };

  const getTopicsForSubject = (subjectName: string, className: string) => {
    const norm = normalizeClassName(className);
    const matchedClass = dynamicClasses.find(c => normalizeClassName(c.name) === norm);
    if (!matchedClass) return [];
    const matchedSubject = dynamicSubjects.find(s => s.name?.toLowerCase() === subjectName?.toLowerCase() && s.classId === matchedClass.id);
    if (!matchedSubject) return [];
    const chaps = dynamicChapters.filter(c => c.subjectId === matchedSubject.id);
    const chapIds = chaps.map(c => c.id);
    return dynamicTopics.filter(t => chapIds.includes(t.chapterId));
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    const hasRecovery = hashParams.get('type') === 'recovery' || 
                        searchParams.get('type') === 'recovery' || 
                        window.location.hash.includes('type=recovery') || 
                        window.location.search.includes('type=recovery') ||
                        window.location.hash.includes('type%3Drecovery') ||
                        window.location.search.includes('type%3Drecovery');

    console.log("[App.tsx / MOUNT] Initial Route Analysis:", {
      pathname: window.location.pathname,
      hasRecovery,
      hashLength: window.location.hash.length,
      searchLength: window.location.search.length
    });

    if (window.location.pathname === '/reset-password' || window.location.pathname.startsWith('/reset-password/') || hasRecovery) {
      console.log("[App.tsx / ROUTING] Redirecting to dedicated password reset page.");
      setView('reset-password');
      if (window.location.pathname !== '/reset-password') {
        const hash = window.location.hash;
        const search = window.location.search;
        window.history.replaceState({}, document.title, `/reset-password${search}${hash}`);
      }
    } else if (window.location.pathname === '/dashboard') {
      console.log("[App.tsx / ROUTING] Direct path /dashboard detected.");
      setView('dashboard');
    } else if (window.location.pathname === '/admin') {
      console.log("[App.tsx / ROUTING] Direct path /admin detected.");
      setView('admin');
    } else if (window.location.pathname === '/login') {
      console.log("[App.tsx / ROUTING] Direct path /login detected.");
      setView('home');
    }

    supabase.auth.getSession().then((res) => {
      const session = res?.data?.session;
      if (session?.user) {
        const mappedUser = {
          id: session.user.id,
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name || session.user.email,
          photoURL: session.user.user_metadata?.avatar_url || null,
          emailVerified: !!session.user.email_confirmed_at,
          user_metadata: session.user.user_metadata
        } as any;
        setUser(mappedUser);
      } else {
        setUser(null);
        setUserRole('user');
        setCanUpload(false);
      }
    }).catch(err => {
      console.error("Auth session error:", err);
    }).finally(() => {
       setIsAuthReady(true);
    });

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[Auth Listener] Event fired:", event);
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset-password');
        if (window.location.pathname !== '/reset-password') {
          window.history.replaceState({}, document.title, `/reset-password${window.location.search}${window.location.hash}`);
        }
      }

      if (session?.user) {
        const mappedUser = {
          id: session.user.id,
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata.full_name || session.user.email,
          photoURL: session.user.user_metadata.avatar_url || null,
          emailVerified: !!session.user.email_confirmed_at,
          user_metadata: session.user.user_metadata
        } as any;
        setUser(mappedUser);
      } else {
        setUser(null);
        setUserRole('user');
        setCanUpload(false);
      }
    });

    return () => authListener.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    const currentPath = window.location.pathname;
    let targetPath = '/';

    if (view === 'reset-password') {
      targetPath = '/reset-password';
    } else if (view === 'dashboard') {
      targetPath = '/dashboard';
    } else if (view === 'admin') {
      targetPath = '/admin';
    } else if (view === 'home') {
      targetPath = user ? '/' : '/login';
    } else {
      targetPath = '/';
    }

    if (currentPath !== targetPath && currentPath !== '/reset-password') {
      const isCustomExplicitPath = currentPath === '/admin' || currentPath === '/dashboard';
      if (!(isCustomExplicitPath && !user)) {
        console.log("[App.tsx / PATH_SYNC] Syncing path to match state:", targetPath);
        window.history.replaceState({}, document.title, targetPath);
      }
    }
  }, [view, user, isAuthReady]);

  // --- QUERY DEFINITIONS ---

  // 1. Profile Query (handles profiles and user_roles)
  const { data: qProfileData } = useQuery({
    queryKey: ['profiles', user?.id],
    queryFn: async () => {
      if (!user) return null;
      console.log("[ReactQuery] Fetch profile started for user ID:", user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const isAdminEmail = user.email === 'mdsohanali636@gmail.com';
      let userRoleData = null;
      try {
        const { data, error: rError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id);
        if (!rError && data && data.length > 0) {
          userRoleData = data[0];
        } else {
          const { data: dataById } = await supabase
            .from('user_roles')
            .select('*')
            .eq('id', user.id);
          if (dataById && dataById.length > 0) {
            userRoleData = dataById[0];
          }
        }
      } catch (err) {
        console.warn("[ReactQuery] Could not query user_roles:", err);
      }

      return { profile, userRoleData, isAdminEmail, error };
    },
    enabled: !!user,
  });

  // 2. Leaderboards & User Stats Query
  const { data: qLeaderboardData } = useQuery({
    queryKey: ['leaderboards'],
    queryFn: async () => {
      console.log("[ReactQuery] Fetching leaderboards and user stats...");
      const { data: leadData, error: leadErr } = await supabase
        .from('leaderboards')
        .select('*')
        .order('score', { ascending: false })
        .order('completion_time', { ascending: true })
        .limit(500);

      if (leadErr) {
        console.error("[ReactQuery] Leaderboard select failure:", leadErr);
      }

      const { data: statsData, error: statsErr } = await supabase
        .from('user_stats')
        .select('*')
        .order('total_xp', { ascending: false })
        .limit(500);

      if (statsErr) {
        console.error("[ReactQuery] User stats select failure:", statsErr);
      }

      const uniqueUserIds = Array.from(new Set([
        ...(leadData || []).map((row: any) => row.user_id),
        ...(statsData || []).map((row: any) => row.user_id)
      ].filter(Boolean)));

      let activeProfilesMap: Record<string, { avatar_url: string | null; full_name: string | null }> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profileList } = await supabase
          .from('profiles')
          .select('id, avatar_url, full_name')
          .in('id', uniqueUserIds);
        if (profileList) {
          profileList.forEach((p: any) => {
            activeProfilesMap[p.id] = {
              avatar_url: p.avatar_url,
              full_name: p.full_name
            };
          });
        }
      }

      return { leadData, statsData, activeProfilesMap };
    },
    enabled: !!user,
  });

  // 3. Feedback Query
  const { data: qFeedbackData } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: async () => {
      console.log("[ReactQuery] Fetching feedback...");
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: userRole === 'admin',
  });

  // Query to fetch active pro students in real-time
  const { data: premiumStudents = [] } = useQuery({
    queryKey: ['premiumStudents'],
    queryFn: async () => {
      console.log("[ReactQuery] Fetching premium/pro students...");
      const premiumUserIds = new Set<string>();

      try {
        const { data: premiumRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, id')
          .eq('is_premium', true);

        if (!rolesError && premiumRoles) {
          premiumRoles.forEach(r => {
            if (r.user_id) premiumUserIds.add(r.user_id);
          });
        }
      } catch (rolesErr) {
        console.warn("Could not query user_roles for premium check:", rolesErr);
      }

      try {
        const { data: premiumProfilesDirect, error: profilesError } = await supabase
          .from('profiles')
          .select('id')
          .eq('has_premium_access', true);

        if (!profilesError && premiumProfilesDirect) {
          premiumProfilesDirect.forEach(p => {
            if (p.id) premiumUserIds.add(p.id);
          });
        }
      } catch (profilesErr) {
        console.warn("Could not query profiles for direct premium check:", profilesErr);
      }

      if (premiumUserIds.size === 0) {
        return [];
      }

      try {
        const { data: userProfiles, error: detailsError } = await supabase
          .from('profiles')
          .select('id, full_name, display_name, avatar_url, created_at')
          .in('id', Array.from(premiumUserIds))
          .order('created_at', { ascending: false });

        if (!detailsError && userProfiles) {
          return userProfiles;
        }
      } catch (err) {
        console.error("Error retrieving premium student profiles details:", err);
      }

      return [];
    }
  });

  // 4. Resources / Content Items Query
  const { data: qResourcesData } = useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      console.log("[ReactQuery] Fetching resources...");
      return await supabaseService.fetchResources();
    },
  });

  // 5. Playlists Query
  const { data: qPlaylistsData } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      console.log("[ReactQuery] Fetching playlists...");
      const { data } = await supabase.from('playlists').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  // 6. Exams Query
  const { data: qExamsData } = useQuery({
    queryKey: ['exams', userRole, canUpload],
    queryFn: async () => {
      console.log("[ReactQuery] Fetching exams...");
      return await supabaseService.fetchExams(userRole === 'admin' || canUpload);
    },
  });

  // 7. Exam Attempts Query
  const { data: qExamAttemptsData } = useQuery({
    queryKey: ['exam_attempts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      console.log("[ReactQuery] Fetching exam attempts...");
      const { data } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // 7.5. Saved Questions Query
  const { data: qSavedQuestionsData, refetch: refetchSavedQuestions } = useQuery({
    queryKey: ['saved_questions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      console.log("[ReactQuery] Fetching saved questions...");
      return await supabaseService.getSavedQuestions(user.id);
    },
    enabled: !!user,
  });

  // 7.6. Wrong Questions Query
  const { data: qWrongQuestionsData, refetch: refetchWrongQuestions } = useQuery({
    queryKey: ['wrong_questions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      console.log("[ReactQuery] Fetching wrong questions...");
      return await supabaseService.getWrongQuestions(user.id);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (qSavedQuestionsData) {
      setSavedQuestionIds(new Set(qSavedQuestionsData.map((d: any) => d.question_id)));
    } else {
      setSavedQuestionIds(new Set());
    }
  }, [qSavedQuestionsData]);

  // 8. Performance History Query
  const { data: qPerformanceHistoryData } = useQuery({
    queryKey: ['performance_history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      console.log("[ReactQuery] Fetching performance history...");
      const { data } = await supabase
        .from('performance_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // 9. Newsletter Subscribers Query
  const { data: qNewsletterSubscribers } = useQuery({
    queryKey: ['newsletter_subscribers'],
    queryFn: async () => {
      console.log("[ReactQuery] Fetching newsletter subscribers...");
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        if (!error.message.includes('permission denied')) {
          console.warn("newsletter_subscribers select warning:", error);
        }
        return [];
      }
      return data || [];
    },
  });

  // 10. Newsletter Email Logs Query
  const { data: qNewsletterEmailLogs } = useQuery({
    queryKey: ['newsletter_email_logs'],
    queryFn: async () => {
      console.log("[ReactQuery] Fetching newsletter email logs...");
      const { data, error } = await supabase
        .from('newsletter_email_logs')
        .select('*')
        .order('sent_at', { ascending: false });
      if (error) {
        if (!error.message.includes('permission denied')) {
          console.warn("newsletter_email_logs select warning:", error);
        }
        return [];
      }
      return data || [];
    },
    enabled: userRole === 'admin',
  });

  // 11. Public Subscriber Count Query
  const { data: qPublicSubscriberCount } = useQuery({
    queryKey: ['public_subscriber_count'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/newsletter/count');
        if (res.ok) {
          const d = await res.json();
          return d.count || 0;
        }
      } catch (e) {
        console.warn("Failed fetching public subscriber count:", e);
      }
      return 0;
    },
  });


  // --- STATE SYNCHRONIZATION EFFECTS ---

  // 1. Profile Sync Effect
  useEffect(() => {
    if (!user || !qProfileData) return;

    const syncProfile = async () => {
      const { profile, userRoleData, isAdminEmail } = qProfileData;

      const isExpired = !isAdminEmail && profile?.premium_expiry && new Date(profile.premium_expiry).getTime() < Date.now();
      const defaultRole = isAdminEmail ? 'admin' : (profile?.role || 'user');
      const defaultCanUpload = isAdminEmail ? true : (profile?.can_upload ?? false);
      const defaultCanManageExams = isAdminEmail ? true : false;
      const defaultCanManageQuestions = isAdminEmail ? true : false;
      const defaultCanManageResources = isAdminEmail ? true : false;
      const defaultIsPremium = isAdminEmail ? true : (isExpired ? false : (profile?.has_premium_access ?? false));

      let currentRole = defaultRole;
      let currentCanUpload = defaultCanUpload;
      let currentCanManageExams = defaultCanManageExams;
      let currentCanManageQuestions = defaultCanManageQuestions;
      let currentCanManageResources = defaultCanManageResources;
      let currentIsPremium = defaultIsPremium;

      if (userRoleData) {
        currentRole = userRoleData.role || defaultRole;
        currentCanUpload = userRoleData.can_upload ?? defaultCanUpload;
        currentCanManageExams = userRoleData.can_manage_exams ?? defaultCanManageExams;
        currentCanManageQuestions = userRoleData.can_manage_questions ?? defaultCanManageQuestions;
        currentCanManageResources = userRoleData.can_manage_resources ?? defaultCanManageResources;
        currentIsPremium = isExpired ? false : (userRoleData.is_premium ?? defaultIsPremium);
      } else {
        try {
          const insertRec = {
            user_id: user.id,
            role: defaultRole,
            can_upload: defaultCanUpload,
            can_manage_exams: defaultCanManageExams,
            can_manage_questions: defaultCanManageQuestions,
            can_manage_resources: defaultCanManageResources,
            is_premium: defaultIsPremium
          };
          const { error: insError } = await supabase.from('user_roles').insert([insertRec]);
          if (insError) {
            const altRec = {
              id: user.id,
              role: defaultRole,
              can_upload: defaultCanUpload,
              can_manage_exams: defaultCanManageExams,
              can_manage_questions: defaultCanManageQuestions,
              can_manage_resources: defaultCanManageResources,
              is_premium: defaultIsPremium
            };
            await supabase.from('user_roles').insert([altRec]);
          }
        } catch (err) {
          console.warn("[ReactQuery] Error registering initial user roles:", err);
        }
      }

      if (isExpired && (profile?.has_premium_access || (userRoleData && userRoleData.is_premium))) {
        try {
          await supabase.from('profiles').update({ has_premium_access: false }).eq('id', user.id);
          if (userRoleData) {
            await supabase.from('user_roles').update({ is_premium: false }).eq('user_id', user.id);
          }
        } catch (syncErr) {
          console.warn("Failed to automatically deactivate expired status in DB:", syncErr);
        }
      }

      setUserRole(currentRole as any);
      setCanUpload(currentCanUpload);
      setCanManageExams(currentCanManageExams);
      setCanManageQuestions(currentCanManageQuestions);
      setCanManageResources(currentCanManageResources);
      setIsPremium(currentIsPremium);

      const hasPremium = currentIsPremium || (profile?.has_premium_access ?? false);

      if (profile) {
        const mappedProfile = {
          ...profile,
          id: profile.id,
          email: profile.email,
          display_name: profile.full_name || 'Student',
          displayName: profile.full_name || 'Student',
          name: profile.full_name || 'Student',
          academic_class: profile.academic_class,
          academicClass: profile.academic_class,
          academic_group: profile.academic_group,
          academicGroup: profile.academic_group,
          hasPremiumAccess: hasPremium,
          premiumExpiry: profile.premium_expiry,
          canUpload: currentCanUpload,
          createdAt: profile.created_at,
          photoURL: profile.avatar_url || profile.photo_url || '',
          avatar_url: profile.avatar_url || '',
          avatarUrl: profile.avatar_url || '',
          phoneNumber: profile.phone_number
        };
        setFirestoreUser(mappedProfile);

        if (isAdminEmail && profile.role !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin', can_upload: true }).eq('id', user.id);
        }
      } else {
        const { data: newProfile, error: profileInitError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || 'Student',
            role: currentRole,
            academic_class: user.user_metadata?.academic_class || (dynamicClasses?.[0]?.name || 'SSC'),
            can_upload: currentCanUpload,
          })
          .select()
          .single();

        if (profileInitError) {
          console.error("[ReactQuery] Initial profile insertion failed:", profileInitError);
        } else if (newProfile) {
          const mappedNewProfile = {
            ...newProfile,
            id: newProfile.id,
            email: newProfile.email,
            display_name: newProfile.full_name || 'Student',
            displayName: newProfile.full_name || 'Student',
            name: newProfile.full_name || 'Student',
            academic_class: newProfile.academic_class,
            academicClass: newProfile.academic_class,
            academic_group: newProfile.academic_group,
            academicGroup: newProfile.academic_group,
            hasPremiumAccess: hasPremium,
            premiumExpiry: newProfile.premium_expiry,
            canUpload: currentCanUpload,
            createdAt: newProfile.created_at,
            photoURL: newProfile.avatar_url || newProfile.photo_url || '',
            avatar_url: newProfile.avatar_url || '',
            avatarUrl: newProfile.avatar_url || '',
            phoneNumber: newProfile.phone_number
          };
          setFirestoreUser(mappedNewProfile);
        }
      }
    };

    syncProfile();
  }, [qProfileData, user, dynamicClasses]);

  // 2. Leaderboard Sync Effect
  useEffect(() => {
    if (!qLeaderboardData) return;
    const { leadData, statsData, activeProfilesMap } = qLeaderboardData;

    if (leadData) {
      const mappedLead = leadData.map((row: any) => {
        const profileOverride = activeProfilesMap[row.user_id];
        return {
          id: row.id || `${row.user_id}_${row.exam_id}`,
          class: row.academic_class || 'SSC',
          examId: row.exam_id,
          userId: row.user_id,
          userName: profileOverride?.full_name || row.user_name || 'Student',
          userPhoto: profileOverride?.avatar_url !== undefined ? profileOverride.avatar_url : (row.user_photo || row.user_avatar),
          bestScore: row.score !== undefined ? row.score : (row.best_score || 0),
          timeTaken: row.completion_time !== undefined ? row.completion_time : (row.time_taken || 0),
          lastUpdated: row.updated_at || row.last_updated,
          examTitle: row.exam_title || 'Practice Match',
          firstSubmissionAt: row.first_submission_at || row.last_updated || new Date().toISOString(),
          totalAttempts: row.total_attempts || 1,
          accuracy: row.accuracy || 0,
          xp: row.xp || 0,
          streak: row.streak || 0,
          badge: row.badge || 'Bronze',
          correctCount: row.correct_answers !== undefined ? row.correct_answers : (row.correct_count || 0),
          wrongCount: row.wrong_answers !== undefined ? row.wrong_answers : (row.wrong_count || 0),
          unansweredCount: row.skipped_answers !== undefined ? row.skipped_answers : (row.unanswered_count || 0),
          totalQuestions: row.total_questions || 0
        };
      });
      setAllLeaderboards(mappedLead);
    }

    if (statsData) {
      const mappedStats = statsData.map((row: any) => {
        const profileOverride = activeProfilesMap[row.user_id];
        return {
          userId: row.user_id,
          userName: profileOverride?.full_name || row.user_name || 'Student',
          userPhoto: profileOverride?.avatar_url !== undefined ? profileOverride.avatar_url : row.user_photo,
          totalExams: row.total_exams || 0,
          averageScore: row.average_score || 0,
          highestScore: row.highest_score || 0,
          totalCorrect: row.total_correct || 0,
          totalWrong: row.total_wrong || 0,
          totalSkipped: row.total_skipped || 0,
          totalXp: row.total_xp || 0,
          streak: row.streak || 0,
          badge: row.badge || 'Bronze',
          updatedAt: row.updated_at
        };
      });
      setAllUserStats(mappedStats);
    }
  }, [qLeaderboardData]);

  // 3. Feedback Sync Effect
  useEffect(() => {
    if (!qFeedbackData) return;
    const mappedFeedback = qFeedbackData.map((f: any) => ({
      id: f.id,
      userId: f.user_id,
      user_id: f.user_id,
      userEmail: f.user_email || 'guest@educationalportal.org',
      user_email: f.user_email || 'guest@educationalportal.org',
      userName: f.user_name || 'Guest Student',
      user_name: f.user_name || 'Guest Student',
      message: f.message || f.content || 'No feedback text provided',
      createdAt: f.created_at,
      created_at: f.created_at,
      status: f.status || 'unread',
      reply: f.reply || null,
      admin_reply: f.reply || null
    }));
    setAllFeedback(mappedFeedback);
  }, [qFeedbackData]);

  // 4. Resources Sync Effect
  useEffect(() => {
    if (qResourcesData) {
      setContents(qResourcesData as ContentItem[]);
      setAllContents(qResourcesData as ContentItem[]);
    }
  }, [qResourcesData]);

  // 5. Playlists Sync Effect
  useEffect(() => {
    if (qPlaylistsData) {
      const mappedPlaylists = qPlaylistsData.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        thumbnailUrl: item.thumbnail_url,
        thumbnail_url: item.thumbnail_url,
        type: item.type || 'custom',
        authorId: item.author_id,
        youtubePlaylistId: item.youtube_playlist_id,
        videoIds: item.video_ids,
        academicClass: item.academic_class,
        createdAt: item.created_at,
        isPremium: item.is_premium
      }));
      setPlaylists(mappedPlaylists as any as Playlist[]);
      setAllPlaylists(mappedPlaylists as any as Playlist[]);
    }
  }, [qPlaylistsData]);

  // 6. Exams Sync Effect
  useEffect(() => {
    if (qExamsData) {
      setAllExams(qExamsData as Exam[]);
    }
  }, [qExamsData]);

  // --- CENTRAL REALTIME SCHEMA-WIDE LISTENER ---
  useEffect(() => {
    console.log("[ReactQuery] Registering central realtime sub for all schema changes...");
    const centralChannel = supabase
      .channel('schema-changes-sync-all')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log("[ReactQuery] Schema change detected on table", payload.table, payload);
        const { table } = payload;
        
        // Match table to invalidate active React queries instantly
        if (table === 'profiles' || table === 'user_roles') {
          queryClient.invalidateQueries({ queryKey: ['profiles', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
          queryClient.invalidateQueries({ queryKey: ['premiumStudents'] });
        } else if (table === 'leaderboards' || table === 'user_stats') {
          queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
        } else if (table === 'feedback') {
          queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
        } else if (table === 'exam_attempts') {
          queryClient.invalidateQueries({ queryKey: ['exam_attempts', user?.id] });
          queryClient.invalidateQueries({ queryKey: ['leaderboards'] });
        } else if (table === 'performance_history') {
          queryClient.invalidateQueries({ queryKey: ['performance_history', user?.id] });
        } else if (['notes', 'books', 'video_classes', 'practice_sheets', 'external_links' ].includes(table)) {
          queryClient.invalidateQueries({ queryKey: ['resources'] });
        } else if (table === 'playlists') {
          queryClient.invalidateQueries({ queryKey: ['playlists'] });
        } else if (table === 'exams') {
          queryClient.invalidateQueries({ queryKey: ['exams'] });
        } else if (table === 'questions') {
          queryClient.invalidateQueries({ queryKey: ['questions'] });
        } else if (table === 'newsletter_subscribers') {
          queryClient.invalidateQueries({ queryKey: ['newsletter_subscribers'] });
          queryClient.invalidateQueries({ queryKey: ['public_subscriber_count'] });
        } else if (table === 'newsletter_email_logs') {
          queryClient.invalidateQueries({ queryKey: ['newsletter_email_logs'] });
        }
      })
      .subscribe();

    return () => {
      console.log("[ReactQuery] Cleaning up central realtime subscription.");
      supabase.removeChannel(centralChannel);
    };
  }, [user, queryClient]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Attempt to fetch resources and exams. Playlists/External resources might not exist yet.
        const resourcePromise = supabaseService.fetchResources().catch(e => {
          console.warn("Resources table might be missing or empty:", e);
          return [];
        });
        const examPromise = supabaseService.fetchExams(userRole === 'admin' || canUpload).catch(e => {
          console.warn("Exams table might be missing or empty:", e);
          return [];
        });
        const externalPromise = (async () => {
          try {
            return await supabase.from('external_links').select('*').order('created_at', { ascending: false });
          } catch (e) {
            console.warn("External links table might be missing or empty:", e);
            return { data: [], error: e };
          }
        })();

        const [dbResources, dbExams, dbExternals] = await Promise.all([
          resourcePromise,
          examPromise,
          externalPromise
        ]);

        if (dbResources) {
          setContents(dbResources as ContentItem[]);
          setAllContents(dbResources as ContentItem[]);
        }
        if (dbExternals && 'data' in dbExternals && dbExternals?.data) {
          const mapped = dbExternals.data.map((r: any) => ({
            ...r,
            createdAt: r.created_at
          }));
          setExternalResources(mapped as ExternalResource[]);
        }
        if (dbExams) setAllExams(dbExams as Exam[]);
        
        // Optional: Playlists if needed, but handled gracefully
        try {
          const { data: dbPlaylists } = await supabase.from('playlists').select('*').order('created_at', { ascending: false });
          if (dbPlaylists) {
            setPlaylists(dbPlaylists as Playlist[]);
            setAllPlaylists(dbPlaylists as Playlist[]);
          }
        } catch (e) {
          console.warn("Playlists table might be missing:", e);
        }

      } catch (err) {
        console.error("Error fetching initial data from Supabase:", err);
      }
    };

    fetchData();
  }, [user, userRole]);

  // Dynamic fetching of academic data
  const fetchClassesAndGroups = async () => {
    try {
      const { data: classData, error: classError } = await supabase
        .from('academic_classes')
        .select('*');
      
      if (classError) throw classError;

      // Filter out any inactive or older classes
      const activeDbClasses = (classData || []).filter((c: any) => {
        if (!c.active) return false;
        const n = (c.name || '').trim().toLowerCase();
        return !['class 9', 'class 10', 'class 11', 'class 12'].includes(n) &&
               !n.includes('class 9') &&
               !n.includes('class 10') &&
               !n.includes('class 11') &&
               !n.includes('class 12');
      });

      const finalClasses = activeDbClasses.map((c: any) => ({
        id: c.id?.toString() || c.name,
        name: c.name,
        has_groups: c.has_groups ?? false,
        active: c.active ?? true,
        order: c.order || 99,
        createdAt: c.created_at || new Date().toISOString(),
        updatedAt: c.updated_at || new Date().toISOString()
      }));

      finalClasses.sort((a, b) => a.order - b.order);
      setDynamicClasses(finalClasses);

      // Fetch Academic Groups
      const groupData = await supabaseService.fetchAcademicGroups();
      const activeDbGroups = (groupData || []).filter((g: any) => g.active);

      const finalGroups = activeDbGroups.map((g: any) => ({
        id: g.id?.toString() || g.name,
        name: g.name,
        active: g.active ?? true,
        order: g.order || 99,
        createdAt: g.created_at || new Date().toISOString(),
        updatedAt: g.updated_at || new Date().toISOString()
      }));

      finalGroups.sort((a, b) => a.order - b.order);
      setAcademicGroups(finalGroups);
    } catch (err) {
      console.error("Error fetching academic data:", err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('active', true)
        .order('order', { ascending: true });

      if (data) {
        const mapped = (data as any[]).map(s => ({
          ...s,
          classId: s.class_id,
          academicGroup: s.academic_group,
          createdAt: s.created_at,
          updatedAt: s.updated_at
        }));
        setDynamicSubjects(mapped as AcademicSubject[]);
      }
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  };

  const fetchChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('active', true)
        .order('order', { ascending: true });

      if (data) {
        const mapped = (data as any[]).map(ch => ({
          ...ch,
          subjectId: ch.subject_id,
          classId: ch.class_id,
          createdAt: ch.created_at,
          updatedAt: ch.updated_at
        }));
        setDynamicChapters(mapped as AcademicChapter[]);
      }
    } catch (err) {
      console.error("Error fetching chapters:", err);
    }
  };

  const fetchAllTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('active', true)
        .order('order', { ascending: true });
      if (data) {
        const mapped = (data as any[]).map(t => ({
          ...t,
          chapterId: t.chapter_id,
          subjectId: t.subject_id,
          classId: t.class_id
        }));
        setDynamicTopics(mapped as AcademicTopic[]);
      }
    } catch (err) {
      console.error("Error fetching all topics globally:", err);
    }
  };

  const refreshAcademicData = async () => {
    console.log("--- Refreshing Global Academic Data ---");
    await fetchClassesAndGroups();
    await fetchSubjects();
    await fetchChapters();
    await fetchAllTopics();
  };

  useEffect(() => {
    fetchClassesAndGroups();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchChapters();
  }, []);

  // Reset subject filter if it's no longer valid for the selected class
  useEffect(() => {
    if (classFilter !== 'All' && subjectFilter !== 'All' && currentSubjects.length > 0) {
      if (!currentSubjects.includes(subjectFilter)) {
        setSubjectFilter('All');
      }
    }
  }, [classFilter, currentSubjects, subjectFilter]);

  // Fetch All Active Topics globally to support filters, badges, and all exam/question/content builders
  useEffect(() => {
    fetchAllTopics();
  }, []);

  // Set default leaderboard filter when classes load
  useEffect(() => {
    if (dynamicClasses && dynamicClasses.length > 0 && !leaderboardClassFilter) {
      setLeaderboardClassFilter(dynamicClasses[0]?.name || 'SSC');
    }
  }, [dynamicClasses, leaderboardClassFilter]);

  const handleSeedDatabase = async () => {
    if (userRole !== 'admin' || isSeeding) return;
    setIsSeeding(true);
    setGlobalError(null);
    try {
      console.log("Seeding Supabase database...");
      for (const item of INITIAL_DATA) {
        await supabaseService.createContent(item);
      }
      for (const exam of MOCK_EXAMS) {
        const { id, questions, ...examData } = exam;
        const mappedExam = {
          ...examData,
          academic_class: (examData as any).class || (examData as any).academicClass,
          created_at: new Date().toISOString()
        };
        delete (mappedExam as any).class;
        delete (mappedExam as any).academicClass;
        
        await supabase.from('exams').insert([mappedExam]);
      }
      console.log("Seeding complete.");
    } catch (error: any) {
      setGlobalError("Seeding failed: " + error.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const [allContents, setAllContents] = useState<ContentItem[]>([]);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);

  const fetchPlaylists = useCallback(async () => {
    try {
      const data = await supabaseService.fetchPlaylists(false);
      if (data) setPlaylists(data as Playlist[]);
    } catch (err) {
      console.warn("Soft error in public playlists fetch:", err);
    }
  }, []);

  const fetchAllPlaylists = useCallback(async () => {
    try {
      const data = await supabaseService.fetchPlaylists(true);
      if (data) setAllPlaylists(data as Playlist[]);
    } catch (err) {
      console.warn("Soft error in admin playlists fetch:", err);
    }
  }, []);
  useEffect(() => {
    if (userRole !== 'admin') return;
    
    const fetchAllContents = async () => {
      try {
        const data = await supabaseService.fetchContents();
        if (data) setAllContents(data as ContentItem[]);
      } catch (err) {
        console.warn("Soft error in admin contents fetch:", err);
      }
    };

    fetchAllContents();
    
    // Subscribe to all relevant content tables
    const tableNames = ['notes', 'books', 'video_classes', 'practice_sheets', 'external_links'];
    const channels = tableNames.map(tableName => {
      return supabase
        .channel(`admin-all-${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => fetchAllContents())
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [userRole]);

  useEffect(() => {
    if (userRole !== 'admin') return;
    
    fetchAllPlaylists();
    const channel = supabase
      .channel('admin-all-playlists')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => fetchAllPlaylists())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, fetchAllPlaylists]);

  const fetchFeedback = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
  }, [queryClient]);

  useEffect(() => {
    if (userRole !== 'admin') return;
    
    fetchFeedback();
    
    const channel = supabase
      .channel('public:feedback')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, () => {
        fetchFeedback();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, fetchFeedback]);

  const [userContents, setUserContents] = useState<ContentItem[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  useEffect(() => {
    if (!user) return;
    
    const fetchUserContents = async () => {
      try {
        const tableNames = ['notes', 'books', 'video_classes', 'practice_sheets', 'external_links'];
        const results = await Promise.all(tableNames.map(async (table) => {
          const { data } = await supabase
            .from(table)
            .select('*')
            .eq('author_id', user.id)
            .order('created_at', { ascending: false });
          
          if (!data) return [];
          
          return data.map(item => ({
            ...item,
            category: Object.keys(TABLE_MAP).find(key => (TABLE_MAP as any)[key] === table) || 'Notes',
            academicClass: item.academic_class,
            authorId: item.author_id,
            authorName: item.author_name,
            channelName: item.channel_name,
            createdAt: item.created_at,
            isPremium: item.is_premium
          }));
        }));
        
        const allUserContents = results.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUserContents(allUserContents as ContentItem[]);
      } catch (err) {
        console.warn("Soft error in user contents fetch:", err);
      }
    };

    fetchUserContents();
    
    // Subscribe to all relevant content tables for this user
    const tableNames = ['notes', 'books', 'video_classes', 'practice_sheets', 'external_links'];
    const channels = tableNames.map(tableName => {
      return supabase
        .channel(`user-contents-${tableName}-${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: tableName,
          filter: `author_id=eq.${user.id}`
        }, () => fetchUserContents())
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const fetchUserPlaylists = async () => {
      try {
        const { data, error } = await supabase
          .from('playlists')
          .select('*')
          .eq('author_id', user.id)
          .order('created_at', { ascending: false });
        
        if (data) {
          const mappedData = data.map(item => ({
            ...item,
            authorId: item.author_id,
            youtubePlaylistId: item.youtube_playlist_id,
            videoIds: item.video_ids,
            academicClass: item.academic_class,
            createdAt: item.created_at,
            isPremium: item.is_premium
          }));
          setUserPlaylists(mappedData as Playlist[]);
        }
        if (error) console.warn("User fetchPlaylists error:", error);
      } catch (err) {
        console.warn("Soft error in user playlists fetch:", err);
      }
    };

    fetchUserPlaylists();
    
    const channel = supabase
      .channel(`user-playlists-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'playlists',
        filter: `author_id=eq.${user.id}`
      }, () => fetchUserPlaylists())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    fetchLeaderboards();
    
    const channel = supabase
      .channel('public:leaderboards-and-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboards' }, () => {
        console.log("Realtime DB update detected on leaderboards, reloading...");
        fetchLeaderboards();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_stats' }, () => {
        console.log("Realtime DB update detected on user_stats, reloading...");
        fetchLeaderboards();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchLeaderboards]);

  useEffect(() => {
    if (userRole !== 'admin') return;
    
    const fetchQuestions = async () => {
      try {
        let qs: Question[] = [];
        if (questionBankExamId !== 'global') {
          qs = await supabaseService.fetchQuestions(questionBankExamId);
        } else {
          const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false }).limit(200);
          if (error) throw error;
          
          const [{ data: dbClasses }, { data: dbSubjects }, { data: dbChapters }] = await Promise.all([
            supabase.from('academic_classes').select('id, name'),
            supabase.from('subjects').select('id, name'),
            supabase.from('chapters').select('id, name')
          ]);
          const classLookup = new Map((dbClasses || []).map(c => [c.id, c.name]));
          const subjectLookup = new Map((dbSubjects || []).map(s => [s.id, s.name]));
          const chapterLookup = new Map((dbChapters || []).map(ch => [ch.id, ch.name]));

          qs = (data || []).map(q => supabaseService.mapQuestionDBToFrontend(q, classLookup, subjectLookup, chapterLookup));
        }
        setAllQuestions(qs);
      } catch (error: any) {
        handleSupabaseError(error, OperationType.LIST, 'questions');
      }
    };

    fetchQuestions();
    
    const channel = supabase
      .channel('public:questions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => fetchQuestions())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, questionBankExamId]);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const exams = await supabaseService.fetchExams();
        setAllExams(exams);
      } catch (error: any) {
        handleSupabaseError(error, OperationType.LIST, 'exams', setGlobalError);
      }
    };

    fetchExams();
    const channel = supabase
      .channel('public:exams')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => fetchExams())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  useEffect(() => {
    if (!user) return;

    // Real-time subscription for attempts
    const attemptsChannel = supabase
      .channel('attempts-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'exam_attempts',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('Attempt change detected:', payload);
        // If an attempt is updated (e.g. by edge function), we might want to refresh current results if they match
        if (payload.new && (payload.new as any).id === currentAttemptId) {
          // This will be handled by the manual fetch in handleExamSubmit, 
          // but for general dashboard info, we could update a list here.
        }
      })
      .subscribe();

    // Real-time subscription for answers
    const answersChannel = supabase
      .channel('answers-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'exam_answers'
        // Filtering by attempt_id would be better if we had it in the filter string
      }, (payload) => {
        console.log('Answer change detected:', payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(attemptsChannel);
      supabase.removeChannel(answersChannel);
    };
  }, [user, currentAttemptId]);

  useEffect(() => {
    const fetchResourcesData = async () => {
      try {
        const data = await supabaseService.fetchResources();
        if (data) {
          setContents(data as ContentItem[]);
          setExternalResources(data.filter((r: any) => r.category === 'External Resources') as any as ExternalResource[]);
        }
      } catch (err) {
        console.warn("Soft error in resources real-time fetch:", err);
      }
    };

    fetchResourcesData();
    const tableNames = ['notes', 'books', 'video_classes', 'practice_sheets', 'external_links'];
    const channels = tableNames.map(tableName => {
      return supabase
        .channel(`public-${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => fetchResourcesData())
        .subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  useEffect(() => {
    fetchPlaylists();
    const channel = supabase
      .channel('public:playlists-approved')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => fetchPlaylists())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPlaylists]);

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      return;
    }
    
    const fetchBookmarks = async () => {
      try {
        const { data, error } = await supabase
          .from('bookmarks')
          .select('content_id')
          .eq('user_id', user.id);
        
        if (data) setBookmarks(data.map(b => b.content_id));
        if (error) {
          if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
            console.warn("Bookmarks table or content_id column missing:", error.message);
          } else {
            console.error("Bookmarks fetch error:", error);
          }
        }
      } catch (err) {
        console.warn("Soft error in bookmarks fetch:", err);
      }
    };

    fetchBookmarks();
    const channel = supabase
      .channel(`user-bookmarks-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookmarks',
        filter: `user_id=eq.${user.id}` 
      }, () => fetchBookmarks())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUsersInfo = useCallback(async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profiles) {
        let userRoles: any[] = [];
        try {
          const { data: rolesData } = await supabase.from('user_roles').select('*');
          if (rolesData) userRoles = rolesData;
        } catch (err) {
          console.warn("Could not fetch user_roles inside fetchUsersInfo:", err);
        }

        const merged = profiles.map(p => {
          const roleRec = userRoles.find(r => r.user_id === p.id || r.id === p.id);
          const isExpired = p.premium_expiry && new Date(p.premium_expiry).getTime() < Date.now();
          const basePremium = isExpired ? false : (roleRec ? (roleRec.is_premium ?? p.has_premium_access) : p.has_premium_access);
          
          // Silently trigger a Supabase DB cleanup if database says premium but user is expired
          if (isExpired && (p.has_premium_access || roleRec?.is_premium)) {
            (async () => {
              try {
                await supabase.from('profiles').update({ has_premium_access: false }).eq('id', p.id);
                if (roleRec) {
                  await supabase.from('user_roles').update({ is_premium: false }).eq('user_id', p.id);
                }
              } catch (cleanErr) {
                console.warn("Soft error: failed to clean expired subscription in DB for user:", p.id, cleanErr);
              }
            })();
          }

          return {
            ...p,
            name: p.full_name || p.display_name || 'Anonymous User',
            photoURL: p.avatar_url || p.photo_url || '',
            academicClass: p.academic_class,
            academicGroup: p.academic_group,
            canUpload: roleRec ? (roleRec.can_upload ?? p.can_upload) : p.can_upload,
            hasPremiumAccess: basePremium,
            role: roleRec ? (roleRec.role ?? p.role) : p.role,
            canManageExams: roleRec ? (roleRec.can_manage_exams ?? false) : false,
            canManageQuestions: roleRec ? (roleRec.can_manage_questions ?? false) : false,
            canManageResources: roleRec ? (roleRec.can_manage_resources ?? false) : false,
            isPremium: basePremium
          };
        });
        setAllUsers(merged);
      }
      if (error) handleSupabaseError(error, OperationType.LIST, 'profiles');
    } catch (err) {
      console.error("Error in fetchUsersInfo:", err);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchUsersInfo();
      const channel = supabase
        .channel('public:profiles-admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchUsersInfo())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => fetchUsersInfo())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userRole, fetchUsersInfo]);

  // Automatic background DB & State updates for Expired subscriptions (Admin-side & general check on tick state update)
  useEffect(() => {
    if (userRole !== 'admin' || !allUsers || allUsers.length === 0) return;

    const autoCleanExpired = async () => {
      let databaseUpdated = false;
      for (const u of allUsers) {
        const isExpired = u.premium_expiry && new Date(u.premium_expiry).getTime() < Date.now();
        const currentlyPremiumInDBRec = u.hasPremiumAccess || u.isPremium;
        if (isExpired && currentlyPremiumInDBRec) {
          try {
            console.log(`[Admin Auto-Expiry] Deactivating expired subscription for user ${u.name} (${u.id})`);
            await supabase.from('profiles').update({ has_premium_access: false }).eq('id', u.id);
            await supabase.from('user_roles').update({ is_premium: false }).eq('user_id', u.id);
            databaseUpdated = true;
          } catch (e) {
            console.warn("Soft error deactivating expired subscription in background:", e);
          }
        }
      }
      if (databaseUpdated) {
        fetchUsersInfo();
      }
    };
    autoCleanExpired();
  }, [userRole, allUsers, tick, fetchUsersInfo]);

  // Client-side real-time auto-deactivation of currently logged-in user's subscription
  useEffect(() => {
    if (!user || userRole === 'admin') return;

    const isExpired = firestoreUser?.premiumExpiry && new Date(firestoreUser.premiumExpiry).getTime() < Date.now();
    const currentlyActive = isPremium || firestoreUser?.hasPremiumAccess === true;

    if (isExpired && currentlyActive) {
      console.log("[Client Auto-Expiry] Current user subscription expired. Lock active.");
      setIsPremium(false);
      setFirestoreUser((prev: any) => prev ? { ...prev, hasPremiumAccess: false } : null);

      const deactivateInDB = async () => {
        try {
          await supabase.from('profiles').update({ has_premium_access: false }).eq('id', user.id);
          await supabase.from('user_roles').update({ is_premium: false }).eq('user_id', user.id);
        } catch (err) {
          console.warn("Client failed to update database with expired subscription:", err);
        }
      };
      deactivateInDB();
    }
  }, [user, userRole, firestoreUser?.premiumExpiry, isPremium, firestoreUser?.hasPremiumAccess, tick]);

  const handleLogin = async () => {
    if (isAuthLoading) return;
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailLogin = async (email: string, pass: string) => {
    setAuthError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError("Please enter your email.");
      return;
    }
    setIsAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: pass,
      });
      
      if (error) {
        setAuthError(error.message);
        return;
      }
      
      if (data.user) {
        // Redirection to home usually happens by state change
        // In this case, we might need to manually trigger a state sync or let a listener handle it
        // The user specifically asked to redirect to home "/"
        setView('home');
      }
    } catch (error: any) {
      setAuthError(error.message || "An unexpected error occurred during login.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (name: string, email: string, pass: string, academicClass: AcademicClass, academicGroup: string = 'All') => {
    setAuthError(null);
    const trimmedEmail = email.trim();
    if (!name || !trimmedEmail || !pass) {
      setAuthError("All fields are required.");
      return;
    }
    
    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    setIsAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: pass,
        options: {
          data: {
            full_name: name,
            academic_class: academicClass,
            academic_group: academicGroup
          }
        }
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data.user) {
        // Create initial profile record in profiles table
        await supabase.from('profiles').insert([{
          id: data.user.id,
          display_name: name,
          academic_class: academicClass,
          academic_group: academicGroup,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
        // Successful signup
        setView('home');
      }
    } catch (error: any) {
      setAuthError(error.message || "An unexpected error occurred during sign up.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setAuthError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError("Please enter your email address first.");
      throw new Error("Email required");
    }
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: "https://parodorshi.vercel.app/reset-password"
      });
      if (error) throw error;
    } catch (error: any) {
      setAuthError(error.message);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    console.error("Auth error:", error);
    let message = error.message || "An error occurred during authentication.";
    
    // Better Supabase error handling
    if (message.includes('Invalid login credentials')) {
      message = "Incorrect email or password. Please try again.";
    } else if (message.includes('Email not confirmed')) {
      message = "Please confirm your email address before logging in.";
    } else if (message.includes('User already registered')) {
      message = "This email is already registered. Try logging in instead.";
    } else if (message.includes('invalid_phone_number')) {
      message = "Invalid phone number format. Please include country code (e.g., +880...)";
    } else if (message.includes('invalid_confirmation_code')) {
      message = "Invalid verification code. Please check and try again.";
    }
    
    setAuthError(message);
  };

  useEffect(() => {
    // reCAPTCHA logic removed
    return () => {};
  }, []);

  const handlePhoneSignIn = async (phoneNumber: string) => {
    setAuthError(null);
    setIsAuthLoading(true);
    setPendingPhone(phoneNumber);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });
      if (error) throw error;
    } catch (error: any) {
      setAuthError(error.message);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: otp,
        type: 'sms'
      });
      if (error) throw error;
    } catch (error: any) {
      setAuthError(error.message);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      resetToHome();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const scrollContainer = (id: string, direction: 'left' | 'right') => {
    const container = document.getElementById(id);
    if (container) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const classes: (string | 'All')[] = useMemo(() => {
    return ['All', ...Array.from(new Set(dynamicClasses.map(c => c.name)))];
  }, [dynamicClasses]);
  
  const subjectIcons: Record<string, any> = {
    'Math': Calculator,
    'Physics': Atom,
    'Chemistry': FlaskConical,
    'Biology': Dna,
    'English': Languages,
    'ICT': Monitor,
    'General Knowledge': Globe,
    'General': GraduationCap
  };

  const subjectsFilterList = useMemo(() => ['All', ...currentSubjects], [currentSubjects]);
  const examSubjectsFilterList = useMemo(() => ['All', ...examSubjects], [examSubjects]);
  const questionSubjectsFilterList = useMemo(() => ['All', ...questionSubjects], [questionSubjects]);

  const years = ['All Years', '2024', '2023', '2022', '2021'];
  const [yearFilter, setYearFilter] = useState('All Years');
  const [chapterFilter, setChapterFilter] = useState<string>('All');
  const [topicFilter, setTopicFilter] = useState<string>('All');
  
  // Derive chapters from dynamicChapters based on subject and class
  const chapters = useMemo(() => {
    let list = dynamicChapters;
    
    if (examSubjectFilter !== 'All') {
      const matchedSubject = dynamicSubjects.find(s => s.name === examSubjectFilter);
      if (matchedSubject) {
        list = list.filter(ch => ch.subjectId === matchedSubject.id);
      }
    }
    
    if (examClassFilter !== 'All') {
      const matchedClass = dynamicClasses.find(c => c.name === examClassFilter);
      if (matchedClass) {
        list = list.filter(ch => ch.classId === matchedClass.id);
      }
    }
    
    return ['All', ...Array.from(new Set(list.map(ch => ch.name))).sort()];
  }, [dynamicChapters, examSubjectFilter, examClassFilter, dynamicClasses, dynamicSubjects]);

  const renderContentCard = (item: ContentItem) => {
    const isLocked = item.isPremium && !hasPremiumAccess;
    const hasEditPermission = canUpload || userRole === 'admin';
    
    return (
      <TiltContainer className="h-full">
        <motion.div
          key={item.id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="h-full relative overflow-visible"
        >
          {/* Main Card Content */}
          <Card className={`flex flex-col h-full group border-none bg-white dark:bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 ${isLocked ? 'filter grayscale-[0.2]' : ''}`}>
            <div className="aspect-[16/10] overflow-hidden relative bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {/* Fallback Icon */}
              <div className="text-zinc-300 dark:text-zinc-700">
                {item.category === 'YouTube Classes' ? <Youtube size={48} strokeWidth={1.5} /> : 
                 item.category === 'Books' ? <BookOpen size={48} strokeWidth={1.5} /> :
                 item.category === 'Question Papers' ? <History size={48} strokeWidth={1.5} /> :
                 <FileText size={48} strokeWidth={1.5} />}
              </div>

              {/* Actual Thumbnail or Auto-YouTube Thumbnail */}
              {(item.thumbnail || (item.category === 'YouTube Classes' && item.url)) && (
                <img 
                  src={item.thumbnail ? getDirectImageUrl(item.thumbnail) : (item.category === 'YouTube Classes' ? `https://img.youtube.com/vi/${getYouTubeId(item.url)}/mqdefault.jpg` : '')} 
                  alt={item.title} 
                  className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-10 ${isLocked ? 'blur-sm opacity-50' : ''}`} 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    console.warn(`[IMAGE] Failed to load thumbnail for: ${item.title}. URL: ${item.thumbnail}`);
                    if (e.currentTarget) {
                      e.currentTarget.style.opacity = '0.4';
                    }
                  }}
                />
              )}

              {/* Edit/Delete Overlay for authorized users */}
              {hasEditPermission && (
                <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm text-zinc-900 hover:bg-white shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditContent(item);
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 rounded-full bg-red-500/90 backdrop-blur-sm text-white hover:bg-red-600 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteContent(item.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}

              {/* Locked Overlay */}
              {isLocked && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-4 text-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-amber-500/30 mb-3"
                  >
                    <Lock size={20} fill="currentColor" />
                  </motion.div>
                  <p className="text-white text-[10px] font-black uppercase tracking-widest leading-tight">Premium Content</p>
                  <p className="text-zinc-200 text-[8px] font-bold mt-1">Upgrade to reach this resource</p>
                </div>
              )}

              {/* YouTube Play Button Overlay */}
              {item.category === 'YouTube Classes' && !isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors duration-300 z-20">
                  <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center text-white shadow-2xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                    <Youtube size={24} fill="currentColor" />
                  </div>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-[45]">
                <div className="flex gap-1.5">
                  <Badge className="bg-blue-600 text-white text-[9px] px-2 py-1 shadow-lg backdrop-blur-md border-none">
                    {item.category.toUpperCase()}
                  </Badge>
                  <Badge className="bg-zinc-900/80 text-white text-[9px] px-2 py-1 shadow-lg backdrop-blur-md border-none">
                    {item.academicClass}
                  </Badge>
                </div>
                {item.isPremium && (
                  <Badge className={`${isLocked ? 'bg-amber-600' : 'bg-amber-500'} text-white text-[9px] px-2 py-1 shadow-lg backdrop-blur-md border-none flex items-center gap-1 w-fit animate-pulse`}>
                    <Lock size={10} fill="currentColor" /> PREMIUM
                  </Badge>
                )}
              </div>
            </div>

            <div className={`p-4 flex-1 flex flex-col ${isLocked ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 text-[9px]">
                  {item.academicClass}
                </Badge>
                <Badge className="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20 text-[9px]">
                  {item.subject}
                </Badge>
                {item.chapter && (
                  <Badge className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 text-[9px] max-w-[120px] truncate">
                    {item.chapter}
                  </Badge>
                )}
                {(() => {
                  const tId = item.topicId || item.topic_id;
                  const matched = tId ? dynamicTopics.find(t => t.id === tId) : null;
                  if (!matched) return null;
                  return (
                    <Badge className="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 text-[9px] max-w-[124px] truncate">
                      {matched.name}
                    </Badge>
                  );
                })()}
              </div>
              <h4 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mb-2 line-clamp-1 leading-tight tracking-tight">{item.title}</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs mb-4 line-clamp-2 leading-relaxed font-bold italic">
                {item.description}
              </p>
              
              <div className="flex items-center gap-2 mt-auto relative z-50">
                <Button 
                  className={`flex-1 text-xs sm:text-sm py-2 sm:py-2.5 rounded-xl ${isLocked ? 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500' : ''}`} 
                  size="sm" 
                  icon={isLocked ? Lock : (item.category === 'YouTube Classes' ? Youtube : (item.category === 'Books' ? Download : (item.category === 'Practice Sheet' ? Eye : FileText)))} 
                  onMouseEnter={() => {
                    if (!isLocked && item.category !== 'YouTube Classes' && item.url) {
                      prefetchPdfUrl(ensureFullUrl(item.url));
                    }
                  }}
                  onClick={() => {
                    if (isLocked) {
                      setShowPremiumPromptModal(true);
                      return;
                    }
                    if (item.category === 'YouTube Classes') setActiveVideo(getYouTubeId(item.url));
                    else setActivePdf({ url: ensureFullUrl(item.url), isRestricted: item.category === 'Practice Sheet' });
                  }}
                >
                  {isLocked ? 'Unlock Now' : (item.category === 'YouTube Classes' ? 'Watch' : (item.category === 'Books' ? 'Download PDF' : (item.category === 'Practice Sheet' ? 'Read' : 'View')))}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => toggleBookmark(item.id)}
                  className={`rounded-xl h-10 w-10 ${bookmarks.includes(item.id) ? 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800' : 'text-zinc-400 border-zinc-200 dark:border-zinc-800'}`}
                >
                  <Bookmark size={16} fill={bookmarks.includes(item.id) ? 'currentColor' : 'none'} strokeWidth={2.5} />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </TiltContainer>
    );
  };

  const renderPlaylistCard = (playlist: Playlist) => {
    const isLocked = playlist.isPremium && !hasPremiumAccess;
    const hasEditPermission = canUpload || userRole === 'admin';
    
    return (
      <TiltContainer className="h-full">
        <motion.div
          key={playlist.id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="cursor-pointer relative overflow-visible h-full"
          onClick={() => {
            if (isLocked) {
              setShowPremiumPromptModal(true);
              return;
            }
            setActiveVideo(null);
            setActivePlaylist(playlist);
          }}
        >
          <Card className={`flex flex-col h-full group border-none bg-white dark:bg-zinc-900/40 backdrop-blur-md overflow-hidden relative ${isLocked ? 'filter grayscale-[0.2]' : ''}`}>
            <div className="aspect-[16/10] overflow-hidden relative bg-zinc-100 dark:bg-zinc-800">
              <img 
                src={playlist.thumbnail ? getDirectImageUrl(playlist.thumbnail) : `https://img.youtube.com/vi/playlist/mqdefault.jpg`} 
                alt={playlist.title} 
                className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out ${isLocked ? 'blur-sm opacity-50' : ''}`} 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.warn(`[IMAGE] Failed to load playlist thumbnail: ${playlist.title}. URL: ${playlist.thumbnail}`);
                  e.currentTarget.style.opacity = '0.4';
                }}
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />
              
              {/* Locked Overlay */}
              {isLocked && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-4 text-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-amber-500/30 mb-2"
                  >
                    <Lock size={18} fill="currentColor" />
                  </motion.div>
                  <p className="text-white text-[9px] font-black uppercase tracking-widest leading-tight">Premium Playlist</p>
                </div>
              )}
              
              {/* Playlist Stack Effect */}
              <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white z-20">
                <Youtube size={24} className="mb-1" />
                <span className="text-xs font-black">
                  {playlist.type === 'youtube' ? 'YT' : (playlist.videoIds?.length || 0)}
                </span>
                <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70">VIDEOS</span>
              </div>

              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(playlist.id);
                }}
                className={`absolute top-3 right-3 z-30 w-8 h-8 rounded-full flex items-center justify-center transition-all ${bookmarks.includes(playlist.id) ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-black/20 hover:bg-black/40 text-white backdrop-blur-md'}`}
              >
                <Bookmark size={14} fill={bookmarks.includes(playlist.id) ? 'currentColor' : 'none'} />
              </button>

              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-30">
                <Badge className="bg-red-600 text-white text-[9px] px-2 py-1 shadow-lg border-none w-fit uppercase font-black">
                  PLAYLIST
                </Badge>
                {playlist.isPremium && (
                  <Badge className="bg-amber-500 text-white text-[9px] px-2 py-1 shadow-lg backdrop-blur-md border-none flex items-center gap-1 w-fit animate-pulse">
                    <Lock size={10} fill="currentColor" /> PREMIUM
                  </Badge>
                )}
              </div>

              {hasEditPermission && (
                <div className="absolute bottom-3 left-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm text-zinc-900 hover:bg-white shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewPlaylist({
                        title: playlist.title,
                        description: playlist.description,
                        type: playlist.type,
                        youtubePlaylistId: playlist.youtubePlaylistId || '',
                        videoIds: playlist.videoIds || [],
                        academicClass: playlist.academicClass,
                        subject: playlist.subject,
                        thumbnail: playlist.thumbnail || ''
                      });
                      setEditingPlaylistId(playlist.id);
                      setIsAddingPlaylist(true);
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 rounded-full bg-red-500/90 backdrop-blur-sm text-white hover:bg-red-600 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(playlist.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              )}
            </div>

            <div className={`p-4 flex-1 flex flex-col ${isLocked ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
                  {playlist.academicClass}
                </Badge>
                <Badge className="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20">
                  {playlist.subject}
                </Badge>
              </div>
              <h4 className="text-lg font-black text-zinc-900 dark:text-white mb-2 line-clamp-2 leading-tight tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {playlist.title}
              </h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs line-clamp-2 leading-relaxed font-medium mb-4">
                {playlist.description}
              </p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                    {playlist.type === 'youtube' ? 'YouTube Playlist' : 'Custom Playlist'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-blue-600 font-black text-[10px] uppercase tracking-widest">
                  Play Now <ChevronRight size={12} />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </TiltContainer>
    );
  };

  const triggerHighlight = (id: string) => {
    setHighlightedSection(id);
    setTimeout(() => setHighlightedSection(null), 2000);
  };

  const renderSection = (title: string, category: Category, icon: any, addLabel: string, id: string) => {
    const sectionContents = filteredContents.filter(c => c.category === category).slice(0, 12);
    const containerId = `scroll-${id}`;

    return (
      <ScrollSection 
        id={id} 
        key={id}
        className={`space-y-4 sm:space-y-8 p-3 sm:p-10 rounded-2xl sm:rounded-[48px] transition-all duration-700 relative group/section w-full max-w-full ${highlightedSection === id ? 'animate-section-flash ring-2 ring-blue-500/40 bg-blue-50/5' : ''}`}
      >
      <div className="absolute top-4 right-20 sm:top-16 sm:right-12 pointer-events-none scale-100 origin-top-right z-30 opacity-100">
        <div className="pointer-events-auto">
          <MiniRobot />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 max-w-full overflow-hidden relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
            {icon}
          </div>
          <h3 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white truncate min-w-0">{title}</h3>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {sectionContents.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 mr-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                onClick={() => scrollContainer(containerId, 'left')}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                onClick={() => scrollContainer(containerId, 'right')}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          )}
          {canUpload && (
            <Button variant="outline" size="sm" icon={Plus} className="inline-flex" onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              setNewItem({ ...newItem, category, title: '', description: '', url: '', thumbnail: '' });
              setIsAdding(true);
            }}>{addLabel}</Button>
          )}
          <button 
            onClick={() => { setSelectedCategory(category); setView('category'); }}
            className="text-blue-600 font-bold text-xs sm:text-sm hover:underline flex items-center gap-1"
          >
            See all <ChevronRight size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

        <div 
          id={containerId}
          className="flex overflow-x-auto pb-6 sm:pb-2 gap-4 sm:gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth min-w-full"
        >
          {sectionContents.length > 0 ? (
            sectionContents.map((item, sIdx) => (
              <div key={item.id || `content-${sIdx}`} className="min-w-[200px] sm:min-w-[320px] w-[200px] sm:w-[320px] snap-start">
                {renderContentCard(item)}
              </div>
            ))
          ) : (
            <div className="w-full flex items-center justify-center py-6">
              <div className="bg-zinc-100/40 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-3 w-full max-w-md shadow-sm">
                <div className="p-3 bg-zinc-200/40 dark:bg-zinc-800/40 rounded-full text-zinc-500 shrink-0">
                  {React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
                </div>
                <div>
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">No {title} available yet</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">Our content team is currently preparing study materials for this subject. New items will appear here soon.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollSection>
    );
  };

  const renderPlaylistsSection = () => {
    const filteredPlaylists = playlists.filter(p => {
      const matchesClass = classFilter === 'All' || p.academicClass === classFilter;
      const matchesGroup = !isGroupNeeded(p.academicClass as string) || 
                          groupFilter === 'All' || 
                          p.academicGroup === groupFilter || 
                          (p as any).academic_group === groupFilter ||
                          p.academicGroup === 'All' ||
                          (p as any).academic_group === 'All';
      const matchesSubject = subjectFilter === 'All' || p.subject === subjectFilter;
      const matchesChapter = chapterFilter === 'All' || p.chapter === chapterFilter;
      const matchesTopic = topicFilter === 'All' || p.topicId === topicFilter || (p as any).topic_id === topicFilter;
      const matchesType = contentTypeFilter === 'free' ? !p.isPremium : p.isPremium;
      return matchesClass && matchesGroup && matchesSubject && matchesChapter && matchesTopic && matchesType;
    });

    const displayPlaylists = filteredPlaylists.slice(0, 12);
    const containerId = "scroll-playlists";

    return (
      <ScrollSection key="featured-playlists" className="space-y-8 p-4 sm:p-10 rounded-2xl sm:rounded-[48px] transition-all duration-700 relative group/section w-full max-w-full">
        <div className="absolute top-4 right-20 sm:top-16 sm:right-12 pointer-events-none scale-100 origin-top-right z-30 opacity-100">
          <div className="pointer-events-auto">
            <MiniRobot />
          </div>
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-600">
              <Youtube size={24} />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Featured Playlists</h3>
          </div>
          <div className="flex items-center gap-4">
            {displayPlaylists.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 mr-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                  onClick={() => scrollContainer(containerId, 'left')}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                  onClick={() => scrollContainer(containerId, 'right')}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
            {canUpload && (
              <Button variant="outline" size="sm" icon={Plus} onClick={() => {
                setNewPlaylist({
                  title: '',
                  description: '',
                  type: 'youtube',
                  youtubePlaylistId: '',
                  videoIds: [],
                  academicClass: classFilter === 'All' ? (dynamicClasses?.[0]?.name || 'SSC') : classFilter as AcademicClass,
                  subject: subjectFilter === 'All' ? '' : subjectFilter,
                  thumbnail: ''
                });
                setIsAddingPlaylist(true);
              }}>Add Playlist</Button>
            )}
          </div>
        </div>

        <div id={containerId} className="flex overflow-x-auto pb-6 sm:pb-2 gap-4 sm:gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth min-w-full">
          {displayPlaylists.length > 0 ? (
            displayPlaylists.map((playlist, pIdx) => (
              <div key={playlist.id || `playlist-${pIdx}`} className="min-w-[200px] sm:min-w-[320px] w-[200px] sm:w-[320px] snap-start">
                {renderPlaylistCard(playlist)}
              </div>
            ))
          ) : (
            <div className="w-full flex items-center justify-center py-6">
              <div className="bg-zinc-100/40 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-3 w-full max-w-md shadow-sm">
                <div className="p-3 bg-zinc-200/40 dark:bg-zinc-800/40 rounded-full text-red-500 shrink-0">
                  <Youtube size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">No Playlists available yet</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">Our content team is curating high-quality YouTube lectures. Curated playlists will appear here very soon.</p>
                </div>
                {canUpload && (
                  <Button variant="outline" size="sm" icon={Plus} className="mt-2" onClick={() => {
                    setNewPlaylist({
                      title: '',
                      description: '',
                      type: 'youtube',
                      youtubePlaylistId: '',
                      videoIds: [],
                      academicClass: classFilter === 'All' ? (dynamicClasses?.[0]?.name || 'SSC') : classFilter as AcademicClass,
                      subject: subjectFilter === 'All' ? '' : subjectFilter,
                      thumbnail: ''
                    });
                    setIsAddingPlaylist(true);
                  }}>
                    Create First Playlist
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollSection>
    );
  };

  const renderExternalResources = () => {
    const filteredExternal = externalResources.filter(r => {
      const matchesClass = classFilter === 'All' || r.academicClass === classFilter;
      const matchesSubject = subjectFilter === 'All' || r.subject === subjectFilter;
      const matchesChapter = chapterFilter === 'All' || r.chapter === chapterFilter;
      const matchesTopic = topicFilter === 'All' || r.topicId === topicFilter || (r as any).topic_id === topicFilter;
      const matchesType = contentTypeFilter === 'free' ? !r.isPremium : r.isPremium;
      return matchesClass && matchesSubject && matchesChapter && matchesTopic && matchesType;
    });

    const containerId = "scroll-external";

    return (
      <section key="external-resources" className="space-y-6 relative group/section overflow-visible w-full max-w-full">
        <div className="absolute top-4 right-20 sm:top-16 sm:right-12 pointer-events-none scale-100 origin-top-right z-30 opacity-100">
          <div className="pointer-events-auto">
            <MiniRobot />
          </div>
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600">
              <Globe size={24} />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">External Resources</h3>
          </div>
          <div className="flex items-center gap-4">
            {filteredExternal.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 mr-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                  onClick={() => scrollContainer(containerId, 'left')}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                  onClick={() => scrollContainer(containerId, 'right')}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
            {userRole === 'admin' && (
              <Button variant="outline" size="sm" icon={Plus} onClick={() => setIsAddingExternal(true)}>Add Link</Button>
            )}
          </div>
        </div>

        <div id={containerId} className="flex overflow-x-auto pb-6 sm:pb-2 gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth min-w-full">
          {filteredExternal.length > 0 ? (
            filteredExternal.map((resource, erIdx) => (
              <div key={resource.id || `ext-${erIdx}`} className="min-w-[180px] w-[180px] snap-start border border-transparent">
                <Card className="p-4 flex flex-col h-full items-center text-center group relative border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all duration-300">
                  <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 overflow-hidden shrink-0 relative">
                    {resource.thumbnail && (
                      <img 
                        src={getDirectImageUrl(resource.thumbnail)} 
                        alt={resource.title} 
                        title={resource.title}
                        className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          console.warn(`[IMAGE] Failed to load external resource thumbnail: ${resource.title}. URL: ${resource.thumbnail}`);
                          if (e.currentTarget) {
                            e.currentTarget.style.opacity = '0';
                          }
                        }}
                      />
                    )}
                    <span className="text-2xl z-0">{resource.icon}</span>
                  </div>
                  <h3 className="font-bold text-zinc-900 dark:text-white mb-2 line-clamp-1">{resource.title}</h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-6 line-clamp-2 leading-relaxed font-medium">{resource.description}</p>
                   <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-auto rounded-xl group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300"
                    onMouseEnter={() => {
                      if (resource.url && (resource.url.toLowerCase().endsWith('.pdf') || resource.url.includes('/storage/v1/object/public/') || resource.url.includes('drive.google.com'))) {
                        prefetchPdfUrl(resource.url);
                      }
                    }}
                    onClick={() => {
                      if (resource.url.toLowerCase().endsWith('.pdf') || resource.url.includes('/storage/v1/object/public/')) {
                        setActivePdf({ url: resource.url, isRestricted: false });
                      } else {
                        window.open(resource.url, '_blank');
                      }
                    }}
                  >
                    Visit →
                  </Button>
                  {userRole === 'admin' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExternal(resource.id);
                      }}
                      className="absolute top-3 right-3 p-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </Card>
              </div>
            ))
          ) : (
            <div className="w-full flex items-center justify-center py-6">
              <div className="bg-zinc-100/40 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-3 w-full max-w-md shadow-sm">
                <div className="p-3 bg-zinc-200/40 dark:bg-zinc-800/40 rounded-full text-blue-500 shrink-0">
                  <Globe size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">No External Resources available yet</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">Interactive simulation tools, external references, and websites will appear here shortly.</p>
                </div>
                {userRole === 'admin' && (
                  <Button variant="outline" size="sm" icon={Plus} className="mt-2" onClick={() => setIsAddingExternal(true)}>Add Link</Button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderFilters = () => (
    <div className="py-6 sm:py-8 flex flex-col items-center w-full relative">
      {/* Ambient background for filter section */}
      <div className="absolute inset-0 bg-blue-50/20 dark:bg-zinc-900/10 blur-3xl -z-10 rounded-full scale-90" />
      
      <div className="space-y-4 w-full max-w-6xl px-4">
        <div className="flex flex-col items-center justify-center gap-1.5 w-full">
          <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-bold">
            Academic Level
          </Badge>
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 justify-center items-center w-full max-w-4xl mx-auto px-1 sm:px-4">
            {classes.map(c => (
              <motion.button 
                key={c}
                whileHover={{ scale: 1.02, y: -0.5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setClassFilter(c as any)}
                className={`w-full sm:w-auto sm:min-w-[90px] flex items-center justify-center text-center py-1.5 sm:py-2 px-1 text-[9px] xs:text-[10px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-all duration-300 shadow-sm border ${
                  classFilter === c 
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-md shadow-zinc-900/10 dark:shadow-white/10' 
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md'
                }`}
              >
                <span className="leading-tight truncate max-w-full">{c}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {isGroupNeeded(classFilter) && (
          <div className="flex flex-col items-center justify-center gap-1.5 w-full animate-in fade-in slide-in-from-top-2">
            <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-bold">
              Academic Group / Stream
            </Badge>
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 justify-center items-center w-full max-w-4xl mx-auto px-1 sm:px-4">
              {['All', ...Array.from(new Set(academicGroups.map(g => g.name)))].map(g => (
                <motion.button 
                  key={g}
                  whileHover={{ scale: 1.02, y: -0.5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setGroupFilter(g);
                    setSubjectFilter('All');
                    setChapterFilter('All');
                  }}
                  className={`w-full sm:w-auto sm:min-w-[90px] flex items-center justify-center text-center py-1.5 sm:py-2 px-1 text-[9px] xs:text-[10px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition-all duration-300 shadow-sm border ${
                    groupFilter === g 
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-md shadow-zinc-900/10 dark:shadow-white/10' 
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md'
                  }`}
                >
                  <span className="leading-tight truncate max-w-full">{g}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-1 w-full">
          <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-2 py-0.5 text-[9px] uppercase tracking-[0.25em] font-bold">
            Subject Focus
          </Badge>
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 justify-center items-center w-full max-w-4xl mx-auto px-1 sm:px-4">
            {subjectsFilterList.map(s => {
              const Icon = subjectIcons[s];
              return (
                <motion.button 
                  key={s}
                  whileHover={{ scale: 1.02, y: -0.5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSubjectFilter(s);
                    setChapterFilter('All');
                  }}
                  className={`w-full sm:w-auto sm:min-w-[90px] flex items-center justify-center gap-0.5 sm:gap-1 px-1 py-1.5 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl text-[9px] xs:text-[10px] sm:text-xs font-semibold transition-all duration-300 shadow-sm border ${
                    subjectFilter === s 
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-md shadow-zinc-900/10 dark:shadow-white/10' 
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md'
                  }`}
                >
                  {Icon && <Icon size={11} className={subjectFilter === s ? 'text-blue-400 shrink-0' : 'text-zinc-400 shrink-0'} strokeWidth={2.5} />}
                  <span className="leading-tight truncate max-w-full">{s}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {subjectFilter !== 'All' && (
          <div className="flex flex-col items-center justify-center gap-1.5 w-full animate-in fade-in slide-in-from-top-2">
            <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-bold">
              Chapter selection
            </Badge>
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 justify-center items-center w-full max-w-4xl mx-auto px-1 sm:px-4">
               {['All', ...Array.from(new Set(dynamicChapters.filter(ch => {
                 const matchedSubject = dynamicSubjects.find(s => s.name === subjectFilter);
                 const matchedClass = dynamicClasses.find(c => c.name === classFilter);
                 let matches = true;
                 if (matchedSubject) matches = matches && ch.subjectId === matchedSubject.id;
                 if (matchedClass) matches = matches && ch.classId === matchedClass.id;
                 return matches;
               }).map(ch => ch.name)))].map(ch => (
                <motion.button 
                  key={ch}
                  whileHover={{ scale: 1.02, y: -0.5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setChapterFilter(ch);
                    setTopicFilter('All');
                  }}
                  className={`w-full sm:w-auto sm:min-w-[90px] flex items-center justify-center text-center px-1 py-1.5 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl text-[9px] xs:text-[10px] sm:text-xs font-semibold transition-all duration-300 shadow-sm border ${
                    chapterFilter === ch 
                    ? 'bg-blue-600 text-white border-transparent shadow-md shadow-blue-500/20' 
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md'
                  }`}
                >
                  <span className="line-clamp-1 leading-tight max-w-full">{ch}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {chapterFilter !== 'All' && (
          <div className="flex flex-col items-center justify-center gap-1.5 w-full animate-in fade-in slide-in-from-top-2">
            <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-bold">
              Topic selection
            </Badge>
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 justify-center items-center w-full max-w-4xl mx-auto px-1 sm:px-4">
               {['All', ...dynamicTopics.filter(t => {
                 const matchedChapter = dynamicChapters.find(ch => ch.name === chapterFilter);
                 return matchedChapter && t.chapterId === matchedChapter.id;
               }).map(t => ({ id: t.id, name: t.name }))].map(t => (
                <motion.button 
                  key={typeof t === 'string' ? t : t.id}
                  whileHover={{ scale: 1.02, y: -0.5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTopicFilter(typeof t === 'string' ? t : t.id)}
                  className={`w-full sm:w-auto sm:min-w-[90px] flex items-center justify-center text-center px-1 py-1.5 sm:py-2 sm:px-4 rounded-lg sm:rounded-xl text-[9px] xs:text-[10px] sm:text-xs font-semibold transition-all duration-300 shadow-sm border ${
                    (topicFilter === (typeof t === 'string' ? t : t.id)) 
                    ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-500/20' 
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md'
                  }`}
                >
                  <span className="line-clamp-1 leading-tight max-w-full">{typeof t === 'string' ? t : t.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {user && (
          <div className="flex flex-col items-center justify-center gap-6 w-full pt-4">
            <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-black">
              Content Access
            </Badge>
            
            <div className="relative flex p-1 bg-zinc-200/50 dark:bg-zinc-800/50 backdrop-blur-xl rounded-2xl w-full max-w-[280px] border border-zinc-200 dark:border-zinc-700 shadow-inner group/toggle">
              {/* Animated Slider */}
              <motion.div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl shadow-lg z-0 ${
                  contentTypeFilter === 'free' 
                  ? 'bg-blue-600 left-1' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 right-1'
                }`}
                layoutId="accessToggle"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              
              <button 
                onClick={() => setContentTypeFilter('free')}
                className={`relative z-10 flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-colors duration-300 cursor-pointer ${
                  contentTypeFilter === 'free' ? 'text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Free
              </button>
              <button 
                onClick={() => {
                  if (!hasPremiumAccess) {
                    setShowPremiumPromptModal(true);
                  } else {
                    setContentTypeFilter('premium');
                  }
                }}
                className={`relative z-10 flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-colors duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  contentTypeFilter === 'premium' ? 'text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {contentTypeFilter !== 'premium' && <Lock size={12} className="opacity-50" />}
                Premium
                {contentTypeFilter === 'premium' && (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="bg-white/20 px-1.5 py-0.5 rounded-md text-[8px]"
                  >
                    PRO
                  </motion.span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanupLegacyData = async () => {
    if (userRole !== 'admin') return;
    if (!window.confirm("ARE YOU SURE? This will permanently delete ALL exams and questions records to clean legacy data.")) return;

    setIsCleaning(true);
    try {
      // 1. Delete all questions first (foreign key constraints)
      const { error: qErr } = await supabase.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (qErr) console.warn("Delete questions error:", qErr);

      // 2. Delete all exams
      const { error: eErr } = await supabase.from('exams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (eErr) console.warn("Delete exams error:", eErr);

      // 3. Delete all attempts
      const { error: aErr } = await supabase.from('exam_attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (aErr) console.warn("Delete attempts error:", aErr);

      alert("Cleanup complete! Legacy exams and questions have been removed.");
      window.location.reload();
    } catch (error: any) {
      alert("Cleanup failed: " + error.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!window.confirm(`Are you absolutely sure you want to remove ${email} from the subscriber library?`)) return;
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['newsletter_subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['public_subscriber_count'] });
    } catch (e: any) {
      alert("Failed deleting subscriber: " + e.message);
    }
  };

  const handleDispatchCampaign = async () => {
    if (!newsletterSubject.trim() || !newsletterMsg.trim()) {
      alert("Please provide both a subject and a message body before delivering.");
      return;
    }

    if (!window.confirm(`CONFIRM DISPATCH: You are about to deliver this communication to all enrolled subscribers. Proceed?`)) {
      return;
    }

    setIsSendingLogs(true);
    setSendingStats(null);
    setSendingStatusText('Acquiring active session signature...');

    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        throw new Error("No active credentials found. Please re-login.");
      }

      setSendingStatusText('Delivering communication packets inside secure container thread...');
      
      const response = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject: newsletterSubject.trim(),
          message: newsletterMsg.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server returned error status ${response.status}`);
      }

      const results = await response.json();
      if (results.success) {
        setSendingStats(results.stats);
        setNewsletterSubject('');
        setNewsletterMsg('');
        queryClient.invalidateQueries({ queryKey: ['newsletter_email_logs'] });
        setSendingStatusText('Dispatch Campaign Complete!');
      } else {
        throw new Error(results.error || "Execution terminated unexpectedly.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Campaign terminal error: " + err.message);
    } finally {
      setIsSendingLogs(false);
    }
  };

  const renderNewsletterAdminTab = () => {
    const subscribers = qNewsletterSubscribers || [];
    const logs = qNewsletterEmailLogs || [];
    
    const filteredSubscribers = subscribers.filter((sub: any) => 
      sub.email?.toLowerCase().includes((newsletterSearchFilter || '').toLowerCase())
    );

    const filteredLogs = logs.filter((log: any) => 
      log.subscriber_email?.toLowerCase().includes((newsletterSearchFilter || '').toLowerCase()) ||
      log.subject?.toLowerCase().includes((newsletterSearchFilter || '').toLowerCase())
    );

    const totalSubscribers = subscribers.length;
    const totalDelivered = logs.filter((l: any) => l.status === 'sent' || l.status === 'success').length;
    const totalFailed = logs.filter((l: any) => l.status === 'failed' || l.status === 'error').length;
    const totalAttempts = logs.length;
    const healthRate = totalAttempts > 0 ? Math.round((totalDelivered / totalAttempts) * 100) : 100;

    return (
      <div className="space-y-8 animate-fade-in text-zinc-900 dark:text-zinc-100">
        {/* Analytics Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-blue-500 rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Registered Enrollees</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white font-mono">{totalSubscribers}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/10 text-green-500 rounded-2xl animate-pulse">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Dispatched Emails</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white font-mono">{totalDelivered}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-950/10 text-purple-500 rounded-2xl">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Delivery Success Rate</p>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white font-mono">{healthRate}%</h3>
            </div>
          </div>
        </div>

        {/* Creator Cockpit & Live Preview Box */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dispatch Panel */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <Send size={18} className="text-blue-500" /> Deliver Newsletter Campaign
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Draft your educational updates. All enrollees will receive responsive HTML templates instantly.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block font-sans">Email Subject line</label>
                <input 
                  type="text" 
                  disabled={isSendingLogs}
                  placeholder="e.g., Weekly Educational Highlights & New Mock Exams!" 
                  value={newsletterSubject}
                  onChange={(e) => setNewsletterSubject(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-white shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block font-sans">Message body content</label>
                <textarea 
                  rows={8}
                  disabled={isSendingLogs}
                  placeholder="Draft your mail. Spacing creates clean paragraphs automatically..." 
                  value={newsletterMsg}
                  onChange={(e) => setNewsletterMsg(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-white font-mono resize-y shadow-inner"
                />
              </div>

              {/* Status and Analytics recap */}
              {isSendingLogs && (
                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 space-y-2 animate-pulse font-sans">
                  <p className="font-bold flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin" /> {sendingStatusText}
                  </p>
                  <p className="text-[10px] text-zinc-500">Executing delivery loop... Bulk sending is safeguarded via anti-speed controls to completely safeguard your Resend score.</p>
                </div>
              )}

              {sendingStats && (
                <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs space-y-3 font-sans">
                  <h4 className="font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Last Campaign Dispatch Analytics</h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-zinc-100 dark:bg-zinc-900 p-2 rounded-xl">
                      <p className="text-[10px] text-zinc-500">Audience</p>
                      <p className="text-sm font-black font-mono text-zinc-700 dark:text-zinc-300">{sendingStats.total}</p>
                    </div>
                    <div className="bg-green-100 dark:bg-green-950/40 p-2 rounded-xl">
                      <p className="text-[10px] text-green-500">Delivered</p>
                      <p className="text-sm font-black font-mono text-green-600">{sendingStats.sent}</p>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-950/40 p-2 rounded-xl">
                      <p className="text-[10px] text-yellow-600">Duplicates</p>
                      <p className="text-sm font-black font-mono text-yellow-600">{sendingStats.duplicates}</p>
                    </div>
                    <div className="bg-red-100 dark:bg-red-950/40 p-2 rounded-xl">
                      <p className="text-[10px] text-red-500">Errors</p>
                      <p className="text-sm font-black font-mono text-red-600">{sendingStats.failed}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSendingStats(null)}
                    className="text-[10px] text-blue-500 font-bold hover:underline"
                  >
                    Clear stats
                  </button>
                </div>
              )}

              <Button 
                onClick={handleDispatchCampaign}
                disabled={isSendingLogs || !newsletterSubject.trim() || !newsletterMsg.trim()}
                className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 disabled:opacity-50 border-none hover:scale-[1.01] transition-transform"
              >
                {isSendingLogs ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                {isSendingLogs ? 'Delivering Packets...' : 'Launch Newsletter Campaign'}
              </Button>
            </div>
          </div>

          {/* Device Mockup Preview */}
          <div className="border border-zinc-200 dark:border-zinc-800 bg-zinc-100/40 dark:bg-zinc-950/40 rounded-[32px] p-6 shadow-sm flex flex-col h-full min-h-[450px]">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                <span className="w-3 h-3 rounded-full bg-green-400"></span>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Responsive Email Preview</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] p-4 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl mt-4 space-y-4">
              <div className="bg-[#0f172a] p-4 rounded-xl text-center">
                <h1 className="text-white text-lg font-black tracking-wide uppercase m-0 leading-none font-sans">Parodorshhi</h1>
                <p className="text-zinc-400 text-[9px] uppercase font-bold tracking-widest mt-1.5 font-sans">Educational Portal</p>
              </div>

              <div className="space-y-3 font-sans">
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2 leading-snug">
                  {newsletterSubject || 'Demo Subject Title Goes Here...'}
                </h2>
                <div className="text-zinc-650 dark:text-zinc-300 text-xs leading-relaxed space-y-2 whitespace-pre-wrap font-sans">
                  {newsletterMsg || 'Start drafting your newsletter campaign contents. The mockup preview will draw your communication beautifully and allow you to inspect the desktop layout instantly.'}
                </div>
                <div className="pt-4 text-center">
                  <span className="bg-blue-600 text-white text-[11px] font-bold px-4 py-2 rounded-lg inline-block shadow-sm">
                    Go to Dashboard
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center text-[10px] text-zinc-400 leading-normal font-sans">
                <p>You are receiving this update because you subscribed to our newsletter on the Parodorshhi Educational Portal.</p>
                <p className="mt-2 font-bold uppercase tracking-wider">© 2026 Parodorshhi. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Database records Lists / Archive logger */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-fit border border-zinc-200/30 dark:border-zinc-800/30">
              <button 
                onClick={() => setNewsletterSubTab('subscribers')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${newsletterSubTab === 'subscribers' ? 'bg-white dark:bg-zinc-800 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Subscriber Registry ({filteredSubscribers.length})
              </button>
              <button 
                onClick={() => setNewsletterSubTab('logs')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${newsletterSubTab === 'logs' ? 'bg-white dark:bg-zinc-800 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Delivery Archives ({filteredLogs.length})
              </button>
            </div>

            {/* Search filter */}
            <input 
              type="text" 
              placeholder={`Search ${newsletterSubTab}...`}
              value={newsletterSearchFilter || ''}
              onChange={(e) => setNewsletterSearchFilter(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500 max-w-xs text-zinc-900 dark:text-white"
            />
          </div>

          <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950">
            {newsletterSubTab === 'subscribers' ? (
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 text-[10px] text-zinc-400 uppercase font-black tracking-widest border-b border-zinc-100 dark:border-zinc-800">
                    <th className="py-3 px-4">E-mail Address</th>
                    <th className="py-3 px-4">Enrolled Timestamp</th>
                    <th className="py-3 px-4 text-right">Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 text-xs text-zinc-600 dark:text-zinc-300">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-zinc-400 font-medium">No subscribers matched your search filter.</td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((sub: any, index: number) => (
                      <tr key={sub.id || index} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                        <td className="py-3 px-4 font-bold font-mono text-zinc-800 dark:text-zinc-100">{sub.email}</td>
                        <td className="py-3 px-4 text-zinc-400 font-mono">{new Date(sub.created_at).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <button 
                            onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                            className="bg-red-500/10 text-red-500 font-bold px-3 py-1.5 rounded-lg text-[10px] hover:bg-red-500/20 uppercase tracking-wider"
                          >
                            Unsubscribe
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900 text-[10px] text-zinc-400 uppercase font-black tracking-widest border-b border-zinc-100 dark:border-zinc-800">
                    <th className="py-3 px-4">Subscriber E-mail</th>
                    <th className="py-3 px-4">Bulletin Subject</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4">Dispatched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850 text-xs text-zinc-600 dark:text-zinc-300">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-400 font-medium font-sans">No campaign dispatch logs matched your search filter.</td>
                    </tr>
                  ) : (
                    filteredLogs.map((log: any, index: number) => (
                      <tr key={log.id || index} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-800 dark:text-zinc-100">{log.subscriber_email}</td>
                        <td className="py-3 px-4 max-w-[200px] truncate">{log.subject}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest font-sans ${
                            log.status === 'sent' || log.status === 'success' 
                              ? 'bg-green-500/10 text-green-600' 
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {log.status === 'sent' ? 'delivered' : log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 font-mono">{new Date(log.sent_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAdminPortal = () => {
    if (!hasAdminAccess) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] shadow-sm max-w-xl mx-auto my-12">
          <div className="bg-red-500/10 p-4 rounded-full text-red-500 mb-4">
            <Lock size={40} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Access Restricted</h2>
          <p className="text-zinc-500 mt-2 text-sm sm:text-base">You do not have administrative or editor permissions to access this dashboard. Please log in with an authorized account or contact support.</p>
          <Button onClick={() => setView('home')} className="mt-6 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-none px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl hover:opacity-90">Go back home</Button>
        </div>
      );
    }

    return (
      <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-zinc-950 p-2 rounded-xl border border-white/10 shadow-lg">
            <Logo className="h-10 w-auto" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Admin Portal</h2>
            <p className="text-sm sm:text-base text-zinc-500 font-medium">Manage all resources and user permissions.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            onClick={handleCleanupLegacyData}
            disabled={isCleaning}
            className="group relative overflow-hidden bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-none px-6 py-2.5 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 shadow-xl hover:shadow-red-500/20 transition-all duration-500 active:scale-95"
          >
            <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors">
              {isCleaning ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />}
              {isCleaning ? 'Cleaning...' : 'Cleanup System Data'}
            </span>
          </Button>
          <Badge className="bg-blue-500/10 text-blue-500 border-none px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest">
            {allContents.length} Total
          </Badge>
          <Badge className="bg-yellow-500/10 text-yellow-600 border-none px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest">
            {allContents.filter(c => c.status === 'pending').length} Pending
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar scroll-smooth">
        <button 
          onClick={() => setAdminTab('resources')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'resources' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Resources
        </button>
        <button 
          onClick={() => setAdminTab('playlists')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'playlists' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Playlists
        </button>
        <button 
          onClick={() => setAdminTab('users')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'users' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Users
        </button>
        <button 
          onClick={() => setAdminTab('feedback')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'feedback' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Feedback
        </button>
        <button 
          onClick={() => setAdminTab('exams')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'exams' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Exams
        </button>
        <button 
          onClick={() => setAdminTab('questions')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'questions' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Questions
        </button>
        <button 
          onClick={() => setAdminTab('leaderboards')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'leaderboards' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Leaderboards
        </button>
        <button 
          onClick={() => setAdminTab('academics')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'academics' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Academic Info
        </button>
        <button 
          onClick={() => setAdminTab('newsletter')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'newsletter' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Newsletter Hub
        </button>
        <button 
          onClick={() => setAdminTab('subscriptions')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'subscriptions' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Subscription Management
        </button>
      </div>

      {adminTab === 'newsletter' ? (
        renderNewsletterAdminTab()
      ) : adminTab === 'academics' ? (
        <AcademicManagement onDataChanged={refreshAcademicData} />
      ) : adminTab === 'resources' ? (
        <div className="grid grid-cols-1 gap-4">
          {allContents.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all">
              <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                <img 
                  src={item.thumbnail ? getDirectImageUrl(item.thumbnail) : 'https://picsum.photos/seed/edu/400/250'} 
                  alt={item.title} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    if (e.currentTarget) {
                      e.currentTarget.style.opacity = '0';
                    }
                  }}
                />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none text-[10px] uppercase font-black tracking-widest">{item.category}</Badge>
                  <Badge className={`border-none text-[10px] uppercase font-black tracking-widest ${
                    item.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                    item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' : 
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {item.status}
                  </Badge>
                </div>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">{item.title}</h4>
                <p className="text-sm text-zinc-500 line-clamp-1">{item.description}</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Author ID: {item.authorId}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-blue-500" onClick={() => handleEditContent(item)}><Pencil size={20} /></Button>
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-500" onClick={() => handleDeleteContent(item.id)}><Trash2 size={20} /></Button>
                {item.status !== 'approved' && (
                  <Button variant="primary" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveContent(item.id, item.category)}>Approve</Button>
                )}
                {item.status !== 'rejected' && (
                  <Button variant="outline" size="sm" className="border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={() => handleRejectContent(item.id, item.category)}>Reject</Button>
                )}
              </div>
            </div>
          ))}
          {allContents.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <FileIcon size={40} />
              </div>
              <p className="text-zinc-500 font-bold">No resources found in the system.</p>
            </div>
          )}
        </div>
      ) : adminTab === 'playlists' ? (
        <div className="grid grid-cols-1 gap-4">
          {allPlaylists.map((playlist, pIdx) => (
            <div key={`all-pl-${playlist.id || pIdx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all">
              <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                <img 
                  src={playlist.thumbnail ? getDirectImageUrl(playlist.thumbnail) : 'https://img.youtube.com/vi/playlist/mqdefault.jpg'} 
                  alt={playlist.title} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    if (e.currentTarget) {
                      e.currentTarget.style.opacity = '0';
                    }
                  }}
                />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none text-[10px] uppercase font-black tracking-widest">{playlist.type}</Badge>
                  <Badge className={`border-none text-[10px] uppercase font-black tracking-widest ${
                    playlist.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                    playlist.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' : 
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {playlist.status}
                  </Badge>
                </div>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">{playlist.title}</h4>
                <p className="text-sm text-zinc-500 line-clamp-1">{playlist.description}</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Author ID: {playlist.authorId}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {playlist.status !== 'approved' && (
                  <Button variant="primary" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprovePlaylist(playlist.id)}>Approve</Button>
                )}
                {playlist.status !== 'rejected' && (
                  <Button variant="outline" size="sm" className="border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={() => handleRejectPlaylist(playlist.id)}>Reject</Button>
                )}
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-500" onClick={() => handleDeletePlaylist(playlist.id)}><Trash2 size={20} /></Button>
              </div>
            </div>
          ))}
          {allPlaylists.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <Youtube size={40} />
              </div>
              <p className="text-zinc-500 font-bold">No playlists found in the system.</p>
            </div>
          )}
        </div>
      ) : adminTab === 'users' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-zinc-800/40 p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">User Directory</span>
              <h4 className="text-xl font-black text-zinc-950 dark:text-white">
                {allUsers.length} Registered User{allUsers.length === 1 ? '' : 's'}
              </h4>
            </div>
            
            <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/50 dark:border-zinc-800 self-center">
              <button
                onClick={() => setAdminUserCategory('all')}
                className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${adminUserCategory === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
              >
                All ({usersWithRealtimeExpiry.length})
              </button>
              <button
                onClick={() => setAdminUserCategory('normal')}
                className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${adminUserCategory === 'normal' ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}
              >
                Normal ({usersWithRealtimeExpiry.filter(u => !(u.hasPremiumAccess || u.isPremium)).length})
              </button>
              <button
                onClick={() => setAdminUserCategory('premium')}
                className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${adminUserCategory === 'premium' ? 'bg-amber-500 text-zinc-950 shadow-md' : 'text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400'}`}
              >
                Premium ({usersWithRealtimeExpiry.filter(u => u.hasPremiumAccess || u.isPremium).length})
              </button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text"
                placeholder="Search by email, name or ID..." 
                className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-3xl outline-none text-sm dark:text-white focus:border-zinc-300 dark:focus:border-zinc-650 transition-all font-medium placeholder:text-zinc-400"
                value={adminUserSearchQuery}
                onChange={(e) => setAdminUserSearchQuery(e.target.value)}
              />
              {adminUserSearchQuery && (
                <button 
                  onClick={() => setAdminUserSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-205 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map((u, uIdx) => (
            <div key={`all-u-${u.id || uIdx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start md:items-center gap-6 flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200/50 dark:border-zinc-800/80">
                    <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-black text-zinc-900 dark:text-white truncate">{u.name || 'Anonymous User'}</h4>
                      {u.role === 'admin' && <Badge className="bg-blue-500 text-white border-none text-[8px] uppercase font-black px-2">Admin</Badge>}
                    </div>
                    <p className="text-sm text-zinc-500 truncate">{u.email}</p>
                    {(u.phone_number || u.phone) && (
                      <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1">
                        <span>📱</span> {u.phone_number || u.phone}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">ID: {u.id}</p>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {u.academicClass && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/10">
                          Class: {u.academicClass}
                        </span>
                      )}
                      {u.academicGroup && u.academicGroup !== 'All' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-450 border border-amber-100 dark:border-amber-900/10">
                          Group: {u.academicGroup}
                        </span>
                      )}
                    </div>

                    {(u.hasPremiumAccess || u.isPremium) && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 dark:bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/20">
                          ✨ Pro Gained: {u.updated_at ? new Date(u.updated_at).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Active'}
                        </span>
                        {u.premium_expiry && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-200/30 dark:border-zinc-700/30">
                            Expires: {new Date(u.premium_expiry).toLocaleString('bn-BD')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 shrink-0 md:justify-end border-t border-zinc-100 dark:border-zinc-800/80 pt-4 md:pt-0 md:border-none">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Premium Access</span>
                    <button 
                      onClick={() => handleTogglePremiumAccess(u.id, u.hasPremiumAccess || u.isPremium)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${u.hasPremiumAccess || u.isPremium ? 'bg-amber-500' : 'bg-zinc-200 dark:bg-zinc-700'} cursor-pointer`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.hasPremiumAccess || u.isPremium ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Upload Permission</span>
                    <button 
                      onClick={() => handleToggleUpload(u.id, u.canUpload)}
                      disabled={u.role === 'admin'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${u.canUpload ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-700'} ${u.role === 'admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.canUpload ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Resources Admin</span>
                    <button 
                      onClick={() => handleToggleManageResources(u.id, u.canManageResources)}
                      disabled={u.role === 'admin'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${u.canManageResources ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'} ${u.role === 'admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.canManageResources ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Exams Admin</span>
                    <button 
                      onClick={() => handleToggleManageExams(u.id, u.canManageExams)}
                      disabled={u.role === 'admin'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${u.canManageExams ? 'bg-violet-600' : 'bg-zinc-200 dark:bg-zinc-700'} ${u.role === 'admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.canManageExams ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Questions Admin</span>
                    <button 
                      onClick={() => handleToggleManageQuestions(u.id, u.canManageQuestions)}
                      disabled={u.role === 'admin'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${u.canManageQuestions ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-700'} ${u.role === 'admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.canManageQuestions ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              {u.role !== 'admin' && (
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 dark:text-amber-400 flex items-center gap-1.5">
                      📅 Subscription Validity Duration (মেয়াদ পরিবর্তন করুন)
                    </span>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {u.premium_expiry ? (
                        <>মেয়াদ শেষ হবে: <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{new Date(u.premium_expiry).toLocaleString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></>
                      ) : (
                        "আজীবন মেয়াদী (Unlimited Life Access) অথবা নন-প্রিমিয়াম ইউজার"
                      )}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/60 p-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 shadow-sm">
                      <Clock size={14} className="text-zinc-400 dark:text-zinc-500 ml-1.5" />
                      <input 
                        type="datetime-local"
                        value={u.premium_expiry ? new Date(new Date(u.premium_expiry).getTime() - (new Date().getTimezoneOffset() * 60 * 1000)).toISOString().slice(0, 16) : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            handleSetCustomExpiry(u.id, new Date(val).toISOString());
                          } else {
                            handleSetCustomExpiry(u.id, null);
                          }
                        }}
                        className="bg-transparent text-xs font-bold dark:text-white outline-none"
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => {
                          const date = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
                          handleSetCustomExpiry(u.id, date);
                        }}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-[10px] font-extrabold rounded-lg transition-all dark:text-zinc-300 border border-zinc-200/40 dark:border-zinc-700/30"
                        title="Set for 1 hour for testing or instant trial"
                      >
                        ১ ঘন্টা
                      </button>
                      <button
                        onClick={() => {
                          const date = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
                          handleSetCustomExpiry(u.id, date);
                        }}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-[10px] font-extrabold rounded-lg transition-all dark:text-zinc-300 border border-zinc-200/40 dark:border-zinc-700/30"
                      >
                        ১ দিন
                      </button>
                      <button
                        onClick={() => {
                          const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                          handleSetCustomExpiry(u.id, date);
                        }}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-[10px] font-extrabold rounded-lg transition-all dark:text-zinc-300 border border-zinc-200/40 dark:border-zinc-700/30"
                      >
                        ৭ দিন
                      </button>
                      <button
                        onClick={() => {
                          const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                          handleSetCustomExpiry(u.id, date);
                        }}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-[10px] font-extrabold rounded-lg transition-all dark:text-zinc-300 border border-zinc-200/40 dark:border-zinc-700/30"
                      >
                        ৩০ দিন
                      </button>
                      <button
                        onClick={() => {
                          const date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
                          handleSetCustomExpiry(u.id, date);
                        }}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-[10px] font-extrabold rounded-lg transition-all dark:text-zinc-300 border border-zinc-200/40 dark:border-zinc-700/30"
                      >
                        ১ বছর
                      </button>
                      <button
                        onClick={() => handleSetCustomExpiry(u.id, null)}
                        className="px-2.5 py-1.5 bg-amber-500/10 dark:bg-amber-500/5 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg transition-all border border-amber-500/20"
                      >
                        আজীবন
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="py-20 text-center space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <Search size={40} />
              </div>
              <p className="text-zinc-500 font-bold">No users match your search query.</p>
            </div>
          )}
          </div>
        </div>
      ) : adminTab === 'exams' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
            <div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Question Bank Size</p>
              <h4 className="text-xl font-black text-indigo-900 dark:text-white">{allQuestions.length} Global Questions</h4>
            </div>
            <Button 
              onClick={() => {
                setEditingExamId(null);
                setNewExam({
                  title: '',
                  description: '',
                  timeLimit: 30,
                  mcqCount: 25,
                  writtenCount: 1,
                  class: dynamicClasses?.[0]?.name || 'SSC',
                  subject: 'General',
                  status: 'approved'
                });
                setIsAddingExam(true);
              }}
              icon={Plus}
              className="bg-indigo-600 shadow-lg shadow-indigo-500/20"
            >
              Create New Exam
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {allExams.map((exam, idx) => (
              <div key={`${exam.id}-${idx}`} className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-xl hover:border-indigo-500/20 transition-all duration-300 overflow-hidden">
                {/* Confirmation Overlay for Deletion */}
                <AnimatePresence>
                  {examToDelete === exam.id && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 bg-red-600/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center space-y-4"
                    >
                      <div className="bg-white/20 p-3 rounded-2xl">
                        <Trash2 size={24} className="text-white" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-lg font-black tracking-tight">Delete this exam?</h5>
                        <p className="text-xs text-white/80 font-medium">This action is permanent and cannot be reversed.</p>
                      </div>
                      <div className="flex items-center gap-3 w-full max-w-[240px]">
                        <Button 
                          variant="ghost" 
                          className="flex-1 bg-white text-red-600 hover:bg-zinc-100 rounded-xl py-3 font-bold text-xs" 
                          onClick={async () => {
                            setIsDeletingExam(true);
                            console.log(`Starting deletion of exam: ${exam.id}`);
                            try {
                              await supabase.from('exams').delete().eq('id', exam.id);
                              console.log('Deletion successful');
                              setExamToDelete(null);
                            } catch (err: any) {
                              console.error('Deletion error:', err);
                              setGlobalError(`Delete failed: ${err.message}`);
                              setExamToDelete(null);
                            } finally {
                              setIsDeletingExam(false);
                            }
                          }}
                          disabled={isDeletingExam}
                        >
                          {isDeletingExam ? <RefreshCw className="animate-spin" size={14} /> : 'Delete'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="flex-1 bg-black/20 text-white hover:bg-black/30 rounded-xl py-3 font-bold text-xs" 
                          onClick={() => setExamToDelete(null)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <ClipboardList size={32} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{exam.title}</h4>
                    <Badge className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-none px-3 py-1 font-black">
                      {exam.class} • {exam.subject}
                    </Badge>
                    {exam.status === 'pending' && <Badge className="bg-amber-100 text-amber-600 border-none">Pending</Badge>}
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{exam.description || 'No description provided.'}</p>
                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    <span className="flex items-center gap-1.5 py-1 px-3 bg-zinc-50 dark:bg-zinc-800 rounded-full"><Clock size={12} className="text-zinc-500" /> {exam.timeLimit} MIN</span>
                    <span className="flex items-center gap-1.5 py-1 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600"><HelpCircle size={12} /> {exam.mcqCount} MCQ</span>
                    <span className="flex items-center gap-1.5 py-1 px-3 bg-purple-50 dark:bg-purple-900/20 rounded-full text-purple-600"><FileText size={12} /> {exam.writtenCount} WRITTEN</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all shadow-sm" 
                    onClick={() => {
                      setNewExam(exam);
                      setEditingExamId(exam.id);
                      setIsAddingExam(true);
                    }}
                  >
                    <Pencil size={20} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-white hover:bg-red-500 transition-all border border-transparent shadow-sm" 
                    onClick={() => setExamToDelete(exam.id)}
                  >
                    <Trash2 size={20} />
                  </Button>
                </div>
              </div>
            ))}
            {allExams.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                  <ClipboardList size={40} />
                </div>
                <p className="text-zinc-500 font-bold">No exams configured yet.</p>
              </div>
            )}
          </div>
        </div>
      ) : adminTab === 'questions' ? (
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  placeholder="Search questions..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white"
                  onChange={(e) => {/* Add search logic if needed */}}
                />
              </div>
              <select 
                className="w-full sm:w-64 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl outline-none text-sm dark:text-white font-bold"
                value={questionBankExamId}
                onChange={e => setQuestionBankExamId(e.target.value)}
              >
                <option value="global">Global Question Bank</option>
                <optgroup label="Filter by Exam">
                  {allExams.map((exam, eIdx) => (
                    <option key={`exam-opt-${exam.id || eIdx}`} value={exam.id}>{exam.title} ({exam.class || exam.academicClass})</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                className="rounded-2xl border-orange-200 text-orange-600 hover:bg-orange-50"
                onClick={async () => {
                  if (!confirm('This will scan all questions and fix common typos (like "mtah" to "Math") in the database. Continue?')) return;
                  setIsGeneratingExam(true);
                  try {
                    const { data: questions, error } = await supabase.from('questions').select('*');
                    if (error) throw error;
                    
                    let fixedCount = 0;
                    for (const data of questions) {
                      let updated = false;
                      const updateObj: any = {};
                      
                      if (data.subject?.toLowerCase() === 'mtah') {
                        updateObj.subject = 'Math';
                        updated = true;
                      }
                      
                      if (updated) {
                        await supabase.from('questions').update(updateObj).eq('id', data.id);
                        fixedCount++;
                      }
                    }
                    alert(`Cleanup complete! ${fixedCount} questions were repaired.`);
                  } catch (err: any) {
                    setGlobalError(err.message);
                  } finally {
                    setIsGeneratingExam(false);
                  }
                }}
              >
                <Database size={16} className="mr-2" />
                Repair Typos
              </Button>
              <Button 
                variant="outline"
                className="rounded-2xl border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={async () => {
                  if (!confirm('This will add 15+ standardized questions. Continue?')) return;
                  setIsGeneratingExam(true);
                  try {
                    const sampleQuestions = [
                      // General Knowledge for admissions
                      { type: 'mcq', questionText: 'What is the capital of Bangladesh?', options: ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi'], correctAnswer: 0, points: 1, class: 'General', subject: 'General Knowledge', chapter: 'Geography', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'In which year did Bangladesh gain independence?', options: ['1970', '1971', '1972', '1975'], correctAnswer: 1, points: 1, class: 'General', subject: 'General Knowledge', chapter: 'History', createdAt: Date.now() },
                      
                      // Physics SSC
                      { type: 'mcq', questionText: 'Which unit is used to measure force?', options: ['Watt', 'Joule', 'Newton', 'Pascal'], correctAnswer: 2, points: 1, class: 'SSC', subject: 'Physics', chapter: 'Force', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'What is the acceleration due to gravity on Earth?', options: ['8.8 ms^-2', '9.8 ms^-2', '10.8 ms^-2', '7.8 ms^-2'], correctAnswer: 1, points: 1, class: 'SSC', subject: 'Physics', chapter: 'Motion', createdAt: Date.now() },
                      
                      // Math SSC
                      { type: 'mcq', questionText: 'Solve: 5x + 10 = 30. What is x?', options: ['2', '4', '6', '8'], correctAnswer: 1, points: 2, class: 'SSC', subject: 'Math', chapter: 'Algebra', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'What is the sum of angles in a triangle?', options: ['90°', '180°', '270°', '360°'], correctAnswer: 1, points: 1, class: 'SSC', subject: 'Math', chapter: 'Geometry', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'What is the value of pi (π) up to two decimal places?', options: ['3.12', '3.14', '3.16', '3.18'], correctAnswer: 1, points: 1, class: 'SSC', subject: 'Math', chapter: 'Geometry', createdAt: Date.now() },
                      
                      // Biology SSC
                      { type: 'mcq', questionText: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Apparatus'], correctAnswer: 1, points: 1, class: 'SSC', subject: 'Biology', chapter: 'Cell', createdAt: Date.now() },
                      { type: 'written', questionText: 'Explain the three laws of Newton.', points: 10, class: 'SSC', subject: 'Physics', chapter: 'Laws of Motion', createdAt: Date.now() },

                      // Medical Admission Samples
                      { type: 'mcq', questionText: 'Which vitamin is synthesized by the human skin in sunlight?', options: ['Vit A', 'Vit B12', 'Vit C', 'Vit D'], correctAnswer: 3, points: 1, class: 'Medical Admission-science', subject: 'General', chapter: 'Biology', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'What is the normal blood pH range for humans?', options: ['7.05 - 7.15', '7.35 - 7.45', '7.55 - 7.65', '6.85 - 6.95'], correctAnswer: 1, points: 1, class: 'Medical Admission-science', subject: 'General', chapter: 'Chemistry', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'Who is the father of Bangladesh?', options: ['Sheikh Mujibur Rahman', 'Ziaur Rahman', 'Sher-e-Bangla', 'Bhashani'], correctAnswer: 0, points: 1, class: 'Medical Admission-science', subject: 'General', chapter: 'GK', createdAt: Date.now() },
                      
                      // Engineering Admission Samples
                      { type: 'mcq', questionText: 'Calculation of work done by a variable force involves:', options: ['Multiplication', 'Division', 'Integration', 'Addition'], correctAnswer: 2, points: 1, class: 'Engineering Admission-science', subject: 'Physics', chapter: 'Mechanics', createdAt: Date.now() }
                    ];

                    const mappedQuestions = sampleQuestions.map(q => ({
                      ...q,
                      academic_class: (q as any).class,
                      created_at: new Date().toISOString()
                    }));
                    
                    for (const q of mappedQuestions) {
                      delete (q as any).class;
                      await supabase.from('questions').insert([q]);
                    }
                    alert('Questions seeded successfully!');
                  } catch (err: any) {
                    setGlobalError(err.message);
                  } finally {
                    setIsGeneratingExam(false);
                  }
                }}
              >
                <Database size={16} className="mr-2" />
                Seed Questions
              </Button>
              <Button 
                onClick={() => {
                  setEditingQuestionId(null);
                  setNewQuestion({
                    type: 'mcq',
                    questionText: '',
                    options: ['', '', '', ''],
                    correctAnswer: 0,
                    points: 1,
                    class: dynamicClasses?.[0]?.name || 'SSC',
                    subject: 'Math',
                    chapter: ''
                  });
                  setIsAddingQuestion(true);
                }}
                icon={Plus}
                className="bg-blue-600 shadow-lg shadow-blue-500/20"
              >
                Add Question
              </Button>
            </div>
          </div>

          <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[40px] border border-zinc-200/50 dark:border-zinc-800/50 space-y-8 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Filter by Class</label>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-none">{questionClassFilter}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {classes.map(c => (
                  <button
                    key={c}
                    onClick={() => setQuestionClassFilter(c)}
                    className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                      questionClassFilter === c 
                      ? 'bg-indigo-600 text-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] scale-105' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {isGroupNeeded(questionClassFilter) && (
              <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Filter by Group</label>
                  <Badge className="bg-amber-500/10 text-amber-600 border-none">{questionGroupFilter}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['All', ...Array.from(new Set(academicGroups.map(g => g.name)))].map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        setQuestionGroupFilter(g);
                        setQuestionSubjectFilter('All');
                      }}
                      className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                        questionGroupFilter === g 
                        ? 'bg-amber-600 text-white shadow-[0_10px_20px_-5px_rgba(217,119,6,0.4)] scale-105' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Filter by Subject</label>
                <Badge className="bg-blue-500/10 text-blue-600 border-none">{questionSubjectFilter}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {questionSubjectsFilterList.map(s => (
                  <button
                    key={s}
                    onClick={() => setQuestionSubjectFilter(s)}
                    className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                      questionSubjectFilter === s 
                      ? 'bg-blue-600 text-white shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] scale-105' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs">
                <Database size={16} />
                <span>Showing {allQuestions.filter(q => (questionClassFilter === 'All' || q.class === questionClassFilter) && (questionGroupFilter === 'All' || q.academicGroup === questionGroupFilter || (q as any).academic_group === questionGroupFilter || q.academicGroup === 'All' || (q as any).academic_group === 'All') && (questionSubjectFilter === 'All' || q.subject === questionSubjectFilter)).length} Questions</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setQuestionClassFilter('All');
                  setQuestionSubjectFilter('All');
                }}
                className="text-[10px]"
                icon={RefreshCw}
              >
                Reset All
              </Button>
            </div>
          </div>

          {allQuestions.filter(q => (questionClassFilter === 'All' || q.class === questionClassFilter) && (questionGroupFilter === 'All' || q.academicGroup === questionGroupFilter || (q as any).academic_group === questionGroupFilter || q.academicGroup === 'All' || (q as any).academic_group === 'All') && (questionSubjectFilter === 'All' || q.subject === questionSubjectFilter)).length === 0 && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <Database size={32} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-zinc-900 dark:text-white">Empty Question Bank</h4>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto">Your question bank is empty. Use the "Seed Questions" button above to quickly populate it with standardized data.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {allQuestions
              .filter(q => (questionClassFilter === 'All' || q.class === questionClassFilter) && (questionGroupFilter === 'All' || q.academicGroup === questionGroupFilter || (q as any).academic_group === questionGroupFilter || q.academicGroup === 'All' || (q as any).academic_group === 'All') && (questionSubjectFilter === 'All' || q.subject === questionSubjectFilter))
              .map((q, qIdx) => (
              <div key={`${q.id || 'q'}-${qIdx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${q.type === 'mcq' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'}`}>
                  {q.type === 'mcq' ? <HelpCircle size={24} /> : <FileText size={24} />}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-2 py-0.5 text-[8px] uppercase font-black">{q.class}</Badge>
                    <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-none px-2 py-0.5 text-[8px] uppercase font-black">{q.subject}</Badge>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{q.chapter}</span>
                    {(() => {
                      const tId = q.topicId || (q as any).topic_id;
                      const matched = tId ? dynamicTopics.find(t => t.id === tId) : null;
                      if (!matched) return null;
                      return (
                        <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 border-none px-2 py-0.5 text-[8px] uppercase font-black">
                          {matched.name}
                        </Badge>
                      );
                    })()}
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-2 leading-relaxed">
                    {q.questionText}
                  </h4>
                  {q.type === 'mcq' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {q.options?.map((opt, i) => (
                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded-lg border ${i === q.correctAnswer ? 'bg-green-500/10 border-green-500/20 text-green-600 font-bold' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'}`}>
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-400 hover:text-blue-500" onClick={() => {
                    handleTriggerEditQuestion(q);
                  }}><Pencil size={18} /></Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-400 hover:text-red-500" onClick={() => {
                    handleDeleteQuestion(q.id);
                  }}><Trash2 size={18} /></Button>
                </div>
              </div>
            ))}
            {allQuestions.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                  <Database size={40} />
                </div>
                <p className="text-zinc-500 font-bold">Your question bank is empty.</p>
              </div>
            )}
          </div>
        </div>
      ) : adminTab === 'leaderboards' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto no-scrollbar">
            {Array.from(new Set(dynamicClasses.map(c => c.name))).map(group => (
              <button
                key={group}
                onClick={() => setLeaderboardClassFilter(group)}
                className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${leaderboardClassFilter === group ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
              >
                {group}
              </button>
            ))}
          </div>

          <Card className="rounded-[40px] border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                  <Trophy size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Active Class Rankings</h3>
                  <p className="text-xs text-zinc-500">Ranking strictly by Score &gt; Time &gt; Early Submission.</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-800/50">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Rank</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Student</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Exam</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Score</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Time</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(Array.isArray(allLeaderboards) ? allLeaderboards : [])
                    .filter(entry => entry && getClassGroup(entry.class) === getClassGroup(leaderboardClassFilter))
                    .sort((a, b) => {
                      if ((b.bestScore ?? 0) !== (a.bestScore ?? 0)) {
                        return (b.bestScore ?? 0) - (a.bestScore ?? 0);
                      }
                      if ((a.timeTaken ?? 0) !== (b.timeTaken ?? 0)) {
                        return (a.timeTaken ?? 0) - (b.timeTaken ?? 0);
                      }
                      const accA = a.accuracy ?? 0;
                      const accB = b.accuracy ?? 0;
                      if (accB !== accA) return accB - accA;
                      if ((b.totalAttempts ?? 0) !== (a.totalAttempts ?? 0)) {
                        return (b.totalAttempts ?? 0) - (a.totalAttempts ?? 0);
                      }
                      const timeA = new Date(a.firstSubmissionAt || a.lastUpdated || 0).getTime();
                      const timeB = new Date(b.firstSubmissionAt || b.lastUpdated || 0).getTime();
                      return timeA - timeB;
                    })
                    .map((entry, idx) => (
                      <tr key={`${entry.id}-${idx}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-zinc-300 text-zinc-700' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                              <img 
                                src={entry.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userName}`} 
                                alt="" 
                                className="w-full h-full object-cover" 
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userName}`;
                                }}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900 dark:text-white capitalize">{entry.userName}</p>
                              <p className="text-[10px] text-zinc-400 font-medium">Attempts: {entry.totalAttempts}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-zinc-500">{entry.examTitle}</td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-sm font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full">
                            {entry.bestScore}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-xs font-bold text-zinc-500 tabular-nums">
                            {Math.floor(entry.timeTaken / 60)}:{(entry.timeTaken % 60).toString().padStart(2, '0')}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                           <button 
                            onClick={async () => {
                              if (confirm('Delete this leaderboard entry?')) {
                                await supabase.from('leaderboards').delete().eq('id', entry.id);
                              }
                            }}
                            className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                           >
                             <Trash2 size={16} />
                           </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {(Array.isArray(allLeaderboards) ? allLeaderboards : []).filter(entry => entry && getClassGroup(entry.class) === getClassGroup(leaderboardClassFilter)).length === 0 && (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                    <Trophy size={32} />
                  </div>
                  <p className="text-sm font-bold text-zinc-500">No participants ranked for {leaderboardClassFilter} yet.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : adminTab === 'subscriptions' ? (
        <AdminSubscriptionManager adminUser={user} allUsers={allUsers} fetchUsersInfo={fetchUsersInfo} />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {allFeedback.map(f => (
            <FeedbackCard key={f.id} feedback={f} onUpdate={fetchFeedback} />
          ))}
          {allFeedback.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <MessageSquare size={40} />
              </div>
              <p className="text-zinc-500 font-bold">No feedback received yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

  const renderLeaderboard = () => {
    const filteredExams = Array.isArray(allExams) ? allExams : [];
    const activeExamId = leaderboardExamId || (filteredExams[0]?.id || null);
    const activeExamObj = filteredExams.find(e => e && e.id === activeExamId);

    const leadEntriesForExam = (Array.isArray(allLeaderboards) ? allLeaderboards : [])
      .filter(entry => entry && entry.examId === activeExamId)
      .filter(entry => {
        if (!entry) return false;
        if (!leaderboardClassFilter) return true;
        return getClassGroup(entry.class) === getClassGroup(leaderboardClassFilter);
      })
      .sort((a, b) => {
        if ((b.bestScore ?? 0) !== (a.bestScore ?? 0)) {
          return (b.bestScore ?? 0) - (a.bestScore ?? 0);
        }
        if ((a.timeTaken ?? 0) !== (b.timeTaken ?? 0)) {
          return (a.timeTaken ?? 0) - (b.timeTaken ?? 0);
        }
        const accA = a.accuracy ?? 0;
        const accB = b.accuracy ?? 0;
        if (accB !== accA) return accB - accA;
        if ((b.totalAttempts ?? 0) !== (a.totalAttempts ?? 0)) {
          return (b.totalAttempts ?? 0) - (a.totalAttempts ?? 0);
        }
        const timeA = new Date(a.firstSubmissionAt || a.lastUpdated || 0).getTime();
        const timeB = new Date(b.firstSubmissionAt || b.lastUpdated || 0).getTime();
        return timeA - timeB;
      });

    const filteredUserStats = (Array.isArray(allUserStats) ? allUserStats : []).slice(0, 100);

    return (
      <ScrollSection className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-lg">
                🏆 Live Competition
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight mt-1">
              Top Performers
            </h2>
            <p className="text-sm text-zinc-500 font-medium mt-1">
              Real-time rankings powered by authentic database submissions.
            </p>
          </div>

          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl">
            <button
              onClick={() => setLeaderboardTab('global')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                leaderboardTab === 'global'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white_80'
              }`}
            >
              <Crown size={14} />
              Hall of Fame
            </button>
            <button
              onClick={() => {
                setLeaderboardTab('exam');
                if (!leaderboardExamId && filteredExams.length > 0) {
                  setLeaderboardExamId(filteredExams[0].id);
                }
              }}
              className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                leaderboardTab === 'exam'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white_80'
              }`}
            >
              <BookOpen size={14} />
              Exam Stands
            </button>
          </div>
        </div>

        {leaderboardTab === 'exam' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-zinc-50 dark:bg-zinc-900/40 p-5 rounded-3xl border border-zinc-200/40 dark:border-zinc-800/40">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5">
                Select Particular Exam
              </label>
              <div className="relative">
                <select
                  value={activeExamId || ''}
                  onChange={(e) => setLeaderboardExamId(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 py-3 text-sm font-bold text-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer"
                >
                  {filteredExams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      [{exam.class}] {exam.title}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-400">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-1.5">
                Academic Class Filter
              </label>
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto max-w-full">
                {['All', ...(Array.isArray(dynamicClasses) ? dynamicClasses : []).map(c => c && c.name).filter(Boolean)].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setLeaderboardClassFilter(cls === 'All' ? '' : cls)}
                    className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                      (cls === 'All' && !leaderboardClassFilter) || leaderboardClassFilter === cls
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {leaderboardTab === 'global' && (
          <TiltContainer>
            <Card className="rounded-[40px] border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-2xl bg-white dark:bg-zinc-900">
              <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg">
                    <Crown size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Global Student Hall of Fame</h3>
                    <p className="text-xs text-zinc-500">Ranked by Lifetime XP, Trophy Badges, and Activity Streaks.</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 w-24">Rank</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Student Name</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Badge Tier</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Streak</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Exams Done</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Avg Score</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right pr-12">Total XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredUserStats.map((entry, idx) => {
                      const isCurrentUser = entry.userId === user?.id;
                      return (
                        <tr key={`${entry.userId}-${idx}`} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group ${isCurrentUser ? 'bg-indigo-50/30 dark:bg-indigo-500/5 font-semibold' : ''}`}>
                          <td className="px-8 py-5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-400 text-yellow-900 shadow-md' : idx === 1 ? 'bg-zinc-300 text-zinc-700' : idx === 2 ? 'bg-orange-300 text-orange-900' : (isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500')}`}>
                              {idx + 1}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                <img 
                                  src={entry.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userName}`} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userName}`;
                                  }}
                                />
                              </div>
                              <div>
                                <p className={`text-sm font-bold ${isCurrentUser ? 'text-indigo-600' : 'text-zinc-900 dark:text-white'} capitalize`}>
                                  {isCurrentUser ? (firestoreUser?.display_name || user?.user_metadata?.full_name || entry.userName) : entry.userName}
                                  {isCurrentUser && ' (You)'}
                                </p>
                                <p className="text-[10px] text-zinc-400 font-medium">Student Member</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              entry.badge === 'Master' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' :
                              entry.badge === 'Gold' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' :
                              entry.badge === 'Silver' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' :
                              'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                            }`}>
                              <Sparkles size={10} />
                              {entry.badge}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center font-bold text-zinc-800 dark:text-zinc-100">
                            {entry.streak > 0 ? (
                              <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 dark:bg-orange-950 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                                <Zap size={11} className="fill-current" />
                                {entry.streak} Day{entry.streak > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-xs font-bold">-</span>
                            )}
                          </td>
                          <td className="px-8 py-5 text-center text-sm font-bold text-zinc-500 tabular-nums">{entry.totalExams}</td>
                          <td className="px-8 py-5 text-center text-sm font-black text-zinc-600 dark:text-zinc-400 tabular-nums">{entry.averageScore.toFixed(1)}</td>
                          <td className="px-8 py-5 text-right pr-12">
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3.5 py-1.5 rounded-2xl shadow-sm">
                              {entry.totalXp} XP
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredUserStats.length === 0 && (
                  <div className="py-24 text-center space-y-3">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                      <Crown size={32} />
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">No system statistics compiled yet. Complete an exam to register!</p>
                  </div>
                )}
              </div>
            </Card>
          </TiltContainer>
        )}

        {leaderboardTab === 'exam' && (
          <TiltContainer>
            <Card className="rounded-[40px] border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-2xl bg-white dark:bg-zinc-900">
              <div className="p-6 sm:p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {activeExamObj?.title || 'Practice Match Leaderboard'}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Academic stand: Best Score &gt; Speed Completion &gt; Accuracy Ratio &gt; Total Attempts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 w-24">Rank</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Student Name</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Accuracy</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Attempts</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Time Taken</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">XP Earned</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right pr-12">Best Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {leadEntriesForExam.map((entry, idx) => {
                      const isCurrentUser = entry.userId === user?.id;
                      return (
                        <tr key={`${entry.id}-${idx}`} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group ${isCurrentUser ? 'bg-blue-50/30 dark:bg-blue-500/5 font-semibold' : ''}`}>
                          <td className="px-8 py-5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-400 text-yellow-900 shadow-md' : idx === 1 ? 'bg-zinc-300 text-zinc-700' : idx === 2 ? 'bg-orange-300 text-orange-900' : (isCurrentUser ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500')}`}>
                              {idx + 1}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                <img 
                                  src={entry.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userName}`} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userName}`;
                                  }}
                                />
                              </div>
                              <div>
                                <p className={`text-sm font-bold ${isCurrentUser ? 'text-blue-600' : 'text-zinc-900 dark:text-white'} capitalize`}>
                                  {isCurrentUser ? (firestoreUser?.display_name || user?.user_metadata?.full_name || entry.userName) : entry.userName}
                                  {isCurrentUser && ' (You)'}
                                </p>
                                <p className="text-[10px] text-zinc-400">{entry.class}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                            {entry.accuracy !== undefined ? (
                              <span className="text-xs font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950 px-2.5 py-1 rounded-lg">
                                {entry.accuracy}%
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-8 py-5 text-center text-sm font-bold text-zinc-500 tabular-nums">{entry.totalAttempts}</td>
                          <td className="px-8 py-5 text-center">
                            <span className="text-xs font-bold text-zinc-500 tabular-nums">
                              {Math.floor(entry.timeTaken / 60)}:{(entry.timeTaken % 60).toString().padStart(2, '0')}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-center">
                            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2.5 py-1 rounded-lg">
                              +{entry.xp || 50} XP
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right pr-12">
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3.5 py-1.5 rounded-2xl">
                              {entry.bestScore}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {leadEntriesForExam.length === 0 && (
                  <div className="py-24 text-center space-y-3">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                      <Trophy size={32} />
                    </div>
                    <p className="text-sm text-zinc-500 font-medium">No student submissions found for this exam group yet.</p>
                  </div>
                )}
              </div>
            </Card>
          </TiltContainer>
        )}

        <div className="bg-zinc-50 dark:bg-zinc-800/80 p-6 rounded-[32px] text-center border border-zinc-100 dark:border-zinc-800">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
            All leaderboard entries shown are pulled in real-time from Supabase. Submitting an exam updates your status instantly!
          </p>
        </div>
      </ScrollSection>
    );
  };

  const renderUserDashboard = () => (
    <div className="space-y-8">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[24px] bg-zinc-100 dark:bg-zinc-800 overflow-hidden border-2 border-blue-500/20 relative group">
              <img 
                src={firestoreUser?.avatarUrl || firestoreUser?.avatar_url || firestoreUser?.photoURL || user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firestoreUser?.display_name || user?.user_metadata?.full_name || 'User'}`} 
                alt="" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${firestoreUser?.display_name || user?.user_metadata?.full_name || 'User'}`;
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <UserIcon size={20} className="text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{firestoreUser?.name || user?.user_metadata?.full_name || 'Student'}</h3>
                {userRole === 'admin' && <Badge className="bg-blue-500/10 text-blue-600 border-none scale-75 origin-left">Admin</Badge>}
              </div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{user?.email}</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full">
                  <GraduationCap size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{firestoreUser?.academicClass || (dynamicClasses?.[0]?.name || 'Student')}</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-700/50">
                  <Calendar size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{formatDate(firestoreUser?.createdAt || new Date().toISOString())}</span>
                </div>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            icon={Pencil} 
            className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/30"
            onClick={() => {
              setProfileFormData({ 
                displayName: firestoreUser?.name || firestoreUser?.displayName || user?.user_metadata?.full_name || '', 
                academicClass: firestoreUser?.academicClass || (dynamicClasses?.[0]?.name || '') as any,
                academicGroup: firestoreUser?.academicGroup || 'All'
              });
              setSelectedAvatarFile(null);
              setAvatarPreviewUrl(firestoreUser?.avatarUrl || firestoreUser?.avatar_url || firestoreUser?.photoURL || user?.user_metadata?.avatar_url || null);
              setIsAvatarRemoved(false);
              setIsEditingProfile(true);
            }}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] p-8 max-w-md w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Edit Profile</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingProfile(false)}><X size={20} /></Button>
              </div>

              {globalError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-semibold text-red-600 dark:text-red-400">
                  {globalError}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                {/* Profile Picture Upload Section */}
                <div className="flex flex-col items-center space-y-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Profile Picture</span>
                  <div className="relative w-24 h-24 rounded-full border-4 border-zinc-100 dark:border-zinc-800 shadow-md overflow-hidden group">
                    <img
                      src={avatarPreviewUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileFormData.displayName || 'User'}`}
                      alt="Avatar Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileFormData.displayName || 'User'}`;
                      }}
                    />
                    {isUpdatingProfile && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[10px] text-white font-extrabold animate-pulse">Saving...</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs bg-zinc-100 dark:bg-zinc-800 rounded-xl"
                      disabled={isUpdatingProfile}
                      onClick={() => {
                        document.getElementById('avatar-file-input')?.click();
                      }}
                    >
                      Change Photo
                    </Button>
                    {(avatarPreviewUrl && !avatarPreviewUrl.includes('api.dicebear.com')) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-xl"
                        disabled={isUpdatingProfile}
                        onClick={() => {
                          setSelectedAvatarFile(null);
                          setAvatarPreviewUrl(null);
                          setIsAvatarRemoved(true);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <input
                    type="file"
                    id="avatar-file-input"
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          setGlobalError("Profile picture must be less than 10MB. We will compress it automatically once selected.");
                          return;
                        }
                        setSelectedAvatarFile(file);
                        const previewUrl = URL.createObjectURL(file);
                        setAvatarPreviewUrl(previewUrl);
                        setIsAvatarRemoved(false);
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                    value={profileFormData.displayName}
                    onChange={e => setProfileFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Academic Class</label>
                  <div className="relative">
                    <select
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm appearance-none cursor-pointer"
                      value={profileFormData.academicClass}
                      onChange={e => setProfileFormData(prev => ({ ...prev, academicClass: e.target.value as AcademicClass }))}
                    >
                      {dynamicClasses.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                      <List size={16} />
                    </div>
                  </div>
                </div>

                {isGroupNeeded(profileFormData.academicClass) && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Academic Group</label>
                    <div className="relative">
                      <select
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm appearance-none cursor-pointer"
                        value={profileFormData.academicGroup}
                        onChange={e => setProfileFormData(prev => ({ ...prev, academicGroup: e.target.value }))}
                      >
                        <option value="All">All / Common</option>
                        {academicGroups.map(g => (
                          <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                        <Sparkles size={16} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 rounded-2xl"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={isUpdatingProfile}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 rounded-2xl shadow-xl shadow-blue-500/20"
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">My Uploads</h2>
          <p className="text-sm sm:text-base text-zinc-500 font-medium">Track your uploads and their moderation status.</p>
        </div>
        {canUpload && (
          <Button variant="primary" icon={Plus} className="w-full sm:w-auto" onClick={() => {
            setIsEditing(false);
            setEditingId(null);
            setNewItem({ category: 'Notes', academicClass: dynamicClasses?.[0]?.name || 'SSC', subject: '', title: '', description: '', url: '', thumbnail: '' });
            setIsAdding(true);
          }}>Upload New</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userContents.map((item, ucIdx) => (
          <div key={`uc-${item.id || ucIdx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
            <div className="h-48 relative overflow-hidden">
              <img 
                src={item.thumbnail_url ? getDirectImageUrl(item.thumbnail_url) : 'https://picsum.photos/seed/edu/400/250'} 
                alt={item.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  if (e.currentTarget) {
                    e.currentTarget.style.opacity = '0';
                  }
                }}
              />
              <div className="absolute top-4 left-4">
                <Badge className={`border-none text-[10px] uppercase font-black tracking-widest shadow-lg ${
                  item.status === 'approved' ? 'bg-green-500 text-white' : 
                  item.status === 'pending' ? 'bg-yellow-500 text-white' : 
                  'bg-red-500 text-white'
                }`}>
                  {item.status}
                </Badge>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none text-[10px] uppercase font-black tracking-widest">{item.category}</Badge>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight line-clamp-2">{item.title}</h4>
              </div>
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{formatDate(item.created_at)}</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-blue-500" onClick={() => handleEditContent(item)}><Pencil size={16} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-blue-500" 
                    onMouseEnter={() => {
                      if (item.category !== 'YouTube Classes' && item.url) {
                        prefetchPdfUrl(ensureFullUrl(item.url));
                      }
                    }}
                    onClick={() => {
                      if (item.category === 'YouTube Classes') {
                        setActiveVideo(getYouTubeId(item.url));
                      } else {
                        setActivePdf({ url: ensureFullUrl(item.url), isRestricted: item.category === 'Practice Sheet' });
                      }
                    }}><Eye size={16} /></Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {userPlaylists.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">My Playlists</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userPlaylists.map((playlist, upIdx) => (
              <div key={`up-${playlist.id || upIdx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src={playlist.thumbnail_url ? getDirectImageUrl(playlist.thumbnail_url) : 'https://img.youtube.com/vi/playlist/mqdefault.jpg'} 
                    alt={playlist.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    referrerPolicy="no-referrer" 
                    onError={(e) => {
                      if (e.currentTarget) {
                        e.currentTarget.style.opacity = '0';
                      }
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className={`border-none text-[10px] uppercase font-black tracking-widest shadow-lg ${
                      playlist.status === 'approved' ? 'bg-green-500 text-white' : 
                      playlist.status === 'pending' ? 'bg-yellow-500 text-white' : 
                      'bg-red-500 text-white'
                    }`}>
                      {playlist.status}
                    </Badge>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none text-[10px] uppercase font-black tracking-widest">{playlist.type} Playlist</Badge>
                    <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight line-clamp-2">{playlist.title}</h4>
                  </div>
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{formatDate(playlist.created_at)}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-blue-500" onClick={() => {
                        setActiveVideo(null);
                        setActivePlaylist(playlist);
                      }}><Eye size={16} /></Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {userContents.length === 0 && userPlaylists.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
            <Upload size={40} />
          </div>
          <p className="text-zinc-500 font-bold">আপনি এখনও কোনো রিসোর্স আপলোড করেননি।</p>
          {canUpload && <Button variant="outline" onClick={() => setIsAdding(true)}>আপলোড শুরু করুন</Button>}
        </div>
      )}
    </div>
  );
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderExamResults = () => {
    if (!examResults || !activeExam) return null;
    
    const score = examResults.score || 0;
    const totalMarks = examResults.totalMarks || (examResults as any).total_marks || (activeExam.questions ? activeExam.questions.length : 1) || 1;
    const percentage = (score / totalMarks) * 100;
    let feedback = "আরও উন্নতি প্রয়োজন";
    let colorClass = "text-red-500";
    let bgClass = "bg-red-500/10";
    
    if (percentage >= 80) {
      feedback = "চমৎকার! আপনি এই বিষয়ে পারদর্শী।";
      colorClass = "text-green-500";
      bgClass = "bg-green-500/10";
    } else if (percentage >= 50) {
      feedback = "ভালো হয়েছে! আরও অগ্রগতির জন্য প্র্যাকটিস চালিয়ে যান।";
      colorClass = "text-blue-500";
      bgClass = "bg-blue-500/10";
    }

    const activeQuestions = Array.isArray(activeExam?.questions) ? activeExam.questions : [];

    // Calculate dynamic user rank
    const examIdToMatch = activeExam?.id || null;
    const sortedLeaderboardForThisExam = (Array.isArray(allLeaderboards) ? allLeaderboards : [])
      .filter((entry: any) => {
        if (!entry) return false;
        const entryExamId = entry.examId ?? entry.exam_id;
        if (examIdToMatch) {
          return entryExamId === examIdToMatch;
        } else {
          return !entryExamId;
        }
      })
      .sort((a: any, b: any) => {
        const scoreA = a.bestScore ?? a.best_score ?? 0;
        const scoreB = b.bestScore ?? b.best_score ?? 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        const timeA = a.timeTaken ?? a.time_taken ?? 999999;
        const timeB = b.timeTaken ?? b.time_taken ?? 999999;
        return timeA - timeB;
      });

    const userRankIndex = sortedLeaderboardForThisExam.findIndex((entry: any) => entry.user_id === user?.id || entry.userId === user?.id);
    const calculatedRank = userRankIndex !== -1 ? userRankIndex + 1 : null;

    return (
      <div className="max-w-4xl mx-auto space-y-10 py-10">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Trophy size={48} />
          </motion.div>
          <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">পরীক্ষা সম্পন্ন হয়েছে!</h2>
          <p className="text-zinc-500 dark:text-zinc-400">{(activeExam.title || "Practice Match")} সাফল্যের সাথে শেষ করার জন্য অভিনন্দন।</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-8 text-center space-y-2 relative overflow-hidden bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">স্কোর (Score)</p>
            <h4 className="text-4xl font-black text-zinc-900 dark:text-white">{score} / {totalMarks}</h4>
          </Card>
          <Card className="p-8 text-center space-y-2 bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">নির্ভুলতার হার (Accuracy)</p>
            <h4 className="text-4xl font-black text-zinc-900 dark:text-white">{Math.round(percentage)}%</h4>
          </Card>
          <Card className="p-8 text-center space-y-2 bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">র‍্যাংক (Rank)</p>
            <h4 className="text-4xl font-black text-blue-600 dark:text-blue-400">
              {calculatedRank ? `#${calculatedRank}` : "N/A (১ম চেষ্টা)"}
            </h4>
          </Card>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 text-center space-y-1 shadow-sm">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">সঠিক উত্তর</p>
            <p className="text-2xl font-black text-green-500">
              {Number((examResults as any).correct_count ?? (examResults as any).correctCount ?? 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 text-center space-y-1 shadow-sm">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">ভুল उत्तर</p>
            <p className="text-2xl font-black text-red-500">
              {Number((examResults as any).wrong_count ?? (examResults as any).wrongCount ?? 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 text-center space-y-1 shadow-sm">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">অনুত্তরিত</p>
            <p className="text-2xl font-black text-zinc-500">
              {Number((examResults as any).unanswered_count ?? (examResults as any).unansweredCount ?? 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-900/20 p-5 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 text-center space-y-1 shadow-sm">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">সময় লেগেছে</p>
            <p className="text-2xl font-black text-indigo-500 dark:text-indigo-400">
              {formatTime(Number((examResults as any).time_taken ?? (examResults as any).timeTaken ?? 0))}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white px-2">সমাধান দেখুন</h3>
          {activeQuestions.map((q, idx) => {
            const userAnswer = (() => {
              const answersObj = examResults.answers || (examResults as any).exam_answers;
              if (answersObj) {
                if (answersObj[q.id] !== undefined) return answersObj[q.id];
                if (answersObj[idx] !== undefined) return answersObj[idx];
              }
              if (examAnswers) {
                if (examAnswers[q.id] !== undefined) return examAnswers[q.id];
                if (examAnswers[idx] !== undefined) return examAnswers[idx];
              }
              return undefined;
            })();

            const isUserCorrect = userAnswer === q.correctAnswer;

            return (
              <div key={q.id}>
                <Card className="p-8 space-y-4 border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-2 py-0.5 text-[8px] uppercase font-black">{q.class}</Badge>
                        <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-none px-2 py-0.5 text-[8px] uppercase font-black">{q.subject}</Badge>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{q.chapter}</span>
                        {(() => {
                          const tId = q.topicId || (q as any).topic_id;
                          const matched = tId && Array.isArray(dynamicTopics) ? dynamicTopics.find(t => t.id === tId) : null;
                          if (!matched) return null;
                          return (
                            <Badge className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 border-none px-2 py-0.5 text-[8px] uppercase font-black">
                              {matched.name}
                            </Badge>
                          );
                        })()}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleSaveQuestion(q.id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm border ${
                            savedQuestionIds.has(q.id)
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 border-zinc-200/50 dark:border-zinc-700'
                          }`}
                        >
                          <Bookmark 
                            size={10} 
                            className={`transition-transform duration-300 ${
                              savedQuestionIds.has(q.id) ? 'fill-amber-500 text-amber-500 scale-105' : 'text-zinc-400'
                            }`} 
                          />
                          <span>{savedQuestionIds.has(q.id) ? 'Saved' : 'Save Question'}</span>
                        </motion.button>
                      </div>
                      <MathQuestionContent questionText={q.questionText || q.question_text || ""} questionImage={q.question_image} />
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className={isUserCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                        {q.type === 'mcq' ? (isUserCorrect ? 'সঠিক' : 'ভুল') : 'সম্পন্ন'}
                      </Badge>
                    </div>
                  </div>

                  {q.type === 'mcq' && Array.isArray(q.options) && (
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map((opt, oIdx) => {
                        const isUserSelected = userAnswer === oIdx;
                        const isCorrect = q.correctAnswer === oIdx;
                        let status: 'correct' | 'incorrect' | 'neutral' = 'neutral';
                        if (isCorrect) status = 'correct';
                        else if (isUserSelected) status = 'incorrect';

                        return (
                          <MathOptionContent
                            key={oIdx}
                            optionText={opt}
                            idx={oIdx}
                            isSelected={isUserSelected}
                            onClick={() => {}}
                            correctAnswerStatus={status}
                          />
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'written' && (
                    <div className="space-y-2">
                      <p className="text-xs font-black text-zinc-400 uppercase tracking-widest underline decoration-blue-500 underline-offset-4">আপনার উত্তর:</p>
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl text-sm italic text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {userAnswer || "কোনo উত্তর দেওয়া হয়নি।"}
                      </div>
                    </div>
                  )}

                {/* Meta & Solutions block */}
                {(() => {
                  const rawQ = q as any;
                  const parsedExp = rawQ.explanation ? deserializeExplanation(rawQ.explanation) : { text: rawQ.explanation || rawQ.explanationText || '', difficulty: rawQ.difficulty || 'medium', is_premium: !!rawQ.isPremium, tags: rawQ.tags || [], status: rawQ.status || 'published', explanation_image: rawQ.explanation_image || null, negative_marks: rawQ.negative_marks || 0.25 };
                  const isSolutionLocked = (rawQ.isPremium || parsedExp.is_premium) && !hasPremiumAccess;
                  const difficultyLevel = rawQ.difficulty || parsedExp.difficulty || 'medium';
                  const negativeValue = rawQ.negativeMarks !== undefined ? rawQ.negativeMarks : parsedExp.negative_marks;
                  const tagsList = rawQ.tags || parsedExp.tags || [];

                  return (
                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-none capitalize font-bold text-[9px]">
                          Difficulty: {difficultyLevel}
                        </Badge>
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-none font-bold text-[9px]">
                          Marks: {rawQ.points || 1}
                        </Badge>
                        {negativeValue !== undefined && (
                          <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-none font-bold text-[9px]">
                            Negative: -{negativeValue}
                          </Badge>
                        )}
                        {tagsList.map((tag: string, tIdx: number) => (
                          <Badge key={tIdx} className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 border-none font-bold text-[9px]">
                            #{tag}
                          </Badge>
                        ))}
                      </div>

                      {(parsedExp.text || parsedExp.explanation_image) && (
                        <div className="space-y-3">
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest text-left">বিস্তারিত সমাধান ও ব্যাখ্যা:</p>
                          {isSolutionLocked ? (
                            <div className="p-5 border border-amber-500/20 bg-amber-500/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                              <span className="text-amber-500 text-sm font-black">🔒 প্রিমিয়ার কন্টেন্ট</span>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">এই প্রশ্নটির বিস্তারিত সমাধান ও ব্যাখ্যা দেখতে প্রিমিয়াম মেম্বারশিপ প্রয়োজন। দয়া করে ড্যাশবোর্ড থেকে প্রিমিয়ামে আপগ্রেড করুন।</p>
                            </div>
                          ) : (
                            <div className="p-5 bg-green-500/[0.015] border border-green-500/10 rounded-2xl space-y-3 text-left">
                              {parsedExp.text && (
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium whitespace-pre-line leading-relaxed text-left">
                                  {parsedExp.text}
                                </p>
                              )}
                              {parsedExp.explanation_image && (
                                <div className="rounded-xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800 max-w-lg">
                                  <img 
                                    src={parsedExp.explanation_image} 
                                    alt="Solution derivation diagram" 
                                    className="w-full object-contain max-h-72"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Card>
            </div>
          )})}
        </div>

        <div className="flex justify-center pt-10">
          <Button onClick={() => setView('home')} size="lg" icon={Home} className="rounded-full px-12">
            হোমে ফিরে যান
          </Button>
        </div>
      </div>
    );
  };

  const renderExamMode = () => {
    if (!activeExam) {
      const subjects = examSubjectsFilterList;
      const classesList = classes;

      const filteredExams = allExams.filter(exam => {
        const matchesSubject = examSubjectFilter === 'All' || exam.subject === examSubjectFilter;
        const matchesClass = examClassFilter === 'All' || exam.class === examClassFilter;
        const matchesGroup = examGroupFilter === 'All' || exam.academicGroup === examGroupFilter || (exam as any).academic_group === examGroupFilter || exam.academicGroup === 'All' || (exam as any).academic_group === 'All';
        const matchesChapter = !examChapterFilter || examChapterFilter === 'All' || !exam.chapter || (exam.chapter || '').toLowerCase() === examChapterFilter.toLowerCase();
        const matchesTopic = !examTopicFilter || examTopicFilter === 'All' || (exam as any).topic_id === examTopicFilter || (exam.topicIds && exam.topicIds.includes(examTopicFilter));
        const matchesType = contentTypeFilter === 'free' ? !exam.isPremium : exam.isPremium;
        return matchesSubject && matchesClass && matchesGroup && matchesChapter && matchesTopic && matchesType;
      });

      return (
        <ScrollSection className="max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">মক টেস্ট সেন্টার</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">আমাদের নির্বাচিত পরীক্ষাগুলোর মাধ্যমে নিজেকে যাচাই করুন। আপনার মেধা যাচাই করুন, সময় সচেতনতা বৃদ্ধি করুন এবং তাৎক্ষণিক ফলাফল পান।</p>
          </div>

          {/* Exam Filters */}
          <Card className="p-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-3xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-[40px] shadow-sm space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">বিষয় নির্বাচন করুন</label>
                <Badge className="bg-blue-500/10 text-blue-600 border-none">{examSubjectFilter}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {subjects.map(s => (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={s}
                    onClick={() => {
                      setExamSubjectFilter(s);
                      setExamChapterFilter('All');
                    }}
                    className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                      examSubjectFilter === s 
                      ? 'bg-blue-600 text-white shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] scale-105' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">শ্রেণী নির্বাচন করুন</label>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-none">{examClassFilter}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {classes.map(c => (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={c}
                    onClick={() => {
                      setExamClassFilter(c as AcademicClass | 'All');
                      setExamChapterFilter('All');
                    }}
                    className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                      examClassFilter === c 
                      ? 'bg-indigo-600 text-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] scale-105' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {c}
                  </motion.button>
                ))}
              </div>
            </div>

            {isGroupNeeded(examClassFilter) && (
              <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">গ্রুপ/স্ট্রিম নির্বাচন করুন</label>
                  <Badge className="bg-amber-500/10 text-amber-600 border-none">{examGroupFilter}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {['All', ...Array.from(new Set(academicGroups.map(g => g.name)))].map(g => (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={g}
                      onClick={() => {
                        setExamGroupFilter(g);
                        setExamSubjectFilter('All');
                        setExamChapterFilter('All');
                      }}
                      className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                        examGroupFilter === g 
                        ? 'bg-amber-600 text-white shadow-[0_10px_20px_-5px_rgba(217,119,6,0.4)] scale-105' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {g}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">উপলব্ধ অধ্যায়সমূহ</label>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none">{examChapterFilter || 'সব অধ্যায়'}</Badge>
              </div>
              {chapters.length > 1 ? (
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {chapters.map(ch => (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={ch}
                      onClick={() => {
                        setExamChapterFilter(ch);
                        setExamTopicFilter('All');
                      }}
                      className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                        (examChapterFilter === ch || (ch === 'All' && !examChapterFilter))
                        ? 'bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.4)] scale-105' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {ch}
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic ml-2">এই নির্বাচনের জন্য কোনো নির্দিষ্ট অধ্যায় পাওয়া যায়নি।</p>
              )}
            </div>

            {examChapterFilter && examChapterFilter !== 'All' && (
              <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">টপিক নির্বাচন করুন</label>
                  <Badge className="bg-purple-500/10 text-purple-600 border-none">{examTopicFilter || 'সব টপিক'}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {['All', ...dynamicTopics.filter(t => {
                    const matchedChapter = dynamicChapters.find(ch => ch.name === examChapterFilter);
                    return matchedChapter && t.chapterId === matchedChapter.id;
                  }).map(t => ({ id: t.id, name: t.name }))].map(t => (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={typeof t === 'string' ? t : t.id}
                      onClick={() => setExamTopicFilter(typeof t === 'string' ? t : t.id)}
                      className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                        examTopicFilter === (typeof t === 'string' ? t : t.id)
                        ? 'bg-purple-600 text-white shadow-[0_10px_20px_-5px_rgba(147,51,234,0.4)] scale-105' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {typeof t === 'string' ? t : t.name}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50">
               <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                 <ClipboardList size={18} />
                 <span>{filteredExams.length}টি পরীক্ষা পাওয়া গেছে</span>
               </div>
               <Button 
                 variant="ghost" 
                 size="sm" 
                 disabled={examClassFilter === 'All' && examSubjectFilter === 'All' && !examChapterFilter}
                 onClick={() => {
                   setExamClassFilter('All');
                   setExamSubjectFilter('All');
                   setExamChapterFilter('All');
                 }}
                 className="text-[10px]"
                 icon={RefreshCw}
               >
                 ফিল্টার মুছে ফেলুন
               </Button>
            </div>
          </Card>
          
          {filteredExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredExams.map((exam, feIdx) => (
                <div key={exam.id || `exam-${feIdx}`}>
                  <TiltContainer className="h-full">
                    <Card className="p-8 space-y-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all border border-zinc-200/50 dark:border-zinc-800/50 hover:border-blue-500/30 group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                          <ClipboardList size={24} />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge>{exam.time_limit} মি.</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-bold text-zinc-900 dark:text-white line-clamp-1">{exam.title}</h4>
                        <p className="text-sm text-zinc-500 line-clamp-2">{exam.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{exam.class}</Badge>
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{exam.subject}</Badge>
                        {exam.isPremium && (
                          <Badge className="bg-amber-500 text-white border-none flex items-center gap-1 font-black animate-pulse">
                            <Lock size={10} fill="currentColor" /> প্রিমিয়াম
                          </Badge>
                        )}
                      </div>
                    <div className="flex items-center gap-2">
                      {exam.isPremium && !hasPremiumAccess ? (
                        <Button 
                          className="rounded-2xl flex-1 h-12 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20" 
                          onClick={() => setGlobalError("🔒 This Exam requires a Premium subscription. Unlock Parodorshhi PRO to continue!")} 
                          icon={Lock}
                        >
                          Unlock Exam
                        </Button>
                      ) : (
                        <Button 
                          className="rounded-2xl flex-1 h-12 bg-blue-600 hover:bg-blue-700" 
                          onClick={() => handleStartExam(exam)} 
                          icon={Play}
                        >
                          Start Exam
                        </Button>
                      )}
                        <Button 
                          variant="outline" 
                          className="rounded-2xl flex-1 h-12 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800" 
                          onClick={() => {
                            setLeaderboardExamId(exam.id);
                            setLeaderboardTab('exam');
                            setView('leaderboard');
                          }}
                          icon={Trophy}
                        >
                          Rankings
                        </Button>
                        <Button 
                          variant="outline" 
                          className="rounded-2xl w-12 h-12 p-0 border-zinc-200" 
                          onClick={() => setExamPrep(exam)}
                        >
                          <Settings size={18} />
                        </Button>
                      </div>
                    </Card>
                  </TiltContainer>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">No exams found</h3>
              <p className="text-zinc-500">Try adjusting your filters to find more exams.</p>
              <Button variant="outline" onClick={() => { setExamSubjectFilter('All'); setExamClassFilter('All'); }}>Clear All Filters</Button>
            </div>
          )}
        </ScrollSection>
      );
    }

    if (examResults) return renderExamResults();

    const questions = (activeExam as any).questions || [];
    const answeredCount = questions.filter((q: any) => examAnswers[q.id] !== undefined && examAnswers[q.id] !== '').length;

    return (
      <div className="max-w-4xl mx-auto py-6 space-y-8 min-h-[60vh] flex flex-col">
        {/* Header with Timer */}
        <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-6 rounded-[24px] border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
              <Timer size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Time Remaining</p>
              <h4 className={`text-2xl font-black tracking-tight ${examTimeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-zinc-900 dark:text-white'}`}>
                {formatTime(examTimeLeft)}
              </h4>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Progress</p>
            <h4 className="text-xl font-black text-zinc-900 dark:text-white">Answered {answeredCount} / {questions.length}</h4>
          </div>
          <Button 
            variant="outline" 
            className="border-red-500/30 text-red-500 hover:bg-red-500/5 px-6 rounded-xl" 
            onClick={handleExamSubmit}
            disabled={isGeneratingExam}
          >
            {isGeneratingExam ? "Submitting..." : "Finish & Submit"}
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-8 items-start relative">
          {/* Left: Question List Area */}
          <div className="flex-1 space-y-12 py-10">
            {questions.map((q: any, idx: number) => (
              <div 
                key={q.id}
                id={`question-${idx}`}
                className="w-full max-w-3xl space-y-8 pb-12 border-b border-zinc-100 dark:border-zinc-800 last:border-0 scroll-mt-32"
              >
                {q.isPlaceholder ? (
                  <div className="w-full bg-zinc-500/5 dark:bg-zinc-950/20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 text-center space-y-6 relative overflow-hidden backdrop-blur-md text-left">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
                    
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Upcoming Question
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white leading-relaxed">
                        Question {idx + 1} Coming Soon
                      </h2>
                      <p className="text-zinc-500 font-bold">This question is under preparation. Answer selection is disabled.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto pt-4">
                      {["Option 1", "Option 2", "Option 3", "Option 4"].map((optVal, optIndex) => (
                        <button
                          key={optIndex}
                          disabled
                          className="w-full p-5 text-left rounded-2xl border-2 border-zinc-100 dark:border-zinc-900/60 bg-zinc-50/55 dark:bg-zinc-900/10 text-zinc-400 cursor-not-allowed font-bold"
                        >
                          <span className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 inline-flex items-center justify-center mr-3 text-xs font-black">
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          {optVal}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className="bg-blue-600 text-white px-4 py-1">Question {idx + 1}</Badge>
                      {examAnswers[q.id] !== undefined && examAnswers[q.id] !== '' && (
                        <Badge className="bg-green-500/10 text-green-600 border-none">Answered</Badge>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleToggleSaveQuestion(q.id)}
                        className={`flex items-center gap-2 px-3.5 py-1 px-4 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 shadow-sm border ${
                          savedQuestionIds.has(q.id)
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-amber-500/10'
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-800 dark:hover:text-white border-zinc-200/80 dark:border-zinc-700/80 hover:shadow-md'
                        }`}
                      >
                        <Bookmark 
                          size={12} 
                          className={`transition-transform duration-300 ${
                            savedQuestionIds.has(q.id) ? 'fill-amber-500 text-amber-500 scale-110' : 'text-zinc-400 dark:text-zinc-500'
                          }`} 
                        />
                        <span>{savedQuestionIds.has(q.id) ? 'Saved' : 'Save Question'}</span>
                      </motion.button>
                    </div>
                    <MathQuestionContent questionText={q.question_text || q.questionText || ""} questionImage={q.question_image} />
                  </div>

                  <div className="space-y-3">
                    {q.type === 'mcq' && q.options ? (
                      <div className="grid grid-cols-1 gap-3">
                        {q.options.map((option: any, optIdx: number) => {
                          const isSelected = examAnswers[q.id] !== undefined && (examAnswers[q.id] === optIdx || String(examAnswers[q.id]) === String(optIdx));
                          return (
                            <MathOptionContent
                              key={optIdx}
                              optionText={option}
                              idx={optIdx}
                              isSelected={isSelected}
                              onClick={() => handleExamAnswer(q.id, optIdx)}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <textarea
                          rows={4}
                          className="w-full bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[24px] p-6 outline-none focus:border-blue-600 transition-all text-base leading-relaxed dark:text-white"
                          placeholder="Write your answer here..."
                          value={(examAnswers[q.id] as string) || ''}
                          onChange={(e) => handleExamAnswer(q.id, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Right: Sidebar Navigator */}
          <aside className="hidden lg:block w-72 sticky top-32 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800/50 p-6 shadow-sm">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Question Navigator</h4>
              <div className="grid grid-cols-4 gap-2">
                {questions.map((q: any, i: number) => {
                  const isAnswered = examAnswers[q.id] !== undefined && examAnswers[q.id] !== '';
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const el = document.getElementById(`question-${i}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`aspect-square rounded-xl text-xs font-black transition-all border-2
                        ${isAnswered 
                          ? 'border-green-600/20 bg-green-500/10 text-green-600' 
                          : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-400'}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-blue-600 rounded-[32px] p-6 text-white shadow-xl shadow-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <BrainIcon size={20} />
                <h4 className="text-xs font-black uppercase tracking-widest">Exam Stats</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase opacity-60">Completion</span>
                  <span className="text-sm font-black">{Math.round((answeredCount / questions.length) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-white font-bold"
                    initial={{ width: 0 }}
                    animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Final Submit Button at bottom */}
        <div className="flex flex-col items-center justify-center pt-8 pb-20 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4">
          <p className="text-zinc-500 text-sm font-medium">Have you reviewed all your answers?</p>
          <Button 
            onClick={handleExamSubmit} 
            size="lg" 
            className="rounded-2xl px-16 shadow-xl shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 h-14"
            disabled={isGeneratingExam}
          >
            {isGeneratingExam ? "Submitting Exam..." : "Finish & Submit Exam"}
          </Button>
        </div>
      </div>
    );
  };

  const renderHome = () => (
    <div className={`space-y-10 overflow-x-hidden w-full max-w-full relative transition-colors duration-1000 ${contentTypeFilter === 'premium' ? 'bg-indigo-950/5 dark:bg-indigo-950/20' : ''}`}>
      {/* Hero Section */}
      {!selectedCategory && (
        <ScrollSection 
          className="relative py-12 sm:py-24 overflow-hidden rounded-2xl sm:rounded-[40px] shadow-2xl w-full"
          style={{ background: 'linear-gradient(95deg, #5de0e6, #004aad)' }}
        >
          {/* Subtle Background Elements */}
          <div className="absolute top-[-20%] left-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-white/20 rounded-full blur-2xl sm:blur-3xl z-0 pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-white/10 rounded-full blur-2xl sm:blur-3xl z-0 pointer-events-none"></div>
          
          <div className="max-w-3xl mx-auto px-4 sm:px-8 relative z-20 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <Badge className="bg-white/20 text-white border border-white/20 mb-6 sm:mb-8 py-1.5 sm:py-2 px-4 sm:px-5 text-[10px] sm:text-[11px] backdrop-blur-md italic font-medium">
                ✨ Made for Bangladeshi Students
              </Badge>
              <h2 className="text-lg sm:text-4xl md:text-6xl font-extrabold text-white mb-4 sm:mb-8 leading-[1.1] tracking-tight break-words px-2">
                Study Materials<br />
                <span className="text-white opacity-95">For Every Students</span> 📚
              </h2>
              <p className="text-white/90 text-sm sm:text-lg mb-6 sm:mb-12 max-w-xl mx-auto leading-relaxed font-semibold">
                Access notes, textbook PDFs, board question papers, and live video classes — all in one place, completely free.
              </p>

              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 max-w-2xl mx-auto shadow-2xl"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10">
                  {[
                    { label: 'Resources', value: (contents.length + externalResources.length + playlists.length).toString() },
                    { label: 'Classes', value: dynamicClasses.length.toString() },
                    { label: 'Subjects', value: dynamicSubjects.length.toString() },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center py-2 sm:py-0 border-b last:border-b-0 sm:border-b-0 border-white/10">
                      <div className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">{stat.value}</div>
                      <div className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </ScrollSection>
      )}

      <div className="w-full max-w-full px-3 sm:px-6 space-y-6 sm:space-y-10 pb-20 overflow-x-hidden">
        {renderFilters()}

        {contentTypeFilter === 'premium' && user && hasPremiumAccess && (
          <ScrollSection className="w-full max-w-6xl mx-auto px-4 py-8">
            <div className="relative group cursor-pointer" onClick={handlePremiumExamClick}>
              {/* Premium Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-[40px] blur-xl opacity-25 group-hover:opacity-40 transition-all duration-700" />
              
              <Card className="relative overflow-hidden bg-zinc-900 border-none rounded-[40px] p-8 sm:p-14 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-palette/20 rounded-full blur-[100px] -mr-40 -mt-40 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] -ml-20 -mb-20" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="max-w-xl space-y-8 text-center md:text-left">
                    <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
                      <Sparkles size={18} className="text-amber-400" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/90">Elite Intelligence Service</span>
                    </div>
                    
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-[1.05]">
                      Elite Customize <br /> 
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Exam System</span>
                    </h2>
                    
                    <p className="text-zinc-400 text-lg font-medium leading-relaxed">
                      Architect your own practice sessions with our advanced AI-driven question matrix. Complete control over subjects, chapters, and difficulty.
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 pt-4">
                      <Button 
                        size="lg" 
                        onClick={handlePremiumExamClick}
                        className="rounded-2xl px-10 py-7 bg-white text-zinc-950 hover:bg-zinc-100 font-black text-lg shadow-xl shadow-white/10 group/btn"
                      >
                        Launch System
                        <Zap size={20} className="ml-2 group-hover:scale-125 transition-transform text-indigo-600" />
                      </Button>
                      <div className="flex flex-col items-center md:items-start">
                        <div className="flex -space-x-3 mb-2 items-center">
                          {premiumStudents && premiumStudents.length > 0 ? (
                            premiumStudents.slice(0, 4).map((student: any, idx: number) => {
                              const name = student.full_name || student.display_name || 'Pro Student';
                              const avatar = student.avatar_url || `https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(name)}`;
                              return (
                                <div key={student.id || idx} className="w-9 h-9 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[10px] font-bold overflow-hidden" title={name}>
                                  <img src={avatar} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                              );
                            })
                          ) : (
                            [1, 2, 3].map(i => (
                              <div key={i} className="w-9 h-9 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user fallback" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            ))
                          )}
                          <div className="w-12 h-9 rounded-full px-2 border-2 border-zinc-900 bg-indigo-600 flex items-center justify-center text-[11px] font-black tracking-tight shadow-md select-none">
                            {premiumStudents ? `${premiumStudents.length}` : '0'}
                          </div>
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">
                          {premiumStudents && premiumStudents.length > 0 ? `${premiumStudents.length} Active Pro Student${premiumStudents.length > 1 ? 's' : ''}` : 'Active Pro Students'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative hidden lg:block">
                    <motion.div 
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                      className="relative z-10 w-[340px] h-[340px] bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-[60px] border-4 border-white/5 shadow-2xl p-8 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner">
                          <BrainIcon size={24} />
                        </div>
                        <div className="h-4 w-3/4 bg-white/10 rounded-full" />
                        <div className="h-4 w-1/2 bg-white/5 rounded-full" />
                      </div>
                      
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div className="h-2 flex-1 bg-white/10 rounded-full" />
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between">
                         <div className="flex gap-2">
                           <div className="w-8 h-8 rounded-lg bg-zinc-700" />
                           <div className="w-8 h-8 rounded-lg bg-zinc-700" />
                         </div>
                         <div className="w-12 h-6 bg-indigo-500/20 rounded-full" />
                      </div>
                    </motion.div>
                    
                    {/* Fixed Decorative Orbs */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full blur-xl opacity-35 z-0" />
                    <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl z-0" />
                  </div>
                </div>
              </Card>
            </div>
          </ScrollSection>
        )}

        {/* Featured Exams Section */}
        <ScrollSection id="exams-section" className="space-y-6 sm:space-y-8 group/section relative w-full max-w-full">
          <div className="absolute top-4 right-20 sm:top-16 sm:right-12 pointer-events-none scale-100 origin-top-right z-30 opacity-100">
            <div className="pointer-events-auto">
              <MiniRobot />
            </div>
          </div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
                <ClipboardList size={24} />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Featured Mock Exams</h3>
            </div>
            <div className="flex items-center gap-4">
              {allExams.filter(e => contentTypeFilter === 'free' ? !e.isPremium : e.isPremium).length > 0 && (
                <div className="hidden sm:flex items-center gap-1 mr-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                    onClick={() => scrollContainer("scroll-exams", 'left')}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                    onClick={() => scrollContainer("scroll-exams", 'right')}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              )}
              <Button variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={() => setView('exam')}>View All <ChevronRight size={16} className="ml-1" /></Button>
            </div>
          </div>
          <div id="scroll-exams" className="flex overflow-x-auto pb-6 sm:pb-2 gap-4 sm:gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth min-w-full">
            {allExams.filter(e => contentTypeFilter === 'free' ? !e.isPremium : e.isPremium).length > 0 ? (
              allExams
                .filter(e => contentTypeFilter === 'free' ? !e.isPremium : e.isPremium)
                .slice(0, 10)
                .map((exam, aeIdx) => (
                <div key={`home-exam-${exam.id || aeIdx}`} className="min-w-[200px] sm:min-w-[300px] w-[200px] sm:w-[300px] snap-start">
                  <TiltContainer className="h-full">
                    <Card className={`p-5 sm:p-8 h-full flex flex-col space-y-3 sm:space-y-4 hover:shadow-xl transition-all group ${exam.isPremium && !hasPremiumAccess ? 'border-amber-500/30' : ''}`}>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] sm:text-xs">{exam.subject}</Badge>
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[9px] sm:text-xs">{exam.class}</Badge>
                        <span className="text-[9px] sm:text-xs font-bold text-zinc-400 group-hover:text-indigo-400 transition-colors uppercase tracking-widest">{exam.time_limit} Min</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">{exam.title}</h4>
                      <p className="text-xs sm:text-sm text-zinc-500 line-clamp-2">{exam.description}</p>
                      <div className="flex justify-end pt-2 mt-auto">
                        {exam.isPremium && !hasPremiumAccess ? (
                          <Button size="sm" onClick={() => setShowPremiumPromptModal(true)} className="rounded-xl px-4 sm:px-6 bg-amber-600 shadow-lg shadow-amber-500/20 text-xs" icon={Lock}>Upgrade</Button>
                        ) : (
                          <Button size="sm" onClick={() => setExamPrep(exam)} className="rounded-xl px-4 sm:px-6 bg-indigo-600 shadow-lg shadow-indigo-500/20 text-xs">Take Test</Button>
                        )}
                      </div>
                    </Card>
                  </TiltContainer>
                </div>
              ))
            ) : (
              <div className="w-full flex items-center justify-center py-6">
                <div className="bg-zinc-100/40 dark:bg-zinc-800/10 border border-zinc-200/50 dark:border-zinc-800/30 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center space-y-3 w-full max-w-md shadow-sm">
                  <div className="p-3 bg-indigo-50 text-indigo-500/10 dark:text-indigo-400/10 rounded-full text-indigo-500 shrink-0">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">No Mock Exams available yet</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">Our subject-matter experts are preparing mock tests. They will be added soon.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollSection>
        {renderSection('Notes', 'Notes', <FileText className="text-blue-600" size={24} />, 'Add Note', 'notes-section')}
        {renderSection('Practice Sheets', 'Practice Sheet', <FileText className="text-orange-600" size={24} />, 'Add Practice Sheet', 'practice-section')}
        {renderSection('Books PDF', 'Books', <BookOpen className="text-green-600" size={24} />, 'Add Book', 'books-section')}
        {renderSection('Recent Question Papers', 'Question Papers', <History className="text-purple-600" size={24} />, 'Add Paper', 'papers-section')}
        {renderPlaylistsSection()}
        {renderSection('YouTube Classes', 'YouTube Classes', <Youtube className="text-red-600" size={24} />, 'Add Video', 'video-section')}
        {renderExternalResources()}
      </div>
    </div>
  );

  const renderContentList = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={resetToHome}>
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
              {view === 'saved' ? 'Saved Resources' : searchQuery ? `Search Results for "${searchQuery}"` : selectedCategory}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {filteredContents.length} items found
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredContents.length > 0 ? (
            filteredContents.map((content, fcIdx) => {
              const card = renderContentCard(content);
              // Properly clone with index-based key to prevent collisions during filtering
              return React.cloneElement(card as React.ReactElement, {
                key: content.id + '-' + fcIdx
              });
            })
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                <Search size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">No {contentTypeFilter} content found</h3>
                <p className="text-zinc-500 max-w-xs mx-auto">Try adjusting your filters or switching back to the regular material section.</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const handleNewsletter = async (e: FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    
    try {
      const { error } = await supabase.from('newsletter_subscribers').insert([{
        email: newsletterEmail.trim().toLowerCase(),
        created_at: new Date().toISOString()
      }]);
      if (error) throw error;
      setIsSubscribed(true);
      setNewsletterEmail('');
      queryClient.invalidateQueries({ queryKey: ['newsletter_subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['public_subscriber_count'] });
      setTimeout(() => setIsSubscribed(false), 5000);
    } catch (error: any) {
      if (error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('already exists')) {
        setIsSubscribed(true); // Treat duplicate as subscribed to avoid annoying errors
        setNewsletterEmail('');
        queryClient.invalidateQueries({ queryKey: ['newsletter_subscribers'] });
        queryClient.invalidateQueries({ queryKey: ['public_subscriber_count'] });
        setTimeout(() => setIsSubscribed(false), 5000);
      } else {
        setGlobalError("Failed to subscribe: " + error.message);
      }
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsSendingFeedback(true);
    try {
      await supabaseService.submitFeedback({
        user_id: user?.id || null,
        user_email: user?.email || 'guest@educationalportal.org',
        user_name: user?.user_metadata?.full_name || firestoreUser?.displayName || 'Guest Student',
        message: feedbackText.trim(),
      });
      setIsFeedbackOpen(false);
      setFeedbackText('');
      setGlobalError('🏆 Thank you so much for your feedback!');
      setTimeout(() => setGlobalError(null), 5000);
    } catch (error: any) {
      console.error("Feedback submit error:", error);
      setGlobalError(error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const renderPrivacyPolicy = () => (
    <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => setView('home')}
          className="p-2 bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-500/20 transition-all active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Educational Portal</span>
      </div>
      <h1 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white mb-8 tracking-tighter leading-tight">
        Privacy <span className="text-blue-600">Policy</span>
      </h1>
      
      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-xl hover:border-blue-500/20 group">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-2xl font-bold mb-4">Your Privacy Matters</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            At Parodorshhi, we are committed to protecting your privacy. This policy outlines how we collect, use, and safeguard your educational journey data. We believe in transparency and empowering students with high-quality resources while respecting their digital rights.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-black mb-4 uppercase tracking-widest text-blue-600">Information We Collect</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                Basic profile info from Google (Name, Email, Profile Picture)
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                Your educational progress, saved notes, and bookmarked videos
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                Exam attempts and performance metrics for our leaderboards
              </li>
            </ul>
          </div>

          <div className="p-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-black mb-4 uppercase tracking-widest text-blue-600">How We Use It</h3>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                To personalize your dashboard with relevant study materials
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                To provide a competitive and fair ranking system
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                To analyze which resources are most helpful for students
              </li>
            </ul>
          </div>
        </div>

        <section className="bg-blue-600 p-8 md:p-12 rounded-[40px] text-white shadow-2xl shadow-blue-500/30 overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-125 transition-transform duration-1000" />
          <h2 className="text-3xl font-black mb-6 tracking-tight relative z-10">Data Protection</h2>
          <p className="text-blue-50 leading-relaxed text-lg mb-8 relative z-10">
            Your data is stored securely using enterprise-grade Firebase encryption. We never sell your personal information to third-party advertisers. Parodorshhi is an educational platform by the community, for the community.
          </p>
          <button 
            onClick={() => setView('home')}
            className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:translate-y-[-4px] transition-all relative z-10 shadow-xl"
          >
            I Understand, let's Study
          </button>
        </section>
      </div>
      
      <div className="mt-20 pt-10 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Last Updated: May 2nd, 2024</p>
      </div>
    </div>
  );
  const renderTermsOfService = () => (
    <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => setView('home')}
          className="p-2 bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-500/20 transition-all active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Legal Documents</span>
      </div>
      <h1 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white mb-8 tracking-tighter leading-tight">
        Terms of <span className="text-blue-600">Service</span>
      </h1>
      
      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-xl">
          <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            By accessing Parodorshhi, you agree to bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
          </p>
        </section>
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-xl">
          <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Permission is granted to temporarily download one copy of the materials (information or software) on Parodorshhi's website for personal, non-commercial transitory viewing only.
          </p>
        </section>
      </div>
      
      <div className="mt-20 pt-10 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <button onClick={() => setView('home')} className="text-blue-600 font-bold uppercase tracking-widest text-xs hover:underline">Back to Home</button>
      </div>
    </div>
  );

  const renderCookiePolicy = () => (
    <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => setView('home')}
          className="p-2 bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-500/20 transition-all active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Policy</span>
      </div>
      <h1 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white mb-8 tracking-tighter leading-tight">
        Cookie <span className="text-blue-600">Policy</span>
      </h1>
      
      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-xl">
          <h2 className="text-2xl font-bold mb-4">What are Cookies?</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Cookies are small pieces of text sent by your web browser by a website you visit. A cookie file is stored in your web browser and allows the Service or a third-party to recognize you and make your next visit easier and the Service more useful to you.
          </p>
        </section>
      </div>
      
      <div className="mt-20 pt-10 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <button onClick={() => setView('home')} className="text-blue-600 font-bold uppercase tracking-widest text-xs hover:underline">Back to Home</button>
      </div>
    </div>
  );

  const renderFooter = () => (
    <footer className="bg-zinc-900 text-zinc-400 pt-16 pb-32 sm:pb-16 mt-20 border-t border-white/5 w-full overflow-hidden relative z-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-black p-3 rounded-2xl border border-white/10 shadow-lg group">
                <Logo className="h-20 w-auto" />
              </div>
            </div>
            <p className="text-sm leading-relaxed">
              Empowering students across Bangladesh with free, high-quality educational resources. Notes, books, and video classes all in one place.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-blue-400 transition-colors"><Facebook size={20} /></a>
              <a href="#" className="hover:text-blue-400 transition-colors"><Twitter size={20} /></a>
              <a href="#" className="hover:text-blue-400 transition-colors"><Instagram size={20} /></a>
              <a href="#" className="hover:text-blue-400 transition-colors"><Github size={20} /></a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Quick Links</h4>
            <ul className="space-y-4 text-sm">
              <li><button onClick={() => { resetToHome(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors text-left cursor-pointer">Home</button></li>
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    if (view !== 'home') {
                      setView('home');
                      setTimeout(() => {
                        document.getElementById('notes-section')?.scrollIntoView({ behavior: 'smooth' });
                        triggerHighlight('notes-section');
                      }, 100);
                    } else {
                      document.getElementById('notes-section')?.scrollIntoView({ behavior: 'smooth' });
                      triggerHighlight('notes-section');
                    }
                  }} 
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Study Notes
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    if (view !== 'home') {
                      setView('home');
                      setTimeout(() => {
                        document.getElementById('practice-section')?.scrollIntoView({ behavior: 'smooth' });
                        triggerHighlight('practice-section');
                      }, 100);
                    } else {
                      document.getElementById('practice-section')?.scrollIntoView({ behavior: 'smooth' });
                      triggerHighlight('practice-section');
                    }
                  }} 
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Practice Sheets
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    if (view !== 'home') {
                      setView('home');
                      setTimeout(() => {
                        document.getElementById('books-section')?.scrollIntoView({ behavior: 'smooth' });
                        triggerHighlight('books-section');
                      }, 100);
                    } else {
                      document.getElementById('books-section')?.scrollIntoView({ behavior: 'smooth' });
                      triggerHighlight('books-section');
                    }
                  }} 
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Textbook PDFs
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    if (view !== 'home') {
                      setView('home');
                      setTimeout(() => {
                        document.getElementById('papers-section')?.scrollIntoView({ behavior: 'smooth' });
                        triggerHighlight('papers-section');
                      }, 100);
                    } else {
                      document.getElementById('papers-section')?.scrollIntoView({ behavior: 'smooth' });
                      triggerHighlight('papers-section');
                    }
                  }} 
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Board Papers
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    if (view !== 'home') {
                      setView('home');
                      setTimeout(() => {
                        document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' });
                        triggerHighlight('video-section');
                      }, 100);
                    } else {
                      document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' });
                      triggerHighlight('video-section');
                    }
                  }} 
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Video Classes
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    setView('exam');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Mock Exam Center
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Contact Us</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-blue-400" />
                <a href="mailto:mdsohanali636@gmail.com" className="hover:text-white transition-colors">mdsohanali636@gmail.com</a>
              </li>
              <li className="flex items-center gap-3">
                <MessageSquare size={18} className="text-purple-400" />
                <button onClick={() => setIsFeedbackOpen(true)} className="hover:text-white transition-colors text-left cursor-pointer">Send Feedback</button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Newsletter</h4>
            <p className="text-xs mb-4">Get the latest updates on new resources.</p>
            <form onSubmit={handleNewsletter} className="flex gap-2">
              <input 
                type="email" 
                required
                placeholder="Email address" 
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500 flex-1"
              />
              <Button type="submit" variant="primary" size="sm" className="bg-white text-zinc-900 font-bold">
                {isSubscribed ? 'Joined!' : 'Join'}
              </Button>
            </form>
            {qPublicSubscriberCount !== undefined && qPublicSubscriberCount !== null && (
              <p className="text-[10px] text-zinc-400 mt-2 font-medium">
                Join <span className="text-blue-400 font-bold font-mono">{qPublicSubscriberCount}</span> active subscribers
              </p>
            )}
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em]">
          <p>© 2026 Parodorshhi. All rights reserved.</p>
          <div className="flex gap-8 relative z-50">
            <button key="privacy" onClick={() => { setView('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer relative z-10">Privacy Policy</button>
            <button key="terms" onClick={() => { setView('terms'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer relative z-10">Terms of Service</button>
            <button key="cookies" onClick={() => { setView('cookies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer relative z-10">Cookie Policy</button>
          </div>
        </div>
      </div>
    </footer>
  );

  const filteredContents = useMemo(() => {
    return contents.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      const matchesClass = classFilter === 'All' ? true : item.academicClass === classFilter;
      const matchesSubject = subjectFilter === 'All' ? true : item.subject === subjectFilter;
      const matchesGroup = groupFilter === 'All' ? true : (item.academicGroup === groupFilter || (item as any).academic_group === groupFilter || item.academicGroup === 'All' || (item as any).academic_group === 'All');
      const matchesChapter = chapterFilter === 'All' ? true : (!item.chapter || item.chapter === 'All Chapters' || item.chapter === chapterFilter);
      const matchesTopic = topicFilter === 'All' ? true : (item.topicId === topicFilter || (item as any).topic_id === topicFilter);
      const matchesYear = yearFilter === 'All Years' ? true : item.year === yearFilter;
      const matchesType = contentTypeFilter === 'free' ? !item.isPremium : item.isPremium;
      
      // Also show pending items to their authors or admins
      const isVisibleStatus = item.status === 'approved' || item.authorId === user?.id || userRole === 'admin';
      
      if (view === 'saved') return bookmarks.includes(item.id) && matchesSearch && isVisibleStatus;
      return matchesSearch && matchesClass && matchesGroup && matchesSubject && matchesChapter && matchesTopic && matchesCategory && matchesYear && matchesType && isVisibleStatus;
    });
  }, [contents, searchQuery, selectedCategory, classFilter, groupFilter, subjectFilter, chapterFilter, topicFilter, yearFilter, view, bookmarks, contentTypeFilter, userRole, user]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return contents
      .filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 8);
  }, [contents, searchQuery]);

  const toggleBookmark = async (id: string) => {
    if (!user) {
      setGlobalError("Please login to save resources!");
      handleLogin();
      return;
    }
    
    // Optimistic update
    const isBookmarked = bookmarks.includes(id);
    const originalBookmarks = [...bookmarks];
    
    if (isBookmarked) {
      setBookmarks(prev => prev.filter(bId => bId !== id));
      setGlobalError("Removed from saved items.");
    } else {
      setBookmarks(prev => [...prev, id]);
      setGlobalError("Saved to your collection!");
      setTimeout(() => setGlobalError(null), 3000);
    }

    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', id);
        
        if (error) {
          setBookmarks(originalBookmarks);
          if (error.message.includes('column') || error.message.includes('does not exist')) {
            setGlobalError("Save feature requires a database update. Please contact admin.");
          } else {
            setGlobalError("Failed to remove bookmark: " + error.message);
          }
        }
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert([{ user_id: user.id, content_id: id }]);

        if (error) {
          setBookmarks(originalBookmarks);
          if (error.message.includes('column') || error.message.includes('does not exist')) {
            setGlobalError("Save feature requires a database update. Please contact admin.");
          } else {
            setGlobalError("Failed to save: " + error.message);
          }
        }
      }
    } catch (error: any) {
      setBookmarks(originalBookmarks);
      console.error("Bookmark toggle error:", error);
      setGlobalError("An unexpected error occurred while saving.");
    }
  };

  const ensureFullUrl = (url: string) => {
    if (!url) return '';
    
    // If it's a Supabase storage URL (either a full URL or just a path)
    const isSupabase = url.includes('.supabase.co/storage/v1/object/public/') || !url.startsWith('http');
    
    if (isSupabase) {
      let filePath = url;
      
      // If it's a full URL, extract the part after 'public/'
      if (url.startsWith('http')) {
        const parts = url.split('/storage/v1/object/public/');
        if (parts.length > 1) {
          const bucketAndPath = parts[1];
          const firstSlash = bucketAndPath.indexOf('/');
          if (firstSlash !== -1) {
            // This is the actual path inside the bucket
            filePath = bucketAndPath.substring(firstSlash + 1);
          }
        }
      }
      
      // Clean path: remove any leading 'resources/' or '/resources/' strings that might cause doubling
      let cleanPath = filePath.replace(/^\/?resources\//, '');
      
      // Generate the fresh public URL using the Supabase client
      // This ensures we use the correct project reference and bucket name
      try {
        const { data: { publicUrl } } = supabase.storage
          .from('resources')
          .getPublicUrl(cleanPath);
        return publicUrl;
      } catch (err) {
        return url;
      }
    }
    
    return url;
  };

  const handleEditContent = (item: ContentItem) => {
    setNewItem({
      category: item.category,
      academicClass: item.academicClass,
      subject: item.subject,
      title: item.title,
      description: item.description,
      url: item.url,
      thumbnail: item.thumbnail,
      year: item.year,
      chapterId: item.chapterId || (item as any).chapter_id,
      topicId: item.topicId || (item as any).topic_id,
      isPremium: item.isPremium || false,
    });
    setEditingId(item.id);
    setIsEditing(true);
    setIsAdding(true);
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    console.log(`[STORAGE] Using Supabase for ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    
    if (!user) throw new Error("Authentication required for upload.");

    // Sanitization: Supabase Storage keys work best with ASCII. Replace all non-alphanumeric characters with underscores.
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    const filePath = (folder && folder !== 'resources') ? `${folder}/${Date.now()}_${safeName}.${extension}` : `${Date.now()}_${safeName}.${extension}`;
    
    setUploadProgress(5);
    
    const contentType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined);
    
    try {
      const { data, error } = await supabase.storage
        .from('resources')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType
        });

      if (error) {
        console.error(`[STORAGE] Supabase Error Details:`, error);
        if (error.message.includes('Bucket not found') || (error as any).status === 404 || (error as any).statusCode === 404) {
          const msg = "Storage bucket 'resources' not found. This is a critical configuration error.";
          console.error(`[STORAGE] ${msg} Please run the SQL in STORAGE_SETUP.sql or create a public bucket named 'resources' in your Supabase dashboard.`);
          throw new Error(`${msg} Please run the STORAGE_SETUP.sql in your Supabase SQL editor.`);
        }
        throw error;
      }
      
      setUploadProgress(95);
      
      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

      setUploadProgress(100);
      return publicUrl;
    } catch (error: any) {
      console.error(`[STORAGE] Upload failed:`, error.message);
      throw new Error(error.message || "Failed to upload file to Supabase Storage.");
    }
  };

  const handleAddContent = async () => {
    setUploadError(null);
    setUploadProgress(0);
    if (!newItem.title) {
      setUploadError("Please enter a title.");
      return;
    }
    if (!newItem.url && !selectedFiles.resource) {
      setUploadError("Please select a file or enter a YouTube URL.");
      return;
    }
    if (!newItem.subject) {
      setUploadError("Please select a subject.");
      return;
    }
    
    if (!user) {
      handleLogin();
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      let finalUrl = newItem.url || '';
      let finalThumbnail = getDirectImageUrl(newItem.thumbnail || '');

      // Upload Resource File if exists
      if (selectedFiles.resource) {
        // Upload directly to root of resources bucket as requested by user
        finalUrl = await uploadFile(selectedFiles.resource, '');
      } else if (newItem.category === 'YouTube Classes' && finalUrl) {
        finalUrl = getYouTubeId(finalUrl);
      }

      // Upload Thumbnail if exists
      if (selectedFiles.thumbnail) {
        // Upload thumbnails to root of resources bucket as well for flat structure
        finalThumbnail = await uploadFile(selectedFiles.thumbnail, '');
      }

      const itemData: any = {
        category: newItem.category,
        academic_class: newItem.academicClass,
        academic_group: newItem.academicGroup || 'All',
        subject: newItem.subject,
        title: newItem.title,
        description: newItem.description || '',
        url: finalUrl,
        thumbnail: finalThumbnail,
        chapter: (newItem.chapter === 'All Chapters' || !newItem.chapter) ? null : newItem.chapter,
        chapter_id: newItem.chapterId || (newItem as any).chapter_id,
        topic_id: newItem.topicId || (newItem as any).topic_id,
        tags: typeof newItem.tags === 'string' ? (newItem.tags as string).split(',').map(t => t.trim()).filter(Boolean) : (newItem.tags || []),
        is_premium: newItem.isPremium || false,
        author_id: user.id
      };

      if (isEditing && editingId) {
        await supabaseService.updateContent(editingId, itemData);
      } else {
        // If the user is the hardcoded admin or has permission, auto-approve
        const isAdmin = userRole === 'admin' || user.email === 'mdsohanali636@gmail.com';
        itemData.status = (canUpload || isAdmin) ? 'approved' : 'pending';
        await supabaseService.createContent(itemData);
      }

      setIsAdding(false);
      setIsEditing(false);
      setEditingId(null);
      setNewItem({ 
        category: 'Notes', 
        academicClass: dynamicClasses?.[0]?.name || 'SSC', 
        subject: '', 
        title: '', 
        description: '', 
        url: '', 
        thumbnail: '', 
        chapterId: '',
        topicId: '',
        isPremium: false,
        tags: [] 
      });
      setSelectedFiles({});
      setUploadProgress(0);
      setGlobalError(null); 
    } catch (error: any) {
      console.error("Content upload error:", error);
      setUploadError(error.message || "Failed to save content.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPlaylist = async () => {
    if (!user) {
      handleLogin();
      return;
    }

    // Title is required, unless it is a YouTube playlist and we will auto-fetch it using Gemini
    if (!newPlaylist.title && newPlaylist.type !== 'youtube') {
      setUploadError("Please enter a title.");
      return;
    }

    if (newPlaylist.type === 'youtube' && !newPlaylist.youtubePlaylistId) {
      setUploadError("Please enter a YouTube Playlist URL or ID.");
      return;
    }

    if (newPlaylist.type === 'custom' && (!newPlaylist.videoIds || newPlaylist.videoIds.length === 0)) {
      setUploadError("Please select at least one video for your custom playlist.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      let finalThumbnail = getDirectImageUrl(newPlaylist.thumbnail || '');
      let youtubePlaylistId = '';

      // Upload Thumbnail if exists
      if (selectedFiles.thumbnail) {
        setIsUploading(true);
        setUploadProgress(0);
        finalThumbnail = await uploadFile(selectedFiles.thumbnail, '');
      }

      if (newPlaylist.type === 'youtube' && newPlaylist.youtubePlaylistId) {
        youtubePlaylistId = getYouTubePlaylistId(newPlaylist.youtubePlaylistId);
        
        // Fetch Playlist Metadata (Title & Thumbnail) if not provided
        if (!newPlaylist.title || !finalThumbnail || !newPlaylist.description) {
          try {
            const apiKey = process.env.GEMINI_API_KEY || "";
            if (!apiKey) {
              throw new Error("Gemini API key is not configured inside environment.");
            }
            const genAI = ai || new GoogleGenAI({ apiKey });
            const metaResponse = await genAI.models.generateContent({
              model: "gemini-3.5-flash",
              contents: `Find the official title, description, and high-quality thumbnail URL for the YouTube playlist with ID: ${youtubePlaylistId}. 
              Search the web for the official playlist page: https://www.youtube.com/playlist?list=${youtubePlaylistId}
              Ensure to retrieve the actual list/page info.
              Return a JSON object containing the 'title', 'description', and 'thumbnail' properties of the playlist. Do not include any block markdown formatting, just plain JSON.`,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    thumbnail: { type: Type.STRING }
                  },
                  required: ["title", "description", "thumbnail"]
                },
                tools: [{ googleSearch: {} }]
              }
            });
            const metaResponseText = metaResponse.text || "";
            const meta = JSON.parse(metaResponseText || "{}");
            if (!newPlaylist.title) newPlaylist.title = meta.title || "";
            if (!newPlaylist.description) newPlaylist.description = meta.description || "";
            if (!finalThumbnail) finalThumbnail = meta.thumbnail || "";
          } catch (e: any) {
            console.error("Error fetching playlist meta from Gemini:", e);
            // Default thumbnail fallback in case search or image extraction failed
            if (!finalThumbnail) {
              finalThumbnail = `https://img.youtube.com/vi/playlist/mqdefault.jpg`;
            }
            // If the user did not enter a title manually and AI fetching failed, we need them to type it manually.
            if (!newPlaylist.title) {
              setUploadError("Could not fetch playlist metadata automatically (Gemini error or unconfigured API key). Please enter a Title and optional Thumbnail manually above.");
              setIsUploading(false);
              return;
            }
          }
        }
      }

      const playlistData: any = {
        title: newPlaylist.title,
        description: newPlaylist.description || '',
        type: newPlaylist.type,
        youtube_playlist_id: youtubePlaylistId,
        video_ids: newPlaylist.videoIds || [],
        academic_class: newPlaylist.academicClass,
        academic_group: newPlaylist.academicGroup || 'All',
        subject: newPlaylist.subject,
        chapter: (newPlaylist.chapter === 'All Chapters' || !newPlaylist.chapter) ? null : newPlaylist.chapter,
        thumbnail: finalThumbnail,
        author_id: user.id,
        is_premium: newPlaylist.isPremium || false,
        status: (canUpload || userRole === 'admin') ? 'approved' : 'pending',
        created_at: new Date().toISOString(),
      };

      if (editingPlaylistId) {
        const { error } = await supabase.from('playlists').update(playlistData).eq('id', editingPlaylistId);
        if (error) {
          console.error("Supabase playlist update failed:", error);
          throw new Error(error.message || "Failed to update playlist in Supabase database.");
        }
      } else {
        const { error } = await supabase.from('playlists').insert([playlistData]);
        if (error) {
          console.error("Supabase playlist insert failed:", error);
          throw new Error(error.message || "Failed to save playlist to Supabase database.");
        }
      }

      // Proactively refresh playlist data instantly
      fetchPlaylists();
      if (userRole === 'admin') {
        fetchAllPlaylists();
      }

      setIsAddingPlaylist(false);
      setEditingPlaylistId(null);
      setNewPlaylist({
        title: '',
        description: '',
        type: 'youtube',
        youtubePlaylistId: '',
        videoIds: [],
        academicClass: dynamicClasses?.[0]?.name || 'SSC',
        subject: '',
        thumbnail: '',
        isPremium: false
      });
    } catch (error: any) {
      setUploadError(error.message || "Failed to save playlist.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveContent = async (id: string, category: Category) => {
    if (userRole !== 'admin') return;
    try {
      await supabaseService.updateContent(id, { category, status: 'approved' });
      // Refresh admin view
      setAllContents(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectContent = async (id: string, category: Category) => {
    if (userRole !== 'admin') return;
    try {
      await supabaseService.updateContent(id, { category, status: 'rejected' });
      // Refresh admin view
      setAllContents(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
    } catch (error) {
      console.error(error);
    }
  };

  const handleApprovePlaylist = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await supabase.from('playlists').update({ status: 'approved' }).eq('id', id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectPlaylist = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await supabase.from('playlists').update({ status: 'rejected' }).eq('id', id);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    const playlist = allPlaylists.find(p => p.id === id) || userPlaylists.find(p => p.id === id);
    if (!playlist) return;
    
    // Check if admin, has upload permission, or owner
    if (!canUpload && userRole !== 'admin' && playlist.authorId !== user?.id) return;
    
    setDeletingId(id);
  };

  const confirmDeletePlaylist = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setUploadError(null);
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', deletingId);
      if (error) throw error;
      
      // Manually update states for instant UI feedback
      setPlaylists(prev => prev.filter(p => p.id !== deletingId));
      setAllPlaylists(prev => prev.filter(p => p.id !== deletingId));
      setUserPlaylists(prev => prev.filter(p => p.id !== deletingId));
      
      setDeletingId(null);
    } catch (error: any) {
      setUploadError("Failed to delete playlist. " + (error.message || "Please try again."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteQuestion = async (id: string, bankId?: string) => {
    if (userRole !== 'admin') return;
    setDeletingId(id);
    setDeleteBankId(bankId || 'global');
    setUploadError(null);
  };

  const confirmDeleteQuestion = async () => {
    if (!deletingId || !deleteBankId) return;
    setIsDeleting(true);
    try {
      if (deleteBankId === 'temp') {
        setTemporaryQuestions(prev => prev.filter(q => q.id !== deletingId));
      } else {
        await supabase.from('questions').delete().eq('id', deletingId);
      }
      setDeletingId(null);
      setDeleteBankId(null);
    } catch (error: any) {
      setGlobalError("Failed to delete question: " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleUpload = async (userId: string, currentStatus: boolean) => {
    if (userRole !== 'admin') return;
    try {
      await supabase.from('profiles').update({ can_upload: !currentStatus }).eq('id', userId);
      const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', userId);
      if (!error && data && data.length > 0) {
        await supabase.from('user_roles').update({ can_upload: !currentStatus }).eq('user_id', userId);
      } else {
        const { data: dataById, error: errorById } = await supabase.from('user_roles').select('*').eq('id', userId);
        if (!errorById && dataById && dataById.length > 0) {
          await supabase.from('user_roles').update({ can_upload: !currentStatus }).eq('id', userId);
        } else {
          await supabase.from('user_roles').insert([{ user_id: userId, can_upload: !currentStatus }]);
        }
      }
      fetchUsersInfo();
    } catch (error) {
      console.error(error);
    }
  };

  const handleTogglePremiumAccess = async (userId: string, currentStatus: boolean) => {
    if (userRole !== 'admin') return;
    try {
      await supabase.from('profiles').update({ 
        has_premium_access: !currentStatus,
        premium_expiry: !currentStatus ? new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString() : null
      }).eq('id', userId);

      const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', userId);
      if (!error && data && data.length > 0) {
        await supabase.from('user_roles').update({ is_premium: !currentStatus }).eq('user_id', userId);
      } else {
        const { data: dataById, error: errorById } = await supabase.from('user_roles').select('*').eq('id', userId);
        if (!errorById && dataById && dataById.length > 0) {
          await supabase.from('user_roles').update({ is_premium: !currentStatus }).eq('id', userId);
        } else {
          await supabase.from('user_roles').insert([{ user_id: userId, is_premium: !currentStatus }]);
        }
      }
      fetchUsersInfo();
    } catch (error) {
      console.error(error);
    }
  };

  const handleSetCustomExpiry = async (userId: string, expiryIso: string | null) => {
    if (userRole !== 'admin') return;
    try {
      const isPast = expiryIso ? new Date(expiryIso).getTime() < Date.now() : false;
      const isPremiumValue = expiryIso ? !isPast : true;

      await supabase.from('profiles').update({ 
        has_premium_access: isPremiumValue,
        premium_expiry: expiryIso
      }).eq('id', userId);

      const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', userId);
      if (!error && data && data.length > 0) {
        await supabase.from('user_roles').update({ is_premium: isPremiumValue }).eq('user_id', userId);
      } else {
        const { data: dataById, error: errorById } = await supabase.from('user_roles').select('*').eq('id', userId);
        if (!errorById && dataById && dataById.length > 0) {
          await supabase.from('user_roles').update({ is_premium: isPremiumValue }).eq('id', userId);
        } else {
          await supabase.from('user_roles').insert([{ user_id: userId, is_premium: isPremiumValue }]);
        }
      }
      fetchUsersInfo();
    } catch (error) {
      console.error("Error setting custom subscription expiry:", error);
    }
  };

  const handleToggleManageExams = async (userId: string, currentStatus: boolean) => {
    if (userRole !== 'admin') return;
    try {
      const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', userId);
      if (!error && data && data.length > 0) {
        await supabase.from('user_roles').update({ can_manage_exams: !currentStatus }).eq('user_id', userId);
      } else {
        const { data: dataById, error: errorById } = await supabase.from('user_roles').select('*').eq('id', userId);
        if (!errorById && dataById && dataById.length > 0) {
          await supabase.from('user_roles').update({ can_manage_exams: !currentStatus }).eq('id', userId);
        } else {
          await supabase.from('user_roles').insert([{ user_id: userId, can_manage_exams: !currentStatus }]);
        }
      }
      fetchUsersInfo();
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleManageQuestions = async (userId: string, currentStatus: boolean) => {
    if (userRole !== 'admin') return;
    try {
      const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', userId);
      if (!error && data && data.length > 0) {
        await supabase.from('user_roles').update({ can_manage_questions: !currentStatus }).eq('user_id', userId);
      } else {
        const { data: dataById, error: errorById } = await supabase.from('user_roles').select('*').eq('id', userId);
        if (!errorById && dataById && dataById.length > 0) {
          await supabase.from('user_roles').update({ can_manage_questions: !currentStatus }).eq('id', userId);
        } else {
          await supabase.from('user_roles').insert([{ user_id: userId, can_manage_questions: !currentStatus }]);
        }
      }
      fetchUsersInfo();
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleManageResources = async (userId: string, currentStatus: boolean) => {
    if (userRole !== 'admin') return;
    try {
      const { data, error } = await supabase.from('user_roles').select('*').eq('user_id', userId);
      if (!error && data && data.length > 0) {
        await supabase.from('user_roles').update({ can_manage_resources: !currentStatus }).eq('user_id', userId);
      } else {
        const { data: dataById, error: errorById } = await supabase.from('user_roles').select('*').eq('id', userId);
        if (!errorById && dataById && dataById.length > 0) {
          await supabase.from('user_roles').update({ can_manage_resources: !currentStatus }).eq('id', userId);
        } else {
          await supabase.from('user_roles').insert([{ user_id: userId, can_manage_resources: !currentStatus }]);
        }
      }
      fetchUsersInfo();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteContent = async (id: string) => {
    const content = allContents.find(c => c.id === id) || userContents.find(c => c.id === id) || contents.find(c => c.id === id);
    if (!content) return;
    
    // Check if admin, has upload permission, or owner
    if (!canUpload && userRole !== 'admin' && content.authorId !== user?.id) return;
    
    setDeletingId(id);
    setDeletingCategory(content.category);
    setUploadError(null);
  };

  const confirmDeleteContent = async (id: string) => {
    console.log("Attempting to delete post with ID:", id, "Category:", deletingCategory);
    if (!deletingCategory) {
      setUploadError("Category unknown. Cannot delete.");
      return;
    }
    setIsDeleting(true);
    setUploadError(null);
    try {
      await supabaseService.deleteContent(id, deletingCategory);
      
      // Manually update states for instant UI feedback
      setContents(prev => prev.filter(c => c.id !== id));
      setAllContents(prev => prev.filter(c => c.id !== id));
      setUserContents(prev => prev.filter(c => c.id !== id));
      
      setDeletingId(null);
      setDeletingCategory(null);
    } catch (error: any) {
      setUploadError("Failed to delete post. " + (error.message || "Please try again."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNextVideo = () => {
    if (!activePlaylist) return;
    const videos = activePlaylist.type === 'youtube' 
      ? fetchedPlaylistVideos 
      : contents.filter(c => activePlaylist.videoIds?.includes(c.id));
    const currentIndex = videos.findIndex(v => getYouTubeId(v.url) === activeVideo);
    if (currentIndex < videos.length - 1) {
      setActiveVideo(getYouTubeId(videos[currentIndex + 1].url));
    }
  };

  const handlePrevVideo = () => {
    if (!activePlaylist) return;
    const videos = activePlaylist.type === 'youtube' 
      ? fetchedPlaylistVideos 
      : contents.filter(c => activePlaylist.videoIds?.includes(c.id));
    const currentIndex = videos.findIndex(v => getYouTubeId(v.url) === activeVideo);
    if (currentIndex > 0) {
      setActiveVideo(getYouTubeId(videos[currentIndex - 1].url));
    }
  };

  // Reset video loading state when active video changes
  useEffect(() => {
    if (activeVideo) {
      setIsVideoLoading(true);
    } else {
      setIsVideoLoading(false);
    }
  }, [activeVideo]);

  // Autoplay next video in playlist when current YouTube video ends
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes("youtube.com")) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && data.event === "onStateChange" && data.info === 0) {
          console.log("YouTube Player API detected video end. Playing next video in playlist!");
          handleNextVideo();
        }
      } catch (e) {
        // Safe to ignore non-JSON post messages
      }
    };
    
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activePlaylist, activeVideo, fetchedPlaylistVideos, contents]);

  // Smooth scroll active video element in the playlist sidebar into view
  useEffect(() => {
    if (activeVideo) {
      setTimeout(() => {
        const activeElement = document.getElementById(`yt-sidebar-item-${activeVideo}`);
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 300);
    }
  }, [activeVideo]);

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    
    // Check if it's a Supabase storage URL
    const isSupabase = url.includes('.supabase.co/storage/v1/object/public/') || !url.startsWith('http');

    if (isSupabase) {
      let filePath = url;
      if (url.startsWith('http')) {
        const parts = url.split('/storage/v1/object/public/');
        if (parts.length > 1) {
          const bucketAndPath = parts[1];
          const firstSlash = bucketAndPath.indexOf('/');
          if (firstSlash !== -1) {
            filePath = bucketAndPath.substring(firstSlash + 1);
          }
        }
      }
      
      const cleanPath = filePath.replace(/^\/?resources\//, '');
      const bucket = 'resources';

      try {
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(cleanPath);
        return publicUrl;
      } catch (e) {
        return url;
      }
    }

    try {
      const urlObj = new URL(url);
      
      // Handle Google Drive links
      if (urlObj.hostname.includes('drive.google.com')) {
        const fileId = urlObj.searchParams.get('id') || urlObj.pathname.split('/d/')?.[1]?.split('/')?.[0];
        if (fileId) {
          return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
      }

      // Handle Google Image search result URLs (imgres)
      if (urlObj.hostname.includes('google.') && urlObj.pathname.includes('imgres')) {
        const imgUrl = urlObj.searchParams.get('imgurl');
        if (imgUrl) return decodeURIComponent(imgUrl);
      }

      // Handle Google Redirector URLs
      if (urlObj.hostname.includes('google.') && urlObj.pathname.includes('url')) {
        const urlParam = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
        if (urlParam) return decodeURIComponent(urlParam);
      }

      // Handle Google User Content - ensure high res
      if (urlObj.hostname.includes('googleusercontent.com')) {
        // Remove existing size parameters and force s1600
        const baseUrl = url.split('=')[0];
        return `${baseUrl}=s1600-rw`; // -rw for webp if supported, s1600 for original size
      }

      // Handle common image hosting wrappers (like postimg/imgur if they copy the page instead of image)
      // This is harder but common patterns can be added here if needed.

    } catch (e) {
      // Not a valid URL
    }
    return url;
  };

  const handleAddExam = async () => {
    if (userRole !== 'admin' && !canUpload) return;
    if (!newExam.title || !newExam.subject) {
      setGlobalError("Title and Subject are required.");
      return;
    }

    setIsUploading(true);
    try {
      const examPayload: Partial<Exam> = {
        title: newExam.title,
        class: newExam.class,
        academicGroup: newExam.academicGroup || 'All',
        subject: newExam.subject,
        chapter: (newExam.chapter === 'All Chapters' || !newExam.chapter) ? 'All' : newExam.chapter,
        chapterNameCustom: newExam.chapterNameCustom || '',
        examType: newExam.examType || 'mcq',
        timeLimit: newExam.timeLimit || 30,
        totalQuestionsToShow: newExam.totalQuestionsToShow || 30,
        negativeMarking: newExam.negativeMarking || false,
        negativeValue: newExam.negativeValue || 0.25,
        createdBy: user?.id,
        isPremium: newExam.isPremium || false,
        status: (canUpload || userRole === 'admin') ? 'approved' : 'pending'
      };

      let examId = editingExamId;

      if (editingExamId) {
        await supabaseService.updateExam(editingExamId, examPayload);
      } else {
        const createdExam = await supabaseService.createExam(examPayload);
        examId = createdExam.id;
        
        // Save temporary questions
        if (temporaryQuestions.length > 0) {
          try {
            const batchPayloads = await Promise.all(
              temporaryQuestions.map(async (q: any) => {
                const formattedQ = {
                  ...q,
                  questionText: q.questionText || q.question_text || '',
                  options: q.options || ['', '', '', ''],
                  correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : (q.correct_answer !== undefined ? q.correct_answer : 0),
                  class: newExam.class,
                  subject: newExam.subject,
                  chapter: (newExam.chapter === 'All Chapters' || !newExam.chapter) ? null : newExam.chapter,
                  examId: examId
                };
                return supabaseService.mapQuestionFrontendToDB(formattedQ);
              })
            );

            console.log("[Seeding Exam Questions] Seeding payload on physical schema:", batchPayloads);
            await supabaseService.safeWrite('questions', batchPayloads, 'insert');
          } catch (insertErr: any) {
            console.error("[Seeding Exam Questions] Batch insertion failed physically:", insertErr);
            throw insertErr;
          }
        }
      }

      setIsAddingExam(false);
      setEditingExamId(null);
      setTemporaryQuestions([]);
      setNewExam({
        title: '',
        class: dynamicClasses?.[0]?.name || 'SSC',
        subject: 'Math',
        chapter: '',
        chapterNameCustom: '',
        examType: 'mcq',
        timeLimit: 30,
        totalQuestionsToShow: 30,
        negativeMarking: false,
        negativeValue: 0.25,
        status: 'approved'
      });
    } catch (error: any) {
      setGlobalError(error.message || "Failed to save exam.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (userRole !== 'admin') return;
    if (!newQuestion.questionText) {
      setGlobalError("Question text is required.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Process/compress and upload question image
      let finalQuestionImage = questionImagePreview || '';
      if (questionImageFile) {
        const compressed = await compressImage(questionImageFile);
        finalQuestionImage = await uploadFile(compressed, 'questions');
      }

      // 2. Process/compress and upload option images
      const finalOptionImages = [...optionImagePreviews];
      for (let i = 0; i < 4; i++) {
        const file = optionImageFiles[i];
        if (file) {
          const compressed = await compressImage(file);
          const url = await uploadFile(compressed, 'questions');
          finalOptionImages[i] = url;
        }
      }

      // 3. Process/compress and upload explanation/solution image
      let finalExplanationImage = explanationImagePreview || '';
      if (explanationImageFile) {
        const compressed = await compressImage(explanationImageFile);
        finalExplanationImage = await uploadFile(compressed, 'questions');
      }

      // 4. Formulate options text/object representation
      const rawOptionsVal = newQuestion.options || ['', '', '', ''];
      const serializedOptions = rawOptionsVal.map((optTxt, idx) => {
        const imgUrl = finalOptionImages[idx];
        if (imgUrl) {
          return JSON.stringify({ text: optTxt || '', image: imgUrl });
        }
        return optTxt ? String(optTxt) : '';
      });

      // 5. Formulate serialized question text
      const serializedQuestionText = serializeQuestionText(newQuestion.questionText, finalQuestionImage || undefined);

      // 6. Build frontend matching Question payload
      const questionPayload: Partial<Question> = {
        type: newQuestion.type || 'mcq',
        questionText: serializedQuestionText,
        options: rawOptionsVal,
        correctAnswer: newQuestion.correctAnswer !== undefined ? Number(newQuestion.correctAnswer) : 0,
        points: newQuestion.points !== undefined ? Number(newQuestion.points) : 1,
        class: newQuestion.class || '',
        academicGroup: newQuestion.academicGroup || 'All',
        subject: newQuestion.subject || '',
        chapter: (newQuestion.chapter === 'All Chapters' || !newQuestion.chapter) ? null : newQuestion.chapter,
        topicId: newQuestion.topicId || null,
        explanation: newQuestion.explanation || '',
        difficulty: newQuestion.difficulty || 'medium',
        isPremium: !!newQuestion.isPremium,
        tags: newQuestion.tags || [],
        status: newQuestion.status || 'published',
        negativeMarks: newQuestion.negativeMarks !== undefined ? Number(newQuestion.negativeMarks) : 0.25,
      };

      // Set internal metadata representation
      (questionPayload as any).question_image = finalQuestionImage || null;
      (questionPayload as any).option_a_image = finalOptionImages[0] || null;
      (questionPayload as any).option_b_image = finalOptionImages[1] || null;
      (questionPayload as any).option_c_image = finalOptionImages[2] || null;
      (questionPayload as any).option_d_image = finalOptionImages[3] || null;
      (questionPayload as any).explanation_image = finalExplanationImage || null;

      console.log("[handleAddQuestion] Submitting payload:", questionPayload);

      if (editingExamId) {
        questionPayload.examId = editingExamId;
        if (editingQuestionId) {
          await supabaseService.updateQuestion(editingQuestionId, questionPayload);
        } else {
          await supabaseService.createQuestion(questionPayload);
        }
      } else if (isAddingExam) {
        // Local temporary list of active creator
        const mockWithClientMeta = {
          ...questionPayload,
          options: serializedOptions,
          question_image: finalQuestionImage || undefined,
          option_a_image: finalOptionImages[0] || undefined,
          option_b_image: finalOptionImages[1] || undefined,
          option_c_image: finalOptionImages[2] || undefined,
          option_d_image: finalOptionImages[3] || undefined,
          explanation_image: finalExplanationImage || undefined,
        };
        if (editingQuestionId) {
          setTemporaryQuestions(prev => prev.map(q => q.id === editingQuestionId ? { ...q, ...mockWithClientMeta } as any : q));
        } else {
          const tempId = Math.random().toString(36).substring(7);
          setTemporaryQuestions(prev => [...prev, { ...mockWithClientMeta, id: tempId } as any]);
        }
      } else {
        // Global bank
        if (editingQuestionId) {
          await supabaseService.updateQuestion(editingQuestionId, questionPayload);
        } else {
          await supabaseService.createQuestion(questionPayload);
        }
      }

      setIsAddingQuestion(false);
      setEditingQuestionId(null);
      setNewQuestion({
        type: 'mcq',
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 1,
        class: newExam.class,
        subject: newExam.subject,
        chapter: newExam.chapter
      });

      setQuestionImageFile(null);
      setQuestionImagePreview(null);
      setOptionImageFiles([null, null, null, null]);
      setOptionImagePreviews([null, null, null, null]);
      setExplanationImageFile(null);
      setExplanationImagePreview(null);
    } catch (error: any) {
      console.error(error);
      setGlobalError("Failed to save question: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };
  const handleAddExternal = async () => {
    if (userRole !== 'admin' && !canUpload) return;
    if (!newExternal.title || !newExternal.url) {
      setGlobalError("Title and URL are required.");
      return;
    }

    setIsUploadingExternal(true);
    try {
      let finalThumbnail = getDirectImageUrl(newExternal.thumbnail || '');

      if (externalThumbnailFile) {
        finalThumbnail = await uploadFile(externalThumbnailFile, '');
      }

      const externalData: any = {
        title: newExternal.title,
        description: newExternal.description || '',
        url: newExternal.url,
        icon: newExternal.icon || '🌐',
        thumbnail: finalThumbnail,
        chapter: (newExternal.chapter === 'All Chapters' || !newExternal.chapter || (newExternal.chapter as string).toLowerCase() === 'all') ? null : newExternal.chapter,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('external_links').insert([externalData]).select().single();
      if (error) throw error;
      
      if (data) {
        setExternalResources(prev => [data as ExternalResource, ...prev]);
      }
      
      setIsAddingExternal(false);
      setNewExternal({ title: '', description: '', url: '', icon: '🌐', thumbnail: '', chapter: '' });
      setExternalThumbnailFile(null);
      setExternalThumbnailPreview(null);
    } catch (error: any) {
      setGlobalError(error.message);
    } finally {
      setIsUploadingExternal(false);
    }
  };
  const handleDeleteExternal = async (id: string) => {
    if (userRole !== 'admin' && !canUpload) return;
    setDeletingId(id);
    setGlobalError(null);
  };

  const confirmDeleteExternal = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('external_links').delete().eq('id', deletingId);
      if (error) throw error;
      setExternalResources(prev => prev.filter(r => r.id !== deletingId));
      setDeletingId(null);
    } catch (error: any) {
      setGlobalError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-10">
          <div className="bg-black p-10 rounded-[48px] shadow-[0_0_80px_rgba(37,99,235,0.15)] border border-blue-500/10">
            <Logo className="h-40 sm:h-72 w-auto animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="w-48 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-blue-600"
                 initial={{ x: "-100%" }}
                 animate={{ x: "100%" }}
                 transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
               />
            </div>
            <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase">Initializing Parodorshhi...</span>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'reset-password') {
    return (
      <ResetPasswordPage 
        onSuccess={() => {
          setView('home');
          window.history.replaceState({}, document.title, "/");
        }} 
      />
    );
  }

  if (!user) {
    return (
      <LandingPage 
        onGoogleLogin={handleLogin} 
        onEmailLogin={handleEmailLogin} 
        onEmailSignUp={handleEmailSignUp as any} 
        onForgotPassword={handleForgotPassword} 
        onPhoneSignIn={handlePhoneSignIn}
        onVerifyOtp={handleVerifyOtp}
        error={authError} 
        isLoading={isAuthLoading} 
        dynamicClasses={dynamicClasses}
      />
    );
  }

  return (
    <div className="min-h-screen relative selection:bg-blue-100 selection:text-blue-900 transition-colors duration-500 w-full overflow-x-hidden max-w-full">
      <div className="animated-bg" />
      <div className="glow-layer" id="glowLayer" />
      <div className="relative z-10 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Main Header */}
      {/* Admin Quick Access Banner */}
      {userRole === 'admin' && (
        <div className="bg-blue-600 text-white py-2 px-6 relative z-[60]">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <Settings size={14} className="animate-spin-slow" />
                Administrator Mode Active
              </div>
              {contents.length === 0 && (
                <button 
                  onClick={handleSeedDatabase}
                  disabled={isSeeding}
                  className="text-[10px] font-black uppercase bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSeeding ? <RefreshCcw size={12} className="animate-spin" /> : <Plus size={12} />}
                  {isSeeding ? 'Seeding...' : 'Seed Initial Data'}
                </button>
              )}
            </div>
            <button 
              onClick={() => setView('admin')}
              className="text-xs font-black uppercase tracking-tighter bg-white text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Open Admin Portal
            </button>
          </div>
        </div>
      )}

      <header className="glass h-20 relative z-50 transition-all duration-300 w-full max-w-full">
        {globalError && (
          <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-[10px] py-1 px-6 flex items-center justify-between z-[70]">
            <span className="font-bold uppercase tracking-widest">System Error: {globalError}</span>
            <button onClick={() => setGlobalError(null)}><X size={12} /></button>
          </div>
        )}
        {authError && (
          <div className="absolute top-full left-0 right-0 bg-red-500 text-white text-xs py-2 px-6 flex items-center justify-between animate-in slide-in-from-top duration-300">
            <span className="font-bold">{authError}</span>
            <button onClick={() => setAuthError(null)}><X size={14} /></button>
          </div>
        )}
        <div className="max-w-[1440px] mx-auto px-3 sm:px-10 h-full flex items-center justify-between gap-4 sm:gap-12 relative">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 h-full relative">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors active:scale-95"
            >
              <Menu size={22} />
            </button>
            <motion.button
              onClick={() => {
                setView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center bg-zinc-950 rounded-xl sm:rounded-2xl p-2 sm:p-2 border-2 border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.2)] transition-all duration-300 hover:border-blue-500 hover:shadow-blue-500/40 group relative overflow-visible"
              aria-label="Website Logo - Home"
            >
              <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Logo className="h-10 sm:h-16 w-auto block relative z-10" alt="Parodorshhi Logo - Home" />
            </motion.button>
          </div>

          <div className="flex-1 max-w-2xl relative group hidden lg:block">
            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search study notes, books, videos..."
              className="w-full pl-11 sm:pl-14 pr-4 sm:pr-6 py-2.5 sm:py-3.5 bg-zinc-100/80 dark:bg-zinc-800/80 backdrop-blur-md border border-transparent focus:border-blue-500/50 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white font-medium placeholder:text-zinc-500 text-sm sm:text-base"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />

            {/* Search Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[100]"
                >
                  <div className="p-2 max-h-[400px] overflow-y-auto">
                    {suggestions.map((item, sIdx) => (
                      <button
                        key={`${item.id}-${sIdx}`}
                        onClick={() => {
                          setSearchQuery(item.title);
                          setShowSuggestions(false);
                          if (view === 'home') setView('category');
                          setSelectedCategory(item.category);
                        }}
                        className="w-full flex items-center gap-4 p-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                          <img 
                            src={item.thumbnail || 'https://picsum.photos/seed/edu/100/100'} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{item.category}</span>
                            <span className="text-[10px] text-zinc-400">•</span>
                            <span className="text-[10px] text-zinc-500 font-medium">{item.subject}</span>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-zinc-300 group-hover:text-blue-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setIsDarkMode(!isDarkMode)} className="rounded-2xl w-9 h-9 sm:w-11 sm:h-11 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-all">
              {isDarkMode ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
            </Button>
            
            <div ref={userMenuRef} className="relative group/user">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-2 p-1 pr-3 rounded-full transition-all duration-300 ${isUserMenuOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-4 ring-blue-500/10' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden border-2 shadow-inner transition-transform group-active/user:scale-95 ${isUserMenuOpen ? 'border-white/50 bg-white/20' : 'border-blue-500/20 bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                  {(firestoreUser?.avatarUrl || firestoreUser?.avatar_url || firestoreUser?.photoURL || user.user_metadata?.avatar_url) ? (
                    <img 
                      src={firestoreUser?.avatarUrl || firestoreUser?.avatar_url || firestoreUser?.photoURL || user.user_metadata?.avatar_url} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0)
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">{user.user_metadata?.full_name?.split(' ')?.[0] || user.email?.split('@')?.[0]}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-3 z-50 min-w-[240px]"
                  >
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-2 relative overflow-hidden backdrop-blur-xl">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600" />
                      <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                        <p className="text-sm font-black text-zinc-900 dark:text-white leading-none mb-1.5">{user.user_metadata?.full_name}</p>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate mb-3">{user.email}</p>
                        <div className="flex items-center gap-2">
                          {userRole === 'admin' && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">Admin</span>}
                          {canUpload && userRole !== 'admin' && <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">Editor</span>}
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">Verified</span>
                        </div>
                      </div>
                      
                      <div className="space-y-0.5">
                        <button 
                          onClick={() => { setView('dashboard'); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 rounded-xl transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
                            <Monitor size={18} />
                          </div>
                          My Dashboard
                        </button>
                        <button 
                          onClick={() => { setView('leaderboard'); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 rounded-xl transition-all"
                        >
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
                            <Trophy size={18} />
                          </div>
                          Leaderboard
                        </button>
                        {hasAdminAccess && (
                          <button 
                            onClick={() => { setView('admin'); setIsUserMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 rounded-xl transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
                              <Settings size={18} />
                            </div>
                            Admin Portal
                          </button>
                        )}
                      </div>

                      <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-2"></div>
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-widest"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600">
                          <LogOut size={18} />
                        </div>
                        Log Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white dark:bg-zinc-950 z-[101] lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                <motion.button 
                  onClick={() => {
                    setView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setIsMobileMenuOpen(false);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-zinc-950 p-4 rounded-3xl border-2 border-blue-500/20 shadow-[0_0_40px_rgba(37,99,235,0.15)] group relative overflow-visible"
                  aria-label="Website Logo - Home"
                >
                  <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Logo className="h-12 w-auto relative z-10" />
                </motion.button>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-8">
                {/* Mobile Search */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500" size={18} />
                  <input 
                    type="text"
                    placeholder="Search courses, notes..."
                    className="w-full pl-11 pr-4 py-3.5 bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-blue-500/30 rounded-2xl outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-4 mb-4">Quick Navigation</p>
                  <button 
                    onClick={() => { setView('home'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${view === 'home' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Home size={20} /> Home
                  </button>
                  <button 
                    onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Monitor size={20} /> Dashboard
                  </button>
                  <button 
                    onClick={() => { setView('exam'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${view === 'exam' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <ClipboardList size={20} /> Exam Center
                  </button>
                  <button 
                    onClick={() => { handlePremiumExamClick(); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${view === 'premium-exam' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-700 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Crown size={20} className="text-amber-500" /> Customize Exam
                  </button>
                  <button 
                    onClick={() => { setView('leaderboard'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${view === 'leaderboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Trophy size={20} /> Leaderboard
                  </button>
                </div>

                <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-4 px-4 py-2">
                    <img 
                      src={firestoreUser?.avatarUrl || firestoreUser?.avatar_url || firestoreUser?.photoURL || user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firestoreUser?.display_name || user.user_metadata?.full_name || 'User'}`} 
                      className="w-12 h-12 rounded-xl border-2 border-blue-500/20 object-cover container" 
                      alt="" 
                      onError={(e) => {
                        e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${firestoreUser?.display_name || user.user_metadata?.full_name || 'User'}`;
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-zinc-900 dark:text-white truncate">{firestoreUser?.name || user.user_metadata?.full_name || 'Student'}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-4 text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl mt-4"
                  >
                    <LogOut size={20} /> Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sub Header / Breadcrumbs */}
      <div className="glass py-2 sm:py-3 relative z-40 overflow-hidden border-b-0">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0 scroll-smooth">
            <div className="flex items-center gap-1 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-1 bg-white/50 dark:bg-zinc-900/50 shadow-sm shrink-0">
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl" onClick={handleBack}><ChevronLeft size={16} /></Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl" onClick={handleForward}><ChevronRight size={16} /></Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl" onClick={resetToHome}><Home size={16} /></Button>
            </div>
              <div className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-white dark:bg-zinc-900 rounded-2xl text-[10px] sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm shrink-0 min-w-0">
                <GraduationCap size={14} className="text-blue-500 shrink-0" strokeWidth={2.5} />
                <span className="tracking-tight truncate max-w-[100px] sm:max-w-none">Parodorshhi › {view === 'home' ? 'Home' : view === 'saved' ? 'Saved' : view === 'admin' ? 'Admin Portal' : view === 'dashboard' ? 'My Dashboard' : view === 'leaderboard' ? 'Leaderboard' : view === 'exam' ? (activeExam ? 'Taking Exam' : 'Exam Center') : view === 'premium-exam' ? 'Customize Exam (Premium)' : selectedCategory}</span>
              </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0 scroll-smooth">
            <Button 
              variant="outline" 
              size="sm" 
              icon={ClipboardList} 
              className={`h-11 sm:h-10 rounded-xl px-4 sm:px-4 border-none shadow-sm shrink-0 font-bold ${view === 'exam' ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'}`} 
              onClick={() => { setView('exam'); setActiveExam(null); }}
            >
              Exam Center
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={Crown} 
              className={`h-11 sm:h-10 rounded-xl px-4 sm:px-4 border-none shadow-sm shrink-0 font-bold ${view === 'premium-exam' ? 'bg-violet-600 text-white shadow-violet-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'}`} 
              onClick={handlePremiumExamClick}
            >
              Elite Exam
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={Sparkles} 
              className={`h-11 sm:h-10 rounded-xl px-4 sm:px-4 border-none shadow-sm shrink-0 font-bold ${view === 'revision' ? 'bg-amber-600 text-white shadow-amber-500/20 shadow-md scale-105' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'}`} 
              onClick={() => setView('revision')}
            >
              Revision Center
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={Bookmark} 
              className={`h-11 sm:h-10 rounded-xl px-4 sm:px-4 border-none shadow-sm shrink-0 font-bold ${view === 'saved' ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'}`} 
              onClick={() => setView('saved')}
            >
              Saved
            </Button>
            {hasAdminAccess && (
              <Button 
                variant="outline" 
                size="sm" 
                icon={Settings} 
                className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm shrink-0" 
                onClick={() => setView('admin')}
              >
                Admin
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              icon={FileText} 
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" 
              onClick={() => { 
                setSearchQuery('');
                if (view !== 'home') {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('notes-section')?.scrollIntoView({ behavior: 'smooth' });
                    triggerHighlight('notes-section');
                  }, 100);
                } else {
                  document.getElementById('notes-section')?.scrollIntoView({ behavior: 'smooth' });
                  triggerHighlight('notes-section');
                }
              }}
            >
              Notes
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={FileText} 
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" 
              onClick={() => { 
                setSearchQuery('');
                if (view !== 'home') {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('practice-section')?.scrollIntoView({ behavior: 'smooth' });
                    triggerHighlight('practice-section');
                  }, 100);
                } else {
                  document.getElementById('practice-section')?.scrollIntoView({ behavior: 'smooth' });
                  triggerHighlight('practice-section');
                }
              }}
            >
              Sheets
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={BookOpen} 
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" 
              onClick={() => { 
                setSearchQuery('');
                if (view !== 'home') {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('books-section')?.scrollIntoView({ behavior: 'smooth' });
                    triggerHighlight('books-section');
                  }, 100);
                } else {
                  document.getElementById('books-section')?.scrollIntoView({ behavior: 'smooth' });
                  triggerHighlight('books-section');
                }
              }}
            >
              Books
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={History} 
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" 
              onClick={() => { 
                setSearchQuery('');
                if (view !== 'home') {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('papers-section')?.scrollIntoView({ behavior: 'smooth' });
                    triggerHighlight('papers-section');
                  }, 100);
                } else {
                  document.getElementById('papers-section')?.scrollIntoView({ behavior: 'smooth' });
                  triggerHighlight('papers-section');
                }
              }}
            >
              Papers
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={Youtube} 
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" 
              onClick={() => { 
                setSearchQuery('');
                if (view !== 'home') {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' });
                    triggerHighlight('video-section');
                  }, 100);
                } else {
                  document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' });
                  triggerHighlight('video-section');
                }
              }}
            >
              Videos
            </Button>
            {canUpload && (
              <Button variant="primary" size="sm" icon={Plus} className="h-9 sm:h-10 rounded-xl px-4 sm:px-5 bg-blue-600 shadow-lg shadow-blue-500/20 shrink-0" onClick={() => {
                setIsEditing(false);
                setEditingId(null);
                setNewItem({ 
                  category: 'Notes', 
                  academicClass: dynamicClasses?.[0]?.name || 'SSC', 
                  subject: '', 
                  title: '', 
                  description: '', 
                  url: '', 
                  thumbnail: '', 
                  isPremium: false,
                  tags: [] 
                });
                setIsAdding(true);
              }}>Add</Button>
            )}
          </div>
        </div>
      </div>

      <main className="w-full max-w-full px-3 sm:px-4 py-6 sm:py-10 overflow-x-hidden">
        {view === 'premium-subscription' ? (
          <PremiumSubscriptionPage user={user} onNavigateHome={() => setView('home')} />
        ) : (view === 'home' && !searchQuery) ? renderHome() : 
         view === 'leaderboard' ? renderLeaderboard() :
         view === 'admin' ? renderAdminPortal() :
         view === 'dashboard' ? renderUserDashboard() :
         view === 'exam' ? renderExamMode() : 
         view === 'premium-exam' ? (
           hasPremiumAccess ? (
             <PremiumExamSection user={user} dynamicClasses={dynamicClasses} dynamicSubjects={dynamicSubjects} dynamicChapters={dynamicChapters} dynamicTopics={dynamicTopics} fetchLeaderboards={fetchLeaderboards} onCustomExamFinished={handleCustomExamFinished} savedQuestionIds={savedQuestionIds} onToggleSaveQuestion={handleToggleSaveQuestion} />
           ) : (
             <PremiumSubscriptionPage user={user} onNavigateHome={() => setView('home')} />
           )
         ) :
         view === 'revision' ? (
            <RevisionCenter
              user={user}
              savedQuestions={qSavedQuestionsData || []}
              wrongQuestions={qWrongQuestionsData || []}
              refetchSaved={refetchSavedQuestions}
              refetchWrong={refetchWrongQuestions}
              savedQuestionIds={savedQuestionIds}
              onToggleSaveQuestion={handleToggleSaveQuestion}
            />
          ) :
          view === 'privacy' ? renderPrivacyPolicy() : 
         view === 'terms' ? renderTermsOfService() : 
         view === 'cookies' ? renderCookiePolicy() : (
          <div className="space-y-10">
            {renderFilters()}
            {renderContentList()}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {canUpload && (
          <button 
            onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              setNewItem({ category: 'Notes', academicClass: dynamicClasses?.[0]?.name || 'SSC', subject: '', title: '', description: '', url: '', thumbnail: '' });
              setIsAdding(true);
            }}
            className="fixed bottom-24 lg:bottom-8 right-6 lg:right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 animate-bounce-slow"
          >
            <Plus size={28} />
          </button>
      )}

      {/* Modals & Overlays */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-lg w-full shadow-2xl space-y-6 relative my-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  {isEditing ? 'Edit Resource' : 'Add New Resource'}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => { 
                  setIsAdding(false); 
                  setIsEditing(false);
                  setEditingId(null);
                  setUploadError(null); 
                  setNewItem({ 
                    category: 'Notes', 
                    academicClass: dynamicClasses?.[0]?.name || 'SSC', 
                    subject: '', 
                    title: '', 
                    description: '', 
                    url: '', 
                    thumbnail: '', 
                    isPremium: false,
                    tags: [] 
                  });
                  setSelectedFiles({});
                }} className="rounded-xl"><X size={20} /></Button>
              </div>

              {uploadError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold">
                  {uploadError}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Category</label>
                    <select 
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                      value={newItem.category}
                      onChange={e => setNewItem({...newItem, category: e.target.value as Category})}
                    >
                      <option value="Notes">Notes</option>
                      <option value="Practice Sheet">Practice Sheet</option>
                      <option value="Books">Books</option>
                      <option value="Question Papers">Question Papers</option>
                      <option value="YouTube Classes">YouTube Classes</option>
                      <option value="External Resources">External Resource</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Class</label>
                    <select 
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                      value={newItem.academicClass}
                      onChange={e => {
                        const newClass = e.target.value as AcademicClass;
                        setNewItem({
                          ...newItem, 
                          academicClass: newClass, 
                          subject: '', 
                          chapter: '',
                          academicGroup: isGroupNeeded(newClass) ? (newItem.academicGroup === 'All' ? 'Science' : newItem.academicGroup) : 'All'
                        });
                      }}
                    >
                      <option value="">Select Class</option>
                      {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Academic Group Selection (Dynamic) */}
                {newItem.academicClass && isGroupNeeded(newItem.academicClass as string) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Academic Group / Stream</label>
                    <div className="flex flex-wrap gap-2">
                      {academicGroups.map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setNewItem({ ...newItem, academicGroup: g.name })}
                          className={`flex-1 min-w-[100px] py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                            newItem.academicGroup === g.name
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-blue-400'
                          }`}
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conditional Fields Based on Category */}
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  {newItem.category === 'Books' && (
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Year</label>
                      <input 
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                        placeholder="e.g. 2024"
                        value={newItem.year || ''}
                        onChange={e => setNewItem({...newItem, year: e.target.value})}
                      />
                    </div>
                  )}

                  {newItem.category === 'YouTube Classes' && (
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Channel Name</label>
                      <input 
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-medium"
                        placeholder="e.g. 10 Minute School"
                        value={newItem.channelName || ''}
                        onChange={e => setNewItem({...newItem, channelName: e.target.value})}
                      />
                    </div>
                  )}

                  {newItem.category === 'External Resources' && (
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Icon (Emoji/Text)</label>
                      <input 
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                        placeholder="e.g. 📚 or SVG/URL"
                        value={newItem.icon || ''}
                        onChange={e => setNewItem({...newItem, icon: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Title</label>
                <input 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                  placeholder="Enter resource title..."
                  value={newItem.title || ''}
                  onChange={e => setNewItem({...newItem, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Subject</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newItem.subject}
                    onChange={e => setNewItem({...newItem, subject: e.target.value, chapter: ''})}
                    disabled={!newItem.academicClass}
                  >
                    <option value="">Select Subject</option>
                    {getSubjectsForClass(newItem.academicClass as string).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {!newItem.academicClass && <option disabled>Choose class first</option>}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newItem.chapter || ''}
                    onChange={e => {
                      const chapterName = e.target.value;
                      const matchedChapter = dynamicChapters.find(ch => ch.name === chapterName);
                      setNewItem({...newItem, chapter: chapterName, chapterId: matchedChapter?.id || '', topicId: ''});
                    }}
                    disabled={!newItem.subject}
                  >
                    <option value="">Select Chapter</option>
                    <option value="All Chapters">All Chapters</option>
                    {getChaptersForSubject(newItem.subject as string, newItem.academicClass as string).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    {!newItem.subject && <option disabled>Choose subject first</option>}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Topic</label>
                <select 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                  value={newItem.topicId || ''}
                  onChange={e => setNewItem({...newItem, topicId: e.target.value})}
                  disabled={!newItem.chapter || newItem.chapter === 'All Chapters'}
                >
                  <option value="">Select Topic</option>
                  {getTopicsForChapter(newItem.chapter || '', newItem.subject || '', newItem.academicClass as string).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {(!newItem.chapter || newItem.chapter === 'All Chapters') && <option disabled>Select chapter first</option>}
                  {newItem.chapter && newItem.chapter !== 'All Chapters' && getTopicsForChapter(newItem.chapter || '', newItem.subject || '', newItem.academicClass as string).length === 0 && <option disabled>No topics found</option>}
                </select>
              </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Content Type</label>
                  <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <button 
                      onClick={() => setNewItem({...newItem, isPremium: false})}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${!newItem.isPremium ? 'bg-white dark:bg-zinc-900 text-green-600 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Regular (Free)
                    </button>
                    <button 
                      onClick={() => setNewItem({...newItem, isPremium: true})}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${newItem.isPremium ? 'bg-amber-500 text-white shadow-sm' : 'text-zinc-500'}`}
                    >
                      Premium (Paid)
                    </button>
                  </div>
                </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Description</label>
                <textarea 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                  placeholder="Enter resource description..."
                  value={newItem.description || ''}
                  rows={3}
                  onChange={e => setNewItem({...newItem, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Tags (Optional)</label>
                <input 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                  placeholder="e.g. physics, vector, hsc (comma separated)"
                  value={typeof newItem.tags === 'string' ? newItem.tags : (newItem.tags || []).join(', ')}
                  onChange={e => setNewItem({...newItem, tags: e.target.value as any})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Thumbnail</label>
                <div className="space-y-3">
                  <div 
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full aspect-video bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors overflow-hidden group relative"
                  >
                    {newItem.thumbnail ? (
                      <>
                        <img src={getDirectImageUrl(newItem.thumbnail)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="text-white" size={24} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-2">
                          <Upload className="text-zinc-400" size={20} />
                        </div>
                        <span className="text-xs text-zinc-500 font-medium">Upload Thumbnail</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OR</span>
                    <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                  </div>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm"
                    placeholder="Paste Thumbnail Image URL..."
                    value={newItem.thumbnail && newItem.thumbnail.startsWith('http') ? newItem.thumbnail : ''}
                    onChange={e => {
                      setNewItem({...newItem, thumbnail: e.target.value});
                      if (e.target.value) setSelectedFiles(prev => ({ ...prev, thumbnail: undefined }));
                    }}
                  />
                  <p className="text-[10px] text-zinc-400 mt-1 italic">
                    Hint: Use 'Copy image address' for Google images for best results.
                  </p>
                </div>
                <input 
                  type="file"
                  ref={thumbnailInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'thumbnail')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">
                  {newItem.category === 'YouTube Classes' ? 'YouTube Video URL / ID' : 'Resource File / Link'}
                </label>
                <div className="space-y-3">
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm"
                    placeholder={newItem.category === 'YouTube Classes' ? "Paste YouTube Link or ID..." : "Paste External Link (Google Drive, etc.)..."}
                    value={newItem.url || ''}
                    onChange={e => {
                      setNewItem({...newItem, url: e.target.value});
                      if (e.target.value && !selectedFiles.resource) {
                        // Keep it as is
                      } else if (e.target.value) {
                        setSelectedFiles(prev => ({ ...prev, resource: undefined }));
                      }
                    }}
                  />
                  
                  {newItem.category !== 'YouTube Classes' && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OR</span>
                        <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                      </div>
                      <div className="relative group/file">
                        <div 
                          onClick={() => resourceInputRef.current?.click()}
                          className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-600">
                            <FileIcon size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                              {selectedFiles.resource ? selectedFiles.resource.name : 'Upload PDF or Document'}
                            </p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                              {selectedFiles.resource ? 'Click to change' : 'Max 300MB'}
                            </p>
                          </div>
                          <Upload className="text-zinc-400" size={18} />
                        </div>
                        {selectedFiles.resource && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFiles(prev => ({ ...prev, resource: undefined }));
                              setNewItem(prev => ({ ...prev, url: '' }));
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <input 
                  type="file"
                  ref={resourceInputRef}
                  className="hidden"
                  accept={newItem.category === 'Books' || newItem.category === 'Question Papers' ? '.pdf' : '*'}
                  onChange={(e) => handleFileChange(e, 'url')}
                />
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <span>{uploadProgress === 0 ? `Connecting (${(selectedFiles.resource?.size || 0) / (1024*1024) > 10 ? 'Large File' : 'Sending'})...` : `Uploading ${selectedFiles.resource ? 'Resource' : 'Thumbnail'}...`}</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-zinc-400">Stable Mode: Enabled</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(uploadProgress, 2)}%` }}
                    />
                  </div>
                </div>
              )}

              <Button 
                className="w-full py-4 bg-blue-600" 
                icon={isUploading ? RefreshCcw : Save} 
                onClick={handleAddContent}
                disabled={isUploading}
              >
                {isUploading ? `Uploading (${Math.round(uploadProgress)}%)` : (isEditing ? 'Update Resource' : 'Save Resource')}
              </Button>
            </motion.div>
          </div>
        )}

        {isAddingPlaylist && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-2xl w-full shadow-2xl space-y-6 relative my-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  {editingPlaylistId ? 'Edit Playlist' : 'Add New Playlist'}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => { 
                  setIsAddingPlaylist(false); 
                  setEditingPlaylistId(null);
                  setUploadError(null); 
                  setSelectedFiles({});
                }} className="rounded-xl"><X size={20} /></Button>
              </div>

              {uploadError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold">
                  {uploadError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Playlist Type</label>
                  <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <button 
                      onClick={() => setNewPlaylist({...newPlaylist, type: 'youtube'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newPlaylist.type === 'youtube' ? 'bg-white dark:bg-zinc-900 text-red-600 shadow-sm' : 'text-zinc-500'}`}
                    >
                      YouTube
                    </button>
                    <button 
                      onClick={() => setNewPlaylist({...newPlaylist, type: 'custom'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newPlaylist.type === 'custom' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Custom
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Class</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newPlaylist.academicClass}
                    onChange={e => {
                      const newClass = e.target.value as AcademicClass;
                      setNewPlaylist({
                        ...newPlaylist, 
                        academicClass: newClass, 
                        subject: '', 
                        chapter: '',
                        academicGroup: isGroupNeeded(newClass) ? (newPlaylist.academicGroup === 'All' ? 'Science' : newPlaylist.academicGroup) : 'All'
                      });
                    }}
                  >
                    <option value="">Select Class</option>
                    {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Academic Group Selection (Playlist) */}
                {newPlaylist.academicClass && isGroupNeeded(newPlaylist.academicClass as string) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Academic Group / Stream</label>
                    <div className="flex flex-wrap gap-2">
                      {academicGroups.map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setNewPlaylist({ ...newPlaylist, academicGroup: g.name })}
                          className={`flex-1 min-w-[100px] py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                            newPlaylist.academicGroup === g.name
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-blue-400'
                          }`}
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Title</label>
                <input 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                  placeholder="Enter playlist title..."
                  value={newPlaylist.title || ''}
                  onChange={e => setNewPlaylist({...newPlaylist, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Subject</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newPlaylist.subject}
                    onChange={e => setNewPlaylist({...newPlaylist, subject: e.target.value, chapter: ''})}
                    disabled={!newPlaylist.academicClass}
                  >
                    <option value="">Select Subject</option>
                    {getSubjectsForClass(newPlaylist.academicClass as string).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {!newPlaylist.academicClass && <option disabled>Choose class first</option>}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newPlaylist.chapter || ''}
                    onChange={e => setNewPlaylist({...newPlaylist, chapter: e.target.value})}
                    disabled={!newPlaylist.subject}
                  >
                    <option value="">Select Chapter</option>
                    <option value="All Chapters">All Chapters</option>
                    {getChaptersForSubject(newPlaylist.subject as string, newPlaylist.academicClass as string).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    {!newPlaylist.subject && <option disabled>Choose subject first</option>}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Access Logic</label>
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                  <button 
                    onClick={() => setNewPlaylist({...newPlaylist, isPremium: false})}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${!newPlaylist.isPremium ? 'bg-white dark:bg-zinc-900 text-green-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Regular (Free)
                  </button>
                  <button 
                    onClick={() => setNewPlaylist({...newPlaylist, isPremium: true})}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${newPlaylist.isPremium ? 'bg-amber-500 text-white shadow-sm' : 'text-zinc-500'}`}
                  >
                    Premium (Paid)
                  </button>
                </div>
              </div>

              {newPlaylist.type === 'youtube' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">YouTube Playlist URL / ID</label>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm"
                    placeholder="Paste YouTube Playlist Link or ID..."
                    value={newPlaylist.youtubePlaylistId || ''}
                    onChange={e => setNewPlaylist({...newPlaylist, youtubePlaylistId: e.target.value})}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Select Videos ({newPlaylist.videoIds?.length || 0})</label>
                  <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 space-y-2 bg-zinc-50 dark:bg-zinc-800/50">
                    {contents.filter(c => c.category === 'YouTube Classes' && c.status === 'approved').map(video => (
                      <div 
                        key={video.id}
                        onClick={() => {
                          const currentIds = newPlaylist.videoIds || [];
                          if (currentIds.includes(video.id)) {
                            setNewPlaylist({...newPlaylist, videoIds: currentIds.filter(id => id !== video.id)});
                          } else {
                            setNewPlaylist({...newPlaylist, videoIds: [...currentIds, video.id]});
                          }
                        }}
                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${newPlaylist.videoIds?.includes(video.id) ? 'bg-blue-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                      >
                        <div className="w-12 h-8 rounded bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0">
                          <img src={`https://img.youtube.com/vi/${getYouTubeId(video.url)}/default.jpg`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{video.title}</p>
                          <p className="text-[8px] opacity-60 uppercase tracking-widest">{video.subject}</p>
                        </div>
                        {newPlaylist.videoIds?.includes(video.id) && <Plus size={14} className="rotate-45" />}
                      </div>
                    ))}
                    {contents.filter(c => c.category === 'YouTube Classes' && c.status === 'approved').length === 0 && (
                      <p className="text-center py-4 text-xs text-zinc-500">No approved videos available to add.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Playlist Thumbnail (Optional)</label>
                <div className="space-y-3">
                  <div 
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full aspect-video bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors overflow-hidden group relative"
                  >
                    {newPlaylist.thumbnail ? (
                      <>
                        <img src={getDirectImageUrl(newPlaylist.thumbnail)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="text-white" size={24} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-2">
                          <Upload className="text-zinc-400" size={20} />
                        </div>
                        <span className="text-xs text-zinc-500 font-medium">Upload Thumbnail</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OR</span>
                    <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                  </div>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm"
                    placeholder="Paste Thumbnail Image URL..."
                    value={newPlaylist.thumbnail && newPlaylist.thumbnail.startsWith('http') ? newPlaylist.thumbnail : ''}
                    onChange={e => {
                      setNewPlaylist({...newPlaylist, thumbnail: e.target.value});
                      if (e.target.value) setSelectedFiles(prev => ({ ...prev, thumbnail: undefined }));
                    }}
                  />
                </div>
                <input 
                  type="file"
                  ref={thumbnailInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'thumbnail')}
                />
              </div>

              <Button 
                variant="primary" 
                className="w-full py-4 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white font-black rounded-2xl disabled:opacity-50"
                onClick={handleAddPlaylist}
                disabled={isUploading}
              >
                {isUploading ? <RefreshCcw className="animate-spin mx-auto" size={20} /> : (editingPlaylistId ? 'Update Playlist' : 'Create Playlist')}
              </Button>
            </motion.div>
          </div>
        )}

        {isAddingQuestion && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-2xl w-full shadow-2xl space-y-6 relative my-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    {editingQuestionId ? 'Edit Question' : 'Add New Question'}
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium">Add questions to your global question bank.</p>
                </div>
                <button 
                  onClick={() => { 
                    setIsAddingQuestion(false); 
                    setEditingQuestionId(null);
                  }}
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Class</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newQuestion.class}
                    onChange={e => {
                      const newClass = e.target.value as AcademicClass;
                      setNewQuestion({
                        ...newQuestion, 
                        class: newClass, 
                        subject: '', 
                        chapter: '',
                        academicGroup: isGroupNeeded(newClass) ? (newQuestion.academicGroup === 'All' ? 'Science' : newQuestion.academicGroup) : 'All'
                      });
                    }}
                  >
                    <option value="">Select Class</option>
                    {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {newQuestion.class && isGroupNeeded(newQuestion.class as string) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Academic Group / Stream</label>
                    <div className="flex flex-wrap gap-2">
                      {academicGroups.map(g => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setNewQuestion({ ...newQuestion, academicGroup: g.name })}
                          className={`flex-1 min-w-[100px] py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                            newQuestion.academicGroup === g.name
                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-blue-400'
                          }`}
                        >
                          {g.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Subject</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newQuestion.subject || ''}
                    onChange={e => setNewQuestion({...newQuestion, subject: e.target.value, chapter: ''})}
                    disabled={!newQuestion.class}
                  >
                    <option value="">Select Subject</option>
                    {getSubjectsForClass(newQuestion.class as string).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {!newQuestion.class && <option disabled>Choose class first</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newQuestion.chapter || ''}
                    onChange={e => setNewQuestion({...newQuestion, chapter: e.target.value, topicId: ''})}
                    disabled={!newQuestion.subject}
                  >
                    <option value="">Select Chapter</option>
                    <option value="All Chapters">All Chapters</option>
                    {getChaptersForSubject(newQuestion.subject || '', newQuestion.class as string).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    {!newQuestion.subject && <option disabled>Choose subject first</option>}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Topic</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newQuestion.topicId || ''}
                    onChange={e => setNewQuestion({...newQuestion, topicId: e.target.value})}
                    disabled={!newQuestion.chapter}
                  >
                    <option value="">Select Topic</option>
                    {getTopicsForChapter(newQuestion.chapter || '', newQuestion.subject || '', newQuestion.class as string).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                    {!newQuestion.chapter && <option disabled>Choose chapter first</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Question Type</label>
                  <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <button 
                      onClick={() => setNewQuestion({...newQuestion, type: 'mcq'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newQuestion.type === 'mcq' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500'}`}
                    >
                      MCQ
                    </button>
                    <button 
                      onClick={() => setNewQuestion({...newQuestion, type: 'written'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newQuestion.type === 'written' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Written
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Question Text</label>
                <textarea 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm h-32"
                  placeholder="Enter the question..."
                  value={newQuestion.questionText || ''}
                  onChange={e => setNewQuestion({...newQuestion, questionText: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Question Image (Optional)</label>
                {questionImagePreview ? (
                  <div className="relative group border border-zinc-200 dark:border-zinc-700/80 rounded-2xl bg-zinc-50 dark:bg-zinc-950/20 p-4 flex items-center gap-4">
                    <img 
                      src={questionImagePreview} 
                      alt="Question preview" 
                      className="w-20 h-20 object-contain rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-90 w-20"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">Question Attachment</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Ready to save</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 hover:text-blue-600 text-xs px-3 py-2 rounded-xl font-bold transition-all">
                        Replace
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg, image/jpg, image/webp" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setQuestionImageFile(file);
                              setQuestionImagePreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                      <button 
                        type="button" 
                        onClick={() => {
                          setQuestionImageFile(null);
                          setQuestionImagePreview(null);
                        }}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-500/30 rounded-2xl p-6 bg-zinc-50/50 dark:bg-zinc-950/10 cursor-pointer transition-all hover:bg-blue-50/5 dark:hover:bg-blue-950/5 group text-center">
                    <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 group-hover:text-blue-600 transition-colors shadow-sm mb-2">
                      <ImageIcon size={20} />
                    </div>
                    <span className="text-sm font-bold text-zinc-600 dark:text-zinc-300">Upload diagram / math equation image</span>
                    <span className="text-[9px] text-zinc-400 mt-1 uppercase tracking-wider">Supports PNG, JPG, WEBP • Auto-compressed</span>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg, image/webp" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setQuestionImageFile(file);
                          setQuestionImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {newQuestion.type === 'mcq' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Options & Correct Answer</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {newQuestion.options?.map((opt, idx) => (
                      <div key={`new-opt-${idx}`} className="flex flex-col gap-2 p-4 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/80 rounded-[22px]">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${newQuestion.correctAnswer === idx ? 'bg-green-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <input 
                            className={`flex-1 bg-white dark:bg-zinc-900 border p-3 rounded-xl outline-none dark:text-white text-sm ${newQuestion.correctAnswer === idx ? 'border-green-500/50 ring-1 ring-green-500/20' : 'border-zinc-200 dark:border-zinc-700'}`}
                            value={opt}
                            placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                            onChange={e => {
                              const opts = [...(newQuestion.options || [])];
                              opts[idx] = e.target.value;
                              setNewQuestion({...newQuestion, options: opts});
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => setNewQuestion({...newQuestion, correctAnswer: idx})}
                            className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${newQuestion.correctAnswer === idx ? 'bg-green-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-green-500'}`}
                          >
                            <Check size={18} />
                          </button>
                        </div>
                        
                        {/* Option Image Attachment Section */}
                        <div className="pl-10">
                          {optionImagePreviews[idx] ? (
                            <div className="relative group border border-zinc-200/80 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-2.5 flex items-center gap-3">
                              <img 
                                src={optionImagePreviews[idx] || undefined} 
                                alt={`Option ${String.fromCharCode(65 + idx)} preview`} 
                                className="w-12 h-12 object-contain rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Option {String.fromCharCode(65 + idx)} Image</p>
                                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">Ready</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 hover:text-blue-600 text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all">
                                  Replace
                                  <input 
                                    type="file" 
                                    accept="image/png, image/jpeg, image/jpg, image/webp" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const nextFiles = [...optionImageFiles];
                                        nextFiles[idx] = file;
                                        setOptionImageFiles(nextFiles);

                                        const nextPreviews = [...optionImagePreviews];
                                        nextPreviews[idx] = URL.createObjectURL(file);
                                        setOptionImagePreviews(nextPreviews);
                                      }
                                    }}
                                  />
                                </label>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const nextFiles = [...optionImageFiles];
                                    nextFiles[idx] = null;
                                    setOptionImageFiles(nextFiles);

                                    const nextPreviews = [...optionImagePreviews];
                                    nextPreviews[idx] = null;
                                    setOptionImagePreviews(nextPreviews);
                                  }}
                                  className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500/40 rounded-xl py-2 px-3 bg-white dark:bg-zinc-900 cursor-pointer transition-all text-center group">
                              <ImageIcon size={14} className="text-zinc-400 group-hover:text-blue-500" />
                              <span className="text-[10px] font-bold text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">Add Option Image (Optional)</span>
                              <input 
                                type="file" 
                                accept="image/png, image/jpeg, image/jpg, image/webp" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const nextFiles = [...optionImageFiles];
                                    nextFiles[idx] = file;
                                    setOptionImageFiles(nextFiles);

                                    const nextPreviews = [...optionImagePreviews];
                                    nextPreviews[idx] = URL.createObjectURL(file);
                                    setOptionImagePreviews(nextPreviews);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Marks (Points)</label>
                  <input 
                    type="number"
                    step="0.5"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm font-bold"
                    value={newQuestion.points || 1}
                    onChange={e => setNewQuestion({...newQuestion, points: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Negative Marks</label>
                  <input 
                    type="number"
                    step="0.05"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm font-bold"
                    value={newQuestion.negativeMarks !== undefined ? newQuestion.negativeMarks : 0.25}
                    onChange={e => setNewQuestion({...newQuestion, negativeMarks: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Difficulty</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold text-sm"
                    value={newQuestion.difficulty || 'medium'}
                    onChange={e => setNewQuestion({...newQuestion, difficulty: e.target.value})}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Status</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold text-sm"
                    value={newQuestion.status || 'published'}
                    onChange={e => setNewQuestion({...newQuestion, status: e.target.value})}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Tags (Comma separated)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Board, SSC-2024, Important"
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm font-bold"
                    value={Array.isArray(newQuestion.tags) ? newQuestion.tags.join(', ') : (newQuestion.tags || '')}
                    onChange={e => setNewQuestion({...newQuestion, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl">
                <div>
                  <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 text-left">Is Premium Question</h4>
                  <p className="text-xs text-zinc-400 text-left">Premium questions require a premium membership to view detailed solutions.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewQuestion({...newQuestion, isPremium: !newQuestion.isPremium})}
                  className={`w-12 h-6 rounded-full p-1 transition-all shrink-0 ${newQuestion.isPremium ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${newQuestion.isPremium ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1 text-left block">Solution / Explanation (Text)</label>
                <textarea 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm h-24"
                  placeholder="Explain how to solve this question..."
                  value={newQuestion.explanation || ''}
                  onChange={e => setNewQuestion({...newQuestion, explanation: e.target.value})}
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1 block">Solution / Explanation Image (Optional)</label>
                {explanationImagePreview ? (
                  <div className="relative group border border-zinc-200 dark:border-zinc-700/80 rounded-2xl bg-zinc-50 dark:bg-zinc-950/20 p-4 flex items-center gap-4">
                    <img 
                      src={explanationImagePreview} 
                      alt="Solution preview" 
                      className="w-20 h-20 object-contain rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">Handwritten Math / PDF / Graph image</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Ready to save</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 hover:text-blue-600 text-xs px-3 py-2 rounded-xl font-bold transition-all">
                        Replace
                        <input 
                          type="file" 
                          accept="image/png, image/jpeg, image/jpg, image/webp" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setExplanationImageFile(file);
                              setExplanationImagePreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>
                      <button 
                        type="button" 
                        onClick={() => {
                          setExplanationImageFile(null);
                          setExplanationImagePreview(null);
                        }}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 dark:hover:border-blue-500/30 rounded-2xl p-6 bg-zinc-50/50 dark:bg-zinc-950/10 cursor-pointer transition-all hover:bg-blue-50/5 dark:hover:bg-blue-950/5 group text-center block">
                    <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 group-hover:text-blue-600 transition-colors shadow-sm mb-2 inline-block">
                      <ImageIcon size={20} />
                    </div>
                    <span className="text-m font-bold text-zinc-600 dark:text-zinc-300 block">Upload solution diagram / derivation image</span>
                    <span className="text-[9px] text-zinc-400 mt-1 uppercase tracking-wider block">Supports PNG, JPG, WEBP • Auto-compressed</span>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg, image/webp" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setExplanationImageFile(file);
                          setExplanationImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center gap-4 pt-4">
                <Button 
                  className="flex-1 py-4 bg-blue-600" 
                  icon={Save} 
                  onClick={handleAddQuestion}
                  disabled={isUploading}
                >
                  {editingQuestionId ? 'Update Question' : 'Save to Bank'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}


        {isAddingExam && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-4xl w-full shadow-2xl space-y-6 relative my-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    {editingExamId ? 'Edit Exam' : 'Create Scalable Exam'}
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium">Define rules and metadata for the online test.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { 
                  setIsAddingExam(false); 
                  setEditingExamId(null);
                }} className="rounded-xl"><X size={20} /></Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                       Identification
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Exam Title</label>
                      <input 
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white font-bold"
                        placeholder="e.g. Physics Chapter 3 Mock"
                        value={newExam.title || ''}
                        onChange={e => setNewExam({...newExam, title: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Class</label>
                        <select 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm font-bold"
                          value={newExam.class}
                          onChange={e => {
                            const newClass = e.target.value as AcademicClass;
                            setNewExam({
                              ...newExam, 
                              class: newClass, 
                              subject: '', 
                              chapter: '',
                              academicGroup: isGroupNeeded(newClass) ? (newExam.academicGroup === 'All' ? 'Science' : newExam.academicGroup) : 'All'
                            });
                          }}
                        >
                          <option value="">Select Class</option>
                          {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      {newExam.class && isGroupNeeded(newExam.class as string) && (
                        <div className="space-y-2 col-span-2 animate-in fade-in slide-in-from-top-2">
                          <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Academic Group / Stream</label>
                          <div className="flex flex-wrap gap-2">
                            {academicGroups.map(g => (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => setNewExam({ ...newExam, academicGroup: g.name })}
                                className={`flex-1 min-w-[100px] py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                                  newExam.academicGroup === g.name
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-blue-400'
                                }`}
                              >
                                {g.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Subject</label>
                        <select 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm font-bold"
                          value={newExam.subject}
                          onChange={e => setNewExam({...newExam, subject: e.target.value, chapter: ''})}
                          disabled={!newExam.class}
                        >
                          <option value="">Select Subject</option>
                          {getSubjectsForClass(newExam.class as string).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          {!newExam.class && <option disabled>Choose class first</option>}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Standard Chapter</label>
                        <select 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm font-bold"
                          value={newExam.chapter || ''}
                          onChange={e => {
                            const chap = e.target.value;
                            const topicsForChap = chap && chap !== 'All Chapters'
                              ? getTopicsForChapter(chap, newExam.subject || '', newExam.class as string)
                              : getTopicsForSubject(newExam.subject || '', newExam.class as string);
                            setNewExam({
                              ...newExam, 
                              chapter: chap,
                              topicIds: topicsForChap.map(t => t.id)
                            });
                          }}
                          disabled={!newExam.subject}
                        >
                          <option value="">Select Chapter</option>
                          <option value="All Chapters">All Chapters</option>
                          {getChaptersForSubject(newExam.subject as string, newExam.class as string).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          {!newExam.subject && <option disabled>Choose subject first</option>}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter Name Custom</label>
                        <input 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm"
                          placeholder="e.g. Vector & Mechanics"
                          value={newExam.chapterNameCustom || ''}
                          onChange={e => setNewExam({...newExam, chapterNameCustom: e.target.value})}
                        />
                      </div>
                    </div>

                    {newExam.subject && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Target Topics (Select relevant topics)</label>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                          {(() => {
                            const isSpecificChap = newExam.chapter && newExam.chapter !== 'All Chapters';
                            const topicsList = isSpecificChap
                              ? getTopicsForChapter(newExam.chapter || '', newExam.subject || '', newExam.class as string)
                              : getTopicsForSubject(newExam.subject || '', newExam.class as string);

                            if (topicsList.length === 0) {
                              return <p className="text-[10px] text-zinc-500 italic p-2">No topics found for this selection.</p>;
                            }

                            return topicsList.map(topic => (
                              <label key={topic.id} className="flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors">
                                <input 
                                  type="checkbox"
                                  checked={(newExam.topicIds || []).includes(topic.id)}
                                  onChange={(e) => {
                                    const ids = [...(newExam.topicIds || [])];
                                    if (e.target.checked) {
                                      ids.push(topic.id);
                                    } else {
                                      const idx = ids.indexOf(topic.id);
                                      if (idx > -1) ids.splice(idx, 1);
                                    }
                                    setNewExam({...newExam, topicIds: ids});
                                  }}
                                  className="w-4 h-4 rounded border-zinc-300 text-primary-palette focus:ring-primary-palette"
                                />
                                <span className="text-xs font-bold dark:text-zinc-300">{topic.name}</span>
                              </label>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Access Logic</label>
                      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                        <button 
                          onClick={() => setNewExam({...newExam, isPremium: false})}
                          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${!newExam.isPremium ? 'bg-white dark:bg-zinc-900 text-green-600 shadow-sm' : 'text-zinc-500'}`}
                        >
                          Regular (Free)
                        </button>
                        <button 
                          onClick={() => setNewExam({...newExam, isPremium: true})}
                          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${newExam.isPremium ? 'bg-amber-500 text-white shadow-sm' : 'text-zinc-500'}`}
                        >
                           Premium (Paid)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                       Logic & Scoring
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1 text-green-600">Exam Type</label>
                        <select 
                          className="w-full bg-green-50/50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4 rounded-2xl outline-none dark:text-white font-bold"
                          value={newExam.examType}
                          onChange={e => setNewExam({...newExam, examType: e.target.value as any})}
                        >
                          <option value="mcq">MCQ (Auto-Graded)</option>
                          <option value="written">Written</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Time Limit (Min)</label>
                        <input 
                          type="number"
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white font-bold text-center"
                          value={newExam.timeLimit || 30}
                          onChange={e => setNewExam({...newExam, timeLimit: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">Enable Negative Marking</p>
                          <p className="text-[10px] text-zinc-500">Penalty for wrong answers</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setNewExam({...newExam, negativeMarking: !newExam.negativeMarking})}
                          className={`w-12 h-6 rounded-full transition-colors relative ${newExam.negativeMarking ? 'bg-red-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newExam.negativeMarking ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      
                      {newExam.negativeMarking && (
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-red-500 uppercase">Penalty Value</span>
                          <input 
                            type="number"
                            step="0.05"
                            className="w-24 bg-white dark:bg-zinc-900 border border-red-500/30 p-2 rounded-lg outline-none text-right font-black"
                            value={newExam.negativeValue || 0.25}
                            onChange={e => setNewExam({...newExam, negativeValue: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                       Randomized Question Logic
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Question Display Count</label>
                      <input 
                        type="number"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white font-black text-2xl text-indigo-600"
                        value={newExam.totalQuestionsToShow || 30}
                        onChange={e => setNewExam({...newExam, totalQuestionsToShow: parseInt(e.target.value) || 0})}
                      />
                      <p className="text-[10px] text-zinc-500 leading-tight">
                        How many questions from the bank will be shown to the student? (e.g. "Generate 10 questions from the 100 available").
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Status</span>
                   <select 
                    className="bg-transparent text-sm font-black text-indigo-600 outline-none"
                    value={newExam.status}
                    onChange={e => setNewExam({...newExam, status: e.target.value as any})}
                   >
                     <option value="approved">Published</option>
                     <option value="pending">Draft</option>
                     <option value="rejected">Unlisted</option>
                   </select>
                 </div>
                 <div className="flex items-center gap-3">
                   <Button variant="ghost" onClick={() => setIsAddingExam(false)} className="rounded-2xl">Cancel</Button>
                   <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 min-w-[160px] py-4"
                    icon={isUploading ? RefreshCcw : Save}
                    onClick={handleAddExam}
                    disabled={isUploading}
                   >
                     {isUploading ? 'Saving...' : (editingExamId ? 'Update Exam' : 'Launch Exam')}
                   </Button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}

        {activePdf && (
          <PdfViewer 
            url={activePdf.url}
            isRestricted={activePdf.isRestricted}
            onClose={() => setActivePdf(null)}
          />
        )}

        {(activeVideo || activePlaylist) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white dark:bg-zinc-900 rounded-[24px] sm:rounded-[32px] w-full ${activePlaylist ? 'max-w-5xl' : 'max-w-2xl'} flex flex-col md:flex-row overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 md:h-[650px] h-[90svh] min-h-[500px] md:min-h-0`}
            >
              <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
                <div className="p-3 bg-zinc-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                      <Youtube size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-white tracking-tight truncate max-w-[150px] md:max-w-md">
                        {activePlaylist ? activePlaylist.title : (contents.find(c => getYouTubeId(c.url) === activeVideo)?.title || 'Video Class')}
                      </h3>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                        {activePlaylist ? `${activePlaylist.type === 'youtube' ? 'YouTube' : 'Custom'} Playlist` : 'Single Video'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white hover:bg-white/10 rounded-full"
                    onClick={() => {
                      setActiveVideo(null);
                      setActivePlaylist(null);
                    }}
                  >
                    <X size={18} />
                  </Button>
                </div>
                
                <div className="relative aspect-video w-full bg-black shadow-2xl overflow-hidden rounded-t-2xl sm:rounded-t-none">
                  {(activeVideo || (activePlaylist && activePlaylist.type === 'youtube')) ? (
                    <>
                      {isVideoLoading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 text-white">
                          <div className="w-10 h-10 border-4 border-zinc-700 border-t-red-600 rounded-full animate-spin mb-3" />
                          <p className="text-zinc-400 text-xs font-semibold tracking-wide">ভিডিও লোড হচ্ছে, সামান্য অপেক্ষা করুন...</p>
                        </div>
                      )}
                      <iframe 
                        src={(() => {
                          const videoId = getYouTubeId(activeVideo || '');
                          let baseUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1&enablejsapi=1&iv_load_policy=3&playsinline=1`;
                          if (activePlaylist) {
                            if (activePlaylist.type === 'custom' && activePlaylist.videoIds) {
                              const ids = contents
                                .filter(c => activePlaylist.videoIds?.includes(c.id))
                                .map(c => getYouTubeId(c.url))
                                .join(',');
                              if (ids) baseUrl += `&playlist=${ids}`;
                            }
                          }
                          return baseUrl;
                        })()} 
                        className="absolute inset-0 w-full h-full border-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        onLoad={() => setIsVideoLoading(false)}
                      />
                    </>
                  ) : (
                    <div className="text-center space-y-4 p-10">
                      <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto text-zinc-700 border border-zinc-800 shadow-inner">
                        <Play size={40} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-white font-black text-lg">No Video Selected</h4>
                        <p className="text-zinc-500 text-xs max-w-[250px] mx-auto leading-relaxed">Please select a video from the playlist on the right to start watching.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 bg-white dark:bg-zinc-900 p-6 overflow-y-auto custom-scrollbar">
                  {(() => {
                    const videos = activePlaylist?.type === 'youtube' 
                      ? fetchedPlaylistVideos 
                      : contents.filter(c => activePlaylist?.videoIds?.includes(c.id));
                    const currentIndex = videos.findIndex(v => getYouTubeId(v.url) === activeVideo);
                    const currentVideo = videos[currentIndex] || contents.find(c => getYouTubeId(c.url) === activeVideo);
                    
                    if (!currentVideo) return null;

                    return (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h2 className="text-xl font-black text-zinc-900 dark:text-white leading-tight tracking-tight">
                              {currentVideo.title}
                            </h2>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-none text-[10px] font-black uppercase">
                                {currentVideo.subject || activePlaylist?.subject}
                              </Badge>
                              <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none text-[10px] font-black uppercase">
                                {currentVideo.academic_class || activePlaylist?.academic_class}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-10 w-10 rounded-full border-zinc-200 dark:border-zinc-800"
                              onClick={handlePrevVideo}
                              disabled={currentIndex <= 0}
                            >
                              <ChevronLeft size={20} />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-10 w-10 rounded-full border-zinc-200 dark:border-zinc-800"
                              onClick={handleNextVideo}
                              disabled={currentIndex === -1 || currentIndex >= videos.length - 1}
                            >
                              <ChevronRight size={20} />
                            </Button>
                          </div>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Description</p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                            {currentVideo.description || activePlaylist?.description || "No description available for this video."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {activePlaylist && (
                <div className="w-full md:w-80 bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-[400px] md:h-auto">
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <List size={14} className="text-blue-600" />
                        Playlist Content
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 rounded-full text-zinc-400 hover:text-blue-600 ml-1"
                          onClick={async () => {
                            if (activePlaylist.youtubePlaylistId) {
                              setIsFetchingPlaylist(true);
                              const videos = await fetchPlaylistVideos(activePlaylist.youtubePlaylistId);
                              setFetchedPlaylistVideos(videos);
                              setIsFetchingPlaylist(false);
                            }
                          }}
                        >
                          <RefreshCw size={10} className={isFetchingPlaylist ? 'animate-spin' : ''} />
                        </Button>
                      </h4>
                      <Badge className="bg-blue-600 text-white border-none text-[9px] font-black px-2 py-0.5 rounded-full">
                        {(() => {
                          const videos = activePlaylist.type === 'youtube' ? fetchedPlaylistVideos : contents.filter(c => activePlaylist.videoIds?.includes(c.id));
                          const currentIndex = videos.findIndex(v => getYouTubeId(v.url) === activeVideo);
                          return `${currentIndex + 1} / ${videos.length}`;
                        })()}
                      </Badge>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: (() => {
                            const videos = activePlaylist.type === 'youtube' ? fetchedPlaylistVideos : contents.filter(c => activePlaylist.videoIds?.includes(c.id));
                            const currentIndex = videos.findIndex(v => getYouTubeId(v.url) === activeVideo);
                            return `${((currentIndex + 1) / videos.length) * 100}%`;
                          })()
                        }}
                        className="h-full bg-blue-600"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-zinc-50/50 dark:bg-zinc-950/20">
                    {activePlaylist.type === 'youtube' ? (
                      <div className="space-y-2">
                        {isFetchingPlaylist ? (
                          <div className="p-12 text-center space-y-6">
                            <div className="relative mx-auto w-20 h-20">
                              <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping" />
                              <div className="relative w-full h-full bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                                <Youtube size={32} className="animate-bounce" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">Syncing Playlist</p>
                              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed max-w-[150px] mx-auto text-center">
                                Connecting to YouTube to load your class videos.
                              </p>
                            </div>
                          </div>
                        ) : fetchedPlaylistVideos.length > 0 ? (
                          fetchedPlaylistVideos.map((video, index) => {
                            const ytId = getYouTubeId(video.url);
                            const isActive = activeVideo === ytId;
                            
                            return (
                              <button
                                key={video.id || `yt-${ytId || index}`}
                                id={`yt-sidebar-item-${ytId}`}
                                onClick={() => setActiveVideo(ytId)}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left group relative overflow-hidden ${
                                  isActive 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                    : 'hover:bg-white dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                                }`}
                              >
                                <div className="text-[10px] font-black w-4 text-center opacity-50">
                                  {index + 1}
                                </div>
                                <div className="relative w-24 aspect-video rounded-xl overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-800 shadow-sm border border-black/5">
                                  <img 
                                    src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    {isActive ? (
                                      <div className="flex gap-0.5 items-end h-3">
                                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-white rounded-full" />
                                        <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-white rounded-full" />
                                        <motion.div animate={{ height: [12, 6, 12] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-white rounded-full" />
                                      </div>
                                    ) : (
                                      <Play size={14} className="text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] font-black leading-tight mb-1 line-clamp-2 ${isActive ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                    {video.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge className={`px-1.5 py-0 border-none text-[8px] font-black uppercase tracking-tighter ${isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                      YouTube
                                    </Badge>
                                    {video.duration && (
                                      <Badge className={`px-1.5 py-0 border-none text-[8px] font-black tracking-tighter ${isActive ? 'bg-white/20 text-white' : 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                                        {video.duration}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {isActive && (
                                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30" />
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center space-y-6">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto text-blue-600 shadow-inner">
                              <List size={32} />
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-zinc-900 dark:text-zinc-100 font-black uppercase tracking-tight">Playlist Ready</p>
                              <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                                Use the YouTube controls in the player to skip between videos.
                              </p>
                            </div>
                            <Button 
                              variant="outline"
                              className="w-full text-[10px] font-black uppercase tracking-widest h-11 border-zinc-200 dark:border-zinc-800 rounded-xl"
                              onClick={() => window.open(`https://www.youtube.com/playlist?list=${activePlaylist.youtubePlaylistId}`, '_blank')}
                            >
                              View Entire List on YT
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activePlaylist.videoIds?.map((videoId, index) => {
                          const video = contents.find(c => c.id === videoId);
                          if (!video) return null;
                          const ytId = getYouTubeId(video.url);
                          const isActive = activeVideo === ytId;
                          
                          return (
                            <button
                              key={`${videoId}-${index}`}
                              id={`yt-sidebar-item-${ytId}`}
                              onClick={() => setActiveVideo(ytId)}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left group relative overflow-hidden ${
                                isActive 
                                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                  : 'hover:bg-white dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                              }`}
                            >
                              <div className="text-[10px] font-black w-4 text-center opacity-50">
                                {index + 1}
                              </div>
                              <div className="relative w-24 aspect-video rounded-xl overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-800 shadow-sm border border-black/5">
                                <img 
                                  src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                  {isActive ? (
                                    <div className="flex gap-0.5 items-end h-3">
                                      <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-white rounded-full" />
                                      <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-white rounded-full" />
                                      <motion.div animate={{ height: [12, 6, 12] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-white rounded-full" />
                                    </div>
                                  ) : (
                                    <Play size={14} className="text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-black leading-tight mb-1 line-clamp-2 ${isActive ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                  {video.title}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <Badge className={`px-1.5 py-0 border-none text-[8px] font-black uppercase tracking-tighter ${isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                    {video.subject}
                                  </Badge>
                                </div>
                              </div>
                              {isActive && (
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30" />
                              )}
                            </button>
                          );
                        })}
                        {(!activePlaylist.videoIds || activePlaylist.videoIds.length === 0) && (
                          <div className="py-12 text-center space-y-3">
                            <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-zinc-400">
                              <List size={24} />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Empty Playlist</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {deletingId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Delete Item?</h3>
                <p className="text-zinc-500 font-medium">This action cannot be undone. Are you sure you want to remove this resource?</p>
              </div>

              {uploadError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold">
                  {uploadError}
                </div>
              )}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 py-4 rounded-2xl" 
                  onClick={() => { setDeletingId(null); setUploadError(null); }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 rounded-2xl" 
                  onClick={() => {
                    if (externalResources.find(r => r.id === deletingId)) {
                      confirmDeleteExternal();
                    } else if (allPlaylists.find(p => p.id === deletingId) || userPlaylists.find(p => p.id === deletingId)) {
                      confirmDeletePlaylist();
                    } else if (deleteBankId) {
                      confirmDeleteQuestion();
                    } else {
                      confirmDeleteContent(deletingId);
                    }
                  }}
                  disabled={isDeleting}
                  icon={isDeleting ? RefreshCcw : Trash2}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingExternal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Add External Link</h3>
                <Button variant="ghost" size="icon" onClick={() => { 
                  setIsAddingExternal(false); 
                  setGlobalError(null); 
                  setExternalThumbnailFile(null);
                }}><X size={20} /></Button>
              </div>

              {globalError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                  {globalError}
                </div>
              )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Icon (Emoji) & Platform Name</label>
                        <div className="flex gap-4">
                          <input 
                            className="w-20 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-center text-xl"
                            placeholder="🎓"
                            value={newExternal.icon}
                            onChange={e => setNewExternal({...newExternal, icon: e.target.value})}
                          />
                          <input 
                            className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                            placeholder="e.g. 10 Minute School"
                            value={newExternal.title}
                            onChange={e => setNewExternal({...newExternal, title: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Image Thumbnail (Upload or Paste Link)</label>
                        <div className="space-y-3">
                          <div 
                            onClick={() => document.getElementById('external-thumb')?.click()}
                            className="w-full aspect-video bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors overflow-hidden group relative"
                          >
                            {(externalThumbnailPreview || newExternal.thumbnail) ? (
                              <img src={getDirectImageUrl(externalThumbnailPreview || newExternal.thumbnail)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <>
                                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-2">
                                  <Upload className="text-zinc-400" size={20} />
                                </div>
                                <span className="text-xs text-zinc-500 font-medium">Click to Upload Image</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OR</span>
                            <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                          </div>
                          <input 
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm"
                            placeholder="Paste Google Image URL..."
                            value={newExternal.thumbnail && !externalThumbnailPreview ? newExternal.thumbnail : ''}
                            onChange={e => {
                              setNewExternal({...newExternal, thumbnail: e.target.value});
                              setExternalThumbnailPreview(null);
                              setExternalThumbnailFile(null);
                            }}
                          />
                        </div>
                        <input 
                          type="file"
                          id="external-thumb"
                          className="hidden"
                          accept="image/*"
                          onChange={handleExternalThumbnailChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Description</label>
                        <textarea 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white min-h-[100px]"
                          placeholder="Brief description..."
                          value={newExternal.description}
                          onChange={e => setNewExternal({...newExternal, description: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Platform Website URL</label>
                        <input 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                          placeholder="https://..."
                          value={newExternal.url}
                          onChange={e => setNewExternal({...newExternal, url: e.target.value})}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Target Chapter</label>
                        <input 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                          placeholder="e.g. Chapter 1 or All"
                          value={newExternal.chapter || ''}
                          onChange={e => setNewExternal({...newExternal, chapter: e.target.value})}
                        />
                      </div>
                    </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 py-4 rounded-2xl" 
                  onClick={() => setIsAddingExternal(false)}
                  disabled={isUploadingExternal}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white font-bold" 
                  onClick={handleAddExternal}
                  disabled={isUploadingExternal}
                >
                  {isUploadingExternal ? <RefreshCcw className="animate-spin" size={20} /> : 'Save Link'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {isFeedbackOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Send Feedback</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsFeedbackOpen(false)}><X size={20} /></Button>
              </div>
              
              {!user ? (
                <div className="text-center p-6 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 space-y-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                    <Lock size={22} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-zinc-900 dark:text-white">Account Required</h4>
                    <p className="text-xs text-zinc-500 max-w-[280px] mx-auto leading-relaxed">To prevent spam, feedback submission requires a registered student account. Please sign in to tell us what you think.</p>
                  </div>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 duration-200"
                    onClick={() => {
                      setIsFeedbackOpen(false);
                      handleLogin();
                    }}
                  >
                    Continue with Google
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-500 font-medium">Your feedback helps us improve Parodorshhi for everyone.</p>
                  <textarea 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white min-h-[150px] text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-zinc-400 animate-in fade-in"
                    placeholder="Tell us what you think..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 py-4 rounded-2xl" onClick={() => setIsFeedbackOpen(false)}>Cancel</Button>
                    <Button 
                      className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white font-bold" 
                      onClick={handleSendFeedback}
                      disabled={isSendingFeedback || !feedbackText.trim()}
                    >
                      {isSendingFeedback ? <RefreshCcw className="animate-spin" size={20} /> : 'Submit'}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {examPrep && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl overflow-hidden border border-white/20 dark:border-zinc-800 my-auto"
            >
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                    <Trophy size={32} />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Ready to Start?</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">Review the exam details before beginning your test session.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Exam Summary */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">Target Class</span>
                      <Badge className="bg-zinc-900 dark:bg-white dark:text-zinc-900 border-none text-[10px] py-0.5">{examPrep.class}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">Subject</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{examPrep.subject}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">Chapter</span>
                      <input 
                        className="bg-transparent border-b border-zinc-200 dark:border-zinc-700 text-right text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none w-1/2 p-0 focus:border-blue-500 transition-colors"
                        value={examPrep.chapter || ''}
                        placeholder="All Chapters"
                        onChange={e => setExamPrep({...examPrep, chapter: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">Time Limit</span>
                      <span className="text-xs font-bold text-blue-600">{examPrep.time_limit} Minutes</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full py-4 bg-blue-600 shadow-lg shadow-blue-500/20"
                    onClick={() => handleStartExam(examPrep)}
                    icon={Play}
                  >
                    Confirm & Start
                  </Button>
                </div>

                <div className="pt-2">
                  <Button
                    variant="ghost"
                    className="w-full rounded-2xl text-zinc-400 hover:text-red-500 hover:bg-red-500/5"
                    onClick={() => setExamPrep(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showPremiumPromptModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 my-auto p-8 text-center space-y-6"
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 animate-pulse">
                  <Crown size={32} fill="currentColor" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">প্রিমিয়াম ফিচারে অ্যাক্সেস করুন ✨</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed font-semibold">
                    কাস্টম এলিট পরীক্ষা তৈরি, চ্যাপ্টার-ভিত্তিক অ্যাডভান্সড এনালাইটিক্স, ব্যাখ্যাসহ সলিউশন ও প্রিমিয়াম প্র্যাকটিস শিটের মতো প্রিমিয়াম শিক্ষাসেবা আনলক করতে আপনার একটি প্যারাডক্সিশি প্রিমিয়াম সাবস্ক্রিপশন প্রয়োজন।
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black shadow-lg shadow-amber-500/10 font-bold tracking-wider"
                  onClick={() => {
                    setView('premium-subscription');
                    setShowPremiumPromptModal(false);
                  }}
                  icon={ChevronRight}
                >
                  সাবস্ক্রিপশন প্ল্যান দেখুন ৳
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full rounded-2xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all text-xs font-bold"
                  onClick={() => {
                    setShowPremiumPromptModal(false);
                    setView('home');
                  }}
                >
                  ফ্রি ড্যাশবোর্ডে ফিরে যান
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isGeneratingExam && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="text-center space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <Trophy className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white tracking-tight">Generating Exam...</h3>
              <p className="text-zinc-400 text-sm font-medium">Randomizing questions from the bank just for you.</p>
            </div>
          </motion.div>
        </div>
      )}

      {renderFooter()}
    </div>
    </div>
  );
}

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GoogleGenAI, Type } from "@google/genai";
import { supabaseService } from '../services/supabaseService';
import { 
  ContentItem, Category, AcademicClass, ExternalResource, Feedback, Playlist, 
  Exam, Question, ExamAttempt, LeaderboardEntry, AcademicClassInfo, 
  AcademicSubject, AcademicChapter, AcademicTopic, AcademicGroup, UserStats 
} from '../types';
import { User } from '@supabase/supabase-js';

export interface AppContextType {
  // Auth & User
  user: any | null;
  setUser: React.Dispatch<React.SetStateAction<any | null>>;
  firestoreUser: any | null;
  setFirestoreUser: React.Dispatch<React.SetStateAction<any | null>>;
  userRole: 'user' | 'admin';
  setUserRole: React.Dispatch<React.SetStateAction<'user' | 'admin'>>;
  isAuthReady: boolean;
  setIsAuthReady: React.Dispatch<React.SetStateAction<boolean>>;
  canUpload: boolean;
  setCanUpload: React.Dispatch<React.SetStateAction<boolean>>;
  canManageExams: boolean;
  setCanManageExams: React.Dispatch<React.SetStateAction<boolean>>;
  canManageQuestions: boolean;
  setCanManageQuestions: React.Dispatch<React.SetStateAction<boolean>>;
  canManageResources: boolean;
  setCanManageResources: React.Dispatch<React.SetStateAction<boolean>>;
  isPremium: boolean;
  setIsPremium: React.Dispatch<React.SetStateAction<boolean>>;
  globalPremiumMode: boolean;
  setGlobalPremiumMode: React.Dispatch<React.SetStateAction<boolean>>;
  hasPremiumAccess: boolean;
  hasAdminAccess: boolean;

  // UI & Storage
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  bookmarks: string[];
  setBookmarks: React.Dispatch<React.SetStateAction<string[]>>;
  globalError: string | null;
  setGlobalError: React.Dispatch<React.SetStateAction<string | null>>;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Global Data
  contents: ContentItem[];
  setContents: React.Dispatch<React.SetStateAction<ContentItem[]>>;
  allContents: ContentItem[];
  setAllContents: React.Dispatch<React.SetStateAction<ContentItem[]>>;
  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  allPlaylists: Playlist[];
  setAllPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  externalResources: ExternalResource[];
  setExternalResources: React.Dispatch<React.SetStateAction<ExternalResource[]>>;
  dynamicClasses: AcademicClassInfo[];
  setDynamicClasses: React.Dispatch<React.SetStateAction<AcademicClassInfo[]>>;
  dynamicSubjects: AcademicSubject[];
  setDynamicSubjects: React.Dispatch<React.SetStateAction<AcademicSubject[]>>;
  dynamicChapters: AcademicChapter[];
  setDynamicChapters: React.Dispatch<React.SetStateAction<AcademicChapter[]>>;
  dynamicTopics: AcademicTopic[];
  setDynamicTopics: React.Dispatch<React.SetStateAction<AcademicTopic[]>>;
  academicGroups: AcademicGroup[];
  setAcademicGroups: React.Dispatch<React.SetStateAction<AcademicGroup[]>>;

  // Admin and Lists
  allUsers: any[];
  setAllUsers: React.Dispatch<React.SetStateAction<any[]>>;
  adminUserSearchQuery: string;
  setAdminUserSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  adminUserCategory: 'all' | 'normal' | 'premium';
  setAdminUserCategory: React.Dispatch<React.SetStateAction<'all' | 'normal' | 'premium'>>;
  filteredUsers: any[];
  allFeedback: Feedback[];
  setAllFeedback: React.Dispatch<React.SetStateAction<Feedback[]>>;
  allExams: Exam[];
  setAllExams: React.Dispatch<React.SetStateAction<Exam[]>>;
  allQuestions: Question[];
  setAllQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  premiumStudents: any[];

  // Saved & Wrong Question structures
  savedQuestionIds: Set<string>;
  setSavedQuestionIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleToggleSaveQuestion: (questionId: string) => Promise<void>;
  qSavedQuestionsData: any[] | undefined;
  qWrongQuestionsData: any[] | undefined;
  qExamAttemptsData: any[] | undefined;
  qLeaderboardData: any | undefined;
  refetchSavedQuestions: () => void;
  refetchWrongQuestions: () => void;

  // Global filters
  classFilter: string;
  setClassFilter: React.Dispatch<React.SetStateAction<string>>;
  groupFilter: string;
  setGroupFilter: React.Dispatch<React.SetStateAction<string>>;
  subjectFilter: string;
  setSubjectFilter: React.Dispatch<React.SetStateAction<string>>;
  chapterFilter: string;
  setChapterFilter: React.Dispatch<React.SetStateAction<string>>;
  topicFilter: string;
  setTopicFilter: React.Dispatch<React.SetStateAction<string>>;
  yearFilter: string;
  setYearFilter: React.Dispatch<React.SetStateAction<string>>;
  contentTypeFilter: 'free' | 'premium';
  setContentTypeFilter: React.Dispatch<React.SetStateAction<'free' | 'premium'>>;
  selectedCategory: Category | null;
  setSelectedCategory: React.Dispatch<React.SetStateAction<Category | null>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  showPremiumPromptModal: boolean;
  setShowPremiumPromptModal: React.Dispatch<React.SetStateAction<boolean>>;

  // Helper functions
  classes: string[];
  subjectsFilterList: string[];
  getSubjectNamesForClass: (className: string | 'All', groupName?: string) => string[];
  currentSubjects: string[];
  isGroupNeeded: (className: any) => boolean;
  refreshAcademicData: () => Promise<void>;
  ai: GoogleGenAI | null;
}

export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [allContents, setAllContents] = useState<ContentItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
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
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useLocalStorage('parodorshhi_darkmode', false);
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // App Filter States (Required by functions, defaults)
  const [classFilter, setClassFilter] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [chapterFilter, setChapterFilter] = useState<string>('');
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('All Years');
  const [contentTypeFilter, setContentTypeFilter] = useState<'free' | 'premium'>('free');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPremiumPromptModal, setShowPremiumPromptModal] = useState(false);

  // Reset downstream filters for home/classes
  useEffect(() => {
    setGroupFilter('');
    setSubjectFilter('All');
    setChapterFilter('');
    setTopicFilter('');
  }, [classFilter]);

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

  // Sync Global Premium setting
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
  }, [isPremium, firestoreUser?.hasPremiumAccess, firestoreUser?.premiumExpiry, userRole, globalPremiumMode]);

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
  }, [allUsers]);

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

  const isGroupNeeded = useCallback((className: any) => {
    if (!className || typeof className !== 'string') return false;
    const foundClass = dynamicClasses.find(c => c.name === className);
    if (foundClass) {
      return foundClass.has_groups ?? (foundClass as any).hasGroups ?? false;
    }
    const nameLower = className.toLowerCase();
    if (nameLower === 'ssc' || nameLower === 'hsc' || nameLower === 'admission') {
      return true;
    }
    return false;
  }, [dynamicClasses]);

  const getSubjectNamesForClass = useCallback((className: string | 'All', groupName: string = 'All') => {
    if (className === '') return [];
    if (className === 'All') {
      return Array.from(new Set(dynamicSubjects.map(s => s.name)));
    }
    const matchedClass = dynamicClasses.find(c => c.name === className);
    if (!matchedClass) return [];
    
    const subjectNames = dynamicSubjects.filter(s => {
      const matchClass = s.classId === matchedClass.id;
      const sGroup = (s.academicGroup || (s as any).academic_group || 'All').trim().toLowerCase();
      const filterGroup = (groupName || 'All').trim().toLowerCase();
      const matchGroup = filterGroup === 'all' || filterGroup === '' || sGroup === filterGroup || sGroup === 'all';
      return matchClass && matchGroup;
    }).map(s => s.name);
    return Array.from(new Set(subjectNames));
  }, [dynamicSubjects, dynamicClasses]);

  const currentSubjects = useMemo(() => getSubjectNamesForClass(classFilter, groupFilter), [getSubjectNamesForClass, classFilter, groupFilter]);

  const classes: string[] = useMemo(() => {
    return Array.from(new Set(dynamicClasses.map(c => c.name))).filter(Boolean) as string[];
  }, [dynamicClasses]);

  const subjectsFilterList = useMemo(() => {
    return ['All', ...currentSubjects];
  }, [currentSubjects]);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      const session = res?.data?.session;
      if (session?.user) {
        const mappedUser = {
          id: session.user.id,
          uid: session.user.id,
          email: session.user.email,
          phone: session.user.phone || '',
          phoneVerified: !!session.user.phone_confirmed_at,
          displayName: session.user.user_metadata?.full_name || session.user.phone || session.user.email,
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
      if (session?.user) {
        const mappedUser = {
          id: session.user.id,
          uid: session.user.id,
          email: session.user.email,
          phone: session.user.phone || '',
          phoneVerified: !!session.user.phone_confirmed_at,
          displayName: session.user.user_metadata.full_name || session.user.phone || session.user.email,
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

  // --- QUERY DEFINITIONS ---

  // 1. Profile Query
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

  // Active Premium Students Query
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

  // 4. Resources Query
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

  // --- SYNCHRONIZATION EFFECTS ---

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
          phoneNumber: profile.phone_number,
          school_name: profile.school_name || '',
          schoolName: profile.school_name || ''
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
            phoneNumber: newProfile.phone_number,
            school_name: newProfile.school_name || '',
            schoolName: newProfile.school_name || ''
          };
          setFirestoreUser(mappedNewProfile);
        }
      }
    };

    syncProfile();
  }, [qProfileData, user, dynamicClasses]);

  // Realtime updates central listener
  useEffect(() => {
    console.log("[ReactQuery] Registering central realtime sub for all schema changes...");
    const centralChannel = supabase
      .channel('schema-changes-sync-all')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log("[ReactQuery] Schema change detected on table", payload.table, payload);
        const { table } = payload;
        
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
        } else if (['notes', 'books', 'video_classes', 'practice_sheets', 'external_links'].includes(table)) {
          queryClient.invalidateQueries({ queryKey: ['resources'] });
        } else if (table === 'playlists') {
          queryClient.invalidateQueries({ queryKey: ['playlists'] });
        } else if (table === 'exams') {
          queryClient.invalidateQueries({ queryKey: ['exams'] });
        } else if (table === 'questions') {
          queryClient.invalidateQueries({ queryKey: ['questions'] });
        } else if (table === 'newsletter_subscribers') {
          queryClient.invalidateQueries({ queryKey: ['newsletter_subscribers'] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(centralChannel);
    };
  }, [user, queryClient]);

  // Sync resources, playlists, externalResources, exams
  useEffect(() => {
    if (qResourcesData) {
      setContents(qResourcesData as ContentItem[]);
      setAllContents(qResourcesData as ContentItem[]);
    }
  }, [qResourcesData]);

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

  useEffect(() => {
    if (qExamsData) {
      setAllExams(qExamsData as Exam[]);
    }
  }, [qExamsData]);

  // Saved Questions Sync Set
  useEffect(() => {
    if (qSavedQuestionsData) {
      setSavedQuestionIds(new Set(qSavedQuestionsData.map((q: any) => q.id)));
    }
  }, [qSavedQuestionsData]);

  // Feedback Sync
  useEffect(() => {
    if (qFeedbackData) {
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
    }
  }, [qFeedbackData]);

  // Dynamic fetching of academic data
  const fetchClassesAndGroups = async () => {
    try {
      const { data: classData, error: classError } = await supabase
        .from('academic_classes')
        .select('*');
      
      if (classError) throw classError;

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
    fetchSubjects();
    fetchChapters();
    fetchAllTopics();
  }, []);

  // Initial local DB resources / exams fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
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

    fetchInitialData();
  }, [userRole, canUpload]);

  return (
    <AppContext.Provider value={{
      user, setUser,
      firestoreUser, setFirestoreUser,
      userRole, setUserRole,
      isAuthReady, setIsAuthReady,
      canUpload, setCanUpload,
      canManageExams, setCanManageExams,
      canManageQuestions, setCanManageQuestions,
      canManageResources, setCanManageResources,
      isPremium, setIsPremium,
      globalPremiumMode, setGlobalPremiumMode,
      hasPremiumAccess,
      hasAdminAccess,
      isDarkMode, setIsDarkMode,
      bookmarks, setBookmarks,
      globalError, setGlobalError,
      isMobileMenuOpen, setIsMobileMenuOpen,
      contents, setContents,
      allContents, setAllContents,
      playlists, setPlaylists,
      allPlaylists, setAllPlaylists,
      externalResources, setExternalResources,
      dynamicClasses, setDynamicClasses,
      dynamicSubjects, setDynamicSubjects,
      dynamicChapters, setDynamicChapters,
      dynamicTopics, setDynamicTopics,
      academicGroups, setAcademicGroups,
      allUsers, setAllUsers,
      adminUserSearchQuery, setAdminUserSearchQuery,
      adminUserCategory, setAdminUserCategory,
      filteredUsers,
      allFeedback, setAllFeedback,
      allExams, setAllExams,
      allQuestions, setAllQuestions,
      premiumStudents,
      savedQuestionIds, setSavedQuestionIds,
      handleToggleSaveQuestion,
      qSavedQuestionsData,
      qWrongQuestionsData,
      qExamAttemptsData,
      qLeaderboardData,
      refetchSavedQuestions,
      refetchWrongQuestions,
      classFilter, setClassFilter,
      groupFilter, setGroupFilter,
      subjectFilter, setSubjectFilter,
      chapterFilter, setChapterFilter,
      topicFilter, setTopicFilter,
      yearFilter, setYearFilter,
      contentTypeFilter, setContentTypeFilter,
      selectedCategory, setSelectedCategory,
      searchQuery, setSearchQuery,
      showPremiumPromptModal, setShowPremiumPromptModal,
      classes,
      subjectsFilterList,
      getSubjectNamesForClass,
      currentSubjects,
      isGroupNeeded,
      refreshAcademicData,
      ai
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
};

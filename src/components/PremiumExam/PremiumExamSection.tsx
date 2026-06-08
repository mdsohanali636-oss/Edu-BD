import React, { useState, useEffect, useMemo } from 'react';
import { 
  Crown, 
  Sparkles, 
  Zap, 
  Clock, 
  Brain as BrainIcon, 
  Settings, 
  ChevronRight, 
  Plus, 
  Save, 
  History,
  LayoutGrid,
  BarChart3,
  Search,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Card, Badge } from '../ui/Base';
import { PremiumExamBuilder } from './PremiumExamBuilder';
import { PremiumAnalytics } from './PremiumAnalytics';
import { PremiumExamInterface } from './PremiumExamInterface';
import { 
  CustomExamSettings, 
  ExamTemplate, 
  UserAnalytics, 
  Question,
  AcademicClass,
  ExamAttempt,
  AcademicClassInfo,
  AcademicSubject,
  AcademicChapter,
  AcademicTopic
} from '../../types';
import { supabase } from '../../supabaseClient';
import { supabaseService } from '../../services/supabaseService';

type ViewMode = 'dashboard' | 'builder' | 'analytics' | 'templates';

interface Props {
  user: any; // Using simplified any for user as it's passed from App.tsx (Supabase session user)
  dynamicClasses: AcademicClassInfo[];
  dynamicSubjects: AcademicSubject[];
  dynamicChapters: AcademicChapter[];
  dynamicTopics: AcademicTopic[]; // Added
  fetchLeaderboards?: () => void;
  onCustomExamFinished?: (customExam: any, result: any) => void;
  savedQuestionIds?: Set<string>;
  onToggleSaveQuestion?: (qId: string) => void;
}

export const PremiumExamSection: React.FC<Props> = ({ 
  user, 
  dynamicClasses,
  dynamicSubjects,
  dynamicChapters,
  dynamicTopics, // Added
  fetchLeaderboards,
  onCustomExamFinished,
  savedQuestionIds = new Set(),
  onToggleSaveQuestion
}) => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [activeExam, setActiveExam] = useState<{ settings: CustomExamSettings; questions: Question[] } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [allAttempts, setAllAttempts] = useState<ExamAttempt[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any | null>(null);

  // Dynamic Analytics Calculation
  const analytics = useMemo<UserAnalytics>(() => {
    if (allAttempts.length === 0) {
      const dbStreak = userStats?.streak || 0;
      const dbAccuracy = userStats?.accuracy || 0;
      return {
        userId: user?.id || 'guest',
        accuracy: dbAccuracy,
        speed: userStats?.completion_time ? Number((userStats.total_exams / (userStats.completion_time / 60 || 1)).toFixed(1)) : 0,
        strongChapters: userStats?.strongest_chapter && userStats.strongest_chapter !== 'All' ? [userStats.strongest_chapter] : [],
        weakChapters: userStats?.weakest_chapter && userStats.weakest_chapter !== 'All' ? [userStats.weakest_chapter] : [],
        improvementData: [],
        mistakePatterns: ['এখনও কোনো প্যাটার্ন পাওয়া যায়নি। আপনার দক্ষতা যাচাই করতে অন্তত একটি পরীক্ষা সম্পন্ন করুন।'],
        fastestSubject: userStats?.strongest_subject || 'তথ্য নেই',
        fastestSpeed: 0,
        slowestSubject: userStats?.weakest_subject || 'তথ্য নেই',
        slowestSpeed: 0,
        examDNA: {
          traits: dbAccuracy >= 80 ? ['নির্ভুল বিশেষজ্ঞ'] : ['নতুন অভিযাত্রী'],
          description: 'আপনার এক্সাম প্রোফাইল তৈরি হচ্ছে। আরও কিছু পরীক্ষায় অংশ নিয়ে আপনার দক্ষতা এবং শেখার ধরন উন্মোচন করুন।'
        },
        strongTopics: [],
        weakTopics: [],
        consistency: 0,
        streak: dbStreak,
        predictiveScore: dbAccuracy,
        skippedPatterns: ['কোনো এড়ানো প্রশ্ন পাওয়া যায়নি।'],
        smartRoadmap: [
          '১. আপনার প্রথম পরীক্ষাটি শুরু করুন।',
          '২. অধ্যায়ভিত্তিক পারফরম্যান্স অর্জন করুন।',
          '৩. আমাদের AI আপনার শক্তি ও দুর্বলতা বিশ্লেষণ করবে।'
        ],
        subjectPerformance: []
      };
    }

    const parsedAttempts = allAttempts.map(att => {
      const correct = Number(att.correctCount ?? (att as any).correct_count ?? (att as any).correct_answers ?? 0);
      const totalQ = Number(att.totalQuestions ?? (att as any).total_questions ?? 1);
      const timeT = Number(att.timeTaken ?? (att as any).time_taken ?? (att as any).completion_time ?? 0);
      const scoreVal = Number(att.score ?? 0);
      const completed = att.completedAt ?? (att as any).completed_at ?? (att as any).submitted_at ?? new Date().toISOString();
      const sub = (att as any).subject ?? 'General';
      const chap = (att as any).chapter ?? 'All';
      const top = (att as any).topic ?? 'All';
      const wrong = Number((att as any).wrong_count ?? (att as any).wrong_answers ?? 0);
      const unanswered = Number((att as any).unanswered_count ?? (att as any).skipped_answers ?? (att as any).skipped_count ?? 0);
      
      return {
        ...att,
        correctCount: correct,
        totalQuestions: totalQ || 1,
        timeTaken: timeT,
        score: scoreVal,
        completedAt: completed,
        subject: sub,
        chapter: chap,
        topic: top,
        wrongCount: wrong,
        unansweredCount: unanswered
      };
    });

    // 1. Accuracy (Weighted)
    const totalCorrect = parsedAttempts.reduce((acc, curr) => acc + curr.correctCount, 0);
    const totalQuestionsSum = parsedAttempts.reduce((acc, curr) => acc + curr.totalQuestions, 0);
    const avgAccuracy = Math.round((totalCorrect / (totalQuestionsSum || 1)) * 100);
    
    // 2. Speed (Questions per minute)
    const totalTimeSeconds = parsedAttempts.reduce((acc, curr) => acc + curr.timeTaken, 0);
    const avgSpeed = totalTimeSeconds > 0 
      ? Number((totalQuestionsSum / (totalTimeSeconds / 60)).toFixed(1)) 
      : 0;

    // 3. Subject-wise Analysis
    const subjectStatsMap: Record<string, { totalTime: number, totalQuestions: number, correct: number, wrong: number, count: number }> = {};
    parsedAttempts.forEach((att) => {
      const sub = att.subject || 'General';
      if (!subjectStatsMap[sub]) {
        subjectStatsMap[sub] = { totalTime: 0, totalQuestions: 0, correct: 0, wrong: 0, count: 0 };
      }
      subjectStatsMap[sub].totalTime += att.timeTaken || 0;
      subjectStatsMap[sub].totalQuestions += att.totalQuestions || 0;
      subjectStatsMap[sub].correct += att.correctCount || 0;
      subjectStatsMap[sub].wrong += att.wrongCount || 0;
      subjectStatsMap[sub].count += 1;
    });

    let fastestSub = 'তথ্য নেই';
    let slowestSub = 'তথ্য নেই';
    let minTimePerQ = Infinity;
    let maxTimePerQ = -Infinity;
    const subjectPerformanceList: { name: string; accuracy: number; totalExams: number }[] = [];

    Object.entries(subjectStatsMap).forEach(([subId, stats]) => {
      const timePerQ = stats.totalQuestions > 0 ? stats.totalTime / stats.totalQuestions : Infinity;
      const subName = dynamicSubjects.find(s => s.id === subId)?.name || subId;
      const subAcc = Math.round((stats.correct / (stats.totalQuestions || 1)) * 100);
      
      subjectPerformanceList.push({
        name: subName,
        accuracy: subAcc,
        totalExams: stats.count
      });

      if (timePerQ < minTimePerQ) {
        minTimePerQ = timePerQ;
        fastestSub = subName;
      }
      if (timePerQ > maxTimePerQ && timePerQ !== Infinity) {
        maxTimePerQ = timePerQ;
        slowestSub = subName;
      }
    });

    const strongestSubjectObj = subjectPerformanceList.length > 0
      ? [...subjectPerformanceList].sort((a, b) => b.accuracy - a.accuracy)[0]
      : null;
    const weakestSubjectObj = subjectPerformanceList.length > 0
      ? [...subjectPerformanceList].sort((a, b) => a.accuracy - b.accuracy)[0]
      : null;

    // 4. Chapter-wise Analysis
    const chapterStatsMap: Record<string, { total: number, correct: number }> = {};
    parsedAttempts.forEach(att => {
      const chap = att.chapter || 'All';
      if (chap === 'All') return;
      if (!chapterStatsMap[chap]) chapterStatsMap[chap] = { total: 0, correct: 0 };
      chapterStatsMap[chap].total += att.totalQuestions;
      chapterStatsMap[chap].correct += att.correctCount;
    });

    const strongChapters: string[] = [];
    const weakChapters: string[] = [];
    Object.entries(chapterStatsMap).forEach(([chap, stats]) => {
      const actAcc = (stats.correct / (stats.total || 1)) * 100;
      if (actAcc >= 70) {
        strongChapters.push(chap);
      } else if (actAcc < 60) {
        weakChapters.push(chap);
      }
    });

    // 5. Topic-wise Analysis
    const topicStatsMap: Record<string, { total: number, correct: number, wrong: number, skipped: number }> = {};
    parsedAttempts.forEach(att => {
      const top = att.topic || 'All';
      if (top === 'All') return;
      if (!topicStatsMap[top]) topicStatsMap[top] = { total: 0, correct: 0, wrong: 0, skipped: 0 };
      topicStatsMap[top].total += att.totalQuestions;
      topicStatsMap[top].correct += att.correctCount;
      topicStatsMap[top].wrong += att.wrongCount;
      topicStatsMap[top].skipped += att.unansweredCount;
    });

    const strongTopics: string[] = [];
    const weakTopics: string[] = [];
    let mostIncorrectTopicValue = '';
    let maxWrongs = -1;
    let mostSkippedTopicValue = '';
    let maxSkips = -1;

    Object.entries(topicStatsMap).forEach(([top, stats]) => {
      const actAcc = (stats.correct / (stats.total || 1)) * 100;
      if (actAcc >= 70) {
        strongTopics.push(top);
      } else if (actAcc < 60) {
        weakTopics.push(top);
      }
      
      if (stats.wrong > maxWrongs) {
        maxWrongs = stats.wrong;
        mostIncorrectTopicValue = top;
      }
      if (stats.skipped > maxSkips) {
        maxSkips = stats.skipped;
        mostSkippedTopicValue = top;
      }
    });

    // 6. Consistency index
    const consistencyExams = parsedAttempts.filter(att => {
      const attAcc = (att.correctCount / att.totalQuestions) * 100;
      return attAcc >= avgAccuracy;
    }).length;
    const consistency = Math.round((consistencyExams / parsedAttempts.length) * 100);

    // 7. Streak Sync
    const streakVal = userStats?.streak || 1;

    // 8. Predictive Score
    const predictiveScore = Math.round((avgAccuracy * 0.70) + (consistency * 0.30));

    // 9. Mistake Patterns
    const mistakePatternsVal: string[] = [];
    if (mostIncorrectTopicValue && maxWrongs > 0) {
      mistakePatternsVal.push(`"${mostIncorrectTopicValue}" বিষয়ক প্রশ্নগুলোতে ভুল উত্তর দেওয়ার প্রবণতা চিহ্নিত হয়েছে (মোট ${maxWrongs}টি ভুল)`);
    } else {
      mistakePatternsVal.push('কোনো নির্দিষ্ট ভুলের প্যাটার্ন নেই। আপনার প্রস্তুতি বেশ ভারসাম্যপূর্ণ!');
    }
    if (weakChapters.length > 0) {
      mistakePatternsVal.push(`ধারাবাহিক প্রস্তুতি বৃদ্ধি করতে "${weakChapters.slice(0, 2).join(', ')}" অধ্যায়ে নিয়মিত রিভিউ মক দিন।`);
    }

    // 10. Skipped Patterns
    const skippedPatternsVal: string[] = [];
    if (mostSkippedTopicValue && maxSkips > 0) {
      skippedPatternsVal.push(`"${mostSkippedTopicValue}" বিষয়ের ওপর করা প্রশ্নগুলো অধিকাংশ ক্ষেত্রে এড়ানো হয়েছে। এগুলোতে ভীতি দূর করতে বেসিক আলোচনা দেখতে হবে।`);
    } else {
      skippedPatternsVal.push('প্রশ্ন এড়ানোর কোনো প্রবণতা নেই। আপনি সাহসের সাথে সব প্রশ্নের সমাধান করছেন!');
    }

    // 11. Improvement trends (last 8)
    const improvementData = [...parsedAttempts]
      .reverse()
      .slice(-8)
      .map(att => ({
        date: new Date(att.completedAt).getTime(),
        score: Math.round((att.correctCount / (att.totalQuestions || 1)) * 100)
      }));

    // 12. Exam DNA
    const traits: string[] = [];
    if (avgAccuracy >= 85) traits.push('সূক্ষ্ম বিশ্লেষক');
    if (avgSpeed >= 3.5) traits.push('বিদ্যুৎ গতির যোদ্ধা');
    if (consistency >= 75) traits.push('ধারাবাহিক স্তম্ভ');
    if (streakVal >= 3) traits.push('নিয়মিত তপস্বী');
    if (traits.length === 0) traits.push('অভিজ্ঞ অভিযাত্রী');

    let description = '';
    if (avgAccuracy >= 85) {
      description = 'আপনার প্রতিটি প্রশ্নের উত্তরের নির্ভুলতা অনন্য। চাপের মুখেও অবিচল চিন্তা করা আপনার প্রধান শক্তি।';
    } else if (avgSpeed >= 3.5) {
      description = 'সমাধানের গতি আপনার অসাধারণ। তবে তাড়াহুড়ো করে ছোট কোনো সিলি মিস্টেক এড়াতে সমাধান পুনরায় রিভিউ করুন।';
    } else if (consistency >= 70) {
      description = 'আপনার পারফরম্যান্স অত্যন্ত সুস্থিত। এটি চূড়ান্ত পরীক্ষায় আপনাকে একটি চমৎকার ফলাফল এনে দেবে।';
    } else {
      description = 'আপনি দারুণভাবে পারফর্ম করছেন। সাফল্যের ভিত্তি মজবুত করতে ভুল হওয়া অংশগুলোর পর্যালোচনা অব্যাহত রাখুন।';
    }

    // 13. Smart Study Roadmap
    const smartRoadmapVal: string[] = [];
    if (weakestSubjectObj) {
      smartRoadmapVal.push(`১. ${weakestSubjectObj.name} বিষয়ের বেসিক লেকচারগুলো পুনরায় রিভিশন করুন, যেখানে নির্ভুলতা মাত্র ${weakestSubjectObj.accuracy}%।`);
    } else {
      smartRoadmapVal.push('১. বর্তমান প্রস্তুতির ছন্দ বজায় রাখতে প্রতিদিন নতুন অধ্যায়ের মক দিন।');
    }
    if (weakChapters.length > 0) {
      smartRoadmapVal.push(`২. "${weakChapters[0]}" অধ্যায়ের বেসিক কনসেপ্টগুলো পড়ুন এবং অন্তত ১০টি প্রশ্নের গভীর প্র্যাকটিস করুন।`);
    } else {
      smartRoadmapVal.push('২. অতিরিক্ত আত্মবিশ্বাস পরিহার করে কঠিন প্রশ্নগুলোর নিয়মিত প্র্যাকটিস অব্যাহত রাখুন।');
    }
    if (minTimePerQ > 30) {
      smartRoadmapVal.push(`৩. উত্তর দেওয়ার গতি উন্নত করুন। প্রতিটি প্রশ্নে সমাধান সেশন ৩০ সেকেন্ডের নিচে নামিয়ে আনুন।`);
    } else {
      smartRoadmapVal.push('৩. গতি দারুণ আছে, এবার পূর্ণাঙ্গ মক ও ভুল রিভিউতে জোর দিন।');
    }
    smartRoadmapVal.push(`৪. আপনার অধ্যবসায় বজায় রাখতে পড়াশোনার ধারাবাহিকতা বজায় রাখুন এবং ডেইলি স্ট্রিক (${streakVal + 1} দিনে) উন্নীত করুন।`);

    return {
      userId: user?.id || 'guest',
      accuracy: avgAccuracy,
      speed: avgSpeed,
      strongChapters: strongChapters.slice(0, 3),
      weakChapters: weakChapters.slice(0, 3),
      strongTopics: strongTopics.slice(0, 3),
      weakTopics: weakTopics.slice(0, 3),
      improvementData,
      mistakePatterns: mistakePatternsVal,
      fastestSubject: fastestSub,
      fastestSpeed: minTimePerQ === Infinity ? 0 : minTimePerQ,
      slowestSubject: slowestSub,
      slowestSpeed: maxTimePerQ === -Infinity ? 0 : maxTimePerQ,
      examDNA: {
        traits,
        description
      },
      consistency,
      streak: streakVal,
      predictiveScore,
      skippedPatterns: skippedPatternsVal,
      smartRoadmap: smartRoadmapVal,
      subjectPerformance: subjectPerformanceList
    };
  }, [allAttempts, userStats, user]);

  useEffect(() => {
    if (!user) return;

    const fetchAnalyticsData = async () => {
      setIsLoadingAnalytics(true);
      try {
        // 1. Fetch user stats
        const { data: statsData, error: statsErr } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!statsErr && statsData) {
          setUserStats(statsData);
        }

        // 2. Fetch all exam attempts
        const { data: attemptsData, error: attemptsErr } = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });
        
        if (!attemptsErr && attemptsData) {
          setAllAttempts(attemptsData as any[]);
        }

        // 3. Fetch performance history
        const { data: historyData, error: historyErr } = await supabase
          .from('performance_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (!historyErr && historyData) {
          setPerformanceHistory(historyData);
        }
      } catch (err) {
        console.error("Error fetching analytics data from Supabase:", err);
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    fetchAnalyticsData();

    // Setup real-time listeners for instant updates
    const channel = supabase
      .channel(`realtime-analytics-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exam_attempts', filter: `user_id=eq.${user.id}` },
        () => { fetchAnalyticsData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'performance_history', filter: `user_id=eq.${user.id}` },
        () => { fetchAnalyticsData(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_stats', filter: `user_id=eq.${user.id}` },
        () => { fetchAnalyticsData(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Mock Templates (Updated to be empty by default or fetched if I had a templates collection)
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);

  // We should also fetch templates from firestore if possible
  useEffect(() => {
    if (!user) return;
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('exam_templates')
          .select('*')
          .eq('user_id', user.id);
        if (error) throw error;
        setTemplates(data as ExamTemplate[]);
      } catch (err) {
        console.error("Error fetching templates:", err);
      }
    };
    fetchTemplates();
  }, [user?.id]);

  const handleGenerate = async (settings: CustomExamSettings) => {
    setIsGenerating(true);
    try {
      // 1. Fetch user profile to get academic_group
      let userAcademicGroup = 'All';
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('academic_class, academic_group')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.academic_group) {
          userAcademicGroup = profile.academic_group;
        } else if (profile?.academic_class) {
          // If profile has academicGroup field on metadata or other format
          userAcademicGroup = (profile as any).academicGroup || 'All';
        }
      } catch (e) {
        console.warn("Could not fetch user's academic group:", e);
      }

      // 2. Query questions table
      let query = supabase.from('questions').select('*');

      // Filter by class_id
      if (settings.classId) {
        query = query.eq('class_id', settings.classId);
      }

      // Filter by academic_group
      if (userAcademicGroup && userAcademicGroup !== 'All') {
        query = query.in('academic_group', ['All', userAcademicGroup]);
      }

      // Filter by subjects (if any)
      if (settings.subjects && settings.subjects.length > 0) {
        query = query.in('subject_id', settings.subjects);
      }

      // Filter by chapters (if any)
      if (settings.chapters && settings.chapters.length > 0) {
        query = query.in('chapter_id', settings.chapters);
      }

      // Filter by topics (if any)
      if (settings.topics && settings.topics.length > 0) {
        query = query.in('topic_id', settings.topics);
      }

      const { data: dbQuestions, error } = await query;
      if (error) throw error;

      // 3. Map dbQuestions to frontend structures
      const classLookup = new Map(dynamicClasses?.map(c => [c.id, c.name]) || []);
      const subjectLookup = new Map(dynamicSubjects?.map(s => [s.id, s.name]) || []);
      const chapterLookup = new Map(dynamicChapters?.map(ch => [ch.id, ch.name]) || []);

      const mappedQuestions: Question[] = (dbQuestions || []).map(q => {
        let optionsArray = [q.option_a || '', q.option_b || '', q.option_c || '', q.option_d || ''];
        if (q.options && Array.isArray(q.options)) {
          optionsArray = q.options;
        }
        
        const optionsParsed = optionsArray.map((opt: any) => {
          if (typeof opt === 'string' && opt.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(opt);
              return parsed.text || '';
            } catch (e) {
              return opt;
            }
          }
          return opt;
        });

        let correctIndex = q.correct_option !== undefined ? q.correct_option : q.correct_answer;
        if (q.correct_option === 'A' || q.correct_option === 'a' || q.correct_option === '0') correctIndex = 0;
        else if (q.correct_option === 'B' || q.correct_option === 'b' || q.correct_option === '1') correctIndex = 1;
        else if (q.correct_option === 'C' || q.correct_option === 'c' || q.correct_option === '2') correctIndex = 2;
        else if (q.correct_option === 'D' || q.correct_option === 'd' || q.correct_option === '3') correctIndex = 3;
        else if (typeof q.correct_option === 'string' && /^[0-3]$/.test(q.correct_option)) {
          correctIndex = parseInt(q.correct_option, 10);
        } else if (typeof q.correct_answer === 'string' && /^[0-3]$/.test(q.correct_answer)) {
          correctIndex = parseInt(q.correct_answer, 10);
        }

        return {
          ...q,
          id: q.id,
          questionText: q.question || q.question_text || '',
          options: optionsParsed,
          correctAnswer: correctIndex,
          points: q.points !== undefined ? Number(q.points) : 1,
          type: q.question_type === 'written' ? 'written' : (q.type || 'mcq'),
          class: classLookup.get(q.class_id) || q.academic_class || 'SSC',
          classId: q.class_id,
          subject: subjectLookup.get(q.subject_id) || q.subject || 'General',
          subjectId: q.subject_id,
          chapter: chapterLookup.get(q.chapter_id) || q.chapter || 'Chapter 1',
          chapterId: q.chapter_id,
          createdAt: q.created_at
        } as unknown as Question;
      });

      // Filter into MCQ and written types
      const realMcqs = mappedQuestions.filter(q => q.type === 'mcq' || !q.type);
      const realWrittens = mappedQuestions.filter(q => q.type === 'written');

      if (settings.randomizeQuestions) {
        realMcqs.sort(() => Math.random() - 0.5);
        realWrittens.sort(() => Math.random() - 0.5);
      }

      // Slice to match target configurations
      const selectedMcqs = realMcqs.slice(0, settings.mcqCount);
      const selectedWrittens = realWrittens.slice(0, settings.writtenCount);

      const finalQuestionsList: Question[] = [];

      // 4. Pad MCQ missing questions with placeholders
      for (let i = 0; i < settings.mcqCount; i++) {
        if (selectedMcqs[i]) {
          finalQuestionsList.push(selectedMcqs[i]);
        } else {
          finalQuestionsList.push({
            id: `placeholder_mcq_${i}`,
            examId: 'custom',
            type: 'mcq',
            questionText: `Upcoming Question MCQ ${i + 1}`,
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctAnswer: -1,
            points: settings.marksPerMcq || 1,
            class: classLookup.get(settings.classId) || 'Premium',
            subject: 'General',
            chapter: 'General',
            createdAt: new Date().toISOString(),
            isPlaceholder: true
          } as unknown as Question);
        }
      }

      // Pad Written missing questions with placeholders
      for (let i = 0; i < settings.writtenCount; i++) {
        if (selectedWrittens[i]) {
          finalQuestionsList.push(selectedWrittens[i]);
        } else {
          finalQuestionsList.push({
            id: `placeholder_written_${i}`,
            examId: 'custom',
            type: 'written',
            questionText: `Upcoming Question Written ${i + 1}`,
            correctAnswer: '',
            points: settings.marksPerWritten || 5,
            class: classLookup.get(settings.classId) || 'Premium',
            subject: 'General',
            chapter: 'General',
            createdAt: new Date().toISOString(),
            isPlaceholder: true
          } as unknown as Question);
        }
      }

      setActiveExam({ settings, questions: finalQuestionsList });
    } catch (err) {
      console.error("Error generating dynamic real-data exam:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSmartGenerate = () => {
    if (!prompt.trim()) return;
    
    const promptLower = prompt.toLowerCase();
    
    // Find subject that best fits the prompt from actual DB subjects
    let matchedSubject = dynamicSubjects?.[0] || null;
    if (dynamicSubjects && dynamicSubjects.length > 0) {
      for (const sub of dynamicSubjects) {
        if (promptLower.includes(sub.name.toLowerCase()) || sub.name.toLowerCase().includes(promptLower)) {
          matchedSubject = sub;
          break;
        }
      }
    }

    const classId = matchedSubject?.classId || dynamicClasses?.[0]?.id || '';

    // Find custom matching chapters
    const matchedChapters = dynamicChapters
      ? dynamicChapters
          .filter(ch => matchedSubject ? ch.subjectId === matchedSubject.id : true)
          .filter(ch => promptLower.includes(ch.name.toLowerCase()))
      : [];
    
    const selectedChapters = matchedChapters.length > 0 
      ? matchedChapters.map(c => c.id) 
      : (dynamicChapters && matchedSubject 
          ? dynamicChapters.filter(ch => ch.subjectId === matchedSubject!.id).slice(0, 2).map(c => c.id) 
          : []);

    const settings: CustomExamSettings = {
      classId,
      subjects: matchedSubject ? [matchedSubject.id] : [],
      chapters: selectedChapters,
      topics: [],
      mcqCount: 20,
      writtenCount: 5,
      duration: 60,
      difficulty: 'Medium',
      difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
      negativeMarking: true,
      marksPerMcq: 1,
      marksPerWritten: 5,
      randomizeQuestions: true,
      randomizeOptions: true,
      strictMode: false,
      fullscreenMode: false,
      tabSwitchDetection: false,
      preventCopyPaste: false,
      instantResult: true
    };

    handleGenerate(settings);
  };

  const handleFinishExam = async (examAnswers: any[], timeTaken: number) => {
    if (!user || !activeExam) return;

    const answersList = Array.isArray(examAnswers) ? examAnswers : [];
    // Ensure placeholders do not affect score, marks, or leaderboards by filtering them out of evaluation list
    const questionsList = (Array.isArray(activeExam.questions) ? activeExam.questions : []).filter(q => !q?.isPlaceholder);

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const maxScore = questionsList.reduce((acc, q) => acc + (q?.points ? Number(q.points) : 1), 0);

    const answersMap: Record<string, any> = {};

    questionsList.forEach((q, idx) => {
      const userAnswer = answersList[idx];
      if (q && q.id) {
        answersMap[q.id] = userAnswer;
      }

      if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
        unansweredCount++;
      } else {
        const questionPoints = q?.points ? Number(q.points) : 1;
        if (q?.type === 'mcq') {
          if (userAnswer === q.correctAnswer) {
            score += questionPoints;
            correctCount++;
            
            // Remove from wrong questions since they answered correctly now
            if (user && user.id && q.id) {
              supabaseService.removeWrongQuestion(user.id, q.id).catch(err => {
                console.warn("[PremiumExamSection] Failed to remove correct question from wrong tracker:", err);
              });
            }
          } else {
            wrongCount++;
            if (activeExam.settings?.negativeMarking) {
              score -= 0.25; // Default negative marking for premium
            }
            
            // Record as wrong question
            if (user && user.id && q.id) {
              supabaseService.recordWrongQuestion(
                user.id,
                q.id,
                String(userAnswer),
                String(q.correctAnswer),
                null,
                'Custom Exam'
              ).catch(err => {
                console.warn("[PremiumExamSection] Failed to record wrong question:", err);
              });
            }
          }
        } else {
          // Semi-automated score mapping for written
          const cleanAnswer = typeof userAnswer === 'string' ? userAnswer.trim() : '';
          if (cleanAnswer.length > 50) {
            score += questionPoints;
            correctCount++;
          } else if (cleanAnswer.length > 0) {
            score += questionPoints * 0.5;
          } else {
            unansweredCount++;
          }
        }
      }
    });

    const now = Date.now();
    const dbAttemptData = {
      user_id: user.id,
      user_name: user?.user_metadata?.full_name || user?.email?.split('@')?.[0] || 'Premium Student',
      exam_id: null, // exam_id REFERENCES public.exams(id) which requires a valid UUID. Since this is customized, use null.
      answers: answersMap,
      score: Math.max(0, score),
      total_marks: maxScore,
      correct_count: correctCount,
      wrong_count: wrongCount,
      unanswered_count: unansweredCount,
      total_questions: activeExam.questions.length,
      time_taken: timeTaken,
      completed_at: new Date(now).toISOString(),
      is_premium: true,
      academic_class: 'Premium',
      academic_group: 'Premium Group',
      subject: String((activeExam as any)?.subject || (activeExam as any)?.settings?.subject || 'Premium Custom').trim(),
      chapter: String((activeExam as any)?.chapter || (activeExam as any)?.settings?.chapter || 'Custom').trim(),
      topic: String((activeExam as any)?.topic || 'Custom Topic').trim()
    };

    let data: any = null;
    try {
      console.log("[PremiumExamSection] Initiating database write via supabaseService.safeWrite for premium customized exam attempt:", dbAttemptData);
      data = await supabaseService.safeWrite(
        'exam_attempts',
        dbAttemptData,
        'insert'
      );
      console.log("[PremiumExamSection] Successfully saved premium customized exam attempt:", data);
      if (data) {
        setAllAttempts(prev => [data as any, ...prev]);
      }

      // 5. Instantly update global real-time synced leaderboards
      const { data: existingLeaderboard } = await supabase
        .from('leaderboards')
        .select('*')
        .eq('user_id', user.id)
        .is('exam_id', null)
        .maybeSingle();

      const bestScore = existingLeaderboard 
        ? Math.max(existingLeaderboard.best_score || 0, Math.max(0, score)) 
        : Math.max(0, score);
      const totalAttempts = existingLeaderboard 
        ? (existingLeaderboard.total_attempts || 1) + 1 
        : 1;

      const leaderboardPayload = {
        academic_class: 'Premium',
        exam_id: null,
        user_id: user.id,
        user_name: user?.user_metadata?.full_name || user?.email?.split('@')?.[0] || 'Premium Student',
        best_score: bestScore,
        time_taken: timeTaken,
        last_updated: new Date().toISOString(),
        exam_title: `Premium ${activeExam.settings.difficulty} Session`,
        total_attempts: totalAttempts
      };

      if (existingLeaderboard && existingLeaderboard.id) {
        await supabaseService.safeWrite('leaderboards', leaderboardPayload, 'update', existingLeaderboard.id);
      } else {
        await supabaseService.safeWrite('leaderboards', leaderboardPayload, 'insert');
      }

      fetchLeaderboards?.();
    } catch (err) {
      console.error("Error saving premium attempt or leaderboard sync:", err);
    }

    const customExamObj = {
      id: null,
      title: `Custom Premium Exam (${activeExam?.settings?.subjects?.join(', ') || 'Custom'})`,
      questions: activeExam?.questions || [],
      timeLimit: activeExam?.settings?.duration || 30,
      isPremium: true,
      class: 'Premium',
      subject: activeExam?.settings?.subjects?.join(', ') || 'Premium Custom',
      chapter: activeExam?.settings?.chapters?.join(', ') || 'All',
      isCustom: true
    };

    if (onCustomExamFinished) {
      onCustomExamFinished(customExamObj, data || dbAttemptData);
    } else {
      setView('analytics');
    }
    setActiveExam(null);
  };

  if (activeExam) {
    return (
      <PremiumExamInterface 
        settings={activeExam.settings}
        questions={activeExam.questions}
        onFinish={handleFinishExam}
        onClose={() => setActiveExam(null)}
        savedQuestionIds={savedQuestionIds}
        onToggleSaveQuestion={onToggleSaveQuestion}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black/50 p-4 sm:p-8 lg:p-12 font-sans relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-palette/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-2xl -z-10" />

      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary-palette text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Crown size={20} />
              </div>
              <h1 className="text-2xl sm:text-4xl font-black dark:text-white tracking-tight">PREMIUM <span className="text-primary-palette font-black">X</span></h1>
            </div>
            <p className="text-zinc-600 dark:text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px] ml-1">Elite Examination Intelligence</p>
          </div>

          <nav className="flex items-center gap-2 p-1.5 bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-100 dark:border-zinc-800 shadow-xl overflow-x-auto no-scrollbar">
            {[
              { id: 'dashboard', name: 'ড্যাশবোর্ড', icon: LayoutGrid },
              { id: 'builder', name: 'পরীক্ষা তৈরি', icon: Settings },
              { id: 'analytics', name: 'পারফরম্যান্স', icon: BarChart3 },
              { id: 'templates', name: 'প্রিসেট', icon: History }
            ].map((navItem) => (
              <button
                key={navItem.id}
                onClick={() => setView(navItem.id as ViewMode)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap
                  ${view === navItem.id 
                    ? 'bg-primary-palette text-white shadow-lg shadow-purple-500/20' 
                    : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white'}`}
              >
                <navItem.icon size={16} />
                {navItem.name}
              </button>
            ))}
          </nav>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
          >
            {view === 'dashboard' && (
              <div className="space-y-12">
                {/* Hero Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-zinc-900 dark:bg-zinc-900 rounded-[32px] sm:rounded-[48px] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
                   <div className="absolute -right-10 -top-10 w-64 h-64 bg-primary-palette/30 rounded-full blur-2xl" />
                   
                   <div className="relative z-10 space-y-8">
                     <Badge className="bg-primary-palette text-white border-none px-4 py-2">প্রিমিয়াম অভিজ্ঞতা</Badge>
                     <h2 className="text-3xl sm:text-5xl font-black leading-[1.1]">
                        সাফল্যের কারিগর <br />
                        <span className="text-primary-palette">আপনি নিজেই।</span>
                     </h2>
                     <p className="text-zinc-200 dark:text-zinc-400 font-medium max-w-md text-lg leading-relaxed">
                        আপনার লক্ষ্য অনুযায়ী পরীক্ষার প্রতিটি দিক কাস্টমাইজ করুন। উচ্চমানের প্রশ্ন ও রিয়েল-টাইম এনালাইটিক্স দিয়ে নিজেকে প্রস্তুত করুন।
                     </p>
                     <div className="flex gap-4">
                       <Button onClick={() => setView('builder')} className="bg-primary-palette text-white py-5 px-10 rounded-3xl text-sm font-black uppercase tracking-widest" icon={ChevronRight}>
                         ইঞ্জিন ওপেন করুন
                       </Button>
                       <Button onClick={() => setView('templates')} variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 py-5 px-10 rounded-3xl text-sm font-black uppercase tracking-widest">
                         ভল্ট চেক করুন
                       </Button>
                     </div>
                   </div>

                   <div className="relative hidden lg:flex justify-center items-center">
                      <motion.div 
                        animate={{ 
                          y: [0, -10, 0],
                        }}
                        transition={{ 
                          duration: 4, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="w-72 h-72 bg-gradient-to-br from-primary-palette to-blue-600 rounded-[64px] shadow-xl flex items-center justify-center relative border-4 border-white/10"
                      >
                         <Crown size={120} className="text-white/80" />
                         <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/5 backdrop-blur-lg rounded-[40px] border border-white/20 p-6 shadow-xl">
                            <Sparkles className="text-amber-400 mb-2" size={32} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Elite OS</span>
                         </div>
                      </motion.div>
                   </div>
                </div>

                {/* Smart Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="p-6 sm:p-10 border-none bg-white dark:bg-zinc-900 group hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all">
                       <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                         <Zap size={28} />
                       </div>
                       <h3 className="text-2xl font-black mb-3 text-zinc-900 dark:text-white">দুর্বলতা শনাক্তকরণ</h3>
                       <p className="text-zinc-600 dark:text-zinc-500 mb-8 text-sm font-medium leading-relaxed">সিস্টেম আপনার দুর্বলতাগুলো শনাক্ত করবে এবং স্বয়ংক্রিয়ভাবে একটি পরীক্ষা তৈরি করবে।</p>
                       <Button 
                        onClick={() => {
                          if (analytics.weakChapters.length > 0) {
                            handleGenerate({
                              subjects: ['General'],
                              chapters: analytics.weakChapters,
                              topics: [],
                              mcqCount: 20,
                              writtenCount: 2,
                              duration: 30,
                              difficulty: 'Easy',
                              negativeMarking: true,
                              marksPerMcq: 1,
                              marksPerWritten: 5,
                              randomizeQuestions: true,
                              randomizeOptions: true,
                              strictMode: false,
                              fullscreenMode: false,
                              tabSwitchDetection: false,
                              preventCopyPaste: false,
                              instantResult: true
                            });
                          } else {
                            alert("এখনও কোনো দুর্বলতা শনাক্ত করা যায়নি। আরও প্র্যাকটিস করতে ইঞ্জিনিয়ার অপশনে যান!");
                            setView('builder');
                          }
                        }} 
                        variant="ghost" 
                        className="p-0 text-emerald-500 font-black hover:bg-transparent" 
                        icon={ArrowRight}
                       >
                          দুর্বল অধ্যায়গুলো টার্গেট করুন
                       </Button>
                    </Card>

                   <Card className="p-6 sm:p-10 border-none bg-white dark:bg-zinc-900 group hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all">
                      <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-[28px] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                    <BrainIcon size={28} />
                      </div>
                      <h3 className="text-2xl font-black mb-3 text-zinc-900 dark:text-white">স্মার্ট প্রম্পট</h3>
                      <p className="text-zinc-600 dark:text-zinc-500 mb-8 text-sm font-medium leading-relaxed">আপনার লক্ষ্য বর্ণনা করুন, আর আমাদের AI আপনার জন্য নিখুঁত পরীক্ষার কাঠামো তৈরি করে দেবে।</p>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="'পদার্থবিজ্ঞান ১ ঘণ্টা মক পরীক্ষা...'"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl py-4 pl-6 pr-12 text-xs font-bold dark:text-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                        />
                        <button 
                          onClick={handleSmartGenerate}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                   </Card>

                   <Card className="p-6 sm:p-10 border-none bg-primary-palette text-white relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                      <div className="w-16 h-16 bg-white/20 text-white rounded-[28px] flex items-center justify-center mb-8">
                        <History size={28} />
                      </div>
                      <h3 className="text-2xl font-black mb-3">ওয়ান-ক্লিক রি-রান</h3>
                      <p className="text-white/70 mb-8 text-sm font-medium leading-relaxed">আপনার পছন্দসহ কনফিগারেশন সেভ করুন এবং কয়েক সেকেন্ডের মধ্যে পরীক্ষা শুরু করুন।</p>
                      <Button onClick={() => setView('templates')} variant="ghost" className="p-0 text-white font-black hover:bg-transparent" icon={ArrowRight}>
                         আমার ভল্ট দেখুন
                      </Button>
                   </Card>
                </div>

                {/* Templates Preview */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black dark:text-white">সাম্প্রতিক প্রিসেটসমূহ</h3>
                    <Button onClick={() => setView('templates')} variant="ghost" size="sm" className="text-primary-palette font-black">সবগুলো দেখুন</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                      <Card key={template.id} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-primary-palette/50 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 group-hover:bg-primary-palette group-hover:text-white transition-all">
                              <Plus size={20} />
                           </div>
                           <div>
                              <h4 className="font-bold text-zinc-900 dark:text-white">{template.name}</h4>
                              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-widest">{template.settings.duration} মি. • {template.settings.mcqCount}টি MCQ</p>
                           </div>
                        </div>
                        <button onClick={() => handleGenerate(template.settings)} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center hover:scale-110 transition-all">
                          <ChevronRight size={20} />
                        </button>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {view === 'builder' && (
              <PremiumExamBuilder 
                onGenerate={handleGenerate}
                onSaveTemplate={async (s) => {
                  if (!user) return;
                  const newTemplate = {
                    user_id: user.id,
                    name: `Template ${templates.length + 1}`,
                    settings: s,
                    created_at: new Date().toISOString()
                  };
                  try {
                    const { data, error } = await supabase
                      .from('exam_templates')
                      .insert([newTemplate])
                      .select()
                      .single();
                    if (error) throw error;
                    setTemplates(prev => [...prev, data as ExamTemplate]);
                  } catch (err) {
                    console.error("Error saving template:", err);
                  }
                }}
                weakChapters={analytics.weakChapters}
                dynamicClasses={dynamicClasses}
                dynamicSubjects={dynamicSubjects}
                dynamicChapters={dynamicChapters}
                dynamicTopics={dynamicTopics}
              />
            )}

            {view === 'analytics' && <PremiumAnalytics analytics={analytics} />}

            {view === 'templates' && (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <button 
                  onClick={() => setView( 'builder' )}
                  className="aspect-video rounded-[32px] border-4 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-4 group hover:border-primary-palette transition-all"
                  >
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-[28px] flex items-center justify-center text-zinc-400 group-hover:bg-primary-palette group-hover:text-white transition-all">
                      <Plus size={32} />
                    </div>
                    <span className="text-sm font-black text-zinc-400 uppercase tracking-widest">নতুন প্রিসেট তৈরি করুন</span>
                  </button>
                  {templates.map(template => (
                    <Card key={template.id} className="p-8 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-0 group-hover:opacity-10 dark:text-white transition-opacity"><Save size={100} /></div>
                       <h4 className="text-2xl font-black mb-1 text-zinc-900 dark:text-white">{template.name}</h4>
                       <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold mb-8 uppercase tracking-widest italic tracking-[0.2em]">{new Date(template.created_at).toLocaleDateString()}-এ তৈরি করা হয়েছে</p>
                       
                       <div className="space-y-3 mb-8">
                          <div className="flex justify-between text-xs font-bold"><span className="text-zinc-600 dark:text-zinc-500">সময়সীমা</span><span className="text-zinc-900 dark:text-white">{template.settings.duration}মি.</span></div>
                          <div className="flex justify-between text-xs font-bold"><span className="text-zinc-600 dark:text-zinc-500">MCQ</span><span className="text-zinc-900 dark:text-white text-primary-palette">{template.settings.mcqCount}টি</span></div>
                          <div className="flex justify-between text-xs font-bold"><span className="text-zinc-600 dark:text-zinc-500">লিখিত</span><span className="text-zinc-900 dark:text-white text-emerald-500">{template.settings.writtenCount}টি</span></div>
                       </div>

                       <div className="flex gap-3">
                         <Button onClick={() => handleGenerate(template.settings)} className="flex-1 bg-primary-palette text-white">শুরু করুন</Button>
                         <Button variant="outline" className="px-4" onClick={() => {
                           const shareText = `Challenge: Try my '${template.name}' exam on PREMIUM X!`;
                           navigator.clipboard.writeText(shareText).then(() => {
                             alert("চ্যালেঞ্জ লিঙ্ক ক্লিপবোর্ডে কপি করা হয়েছে! প্রতিযোগিতার জন্য বন্ধুদের সাথে শেয়ার করুন।");
                           });
                         }}>
                           <ChevronRight className="rotate-45" size={16} /> {/* Share/Link icon replacement */}
                         </Button>
                         <Button variant="outline" className="px-4" onClick={() => setView('analytics')}><History size={16} /></Button>
                       </div>
                    </Card>
                  ))}
               </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {isGenerating && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center">
           <motion.div 
            animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-24 h-24 border-4 border-primary-palette border-t-transparent rounded-full mb-8 shadow-lg shadow-purple-500/20"
           />
           <div className="text-center space-y-2">
             <h3 className="text-3xl font-black text-white uppercase tracking-tighter">সেশন তৈরি করা হচ্ছে</h3>
             <p className="text-primary-palette font-bold uppercase tracking-[0.4em] text-[10px]">কাস্টম ইন্টেলিজেন্স সংযোজন করা হচ্ছে</p>
           </div>
        </div>
      )}
    </div>
  );
};

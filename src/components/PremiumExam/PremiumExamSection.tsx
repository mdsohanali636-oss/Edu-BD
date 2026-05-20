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

type ViewMode = 'dashboard' | 'builder' | 'analytics' | 'templates';

interface Props {
  user: any; // Using simplified any for user as it's passed from App.tsx (Supabase session user)
  dynamicClasses: AcademicClassInfo[];
  dynamicSubjects: AcademicSubject[];
  dynamicChapters: AcademicChapter[];
  dynamicTopics: AcademicTopic[]; // Added
}

export const PremiumExamSection: React.FC<Props> = ({ 
  user, 
  dynamicClasses,
  dynamicSubjects,
  dynamicChapters,
  dynamicTopics // Added
}) => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [activeExam, setActiveExam] = useState<{ settings: CustomExamSettings; questions: Question[] } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [allAttempts, setAllAttempts] = useState<ExamAttempt[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  // Dynamic Analytics Calculation
  const analytics = useMemo<UserAnalytics>(() => {
    if (allAttempts.length === 0) {
      return {
        userId: user?.id || 'guest',
        accuracy: 0,
        speed: 0,
        strongChapters: [],
        weakChapters: [],
        improvementData: [],
        mistakePatterns: ['এখনও কোনো প্যাটার্ন পাওয়া যায়নি। আপনার দক্ষতা যাচাই করতে অন্তত একটি পরীক্ষা সম্পন্ন করুন।'],
        fastestSubject: 'তথ্য নেই',
        fastestSpeed: 0,
        slowestSubject: 'তথ্য নেই',
        slowestSpeed: 0,
        examDNA: {
          traits: ['শীক্ষার্থী'],
          description: 'আপনার এক্সাম প্রোফailটি তৈরি হচ্ছে। আরও কিছু পরীক্ষায় অংশ নিয়ে আপনার দক্ষতা এবং শেখার ধরন উন্মোচন করুন।'
        },
        strongTopics: [],
        weakTopics: []
      };
    }

    const totalAccuracy = allAttempts.reduce((acc, curr) => acc + (curr.correctCount / (curr.totalQuestions || 1)) * 100, 0);
    const avgAccuracy = Math.round(totalAccuracy / allAttempts.length);
    
    const totalSpeed = allAttempts.reduce((acc, curr) => {
      const mins = (curr.timeTaken || 1) / 60;
      return acc + (curr.totalQuestions / mins);
    }, 0);
    const avgSpeed = Number((totalSpeed / allAttempts.length).toFixed(1));

    // Improvement Data (last 7)
    const improvementData = [...allAttempts]
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .slice(-7)
      .map(att => ({
        date: new Date(att.completedAt).getTime(),
        score: Math.round((att.correctCount / (att.totalQuestions || 1)) * 100)
      }));

    // Logic for traits
    const traits = [];
    if (avgAccuracy > 80) traits.push('নির্ভুল বিশেষজ্ঞ');
    if (avgSpeed > 2) traits.push('বিদ্যুৎ গতি');
    if (allAttempts.length > 5) traits.push('ধৈর্যশীল যোদ্ধা');
    if (traits.length === 0) traits.push('নতুন অভিযাত্রী');

    let description = '';
    if (avgAccuracy > 90) {
      description = 'আপনার উত্তর প্রদানের নিখুঁততা অনন্য। চাপের মুখেও এই ধারাবাহিকতা বজায় রাখা আপনার প্রধান শক্তি।';
    } else if (avgSpeed > 3) {
      description = 'আপনার সমাধানের গতি বেশ দ্রুত। তবে তাড়াহুড়ো করে ছোট কোনো ভুল এড়াতে দ্বিতীয়বার চেক করার অভ্যাস করুন।';
    } else {
      description = 'আপনি দারুণভাবে আপনার জ্ঞানের পরিধি বাড়াচ্ছেন। সাফল্যের জন্য নিয়মিত প্র্যাকটিস এবং বিশ্লেষণ চালিয়ে যান।';
    }

    // Attempt to extract dynamic chapters from attempts
    const chapterStats: Record<string, { total: number, correct: number }> = {};
    allAttempts.forEach(att => {
      // In a real app we'd have chapter info in the attempt
      // For now we'll just use a placeholder if none found
    });

    // Logic for fastest/slowest subjects
    const subjectStats: Record<string, { totalTime: number, totalQuestions: number }> = {};
    allAttempts.forEach((att: any) => {
      const sub = att.subject || 'General';
      if (!subjectStats[sub]) subjectStats[sub] = { totalTime: 0, totalQuestions: 0 };
      subjectStats[sub].totalTime += att.timeTaken || 0;
      subjectStats[sub].totalQuestions += att.totalQuestions || 0;
    });

    let fastestSub = 'তথ্য নেই';
    let slowestSub = 'তথ্য নেই';
    let minTimePerQ = Infinity;
    let maxTimePerQ = -Infinity;

    Object.entries(subjectStats).forEach(([subId, stats]) => {
      const timePerQ = stats.totalQuestions > 0 ? stats.totalTime / stats.totalQuestions : Infinity;
      const subjectName = dynamicSubjects.find(s => s.id === subId)?.name || subId;
      if (timePerQ < minTimePerQ) {
        minTimePerQ = timePerQ;
        fastestSub = subjectName;
      }
      if (timePerQ > maxTimePerQ && timePerQ !== Infinity) {
        maxTimePerQ = timePerQ;
        slowestSub = subjectName;
      }
    });

    return {
      userId: user?.id || 'guest',
      accuracy: avgAccuracy,
      speed: avgSpeed,
      strongChapters: [], // Empty by default for new users
      weakChapters: [],
      strongTopics: [], // Added
      weakTopics: [],   // Added
      improvementData,
      mistakePatterns: allAttempts.length > 0 ? ['প্যাটার্ন বিশ্লেষণ করা হচ্ছে...'] : ['এখনও কোনো প্যাটার্ন পাওয়া যায়নি।'],
      fastestSubject: fastestSub,
      fastestSpeed: minTimePerQ === Infinity ? 0 : minTimePerQ,
      slowestSubject: slowestSub,
      slowestSpeed: maxTimePerQ === -Infinity ? 0 : maxTimePerQ,
      examDNA: {
        traits,
        description
      }
    };
  }, [allAttempts, user]);

  useEffect(() => {
    if (!user) return;

    const fetchAttempts = async () => {
      setIsLoadingAnalytics(true);
      try {
        const { data, error } = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_premium', true)
          .order('completed_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setAllAttempts(data as any[]);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    fetchAttempts();
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

  const handleGenerate = (settings: CustomExamSettings) => {
    // Generate mock questions based on settings
    const mockQuestions: Question[] = [];
    for (let i = 0; i < settings.mcqCount; i++) {
      mockQuestions.push({
        id: `q_mcq_${i}`,
        examId: 'custom',
        type: 'mcq',
        questionText: `Sample MCQ Question ${i + 1} for ${settings.subjects[0]}`,
        options: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
        correctAnswer: 0,
        points: settings.marksPerMcq,
        class: 'HSC' as AcademicClass,
        subject: settings.subjects[0],
        chapter: settings.chapters[0] || 'General',
        createdAt: new Date().toISOString()
      });
    }
    for (let i = 0; i < settings.writtenCount; i++) {
      mockQuestions.push({
        id: `q_written_${i}`,
        examId: 'custom',
        type: 'written',
        questionText: `Sample Written Question ${i + 1} for ${settings.subjects[0]}`,
        points: settings.marksPerWritten,
        class: 'HSC' as AcademicClass,
        subject: settings.subjects[0],
        chapter: settings.chapters[0] || 'General',
        createdAt: new Date().toISOString()
      });
    }
    
    setIsGenerating(true);
    setTimeout(() => {
      setActiveExam({ settings, questions: mockQuestions });
      setIsGenerating(false);
    }, 1500);
  };

  const handleSmartGenerate = () => {
    if (!prompt.trim()) return;
    
    // Simple mock logic for "Smart Balanced Exam Generator"
    const settings: CustomExamSettings = {
      subjects: ['phy'],
      chapters: ['p1', 'p2'],
      topics: [],
      mcqCount: 25,
      writtenCount: 5,
      duration: 60,
      difficulty: 'Easy',
      difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
      negativeMarking: true,
      marksPerMcq: 1,
      marksPerWritten: 5,
      randomizeQuestions: true,
      randomizeOptions: true,
      strictMode: true,
      fullscreenMode: false,
      tabSwitchDetection: false,
      preventCopyPaste: false,
      instantResult: true
    };

    handleGenerate(settings);
  };

  const handleFinishExam = async (examAnswers: any[], timeTaken: number) => {
    if (!user || !activeExam) return;

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const maxScore = activeExam.questions.reduce((acc, q) => acc + q.points, 0);

    activeExam.questions.forEach((q, idx) => {
      const userAnswer = examAnswers[idx];
      if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
        unansweredCount++;
      } else {
        if (q.type === 'mcq') {
          if (userAnswer === q.correctAnswer) {
            score += q.points;
            correctCount++;
          } else {
            wrongCount++;
            if (activeExam.settings.negativeMarking) {
              score -= 0.25; // Default negative marking for premium
            }
          }
        } else {
          // Semi-automated score mapping for written
          if (typeof userAnswer === 'string' && userAnswer.trim().length > 50) {
            score += q.points;
            correctCount++;
          } else if (typeof userAnswer === 'string' && userAnswer.trim().length > 0) {
            score += q.points * 0.5;
          } else {
            unansweredCount++;
          }
        }
      }
    });

    const now = Date.now();
    const attemptData = {
      user_id: user.id,
      user_name: user?.user_metadata?.full_name || user.email?.split('@')[0] || 'Premium Student',
      exam_id: 'premium-custom-' + now,
      exam_title: `Premium ${activeExam.settings.difficulty} Session`,
      subject: activeExam.settings.subjects[0] || 'General',
      chapters: activeExam.settings.chapters,
      user_class: 'Premium',
      answers: examAnswers,
      score: Math.max(0, score),
      total_marks: maxScore,
      correct_count: correctCount,
      wrong_count: wrongCount,
      unanswered_count: unansweredCount,
      total_questions: activeExam.questions.length,
      time_taken: timeTaken,
      completed_at: new Date(now).toISOString(),
      is_premium: true // Flag for filtering
    };

    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .insert([attemptData])
        .select()
        .single();
      if (error) throw error;
      // Optimistically update local attempts to reflect in Pulse immediately
      setAllAttempts(prev => [data as any, ...prev]);
    } catch (err) {
      console.error("Error saving premium attempt:", err);
    }

    setActiveExam(null);
    setView('analytics');
  };

  if (activeExam) {
    return (
      <PremiumExamInterface 
        settings={activeExam.settings}
        questions={activeExam.questions}
        onFinish={handleFinishExam}
        onClose={() => setActiveExam(null)}
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

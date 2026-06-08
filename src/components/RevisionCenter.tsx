import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Trash2, 
  Bookmark, 
  Check, 
  BookOpen, 
  ChevronRight, 
  Play, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  X, 
  HelpCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Badge } from './ui/Base';
import { MathQuestionContent, MathOptionContent } from './Exam/MathQuestionContent';
import { supabaseService } from '../services/supabaseService';
import { Question } from '../types';

interface RevisionCenterProps {
  user: any;
  savedQuestions: any[];
  wrongQuestions: any[];
  refetchSaved: () => void;
  refetchWrong: () => void;
  savedQuestionIds: Set<string>;
  onToggleSaveQuestion: (qId: string) => void;
}

type TabType = 'wrong' | 'saved';

export const RevisionCenter: React.FC<RevisionCenterProps> = ({
  user,
  savedQuestions = [],
  wrongQuestions = [],
  refetchSaved,
  refetchWrong,
  savedQuestionIds,
  onToggleSaveQuestion
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('wrong');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [chapterFilter, setChapterFilter] = useState<string>('All');
  
  // Solution disclosure state: Map of questionId -> boolean
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});

  // Active Practice state
  const [practiceSession, setPracticeSession] = useState<{
    questions: Question[];
    answers: Record<string, number>;
    currentIndex: number;
    isFinished: boolean;
    results?: {
      correct: number;
      wrong: number;
      resolvedCount: number;
    };
  } | null>(null);

  // Toggle single answer solution helper
  const toggleRevealSolution = (questionId: string) => {
    setRevealedSolutions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Get subjects / chapters list for filtering from saved & wrong questions
  const uniqueSubjects = useMemo(() => {
    const list = new Set<string>();
    const source = activeTab === 'wrong' ? wrongQuestions : savedQuestions;
    source.forEach(item => {
      const sub = item.question?.subject || item.question?.subject_name;
      if (sub) list.add(sub);
    });
    return ['All', ...Array.from(list)];
  }, [activeTab, savedQuestions, wrongQuestions]);

  const uniqueChapters = useMemo(() => {
    const list = new Set<string>();
    const source = activeTab === 'wrong' ? wrongQuestions : savedQuestions;
    source.forEach(item => {
      const chap = item.question?.chapter || item.question?.chapter_name;
      if (chap) list.add(chap);
    });
    return ['All', ...Array.from(list)];
  }, [activeTab, savedQuestions, wrongQuestions, subjectFilter]);

  // Filter questions
  const filteredItems = useMemo(() => {
    const source = activeTab === 'wrong' ? wrongQuestions : savedQuestions;
    return source.filter(item => {
      if (!item.question) return false;
      const questionSubject = item.question.subject || item.question.subject_name || '';
      const questionChapter = item.question.chapter || item.question.chapter_name || '';

      const matchesSubject = subjectFilter === 'All' || questionSubject === subjectFilter;
      const matchesChapter = chapterFilter === 'All' || questionChapter === chapterFilter;
      return matchesSubject && matchesChapter;
    });
  }, [activeTab, savedQuestions, wrongQuestions, subjectFilter, chapterFilter]);

  // Handle manual removal of wrong question tracking row
  const handleRemoveWrong = async (questionId: string) => {
    if (!user) return;
    try {
      await supabaseService.removeWrongQuestion(user.id, questionId);
      refetchWrong();
    } catch (err) {
      console.error("Failed to remove wrong question:", err);
    }
  };

  // Launch customized practice session
  const startPractice = () => {
    if (filteredItems.length === 0) return;
    const practiceQuestions = filteredItems.map(item => item.question).filter(Boolean) as Question[];
    // Slice mock session to maximum of 10 items for responsive engagement
    const limitedQuestions = practiceQuestions.slice(0, 10);
    setPracticeSession({
      questions: limitedQuestions,
      answers: {},
      currentIndex: 0,
      isFinished: false
    });
  };

  // Answer selection in active practice
  const handleSelectPracticeOption = (questionId: string, optionIdx: number) => {
    if (!practiceSession || practiceSession.isFinished) return;
    setPracticeSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        answers: {
          ...prev.answers,
          [questionId]: optionIdx
        }
      };
    });
  };

  // Next index navigation
  const nextPracticeQuestion = () => {
    if (!practiceSession) return;
    if (practiceSession.currentIndex < practiceSession.questions.length - 1) {
      setPracticeSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: prev.currentIndex + 1
        };
      });
    } else {
      finishPracticeSession();
    }
  };

  // Finish practice & automatically evaluate performance & remove correct wrong ones
  const finishPracticeSession = async () => {
    if (!practiceSession || !user) return;
    let correct = 0;
    let wrong = 0;
    let resolvedCount = 0;

    for (const q of practiceSession.questions) {
      const selected = practiceSession.answers[q.id];
      const correctOption = Number(q.correctAnswer ?? q.correct_answer);
      if (selected === undefined) {
        wrong++;
      } else if (selected === correctOption) {
        correct++;
        // If they got a tracked wrong question correct, remove it from tracking!
        if (activeTab === 'wrong') {
          try {
            await supabaseService.removeWrongQuestion(user.id, q.id);
            resolvedCount++;
          } catch (e) {
            console.warn("Failed to automatically remove corrected question:", e);
          }
        }
      } else {
        wrong++;
      }
    }

    setPracticeSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        isFinished: true,
        results: {
          correct,
          wrong,
          resolvedCount
        }
      };
    });

    // Refresh databases
    refetchWrong();
    refetchSaved();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      
      {/* 1. Revision Session Practice Panel Overlay */}
      <AnimatePresence>
        {practiceSession && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <Card className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-none shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden max-h-[90vh] flex flex-col rounded-[32px]">
              
              {/* Finish Screen */}
              {practiceSession.isFinished ? (
                <div className="text-center py-8 space-y-6 flex-1 flex flex-col justify-center items-center">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center mb-2"
                  >
                    <CheckCircle2 size={44} />
                  </motion.div>
                  <h3 className="text-3xl font-black text-zinc-900 dark:text-white">রিভিশন সম্পন্ন হয়েছে!</h3>
                  <p className="text-zinc-500 max-w-md">আপনার ভুল সংশোধন সেশন সফল হয়েছে। মেধা উন্নয়ন স্কোরকার্ড নীচে দেওয়া হলো:</p>
                  
                  <div className="grid grid-cols-2 gap-4 w-full max-w-sm pt-4">
                    <Card className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 text-center">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">সঠিক উত্তর</p>
                      <h4 className="text-2xl font-black text-green-500">{practiceSession.results?.correct}</h4>
                    </Card>
                    <Card className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 text-center">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">ভুল উত্তর</p>
                      <h4 className="text-2xl font-black text-red-500">{practiceSession.results?.wrong}</h4>
                    </Card>
                  </div>

                  {practiceSession.results && practiceSession.results.resolvedCount > 0 && (
                    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 py-1.5 px-4 font-bold border border-amber-500/20 text-xs mt-2">
                       🎉 {practiceSession.results.resolvedCount}টি ভুল করা প্রশ্ন সফলভাবে ট্র্যাক থেকে হালনাগাদ/মুছে ফেলা হয়েছে!
                    </Badge>
                  )}

                  <div className="pt-6 w-full max-w-sm">
                    <Button 
                      className="w-full rounded-2xl h-12 bg-blue-600 hover:bg-blue-700 font-bold"
                      onClick={() => setPracticeSession(null)}
                      icon={ArrowRight}
                    >
                      ড্যাশবোর্ডে ফিরে যান
                    </Button>
                  </div>
                </div>
              ) : (
                /* Active Question Taking screen */
                <>
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                     <div className="flex items-center gap-3">
                       <Badge className="bg-blue-600 text-white px-3 py-1 font-bold">
                         প্রশ্ন {practiceSession.currentIndex + 1} / {practiceSession.questions.length}
                       </Badge>
                       <span className="text-xs text-zinc-400 font-medium">ভুল সংশোধন রিভিশন</span>
                     </div>
                     <button 
                       onClick={() => setPracticeSession(null)}
                       className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 rounded-xl transition-all"
                     >
                       <X size={20} />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-6 pr-1 py-4">
                    {/* Render current active revision question */}
                    {(() => {
                      const q = practiceSession.questions[practiceSession.currentIndex];
                      if (!q) return null;
                      const selectedOption = practiceSession.answers[q.id];
                      return (
                        <div className="space-y-6 text-left">
                          <MathQuestionContent questionText={q.questionText || q.question_text || ""} questionImage={q.question_image} />
                          
                          <div className="space-y-3 pt-4">
                            {q.options && Array.isArray(q.options) && q.options.map((opt, optIdx) => {
                              const isSelected = selectedOption === optIdx;
                              return (
                                <MathOptionContent
                                  key={`practice-opt-${optIdx}`}
                                  optionText={opt}
                                  idx={optIdx}
                                  isSelected={isSelected}
                                  onClick={() => handleSelectPracticeOption(q.id, optIdx)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
                    <span className="text-xs text-zinc-400 tracking-tight font-bold">
                       সঠিক উত্তর সমাধান স্বয়ংক্রিয়ভাবে রেকর্ড হবে
                    </span>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 rounded-xl font-bold px-6 h-11"
                      onClick={nextPracticeQuestion}
                    >
                      {practiceSession.currentIndex === practiceSession.questions.length - 1 ? 'সাবমিট করুন' : 'পরবর্তী প্রশ্ন'}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top Banner / Header Segment with statistics */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">ব্যক্তিগত লার্নিং ও রিভিশন সেন্টার</h2>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          আপনার পঠিত প্রশ্ন সংরক্ষণ করুন, ভুল উত্তরগুলো পুনরায় অনুশীলন করে জ্ঞান বৃদ্ধি করুন এবং সম্পূর্ণ পরীক্ষা প্রস্তুতি নিশ্চিত করুন।
        </p>
      </div>

      {/* 3. Stats Dashboard Panel Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200/50 p-6 shadow-sm space-y-2 relative overflow-hidden">
          <div className="text-zinc-400 absolute right-4 top-4 bg-orange-100 dark:bg-orange-950/20 p-2.5 rounded-2xl text-orange-600">
            <BookOpen size={24} />
          </div>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">ভুল উত্তরের সংখ্যা</p>
          <h4 className="text-3xl font-black text-zinc-900 dark:text-white">{wrongQuestions.length}টি প্রশ্ন</h4>
          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full inline-block mt-2">ভুল সংশোধন যোগ্য</span>
        </Card>

        <Card className="p-6 bg-white dark:bg-zinc-900/60 border border-zinc-200/50 p-6 shadow-sm space-y-2 relative overflow-hidden">
          <div className="text-zinc-400 absolute right-4 top-4 bg-amber-100 dark:bg-amber-950/20 p-2.5 rounded-2xl text-amber-500">
            <Bookmark size={24} />
          </div>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">বুকমার্ককৃত প্রশ্ন</p>
          <h4 className="text-3xl font-black text-zinc-900 dark:text-white">{savedQuestions.length}টি প্রশ্ন</h4>
          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full inline-block mt-2">সেভকৃত আর্কাইভ</span>
        </Card>

        {/* FEATURE 5: Practice Solver callout */}
        <div className="md:col-span-2 p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/10 space-y-4 flex flex-col justify-between rounded-[32px] relative overflow-hidden text-left hover:scale-[1.01] transition-transform duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <div className="space-y-1">
            <h4 className="text-xl font-bold tracking-tight text-white">ভুল সংশোধন প্র্যাকটিস সেশন</h4>
            <p className="text-xs text-blue-100 font-semibold">ভুল হওয়া প্রশ্নগুলো অনুশীলন করে আপনার কনসেপ্ট ক্লিয়ার ও ত্রুটি মুক্ত করুন। সঠিক উত্তর দিলে স্বয়ংক্রিয়ভাবে তালিকা হতে অবমুক্ত হবে।</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              className="!bg-white !text-blue-600 hover:!bg-blue-50 font-black rounded-xl text-xs h-11 px-5 shadow-sm"
              onClick={startPractice}
              disabled={filteredItems.length === 0}
              icon={Play}
            >
               অনুশীলন শুরু করুন
            </Button>
            <span className="text-[10px] font-bold text-blue-100 italic">
              {filteredItems.length}টি প্রশ্ন অনুশীলনে যোগ্য
            </span>
          </div>
        </div>
      </div>

      {/* 4. Filter / Interactive controls */}
      <Card className="p-6 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-3xl border border-zinc-200/30 rounded-[32px] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-6 text-left">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setActiveTab('wrong'); setChapterFilter('All'); setSubjectFilter('All'); }}
              className={`px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'wrong' 
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              ❌ ভুল উত্তরের তালিকা {wrongQuestions.length > 0 && `(${wrongQuestions.length})`}
            </button>
            <button 
              onClick={() => { setActiveTab('saved'); setChapterFilter('All'); setSubjectFilter('All'); }}
              className={`px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-wider transition-all duration-300 ${
                activeTab === 'saved' 
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              🔖 সেভকৃত প্রশ্নসমূহ {savedQuestions.length > 0 && `(${savedQuestions.length})`}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Subject filter dropdown */}
            <div className="flex flex-col text-left">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1 mb-1">বিষয় ফিল্টার</label>
              <select
                value={subjectFilter}
                onChange={(e) => { setSubjectFilter(e.target.value); setChapterFilter('All'); }}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 outline-none pr-6 focus:border-zinc-400"
              >
                {uniqueSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub === 'All' ? 'সব বিষয়' : sub}</option>
                ))}
              </select>
            </div>

            {/* Chapter filter dropdown */}
            <div className="flex flex-col text-left">
              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-1 mb-1">অধ্যায় ফিল্টার</label>
              <select
                value={chapterFilter}
                onChange={(e) => setChapterFilter(e.target.value)}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 outline-none pr-6 focus:border-zinc-400"
              >
                {uniqueChapters.map(chap => (
                  <option key={chap} value={chap}>{chap === 'All' ? 'সব অধ্যায়' : chap}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Question List rendering */}
        <div className="space-y-6">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const q = item.question;
              if (!q || !q.id) return null;
              
              const isWrongTab = activeTab === 'wrong';
              const isSolutionRevealed = !!revealedSolutions[q.id];

              return (
                <Card 
                  key={item.id || `revision-q-${idx}`}
                  className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all rounded-[24px] space-y-4 text-left relative"
                >
                  
                  {/* Badge tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-2 py-0.5 text-[8px] uppercase font-black">
                      {q.class || 'All'}
                    </Badge>
                    <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-none px-2 py-0.5 text-[8px] uppercase font-black">
                      {q.subject || 'General'}
                    </Badge>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{q.chapter || 'Chapter'}</span>
                    
                    {isWrongTab && item.attempts_count && (
                      <Badge className="bg-red-500/10 text-red-600 border-none text-[8px] uppercase font-black px-2 py-0.5 ml-auto">
                        ভুল চেষ্টা: {item.attempts_count} বার
                      </Badge>
                    )}
                  </div>

                  {/* Question Content */}
                  <div className="pt-2">
                    <MathQuestionContent questionText={q.questionText || q.question_text || ""} questionImage={q.question_image} />
                  </div>

                  {/* Option Lists or Expanded Answer reveal */}
                  <div className="space-y-3 pt-3">
                    {/* Disclose correct status visually inside cards */}
                    {isSolutionRevealed ? (
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/60 space-y-4">
                         
                         {/* Correct Answers summary */}
                         <div className="flex items-center gap-2">
                           <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-xs">
                             <Check size={12} />
                           </div>
                           <span className="text-xs text-zinc-500 font-bold">সঠিক উত্তর: </span>
                           <Badge className="bg-green-500/10 text-green-600 border-none text-xs font-bold">
                             {q.options && q.options[Number(q.correctAnswer ?? q.correct_answer)] 
                               ? `Option ${String.fromCharCode(65 + Number(q.correctAnswer ?? q.correct_answer))}: ${q.options[Number(q.correctAnswer ?? q.correct_answer)]}`
                               : `Option ${Number(q.correctAnswer ?? q.correct_answer) + 1}`
                             }
                           </Badge>
                         </div>

                         {/* Tracked incorrect answer row */}
                         {isWrongTab && item.user_answer !== undefined && (
                           <div className="flex items-center gap-2 pt-1">
                             <div className="w-5 h-5 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center font-black text-xs">
                               <X size={12} />
                             </div>
                             <span className="text-xs text-zinc-500 font-bold">আপনার ভুল অপশন ছিল: </span>
                             <Badge className="bg-red-500/10 text-red-600 border-none text-xs font-bold">
                               {q.options && q.options[Number(item.user_answer)] 
                                 ? `Option ${String.fromCharCode(65 + Number(item.user_answer))}: ${q.options[Number(item.user_answer)]}`
                                 : `Option ${Number(item.user_answer) + 1}`
                               }
                             </Badge>
                           </div>
                         )}

                         {/* Explanation disclosure layout */}
                         {q.explanation && (
                           <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
                             <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mb-1">ব্যাখ্যা (Solution Explanation)</p>
                             <div className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-semibold">
                               {q.explanation}
                             </div>
                           </div>
                         )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options && Array.isArray(q.options) && q.options.slice(0, 4).map((opt, i) => {
                          const isCorrectOptionIndex = i === Number(q.correctAnswer ?? q.correct_answer);
                          return (
                            <div 
                              key={i}
                              className="p-3 border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 rounded-xl text-xs font-semibold text-zinc-500 flex items-center"
                            >
                              <span className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 inline-flex items-center justify-center mr-2.5 text-[10px] font-black">
                                {String.fromCharCode(65 + i)}
                              </span>
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card bottom actions bar */}
                  <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-2">
                    <button
                      onClick={() => toggleRevealSolution(q.id)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
                    >
                      <HelpCircle size={14} />
                      {isSolutionRevealed ? 'প্রশ্ন অপশন দেখুন' : 'ব্যাখ্যা ও সমাধান দেখুন'}
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Delete actions */}
                      {isWrongTab ? (
                        <button
                          onClick={() => handleRemoveWrong(q.id)}
                          className="px-3.5 py-1.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 to-red-500/10 text-xs font-bold flex items-center gap-1 transition-all"
                          title="ভুল তালিকা থেকে সমাধান চিহ্নিত করুন"
                        >
                          <Check size={14} /> ভুল থেকে অবমুক্ত করুন
                        </button>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onToggleSaveQuestion(q.id)}
                          className="px-3.5 py-1.5 rounded-xl text-zinc-400 dark:text-zinc-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 text-xs font-black flex items-center gap-1.5 transition-all duration-300 border border-transparent hover:border-amber-500/20 shadow-sm hover:shadow"
                          title="বুকমার্ক সরিয়ে দিন"
                        >
                          <Bookmark size={13} className="fill-amber-500 text-amber-500" /> Unsave Question
                        </motion.button>
                      )}
                    </div>
                  </div>

                </Card>
              );
            })
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <Bookmark size={24} />
              </div>
              <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200">কোনো তথ্য খুঁজে পাওয়া যায়নি</h3>
              <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                 ফিল্টার সামঞ্জস্য করুন অথবা আপনার অনুশীলনে থাকা কোনো প্রশ্ন বুকমার্ক করুন।
              </p>
            </div>
          )}
        </div>
      </Card>

    </div>
  );
};

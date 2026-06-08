import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Flag, 
  Maximize2, 
  AlertCircle,
  CheckCircle2,
  X,
  Play,
  Check,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Badge, Card } from '../ui/Base';
import { Question, CustomExamSettings } from '../../types';

interface Props {
  settings: CustomExamSettings;
  questions: Question[];
  onFinish: (answers: any[], timeTaken: number) => void;
  onClose: () => void;
  savedQuestionIds?: Set<string>;
  onToggleSaveQuestion?: (qId: string) => void;
}

export const PremiumExamInterface: React.FC<Props> = ({ 
  settings, 
  questions, 
  onFinish, 
  onClose,
  savedQuestionIds = new Set(),
  onToggleSaveQuestion
}) => {
  const [answers, setAnswers] = useState<any[]>(new Array(questions.length).fill(null));
  const [flags, setFlags] = useState<boolean[]>(new Array(questions.length).fill(false));
  const [timeLeft, setTimeLeft] = useState(settings.duration * 60);
  const [isStarted, setIsStarted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isStarted) {
      // Fullscreen mode logic
      if (settings.fullscreenMode) {
        try {
          document.documentElement.requestFullscreen().catch(() => {});
        } catch (e) {}
      }

      // Tab switch detection
      const handleVisibilityChange = () => {
        if (settings.tabSwitchDetection && document.hidden) {
          alert("সতর্কবার্তা: ট্যাব পরিবর্তন শনাক্ত হয়েছে। এই ঘটনাটি লগ করা হয়েছে। স্ট্রিক্ট মোড সক্রিয় আছে।");
        }
      };

      // Prevent Copy/Paste
      const handleCopyPaste = (e: any) => {
        if (settings.preventCopyPaste) {
          e.preventDefault();
          return false;
        }
      };

      // Prevent Context Menu
      const handleContextMenu = (e: any) => {
        if (settings.strictMode) {
          e.preventDefault();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      if (settings.preventCopyPaste) {
        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);
        document.addEventListener('cut', handleCopyPaste);
      }
      if (settings.strictMode) {
        document.addEventListener('contextmenu', handleContextMenu);
      }

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('copy', handleCopyPaste);
        document.removeEventListener('paste', handleCopyPaste);
        document.removeEventListener('cut', handleCopyPaste);
        document.removeEventListener('contextmenu', handleContextMenu);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      };
    }
  }, [isStarted, settings]);

  useEffect(() => {
    if (isStarted && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, timeLeft]);

  const handleAutoSubmit = () => {
    onFinish(answers, settings.duration * 60 - timeLeft);
  };

  const toggleFlag = (idx: number) => {
    const newFlags = [...flags];
    newFlags[idx] = !newFlags[idx];
    setFlags(newFlags);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  if (!isStarted) {
    return (
      <div className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="w-24 h-24 bg-primary-palette text-white rounded-[32px] mx-auto flex items-center justify-center shadow-2xl shadow-purple-500/20">
            <Play size={40} className="ml-1" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white">সিস্টেম প্রস্তুত</h2>
            <p className="text-zinc-600 dark:text-zinc-500 font-bold uppercase tracking-widest text-[10px]">সর্বোচ্চ মনোযোগের জন্য প্রস্তুত হন</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
               <span className="text-[10px] font-black text-zinc-400 uppercase block">সময়সীমা</span>
               <span className="text-xl font-bold text-white">{settings.duration} মিনিট</span>
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
               <span className="text-[10px] font-black text-zinc-400 uppercase block">মোট প্রশ্ন</span>
               <span className="text-xl font-bold text-white">{questions.length}টি</span>
            </div>
          </div>
          <Button 
            variant="secondary"
            className="w-full py-5 bg-white dark:bg-white text-zinc-950 dark:text-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-100 font-extrabold text-base border border-zinc-200 shadow-md"
            onClick={() => setIsStarted(true)}
          >
            পরীক্ষা শুরু করুন
          </Button>
          <button onClick={onClose} className="text-zinc-500 font-bold text-sm hover:text-white transition-colors">বাতিল করুন</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-black flex flex-col font-sans">
      {/* Immersive Header */}
      <header className="h-20 border-b border-zinc-100 dark:border-zinc-900 px-6 sm:px-12 flex items-center justify-between shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-6">
           <button onClick={() => setShowExitConfirm(true)} className="w-10 h-10 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center transition-colors">
              <ChevronLeft size={24} className="dark:text-white" />
           </button>
           <div>
             <h3 className="font-black text-zinc-900 dark:text-white truncate max-w-[150px] sm:max-w-none text-sm uppercase tracking-wider">প্রিমিয়াম সেশন</h3>
             <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{settings.subjects.join(', ')}</span>
             </div>
           </div>
        </div>

        <div className={`px-6 py-2.5 rounded-2xl flex items-center gap-3 border-2 transition-all duration-500
          ${timeLeft < 300 ? 'border-red-500 bg-red-500/10 text-red-500 animate-pulse' : 'border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white'}`}>
           <Clock size={18} />
           <span className="font-black tabular-nums">{formatTime(timeLeft)}</span>
        </div>

        <div className="hidden sm:flex items-center gap-4">
           <Button variant="outline" size="sm" icon={Save}>সেভ হচ্ছে...</Button>
           <Button 
            onClick={handleAutoSubmit}
            className="bg-primary-palette text-white"
           >
             পরীক্ষা শেষ করুন
           </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto px-6 sm:px-12 py-12 custom-scrollbar scroll-smooth">
           <div className="max-w-3xl mx-auto space-y-24 pb-32">
             {questions.map((q, qIdx) => (
               <div 
                 key={q.id || `premium-q-${qIdx}`} 
                 id={`question-${qIdx}`}
                 className="space-y-8 scroll-mt-32"
               >
                 {q.isPlaceholder ? (
                   <div className="w-full bg-zinc-500/5 dark:bg-zinc-950/20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 text-center space-y-6 relative overflow-hidden backdrop-blur-md text-left">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
                     
                     <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold uppercase tracking-widest">
                       <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                       Upcoming Question
                     </div>

                     <div className="space-y-2">
                       <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white leading-relaxed">
                         Question {qIdx + 1} Coming Soon
                       </h2>
                       <p className="text-zinc-500 font-bold">This question is under preparation.</p>
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
                 <div className="flex items-center justify-between">
                    <div>
                       <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className="bg-primary-palette/10 text-primary-palette">প্রশ্ন {qIdx + 1} / {questions.length || 0}</Badge>
                        {onToggleSaveQuestion && q.id && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onToggleSaveQuestion(q.id)}
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
                        )}
                     </div>
                       <h2 className="text-2xl sm:text-3xl font-bold dark:text-white leading-relaxed">
                         {q.questionText}
                       </h2>
                    </div>
                    {q.points && (
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-2xl font-black text-primary-palette">{q.points}</span>
                        <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">পয়েন্ট</p>
                      </div>
                    )}
                 </div>

                 <div className="space-y-4">
                    {q.type === 'mcq' && q.options?.map((opt, i) => (
                      <button
                        key={`opt-${q.id || qIdx}-${i}`}
                        onClick={() => {
                          const newAnswers = [...answers];
                          newAnswers[qIdx] = i;
                          setAnswers(newAnswers);
                        }}
                        className={`w-full p-6 text-left rounded-3xl border-2 transition-all duration-300 flex items-center justify-between group
                          ${answers[qIdx] === i 
                            ? 'border-primary-palette bg-primary-palette/5' 
                            : 'border-zinc-100 dark:border-zinc-900 hover:border-primary-palette/50 dark:text-zinc-300'}`}
                      >
                        <div className="flex items-center gap-4">
                           <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs
                            ${answers[qIdx] === i ? 'bg-primary-palette text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-primary-palette/20 group-hover:text-primary-palette'}`}>
                              {String.fromCharCode(65 + i)}
                           </span>
                           <span className="font-bold text-lg">{opt}</span>
                        </div>
                        {answers[qIdx] === i && (
                          <div className="w-6 h-6 bg-primary-palette text-white rounded-full flex items-center justify-center">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    ))}

                    {q.type === 'written' && (
                      <textarea 
                        value={answers[qIdx] || ''}
                        onChange={(e) => {
                          const newAnswers = [...answers];
                          newAnswers[qIdx] = e.target.value;
                          setAnswers(newAnswers);
                        }}
                        placeholder="আপনার উত্তর এখানে লিখুন..."
                        className="w-full h-[300px] p-5 sm:p-8 bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[28px] sm:rounded-[32px] focus:ring-4 focus:ring-primary-palette/10 focus:border-primary-palette outline-none text-base sm:text-lg transition-all dark:text-white resize-none"
                      />
                    )}
                 </div>

                 <div className="flex items-center justify-between pt-4">
                    <button 
                      onClick={() => toggleFlag(qIdx)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all
                        ${flags[qIdx] ? 'bg-amber-100 border-amber-500 text-amber-500' : 'bg-zinc-50 dark:bg-zinc-900 border-transparent text-zinc-400'}`}
                    >
                      <Flag size={18} fill={flags[qIdx] ? 'currentColor' : 'none'} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {flags[qIdx] ? 'রিভিউয়ের জন্য মার্ক করা' : 'রিভিউয়ের জন্য মার্ক করুন'}
                      </span>
                    </button>
                 </div>
                 </>
                 )}
               </div>
             ))}

             <div className="flex flex-col items-center justify-center py-20 border-t border-zinc-100 dark:border-zinc-900 space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-black dark:text-white">Ready to Submit?</h3>
                  <p className="text-zinc-500 font-bold">Please review all questions before finishing.</p>
                </div>
                <Button 
                  onClick={handleAutoSubmit}
                  className="bg-primary-palette text-white px-12 h-14 rounded-2xl text-lg shadow-xl shadow-purple-500/20"
                >
                  Finalize and Submit
                </Button>
             </div>
           </div>
        </main>

        {/* Sidebar Navigator */}
        <aside className="hidden lg:flex w-80 border-l border-zinc-100 dark:border-zinc-900 flex-col bg-zinc-50 dark:bg-zinc-950">
           <div className="p-8 border-b border-zinc-100 dark:border-zinc-900">
              <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">প্রশ্ন নেভিগেটর</h4>
              <div className="grid grid-cols-5 gap-2">
                 {questions.map((_, i) => {
                   const isAnswered = answers[i] !== null && answers[i] !== '';
                   const isFlagged = flags[i];
                   
                   return (
                     <button
                        key={questions[i]?.id || `nav-dot-${i}`}
                        onClick={() => {
                          const el = document.getElementById(`question-${i}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`aspect-square rounded-xl text-[10px] font-black transition-all border-2 relative
                          ${isAnswered ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 
                            'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400'}`}
                     >
                       {i + 1}
                       {isFlagged && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-black" />}
                     </button>
                   );
                 })}
              </div>
           </div>
           
           <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
              <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">একনজরে সংকেত</h4>
              <div className="space-y-4">
                 {[
                   { label: 'চলমান', color: 'bg-primary-palette' },
                   { label: 'উত্তর দেওয়া হয়েছে', color: 'bg-emerald-500' },
                   { label: 'উত্তর দেওয়া হয়নি', color: 'bg-zinc-200 dark:bg-zinc-800' },
                   { label: 'পরে দেখব', color: 'bg-amber-500' }
                 ].map(item => (
                   <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">{item.label}</span>
                   </div>
                 ))}
              </div>

              <div className="mt-12 bg-primary-palette/5 p-6 rounded-3xl border border-primary-palette/20">
                 <div className="flex items-center gap-3 mb-2">
                    <Maximize2 size={16} className="text-primary-palette" />
                    <span className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">কঠোর মোড (Strict Mode)</span>
                 </div>
                 <p className="text-[10px] text-zinc-600 dark:text-zinc-500 leading-relaxed">
                   ফুলস্ক্রিন এবং ট্যাব পরিবর্তন শনাক্তকরণ সক্রিয়। ব্রাউজার পরিবর্তন করবেন না।
                 </p>
              </div>
           </div>

           <div className="p-8 mt-auto border-t border-zinc-100 dark:border-zinc-900">
              <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-4 mb-4">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">অগ্রগতি</span>
                    <span className="text-[10px] font-black text-primary-palette">
                      {questions.length > 0 ? Math.round((answers.filter(a => a !== null && a !== '').length / questions.length) * 100) : 0}%
                    </span>
                 </div>
                 <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary-palette"
                      initial={{ width: 0 }}
                      animate={{ width: `${questions.length > 0 ? (answers.filter(a => a !== null && a !== '').length / questions.length) * 100 : 0}%` }}
                    />
                 </div>
              </div>
              <Button 
                onClick={handleAutoSubmit} 
                className="w-full bg-emerald-500 text-white"
              >
                চূড়ান্ত সাবমিশন
              </Button>
           </div>
        </aside>
      </div>

      {/* Exit/Submit Confirmation Dialog */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 max-w-lg w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-3xl font-black mb-2 dark:text-white uppercase tracking-tight">চূড়ান্ত পরীক্ষা</h3>
              <p className="text-zinc-500 font-bold mb-8">
                আপনার {answers.filter(a => a === null || a === '').length}টি অনিষ্পন্ন প্রশ্ন আছে। আপনি কি সাবমিট করতে চান?
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  variant="outline" 
                  className="flex-1 py-4"
                  onClick={() => setShowExitConfirm(false)}
                >
                  পরীক্ষায় ফিরে যান
                </Button>
                <Button 
                  className="flex-1 py-4 bg-emerald-500 text-white"
                  onClick={handleAutoSubmit}
                >
                  সাবমিট এবং শেষ করুন
                </Button>
              </div>
              <button 
                onClick={onClose}
                className="mt-6 text-sm font-bold text-red-500 hover:opacity-80 transition-opacity"
              >
                পরীক্ষা ত্যাগ করুন (সতর্কবার্তা: কোনো প্রগ্রেস সেভ হবে না)
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

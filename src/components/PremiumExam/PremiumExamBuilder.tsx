import React, { useState, useMemo, useEffect } from 'react';
import { 
  Atom, 
  FlaskConical, 
  Calculator, 
  Dna, 
  Languages, 
  Monitor, 
  ChevronRight, 
  ChevronLeft, 
  Search, 
  Check, 
  Brain as BrainIcon, 
  Zap, 
  Clock, 
  Target, 
  AlertCircle,
  Shield,
  Layers,
  Settings,
  Sparkles,
  Save,
  Play,
  BookOpen,
  List,
  Pencil,
  Maximize2,
  Dice6,
  GraduationCap,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Badge } from '../ui/Base';
import { Subject, Chapter, CustomExamSettings, AcademicClassInfo, AcademicSubject, AcademicChapter, AcademicTopic } from '../../types';

interface Props {
  onGenerate: (settings: CustomExamSettings) => void;
  onSaveTemplate: (settings: CustomExamSettings) => void;
  weakChapters: string[];
  dynamicClasses: AcademicClassInfo[];
  dynamicSubjects: AcademicSubject[];
  dynamicChapters: AcademicChapter[];
  dynamicTopics: AcademicTopic[];
}

const STEPS = [
  { id: 'class', name: 'শ্রেণী নির্বাচন', icon: GraduationCap },
  { id: 'subjects', name: 'বিষয় নির্বাচন', icon: Layers },
  { id: 'chapters', name: 'অধ্যায় নির্বাচন', icon: Target },
  { id: 'topics', name: 'টপিক নির্বাচন', icon: BrainIcon },
  { id: 'config', name: 'প্রশ্নের ধরন', icon: Settings },
  { id: 'rules', name: 'পরিবেশ ও নিয়ম', icon: Shield },
  { id: 'preview', name: 'যাচাই ও শুরু', icon: Sparkles },
];

export const PremiumExamBuilder: React.FC<Props> = ({ 
  onGenerate, 
  onSaveTemplate, 
  weakChapters,
  dynamicClasses,
  dynamicSubjects,
  dynamicChapters,
  dynamicTopics
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [settings, setSettings] = useState<CustomExamSettings>({
    classId: '',
    subjects: [],
    chapters: [],
    mcqCount: 20,
    writtenCount: 5,
    duration: 60,
    difficulty: 'Easy',
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
  });

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 0));

  const toggleClass = (id: string) => {
    setSettings(prev => ({
      ...prev,
      classId: id,
      subjects: [],
      chapters: [],
      topics: []
    }));
    nextStep();
  };

  const toggleSubject = (id: string) => {
    setSettings(prev => ({
      ...prev,
      subjects: prev.subjects.includes(id) 
        ? prev.subjects.filter(s => s !== id) 
        : [...prev.subjects, id],
      chapters: [],
      topics: [] // Reset when subjects change
    }));
  };

  const toggleChapter = (id: string) => {
    setSettings(prev => ({
      ...prev,
      chapters: prev.chapters.includes(id)
        ? prev.chapters.filter(c => c !== id)
        : [...prev.chapters, id],
      topics: [] // Reset when chapters change
    }));
  };

  const toggleTopic = (id: string) => {
    setSettings(prev => ({
      ...prev,
      topics: prev.topics.includes(id)
        ? prev.topics.filter(t => t !== id)
        : [...prev.topics, id]
    }));
  };

  const currentSubjects = useMemo(() => {
    if (!settings.classId) return [];
    return dynamicSubjects.filter(s => s.classId === settings.classId);
  }, [settings.classId, dynamicSubjects]);

  const filteredChapters = useMemo(() => {
    return dynamicChapters.filter(c => 
      settings.subjects.includes(c.subjectId) && 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [settings.subjects, searchQuery, dynamicChapters]);

  const filteredTopics = useMemo(() => {
    return dynamicTopics.filter(t => 
      settings.chapters.includes(t.chapterId) &&
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [settings.chapters, searchQuery, dynamicTopics]);

  const stats = useMemo(() => {
    const selectedTopicsData = dynamicTopics.filter(t => settings.topics.includes(t.id));
    if (selectedTopicsData.length > 0) {
      return {
        totalMcq: selectedTopicsData.reduce((acc, t) => acc + (t.mcqCount || 0), 0) || selectedTopicsData.length * 20,
        totalWritten: selectedTopicsData.reduce((acc, t) => acc + (t.writtenCount || 0), 0) || selectedTopicsData.length * 5,
      };
    }
    
    const selectedChaptersData = dynamicChapters.filter(c => settings.chapters.includes(c.id));
    return {
      totalMcq: selectedChaptersData.length * 100, // Fallback if mcqCount not in AcademicChapter
      totalWritten: selectedChaptersData.length * 20,
    };
  }, [settings.topics, settings.chapters, dynamicTopics, dynamicChapters]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Progress Header */}
      <div className="flex justify-between items-center mb-12 overflow-x-auto pb-4 no-scrollbar">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === idx;
          const isCompleted = currentStep > idx;
          
          return (
            <div key={step.id} className="flex flex-col items-center min-w-[80px] sm:min-w-[100px] relative">
              <div 
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-500 z-10 
                  ${isActive ? 'bg-primary-palette text-white shadow-lg shadow-purple-500/20 scale-110' : 
                    isCompleted ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}
              >
                {isCompleted ? <Check size={18} /> : <Icon size={18} />}
              </div>
              <span className={`text-[9px] sm:text-[10px] uppercase tracking-widest font-bold mt-3 transition-colors duration-300
                ${isActive ? 'text-primary-palette' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {step.name}
              </span>
              {idx < STEPS.length - 1 && (
                <div className={`absolute left-1/2 top-5 sm:top-6 w-[80px] sm:w-[200px] h-[2px] -z-0 transition-colors duration-500
                  ${isCompleted ? 'bg-emerald-500/30' : 'bg-zinc-100 dark:bg-zinc-800'}`} 
                />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="min-h-[500px]"
        >
          {currentStep === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {dynamicClasses.map((cls) => {
                const isSelected = settings.classId === cls.id;
                return (
                  <Card 
                    key={cls.id}
                    onClick={() => toggleClass(cls.id)}
                    className={`relative p-8 text-center group transition-all duration-500 cursor-pointer
                      ${isSelected ? 'border-2 border-primary-palette bg-primary-palette/5' : 'border border-zinc-100 dark:border-zinc-800 hover:border-primary-palette/30'}`}
                  >
                    <div className={`w-20 h-20 rounded-[24px] mx-auto mb-6 flex items-center justify-center transition-all duration-500 group-hover:scale-110 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 group-hover:text-primary-palette`}>
                      <GraduationCap size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">{cls.name}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">আপনার একাডেমিক লেভেল বেছে নিন</p>
                    {isSelected && (
                      <motion.div 
                        layoutId="check-class"
                        className="absolute top-4 right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white"
                      >
                        <Check size={14} />
                      </motion.div>
                    )}
                  </Card>
                );
              })}
              {dynamicClasses.length === 0 && (
                <div className="col-span-full py-20 text-center text-zinc-500">
                   No classes found. Contact admin to set up academic structure.
                </div>
              )}
            </div>
          )}

          {currentStep === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentSubjects.map((subject) => {
                const isSelected = settings.subjects.includes(subject.id);
                return (
                  <Card 
                    key={subject.id}
                    onClick={() => toggleSubject(subject.id)}
                    className={`relative p-8 text-center group transition-all duration-500 cursor-pointer
                      ${isSelected ? 'border-2 border-primary-palette bg-primary-palette/5' : 'border border-zinc-100 dark:border-zinc-800 hover:border-primary-palette/30'}`}
                  >
                    <div 
                      className={`w-20 h-20 rounded-[24px] mx-auto mb-6 flex items-center justify-center transition-all duration-500 group-hover:scale-110
                        ${isSelected ? 'bg-primary-palette text-white' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400'}`}
                    >
                      <Layers size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white">{subject.name}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">এই বিষয়ে দক্ষ হয়ে উঠুন</p>
                    {isSelected && (
                      <motion.div 
                        layoutId="check-subject"
                        className="absolute top-4 right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white"
                      >
                        <Check size={14} />
                      </motion.div>
                    )}
                  </Card>
                );
              })}
              {currentSubjects.length === 0 && (
                <div className="col-span-full py-20 text-center text-zinc-500">
                   No subjects found for this class.
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text"
                    placeholder="অধ্যায় খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-primary-palette outline-none transition-all dark:text-white"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      chapters: Array.from(new Set([...prev.chapters, ...filteredChapters.map(c => c.id)])) 
                    }))}
                  >
                    সবগুলো নির্বাচন করুন
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, chapters: [] }))}
                  >
                    সব মুছুন
                  </Button>
                </div>
              </div>

              {settings.subjects.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                  <AlertCircle size={48} className="mx-auto mb-4 text-zinc-400" />
                  <p className="text-zinc-500">Please select at least one subject first</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredChapters.map((chapter) => {
                    const isSelected = settings.chapters.includes(chapter.id);
                    const isWeak = weakChapters.includes(chapter.id);
                    
                    return (
                      <Card 
                        key={chapter.id}
                        onClick={() => toggleChapter(chapter.id)}
                        className={`p-6 flex items-center justify-between border transition-all duration-300
                          ${isSelected ? 'border-primary-palette bg-primary-palette/5 shadow-md' : 'border-zinc-100 dark:border-zinc-800'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                            ${isSelected ? 'bg-primary-palette text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                            {isSelected ? <Check size={18} /> : <BookOpen size={18} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-zinc-900 dark:text-white">{chapter.name}</h4>
                              {isWeak && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">প্র্যাকটিস প্রয়োজন</Badge>}
                            </div>
                            <div className="flex gap-3 mt-1">
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{chapter.mcqCount}টি MCQ</span>
                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{chapter.writtenCount}টি লিখিত</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text"
                    placeholder="টপিক খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-primary-palette outline-none transition-all dark:text-white"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSettings(prev => ({ 
                      ...prev, 
                      topics: Array.from(new Set([...prev.topics, ...filteredTopics.map(t => t.id)])) 
                    }))}
                  >
                    সবগুলো নির্বাচন করুন
                   </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSettings(prev => ({ ...prev, topics: [] }))}
                  >
                    সব মুছুন
                  </Button>
                </div>
              </div>

              {settings.chapters.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                  <AlertCircle size={48} className="mx-auto mb-4 text-zinc-400" />
                  <p className="text-zinc-500">Please select at least one chapter first</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTopics.map((topic) => {
                    const isSelected = settings.topics.includes(topic.id);
                    return (
                      <Card 
                        key={topic.id}
                        onClick={() => toggleTopic(topic.id)}
                        className={`p-5 flex flex-col justify-between border transition-all duration-300 relative overflow-hidden group
                          ${isSelected ? 'border-primary-palette bg-primary-palette/5 shadow-lg shadow-purple-500/10' : 'border-zinc-100 dark:border-zinc-800 hover:border-primary-palette/30'}`}
                      >
                        {isSelected && (
                          <motion.div 
                            layoutId={`glow-${topic.id}`}
                            className="absolute -inset-1 bg-gradient-to-br from-primary-palette/20 to-transparent blur-xl -z-10"
                          />
                        )}
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                            ${isSelected ? 'bg-primary-palette text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                            {isSelected ? <Check size={18} /> : <Zap size={18} />}
                          </div>
                          <div className="text-right">
                             <span className="text-[9px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">MCQ</span>
                             <span className="font-bold text-sm text-zinc-900 dark:text-white">{topic.mcqCount || 0}</span>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-white text-sm mb-2">{topic.name}</h4>
                          {topic.tags && topic.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {topic.tags.map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[8px] font-black uppercase tracking-widest leading-none">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                  {filteredTopics.length === 0 && (
                     <div className="col-span-full py-20 text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-[32px]">
                        No topics found for the selected chapters.
                     </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* MCQ Config */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <List size={20} />
                  </div>
                  <h3 className="text-xl font-bold dark:text-white">MCQ কনফিগারেশন</h3>
                </div>
                
                <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900 p-6 rounded-[28px] border border-zinc-100 dark:border-zinc-800">
                  <div>
                    <label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2 block">প্রশ্নের সংখ্যা</label>
                    <input 
                      type="range" 
                      min="5" 
                      max={Math.min(100, stats.totalMcq)} 
                      step="5"
                      value={settings.mcqCount}
                      onChange={(e) => setSettings(prev => ({ ...prev, mcqCount: parseInt(e.target.value) || 0 }))}
                      className="w-full accent-primary-palette"
                    />
                    <div className="flex justify-between mt-2 text-xs font-bold text-primary-palette">
                      <span>5</span>
                      <span className="bg-primary-palette text-white px-3 py-1 rounded-full">{settings.mcqCount || 0}</span>
                      <span>{Math.min(100, stats.totalMcq)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2 block">প্রতি MCQ-তে নম্বর</label>
                      <input 
                        type="number" 
                        value={settings.marksPerMcq}
                        onChange={(e) => setSettings(prev => ({ ...prev, marksPerMcq: parseInt(e.target.value) || 0 }))}
                        className="w-full p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 focus:ring-2 focus:ring-primary-palette outline-none text-zinc-900 dark:text-white"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800">
                        <input 
                          type="checkbox" 
                          checked={settings.negativeMarking}
                          onChange={(e) => setSettings(prev => ({ ...prev, negativeMarking: e.target.checked }))}
                          className="w-4 h-4 accent-red-500"
                        />
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">নেগেটিভ মার্কিং (Negative Marking)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Written Config */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Pencil size={20} />
                  </div>
                  <h3 className="text-xl font-bold dark:text-white">লিখিত প্রশ্ন কনফিগারেশন</h3>
                </div>

                <div className="space-y-4 bg-zinc-50 dark:bg-zinc-900 p-6 rounded-[28px] border border-zinc-100 dark:border-zinc-800">
                  <div>
                    <label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2 block">প্রশ্নের সংখ্যা</label>
                    <input 
                      type="range" 
                      min="0" 
                      max={Math.min(20, stats.totalWritten)} 
                      step="1"
                      value={settings.writtenCount}
                      onChange={(e) => setSettings(prev => ({ ...prev, writtenCount: parseInt(e.target.value) || 0 }))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between mt-2 text-xs font-bold text-amber-500">
                      <span>0</span>
                      <span className="bg-amber-500 text-white px-3 py-1 rounded-full">{settings.writtenCount || 0}</span>
                      <span>{Math.min(20, stats.totalWritten)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2 block">প্রতি প্রশ্নে নম্বর</label>
                    <input 
                      type="number" 
                      value={settings.marksPerWritten}
                      onChange={(e) => setSettings(prev => ({ ...prev, marksPerWritten: parseInt(e.target.value) || 0 }))}
                      className="w-full p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800 focus:ring-2 focus:ring-amber-500 outline-none text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Difficulty */}
              <div className="md:col-span-2 mt-4 space-y-6">
                 <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary-palette/10 text-primary-palette flex items-center justify-center">
                    <BrainIcon size={20} />
                  </div>
                  <h3 className="text-xl font-bold dark:text-white">কাঠিন্য লেভেল ব্যালেন্স (Difficulty)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'Easy', label: 'Easy', activeClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/20', icon: <div className="w-2 h-2 rounded-full bg-emerald-500" /> },
                    { id: 'Medium', label: 'Medium', activeClass: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/20', icon: <div className="w-2 h-2 rounded-full bg-amber-500" /> },
                    { id: 'Hard', label: 'Hard', activeClass: 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 shadow-lg shadow-red-500/20', icon: <div className="w-2 h-2 rounded-full bg-red-500" /> }
                  ].map((diff) => (
                    <button
                      key={diff.id}
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, difficulty: diff.id as any }))}
                      className={`p-6 rounded-2xl font-bold transition-all duration-300 border-2 flex flex-col items-center gap-3
                        ${settings.difficulty === diff.id 
                          ? diff.activeClass
                          : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:hover:border-zinc-700'}`}
                    >
                      {diff.icon}
                      {diff.label}
                    </button>
                  ))}
                </div>


              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock size={20} className="text-primary-palette" />
                    <h3 className="text-xl font-bold dark:text-white">Time & Submission</h3>
                  </div>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-[28px] border border-zinc-100 dark:border-zinc-800 space-y-6">
                    <div>
                      <label className="text-sm font-bold text-zinc-700 dark:text-zinc-400 mb-4 block">কাঙ্ক্ষিত সময় সেট করুন (মিনিট)</label>
                      <div className="flex flex-col gap-4">
                        <div className="relative">
                          <input 
                            type="number" 
                            min="1"
                            max="300"
                            value={settings.duration}
                            onChange={(e) => setSettings(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                            className="w-full p-4 pl-12 bg-white dark:bg-zinc-800 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 focus:border-primary-palette outline-none font-black text-xl text-zinc-900 dark:text-white transition-all"
                            placeholder="সময় লিখুন..."
                          />
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-palette" size={20} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 font-bold">মিনিট</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {[15, 30, 45, 60, 90, 120].map(t => (
                            <button 
                              key={t}
                              type="button"
                              onClick={() => setSettings(prev => ({ ...prev, duration: t }))}
                              className={`flex-1 min-w-[70px] py-3 rounded-xl text-xs font-black transition-all border-2
                                ${settings.duration === t 
                                  ? 'bg-primary-palette border-primary-palette text-white shadow-lg' 
                                  : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-500 hover:border-primary-palette/30'}`}
                            >
                              {t} মিনিট
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center justify-between cursor-pointer p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-800 group hover:border-emerald-500/50 transition-all">
                        <div className="flex items-center gap-3">
                          <Zap size={18} className="text-emerald-500" />
                          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">তাৎক্ষণিক ফলাফল (Instant Results)</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={settings.instantResult}
                          onChange={(e) => setSettings(prev => ({ ...prev, instantResult: e.target.checked }))}
                          className="w-5 h-5 accent-emerald-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield size={20} className="text-red-500" />
                    <h3 className="text-xl font-bold dark:text-white">স্ট্রিক্ট এনভায়রনমেন্ট (Strict)</h3>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-[28px] border border-zinc-100 dark:border-zinc-800 space-y-3">
                    {[
                      { id: 'strictMode', label: 'স্ট্রিক্ট মোড (Strict)', icon: Shield, color: 'text-red-500' },
                      { id: 'fullscreenMode', label: 'ফুলস্ক্রিন মোড', icon: Maximize2, color: 'text-blue-500' },
                      { id: 'tabSwitchDetection', label: 'ট্যাব পরিবর্তন রোধ', icon: Monitor, color: 'text-amber-500' },
                      { id: 'preventCopyPaste', label: 'কপি-পেস্ট বন্ধ', icon: Lock, color: 'text-purple-500' },
                      { id: 'randomizeQuestions', label: 'প্রশ্ন এলোমেলো করা', icon: Dice6, color: 'text-emerald-500' }
                    ].map(opt => (
                      <label key={opt.id} className="flex items-center justify-between cursor-pointer p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-800 group transition-all hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
                        <div className="flex items-center gap-3">
                          <opt.icon size={18} className={opt.color} />
                          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{opt.label}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={(settings as any)[opt.id]}
                          onChange={(e) => setSettings(prev => ({ ...prev, [opt.id]: e.target.checked }))}
                        className="w-5 h-5 accent-primary-palette"
                      />
                    </label>
                  ))}
                </div>
              </div>
             </div>
          </div>
          )}

          {currentStep === 5 && (
             <div className="max-w-2xl mx-auto space-y-8">
               <Card className="p-8 border-2 border-primary-palette bg-primary-palette/5 relative overflow-hidden">
                 {/* Decorative background circle */}
                 <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-palette/10 rounded-full blur-3xl -z-10" />
                 
                 <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-20 h-20 bg-primary-palette text-white rounded-[28px] flex items-center justify-center mb-4 shadow-xl">
                      <Sparkles size={36} />
                    </div>
                    <h2 className="text-3xl font-black mb-1 text-zinc-900 dark:text-white">পরীক্ষার প্রিভিউ</h2>
                    <p className="text-zinc-600 dark:text-zinc-500 font-bold uppercase tracking-widest text-[10px]">আপনার পরীক্ষার কাঠামো প্রস্তুত</p>
                 </div>

                 <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl">
                      <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-1">সময়সীমা</span>
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-black text-primary-palette">{settings.duration}</span>
                        <span className="text-sm font-bold text-zinc-600 dark:text-zinc-500 mb-1">মি.</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl">
                      <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block mb-1">মোট নম্বর</span>
                      <div className="flex items-end gap-1">
                        <span className="text-3xl font-black text-emerald-500">
                          {(settings.mcqCount * settings.marksPerMcq) + (settings.writtenCount * settings.marksPerWritten)}
                        </span>
                        <span className="text-sm font-bold text-zinc-600 dark:text-zinc-500 mb-1">pts</span>
                      </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-white dark:border-zinc-800">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center"><List size={18} /></div>
                         <span className="font-bold text-zinc-900 dark:text-white">MCQ প্রশ্নসমূহ</span>
                       </div>
                       <span className="font-black text-zinc-700 dark:text-zinc-300">{settings.mcqCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-white dark:border-zinc-800">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center"><Pencil size={18} /></div>
                         <span className="font-bold text-zinc-900 dark:text-white">লিখিত প্রশ্নসমূহ</span>
                       </div>
                       <span className="font-black text-zinc-700 dark:text-zinc-300">{settings.writtenCount}</span>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-white dark:border-zinc-800">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl flex items-center justify-center"><AlertCircle size={18} /></div>
                         <span className="font-bold text-zinc-900 dark:text-white">নেগেটিভ মার্কিং</span>
                       </div>
                       <Badge className={settings.negativeMarking ? 'bg-red-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}>
                         {settings.negativeMarking ? 'চালু' : 'বন্ধ'}
                       </Badge>
                    </div>
                 </div>

                 <div className="flex gap-4 mt-8">
                   <Button 
                    variant="outline" 
                    className="flex-1 py-4"
                    icon={Save}
                    onClick={() => onSaveTemplate(settings)}
                   >
                     টেমপ্লেট হিসেবে সেভ করুন
                   </Button>
                   <Button 
                    className="flex-[1.5] py-4 bg-primary-palette text-white"
                    icon={Play}
                    onClick={() => onGenerate(settings)}
                   >
                     পরীক্ষা শুরু করুন
                   </Button>
                 </div>
               </Card>

               <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-3xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center shrink-0">
                    <BrainIcon size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white">স্মার্ট টিপস</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-500 leading-relaxed">
                      এই পরীক্ষায় {settings.chapters.length}টি অধ্যায় অন্তর্ভুক্ত রয়েছে। আমরা আপনার আগের চেষ্টাগুলোর ফলাফল এবং সময়ের তথ্যের সাথে সামঞ্জস্য রেখে পরীক্ষাটি সাজিয়েছি।
                    </p>
                  </div>
               </div>
             </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer Navigation */}
      <div className="mt-12 flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800 pt-8">
        <Button 
          variant="ghost" 
          onClick={prevStep}
          disabled={currentStep === 0}
          icon={ChevronLeft}
        >
          পিছনে
        </Button>
        
        <div className="flex gap-4">
           {currentStep < STEPS.length - 1 && (
             <Button 
              onClick={nextStep}
              className="bg-primary-palette text-white px-8"
             >
               পরবর্তী <ChevronRight size={18} className="ml-1" />
             </Button>
           )}
        </div>
      </div>
    </div>
  );
};

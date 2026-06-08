import React from 'react';
import { 
  TrendingUp, 
  Zap, 
  Target, 
  Clock, 
  Brain as BrainIcon, 
  Dna, 
  Award, 
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Flame,
  CheckCircle2,
  HelpCircle,
  Map,
  Compass,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Badge } from '../ui/Base';
import { UserAnalytics } from '../../types';

interface Props {
  analytics: UserAnalytics;
}

export const PremiumAnalytics: React.FC<Props> = ({ analytics }) => {
  const streak = analytics.streak || 0;
  const consistency = analytics.consistency || 0;
  const predictiveScore = analytics.predictiveScore || 0;
  
  // Custom SVG path generators for line charts (robust and responsive)
  const linePath = React.useMemo(() => {
    const data = analytics.improvementData || [];
    if (data.length < 2) return '';
    const width = 500;
    const height = 150;
    const padding = 20;
    
    const xStep = (width - padding * 2) / (data.length - 1);
    const coords = data.map((d, i) => {
      const x = padding + i * xStep;
      // Map 0 to 100 accuracy into height - padding to padding
      const y = height - padding - (d.score / 100) * (height - padding * 2);
      return { x, y };
    });
    
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      // Smooth cubic bezier curves
      const cpX1 = coords[i - 1].x + xStep / 2;
      const cpY1 = coords[i - 1].y;
      const cpX2 = coords[i].x - xStep / 2;
      const cpY2 = coords[i].y;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${coords[i].x} ${coords[i].y}`;
    }
    return path;
  }, [analytics.improvementData]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16">
      
      {/* 4 HIGH IMPACT METRIC CARDS */}
      <div id="stat-cards" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'গড় নির্ভুলতা', value: `${analytics.accuracy}%`, description: 'মোট প্রশ্নের সঠিক উত্তর', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'সমাধানের গতি', value: `${analytics.speed} q/m`, description: 'প্রতি মিনিটে সমাধানকৃত প্রশ্ন', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'দুর্বল অধ্যায়', value: `${analytics.weakChapters.length}টি`, description: 'পর্যালোচনা প্রয়োজন', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
          { label: 'অধ্যবসায় স্ট্রিক', value: `${streak} দিন`, description: 'টানা পড়াশোনার পরিমাণ', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((stat, i) => (
          <Card key={`stat-card-${i}-${stat.label}`} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black mt-1 text-zinc-900 dark:text-white">{stat.value}</h3>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-1">{stat.description}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PREMIUM SCORE & EXPERT COMPASS */}
        <Card id="predictive-analytics" className="p-6 sm:p-8 border-2 border-primary-palette/30 bg-primary-palette/5 relative overflow-hidden flex flex-col justify-between rounded-3xl min-h-[380px]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-palette/15 rounded-full blur-2xl" />
          
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary-palette text-white rounded-xl flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black dark:text-white">ভবিষ্যদ্বাণী স্কোর</h3>
                <p className="text-[10px] text-zinc-500">Predictive Perf Score</p>
              </div>
            </div>

            {/* Glowing SVG Radial Gauge */}
            <div className="flex flex-col items-center justify-center my-6">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    fill="transparent"
                    stroke="rgba(139, 92, 246, 0.1)"
                    strokeWidth="10"
                  />
                  <motion.circle
                    cx="64"
                    cy="64"
                    r="54"
                    fill="transparent"
                    stroke="#8b5cf6"
                    strokeWidth="10"
                    strokeDasharray={339.29}
                    initial={{ strokeDashoffset: 339.29 }}
                    animate={{ strokeDashoffset: 339.29 - (339.29 * (predictiveScore || 30)) / 100 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-zinc-900 dark:text-white">{predictiveScore || '--'}</span>
                  <span className="text-[9px] font-bold text-primary-palette uppercase tracking-widest">সম্ভাব্যতা</span>
                </div>
              </div>
              <p className="text-xs text-center text-zinc-600 dark:text-zinc-400 font-medium px-4 mt-4 leading-relaxed">
                আপনার ধারাবাহিকতা ও দক্ষতার ওপর ভিত্তি করে পরবর্তী পরীক্ষায় আনুমানিক <span className="font-bold text-primary-palette">{predictiveScore}%</span> মার্ক অর্জনের নিশ্চয়তা রয়েছে।
              </p>
            </div>
          </div>

          <div className="bg-white/50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50 mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-zinc-500">প্রস্তুতির ধারাবাহিকতা:</span>
              <span className="font-black text-emerald-500">{consistency}% (স্থিতিশীল)</span>
            </div>
          </div>
        </Card>

        {/* STUDY ROADMAP */}
        <Card id="study-roadmap" className="lg:col-span-2 p-8 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-500/10 text-violet-500 rounded-xl flex items-center justify-center">
                  <Map size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black dark:text-white">স্মার্ট স্টাডি রোডম্যাপ</h3>
                  <p className="text-[10px] text-zinc-500">AI-Guided Custom Study Roadmap</p>
                </div>
              </div>
              <Badge className="bg-violet-500/10 text-violet-600 border border-violet-500/20 py-1">ব্যক্তিগত নির্দেশিকা</Badge>
            </div>

            <div className="space-y-4">
              {analytics.smartRoadmap && analytics.smartRoadmap.length > 0 ? (
                analytics.smartRoadmap.map((step, idx) => {
                  const colors = [
                    'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/50',
                    'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50',
                    'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-800/50',
                    'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800/50'
                  ];
                  return (
                    <div 
                      key={`roadmap-step-${idx}`} 
                      className={`flex gap-4 p-4 rounded-2xl border ${colors[idx % colors.length]}`}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 bg-white dark:bg-zinc-800 border-2 border-inherit">
                        {idx + 1}
                      </div>
                      <p className="text-xs font-semibold leading-relaxed shrink">{step}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-zinc-400 italic">স্টাডি রোডম্যাপ তৈরির জন্য অন্তত একটি পরীক্ষায় অংশ নিন।</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 text-zinc-600/70 text-[10px] font-medium items-center mt-6">
            <Compass size={12} />
            <span>আমাদের AI আপনার প্রতিটি সাবমিশনের ওপর ভিত্তি করে এই পদক্ষেপগুলো রিয়েল-টাইমে আপডেট করে থাকে।</span>
          </div>
        </Card>
      </div>

      {/* DETAILED DYNAMIC VISUAL CHARTS PANEL */}
      <Card id="visual-dashboard-analytics" className="p-8 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black dark:text-white">পারফরম্যান্স এবং প্রোগ্রেস ভিজুয়ালাইজার</h3>
              <p className="text-[10px] text-zinc-500">Live Dynamic Trends & Subject Accuracies</p>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 py-1.5 self-start">বাস্তব ডেটাভিত্তিক চার্ট</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* CHART 1: PROGRESS LINE & ACCURACY TREND */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">১. অগ্রগতি ও নির্ভুলতা ট্রেন্ড</span>
              <span className="text-[10px] font-bold text-primary-palette">গত ৭+ সেশন</span>
            </div>
            
            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 sm:p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-center min-h-[180px]">
              {analytics.improvementData && analytics.improvementData.length >= 2 ? (
                <div className="w-full">
                  <svg viewBox="0 0 500 150" className="w-full overflow-visible">
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => (
                      <line
                        key={`grid-line-${idx}`}
                        x1="20"
                        y1={20 + val * 110}
                        x2="480"
                        y2={20 + val * 110}
                        stroke="rgba(150,150,150,0.15)"
                        strokeWidth="1"
                        strokeDasharray="4"
                      />
                    ))}
                    {/* Interpolated Smooth Curve Path */}
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Data dots */}
                    {analytics.improvementData.map((d, idx) => {
                      const xSpace = (500 - 40) / (analytics.improvementData.length - 1);
                      const x = 20 + idx * xSpace;
                      const y = 150 - 20 - (d.score / 100) * 110;
                      return (
                        <g key={`dot-${idx}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r="6"
                            className="fill-primary-palette stroke-white dark:stroke-zinc-900 border"
                            strokeWidth="2.5"
                          />
                          <text
                            x={x}
                            y={y - 10}
                            textAnchor="middle"
                            className="fill-zinc-800 dark:fill-zinc-200 font-bold text-[9px]"
                          >
                            {d.score}%
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                  <div className="w-16 h-16 bg-primary-palette/5 rounded-full flex items-center justify-center mb-3">
                    <TrendingUp size={24} className="text-zinc-600" />
                  </div>
                  <p className="text-xs font-semibold">অগ্রগতির চার্ট রেন্ডার করতে অন্তত ২টি পরীক্ষা সম্পন্ন করুন।</p>
                  <p className="text-[10px] text-zinc-500 mt-1">পরীক্ষা শেষ হলেই আপনার ট্র্যাকিং গ্রাফ সচল হবে।</p>
                </div>
              )}
            </div>
          </div>

          {/* CHART 2: SUBJECT PERFORMANCE BAR CHART */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">২. বিষয়ভিত্তিক পারফরম্যান্স বিশ্লেষণ</span>
              <span className="text-[10px] font-bold text-zinc-500">গড় নির্ভুলতা হার</span>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-800 min-h-[180px] flex flex-col justify-center">
              {analytics.subjectPerformance && analytics.subjectPerformance.length > 0 ? (
                <div className="space-y-4 w-full">
                  {analytics.subjectPerformance.map((sub, idx) => (
                    <div key={`sub-perf-${idx}`} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">{sub.name}</span>
                        <div className="flex gap-2 items-center text-[10px] font-semibold text-zinc-500">
                          <span>মোট সেশন: {sub.totalExams}</span>
                          <span className={`${sub.accuracy >= 75 ? 'text-emerald-500' : 'text-primary-palette'}`}>{sub.accuracy}% সঠিক</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2 sm:h-2.5 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${sub.accuracy >= 75 ? 'bg-emerald-500' : sub.accuracy >= 55 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${sub.accuracy}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mb-3">
                    <BarChart3 size={24} className="text-zinc-500" />
                  </div>
                  <p className="text-xs font-semibold">বিষয়ভিত্তিক পারফরম্যান্স ডেটা প্রক্রিয়াধীন।</p>
                  <p className="text-[10px] text-zinc-500 mt-1">সব বিষয়ের টেস্ট দেওয়ার সঙ্গে সঙ্গেই নির্ভুলতার রেশিও চার্ট এখানে দৃশ্যমান হবে।</p>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 pt-8 border-t border-zinc-100 dark:border-zinc-800">
          
          {/* CHART 3: ACCURACY VS Chapter Status Gauge */}
          <div className="space-y-3">
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-2">৩. শক্তি বনাম দুর্বল অধ্যায় সমন্বয়</span>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                <span className="text-[10px] font-bold text-emerald-600 block mb-2 uppercase tracking-wide">১০০% আয়ত্তে (Strong)</span>
                <div className="space-y-1">
                  {analytics.strongChapters && analytics.strongChapters.length > 0 ? (
                    analytics.strongChapters.map((ch, i) => (
                      <div key={`strong-ch-block-${i}`} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        <span className="truncate">{ch}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">পর্যাপ্ত মক টেস্ট প্রয়োজন</span>
                  )}
                </div>
              </div>

              <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
                <span className="text-[10px] font-bold text-rose-500 block mb-2 uppercase tracking-wide">পুনর্বিবেচনা ক্ষেত্র (Weak)</span>
                <div className="space-y-1">
                  {analytics.weakChapters && analytics.weakChapters.length > 0 ? (
                    analytics.weakChapters.map((ch, i) => (
                      <div key={`weak-ch-block-${i}`} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        <AlertTriangle size={12} className="text-rose-500 shrink-0" />
                        <span className="truncate">{ch}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic">কোনো দুর্বল কোণ নেই, চমৎকার!</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CHART 4: SPEED GAUGE ANALYSIS */}
          <div className="space-y-3 flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-2">৪. স্পিড ট্রেন্ড অ্যানালিটিক্স</span>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                আপনার সমাধানের গড় স্পিড মিনিটে <span className="font-bold text-primary-palette">{analytics.speed}টি প্রশ্ন</span>। আপনার সমাধানের সর্বোচ্চ গতি অর্জিত হয়েছে <span className="font-bold text-zinc-800 dark:text-zinc-200">{analytics.fastestSubject}</span> বিষয়ে এবং তুলনামূলক বেশি চিন্তা করতে হচ্ছে <span className="font-bold text-zinc-800 dark:text-zinc-200">{analytics.slowestSubject}</span> এর অংশে।
              </p>
            </div>
            
            <div className="flex gap-4 items-center bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 mt-2">
              <div className="text-center w-1/2 border-r border-zinc-200 dark:border-zinc-800 pr-2">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase">সর্বোত্তম বিষয় রেট (Min)</span>
                <span className="text-lg font-black text-emerald-500 block mt-1">{analytics.fastestSpeed > 0 ? `${Math.round(analytics.fastestSpeed)}s` : '--'}</span>
              </div>
              <div className="text-center w-1/2 pl-2">
                <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 block tracking-wide uppercase">ধীর বিষয় রেট (Max)</span>
                <span className="text-lg font-black text-amber-500 block mt-1">{analytics.slowestSpeed > 0 ? `${Math.round(analytics.slowestSpeed)}s` : '--'}</span>
              </div>
            </div>
          </div>

        </div>
      </Card>

      {/* ADVANCED AI AUDITS & ERROR PROFILES (WRONG / SKIPPED CHOICES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* MISTAKE PATTERNS AUDIT */}
        <Card id="mistake-audit" className="p-6 sm:p-8 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black dark:text-white">ভুল উত্তর বা ভুল প্যাটার্ন নিরীক্ষা</h3>
              <p className="text-[10px] text-zinc-500">Wrong Answers Choice Auditor</p>
            </div>
          </div>

          <div className="space-y-4">
            {analytics.mistakePatterns && analytics.mistakePatterns.length > 0 ? (
              analytics.mistakePatterns.map((pat, idx) => (
                <div key={`mistake-pat-${idx}`} className="flex gap-3 bg-rose-500/5 border border-rose-500/15 p-4 rounded-2xl text-xs text-rose-700 dark:text-rose-400 font-semibold leading-relaxed">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <p>{pat}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 italic">কোনো ভুলের প্যাটার্ন নেই।</p>
            )}
          </div>
        </Card>

        {/* SKIPPED PATTERNS AUDIT */}
        <Card id="skipped-audit" className="p-6 sm:p-8 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-zinc-500/10 text-zinc-600 rounded-xl flex items-center justify-center">
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black dark:text-white">এড়িয়ে যাওয়া প্রশ্ন বিশ্লেষণ</h3>
              <p className="text-[10px] text-zinc-500">Skipped/Skipping Topic Trends</p>
            </div>
          </div>

          <div className="space-y-4">
            {analytics.skippedPatterns && analytics.skippedPatterns.length > 0 ? (
              analytics.skippedPatterns.map((pat, idx) => (
                <div key={`skipped-pat-${idx}`} className="flex gap-3 bg-zinc-500/5 border border-zinc-400/20 p-4 rounded-2xl text-xs text-zinc-700 dark:text-zinc-400 font-semibold leading-relaxed">
                  <div className="w-2 h-2 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
                  <p>{pat}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 italic">কোনো এড়ানো প্রশ্ন বা বিষয়ের বিশেষ প্রবণতা নেই।</p>
            )}
          </div>
        </Card>
      </div>

      {/* EXAM DNA PROFILE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* DNA PANEL */}
        <Card id="exam-dna-panel" className="lg:col-span-1 p-6 relative overflow-hidden flex flex-col justify-between dark:border-zinc-800 rounded-3xl min-h-[300px]">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-cyan-500/10 text-cyan-500 rounded-xl flex items-center justify-center">
                <Dna size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold dark:text-white">পরীক্ষার ডিএনএ (DNA)</h3>
                <p className="text-[10px] text-zinc-500">Student Personality Profile</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {analytics.examDNA.traits.map((trait) => (
                <Badge key={`dna-trait-${trait}`} className="bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 px-3 py-1.5 rounded-xl font-bold text-xs">
                  {trait}
                </Badge>
              ))}
            </div>
            
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
              <p className="text-xs text-zinc-600 dark:text-zinc-500 italic leading-relaxed">
                "{analytics.examDNA.description}"
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              const shareText = `চেক আউট করুন আমার এক্সাম ডিএনএ প্রফাইল: ${analytics.examDNA.traits.join(', ')}। নির্ভুলতা ${analytics.accuracy}% গতি ${analytics.speed} q/m! #PremiumMokTest`;
              navigator.clipboard.writeText(shareText).then(() => {
                alert("আপনার পরীক্ষার পালস ক্লিপবোর্ডে কপি করা হয়েছে!");
              });
            }}
            className="w-full py-4 mt-6 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-200 "
          >
            আমার পালস শেয়ার করুন
          </button>
        </Card>

        {/* AI OS RELEVANT SYSTEM CHECKS AND BENCHMARKS */}
        <Card id="ai-performance-benchmarks" className="lg:col-span-2 p-8 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                  <BrainIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black dark:text-white">AI OS ডায়াগনস্টিকস ও সেশন ফিডব্যাক</h3>
                  <p className="text-[10px] text-zinc-500">Live Diagnostics & AI OS Benchmarks</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 py-1 font-bold text-[10px]">অডিট সম্পূর্ণ</Badge>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold leading-relaxed">
                {analytics.accuracy > 0 ? (
                  `আপনার প্রস্তুতিকে আরও গতিশীল ও ত্রুটিমুক্ত করতে আমাদের AI OS আপনার সাবমিশনগুলো নিবিড়ভাবে স্ক্যান করেছে। ইতিবাচক বিষয় হলো, বিগত সেশনগুলোতে আপনার কন্সিস্টেন্সি হার ${consistency}% এবং সর্বোচ্চ নির্ভুলতা অর্জিত হার ${analytics.accuracy}%।`
                ) : (
                  "আপনার প্রথম মক সাবমিশনটি পাওয়ার সাথে সাথেই আমদের ডায়াগনস্টিক রোবট আপনার প্রস্তুতির ডাটা পয়েন্টগুলোর গভীর মূল্যায়ন শুরু করবে।"
                )}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 block uppercase tracking-widest">সবচেয়ে সবল বিষয়</span>
                  <span className="text-sm font-black text-emerald-500 mt-1 block truncate">
                    {analytics.strongChapters && analytics.strongChapters.length > 0 ? analytics.strongChapters[0] : analytics.fastestSubject || 'তথ্য প্রক্রিয়াধীন'}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 block uppercase tracking-widest">মনোযোগ ক্ষেত্র (দুর্বলতম)</span>
                  <span className="text-sm font-black text-rose-500 mt-1 block truncate">
                    {analytics.weakChapters && analytics.weakChapters.length > 0 ? analytics.weakChapters[0] : analytics.slowestSubject || 'তথ্য প্রক্রিয়াধীন'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-4 text-xs text-zinc-500 font-medium">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <p>আপনার প্রোফাইল সম্পূর্ণ রিয়েল-টাইমে সুসংগত। আপনার প্রতিটি পরিবর্তন এবং স্ট্যাটিস্টিকস সাথে সাথেই আপডেট করা হচ্ছে।</p>
          </div>
        </Card>
      </div>

    </div>
  );
};

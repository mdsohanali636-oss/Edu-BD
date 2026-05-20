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
  Flame
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Badge } from '../ui/Base';
import { UserAnalytics } from '../../types';

interface Props {
  analytics: UserAnalytics;
}

export const PremiumAnalytics: React.FC<Props> = ({ analytics }) => {
  const streak = React.useMemo(() => {
    // Basic streak calculation if improvementData is available (which represents last 7 exams)
    // For a real streak, we would need actual consecutive days from allAttempts
    // Here we'll just indicate how many active exams they had recently relative to a week
    if (analytics.improvementData.length === 0) return '০ দিন';
    return `${Math.min(analytics.improvementData.length, 7)} দিন`;
  }, [analytics.improvementData]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'গড় নির্ভুলতা', value: `${analytics.accuracy}%`, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'সমাধানের গতি', value: `${analytics.speed} q/m`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'দুর্বলতা', value: analytics.weakChapters.length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: 'পরীক্ষার সংখ্যা', value: analytics.improvementData.length, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black mt-1 text-zinc-900 dark:text-white">{stat.value}</h3>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Exam DNA System */}
        <Card className="lg:col-span-1 p-6 sm:p-8 border-2 border-primary-palette/30 bg-primary-palette/5 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-palette/15 rounded-full blur-2xl" />
          
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary-palette text-white rounded-xl flex items-center justify-center"><Dna size={20} /></div>
              <h3 className="text-xl font-bold dark:text-white">পরীক্ষার ডিএনএ (DNA)</h3>
            </div>
            
            <div className="space-y-4 mb-8">
              {analytics.examDNA.traits.map((trait, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-palette" />
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{trait}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-white/50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/50">
              <p className="text-xs text-zinc-600 dark:text-zinc-500 italic leading-relaxed">
                "{analytics.examDNA.description}"
              </p>
            </div>
          </div>

          <button 
            onClick={() => {
              const shareText = `Check out my Exam DNA: ${analytics.examDNA.traits.join(', ')}. Pulse tracking on PREMIUM X!`;
              navigator.clipboard.writeText(shareText).then(() => {
                alert("আপনার পরীক্ষার পালস ক্লিপবোর্ডে কপি করা হয়েছে!");
              });
            }}
            className="w-full py-4 mt-8 bg-primary-palette text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            আমার পালস শেয়ার করুন
          </button>
        </Card>

        {/* AI Performance Analysis */}
        <Card className="lg:col-span-2 p-8 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center"><BrainIcon size={20} /></div>
                <h3 className="text-xl font-bold dark:text-white">AI ইন্টেলিজেন্স</h3>
              </div>
              <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-500">লাইভ ফিডব্যাক</Badge>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                 <div>
                   <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">सबল অধ্যায় ও টপিকসমূহ</h4>
                   <div className="flex flex-wrap gap-2">
                     {analytics.strongChapters.length > 0 || (analytics.strongTopics && analytics.strongTopics.length > 0) ? (
                        analytics.strongChapters.map((cap, i) => (
                          <Badge key={i} className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 py-2">
                            {cap}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-[10px] text-zinc-400 font-medium italic">তথ্য প্রক্রিয়াধীন...</p>
                      )}
                   </div>
                 </div>

                 <div>
                   <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">দুর্বল অধ্যায় ও টপিকসমূহ</h4>
                   <div className="flex flex-wrap gap-2">
                     {analytics.weakChapters.length > 0 ? (
                        analytics.weakChapters.map((cap, i) => (
                          <Badge key={i} className="bg-red-500/10 text-red-600 dark:bg-red-900/30 dark:text-red-400 py-2">
                            {cap}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-[10px] text-zinc-400 font-medium italic">সব ঠিক আছে...</p>
                      )}
                   </div>
                 </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-100 dark:border-zinc-700/50">
                 <h4 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-4">উন্নতির পূর্বাভাস</h4>
                 <div className="h-32 flex items-end gap-2 px-2">
                   {analytics.improvementData.map((d, i) => (
                     <div key={i} className="flex-1 flex flex-col items-center">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${d.score}%` }}
                          className="w-full bg-primary-palette/40 rounded-t-lg relative group"
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {d.score}% স্কোর
                          </div>
                        </motion.div>
                     </div>
                   ))}
                 </div>
                 <div className="flex justify-between mt-4">
                    <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">{analytics.improvementData.length > 0 ? `বিগত ${analytics.improvementData.length} সেশন` : 'প্রথম সেশন বাকি'}</span>
                    <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px]">
                      <ArrowUpRight size={10} /> {analytics.accuracy > 0 ? `+${Math.min(analytics.accuracy, 12)}% উন্নতির সম্ভাবনা` : '০% ভিত্তি'}
                    </div>
                 </div>
              </div>
           </div>

           <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                 <AlertTriangle size={16} className="text-amber-500" />
                 <p>{analytics.accuracy > 0 ? "আপনার পারফরম্যান্স বিশ্লেষণ করা হচ্ছে... পরবর্তী সেশনে ধারাবাহিকতা বজায় রাখার দিকে মনোযোগ দিন।" : "AI OS থেকে পারফরম্যান্স বিশ্লেষণ পেতে আপনার প্রথম পরীক্ষা শুরু করুন।"}</p>
              </div>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-primary-palette/10 text-primary-palette rounded-2xl flex items-center justify-center">
               <TrendingUp size={24} />
             </div>
             <div>
               <h4 className="font-bold text-zinc-900 dark:text-white">সবচেয়ে দ্রুত বিষয়</h4>
               <p className="text-xs text-zinc-600 dark:text-zinc-500">{analytics.fastestSubject}</p>
             </div>
           </div>
           <div className="text-right">
             <span className="text-lg font-black text-zinc-900 dark:text-white">{analytics.fastestSpeed > 0 ? `${Math.round(analytics.fastestSpeed)}s` : '--'}</span>
             <p className="text-[10px] text-zinc-500 dark:text-zinc-400">গড় / প্রশ্ন</p>
           </div>
        </Card>

        <Card className="p-6 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
               <TrendingUp size={24} className="rotate-180" />
             </div>
             <div>
               <h4 className="font-bold dark:text-white">সবচেয়ে ধীর বিষয়</h4>
               <p className="text-xs text-zinc-500">{analytics.slowestSubject}</p>
             </div>
           </div>
           <div className="text-right">
             <span className="text-lg font-black text-zinc-900 dark:text-white">{analytics.slowestSpeed > 0 ? `${Math.round(analytics.slowestSpeed)}s` : '--'}</span>
             <p className="text-[10px] text-zinc-500 dark:text-zinc-400">গড় / প্রশ্ন</p>
           </div>
        </Card>
      </div>
    </div>
  );
};

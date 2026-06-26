import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck } from 'lucide-react';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-500/20 transition-all active:scale-90 cursor-pointer"
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
            onClick={() => navigate('/')}
            className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:translate-y-[-4px] transition-all relative z-10 shadow-xl cursor-pointer"
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
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export function CookiesPage() {
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
        <button onClick={() => navigate('/')} className="text-blue-600 font-bold uppercase tracking-widest text-xs hover:underline cursor-pointer">Back to Home</button>
      </div>
    </div>
  );
}

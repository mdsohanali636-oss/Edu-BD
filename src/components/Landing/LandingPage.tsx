import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  User, 
  Shield, 
  GraduationCap, 
  X,
  Plus,
  RefreshCcw
} from 'lucide-react';
import { Button, Card, Badge } from '../ui/Base';
import { FlyInteraction, MiniRobot } from './LandingComponents';
import { AcademicClass } from '../../types';

interface LandingPageProps {
  onGoogleLogin: () => void;
  onEmailLogin: (email: string, pass: string) => void;
  onEmailSignUp: (name: string, email: string, pass: string, academicClass: string, academicGroup: string) => void;
  onForgotPassword: (email: string) => void;
  onPhoneSignIn: (phone: string) => void;
  onVerifyOtp: (otp: string) => void;
  error: string | null;
  isLoading: boolean;
  dynamicClasses?: { name: string }[];
}

const Logo = ({ className = "h-10 w-auto", alt = "Parodorshhi Logo" }: { className?: string, alt?: string }) => {
  const [error, setError] = useState(false);
  const paths = [
    "/api/v1/files/Gemini_Generated_Image_ro03d6ro03d6ro03.png",
    "/api/v1/files/input_file_0.png",
    "/api/v1/files/input_file_1.png"
  ];
  const [pathIndex, setPathIndex] = useState(0);

  if (error && pathIndex >= paths.length - 1) {
    return <span className="font-black text-rose-500 tracking-tighter text-3xl">Paro</span>;
  }

  return (
    <img 
      src={paths[pathIndex]} 
      alt={alt} 
      className={`${className} object-contain transition-all duration-300 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]`}
      referrerPolicy="no-referrer"
      onError={() => {
        if (pathIndex < paths.length - 1) {
          setPathIndex(pathIndex + 1);
        } else {
          setError(true);
        }
      }}
    />
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onGoogleLogin, 
  onEmailLogin, 
  onEmailSignUp, 
  onForgotPassword, 
  onPhoneSignIn,
  onVerifyOtp,
  error, 
  isLoading,
  dynamicClasses = []
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'phone' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [academicClass, setAcademicClass] = useState<string>(dynamicClasses[0]?.name || 'Class 12');
  const [academicGroup, setAcademicGroup] = useState<string>('All');
  const [resetSent, setResetSent] = useState(false);
  const [mood, setMood] = useState<'welcoming' | 'thinking' | 'excited' | 'annoyed'>('welcoming');

  const classes = dynamicClasses.length > 0 ? dynamicClasses.map(c => c.name) : ['Class 9', 'Class 10', 'Class 11', 'Class 12', 'Admission', 'General'];

  const isGroupNeeded = (className: any) => {
    if (!className || typeof className !== 'string') return false;
    const classNum = parseInt(className.replace(/\D/g, ''));
    return !isNaN(classNum) && classNum >= 9 && classNum <= 12;
  };

  // Reset group when class changes to one that doesn't need it
  React.useEffect(() => {
    if (!isGroupNeeded(academicClass)) {
      setAcademicGroup('All');
    } else if (academicGroup === 'All') {
      // Default to Science if they transition to a group-needed class
      setAcademicGroup('Science');
    }
  }, [academicClass]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F1A] flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-rose-100 selection:text-rose-900">
      {/* Animated Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/5 blur-[120px] rounded-full" />
      
      <FlyInteraction onShoo={() => setMood('annoyed')} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10"
      >
        {/* Left Column: Branding & Interaction */}
        <div className="space-y-10 text-center lg:text-left order-2 lg:order-1">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-sm">
            <Sparkles className="text-amber-500" size={18} />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Next Gen Education</span>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center lg:justify-start">
              <div className="bg-zinc-950 p-6 rounded-[40px] border-2 border-blue-500/20 shadow-[0_0_60px_rgba(37,99,235,0.15)] group relative overflow-visible">
                <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                <Logo className="h-24 lg:h-32 w-auto relative z-10" />
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[0.95]">
                Paro<span className="text-rose-500">dorshhi</span>
              </h1>
              <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium max-w-md mx-auto lg:mx-0 leading-relaxed">
                আপনার শিখন যাত্রা হোক আরও সহজ এবং আনন্দময়। উন্নত প্রযুক্তির সাথে আজই শুরু করুন আপনার লক্ষ্য পূরণের পথ।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">AI Enabled Ops</span>
            </div>
          </div>

          <div className="pt-8 flex justify-center lg:justify-start">
             <MiniRobot />
          </div>
        </div>

        {/* Right Column: Auth Card */}
        <motion.div
          className="relative order-1 lg:order-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-blue-500 rounded-[44px] blur-2xl opacity-10" />
          
          <Card className="p-8 sm:p-12 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-[40px] shadow-2xl relative overflow-hidden">
            <AnimatePresence mode="wait">
              {mode === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">স্বাগতম!</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium tracking-tight">আপনার একাউন্টে লগ ইন করুন</p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-rose-500" size={20} />
                      <input 
                        type="email"
                        placeholder="Email Address"
                        className="w-full pl-12 pr-4 py-4 bg-zinc-100/50 dark:bg-zinc-900/50 border-2 border-transparent focus:border-rose-500/20 rounded-2xl outline-none transition-all font-bold text-zinc-900 dark:text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-rose-500" size={20} />
                      <input 
                        type="password"
                        placeholder="Password"
                        className="w-full pl-12 pr-4 py-4 bg-zinc-100/50 dark:bg-zinc-900/50 border-2 border-transparent focus:border-rose-500/20 rounded-2xl outline-none transition-all font-bold text-zinc-900 dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={() => setMode('forgot')}
                      className="text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors pl-1"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-sm font-bold flex items-center gap-3"
                    >
                      <X size={16} /> {error}
                    </motion.div>
                  )}

                  <div className="space-y-4">
                    <button 
                      onClick={() => onEmailLogin(email, password)}
                      disabled={isLoading}
                      className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      লগ ইন করুন {isLoading && <RefreshCcw size={16} className="animate-spin" />}
                    </button>
                    
                    <div className="relative py-2">
                       <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-100 dark:border-zinc-800" /></div>
                       <div className="relative flex justify-center text-xs uppercase tracking-widest font-black text-zinc-400"><span className="bg-white dark:bg-[#0B0F1A] px-4">অথবা</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={onGoogleLogin}
                        className="flex items-center justify-center gap-3 py-3 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all font-bold text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" /> Google
                      </button>
                      <button 
                        onClick={() => setMode('phone')}
                        className="flex items-center justify-center gap-3 py-3 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all font-bold text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <Phone size={16} /> Phone
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-sm font-bold text-zinc-500">
                    একাউন্ট নেই? <button onClick={() => setMode('signup')} className="text-rose-500 hover:underline">নতুন তৈরি করুন</button>
                  </p>
                </motion.div>
              )}

              {mode === 'signup' && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">নতুন একউন্ট</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">তথ্যগুলো দিয়ে শুরু করুন</p>
                  </div>

                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        placeholder="Full Name"
                        className="w-full pl-12 pr-4 py-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border-2 border-transparent focus:border-rose-500/20 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="email"
                        placeholder="Email Address"
                        className="w-full pl-12 pr-4 py-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border-2 border-transparent focus:border-rose-500/20 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="password"
                        placeholder="Password"
                        className="w-full pl-12 pr-4 py-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border-2 border-transparent focus:border-rose-500/20 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400 block px-4 mb-2">Class / Target</label>
                        <div className="grid grid-cols-3 gap-2">
                            {classes.map(c => (
                              <button 
                                key={c}
                                onClick={() => setAcademicClass(c)}
                                className={`py-2 rounded-xl text-[10px] font-black tracking-tight transition-all border ${academicClass === c ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20' : 'bg-transparent text-zinc-500 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800'}`}
                              >
                                {c}
                              </button>
                            ))}
                        </div>
                      </div>

                      {isGroupNeeded(academicClass) && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <label className="text-xs font-black uppercase tracking-widest text-zinc-400 block px-4 mb-2">Academic Group</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['Science', 'Humanities', 'Commerce'].map(g => (
                                <button 
                                  key={g}
                                  onClick={() => setAcademicGroup(g)}
                                  className={`py-2 rounded-xl text-[10px] font-black tracking-tight transition-all border ${academicGroup === g ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-transparent text-zinc-500 dark:text-zinc-600 border-zinc-200 dark:border-zinc-800'}`}
                                >
                                  {g}
                                </button>
                              ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {error && <div className="text-rose-500 text-xs font-bold text-center">{error}</div>}

                  <button 
                    onClick={() => onEmailSignUp(name, email, password, academicClass, academicGroup)}
                    disabled={isLoading}
                    className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 disabled:opacity-50"
                  >
                    শুরু করুন
                  </button>

                  <p className="text-center text-sm font-bold text-zinc-500">
                    ইতিমধ্যে একউন্ট আছে? <button onClick={() => setMode('login')} className="text-rose-500 hover:underline">লগ ইন</button>
                  </p>
                </motion.div>
              )}

              {mode === 'phone' && (
                <motion.div key="phone" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                   <div className="space-y-2">
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white">ফোন নম্বর</h2>
                    <p className="text-zinc-500 font-medium">কোড পাওয়ার জন্য নম্বর দিন</p>
                  </div>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <input 
                      placeholder="+880123456789"
                      className="w-full pl-12 pr-4 py-4 bg-zinc-100/50 dark:bg-zinc-900/50 border-2 border-transparent focus:border-rose-500/20 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <button 
                    onClick={async () => { await onPhoneSignIn(phone); setMode('otp'); }}
                    disabled={isLoading}
                    className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95"
                  >
                    কোড পাঠান
                  </button>
                  <button onClick={() => setMode('login')} className="w-full text-center text-zinc-500 font-bold text-sm">পিছনে যান</button>
                </motion.div>
              )}

              {mode === 'otp' && (
                <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                   <div className="space-y-2">
                    <h2 className="text-3xl font-black text-zinc-900 dark:text-white">কোড দিন</h2>
                    <p className="text-zinc-500 font-medium">{phone} নম্বরে পাঠানো হয়েছে</p>
                  </div>
                  <input 
                    placeholder="Verification Code"
                    className="w-full px-4 py-4 bg-zinc-100/50 dark:bg-zinc-900/50 border-2 border-transparent focus:border-rose-500/20 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white text-center text-2xl tracking-[0.5em]"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                  />
                  <button 
                    onClick={() => onVerifyOtp(otp)}
                    disabled={isLoading}
                    className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95"
                  >
                    ভেরিফাই করুন
                  </button>
                  <button onClick={() => setMode('login')} className="w-full text-center text-zinc-500 font-bold text-sm">পিছনে যান</button>
                </motion.div>
              )}

              {mode === 'forgot' && (
                <motion.div key="forgot" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                  {resetSent ? (
                    <div className="text-center space-y-6 py-8">
                      <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner"><ArrowRight size={40} /></div>
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-white">Email Sent!</h3>
                      <p className="text-zinc-500 font-bold">Please check your inbox for instructions.</p>
                      <button onClick={() => setMode('login')} className="text-rose-500 font-black uppercase tracking-widest text-xs">Back to Login</button>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-black text-zinc-900 dark:text-white">রিসেট করুন</h2>
                        <p className="text-zinc-500 font-medium tracking-tight">আপনার ইমেইল দিন</p>
                      </div>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                        <input 
                          type="email"
                          placeholder="you@example.com"
                          className="w-full pl-12 pr-4 py-4 bg-zinc-100/50 dark:bg-zinc-900/50 border-2 border-transparent focus:border-rose-500/20 rounded-2xl outline-none font-bold text-zinc-900 dark:text-white"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <button onClick={() => { onForgotPassword(email); setResetSent(true); }} disabled={isLoading} className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 shadow-xl">কোড পাঠান</button>
                      <button onClick={() => setMode('login')} className="w-full text-center text-zinc-500 font-bold text-sm">বাতিল করুন</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      </motion.div>

      {/* Footer Info */}
      <footer className="absolute bottom-8 left-0 right-0 px-6 text-center z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400 dark:text-zinc-600">
           © 2024 Parodorshhi Ecosystem • Powered by Pulse OS
        </p>
      </footer>
    </div>
  );
};

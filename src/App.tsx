import { GoogleGenAI, Type } from "@google/genai";
import { useState, useMemo, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import { 
  Search, 
  BookOpen, 
  FileText, 
  History, 
  Youtube, 
  ExternalLink, 
  Bookmark, 
  Settings, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  RefreshCcw,
  RefreshCw,
  Home,
  Download, 
  Eye, 
  Moon, 
  Sun,
  X,
  Filter,
  Save,
  GraduationCap,
  Calculator,
  Atom,
  FlaskConical,
  Dna,
  Languages,
  Monitor,
  Upload,
  File,
  LogOut,
  User as UserIcon,
  Globe,
  Pencil,
  Facebook,
  Twitter,
  Instagram,
  Github,
  Mail,
  Phone,
  MessageSquare,
  List,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Badge } from './components/ui/Base';
import { INITIAL_DATA } from './data/mockData';
import { ContentItem, Category, AcademicClass, ExternalResource, Feedback, Playlist } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { auth, db, storage, googleProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { User } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, setError?: (err: string | null) => void) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (setError) {
    setError(`Firestore ${operationType} error at ${path}: ${errInfo.error}`);
  }
}

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
};

const getYouTubePlaylistId = (url: string) => {
  // Support formats like:
  // https://www.youtube.com/playlist?list=ID
  // https://youtube.com/playlist?list=ID
  // https://www.youtube.com/watch?v=VIDEO_ID&list=ID
  // or just the ID itself
  const regExp = /[&?]list=([^#&?]+)/;
  const match = url.match(regExp);
  if (match) return match[1];
  
  // If it's just an ID (usually starts with PL)
  if (url.startsWith('PL') && url.length > 10) return url;
  
  return url;
};

const getEmbedUrl = (url: string | null) => {
  if (!url) return '';
  
  // Google Drive Link Handling
  if (url.includes('drive.google.com')) {
    // Extract file ID from various Drive URL formats
    const fileIdMatch = url.match(/\/d\/([^\/]+)/) || url.match(/id=([^\&]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }
  
  return url;
};

const Logo = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 120 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="120" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#0891b2" />
        <stop offset="100%" stopColor="#0e7490" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <g filter="url(#glow)">
      <text 
        x="0" 
        y="32" 
        className="font-black" 
        style={{ 
          fontSize: '38px', 
          fill: 'url(#logoGrad)',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.05em'
        }}
      >
        EBD
      </text>
    </g>
  </svg>
);

const LandingPage = ({ onGoogleLogin, onEmailLogin, onEmailSignUp, onForgotPassword, error, isLoading }: { 
  onGoogleLogin: () => void;
  onEmailLogin: (email: string, pass: string) => void;
  onEmailSignUp: (name: string, email: string, pass: string, academicClass: AcademicClass) => void;
  onForgotPassword: (email: string) => void;
  error: string | null;
  isLoading: boolean;
}) => {
  const [mode, setMode] = useState<'landing' | 'login' | 'signup' | 'forgot-password'>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [academicClass, setAcademicClass] = useState<AcademicClass>('Class 9');
  const [resetSent, setResetSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const particles = useMemo(() => Array.from({ length: 20 }), []);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);
  
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Animated Particles */}
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-blue-500/20 rounded-full"
          initial={{ x: Math.random() * 100 + "%", y: Math.random() * 100 + "%", opacity: Math.random() * 0.5 }}
          animate={{ y: [null, "-20%"], opacity: [0, 0.5, 0] }}
          transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: "linear", delay: Math.random() * 10 }}
        />
      ))}

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
        className="max-w-xl w-full text-center relative z-10"
      >
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }} className="flex justify-center mb-8">
          <div className="w-20 h-14 relative">
            <Logo className="w-full h-full" />
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div>
                <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6 py-2 px-5 text-[11px] backdrop-blur-md">
                  ✨ Welcome to EduBD
                </Badge>
                <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tighter">
                  Unlock Your<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400 drop-shadow-[0_0_30px_rgba(56,189,248,0.3)]">Academic Potential</span>
                </h1>
                <p className="text-zinc-400 text-xl leading-relaxed font-medium max-w-lg mx-auto lg:mx-0">
                  Join thousands of Bangladeshi students accessing free notes, books, and video classes.
                </p>
              </div>

                <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 space-y-8 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full group-hover:bg-blue-500/20 transition-colors duration-700" />
                  
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium relative z-10"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {error}
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="space-y-4 relative z-10">
                    <Button 
                      variant="primary" 
                      size="lg" 
                      className="w-full py-6 text-lg bg-white text-zinc-900 hover:bg-zinc-100 font-black disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-500"
                      onClick={() => setMode('signup')}
                      disabled={isLoading}
                    >
                      Create Free Account
                    </Button>
                  <div className="flex items-center gap-4 py-2">
                    <div className="h-[1px] flex-1 bg-white/5"></div>
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">OR</span>
                    <div className="h-[1px] flex-1 bg-white/5"></div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full py-6 text-lg border-white/5 text-white hover:bg-white/5 font-bold disabled:opacity-50"
                    onClick={() => setMode('login')}
                    disabled={isLoading}
                  >
                    Log In with Email
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full py-4 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 font-bold disabled:opacity-50"
                    onClick={onGoogleLogin}
                    disabled={isLoading}
                    icon={() => (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    )}
                  >
                    {isLoading ? 'Authenticating...' : 'Continue with Google'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 space-y-6 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-white">Create Account</h2>
                <button onClick={() => setMode('landing')} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium mb-4"
                >
                  {error}
                </motion.div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-colors"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="name@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Password</label>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Academic Class</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-colors appearance-none"
                    value={academicClass}
                    onChange={(e) => setAcademicClass(e.target.value as AcademicClass)}
                  >
                    {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Engineering Admission-science', 'Medical Admission-science', 'Varsity Admission-science', 'Varsity Admission-humanities', 'Varsity Admission-commerce'].map(c => (
                      <option key={c} value={c} className="bg-zinc-900 text-white">{c}</option>
                    ))}
                  </select>
                </div>
                <Button 
                  variant="primary" 
                  className="w-full py-5 text-lg bg-white text-zinc-900 font-black mt-4 disabled:opacity-50"
                  onClick={() => onEmailSignUp(name, email, password, academicClass)}
                  disabled={isLoading}
                >
                  {isLoading ? <RefreshCcw className="animate-spin mx-auto" size={24} /> : 'Sign Up'}
                </Button>

                <div className="flex items-center gap-4 py-2">
                  <div className="h-[1px] flex-1 bg-white/5"></div>
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">OR</span>
                  <div className="h-[1px] flex-1 bg-white/5"></div>
                </div>

                <button 
                  onClick={onGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCcw className="animate-spin" size={16} />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  {isLoading ? 'Authenticating...' : 'Sign Up with Google'}
                </button>
                <p className="text-center text-xs text-zinc-500">
                  Already have an account? <button onClick={() => setMode('login')} className="text-blue-400 font-bold hover:underline">Log In</button>
                </p>
              </div>
            </motion.div>
          )}

          {mode === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 space-y-6 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-white">Welcome Back</h2>
                <button onClick={() => setMode('landing')} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium mb-4"
                >
                  {error}
                </motion.div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="name@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Password</label>
                    <button 
                      onClick={() => setMode('forgot-password')}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                    >
                      Forgot?
                    </button>
                  </div>
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-colors"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button 
                  variant="primary" 
                  className="w-full py-5 text-lg bg-white text-zinc-900 font-black mt-4 disabled:opacity-50"
                  onClick={() => onEmailLogin(email, password)}
                  disabled={isLoading}
                >
                  {isLoading ? <RefreshCcw className="animate-spin mx-auto" size={24} /> : 'Log In'}
                </Button>

                <div className="flex items-center gap-4 py-2">
                  <div className="h-[1px] flex-1 bg-white/5"></div>
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">OR</span>
                  <div className="h-[1px] flex-1 bg-white/5"></div>
                </div>

                <button 
                  onClick={onGoogleLogin}
                  disabled={isLoading}
                  className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCcw className="animate-spin" size={16} />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  {isLoading ? 'Authenticating...' : 'Log In with Google'}
                </button>
                <p className="text-center text-xs text-zinc-500">
                  Don't have an account? <button onClick={() => setMode('signup')} className="text-blue-400 font-bold hover:underline">Sign Up</button>
                </p>
              </div>
            </motion.div>
          )}

          {mode === 'forgot-password' && (
            <motion.div
              key="forgot-password"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 space-y-6 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-white">Reset Password</h2>
                <button onClick={() => setMode('login')} className="text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
              </div>
              
              {resetSent ? (
                <div className="text-center py-6 space-y-6">
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto text-green-400 border border-green-500/20">
                    <RefreshCcw size={40} className="animate-pulse" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-white font-black text-2xl tracking-tight">Check Your Email</p>
                    <p className="text-zinc-400 text-sm leading-relaxed px-4">
                      We've sent a reset link to <span className="text-blue-400 font-bold">{email}</span>. 
                      If you don't see it in your <span className="text-white font-bold underline decoration-blue-500/50">Inbox</span>, please check your <span className="text-white font-bold">Spam</span> or <span className="text-white font-bold">Junk</span> folder.
                    </p>
                  </div>
                  <div className="space-y-3 pt-4">
                    <Button 
                      variant="primary" 
                      className="w-full py-5 bg-white text-zinc-900 font-black"
                      onClick={() => {
                        setResetSent(false);
                        setMode('login');
                      }}
                    >
                      Back to Login
                    </Button>
                    <button 
                      onClick={async () => {
                        if (resendTimer > 0) return;
                        try {
                          await onForgotPassword(email);
                          setResendTimer(60);
                        } catch (e) {}
                      }}
                      disabled={isLoading || resendTimer > 0}
                      className="text-xs font-bold text-zinc-500 hover:text-blue-400 transition-colors uppercase tracking-widest disabled:opacity-50"
                    >
                      {isLoading ? "Sending..." : resendTimer > 0 ? `Resend in ${resendTimer}s` : "Didn't get the link? Resend"}
                    </button>
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      <span className="text-zinc-400 font-bold">Note:</span> If you see an "Expired Link" error, please delete all previous reset emails and use only the <span className="text-white">newest one</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium mb-4"
                    >
                      {error}
                    </motion.div>
                  )}
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Email Address</label>
                    <input 
                      type="email" 
                      placeholder="name@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-colors"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="primary" 
                    className="w-full py-5 text-lg bg-white text-zinc-900 font-black mt-4 disabled:opacity-50"
                    onClick={async () => {
                      try {
                        await onForgotPassword(email);
                        setResetSent(true);
                      } catch (e) {}
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? <RefreshCcw className="animate-spin mx-auto" size={24} /> : 'Send Reset Link'}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          className="mt-16 grid grid-cols-3 gap-8 pt-12 border-t border-white/5"
        >
          <div className="group cursor-default">
            <div className="text-3xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors">18+</div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Resources</div>
          </div>
          <div className="group cursor-default">
            <div className="text-3xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors">FREE</div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Access</div>
          </div>
          <div className="group cursor-default">
            <div className="text-3xl font-black text-white mb-1 group-hover:text-blue-400 transition-colors">24/7</div>
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Support</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

const MiniRobot = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ 
      opacity: 1, 
      scale: 1,
      y: [0, -8, 0],
    }}
    transition={{ 
      y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
      opacity: { duration: 0.5 },
      scale: { duration: 0.5 }
    }}
    className="relative w-12 h-12 sm:w-14 sm:h-14 cursor-help group z-10"
  >
    {/* 3D Body Construction */}
    <div className="absolute inset-0 bg-blue-600 rounded-2xl shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)] transform-gpu rotate-x-12 rotate-y-12 border-b-4 border-r-4 border-blue-800">
      {/* Face Screen */}
      <div className="absolute inset-2 bg-zinc-900 rounded-xl overflow-hidden flex items-center justify-center border border-blue-400/20">
        <div className="flex gap-1.5 sm:gap-2">
          <motion.div 
            animate={{ scaleY: [1, 0.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 0.2] }}
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" 
          />
          <motion.div 
            animate={{ scaleY: [1, 0.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 0.2], delay: 0.1 }}
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" 
          />
        </div>
      </div>
      
      {/* Side Details (3D effect) */}
      <div className="absolute -right-1 top-4 w-1.5 h-5 bg-blue-700 rounded-r-lg" />
      <div className="absolute -left-1 top-4 w-1.5 h-5 bg-blue-700 rounded-l-lg" />
    </div>
    
    {/* Antenna */}
    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-1 h-5 bg-zinc-400 rounded-full">
      <motion.div 
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)]" 
      />
    </div>

    {/* Hover Tooltip */}
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[9px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-widest shadow-xl border border-zinc-800">
      EduBot is here!
    </div>
  </motion.div>
);

export default function App() {
  const [contents, setContents] = useState<ContentItem[]>(INITIAL_DATA);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [externalResources, setExternalResources] = useState<ExternalResource[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [canUpload, setCanUpload] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'home' | 'category' | 'saved' | 'admin' | 'dashboard'>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isDarkMode, setIsDarkMode] = useLocalStorage('edubd_darkmode', false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'resources' | 'playlists' | 'users' | 'feedback'>('resources');
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  
  // Filters
  const [classFilter, setClassFilter] = useState<AcademicClass | 'All'>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');

  // Modals
  const [activePdf, setActivePdf] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [fetchedPlaylistVideos, setFetchedPlaylistVideos] = useState<any[]>([]);
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), []);

  const fetchPlaylistVideos = async (playlistId: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `I need the exact list of videos from the YouTube playlist with ID: ${playlistId}. 
        1. Search for the official YouTube playlist page: https://www.youtube.com/playlist?list=${playlistId}
        2. Extract the titles, URLs, and a brief description (first 100 chars) of ALL videos listed in this specific playlist.
        3. Return a JSON array of objects, each with 'title', 'url', and 'description'.
        4. Do NOT include random videos or videos from other playlists.
        5. If the playlist is private or not found, return an empty array [].
        Only return the JSON array. Do not include any other text.`,
        tools: [{ googleSearch: {} }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                url: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "url", "description"]
            }
          }
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      console.error("Error fetching playlist videos:", error);
      return [];
    }
  };

  useEffect(() => {
    if (!activePlaylist) {
      setFetchedPlaylistVideos([]);
      setIsFetchingPlaylist(false);
      return;
    }

    if (activePlaylist.type === 'youtube' && activePlaylist.youtubePlaylistId) {
      const fetchVideos = async () => {
        setIsFetchingPlaylist(true);
        setFetchedPlaylistVideos([]);
        const videos = await fetchPlaylistVideos(activePlaylist.youtubePlaylistId!);
        setFetchedPlaylistVideos(videos);
        setIsFetchingPlaylist(false);
      };
      fetchVideos();
    } else {
      setFetchedPlaylistVideos([]);
      setIsFetchingPlaylist(false);
    }
  }, [activePlaylist?.id]);

  useEffect(() => {
    if (activePlaylist && !activeVideo) {
      if (activePlaylist.type === 'youtube' && fetchedPlaylistVideos.length > 0) {
        setActiveVideo(getYouTubeId(fetchedPlaylistVideos[0].url));
      } else if (activePlaylist.type === 'custom' && activePlaylist.videoIds?.length > 0) {
        const firstVideo = contents.find(c => c.id === activePlaylist.videoIds![0]);
        if (firstVideo) {
          setActiveVideo(getYouTubeId(firstVideo.url));
        }
      }
    }
  }, [activePlaylist, activeVideo, fetchedPlaylistVideos, contents]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);
  const [isAddingExternal, setIsAddingExternal] = useState(false);
  const [externalThumbnailFile, setExternalThumbnailFile] = useState<File | null>(null);
  const [isUploadingExternal, setIsUploadingExternal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<{ thumbnail?: File, resource?: File }>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Footer States
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<Partial<ContentItem>>({
    category: 'Notes',
    academicClass: 'Class 9',
    subject: '',
    title: '',
    description: '',
    url: '',
    thumbnail: '',
  });

  const [newPlaylist, setNewPlaylist] = useState<Partial<Playlist>>({
    title: '',
    description: '',
    type: 'youtube',
    youtubePlaylistId: '',
    videoIds: [],
    academicClass: 'Class 9',
    subject: '',
    thumbnail: ''
  });

  const [newExternal, setNewExternal] = useState<Partial<ExternalResource>>({
    title: '',
    description: '',
    url: '',
    icon: '🌐',
    thumbnail: ''
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, field: 'thumbnail' | 'url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit check: 300MB
    if (file.size > 300 * 1024 * 1024) {
      setUploadError("File size exceeds 300MB limit.");
      return;
    }

    if (field === 'thumbnail') {
      setSelectedFiles(prev => ({ ...prev, thumbnail: file }));
      // Preview for thumbnail
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isAddingPlaylist) {
          setNewPlaylist(prev => ({ ...prev, thumbnail: reader.result as string }));
        } else {
          setNewItem(prev => ({ ...prev, thumbnail: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFiles(prev => ({ ...prev, resource: file }));
      setNewItem(prev => ({ ...prev, url: file.name })); // Temporary show filename
    }
  };

  const resetToHome = () => {
    setView('home');
    setSelectedCategory(null);
    setClassFilter('All');
    setSubjectFilter('All');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (!currentUser) {
        setUserRole('user');
        setCanUpload(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      const isAdminEmail = user.email === 'mdsohanali636@gmail.com';
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentRole = data.role || 'user';
        const currentCanUpload = data.canUpload ?? false;
        
        setCanUpload(currentCanUpload);
        
        if (isAdminEmail && currentRole !== 'admin') {
          setDoc(userRef, { role: 'admin', canUpload: true }, { merge: true });
          setUserRole('admin');
          setCanUpload(true);
        } else {
          setUserRole(currentRole);
        }
      } else {
        // Initial sync for new user
        const role = isAdminEmail ? 'admin' : 'user';
        const uploadPermission = isAdminEmail ? true : false;
        setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: role,
          canUpload: uploadPermission,
          createdAt: Date.now(),
          lastLogin: serverTimestamp()
        }, { merge: true });
        setUserRole(role);
        setCanUpload(uploadPermission);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    // Main feed: only approved content
    const q = query(
      collection(db, 'contents'), 
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbContents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));
      setContents(dbContents);
      
      // If DB is empty and user is admin, we can offer to seed
      if (dbContents.length === 0 && userRole === 'admin' && !isSeeding) {
        console.log("Database is empty. Admin can seed data.");
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contents', setGlobalError);
    });
    return () => unsubscribe();
  }, [userRole, isSeeding]);

  const handleSeedDatabase = async () => {
    if (userRole !== 'admin' || isSeeding) return;
    setIsSeeding(true);
    setGlobalError(null);
    try {
      console.log("Seeding database...");
      for (const item of INITIAL_DATA) {
        const { id, ...itemData } = item;
        const docRef = await addDoc(collection(db, 'contents'), {
          ...itemData,
          authorId: user?.uid || 'system',
          createdAt: Date.now()
        });
        await setDoc(docRef, { id: docRef.id }, { merge: true });
      }
      console.log("Seeding complete.");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'contents/seed', setGlobalError);
    } finally {
      setIsSeeding(false);
    }
  };

  const [allContents, setAllContents] = useState<ContentItem[]>([]);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  useEffect(() => {
    if (userRole !== 'admin') return;
    
    // Admin view: all content
    const q = query(collection(db, 'contents'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllContents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contents');
    });
    return () => unsubscribe();
  }, [userRole]);

  useEffect(() => {
    if (userRole !== 'admin') return;
    const q = query(collection(db, 'playlists'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllPlaylists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Playlist)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'playlists');
    });
    return () => unsubscribe();
  }, [userRole]);

  useEffect(() => {
    if (userRole !== 'admin') return;
    const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedbackData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback));
      setAllFeedback(feedbackData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'feedback');
    });
    return () => unsubscribe();
  }, [userRole]);

  const [userContents, setUserContents] = useState<ContentItem[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  useEffect(() => {
    if (!user) return;
    
    // User dashboard: their own content
    const q = query(
      collection(db, 'contents'), 
      where('authorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUserContents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'contents');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'playlists'),
      where('authorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUserPlaylists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Playlist)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'playlists');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'external_resources'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExternalResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalResource)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'external_resources', setGlobalError);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'playlists'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlaylists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Playlist)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'playlists', setGlobalError);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      return;
    }
    const path = `users/${user.uid}/bookmarks`;
    const q = query(collection(db, path));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookmarks(snapshot.docs.map(doc => doc.data().contentId));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (userRole === 'admin') {
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [userRole]);

  const handleLogin = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // Sync is now handled by the useEffect on 'user' state
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailLogin = async (email: string, pass: string) => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (name: string, email: string, pass: string, academicClass: AcademicClass) => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(result.user, { displayName: name });
      
      // Save extra info to Firestore - using merge to avoid overwriting permissions
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        displayName: name,
        academicClass: academicClass,
        role: 'user',
        createdAt: Date.now()
      }, { merge: true });

      // Force refresh user state
      setUser({ ...result.user, displayName: name } as any);
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    setAuthError(null);
    if (!email) {
      setAuthError("Please enter your email address first.");
      throw new Error("Email required");
    }
    setIsAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      handleAuthError(error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    console.error("Auth error:", error);
    let message = "An error occurred during authentication.";
    if (error.code === 'auth/unauthorized-domain') {
      message = "Domain not authorized. Please add this URL to 'Authorized domains' in Firebase Console.";
    } else if (error.code === 'auth/popup-blocked') {
      message = "Login popup blocked. Please enable popups in your browser settings to continue.";
    } else if (error.code === 'auth/cancelled-popup-request') {
      message = "Login request cancelled. Please try clicking the login button again.";
    } else if (error.code === 'auth/popup-closed-by-user') {
      message = "Login window was closed. Please try again.";
    } else if (error.code === 'auth/email-already-in-use') {
      message = "This email is already registered. Please log in instead.";
    } else if (error.code === 'auth/weak-password') {
      message = "Password should be at least 6 characters.";
    } else if (error.code === 'auth/invalid-email') {
      message = "The email address you entered is not valid. Please check for typos.";
    } else if (error.code === 'auth/user-not-found') {
      message = "No account found with this email. Please sign up first.";
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
      message = "Incorrect password or account doesn't exist. If you haven't created an account yet, please sign up first. If you used Google before, use 'Continue with Google'.";
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      message = "An account already exists with this email but was created using a different method (like Google). Please use that method to log in.";
    }
    setAuthError(message);
  };

  const handleLogout = async () => {
    console.log("Attempting logout...");
    try {
      await signOut(auth);
      console.log("Logout successful");
      resetToHome();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const classes: (AcademicClass | 'All')[] = [
    'All', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
    'Engineering Admission-science', 'Medical Admission-science', 'Varsity Admission-science', 
    'Varsity Admission-humanities', 'Varsity Admission-commerce'
  ];
  
  const subjectIcons: Record<string, any> = {
    'Math': Calculator,
    'Physics': Atom,
    'Chemistry': FlaskConical,
    'Biology': Dna,
    'English': Languages,
    'ICT': Monitor,
  };

  const subjects = ['All', 'Math', 'Physics', 'Chemistry', 'Biology', 'English', 'ICT'];

  const years = ['All Years', '2024', '2023', '2022', '2021'];
  const [yearFilter, setYearFilter] = useState('All Years');

  const renderContentCard = (item: ContentItem) => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card className="flex flex-col h-full group border-none bg-white dark:bg-zinc-900/40 backdrop-blur-md overflow-hidden">
        <div className="aspect-[16/10] overflow-hidden relative bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {/* Fallback Icon */}
          <div className="text-zinc-300 dark:text-zinc-700">
            {item.category === 'YouTube Classes' ? <Youtube size={48} strokeWidth={1.5} /> : 
             item.category === 'Books' ? <BookOpen size={48} strokeWidth={1.5} /> :
             item.category === 'Question Papers' ? <History size={48} strokeWidth={1.5} /> :
             <FileText size={48} strokeWidth={1.5} />}
          </div>

          {/* Actual Thumbnail or Auto-YouTube Thumbnail */}
          {(item.thumbnail || (item.category === 'YouTube Classes' && item.url)) && (
            <img 
              src={item.thumbnail ? getDirectImageUrl(item.thumbnail) : (item.category === 'YouTube Classes' ? `https://img.youtube.com/vi/${getYouTubeId(item.url)}/mqdefault.jpg` : '')} 
              alt={item.title} 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-10" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0';
              }}
            />
          )}

          {/* YouTube Play Button Overlay */}
          {item.category === 'YouTube Classes' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors duration-300 z-20">
              <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center text-white shadow-2xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Youtube size={24} fill="currentColor" />
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5 z-30">
            <Badge className="bg-blue-600 text-white text-[9px] px-2 py-1 shadow-lg backdrop-blur-md border-none">
              {item.category.toUpperCase()}
            </Badge>
            <Badge className="bg-zinc-900/80 text-white text-[9px] px-2 py-1 shadow-lg backdrop-blur-md border-none">
              {item.academicClass === 'Class 10' ? 'SSC' : item.academicClass === 'Class 12' ? 'HSC' : item.academicClass}
            </Badge>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
              {item.academicClass === 'Class 10' ? 'SSC' : item.academicClass === 'Class 12' ? 'HSC' : item.academicClass}
            </Badge>
            <Badge className="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20">
              {item.subject}
            </Badge>
            {item.year && (
              <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/20">
                {item.year}
              </Badge>
            )}
          </div>
          <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-3 line-clamp-2 leading-tight tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h4>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 line-clamp-2 leading-relaxed font-medium">
            {item.description}
          </p>
          
          <div className="flex items-center gap-2 mt-auto">
            <Button 
              className="flex-1" 
              icon={item.category === 'YouTube Classes' ? Youtube : item.category === 'Books' ? Download : item.category === 'Question Papers' ? FileText : Eye} 
              onClick={() => {
                if (item.category === 'YouTube Classes') setActiveVideo(getYouTubeId(item.url));
                else setActivePdf(item.url);
              }}
            >
              {item.category === 'YouTube Classes' ? 'Watch' : item.category === 'Books' ? 'Download PDF' : item.category === 'Question Papers' ? 'View Paper' : 'View Notes'}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => toggleBookmark(item.id)}
              className={bookmarks.includes(item.id) ? 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800' : 'text-zinc-400'}
            >
              <Bookmark size={18} fill={bookmarks.includes(item.id) ? 'currentColor' : 'none'} strokeWidth={2.5} />
            </Button>
            {(userRole === 'admin' || (user && item.authorId === user.uid)) && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleEditContent(item)}
                className="text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"
              >
                <Pencil size={18} />
              </Button>
            )}
            {userRole === 'admin' && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setDeletingId(item.id)}
                className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <Trash2 size={18} />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
  
  const renderPlaylistCard = (playlist: Playlist) => (
    <motion.div
      key={playlist.id}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="cursor-pointer"
      onClick={() => {
        setActiveVideo(null);
        setActivePlaylist(playlist);
      }}
    >
      <Card className="flex flex-col h-full group border-none bg-white dark:bg-zinc-900/40 backdrop-blur-md overflow-hidden relative">
        <div className="aspect-[16/10] overflow-hidden relative bg-zinc-100 dark:bg-zinc-800">
          <img 
            src={playlist.thumbnail ? getDirectImageUrl(playlist.thumbnail) : `https://img.youtube.com/vi/playlist/mqdefault.jpg`} 
            alt={playlist.title} 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0';
            }}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />
          
          {/* Playlist Stack Effect */}
          <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white">
            <Youtube size={24} className="mb-1" />
            <span className="text-xs font-black">
              {playlist.type === 'youtube' ? 'YT' : (playlist.videoIds?.length || 0)}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-tighter">VIDEOS</span>
          </div>

          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge className="bg-red-600 text-white text-[9px] px-2 py-1 shadow-lg border-none">
              PLAYLIST
            </Badge>
          </div>

          {canUpload && (
            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm text-zinc-900 hover:bg-white shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  setNewPlaylist({
                    title: playlist.title,
                    description: playlist.description,
                    type: playlist.type,
                    youtubePlaylistId: playlist.youtubePlaylistId || '',
                    videoIds: playlist.videoIds || [],
                    academicClass: playlist.academicClass,
                    subject: playlist.subject,
                    thumbnail: playlist.thumbnail || ''
                  });
                  setEditingPlaylistId(playlist.id);
                  setIsAddingPlaylist(true);
                }}
              >
                <Pencil size={14} />
              </Button>
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-8 w-8 rounded-full bg-red-500/90 backdrop-blur-sm text-white hover:bg-red-600 shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePlaylist(playlist.id);
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
              {playlist.academicClass}
            </Badge>
            <Badge className="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20">
              {playlist.subject}
            </Badge>
          </div>
          <h4 className="text-lg font-black text-zinc-900 dark:text-white mb-2 line-clamp-2 leading-tight tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {playlist.title}
          </h4>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs line-clamp-2 leading-relaxed font-medium mb-4">
            {playlist.description}
          </p>
          
          <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              {playlist.type === 'youtube' ? 'YouTube Playlist' : 'Custom Playlist'}
            </span>
            <div className="flex items-center gap-1 text-blue-600 font-black text-[10px] uppercase tracking-widest">
              Play Now <ChevronRight size={12} />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );

  const triggerHighlight = (id: string) => {
    setHighlightedSection(id);
    setTimeout(() => setHighlightedSection(null), 2000);
  };

  const renderSection = (title: string, category: Category, icon: any, addLabel: string, id?: string) => {
    const sectionContents = filteredContents.filter(c => c.category === category).slice(0, 4);
    
    if (sectionContents.length === 0 && searchQuery) return null;

    return (
      <section 
        id={id} 
        className={`space-y-6 scroll-mt-24 p-6 -mx-6 rounded-[32px] transition-colors duration-500 relative ${highlightedSection === id ? 'animate-section-flash ring-1 ring-blue-500/20' : ''}`}
      >
        {id && (
          <div className="absolute -top-10 right-10 hidden md:block">
            <MiniRobot />
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              {icon}
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-4">
            {canUpload && (
              <Button variant="outline" size="sm" icon={Plus} onClick={() => {
                setIsEditing(false);
                setEditingId(null);
                setNewItem({ ...newItem, category, title: '', description: '', url: '', thumbnail: '' });
                setIsAdding(true);
              }}>{addLabel}</Button>
            )}
            <button 
              onClick={() => { setSelectedCategory(category); setView('category'); }}
              className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1"
            >
              See all <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sectionContents.map(renderContentCard)}
        </div>
      </section>
    );
  };

  const renderPlaylistsSection = () => {
    const filteredPlaylists = playlists.filter(p => {
      const matchesClass = classFilter === 'All' || p.academicClass === classFilter;
      const matchesSubject = subjectFilter === 'All' || p.subject === subjectFilter;
      return matchesClass && matchesSubject;
    });

    const displayPlaylists = filteredPlaylists.slice(0, 8);

    if (filteredPlaylists.length === 0 && searchQuery) return null;
    if (filteredPlaylists.length === 0 && !canUpload) return null;

    return (
      <section className="space-y-6 p-6 -mx-6 rounded-[32px] transition-colors duration-500 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-600">
              <Youtube size={24} />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Featured Playlists</h3>
          </div>
          <div className="flex items-center gap-4">
            {canUpload && (
              <Button variant="outline" size="sm" icon={Plus} onClick={() => {
                setNewPlaylist({
                  title: '',
                  description: '',
                  type: 'youtube',
                  youtubePlaylistId: '',
                  videoIds: [],
                  academicClass: classFilter === 'All' ? 'Class 9' : classFilter as AcademicClass,
                  subject: subjectFilter === 'All' ? '' : subjectFilter,
                  thumbnail: ''
                });
                setIsAddingPlaylist(true);
              }}>Add Playlist</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayPlaylists.map(renderPlaylistCard)}
          {displayPlaylists.length === 0 && canUpload && (
            <div 
              onClick={() => setIsAddingPlaylist(true)}
              className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] flex flex-col items-center justify-center p-8 text-zinc-400 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                <Plus size={24} />
              </div>
              <p className="font-bold text-sm">Create First Playlist</p>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderExternalResources = () => {
    if (externalResources.length === 0 && userRole !== 'admin') return null;

    return (
      <section className="space-y-6 relative">
        <div className="absolute -top-10 right-10 hidden md:block">
          <MiniRobot />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600">
              <Globe size={24} />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">External Resources</h3>
          </div>
          {userRole === 'admin' && (
            <Button variant="outline" size="sm" icon={Plus} onClick={() => setIsAddingExternal(true)}>Add Link</Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {externalResources.map((resource) => (
            <div key={resource.id}>
              <Card className="p-4 flex flex-col items-center text-center group relative border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all duration-300">
                <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 overflow-hidden shrink-0 relative">
                  {resource.thumbnail && (
                    <img 
                      src={getDirectImageUrl(resource.thumbnail)} 
                      alt={resource.title} 
                      title={resource.title}
                      className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0';
                      }}
                    />
                  )}
                  <span className="text-2xl z-0">{resource.icon}</span>
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white mb-2 line-clamp-1">{resource.title}</h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-6 line-clamp-2 leading-relaxed font-medium">{resource.description}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full rounded-xl group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300"
                  onClick={() => window.open(resource.url, '_blank')}
                >
                  Visit →
                </Button>
                {userRole === 'admin' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteExternal(resource.id);
                    }}
                    className="absolute top-3 right-3 p-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </Card>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderFilters = () => (
    <div className="py-4 sm:py-6">
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-8">
          <span className="text-[10px] sm:text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] w-20 shrink-0 pt-0 sm:pt-3.5">CLASS</span>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {classes.map(c => (
              <button 
                key={c}
                onClick={() => setClassFilter(c)}
                className={`px-5 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                  classFilter === c 
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl shadow-zinc-900/10 dark:shadow-white/10 scale-105' 
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-8">
          <span className="text-[10px] sm:text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] w-20 shrink-0 pt-0 sm:pt-3.5">SUBJECT</span>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {subjects.map(s => {
              const Icon = subjectIcons[s];
              return (
                <button 
                  key={s}
                  onClick={() => setSubjectFilter(s)}
                  className={`flex items-center gap-2 sm:gap-3 px-5 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                    subjectFilter === s 
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl shadow-zinc-900/10 dark:shadow-white/10 scale-105' 
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm'
                  }`}
                >
                  {Icon && <Icon size={16} className={subjectFilter === s ? 'text-blue-400' : 'text-zinc-400'} strokeWidth={2.5} />}
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminPortal = () => (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Admin Portal</h2>
          <p className="text-sm sm:text-base text-zinc-500 font-medium">Manage all resources and user permissions.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Badge className="bg-blue-500/10 text-blue-500 border-none px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest">
            {allContents.length} Total
          </Badge>
          <Badge className="bg-yellow-500/10 text-yellow-600 border-none px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest">
            {allContents.filter(c => c.status === 'pending').length} Pending
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-fit">
        <button 
          onClick={() => setAdminTab('resources')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'resources' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Resources
        </button>
        <button 
          onClick={() => setAdminTab('playlists')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'playlists' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Playlists
        </button>
        <button 
          onClick={() => setAdminTab('users')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'users' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Users
        </button>
        <button 
          onClick={() => setAdminTab('feedback')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'feedback' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Feedback
        </button>
      </div>

      {adminTab === 'resources' ? (
        <div className="grid grid-cols-1 gap-4">
          {allContents.map(item => (
            <div key={item.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all">
              <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                <img 
                  src={item.thumbnail ? getDirectImageUrl(item.thumbnail) : 'https://picsum.photos/seed/edu/400/250'} 
                  alt={item.title} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = '0';
                  }}
                />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none text-[10px] uppercase font-black tracking-widest">{item.category}</Badge>
                  <Badge className={`border-none text-[10px] uppercase font-black tracking-widest ${
                    item.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                    item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' : 
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {item.status}
                  </Badge>
                </div>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">{item.title}</h4>
                <p className="text-sm text-zinc-500 line-clamp-1">{item.description}</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Author ID: {item.authorId}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-blue-500" onClick={() => handleEditContent(item)}><Pencil size={20} /></Button>
                {item.status !== 'approved' && (
                  <Button variant="primary" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveContent(item.id)}>Approve</Button>
                )}
                {item.status !== 'rejected' && (
                  <Button variant="outline" size="sm" className="border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={() => handleRejectContent(item.id)}>Reject</Button>
                )}
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-500" onClick={() => setDeletingId(item.id)}><Trash2 size={20} /></Button>
              </div>
            </div>
          ))}
          {allContents.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <File size={40} />
              </div>
              <p className="text-zinc-500 font-bold">No resources found in the system.</p>
            </div>
          )}
        </div>
      ) : adminTab === 'playlists' ? (
        <div className="grid grid-cols-1 gap-4">
          {allPlaylists.map(playlist => (
            <div key={playlist.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all">
              <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                <img 
                  src={playlist.thumbnail ? getDirectImageUrl(playlist.thumbnail) : 'https://img.youtube.com/vi/playlist/mqdefault.jpg'} 
                  alt={playlist.title} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = '0';
                  }}
                />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none text-[10px] uppercase font-black tracking-widest">{playlist.type}</Badge>
                  <Badge className={`border-none text-[10px] uppercase font-black tracking-widest ${
                    playlist.status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                    playlist.status === 'pending' ? 'bg-yellow-500/10 text-yellow-600' : 
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {playlist.status}
                  </Badge>
                </div>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">{playlist.title}</h4>
                <p className="text-sm text-zinc-500 line-clamp-1">{playlist.description}</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Author ID: {playlist.authorId}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {playlist.status !== 'approved' && (
                  <Button variant="primary" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprovePlaylist(playlist.id)}>Approve</Button>
                )}
                {playlist.status !== 'rejected' && (
                  <Button variant="outline" size="sm" className="border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={() => handleRejectPlaylist(playlist.id)}>Reject</Button>
                )}
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-500" onClick={() => handleDeletePlaylist(playlist.id)}><Trash2 size={20} /></Button>
              </div>
            </div>
          ))}
          {allPlaylists.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <Youtube size={40} />
              </div>
              <p className="text-zinc-500 font-bold">No playlists found in the system.</p>
            </div>
          )}
        </div>
      ) : adminTab === 'users' ? (
        <div className="grid grid-cols-1 gap-4">
          {allUsers.map(u => (
            <div key={u.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex items-center gap-6 shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} alt={u.displayName} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-black text-zinc-900 dark:text-white truncate">{u.displayName || 'Anonymous User'}</h4>
                  {u.role === 'admin' && <Badge className="bg-blue-500 text-white border-none text-[8px] uppercase font-black px-2">Admin</Badge>}
                </div>
                <p className="text-sm text-zinc-500 truncate">{u.email}</p>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">ID: {u.uid}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Upload Permission</span>
                  <button 
                    onClick={() => handleToggleUpload(u.id, u.canUpload)}
                    disabled={u.role === 'admin'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${u.canUpload ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-700'} ${u.role === 'admin' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.canUpload ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {allFeedback.map(f => (
            <div key={f.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold">
                    {f.userName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-zinc-900 dark:text-white">{f.userName}</h4>
                    <p className="text-[10px] text-zinc-500 font-medium">{f.userEmail}</p>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{new Date(f.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                {f.text}
              </p>
            </div>
          ))}
          {allFeedback.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <MessageSquare size={40} />
              </div>
              <p className="text-zinc-500 font-bold">No feedback received yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderUserDashboard = () => (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">My Dashboard</h2>
          <p className="text-sm sm:text-base text-zinc-500 font-medium">Track your uploads and their moderation status.</p>
        </div>
        {canUpload && (
          <Button variant="primary" icon={Plus} className="w-full sm:w-auto" onClick={() => {
            setIsEditing(false);
            setEditingId(null);
            setNewItem({ category: 'Notes', academicClass: 'Class 9', subject: '', title: '', description: '', url: '', thumbnail: '' });
            setIsAdding(true);
          }}>Upload New</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userContents.map(item => (
          <div key={item.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
            <div className="h-48 relative overflow-hidden">
              <img 
                src={item.thumbnail ? getDirectImageUrl(item.thumbnail) : 'https://picsum.photos/seed/edu/400/250'} 
                alt={item.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0';
                }}
              />
              <div className="absolute top-4 left-4">
                <Badge className={`border-none text-[10px] uppercase font-black tracking-widest shadow-lg ${
                  item.status === 'approved' ? 'bg-green-500 text-white' : 
                  item.status === 'pending' ? 'bg-yellow-500 text-white' : 
                  'bg-red-500 text-white'
                }`}>
                  {item.status}
                </Badge>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none text-[10px] uppercase font-black tracking-widest">{item.category}</Badge>
                <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight line-clamp-2">{item.title}</h4>
              </div>
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{new Date(item.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-blue-500" onClick={() => handleEditContent(item)}><Pencil size={16} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-blue-500" onClick={() => {
                    if (item.category === 'YouTube Classes') {
                      setActiveVideo(item.url);
                    } else {
                      setActivePdf(item.url);
                    }
                  }}><Eye size={16} /></Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {userPlaylists.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-white">My Playlists</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userPlaylists.map(playlist => (
              <div key={playlist.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src={playlist.thumbnail ? getDirectImageUrl(playlist.thumbnail) : 'https://img.youtube.com/vi/playlist/mqdefault.jpg'} 
                    alt={playlist.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    referrerPolicy="no-referrer" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0';
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className={`border-none text-[10px] uppercase font-black tracking-widest shadow-lg ${
                      playlist.status === 'approved' ? 'bg-green-500 text-white' : 
                      playlist.status === 'pending' ? 'bg-yellow-500 text-white' : 
                      'bg-red-500 text-white'
                    }`}>
                      {playlist.status}
                    </Badge>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none text-[10px] uppercase font-black tracking-widest">{playlist.type} Playlist</Badge>
                    <h4 className="text-lg font-black text-zinc-900 dark:text-white leading-tight line-clamp-2">{playlist.title}</h4>
                  </div>
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{new Date(playlist.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-zinc-400 hover:text-blue-500" onClick={() => {
                        if (playlist.type === 'youtube') {
                          setActiveVideo(`https://www.youtube.com/playlist?list=${playlist.youtubePlaylistId}`);
                        } else if (playlist.videoIds && playlist.videoIds.length > 0) {
                          const firstVideo = contents.find(c => c.id === playlist.videoIds![0]);
                          if (firstVideo) setActiveVideo(firstVideo.url);
                        }
                      }}><Eye size={16} /></Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {userContents.length === 0 && userPlaylists.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
            <Upload size={40} />
          </div>
          <p className="text-zinc-500 font-bold">You haven't uploaded any resources yet.</p>
          {canUpload && <Button variant="outline" onClick={() => setIsAdding(true)}>Start Uploading</Button>}
        </div>
      )}
    </div>
  );
  const renderHome = () => (
    <div className="space-y-10">
      {/* Hero Section */}
      {!selectedCategory && (
        <section className="relative bg-zinc-900 py-16 overflow-hidden rounded-[40px] shadow-2xl">
          {/* Animated Background Elements */}
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="max-w-3xl mx-auto px-8 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-8 py-2 px-5 text-[11px] backdrop-blur-md">
                ✨ BD Made for Bangladeshi Students
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white mb-6 sm:mb-8 leading-[1.1] tracking-tight">
                Free Study Materials<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">For Every Student</span> 📚
              </h2>
              <p className="text-zinc-400 text-base sm:text-lg mb-8 sm:mb-12 max-w-xl mx-auto leading-relaxed font-medium">
                Access notes, textbook PDFs, board question papers, and live video classes — all in one place, completely free.
              </p>

              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 max-w-3xl mx-auto shadow-2xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10">
                  {[
                    { label: 'Resources', value: '18' },
                    { label: 'Classes', value: '2' },
                    { label: 'Subjects', value: '6' },
                    { label: 'Free', value: '100%' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-4xl font-bold text-white mb-2 tracking-tight">{stat.value}</div>
                      <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      <div className="max-w-[1400px] mx-auto px-4 space-y-16 pb-20">
        {renderFilters()}
        {renderSection('Notes', 'Notes', <FileText className="text-blue-600" size={24} />, 'Add Note', 'notes-section')}
        {renderSection('Books PDF', 'Books', <BookOpen className="text-green-600" size={24} />, 'Add Book', 'books-section')}
        {renderSection('Recent Question Papers', 'Question Papers', <History className="text-purple-600" size={24} />, 'Add Paper', 'papers-section')}
        {user && userPlaylists.length > 0 && (
          <section className="space-y-6 p-6 -mx-6 bg-blue-50/50 dark:bg-blue-500/5 rounded-[32px] border border-blue-100 dark:border-blue-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <List size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">My Shared Playlists</h3>
                  <p className="text-xs text-zinc-500 font-medium">Playlists you've added to the platform.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {userPlaylists.map(renderPlaylistCard)}
            </div>
          </section>
        )}
        {renderPlaylistsSection()}
        {renderSection('YouTube Classes', 'YouTube Classes', <Youtube className="text-red-600" size={24} />, 'Add Video', 'video-section')}
        {renderExternalResources()}
      </div>
    </div>
  );

  const renderContentList = () => (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={resetToHome}>
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
              {view === 'saved' ? 'Saved Resources' : searchQuery ? `Search Results for "${searchQuery}"` : selectedCategory}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {filteredContents.length} items found
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredContents.map(renderContentCard)}
        </AnimatePresence>
      </div>
    </div>
  );

  const handleNewsletter = (e: FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setIsSubscribed(true);
    setNewsletterEmail('');
    setTimeout(() => setIsSubscribed(false), 5000);
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || !user) return;
    setIsSendingFeedback(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || 'Anonymous',
        text: feedbackText.trim(),
        createdAt: Date.now()
      });
      setIsFeedbackOpen(false);
      setFeedbackText('');
      setGlobalError('Thank you for your feedback!');
      setTimeout(() => setGlobalError(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'feedback');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const renderFooter = () => (
    <footer className="bg-zinc-900 text-zinc-400 py-16 mt-20 border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-8 rounded-lg overflow-hidden">
                <Logo className="w-full h-full" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tighter">EduBD</h2>
            </div>
            <p className="text-sm leading-relaxed">
              Empowering students across Bangladesh with free, high-quality educational resources. Notes, books, and video classes all in one place.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-blue-400 transition-colors"><Facebook size={20} /></a>
              <a href="#" className="hover:text-blue-400 transition-colors"><Twitter size={20} /></a>
              <a href="#" className="hover:text-blue-400 transition-colors"><Instagram size={20} /></a>
              <a href="#" className="hover:text-blue-400 transition-colors"><Github size={20} /></a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Quick Links</h4>
            <ul className="space-y-4 text-sm">
              <li><button onClick={() => { resetToHome(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors text-left">Home</button></li>
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    if (view !== 'home') {
                      setView('home');
                      setTimeout(() => {
                        document.getElementById('notes-section')?.scrollIntoView({ behavior: 'smooth' });
                        triggerHighlight('notes-section');
                      }, 100);
                    } else {
                      document.getElementById('notes-section')?.scrollIntoView({ behavior: 'smooth' });
                      triggerHighlight('notes-section');
                    }
                  }} 
                  className="hover:text-white transition-colors text-left"
                >
                  Study Notes
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    if (view !== 'home') {
                      setView('home');
                      setTimeout(() => {
                        document.getElementById('books-section')?.scrollIntoView({ behavior: 'smooth' });
                        triggerHighlight('books-section');
                      }, 100);
                    } else {
                      document.getElementById('books-section')?.scrollIntoView({ behavior: 'smooth' });
                      triggerHighlight('books-section');
                    }
                  }} 
                  className="hover:text-white transition-colors text-left"
                >
                  Textbook PDFs
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    if (view !== 'home') {
                      setView('home');
                      setTimeout(() => {
                        document.getElementById('papers-section')?.scrollIntoView({ behavior: 'smooth' });
                        triggerHighlight('papers-section');
                      }, 100);
                    } else {
                      document.getElementById('papers-section')?.scrollIntoView({ behavior: 'smooth' });
                      triggerHighlight('papers-section');
                    }
                  }} 
                  className="hover:text-white transition-colors text-left"
                >
                  Board Papers
                </button>
              </li>
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    if (view !== 'home') {
                      setView('home');
                      setTimeout(() => {
                        document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' });
                        triggerHighlight('video-section');
                      }, 100);
                    } else {
                      document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' });
                      triggerHighlight('video-section');
                    }
                  }} 
                  className="hover:text-white transition-colors text-left"
                >
                  Video Classes
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Contact Us</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-blue-400" />
                <a href="mailto:mdsohanali636@gmail.com" className="hover:text-white transition-colors">mdsohanali636@gmail.com</a>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-green-400" />
                <a href="https://wa.me/8801328913290" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp: 01328913290</a>
              </li>
              <li className="flex items-center gap-3">
                <MessageSquare size={18} className="text-purple-400" />
                <button onClick={() => setIsFeedbackOpen(true)} className="hover:text-white transition-colors text-left">Send Feedback</button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Newsletter</h4>
            <p className="text-xs mb-4">Get the latest updates on new resources.</p>
            <form onSubmit={handleNewsletter} className="flex gap-2">
              <input 
                type="email" 
                required
                placeholder="Email address" 
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500 flex-1"
              />
              <Button type="submit" variant="primary" size="sm" className="bg-white text-zinc-900 font-bold">
                {isSubscribed ? 'Joined!' : 'Join'}
              </Button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em]">
          <p>© 2024 EduBD. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );

  const filteredContents = useMemo(() => {
    return contents.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory ? item.category === selectedCategory : true;
      const matchesClass = classFilter === 'All' ? true : item.academicClass === classFilter;
      const matchesSubject = subjectFilter === 'All' ? true : item.subject === subjectFilter;
      const matchesYear = yearFilter === 'All Years' ? true : item.year === yearFilter;
      
      if (view === 'saved') return bookmarks.includes(item.id) && matchesSearch;
      return matchesSearch && matchesClass && matchesSubject && matchesCategory && matchesYear;
    });
  }, [contents, searchQuery, selectedCategory, classFilter, subjectFilter, yearFilter, view, bookmarks]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return contents
      .filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 8);
  }, [contents, searchQuery]);

  const toggleBookmark = async (id: string) => {
    if (!user) {
      handleLogin();
      return;
    }
    const bookmarkId = `${user.uid}_${id}`;
    const path = `users/${user.uid}/bookmarks/${bookmarkId}`;
    const bookmarkRef = doc(db, `users/${user.uid}/bookmarks`, bookmarkId);
    
    try {
      if (bookmarks.includes(id)) {
        await deleteDoc(bookmarkRef);
      } else {
        await setDoc(bookmarkRef, {
          userId: user.uid,
          contentId: id,
          createdAt: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleEditContent = (item: ContentItem) => {
    setNewItem({
      category: item.category,
      academicClass: item.academicClass,
      subject: item.subject,
      title: item.title,
      description: item.description,
      url: item.url,
      thumbnail: item.thumbnail,
      year: item.year,
    });
    setEditingId(item.id);
    setIsEditing(true);
    setIsAdding(true);
  };

  const handleAddContent = async () => {
    setUploadError(null);
    setUploadProgress(0);
    if (!newItem.title) {
      setUploadError("Please enter a title.");
      return;
    }
    if (!newItem.url && !selectedFiles.resource) {
      setUploadError("Please select a file or enter a YouTube URL.");
      return;
    }
    if (!newItem.subject) {
      setUploadError("Please select a subject.");
      return;
    }
    
    if (!user) {
      handleLogin();
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      let finalUrl = newItem.url || '';
      let finalThumbnail = getDirectImageUrl(newItem.thumbnail || '');

      // Upload Resource File if exists
      if (selectedFiles.resource) {
        const resourceRef = ref(storage, `resources/${Date.now()}_${selectedFiles.resource.name}`);
        const uploadTask = uploadBytesResumable(resourceRef, selectedFiles.resource);
        
        finalUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            reject, 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      } else if (newItem.category === 'YouTube Classes' && finalUrl) {
        finalUrl = getYouTubeId(finalUrl);
      }

      // Upload Thumbnail if exists
      if (selectedFiles.thumbnail) {
        const thumbRef = ref(storage, `thumbnails/${Date.now()}_${selectedFiles.thumbnail.name}`);
        const thumbSnapshot = await uploadBytesResumable(thumbRef, selectedFiles.thumbnail);
        finalThumbnail = await getDownloadURL(thumbSnapshot.ref);
      }

      if (isEditing && editingId) {
        const docRef = doc(db, 'contents', editingId);
        const updateData: any = {
          category: newItem.category,
          academicClass: newItem.academicClass,
          subject: newItem.subject,
          title: newItem.title,
          description: newItem.description || '',
          url: finalUrl,
          thumbnail: finalThumbnail,
          year: newItem.year || '',
        };
        await setDoc(docRef, updateData, { merge: true });
      } else {
        const itemData = {
          category: newItem.category,
          academicClass: newItem.academicClass,
          subject: newItem.subject,
          title: newItem.title,
          description: newItem.description || '',
          url: finalUrl,
          thumbnail: finalThumbnail,
          authorId: user.uid,
          status: userRole === 'admin' ? 'approved' : 'pending',
          createdAt: Date.now(),
        };
        await addDoc(collection(db, 'contents'), itemData);
      }

      setIsAdding(false);
      setIsEditing(false);
      setEditingId(null);
      setNewItem({ category: 'Notes', academicClass: 'Class 9', subject: '', title: '', description: '', url: '', thumbnail: '' });
      setSelectedFiles({});
      setUploadProgress(0);
    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadError(error.message || "Failed to save content.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddPlaylist = async () => {
    if (!user) {
      handleLogin();
      return;
    }

    if (!newPlaylist.title) {
      setUploadError("Please enter a title.");
      return;
    }

    if (newPlaylist.type === 'youtube' && !newPlaylist.youtubePlaylistId) {
      setUploadError("Please enter a YouTube Playlist URL or ID.");
      return;
    }

    if (newPlaylist.type === 'custom' && (!newPlaylist.videoIds || newPlaylist.videoIds.length === 0)) {
      setUploadError("Please select at least one video for your custom playlist.");
      return;
    }

    setIsUploading(true);
    try {
      let finalThumbnail = getDirectImageUrl(newPlaylist.thumbnail || '');
      let youtubePlaylistId = '';

      // Upload Thumbnail if exists
      if (selectedFiles.thumbnail) {
        const thumbRef = ref(storage, `thumbnails/${Date.now()}_${selectedFiles.thumbnail.name}`);
        const thumbSnapshot = await uploadBytesResumable(thumbRef, selectedFiles.thumbnail);
        finalThumbnail = await getDownloadURL(thumbSnapshot.ref);
      }

      if (newPlaylist.type === 'youtube' && newPlaylist.youtubePlaylistId) {
        youtubePlaylistId = getYouTubePlaylistId(newPlaylist.youtubePlaylistId);
        
        // Fetch Playlist Metadata (Title & Thumbnail) if not provided
        if (!newPlaylist.title || !finalThumbnail || !newPlaylist.description) {
          try {
            const metaResponse = await ai.models.generateContent({
              model: "gemini-3.1-pro-preview",
              contents: `Find the official title, description, and a high-quality thumbnail URL for the YouTube playlist with ID: ${youtubePlaylistId}. 
              Search for the official page: https://www.youtube.com/playlist?list=${youtubePlaylistId}
              Return as JSON with 'title', 'description', and 'thumbnail' fields.`,
              tools: [{ googleSearch: {} }],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    thumbnail: { type: Type.STRING }
                  },
                  required: ["title", "description", "thumbnail"]
                }
              }
            });
            const meta = JSON.parse(metaResponse.text);
            if (!newPlaylist.title) newPlaylist.title = meta.title;
            if (!newPlaylist.description) newPlaylist.description = meta.description;
            if (!finalThumbnail) finalThumbnail = meta.thumbnail;
          } catch (e) {
            console.error("Error fetching playlist meta:", e);
            if (!finalThumbnail) {
              finalThumbnail = `https://img.youtube.com/vi/playlist/mqdefault.jpg`;
            }
          }
        }
      }

      const playlistData = {
        title: newPlaylist.title,
        description: newPlaylist.description || '',
        type: newPlaylist.type,
        youtubePlaylistId: youtubePlaylistId,
        videoIds: newPlaylist.videoIds || [],
        academicClass: newPlaylist.academicClass,
        subject: newPlaylist.subject,
        thumbnail: finalThumbnail,
        authorId: user.uid,
        status: userRole === 'admin' ? 'approved' : 'pending',
        createdAt: Date.now(),
      };

      if (editingPlaylistId) {
        await setDoc(doc(db, 'playlists', editingPlaylistId), {
          ...playlistData,
          updatedAt: Date.now()
        }, { merge: true });
      } else {
        await addDoc(collection(db, 'playlists'), playlistData);
      }

      setIsAddingPlaylist(false);
      setEditingPlaylistId(null);
      setNewPlaylist({
        title: '',
        description: '',
        type: 'youtube',
        youtubePlaylistId: '',
        videoIds: [],
        academicClass: 'Class 9',
        subject: '',
        thumbnail: ''
      });
    } catch (error: any) {
      setUploadError(error.message || "Failed to save playlist.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleApproveContent = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await setDoc(doc(db, 'contents', id), { status: 'approved' }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contents/${id}`);
    }
  };

  const handleRejectContent = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await setDoc(doc(db, 'contents', id), { status: 'rejected' }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contents/${id}`);
    }
  };

  const handleApprovePlaylist = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await setDoc(doc(db, 'playlists', id), { status: 'approved' }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `playlists/${id}`);
    }
  };

  const handleRejectPlaylist = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await setDoc(doc(db, 'playlists', id), { status: 'rejected' }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `playlists/${id}`);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    if (userRole !== 'admin') return;
    try {
      await deleteDoc(doc(db, 'playlists', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `playlists/${id}`);
    }
  };

  const handleToggleUpload = async (userId: string, currentStatus: boolean) => {
    if (userRole !== 'admin') return;
    try {
      await setDoc(doc(db, 'users', userId), { canUpload: !currentStatus }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (userRole !== 'admin') return;
    console.log("Attempting to delete post with ID:", id);
    setIsDeleting(true);
    setUploadError(null);
    try {
      await deleteDoc(doc(db, 'contents', id));
      setDeletingId(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `contents/${id}`);
      setUploadError("Failed to delete post. " + (error.message || "Please try again."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleNextVideo = () => {
    if (!activePlaylist) return;
    const videos = activePlaylist.type === 'youtube' 
      ? fetchedPlaylistVideos 
      : contents.filter(c => activePlaylist.videoIds?.includes(c.id));
    const currentIndex = videos.findIndex(v => getYouTubeId(v.url) === activeVideo);
    if (currentIndex < videos.length - 1) {
      setActiveVideo(getYouTubeId(videos[currentIndex + 1].url));
    }
  };

  const handlePrevVideo = () => {
    if (!activePlaylist) return;
    const videos = activePlaylist.type === 'youtube' 
      ? fetchedPlaylistVideos 
      : contents.filter(c => activePlaylist.videoIds?.includes(c.id));
    const currentIndex = videos.findIndex(v => getYouTubeId(v.url) === activeVideo);
    if (currentIndex > 0) {
      setActiveVideo(getYouTubeId(videos[currentIndex - 1].url));
    }
  };

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      
      // Handle Google Drive links
      if (urlObj.hostname.includes('drive.google.com')) {
        const fileId = urlObj.searchParams.get('id') || urlObj.pathname.split('/d/')[1]?.split('/')[0];
        if (fileId) {
          return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
      }

      // Handle Google Image search result URLs
      if (urlObj.hostname.includes('google.') && urlObj.pathname.includes('imgres')) {
        const imgUrl = urlObj.searchParams.get('imgurl');
        if (imgUrl) return decodeURIComponent(imgUrl);
      }

      // Handle other common patterns if needed
    } catch (e) {
      // Not a valid URL or other error
    }
    return url;
  };

  const handleAddExternal = async () => {
    if (userRole !== 'admin') return;
    if (!newExternal.title || !newExternal.url) {
      setGlobalError("Title and URL are required.");
      return;
    }

    setIsUploadingExternal(true);
    try {
      let finalThumbnail = getDirectImageUrl(newExternal.thumbnail || '');

      if (externalThumbnailFile) {
        const thumbRef = ref(storage, `external_thumbnails/${Date.now()}_${externalThumbnailFile.name}`);
        const thumbSnapshot = await uploadBytesResumable(thumbRef, externalThumbnailFile);
        finalThumbnail = await getDownloadURL(thumbSnapshot.ref);
      }

      await addDoc(collection(db, 'external_resources'), {
        ...newExternal,
        thumbnail: finalThumbnail,
        createdAt: Date.now()
      });
      setIsAddingExternal(false);
      setNewExternal({ title: '', description: '', url: '', icon: '🌐', thumbnail: '' });
      setExternalThumbnailFile(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'external_resources', setGlobalError);
    } finally {
      setIsUploadingExternal(false);
    }
  };

  const handleDeleteExternal = async (id: string) => {
    if (userRole !== 'admin') return;
    setDeletingId(id);
    setIsDeleting(true);
  };

  const confirmDeleteExternal = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'external_resources', deletingId));
      setIsDeleting(false);
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `external_resources/${deletingId}`, setGlobalError);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl animate-bounce">E</div>
          <div className="flex items-center gap-2">
            <RefreshCcw className="animate-spin text-blue-600" size={20} />
            <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase">Initializing EduBD...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onGoogleLogin={handleLogin} onEmailLogin={handleEmailLogin} onEmailSignUp={handleEmailSignUp} onForgotPassword={handleForgotPassword} error={authError} isLoading={isAuthLoading} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Main Header */}
      {/* Admin Quick Access Banner */}
      {userRole === 'admin' && (
        <div className="bg-blue-600 text-white py-2 px-6 relative z-[60]">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <Settings size={14} className="animate-spin-slow" />
                Administrator Mode Active
              </div>
              {contents.length === 0 && (
                <button 
                  onClick={handleSeedDatabase}
                  disabled={isSeeding}
                  className="text-[10px] font-black uppercase bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSeeding ? <RefreshCcw size={12} className="animate-spin" /> : <Plus size={12} />}
                  {isSeeding ? 'Seeding...' : 'Seed Initial Data'}
                </button>
              )}
            </div>
            <button 
              onClick={() => setView('admin')}
              className="text-xs font-black uppercase tracking-tighter bg-white text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Open Admin Portal
            </button>
          </div>
        </div>
      )}

      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 h-20 relative z-50 transition-all duration-300">
        {globalError && (
          <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-[10px] py-1 px-6 flex items-center justify-between z-[70]">
            <span className="font-bold uppercase tracking-widest">System Error: {globalError}</span>
            <button onClick={() => setGlobalError(null)}><X size={12} /></button>
          </div>
        )}
        {authError && (
          <div className="absolute top-full left-0 right-0 bg-red-500 text-white text-xs py-2 px-6 flex items-center justify-between animate-in slide-in-from-top duration-300">
            <span className="font-bold">{authError}</span>
            <button onClick={() => setAuthError(null)}><X size={14} /></button>
          </div>
        )}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3 sm:gap-8">
          <button 
            onClick={resetToHome}
            className="flex items-center gap-2 sm:gap-4 shrink-0 hover:opacity-80 transition-all cursor-pointer group"
          >
            <div className="w-10 h-8 sm:w-14 sm:h-10 rounded-xl overflow-hidden group-hover:scale-105 transition-transform flex items-center justify-center">
              <Logo className="w-full h-full" />
            </div>
            <div className="hidden sm:block text-left">
              <h1 className="text-2xl font-black text-zinc-900 dark:text-white leading-none tracking-tighter">EduBD</h1>
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">FREE STUDY HUB</span>
            </div>
          </button>

          <div className="flex-1 max-w-2xl relative group">
            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search..."
              className="w-full pl-11 sm:pl-14 pr-4 sm:pr-6 py-2.5 sm:py-3.5 bg-zinc-100/50 dark:bg-zinc-800/50 border border-transparent focus:border-blue-500/30 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 transition-all dark:text-white font-medium placeholder:text-zinc-400 text-sm sm:text-base"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />

            {/* Search Suggestions Dropdown */}
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[100]"
                >
                  <div className="p-2">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSearchQuery(item.title);
                          setShowSuggestions(false);
                          if (view === 'home') setView('category');
                          setSelectedCategory(item.category);
                        }}
                        className="w-full flex items-center gap-4 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                          <img 
                            src={item.thumbnail || 'https://picsum.photos/seed/edu/100/100'} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{item.category}</span>
                            <span className="text-[10px] text-zinc-400">•</span>
                            <span className="text-[10px] text-zinc-500 font-medium">{item.subject}</span>
                          </div>
                        </div>
                        <Search size={14} className="text-zinc-300 group-hover:text-blue-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 border-t border-zinc-100 dark:border-zinc-800">
                    <button 
                      onClick={() => setShowSuggestions(false)}
                      className="text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-blue-500 transition-colors"
                    >
                      Press enter to see all results
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setIsDarkMode(!isDarkMode)} className="rounded-2xl w-9 h-9 sm:w-11 sm:h-11">
              {isDarkMode ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
            </Button>
            <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1 hidden md:block"></div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-none">{user.displayName}</p>
                <p className="text-[10px] text-zinc-500 font-medium">{user.email}</p>
              </div>
              <div className="relative group/user">
                <button className="w-10 h-10 rounded-xl overflow-hidden border-2 border-blue-500/20 hover:border-blue-500 transition-colors">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <UserIcon size={20} />
                    </div>
                  )}
                </button>
                <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all z-50">
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 min-w-[200px]">
                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                      <p className="text-xs font-black text-zinc-900 dark:text-white leading-none mb-1">{user.displayName}</p>
                      <Badge className="bg-blue-500/10 text-blue-500 border-none text-[9px] py-0.5 uppercase tracking-widest">{userRole}</Badge>
                    </div>
                    <button 
                      onClick={() => { setView('dashboard'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                      <Monitor size={18} />
                      My Dashboard
                    </button>
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => { setView('admin'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                      >
                        <Settings size={18} />
                        Admin Portal
                      </button>
                    )}
                    <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1"></div>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <LogOut size={18} />
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sub Header / Breadcrumbs */}
      <div className="bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md border-b border-zinc-200/30 dark:border-zinc-800/30 py-2 sm:py-3 relative z-40 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <div className="flex items-center gap-1 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-1 bg-white/50 dark:bg-zinc-900/50 shadow-sm shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl"><ChevronLeft size={16} /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl"><ChevronRight size={16} /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl" onClick={resetToHome}><Home size={16} /></Button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-2xl text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm shrink-0">
              <GraduationCap size={16} className="text-blue-500" strokeWidth={2.5} />
              <span className="tracking-tight whitespace-nowrap">EduBD › {view === 'home' ? 'Home' : view === 'saved' ? 'Saved' : view === 'admin' ? 'Admin Portal' : view === 'dashboard' ? 'My Dashboard' : selectedCategory}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {userRole === 'admin' && (
              <Button 
                variant="outline" 
                size="sm" 
                icon={Settings} 
                className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm shrink-0" 
                onClick={() => setView('admin')}
              >
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" icon={Bookmark} className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" onClick={() => setView('saved')}>Saved</Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={FileText} 
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" 
              onClick={() => { 
                setSearchQuery('');
                if (view !== 'home') {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('notes-section')?.scrollIntoView({ behavior: 'smooth' });
                    triggerHighlight('notes-section');
                  }, 100);
                } else {
                  document.getElementById('notes-section')?.scrollIntoView({ behavior: 'smooth' });
                  triggerHighlight('notes-section');
                }
              }}
            >
              Notes
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={BookOpen} 
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" 
              onClick={() => { 
                setSearchQuery('');
                if (view !== 'home') {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('books-section')?.scrollIntoView({ behavior: 'smooth' });
                    triggerHighlight('books-section');
                  }, 100);
                } else {
                  document.getElementById('books-section')?.scrollIntoView({ behavior: 'smooth' });
                  triggerHighlight('books-section');
                }
              }}
            >
              Books
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={History} 
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" 
              onClick={() => { 
                setSearchQuery('');
                if (view !== 'home') {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('papers-section')?.scrollIntoView({ behavior: 'smooth' });
                    triggerHighlight('papers-section');
                  }, 100);
                } else {
                  document.getElementById('papers-section')?.scrollIntoView({ behavior: 'smooth' });
                  triggerHighlight('papers-section');
                }
              }}
            >
              Papers
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={Youtube} 
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" 
              onClick={() => { 
                setSearchQuery('');
                if (view !== 'home') {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' });
                    triggerHighlight('video-section');
                  }, 100);
                } else {
                  document.getElementById('video-section')?.scrollIntoView({ behavior: 'smooth' });
                  triggerHighlight('video-section');
                }
              }}
            >
              Videos
            </Button>
            {canUpload && (
              <Button variant="primary" size="sm" icon={Plus} className="h-9 sm:h-10 rounded-xl px-4 sm:px-5 bg-blue-600 shadow-lg shadow-blue-500/20 shrink-0" onClick={() => {
                setIsEditing(false);
                setEditingId(null);
                setNewItem({ category: 'Notes', academicClass: 'Class 9', subject: '', title: '', description: '', url: '', thumbnail: '' });
                setIsAdding(true);
              }}>Add</Button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-4 py-10">
        {(view === 'home' && !searchQuery) ? renderHome() : 
         view === 'admin' ? renderAdminPortal() :
         view === 'dashboard' ? renderUserDashboard() : (
          <div className="space-y-10">
            {renderFilters()}
            {renderContentList()}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      {canUpload && (
        <button 
          onClick={() => {
            setIsEditing(false);
            setEditingId(null);
            setNewItem({ category: 'Notes', academicClass: 'Class 9', subject: '', title: '', description: '', url: '', thumbnail: '' });
            setIsAdding(true);
          }}
          className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Modals & Overlays */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-lg w-full shadow-2xl space-y-6 relative my-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  {isEditing ? 'Edit Resource' : 'Add New Resource'}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => { 
                  setIsAdding(false); 
                  setIsEditing(false);
                  setEditingId(null);
                  setUploadError(null); 
                  setNewItem({ category: 'Notes', academicClass: 'Class 9', subject: '', title: '', description: '', url: '', thumbnail: '' });
                }} className="rounded-xl"><X size={20} /></Button>
              </div>

              {uploadError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold">
                  {uploadError}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Category</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value as Category})}
                  >
                    <option value="Notes">Notes</option>
                    <option value="Books">Books</option>
                    <option value="Question Papers">Question Papers</option>
                    <option value="YouTube Classes">YouTube Classes</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Class</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                    value={newItem.academicClass}
                    onChange={e => setNewItem({...newItem, academicClass: e.target.value as AcademicClass})}
                  >
                    {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Title</label>
                <input 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                  placeholder="Enter resource title..."
                  value={newItem.title || ''}
                  onChange={e => setNewItem({...newItem, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Subject</label>
                <select 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                  value={newItem.subject}
                  onChange={e => setNewItem({...newItem, subject: e.target.value})}
                >
                  <option value="">Select Subject</option>
                  {subjects.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Thumbnail</label>
                <div className="space-y-3">
                  <div 
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full aspect-video bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors overflow-hidden group relative"
                  >
                    {newItem.thumbnail && !newItem.thumbnail.startsWith('http') ? (
                      <>
                        <img src={newItem.thumbnail} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="text-white" size={24} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-2">
                          <Upload className="text-zinc-400" size={20} />
                        </div>
                        <span className="text-xs text-zinc-500 font-medium">Upload Thumbnail</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OR</span>
                    <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                  </div>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm"
                    placeholder="Paste Thumbnail Image URL..."
                    value={newItem.thumbnail && newItem.thumbnail.startsWith('http') ? newItem.thumbnail : ''}
                    onChange={e => {
                      setNewItem({...newItem, thumbnail: e.target.value});
                      if (e.target.value) setSelectedFiles(prev => ({ ...prev, thumbnail: undefined }));
                    }}
                  />
                </div>
                <input 
                  type="file"
                  ref={thumbnailInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'thumbnail')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">
                  {newItem.category === 'YouTube Classes' ? 'YouTube Video URL / ID' : 'Resource File / Link'}
                </label>
                <div className="space-y-3">
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm"
                    placeholder={newItem.category === 'YouTube Classes' ? "Paste YouTube Link or ID..." : "Paste External Link (Google Drive, etc.)..."}
                    value={newItem.url || ''}
                    onChange={e => {
                      setNewItem({...newItem, url: e.target.value});
                      if (e.target.value && !selectedFiles.resource) {
                        // Keep it as is
                      } else if (e.target.value) {
                        setSelectedFiles(prev => ({ ...prev, resource: undefined }));
                      }
                    }}
                  />
                  
                  {newItem.category !== 'YouTube Classes' && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OR</span>
                        <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                      </div>
                      <div className="relative group/file">
                        <div 
                          onClick={() => resourceInputRef.current?.click()}
                          className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-600">
                            <File size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                              {selectedFiles.resource ? selectedFiles.resource.name : 'Upload PDF or Document'}
                            </p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                              {selectedFiles.resource ? 'Click to change' : 'Max 300MB'}
                            </p>
                          </div>
                          <Upload className="text-zinc-400" size={18} />
                        </div>
                        {selectedFiles.resource && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFiles(prev => ({ ...prev, resource: undefined }));
                              setNewItem(prev => ({ ...prev, url: '' }));
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <input 
                  type="file"
                  ref={resourceInputRef}
                  className="hidden"
                  accept={newItem.category === 'Books' || newItem.category === 'Question Papers' ? '.pdf' : '*'}
                  onChange={(e) => handleFileChange(e, 'url')}
                />
              </div>

              {isUploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <Button 
                className="w-full py-4 bg-blue-600" 
                icon={isUploading ? RefreshCcw : Save} 
                onClick={handleAddContent}
                disabled={isUploading}
              >
                {isUploading ? `Uploading (${Math.round(uploadProgress)}%)` : (isEditing ? 'Update Resource' : 'Save Resource')}
              </Button>
            </motion.div>
          </div>
        )}

        {isAddingPlaylist && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-2xl w-full shadow-2xl space-y-6 relative my-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  {editingPlaylistId ? 'Edit Playlist' : 'Add New Playlist'}
                </h3>
                <Button variant="ghost" size="icon" onClick={() => { 
                  setIsAddingPlaylist(false); 
                  setEditingPlaylistId(null);
                  setUploadError(null); 
                }} className="rounded-xl"><X size={20} /></Button>
              </div>

              {uploadError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold">
                  {uploadError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Playlist Type</label>
                  <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <button 
                      onClick={() => setNewPlaylist({...newPlaylist, type: 'youtube'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newPlaylist.type === 'youtube' ? 'bg-white dark:bg-zinc-900 text-red-600 shadow-sm' : 'text-zinc-500'}`}
                    >
                      YouTube
                    </button>
                    <button 
                      onClick={() => setNewPlaylist({...newPlaylist, type: 'custom'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newPlaylist.type === 'custom' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Custom
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Class</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                    value={newPlaylist.academicClass}
                    onChange={e => setNewPlaylist({...newPlaylist, academicClass: e.target.value as AcademicClass})}
                  >
                    {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Title</label>
                <input 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                  placeholder="Enter playlist title..."
                  value={newPlaylist.title || ''}
                  onChange={e => setNewPlaylist({...newPlaylist, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Subject</label>
                <select 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                  value={newPlaylist.subject}
                  onChange={e => setNewPlaylist({...newPlaylist, subject: e.target.value})}
                >
                  <option value="">Select Subject</option>
                  {subjects.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {newPlaylist.type === 'youtube' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">YouTube Playlist URL / ID</label>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm"
                    placeholder="Paste YouTube Playlist Link or ID..."
                    value={newPlaylist.youtubePlaylistId || ''}
                    onChange={e => setNewPlaylist({...newPlaylist, youtubePlaylistId: e.target.value})}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Select Videos ({newPlaylist.videoIds?.length || 0})</label>
                  <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 space-y-2 bg-zinc-50 dark:bg-zinc-800/50">
                    {contents.filter(c => c.category === 'YouTube Classes' && c.status === 'approved').map(video => (
                      <div 
                        key={video.id}
                        onClick={() => {
                          const currentIds = newPlaylist.videoIds || [];
                          if (currentIds.includes(video.id)) {
                            setNewPlaylist({...newPlaylist, videoIds: currentIds.filter(id => id !== video.id)});
                          } else {
                            setNewPlaylist({...newPlaylist, videoIds: [...currentIds, video.id]});
                          }
                        }}
                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${newPlaylist.videoIds?.includes(video.id) ? 'bg-blue-600 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                      >
                        <div className="w-12 h-8 rounded bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0">
                          <img src={`https://img.youtube.com/vi/${getYouTubeId(video.url)}/default.jpg`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{video.title}</p>
                          <p className="text-[8px] opacity-60 uppercase tracking-widest">{video.subject}</p>
                        </div>
                        {newPlaylist.videoIds?.includes(video.id) && <Plus size={14} className="rotate-45" />}
                      </div>
                    ))}
                    {contents.filter(c => c.category === 'YouTube Classes' && c.status === 'approved').length === 0 && (
                      <p className="text-center py-4 text-xs text-zinc-500">No approved videos available to add.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Playlist Thumbnail (Optional)</label>
                <div className="space-y-3">
                  <div 
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full aspect-video bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors overflow-hidden group relative"
                  >
                    {newPlaylist.thumbnail && !newPlaylist.thumbnail.startsWith('http') ? (
                      <>
                        <img src={newPlaylist.thumbnail} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="text-white" size={24} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-2">
                          <Upload className="text-zinc-400" size={20} />
                        </div>
                        <span className="text-xs text-zinc-500 font-medium">Upload Thumbnail</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">OR</span>
                    <div className="h-[1px] flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
                  </div>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-sm"
                    placeholder="Paste Thumbnail Image URL..."
                    value={newPlaylist.thumbnail && newPlaylist.thumbnail.startsWith('http') ? newPlaylist.thumbnail : ''}
                    onChange={e => {
                      setNewPlaylist({...newPlaylist, thumbnail: e.target.value});
                      if (e.target.value) setSelectedFiles(prev => ({ ...prev, thumbnail: undefined }));
                    }}
                  />
                </div>
                <input 
                  type="file"
                  ref={thumbnailInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'thumbnail')}
                />
              </div>

              <Button 
                variant="primary" 
                className="w-full py-4 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white font-black rounded-2xl disabled:opacity-50"
                onClick={handleAddPlaylist}
                disabled={isUploading}
              >
                {isUploading ? <RefreshCcw className="animate-spin mx-auto" size={20} /> : (editingPlaylistId ? 'Update Playlist' : 'Create Playlist')}
              </Button>
            </motion.div>
          </div>
        )}

        {activePdf && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold dark:text-white">PDF Preview</h3>
                <Button variant="ghost" size="icon" onClick={() => setActivePdf(null)}><X size={20} /></Button>
              </div>
              <iframe 
                src={getEmbedUrl(activePdf)} 
                className="flex-1 w-full border-none" 
                allow="autoplay"
              />
            </motion.div>
          </div>
        )}

        {(activeVideo || activePlaylist) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white dark:bg-zinc-900 rounded-[24px] w-full ${activePlaylist ? 'max-w-5xl' : 'max-w-2xl'} flex flex-col md:flex-row overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 md:h-[650px] max-h-[95vh]`}
            >
              <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
                <div className="p-3 bg-zinc-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                      <Youtube size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-black text-white tracking-tight truncate max-w-[150px] md:max-w-md">
                        {activePlaylist ? activePlaylist.title : (contents.find(c => getYouTubeId(c.url) === activeVideo)?.title || 'Video Class')}
                      </h3>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                        {activePlaylist ? `${activePlaylist.type === 'youtube' ? 'YouTube' : 'Custom'} Playlist` : 'Single Video'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white hover:bg-white/10 rounded-full"
                    onClick={() => {
                      setActiveVideo(null);
                      setActivePlaylist(null);
                    }}
                  >
                    <X size={18} />
                  </Button>
                </div>
                
                <div className="relative aspect-video w-full bg-black shadow-2xl">
                  {activeVideo ? (
                    <iframe 
                      src={`https://www.youtube.com/embed/${activeVideo}${activeVideo?.includes('?') ? '&' : '?'}autoplay=1&rel=0&modestbranding=1`} 
                      className="absolute inset-0 w-full h-full border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="text-center space-y-4 p-10">
                      <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto text-zinc-700 border border-zinc-800 shadow-inner">
                        <Play size={40} />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-white font-black text-lg">No Video Selected</h4>
                        <p className="text-zinc-500 text-xs max-w-[250px] mx-auto leading-relaxed">Please select a video from the playlist on the right to start watching.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 bg-white dark:bg-zinc-900 p-6 overflow-y-auto custom-scrollbar">
                  {(() => {
                    const videos = activePlaylist?.type === 'youtube' 
                      ? fetchedPlaylistVideos 
                      : contents.filter(c => activePlaylist?.videoIds?.includes(c.id));
                    const currentIndex = videos.findIndex(v => getYouTubeId(v.url) === activeVideo);
                    const currentVideo = videos[currentIndex] || contents.find(c => getYouTubeId(c.url) === activeVideo);
                    
                    if (!currentVideo) return null;

                    return (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h2 className="text-xl font-black text-zinc-900 dark:text-white leading-tight tracking-tight">
                              {currentVideo.title}
                            </h2>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-none text-[10px] font-black uppercase">
                                {currentVideo.subject || activePlaylist?.subject}
                              </Badge>
                              <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none text-[10px] font-black uppercase">
                                {currentVideo.academicClass || activePlaylist?.academicClass}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-10 w-10 rounded-full border-zinc-200 dark:border-zinc-800"
                              onClick={handlePrevVideo}
                              disabled={currentIndex <= 0}
                            >
                              <ChevronLeft size={20} />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-10 w-10 rounded-full border-zinc-200 dark:border-zinc-800"
                              onClick={handleNextVideo}
                              disabled={currentIndex === -1 || currentIndex >= videos.length - 1}
                            >
                              <ChevronRight size={20} />
                            </Button>
                          </div>
                        </div>
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Description</p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
                            {currentVideo.description || activePlaylist?.description || "No description available for this video."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {activePlaylist && (
                <div className="w-full md:w-80 bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-[400px] md:h-auto">
                  <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <List size={14} className="text-blue-600" />
                        Playlist Content
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 rounded-full text-zinc-400 hover:text-blue-600 ml-1"
                          onClick={async () => {
                            if (activePlaylist.youtubePlaylistId) {
                              setIsFetchingPlaylist(true);
                              const videos = await fetchPlaylistVideos(activePlaylist.youtubePlaylistId);
                              setFetchedPlaylistVideos(videos);
                              setIsFetchingPlaylist(false);
                            }
                          }}
                        >
                          <RefreshCw size={10} className={isFetchingPlaylist ? 'animate-spin' : ''} />
                        </Button>
                      </h4>
                      <Badge className="bg-blue-600 text-white border-none text-[9px] font-black px-2 py-0.5 rounded-full">
                        {(() => {
                          const videos = activePlaylist.type === 'youtube' ? fetchedPlaylistVideos : contents.filter(c => activePlaylist.videoIds?.includes(c.id));
                          const currentIndex = videos.findIndex(v => getYouTubeId(v.url) === activeVideo);
                          return `${currentIndex + 1} / ${videos.length}`;
                        })()}
                      </Badge>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: (() => {
                            const videos = activePlaylist.type === 'youtube' ? fetchedPlaylistVideos : contents.filter(c => activePlaylist.videoIds?.includes(c.id));
                            const currentIndex = videos.findIndex(v => getYouTubeId(v.url) === activeVideo);
                            return `${((currentIndex + 1) / videos.length) * 100}%`;
                          })()
                        }}
                        className="h-full bg-blue-600"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-zinc-50/50 dark:bg-zinc-950/20">
                    {activePlaylist.type === 'youtube' ? (
                      <div className="space-y-2">
                        {isFetchingPlaylist ? (
                          <div className="p-10 text-center space-y-4">
                            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest animate-pulse">Fetching Playlist...</p>
                          </div>
                        ) : fetchedPlaylistVideos.length > 0 ? (
                          fetchedPlaylistVideos.map((video, index) => {
                            const ytId = getYouTubeId(video.url);
                            const isActive = activeVideo === ytId;
                            
                            return (
                              <button
                                key={index}
                                onClick={() => setActiveVideo(ytId)}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left group relative overflow-hidden ${
                                  isActive 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                    : 'hover:bg-white dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                                }`}
                              >
                                <div className="text-[10px] font-black w-4 text-center opacity-50">
                                  {index + 1}
                                </div>
                                <div className="relative w-24 aspect-video rounded-xl overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-800 shadow-sm border border-black/5">
                                  <img 
                                    src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    {isActive ? (
                                      <div className="flex gap-0.5 items-end h-3">
                                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-white rounded-full" />
                                        <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-white rounded-full" />
                                        <motion.div animate={{ height: [12, 6, 12] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-white rounded-full" />
                                      </div>
                                    ) : (
                                      <Play size={14} className="text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] font-black leading-tight mb-1 line-clamp-2 ${isActive ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                    {video.title}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <Badge className={`px-1.5 py-0 border-none text-[8px] font-black uppercase tracking-tighter ${isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                      YouTube
                                    </Badge>
                                  </div>
                                </div>
                                {isActive && (
                                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30" />
                                )}
                              </button>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center space-y-4">
                            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mx-auto text-red-600 shadow-inner">
                              <Youtube size={28} />
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs text-zinc-900 dark:text-zinc-100 font-black uppercase tracking-tight">YouTube Playlist</p>
                              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                                We couldn't fetch the video list automatically.
                              </p>
                            </div>
                            <Button 
                              variant="primary" 
                              className="w-full text-[10px] font-black uppercase tracking-widest h-10 bg-red-600 hover:bg-red-700 text-white border-none rounded-xl"
                              onClick={() => window.open(`https://www.youtube.com/playlist?list=${activePlaylist.youtubePlaylistId}`, '_blank')}
                            >
                              Open in YouTube
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activePlaylist.videoIds?.map((videoId, index) => {
                          const video = contents.find(c => c.id === videoId);
                          if (!video) return null;
                          const ytId = getYouTubeId(video.url);
                          const isActive = activeVideo === ytId;
                          
                          return (
                            <button
                              key={video.id}
                              onClick={() => setActiveVideo(ytId)}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left group relative overflow-hidden ${
                                isActive 
                                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                  : 'hover:bg-white dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                              }`}
                            >
                              <div className="text-[10px] font-black w-4 text-center opacity-50">
                                {index + 1}
                              </div>
                              <div className="relative w-24 aspect-video rounded-xl overflow-hidden shrink-0 bg-zinc-200 dark:bg-zinc-800 shadow-sm border border-black/5">
                                <img 
                                  src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                  {isActive ? (
                                    <div className="flex gap-0.5 items-end h-3">
                                      <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-0.5 bg-white rounded-full" />
                                      <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-0.5 bg-white rounded-full" />
                                      <motion.div animate={{ height: [12, 6, 12] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-0.5 bg-white rounded-full" />
                                    </div>
                                  ) : (
                                    <Play size={14} className="text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-black leading-tight mb-1 line-clamp-2 ${isActive ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                  {video.title}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <Badge className={`px-1.5 py-0 border-none text-[8px] font-black uppercase tracking-tighter ${isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                                    {video.subject}
                                  </Badge>
                                </div>
                              </div>
                              {isActive && (
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30" />
                              )}
                            </button>
                          );
                        })}
                        {(!activePlaylist.videoIds || activePlaylist.videoIds.length === 0) && (
                          <div className="py-12 text-center space-y-3">
                            <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto text-zinc-400">
                              <List size={24} />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Empty Playlist</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {deletingId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-sm w-full shadow-2xl text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
                <Trash2 size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Delete Item?</h3>
                <p className="text-zinc-500 font-medium">This action cannot be undone. Are you sure you want to remove this resource?</p>
              </div>

              {uploadError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold">
                  {uploadError}
                </div>
              )}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 py-4 rounded-2xl" 
                  onClick={() => { setDeletingId(null); setUploadError(null); }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 py-4 bg-red-600 hover:bg-red-700 rounded-2xl" 
                  onClick={() => {
                    if (externalResources.find(r => r.id === deletingId)) {
                      confirmDeleteExternal();
                    } else {
                      handleDeleteContent(deletingId);
                    }
                  }}
                  disabled={isDeleting}
                  icon={isDeleting ? RefreshCcw : Trash2}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingExternal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Add External Link</h3>
                <Button variant="ghost" size="icon" onClick={() => { setIsAddingExternal(false); setGlobalError(null); }}><X size={20} /></Button>
              </div>

              {globalError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                  {globalError}
                </div>
              )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Icon (Emoji)</label>
                      <input 
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                        placeholder="e.g. 🎓"
                        value={newExternal.icon}
                        onChange={e => setNewExternal({...newExternal, icon: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Image Link Address</label>
                      <div className="flex gap-2">
                        <input 
                          type="file"
                          id="external-thumb"
                          className="hidden"
                          accept="image/*"
                          onChange={e => e.target.files && setExternalThumbnailFile(e.target.files[0])}
                        />
                        <label 
                          htmlFor="external-thumb"
                          className="px-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none dark:text-white text-[10px] font-bold cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Upload size={12} />
                          {externalThumbnailFile ? 'File Selected' : 'Upload'}
                        </label>
                        <input 
                          className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                          placeholder="Paste Google Image Link Address"
                          value={newExternal.thumbnail}
                          onChange={e => setNewExternal({...newExternal, thumbnail: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Platform Name</label>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                    placeholder="e.g. 10 Minute School"
                    value={newExternal.title}
                    onChange={e => setNewExternal({...newExternal, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Description</label>
                  <textarea 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white min-h-[100px]"
                    placeholder="Brief description..."
                    value={newExternal.description}
                    onChange={e => setNewExternal({...newExternal, description: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Platform Website URL</label>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                    placeholder="https://..."
                    value={newExternal.url}
                    onChange={e => setNewExternal({...newExternal, url: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 py-4 rounded-2xl" 
                  onClick={() => setIsAddingExternal(false)}
                  disabled={isUploadingExternal}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl" 
                  onClick={handleAddExternal}
                  disabled={isUploadingExternal}
                >
                  {isUploadingExternal ? <RefreshCcw className="animate-spin" size={20} /> : 'Save Link'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {isFeedbackOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Send Feedback</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsFeedbackOpen(false)}><X size={20} /></Button>
              </div>
              <p className="text-sm text-zinc-500 font-medium">Your feedback helps us improve EduBD for everyone.</p>
              <textarea 
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white min-h-[150px] text-sm"
                placeholder="Tell us what you think..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 py-4 rounded-2xl" onClick={() => setIsFeedbackOpen(false)}>Cancel</Button>
                <Button 
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl" 
                  onClick={handleSendFeedback}
                  disabled={isSendingFeedback || !feedbackText.trim()}
                >
                  {isSendingFeedback ? <RefreshCcw className="animate-spin" size={20} /> : 'Submit'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {renderFooter()}
    </div>
  );
}

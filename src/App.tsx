import { GoogleGenAI, Type } from "@google/genai";
import React, { useState, useMemo, useEffect, useRef, ChangeEvent, FormEvent, cloneElement } from 'react';
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
  Play,
  Maximize2,
  Minimize2,
  Clock,
  Timer,
  CheckCircle2,
  AlertCircle,
  Trophy,
  ClipboardList,
  Dice6,
  Check,
  HelpCircle,
  Database,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Badge } from './components/ui/Base';
import { INITIAL_DATA, MOCK_EXAMS } from './data/mockData';
import { ContentItem, Category, AcademicClass, ExternalResource, Feedback, Playlist, Exam, Question, ExamAttempt, LeaderboardEntry } from './types';
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
  serverTimestamp,
  limit,
  updateDoc,
  increment,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, uploadBytes } from 'firebase/storage';
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

const STANDARD_SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'ICT', 'General Knowledge', 'General'];

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
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-primary-palette/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-secondary-palette/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Animated Particles */}
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary-palette/20 rounded-full"
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
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 tracking-tighter">PARODORSHHI</h1>
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
                <Badge className="bg-primary-palette/10 text-primary-palette border border-primary-palette/20 mb-6 py-2 px-5 text-[11px] backdrop-blur-md">
                  ✨ Welcome to Parodorshhi
                </Badge>
                <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tighter">
                  Unlock Your<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-palette via-secondary-palette to-accent-palette drop-shadow-[0_0_30px_rgba(155,142,199,0.3)]">Academic Potential</span>
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

const MiniRobot = () => {
  const [isSad, setIsSad] = useState(false);
  const [justClicked, setJustClicked] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleInteraction = () => {
    setIsSad(false);
    setJustClicked(true);
    setTimeout(() => setJustClicked(false), 500);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsSad(true), 5000);
  };

  useEffect(() => {
    timerRef.current = setTimeout(() => setIsSad(true), 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ 
        opacity: 1, 
        scale: justClicked ? 1.2 : 1,
        y: justClicked ? -20 : (isSad ? [0, -4, 0] : [0, -8, 0]),
        filter: isSad ? 'grayscale(0.8) contrast(1.1)' : 'grayscale(0) contrast(1)',
      }}
      transition={{ 
        y: { 
          duration: justClicked ? 0.3 : (isSad ? 5 : 3), 
          repeat: justClicked ? 0 : Infinity, 
          ease: justClicked ? "easeOut" : "easeInOut" 
        },
        scale: { type: "spring", stiffness: 400, damping: 10 },
        filter: { duration: 1 }
      }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      className="relative w-20 h-20 cursor-pointer group z-10 p-2"
    >
      {/* 3D Body Construction */}
      <div className={`absolute inset-2 transition-all duration-1000 rounded-[22px] transform-gpu rotate-x-12 rotate-y-12 border-b-[6px] border-r-[6px] ${
        isSad 
          ? 'bg-zinc-200 border-zinc-400 shadow-inner' 
          : 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 border-rose-700 shadow-[0_15px_35px_-5px_rgba(244,63,94,0.4),0_5px_15px_-5px_rgba(244,63,94,0.2)]'
      }`}>
        {/* Face Screen */}
        <div className={`absolute inset-[6px] bg-zinc-950 rounded-[14px] overflow-hidden flex flex-col items-center justify-center border transition-colors duration-1000 ${
          isSad ? 'border-zinc-800' : 'border-rose-400/20'
        }`}>
          {/* Eyes Container */}
          <div className="flex gap-4 mb-2.5 relative">
            {/* Blushing Cheeks (Happy only) */}
            {!isSad && (
              <>
                <motion.div 
                  animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.4, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute -left-5 top-1.5 w-4 h-2 bg-rose-500/40 blur-[4px] rounded-full"
                />
                <motion.div 
                  animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.4, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                  className="absolute -right-5 top-1.5 w-4 h-2 bg-rose-500/40 blur-[4px] rounded-full"
                />
                {/* Joyful Hearts */}
                {justClicked && (
                  <motion.div 
                    initial={{ y: 0, opacity: 1, scale: 0.5 }}
                    animate={{ y: -25, opacity: 0, scale: 1.8 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 text-rose-400 text-lg"
                  >
                    ❤️
                  </motion.div>
                )}
              </>
            )}

            <div className="relative">
              {!isSad && <div className="absolute -top-2 left-0 w-full h-[1.5px] bg-rose-400/50 -rotate-12 rounded-full" />}
              {justClicked ? (
                <div className="w-3 h-3 text-rose-300 font-black leading-none transform -rotate-12 text-center text-sm">
                  v
                </div>
              ) : (
                <motion.div 
                  animate={isSad ? { scaleY: 0.15, opacity: 0.6 } : { scaleY: [1, 0.1, 1], opacity: 1 }}
                  transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.05, 0.1] }}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-1000 relative overflow-hidden ${
                    isSad ? 'bg-zinc-200' : 'bg-rose-300 shadow-[0_0_15px_rgba(251,113,133,0.8)]'
                  }`} 
                >
                  {!isSad && <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 bg-white rounded-full opacity-70" />}
                </motion.div>
              )}
            </div>
            <div className="relative">
              {!isSad && <div className="absolute -top-2 left-0 w-full h-[1.5px] bg-rose-400/50 rotate-12 rounded-full" />}
              {justClicked ? (
                <div className="w-3 h-3 text-rose-300 font-black leading-none transform rotate-12 text-center text-sm">
                  v
                </div>
              ) : (
                <motion.div 
                  animate={isSad ? { scaleY: 0.15, opacity: 0.6 } : { scaleY: [1, 0.1, 1], opacity: 1 }}
                  transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.05, 0.1], delay: 0.15 }}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-1000 relative overflow-hidden ${
                    isSad ? 'bg-zinc-200' : 'bg-rose-300 shadow-[0_0_15px_rgba(251,113,133,0.8)]'
                  }`} 
                >
                  {!isSad && <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 bg-white rounded-full opacity-70" />}
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Mouth - Realistic & Beautiful SVG Smile */}
          <motion.div className="flex items-center justify-center mt-1 h-4">
            <svg width="32" height="16" viewBox="0 0 32 16" className="overflow-visible">
              <defs>
                <linearGradient id="smileGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fda4af" />
                  <stop offset="50%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#fda4af" />
                </linearGradient>
              </defs>
              
              {/* Mouth Glow */}
              {!isSad && (
                <motion.path
                  d="M 6 4 Q 16 14 26 4"
                  fill="none"
                  stroke="#fb7185"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="blur-[6px] opacity-20"
                  animate={{
                    d: justClicked 
                      ? "M 4 2 Q 16 18 28 2" 
                      : ["M 8 5 Q 16 10 24 5", "M 6 4 Q 16 14 26 4", "M 8 5 Q 16 10 24 5"]
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Main Mouth Path */}
              <motion.path
                d={isSad 
                  ? "M 12 10 Q 16 6 20 10" 
                  : "M 8 5 Q 16 12 24 5"}
                fill="none"
                stroke={isSad ? "#52525b" : "url(#smileGradient)"}
                strokeWidth="2.5"
                strokeLinecap="round"
                animate={{
                  d: isSad 
                    ? "M 12 10 Q 16 6 20 10" 
                    : justClicked 
                      ? "M 4 2 Q 16 18 28 2" 
                      : ["M 8 5 Q 16 10 24 5", "M 6 4 Q 16 14 26 4", "M 8 5 Q 16 10 24 5"]
                }}
                transition={{
                  duration: 2.5,
                  repeat: isSad ? 0 : Infinity,
                  ease: "easeInOut"
                }}
              />
            </svg>
          </motion.div>
        </div>
        
        {/* Side Details */}
        <div className={`absolute -right-1.5 top-5 w-2 h-7 transition-colors duration-1000 rounded-r-xl ${isSad ? 'bg-zinc-300' : 'bg-rose-700 shadow-md'}`} />
        <div className={`absolute -left-1.5 top-5 w-2 h-7 transition-colors duration-1000 rounded-l-xl ${isSad ? 'bg-zinc-300' : 'bg-rose-700 shadow-md'}`} />
      </div>
      
      {/* Ribbon / Bow Antenna */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-1.5 h-8 bg-zinc-600 rounded-full shadow-sm">
        <motion.div 
          animate={{ 
            rotate: isSad ? 0 : [0, 180, 360],
            scale: isSad ? 0.7 : [1, 1.25, 1],
            y: isSad ? 0 : [0, -2, 0]
          }}
          transition={{ 
            rotate: { duration: 5, repeat: Infinity, ease: "linear" },
            scale: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-4 flex items-center justify-center"
        >
          <div className={`w-2.5 h-2.5 rounded-full relative z-10 transition-all duration-1000 ${
            isSad ? 'bg-zinc-400 border border-zinc-500' : 'bg-rose-400 shadow-[0_0_15px_rgba(251,113,133,1)]'
          }`} />
          <div className={`absolute -left-1.5 w-4 h-4 transition-all duration-1000 rounded-sm rotate-45 border-l-2 ${
            isSad ? 'bg-zinc-300 border-zinc-400' : 'bg-rose-500 border-rose-600/50 shadow-sm'
          }`} />
          <div className={`absolute -right-1.5 w-4 h-4 transition-all duration-1000 rounded-sm -rotate-45 border-r-2 ${
            isSad ? 'bg-zinc-300 border-zinc-400' : 'bg-rose-500 border-rose-600/50 shadow-sm'
          }`} />
        </motion.div>
      </div>

      {/* Permanent Status Label */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-zinc-950/90 text-white text-[10px] font-black px-4 py-2 rounded-[20px] transition-all whitespace-nowrap pointer-events-none uppercase tracking-[0.2em] shadow-xl border border-white/10 backdrop-blur-xl z-20">
        {isSad ? "Paaro needs attention..." : "Paaro is Happy!"}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [contents, setContents] = useState<ContentItem[]>(INITIAL_DATA);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [externalResources, setExternalResources] = useState<ExternalResource[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user');
  const [canUpload, setCanUpload] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'home' | 'category' | 'saved' | 'admin' | 'dashboard' | 'exam' | 'leaderboard'>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useLocalStorage('parodorshhi_darkmode', false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'resources' | 'playlists' | 'users' | 'feedback' | 'exams' | 'questions' | 'leaderboards'>('resources');
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);
  
  // Filters
  const [classFilter, setClassFilter] = useState<AcademicClass | 'All'>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');

  // Modals
  const [activePdf, setActivePdf] = useState<{ url: string; isRestricted: boolean } | null>(null);
  const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [fetchedPlaylistVideos, setFetchedPlaylistVideos] = useState<any[]>([]);
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);

  // Exam Mode State
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [currentExamQuestionIndex, setCurrentExamQuestionIndex] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, string | number>>({});
  const [examTimeLeft, setExamTimeLeft] = useState(0);
  const [examResults, setExamResults] = useState<ExamAttempt | null>(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ displayName: '', academicClass: 'Class 9' as AcademicClass });
  const [examSubjectFilter, setExamSubjectFilter] = useState('All');
  const [examClassFilter, setExamClassFilter] = useState<AcademicClass | 'All'>('All');
  const [examChapterFilter, setExamChapterFilter] = useState<string>('');
  const [examSetup, setExamSetup] = useState<{
    academicClass: AcademicClass;
    subject: string;
    chapter: string;
  }>({
     academicClass: 'Class 9',
     subject: '',
     chapter: 'All Chapters'
   });
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), []);

  // History management
  const isPopState = useRef(false);
  useEffect(() => {
    const handlePopAction = (e: PopStateEvent) => {
      if (e.state) {
        isPopState.current = true;
        setView(e.state.view);
        setSelectedCategory(e.state.category);
      }
    };
    window.addEventListener('popstate', handlePopAction);
    window.history.replaceState({ view: 'home', category: null }, '');
    return () => window.removeEventListener('popstate', handlePopAction);
  }, []);

  useEffect(() => {
    // Prevent double pushing when navigateTo is called
    if (isPopState.current) {
      isPopState.current = false;
    } else {
      // Debounce or just push? Let's just push for now, usually view/category are set together in one render cycle
      window.history.pushState({ view, category: selectedCategory }, '');
    }
  }, [view, selectedCategory]);

  const handleBack = () => window.history.back();
  const handleForward = () => window.history.forward();

  const fetchPlaylistVideos = async (playlistId: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `You are a YouTube expert. I need a COMPLETE and UNIQUE list of videos from this playlist: https://www.youtube.com/playlist?list=${playlistId}.
        
        Instructions:
        1. Find the playlist page and look at the video list.
        2. Extract the 'title' and the unique YouTube video 'url' for EVERY video you see.
        3. Double-check that you don't repeat the same URL for different titles.
        4. If there are 4 videos, I expect 4 objects in the JSON array.
        5. Return ONLY a JSON array of objects with { "title": "...", "url": "...", "description": "..." }.`,
        tools: [{ googleSearch: {} }],
        config: {
          thinkingConfig: {
            includeModelThought: true
          },
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
      const data = JSON.parse(response.text);
      // Safely handle duplicates in case the AI hallunicates
      const unique = data.reduce((acc: any[], current: any) => {
        const id = getYouTubeId(current.url);
        if (!acc.find(item => getYouTubeId(item.url) === id)) {
          acc.push(current);
        }
        return acc;
      }, []);
      return unique;
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
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isAddingExternal, setIsAddingExternal] = useState(false);
  const [externalThumbnailFile, setExternalThumbnailFile] = useState<File | null>(null);
  const [externalThumbnailPreview, setExternalThumbnailPreview] = useState<string | null>(null);

  const handleExternalThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExternalThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setExternalThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const [isUploadingExternal, setIsUploadingExternal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<{ thumbnail?: File, resource?: File }>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState<string>('All');
  const [questionClassFilter, setQuestionClassFilter] = useState<string>('All');

  const [examPrep, setExamPrep] = useState<Exam | null>(null);

  // Exam Mode Handlers
  const handleStartExam = async (exam: Exam) => {
    setIsGeneratingExam(true);
    setExamPrep(null);
    setGlobalError(null);
    
    console.log('--- STARTING NEW EXAM SYSTEM ---');

    try {
      // Fetch questions from the specific exam's subcollection
      const examsSnap = await getDocs(collection(db, 'exams', exam.id, 'questions'));
      const poolFromExam = examsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
      
      let pool = poolFromExam;
      
      // If exam pool is empty, try to fetch from global question bank filtering by subject and class
      if (pool.length === 0) {
        console.log("Exam pool empty, fetching from global question bank...");
        const globalQ = query(
          collection(db, 'questions'),
          where('subject', '==', exam.subject),
          where('class', '==', exam.class)
        );
        const globalSnap = await getDocs(globalQ);
        pool = globalSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
      }

      // Filter by chapter if requested (Local filtering for flexibility)
      const isAllChapters = !exam.chapter || exam.chapter === 'All' || exam.chapter === 'All Chapters' || exam.chapter.trim() === '';
      
      if (!isAllChapters) {
        const chapterTerm = exam.chapter.toLowerCase().trim();
        pool = pool.filter(q => 
          (q.chapter && q.chapter.toLowerCase().includes(chapterTerm)) ||
          (q.chapter && chapterTerm.includes(q.chapter.toLowerCase()))
        );
      }

      if (pool.length === 0) {
        throw new Error(`No questions found for ${exam.subject} (${exam.class})${!isAllChapters ? ` Chapter: ${exam.chapter}` : ''}. We checked both the private exam pool and the public question bank.`);
      }

      // Selection Logic: Shuffle and slice based on totalQuestionsToShow
      const finalQuestions = [...pool]
        .sort(() => Math.random() - 0.5)
        .slice(0, exam.totalQuestionsToShow || pool.length);
      
      console.log(`Pool size: ${pool.length}, Selected: ${finalQuestions.length}`);

      const timeLimit = exam.timeLimit || 30;

      setActiveExam({ 
        ...exam, 
        questions: finalQuestions,
        timeLimit: Math.round(timeLimit)
      } as any);
      
      setCurrentExamQuestionIndex(0);
      setExamAnswers({});
      setExamTimeLeft(Math.round(timeLimit) * 60);
      setExamResults(null);
      setIsExamActive(true);
      setView('exam');
      setExamPrep(null);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      console.error('--- EXAM GENERATION FAILED ---');
      setGlobalError(error.message || "Failed to generate exam.");
    } finally {
      setIsGeneratingExam(false);
    }
  };

  const handleExamAnswer = (questionId: string, value: string | number) => {
    setExamAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleExamSubmit = async () => {
    if (!activeExam || !auth.currentUser) return;

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const maxScore = activeExam.questions.reduce((acc, q) => acc + q.points, 0);

    activeExam.questions.forEach(q => {
      const userAnswer = examAnswers[q.id];
      if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
        unansweredCount++;
      } else {
        if (q.type === 'mcq') {
          if (userAnswer === q.correctAnswer) {
            score += q.points;
            correctCount++;
          } else {
            wrongCount++;
            if (activeExam.negativeMarking) {
              score -= (activeExam.negativeValue || 0.25);
            }
          }
        } else {
          // Written logic: simple validation for now
          if (typeof userAnswer === 'string' && userAnswer.trim().length > 0) {
            score += q.points;
            correctCount++;
          } else {
            unansweredCount++;
          }
        }
      }
    });

    const timeTaken = Math.round(activeExam.timeLimit * 60 - examTimeLeft);
    const now = Date.now();
    const currentUserName = firestoreUser?.displayName || auth.currentUser?.displayName || 'Student';

    const attempt: ExamAttempt = {
      id: Math.random().toString(36).substring(7),
      examId: activeExam.id,
      userId: auth.currentUser.uid,
      userName: currentUserName,
      userClass: firestoreUser?.class || 'General',
      answers: activeExam.questions.map(q => examAnswers[q.id] ?? null), // Use actual mapping for order
      score: Math.max(0, score), // Don't let score be negative
      maxScore,
      correctCount,
      wrongCount,
      unansweredCount,
      totalQuestions: activeExam.questions.length,
      timeTaken,
      startTime: now - timeTaken * 1000,
      submittedAt: now,
      examTitle: activeExam.title
    };

    setExamResults(attempt);
    setIsExamActive(false);
    setView('exam'); // Ensure we stay in exam view to show results

    try {
      // 1. Save detailed attempt to 'attempts'
      await addDoc(collection(db, 'attempts'), {
        ...attempt,
        examTitle: activeExam.title,
        timestamp: serverTimestamp()
      });

      // 2. Update Leaderboard if this is the best score
      // Logic for tie-breaking: Higher score, then Lower Time, then Earliest Submission
      const entryId = `${auth.currentUser.uid}_${activeExam.id}`;
      const leaderboardRef = doc(db, 'leaderboards', entryId);
      const existingEntry = await getDoc(leaderboardRef);

      let shouldUpdate = false;
      if (!existingEntry.exists()) {
        shouldUpdate = true;
      } else {
        const data = existingEntry.data() as LeaderboardEntry;
        if (attempt.score > data.bestScore) {
          shouldUpdate = true;
        } else if (attempt.score === data.bestScore) {
          if (attempt.timeTaken < data.timeTaken) {
            shouldUpdate = true;
          }
        }
      }

      if (shouldUpdate) {
        const leaderboardData: LeaderboardEntry = {
          id: entryId,
          userId: auth.currentUser.uid,
          userName: currentUserName,
          userPhoto: auth.currentUser?.photoURL || '',
          examId: activeExam.id,
          examTitle: activeExam.title,
          class: activeExam.class,
          bestScore: attempt.score,
          timeTaken: attempt.timeTaken,
          firstSubmissionAt: existingEntry.exists() ? existingEntry.data()?.firstSubmissionAt : now,
          totalAttempts: existingEntry.exists() ? (existingEntry.data()?.totalAttempts || 0) + 1 : 1,
          lastUpdated: now
        };
        await setDoc(leaderboardRef, leaderboardData);
      } else {
        // Just increment attempt count
        await updateDoc(leaderboardRef, {
          totalAttempts: increment(1),
          userName: currentUserName,
          userPhoto: auth.currentUser?.photoURL || '',
          lastUpdated: now
        });
      }
    } catch (error) {
      console.error("Error saving leaderboard/result:", error);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamActive && examTimeLeft > 0) {
      timer = setInterval(() => {
        setExamTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (examTimeLeft === 0 && isExamActive) {
      handleExamSubmit();
    }
    return () => clearInterval(timer);
  }, [isExamActive, examTimeLeft]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null);

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
    chapter: '',
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
    chapter: '',
    thumbnail: ''
  });
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    title: '',
    class: 'Class 9',
    subject: 'Math',
    chapter: '',
    chapterNameCustom: '',
    examType: 'mcq',
    totalQuestionsToShow: 30,
    negativeMarking: false,
    negativeValue: 0.25,
    status: 'approved'
  });

  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    examId: '',
    type: 'mcq',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    points: 1,
    class: 'Class 9',
    subject: '',
    chapter: ''
  });

  const [temporaryQuestions, setTemporaryQuestions] = useState<Question[]>([]);
  const [allLeaderboards, setAllLeaderboards] = useState<LeaderboardEntry[]>([]);
  const [leaderboardClassFilter, setLeaderboardClassFilter] = useState<'Class 6' | 'Class 7' | 'Class 8' | 'Class 9-10' | 'Class 11-12'>('Class 9-10');
  const [leaderboardExamId, setLeaderboardExamId] = useState<string | null>(null);
  const [questionBankExamId, setQuestionBankExamId] = useState<string>('global');

  const getClassGroup = (academicClass: AcademicClass): string => {
    if (academicClass === 'Class 6') return 'Class 6';
    if (academicClass === 'Class 7') return 'Class 7';
    if (academicClass === 'Class 8') return 'Class 8';
    if (academicClass === 'Class 9' || academicClass === 'Class 10') return 'Class 9-10';
    if (academicClass === 'Class 11' || academicClass === 'Class 12') return 'Class 11-12';
    return academicClass;
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsUpdatingProfile(true);
    setGlobalError(null);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      // Update Firebase Auth name
      if (profileFormData.displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: profileFormData.displayName });
        await auth.currentUser.reload();
        setUser({ ...auth.currentUser });
      }

      // Update Firestore user document
      await updateDoc(userRef, {
        displayName: profileFormData.displayName,
        name: profileFormData.displayName,
        class: profileFormData.academicClass,
        updatedAt: Date.now()
      });

      // Update name/class in all user's leaderboard entries
      const q = query(collection(db, 'leaderboards'), where('userId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        querySnapshot.docs.forEach((leaderDoc) => {
          batch.update(leaderDoc.ref, {
            userName: profileFormData.displayName,
            class: profileFormData.academicClass,
            lastUpdated: Date.now()
          });
        });
        await batch.commit();
      }

      setIsEditingProfile(false);
      // setGlobalError(null); // Success
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      setGlobalError("Failed to update profile. Please try again.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const [newExternal, setNewExternal] = useState<Partial<ExternalResource>>({
    title: '',
    description: '',
    url: '',
    icon: '🌐',
    chapter: '',
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
    setActiveExam(null);
    setIsExamActive(false);
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
        setFirestoreUser(data);
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
          name: user.displayName, // Requested: name
          photoURL: user.photoURL,
          role: role,
          class: 'Class 9', // Default if missing
          canUpload: uploadPermission,
          createdAt: Date.now(),
          updatedAt: Date.now(),
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
      console.log("Seeding COMPLETE content data.");
      for (const exam of MOCK_EXAMS) {
        const docRef = await addDoc(collection(db, 'exams'), {
          ...exam,
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
    if (!user) return;
    const q = query(
      collection(db, 'leaderboards'),
      orderBy('bestScore', 'desc'),
      orderBy('timeTaken', 'asc'), // Score + Time Priority
      limit(200)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllLeaderboards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaderboardEntry)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (userRole !== 'admin') return;
    
    let unsubscribe: () => void;
    
    if (questionBankExamId === 'global') {
      const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'), limit(100));
      unsubscribe = onSnapshot(q, (snapshot) => {
        setAllQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'questions');
      });
    } else {
      const q = query(collection(db, 'exams', questionBankExamId, 'questions'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        setAllQuestions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `exams/${questionBankExamId}/questions`);
      });
    }
    
    return () => unsubscribe && unsubscribe();
  }, [userRole, questionBankExamId]);

  useEffect(() => {
    // Admin sees ALL exams, regular users only see approved ones
    let q;
    if (userRole === 'admin') {
      q = query(collection(db, 'exams'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'exams'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'exams', setGlobalError);
    });
    return () => unsubscribe();
  }, [userRole]);

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
      if (!name || !email || !pass) {
        setAuthError("All fields are required.");
        setIsAuthLoading(false);
        return;
      }
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(result.user, { displayName: name });
      
      // Save extra info to Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        displayName: name,
        name: name, // Added for user requested schema
        class: academicClass,
        role: 'user',
        createdAt: Date.now()
      }, { merge: true });

      // Let onAuthStateChanged handle the user state naturally
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
    } else if (error.code === 'auth/operation-not-allowed') {
      message = "Email/Password sign-in is not enabled. Please enable it in Firebase console.";
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

  const scrollContainer = (id: string, direction: 'left' | 'right') => {
    const container = document.getElementById(id);
    if (container) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
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
    'General Knowledge': Globe,
    'General': GraduationCap
  };

  const subjects = ['All', ...STANDARD_SUBJECTS];

  const years = ['All Years', '2024', '2023', '2022', '2021'];
  const [yearFilter, setYearFilter] = useState('All Years');
  
  // Derive chapters from allExams based on subject and class
  const chapters = useMemo(() => {
    const set = new Set<string>();
    allExams.forEach(e => {
      if ((examSubjectFilter === 'All' || e.subject === examSubjectFilter) &&
          (examClassFilter === 'All' || e.class === examClassFilter)) {
        if (e.chapter && e.chapter !== 'All' && e.chapter !== 'All Chapters') {
          set.add(e.chapter);
        }
      }
    });
    return ['All', ...Array.from(set).sort()];
  }, [allExams, examSubjectFilter, examClassFilter]);

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
                console.warn(`[IMAGE] Failed to load thumbnail for: ${item.title}. URL: ${item.thumbnail}`);
                (e.target as HTMLImageElement).style.opacity = '0.4'; 
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
            {item.chapter && (
              <Badge className="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                {item.chapter}
              </Badge>
            )}
            {item.year && (
              <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/20 hidden sm:inline-flex">
                {item.year}
              </Badge>
            )}
          </div>
          <h4 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white mb-2 sm:mb-3 line-clamp-2 leading-tight tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h4>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm mb-4 sm:mb-6 line-clamp-2 leading-relaxed font-medium">
            {item.description}
          </p>
          
          <div className="flex items-center gap-2 mt-auto">
            <Button 
              className="flex-1 text-xs sm:text-base py-2 sm:py-2.5" 
              size="sm" 
              icon={item.category === 'YouTube Classes' ? Youtube : (item.category === 'Books' ? Download : (item.category === 'Practice Sheet' ? Eye : FileText))} 
              onClick={() => {
                if (item.category === 'YouTube Classes') setActiveVideo(getYouTubeId(item.url));
                else setActivePdf({ url: item.url, isRestricted: item.category === 'Practice Sheet' });
              }}
            >
              {item.category === 'YouTube Classes' ? 'Watch' : (item.category === 'Books' ? 'Download PDF' : (item.category === 'Practice Sheet' ? 'Read Sheet' : (item.category === 'Question Papers' ? 'View Paper' : 'View Notes')))}
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
              console.warn(`[IMAGE] Failed to load playlist thumbnail: ${playlist.title}. URL: ${playlist.thumbnail}`);
              (e.target as HTMLImageElement).style.opacity = '0.4';
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

  const renderSection = (title: string, category: Category, icon: any, addLabel: string, id: string) => {
    const sectionContents = filteredContents.filter(c => c.category === category).slice(0, 12);
    const containerId = `scroll-${id}`;
    
    if (sectionContents.length === 0 && searchQuery) return null;

    return (
    <section 
      id={id} 
      className={`space-y-4 sm:space-y-6 scroll-mt-24 p-4 sm:p-6 -mx-4 sm:-mx-6 rounded-2xl sm:rounded-[32px] transition-colors duration-500 relative group/section ${highlightedSection === id ? 'animate-section-flash ring-1 ring-blue-500/20' : ''}`}
    >
      <div className="absolute top-2 right-4 sm:right-12 pointer-events-none">
        <div className="pointer-events-auto">
          <MiniRobot />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            {icon}
          </div>
          <h3 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white whitespace-nowrap">{title}</h3>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-1 mr-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
              onClick={() => scrollContainer(containerId, 'left')}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
              onClick={() => scrollContainer(containerId, 'right')}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
          {canUpload && (
            <Button variant="outline" size="sm" icon={Plus} className="hidden sm:inline-flex" onClick={() => {
              setIsEditing(false);
              setEditingId(null);
              setNewItem({ ...newItem, category, title: '', description: '', url: '', thumbnail: '' });
              setIsAdding(true);
            }}>{addLabel}</Button>
          )}
          <button 
            onClick={() => { setSelectedCategory(category); setView('category'); }}
            className="text-blue-600 font-bold text-xs sm:text-sm hover:underline flex items-center gap-1"
          >
            See all <ChevronRight size={14} className="sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

        <div 
          id={containerId}
          className="flex overflow-x-auto pb-6 sm:pb-2 gap-4 sm:gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {sectionContents.map((item, sIdx) => (
            <div key={item.id || `content-${sIdx}`} className="min-w-[280px] sm:min-w-[320px] w-[280px] sm:w-[320px] snap-start">
              {renderContentCard(item)}
            </div>
          ))}
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

    const displayPlaylists = filteredPlaylists.slice(0, 12);
    const containerId = "scroll-playlists";

    if (filteredPlaylists.length === 0 && searchQuery) return null;
    if (filteredPlaylists.length === 0 && !canUpload) return null;

    return (
      <section className="space-y-6 p-6 -mx-6 rounded-[32px] transition-colors duration-500 relative group/section">
        <div className="absolute top-2 right-4 sm:right-12 pointer-events-none">
          <div className="pointer-events-auto">
            <MiniRobot />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-600">
              <Youtube size={24} />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Featured Playlists</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1 mr-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                onClick={() => scrollContainer(containerId, 'left')}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                onClick={() => scrollContainer(containerId, 'right')}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
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

        <div id={containerId} className="flex overflow-x-auto pb-6 sm:pb-2 gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth">
          {displayPlaylists.map((playlist, pIdx) => (
            <div key={playlist.id || `playlist-${pIdx}`} className="min-w-[320px] w-[320px] snap-start">
              {renderPlaylistCard(playlist)}
            </div>
          ))}
          {displayPlaylists.length === 0 && canUpload && (
            <div 
              onClick={() => setIsAddingPlaylist(true)}
              className="min-w-[320px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] flex flex-col items-center justify-center p-8 text-zinc-400 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer group"
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
    const containerId = "scroll-external";

    return (
      <section className="space-y-6 relative group/section">
        <div className="absolute top-2 right-4 sm:right-12 pointer-events-none">
          <div className="pointer-events-auto">
            <MiniRobot />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600">
              <Globe size={24} />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">External Resources</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1 mr-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                onClick={() => scrollContainer(containerId, 'left')}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                onClick={() => scrollContainer(containerId, 'right')}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            {userRole === 'admin' && (
              <Button variant="outline" size="sm" icon={Plus} onClick={() => setIsAddingExternal(true)}>Add Link</Button>
            )}
          </div>
        </div>

        <div id={containerId} className="flex overflow-x-auto pb-6 sm:pb-2 gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth">
          {externalResources.map((resource, erIdx) => (
            <div key={resource.id || `ext-${erIdx}`} className="min-w-[200px] w-[200px] snap-start">
              <Card className="p-4 flex flex-col h-full items-center text-center group relative border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all duration-300">
                <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 overflow-hidden shrink-0 relative">
                  {resource.thumbnail && (
                    <img 
                      src={getDirectImageUrl(resource.thumbnail)} 
                      alt={resource.title} 
                      title={resource.title}
                      className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        console.warn(`[IMAGE] Failed to load external resource thumbnail: ${resource.title}. URL: ${resource.thumbnail}`);
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
                  className="w-full mt-auto rounded-xl group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300"
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
    <div className="py-4 sm:py-6 overflow-hidden flex flex-col items-center w-full">
      <div className="space-y-8 sm:space-y-8 w-full max-w-5xl px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 w-full">
          <span className="text-[10px] sm:text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] whitespace-nowrap shrink-0 w-full text-center sm:w-auto sm:text-left">CLASS</span>
          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0">
            <div className="flex flex-row gap-2 sm:gap-3 px-2 sm:px-0 justify-center sm:justify-start min-w-max mx-auto sm:mx-0">
              {classes.map(c => (
                <button 
                  key={c}
                  onClick={() => setClassFilter(c)}
                  className={`px-4 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-bold transition-all duration-300 shrink-0 whitespace-nowrap ${
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
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 w-full">
          <span className="text-[10px] sm:text-[11px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] whitespace-nowrap shrink-0 w-full text-center sm:w-auto sm:text-left">SUBJECT</span>
          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0">
            <div className="flex flex-row gap-2 sm:gap-3 px-2 sm:px-0 justify-center sm:justify-start min-w-max mx-auto sm:mx-0">
              {subjects.map(s => {
                const Icon = subjectIcons[s];
                return (
                  <button 
                    key={s}
                    onClick={() => setSubjectFilter(s)}
                    className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-bold transition-all duration-300 shrink-0 whitespace-nowrap ${
                      subjectFilter === s 
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl shadow-zinc-900/10 dark:shadow-white/10 scale-105' 
                      : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm'
                    }`}
                  >
                    {Icon && <Icon size={14} className={subjectFilter === s ? 'text-blue-400' : 'text-zinc-400'} strokeWidth={2.5} />}
                    {s}
                  </button>
                );
              })}
            </div>
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
        <button 
          onClick={() => setAdminTab('exams')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'exams' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Exams
        </button>
        <button 
          onClick={() => setAdminTab('questions')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'questions' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Questions
        </button>
        <button 
          onClick={() => setAdminTab('leaderboards')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'leaderboards' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Leaderboards
        </button>
      </div>

      {adminTab === 'resources' ? (
        <div className="grid grid-cols-1 gap-4">
          {allContents.map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all">
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
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-500" onClick={() => handleDeleteContent(item.id)}><Trash2 size={20} /></Button>
                {item.status !== 'approved' && (
                  <Button variant="primary" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveContent(item.id)}>Approve</Button>
                )}
                {item.status !== 'rejected' && (
                  <Button variant="outline" size="sm" className="border-red-500/20 text-red-500 hover:bg-red-500/10" onClick={() => handleRejectContent(item.id)}>Reject</Button>
                )}
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
          {allPlaylists.map((playlist, pIdx) => (
            <div key={`all-pl-${playlist.id || pIdx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all">
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
          {allUsers.map((u, uIdx) => (
            <div key={`all-u-${u.id || uIdx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex items-center gap-6 shadow-sm hover:shadow-md transition-all">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} alt={u.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
      ) : adminTab === 'exams' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-500/20">
            <div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Question Bank Size</p>
              <h4 className="text-xl font-black text-indigo-900 dark:text-white">{allQuestions.length} Global Questions</h4>
            </div>
            <Button 
              onClick={() => {
                setEditingExamId(null);
                setNewExam({
                  title: '',
                  description: '',
                  timeLimit: 30,
                  mcqCount: 25,
                  writtenCount: 1,
                  class: 'Class 9',
                  subject: 'General',
                  difficulty: 'Medium',
                  status: 'approved'
                });
                setIsAddingExam(true);
              }}
              icon={Plus}
              className="bg-indigo-600 shadow-lg shadow-indigo-500/20"
            >
              Create New Exam
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6">
            {allExams.map((exam, idx) => (
              <div key={`${exam.id}-${idx}`} className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-xl hover:border-indigo-500/20 transition-all duration-300 overflow-hidden">
                {/* Confirmation Overlay for Deletion */}
                <AnimatePresence>
                  {examToDelete === exam.id && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-10 bg-red-600/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center space-y-4"
                    >
                      <div className="bg-white/20 p-3 rounded-2xl">
                        <Trash2 size={24} className="text-white" />
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-lg font-black tracking-tight">Delete this exam?</h5>
                        <p className="text-xs text-white/80 font-medium">This action is permanent and cannot be reversed.</p>
                      </div>
                      <div className="flex items-center gap-3 w-full max-w-[240px]">
                        <Button 
                          variant="ghost" 
                          className="flex-1 bg-white text-red-600 hover:bg-zinc-100 rounded-xl py-3 font-bold text-xs" 
                          onClick={async () => {
                            setIsDeletingExam(true);
                            console.log(`Starting deletion of exam: ${exam.id}`);
                            try {
                              const examRef = doc(db, 'exams', exam.id);
                              await deleteDoc(examRef);
                              console.log('Deletion successful');
                              setExamToDelete(null);
                            } catch (err: any) {
                              console.error('Deletion error:', err);
                              setGlobalError(`Delete failed: ${err.message}`);
                              setExamToDelete(null);
                            } finally {
                              setIsDeletingExam(false);
                            }
                          }}
                          disabled={isDeletingExam}
                        >
                          {isDeletingExam ? <RefreshCw className="animate-spin" size={14} /> : 'Delete'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="flex-1 bg-black/20 text-white hover:bg-black/30 rounded-xl py-3 font-bold text-xs" 
                          onClick={() => setExamToDelete(null)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <ClipboardList size={32} />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{exam.title}</h4>
                    <Badge className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-none px-3 py-1 font-black">
                      {exam.class} • {exam.subject}
                    </Badge>
                    {exam.status === 'pending' && <Badge className="bg-amber-100 text-amber-600 border-none">Pending</Badge>}
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">{exam.description || 'No description provided.'}</p>
                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    <span className="flex items-center gap-1.5 py-1 px-3 bg-zinc-50 dark:bg-zinc-800 rounded-full"><Clock size={12} className="text-zinc-500" /> {exam.timeLimit} MIN</span>
                    <span className="flex items-center gap-1.5 py-1 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600"><HelpCircle size={12} /> {exam.mcqCount} MCQ</span>
                    <span className="flex items-center gap-1.5 py-1 px-3 bg-purple-50 dark:bg-purple-900/20 rounded-full text-purple-600"><FileText size={12} /> {exam.writtenCount} WRITTEN</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all shadow-sm" 
                    onClick={() => {
                      setNewExam(exam);
                      setEditingExamId(exam.id);
                      setIsAddingExam(true);
                    }}
                  >
                    <Pencil size={20} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-white hover:bg-red-500 transition-all border border-transparent shadow-sm" 
                    onClick={() => setExamToDelete(exam.id)}
                  >
                    <Trash2 size={20} />
                  </Button>
                </div>
              </div>
            ))}
            {allExams.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                  <ClipboardList size={40} />
                </div>
                <p className="text-zinc-500 font-bold">No exams configured yet.</p>
              </div>
            )}
          </div>
        </div>
      ) : adminTab === 'questions' ? (
        <div className="space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  placeholder="Search questions..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-sm dark:text-white"
                  onChange={(e) => {/* Add search logic if needed */}}
                />
              </div>
              <select 
                className="w-full sm:w-64 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-2.5 rounded-xl outline-none text-sm dark:text-white font-bold"
                value={questionBankExamId}
                onChange={e => setQuestionBankExamId(e.target.value)}
              >
                <option value="global">Global Question Bank</option>
                <optgroup label="Filter by Exam">
                  {allExams.map((exam, eIdx) => (
                    <option key={`exam-opt-${exam.id || eIdx}`} value={exam.id}>{exam.title} ({exam.class || exam.academicClass})</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                className="rounded-2xl border-orange-200 text-orange-600 hover:bg-orange-50"
                onClick={async () => {
                  if (!confirm('This will scan all questions and fix common typos (like "mtah" to "Math") in the database. Continue?')) return;
                  setIsGeneratingExam(true);
                  try {
                    const qDocs = await getDocs(collection(db, 'questions'));
                    let fixedCount = 0;
                    for (const d of qDocs.docs) {
                      const data = d.data();
                      let updated = false;
                      const updateObj: any = {};
                      
                      if (data.subject?.toLowerCase() === 'mtah') {
                        updateObj.subject = 'Math';
                        updated = true;
                      }
                      
                      if (updated) {
                        await setDoc(doc(db, 'questions', d.id), updateObj, { merge: true });
                        fixedCount++;
                      }
                    }
                    alert(`Cleanup complete! ${fixedCount} questions were repaired.`);
                  } catch (err: any) {
                    setGlobalError(err.message);
                  } finally {
                    setIsGeneratingExam(false);
                  }
                }}
              >
                <Database size={16} className="mr-2" />
                Repair Typos
              </Button>
              <Button 
                variant="outline"
                className="rounded-2xl border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={async () => {
                  if (!confirm('This will add 15+ standardized questions. Continue?')) return;
                  setIsGeneratingExam(true);
                  try {
                    const sampleQuestions = [
                      // General Knowledge for admissions
                      { type: 'mcq', questionText: 'What is the capital of Bangladesh?', options: ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi'], correctAnswer: 0, points: 1, class: 'General', subject: 'General Knowledge', chapter: 'Geography', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'In which year did Bangladesh gain independence?', options: ['1970', '1971', '1972', '1975'], correctAnswer: 1, points: 1, class: 'General', subject: 'General Knowledge', chapter: 'History', createdAt: Date.now() },
                      
                      // Physics Class 9
                      { type: 'mcq', questionText: 'Which unit is used to measure force?', options: ['Watt', 'Joule', 'Newton', 'Pascal'], correctAnswer: 2, points: 1, class: 'Class 9', subject: 'Physics', chapter: 'Force', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'What is the acceleration due to gravity on Earth?', options: ['8.8 ms^-2', '9.8 ms^-2', '10.8 ms^-2', '7.8 ms^-2'], correctAnswer: 1, points: 1, class: 'Class 9', subject: 'Physics', chapter: 'Motion', createdAt: Date.now() },
                      
                      // Math Class 9
                      { type: 'mcq', questionText: 'Solve: 5x + 10 = 30. What is x?', options: ['2', '4', '6', '8'], correctAnswer: 1, points: 2, class: 'Class 9', subject: 'Math', chapter: 'Algebra', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'What is the sum of angles in a triangle?', options: ['90°', '180°', '270°', '360°'], correctAnswer: 1, points: 1, class: 'Class 9', subject: 'Math', chapter: 'Geometry', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'What is the value of pi (π) up to two decimal places?', options: ['3.12', '3.14', '3.16', '3.18'], correctAnswer: 1, points: 1, class: 'Class 9', subject: 'Math', chapter: 'Geometry', createdAt: Date.now() },
                      
                      // Biology Class 9
                      { type: 'mcq', questionText: 'What is the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Apparatus'], correctAnswer: 1, points: 1, class: 'Class 9', subject: 'Biology', chapter: 'Cell', createdAt: Date.now() },
                      { type: 'written', questionText: 'Explain the three laws of Newton.', points: 10, class: 'Class 9', subject: 'Physics', chapter: 'Laws of Motion', createdAt: Date.now() },

                      // Medical Admission Samples
                      { type: 'mcq', questionText: 'Which vitamin is synthesized by the human skin in sunlight?', options: ['Vit A', 'Vit B12', 'Vit C', 'Vit D'], correctAnswer: 3, points: 1, class: 'Medical Admission-science', subject: 'General', chapter: 'Biology', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'What is the normal blood pH range for humans?', options: ['7.05 - 7.15', '7.35 - 7.45', '7.55 - 7.65', '6.85 - 6.95'], correctAnswer: 1, points: 1, class: 'Medical Admission-science', subject: 'General', chapter: 'Chemistry', createdAt: Date.now() },
                      { type: 'mcq', questionText: 'Who is the father of Bangladesh?', options: ['Sheikh Mujibur Rahman', 'Ziaur Rahman', 'Sher-e-Bangla', 'Bhashani'], correctAnswer: 0, points: 1, class: 'Medical Admission-science', subject: 'General', chapter: 'GK', createdAt: Date.now() },
                      
                      // Engineering Admission Samples
                      { type: 'mcq', questionText: 'Calculation of work done by a variable force involves:', options: ['Multiplication', 'Division', 'Integration', 'Addition'], correctAnswer: 2, points: 1, class: 'Engineering Admission-science', subject: 'Physics', chapter: 'Mechanics', createdAt: Date.now() }
                    ];

                    for (const q of sampleQuestions) {
                      await addDoc(collection(db, 'questions'), q);
                    }
                    alert('Questions seeded successfully!');
                  } catch (err: any) {
                    setGlobalError(err.message);
                  } finally {
                    setIsGeneratingExam(false);
                  }
                }}
              >
                <Database size={16} className="mr-2" />
                Seed Questions
              </Button>
              <Button 
                onClick={() => {
                  setEditingQuestionId(null);
                  setNewQuestion({
                    type: 'mcq',
                    questionText: '',
                    options: ['', '', '', ''],
                    correctAnswer: 0,
                    points: 1,
                    class: 'Class 9',
                    subject: 'Math',
                    chapter: ''
                  });
                  setIsAddingQuestion(true);
                }}
                icon={Plus}
                className="bg-blue-600 shadow-lg shadow-blue-500/20"
              >
                Add Question
              </Button>
            </div>
          </div>

          <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl p-8 rounded-[40px] border border-zinc-200/50 dark:border-zinc-800/50 space-y-8 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Filter by Class</label>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-none">{questionClassFilter}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {['All', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'General', 'Engineering Admission-science', 'Medical Admission-science', 'Varsity Admission-science', 'Varsity Admission-humanities', 'Varsity Admission-commerce'].map(c => (
                  <button
                    key={c}
                    onClick={() => setQuestionClassFilter(c)}
                    className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                      questionClassFilter === c 
                      ? 'bg-indigo-600 text-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] scale-105' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Filter by Subject</label>
                <Badge className="bg-blue-500/10 text-blue-600 border-none">{questionSubjectFilter}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {['All', ...STANDARD_SUBJECTS].map(s => (
                  <button
                    key={s}
                    onClick={() => setQuestionSubjectFilter(s)}
                    className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                      questionSubjectFilter === s 
                      ? 'bg-blue-600 text-white shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] scale-105' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center gap-2 text-zinc-500 font-bold text-xs">
                <Database size={16} />
                <span>Showing {allQuestions.filter(q => (questionClassFilter === 'All' || q.class === questionClassFilter) && (questionSubjectFilter === 'All' || q.subject === questionSubjectFilter)).length} Questions</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setQuestionClassFilter('All');
                  setQuestionSubjectFilter('All');
                }}
                className="text-[10px]"
                icon={RefreshCw}
              >
                Reset All
              </Button>
            </div>
          </div>

          {allQuestions.filter(q => (questionClassFilter === 'All' || q.class === questionClassFilter) && (questionSubjectFilter === 'All' || q.subject === questionSubjectFilter)).length === 0 && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-3xl p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <Database size={32} />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-zinc-900 dark:text-white">Empty Question Bank</h4>
                <p className="text-sm text-zinc-500 max-w-sm mx-auto">Your question bank is empty. Use the "Seed Questions" button above to quickly populate it with standardized data.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {allQuestions
              .filter(q => (questionClassFilter === 'All' || q.class === questionClassFilter) && (questionSubjectFilter === 'All' || q.subject === questionSubjectFilter))
              .map((q, qIdx) => (
              <div key={`${q.id || 'q'}-${qIdx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm hover:shadow-md transition-all group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${q.type === 'mcq' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'}`}>
                  {q.type === 'mcq' ? <HelpCircle size={24} /> : <FileText size={24} />}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-2 py-0.5 text-[8px] uppercase font-black">{q.class}</Badge>
                    <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-none px-2 py-0.5 text-[8px] uppercase font-black">{q.subject}</Badge>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{q.chapter}</span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-2 leading-relaxed">
                    {q.questionText}
                  </h4>
                  {q.type === 'mcq' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {q.options?.map((opt, i) => (
                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded-lg border ${i === q.correctAnswer ? 'bg-green-500/10 border-green-500/20 text-green-600 font-bold' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'}`}>
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-400 hover:text-blue-500" onClick={() => {
                    setNewQuestion(q);
                    setEditingQuestionId(q.id);
                    setIsAddingQuestion(true);
                  }}><Pencil size={18} /></Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-400 hover:text-red-500" onClick={() => {
                    handleDeleteQuestion(q.id);
                  }}><Trash2 size={18} /></Button>
                </div>
              </div>
            ))}
            {allQuestions.length === 0 && (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                  <Database size={40} />
                </div>
                <p className="text-zinc-500 font-bold">Your question bank is empty.</p>
              </div>
            )}
          </div>
        </div>
      ) : adminTab === 'leaderboards' ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto no-scrollbar">
            {['Class 6', 'Class 7', 'Class 8', 'Class 9-10', 'Class 11-12'].map(group => (
              <button
                key={group}
                onClick={() => setLeaderboardClassFilter(group as any)}
                className={`px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${leaderboardClassFilter === group ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
              >
                {group}
              </button>
            ))}
          </div>

          <Card className="rounded-[40px] border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
                  <Trophy size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Active Class Rankings</h3>
                  <p className="text-xs text-zinc-500">Ranking strictly by Score &gt; Time &gt; Early Submission.</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50/50 dark:bg-zinc-800/50">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Rank</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Student</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Exam</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Score</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Time</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {allLeaderboards
                    .filter(entry => getClassGroup(entry.class) === leaderboardClassFilter)
                    .sort((a, b) => {
                      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
                      if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
                      return a.firstSubmissionAt - b.firstSubmissionAt;
                    })
                    .map((entry, idx) => (
                      <tr key={`${entry.id}-${idx}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-zinc-300 text-zinc-700' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                              <img src={entry.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userName}`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-zinc-900 dark:text-white capitalize">{entry.userName}</p>
                              <p className="text-[10px] text-zinc-400 font-medium">Attempts: {entry.totalAttempts}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-medium text-zinc-500">{entry.examTitle}</td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-sm font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full">
                            {entry.bestScore}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-xs font-bold text-zinc-500 tabular-nums">
                            {Math.floor(entry.timeTaken / 60)}:{(entry.timeTaken % 60).toString().padStart(2, '0')}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                           <button 
                            onClick={async () => {
                              if (confirm('Delete this leaderboard entry?')) {
                                await deleteDoc(doc(db, 'leaderboards', entry.id));
                              }
                            }}
                            className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                           >
                             <Trash2 size={16} />
                           </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {allLeaderboards.filter(entry => getClassGroup(entry.class) === leaderboardClassFilter).length === 0 && (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                    <Trophy size={32} />
                  </div>
                  <p className="text-sm font-bold text-zinc-500">No participants ranked for {leaderboardClassFilter} yet.</p>
                </div>
              )}
            </div>
          </Card>
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

  const renderLeaderboard = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Active Leaderboard</h2>
          <p className="text-sm sm:text-base text-zinc-500 font-medium">Global rankings across all subjects and exams.</p>
        </div>
        <div className="flex items-center gap-2 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-1 bg-white/50 dark:bg-zinc-900/50">
          {['Class 6', 'Class 7', 'Class 8', 'Class 9-10', 'Class 11-12'].map(group => (
            <button
              key={group}
              onClick={() => setLeaderboardClassFilter(group as any)}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${leaderboardClassFilter === group ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      <Card className="rounded-[40px] border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
              <Trophy size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Active Rankings</h3>
              <p className="text-xs text-zinc-500">Ranking strictly by Score &gt; Time &gt; Early Submission.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Rank</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Student</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Exam</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Score</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-center">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {allLeaderboards
                .filter(entry => getClassGroup(entry.class) === leaderboardClassFilter)
                .sort((a, b) => {
                  if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
                  if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
                  return a.firstSubmissionAt - b.firstSubmissionAt;
                })
                .map((entry, idx) => (
                  <tr key={`${entry.id}-${idx}`} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group ${entry.userId === auth.currentUser?.uid ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''}`}>
                    <td className="px-8 py-5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-zinc-300 text-zinc-700' : idx === 2 ? 'bg-orange-300 text-orange-900' : (entry.userId === auth.currentUser?.uid ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500')}`}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          <img src={entry.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userName}`} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${entry.userId === auth.currentUser?.uid ? 'text-blue-600' : 'text-zinc-900 dark:text-white'} capitalize`}>{entry.userId === auth.currentUser?.uid ? (firestoreUser?.displayName || auth.currentUser?.displayName || entry.userName) : entry.userName} {entry.userId === auth.currentUser?.uid && '(You)'}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">Attempts: {entry.totalAttempts}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-zinc-500">{entry.examTitle}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="text-sm font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full">
                        {entry.bestScore}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <span className="text-xs font-bold text-zinc-500 tabular-nums">
                        {Math.floor(entry.timeTaken / 60)}:{(entry.timeTaken % 60).toString().padStart(2, '0')}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {allLeaderboards.filter(entry => getClassGroup(entry.class) === leaderboardClassFilter).length === 0 && (
            <div className="py-20 text-center space-y-3 font-medium">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <Trophy size={32} />
              </div>
              <p className="text-sm text-zinc-500">No participants ranked for {leaderboardClassFilter} yet.</p>
            </div>
          )}
        </div>
      </Card>
      
      <div className="bg-zinc-50 dark:bg-zinc-800/80 p-6 rounded-[32px] text-center border border-zinc-100 dark:border-zinc-800">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
           Ranking logic is strictly: Highest Score &gt; Lowest Time Taken &gt; Earliest First Submission
        </p>
      </div>
    </div>
  );

  const renderUserDashboard = () => (
    <div className="space-y-8">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-[24px] bg-zinc-100 dark:bg-zinc-800 overflow-hidden border-2 border-blue-500/20 relative group">
              <img 
                src={auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firestoreUser?.displayName || auth.currentUser?.displayName || 'User'}`} 
                alt="" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <UserIcon size={20} className="text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white">{firestoreUser?.displayName || auth.currentUser?.displayName || 'Student'}</h3>
                {userRole === 'admin' && <Badge className="bg-blue-500/10 text-blue-600 border-none scale-75 origin-left">Admin</Badge>}
              </div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{auth.currentUser?.email}</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full">
                  <GraduationCap size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{firestoreUser?.class || 'Class 9'}</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-700/50">
                  <Calendar size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{new Date(firestoreUser?.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            icon={Pencil} 
            className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/30"
            onClick={() => {
              setProfileFormData({ 
                displayName: firestoreUser?.displayName || auth.currentUser?.displayName || '', 
                academicClass: firestoreUser?.class || 'Class 9' 
              });
              setIsEditingProfile(true);
            }}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[40px] p-8 max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Edit Profile</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsEditingProfile(false)}><X size={20} /></Button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                    value={profileFormData.displayName}
                    onChange={e => setProfileFormData(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Academic Class</label>
                  <div className="relative">
                    <select
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-2xl px-6 py-4 text-sm font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm appearance-none cursor-pointer"
                      value={profileFormData.academicClass}
                      onChange={e => setProfileFormData(prev => ({ ...prev, academicClass: e.target.value as AcademicClass }))}
                    >
                      {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'General', 'Engineering Admission-science', 'Medical Admission-science', 'Varsity Admission-science', 'Varsity Admission-humanities', 'Varsity Admission-commerce'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                      <List size={16} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 rounded-2xl"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={isUpdatingProfile}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 rounded-2xl shadow-xl shadow-blue-500/20"
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">My Uploads</h2>
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
        {userContents.map((item, ucIdx) => (
          <div key={`uc-${item.id || ucIdx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
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
                      setActivePdf({ url: item.url, isRestricted: item.category === 'Practice Sheet' });
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
            {userPlaylists.map((playlist, upIdx) => (
              <div key={`up-${playlist.id || upIdx}`} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
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
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderExamResults = () => {
    if (!examResults || !activeExam) return null;
    
    const percentage = (examResults.score / examResults.maxScore) * 100;
    let feedback = "Need Improvement";
    let colorClass = "text-red-500";
    let bgClass = "bg-red-500/10";
    
    if (percentage >= 80) {
      feedback = "Excellent! You have mastered this topic.";
      colorClass = "text-green-500";
      bgClass = "bg-green-500/10";
    } else if (percentage >= 50) {
      feedback = "Good work! Keep practicing to improve further.";
      colorClass = "text-blue-500";
      bgClass = "bg-blue-500/10";
    }

    return (
      <div className="max-w-4xl mx-auto space-y-10 py-10">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <Trophy size={48} />
          </motion.div>
          <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Exam Completed!</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Great job on finishing the {activeExam.title}.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-8 text-center space-y-2">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Score</p>
            <h4 className="text-4xl font-black text-zinc-900 dark:text-white">{examResults.score} / {examResults.maxScore}</h4>
          </Card>
          <Card className="p-8 text-center space-y-2">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Percentage</p>
            <h4 className="text-4xl font-black text-zinc-900 dark:text-white">{Math.round(percentage)}%</h4>
          </Card>
          <Card className="p-8 text-center space-y-2">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Feedback</p>
            <div className={`px-4 py-2 rounded-xl text-xs font-bold ${bgClass} ${colorClass}`}>
              {feedback}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white px-2">Review Solutions</h3>
          {activeExam.questions.map((q, idx) => (
            <div key={q.id}>
              <Card className="p-8 space-y-4 border-l-4 border-l-blue-500">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-2 py-0.5 text-[8px] uppercase font-black">{q.class}</Badge>
                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 border-none px-2 py-0.5 text-[8px] uppercase font-black">{q.subject}</Badge>
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{q.chapter}</span>
                    </div>
                    <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{q.questionText}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge className={examResults.answers[idx] === q.correctAnswer ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                      {q.type === 'mcq' ? (examResults.answers[idx] === q.correctAnswer ? 'Correct' : 'Incorrect') : 'Completed'}
                    </Badge>
                  </div>
                </div>

                {q.type === 'mcq' && q.options && (
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, oIdx) => {
                      const isUserSelected = examResults.answers[idx] === oIdx;
                      const isCorrect = q.correctAnswer === oIdx;
                      let borderClass = "border-zinc-200 dark:border-zinc-800";
                      let bgClassOption = "";
                      
                      if (isCorrect) {
                        borderClass = "border-green-500";
                        bgClassOption = "bg-green-500/5";
                      } else if (isUserSelected && !isCorrect) {
                        borderClass = "border-red-500";
                        bgClassOption = "bg-red-500/5";
                      }

                      return (
                        <div key={oIdx} className={`p-4 rounded-2xl border ${borderClass} ${bgClassOption} flex items-center justify-between`}>
                          <span className="text-sm font-medium">{opt}</span>
                          {isCorrect && <CheckCircle2 size={16} className="text-green-500" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === 'written' && (
                  <div className="space-y-2">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest underline decoration-blue-500 underline-offset-4">Your Answer:</p>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl text-sm italic text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      {examResults.answers[idx] || "No answer provided."}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-10">
          <Button onClick={() => setView('home')} size="lg" icon={Home} className="rounded-full px-12">
            Back to Home
          </Button>
        </div>
      </div>
    );
  };

  const renderExamMode = () => {
    if (!activeExam) {
      const subjects = ['All', ...STANDARD_SUBJECTS];
      const classes = ['All', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'General', 'Engineering Admission-science', 'Medical Admission-science', 'Varsity Admission-science', 'Varsity Admission-humanities', 'Varsity Admission-commerce'];

      const filteredExams = allExams.filter(exam => {
        const matchesSubject = examSubjectFilter === 'All' || exam.subject === examSubjectFilter;
        const matchesClass = examClassFilter === 'All' || exam.class === examClassFilter;
        const matchesChapter = !examChapterFilter || examChapterFilter === 'All' || (exam.chapter || '').toLowerCase() === examChapterFilter.toLowerCase();
        return matchesSubject && matchesClass && matchesChapter;
      });

      return (
        <div className="max-w-6xl mx-auto py-10 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">Mock Exam Center</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">Challenge yourself with our curated exams. Test your knowledge, improve your timing, and get instant feedback.</p>
          </div>

          {/* Exam Filters */}
          <Card className="p-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-3xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-[40px] shadow-sm space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Select Subject</label>
                <Badge className="bg-blue-500/10 text-blue-600 border-none">{examSubjectFilter}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      setExamSubjectFilter(s);
                      setExamChapterFilter('All');
                    }}
                    className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                      examSubjectFilter === s 
                      ? 'bg-blue-600 text-white shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] scale-105' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Academic Class</label>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-none">{examClassFilter}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {classes.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      setExamClassFilter(c as AcademicClass | 'All');
                      setExamChapterFilter('All');
                    }}
                    className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                      examClassFilter === c 
                      ? 'bg-indigo-600 text-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] scale-105' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">Available Chapters</label>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none">{examChapterFilter || 'All'}</Badge>
              </div>
              {chapters.length > 1 ? (
                <div className="flex flex-wrap gap-2">
                  {chapters.map(ch => (
                    <button
                      key={ch}
                      onClick={() => setExamChapterFilter(ch)}
                      className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                        (examChapterFilter === ch || (ch === 'All' && !examChapterFilter))
                        ? 'bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.4)] scale-105' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic ml-2">No specific chapters found for this selection.</p>
              )}
            </div>

            <div className="pt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50">
               <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                 <ClipboardList size={18} />
                 <span>{filteredExams.length} Exams Found</span>
               </div>
               <Button 
                 variant="ghost" 
                 size="sm" 
                 disabled={examClassFilter === 'All' && examSubjectFilter === 'All' && !examChapterFilter}
                 onClick={() => {
                   setExamClassFilter('All');
                   setExamSubjectFilter('All');
                   setExamChapterFilter('All');
                 }}
                 className="text-[10px]"
                 icon={RefreshCw}
               >
                 Reset Filters
               </Button>
            </div>
          </Card>
          
          {filteredExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredExams.map((exam, feIdx) => (
                <div key={exam.id || `exam-${feIdx}`}>
                  <Card className="p-8 space-y-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all border border-zinc-200/50 dark:border-zinc-800/50 hover:border-blue-500/30 group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                        <ClipboardList size={24} />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge>{exam.timeLimit} Min</Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold text-zinc-900 dark:text-white line-clamp-1">{exam.title}</h4>
                      <p className="text-sm text-zinc-500 line-clamp-2">{exam.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{exam.class}</Badge>
                      <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{exam.subject}</Badge>
                    </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      className="rounded-2xl flex-1 h-12 bg-blue-600 hover:bg-blue-700" 
                      onClick={() => handleStartExam(exam)} 
                      icon={Play}
                    >
                      Start Exam
                    </Button>
                      <Button 
                        variant="outline" 
                        className="rounded-2xl flex-1 h-12 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800" 
                        onClick={() => setLeaderboardExamId(exam.id)}
                        icon={Trophy}
                      >
                        Rankings
                      </Button>
                      <Button 
                        variant="outline" 
                        className="rounded-2xl w-12 h-12 p-0 border-zinc-200" 
                        onClick={() => setExamPrep(exam)}
                      >
                        <Settings size={18} />
                      </Button>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white">No exams found</h3>
              <p className="text-zinc-500">Try adjusting your filters to find more exams.</p>
              <Button variant="outline" onClick={() => { setExamSubjectFilter('All'); setExamClassFilter('All'); }}>Clear All Filters</Button>
            </div>
          )}
        </div>
      );
    }

    if (examResults) return renderExamResults();

    const questions = (activeExam as any).questions || [];
    const answeredCount = questions.filter((q: any) => examAnswers[q.id] !== undefined && examAnswers[q.id] !== '').length;

    return (
      <div className="max-w-4xl mx-auto py-6 space-y-8 min-h-[60vh] flex flex-col">
        {/* Header with Timer */}
        <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-6 rounded-[24px] border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
              <Timer size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Time Remaining</p>
              <h4 className={`text-2xl font-black tracking-tight ${examTimeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-zinc-900 dark:text-white'}`}>
                {formatTime(examTimeLeft)}
              </h4>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Progress</p>
            <h4 className="text-xl font-black text-zinc-900 dark:text-white">Answered {answeredCount} / {questions.length}</h4>
          </div>
          <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/5 px-6 rounded-xl" onClick={handleExamSubmit}>
            Finish & Submit
          </Button>
        </div>

        {/* Question List Area */}
        <div className="space-y-12 py-10">
          {questions.map((q: any, idx: number) => (
            <div 
              key={q.id}
              className="w-full max-w-3xl mx-auto space-y-8 pb-12 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
            >
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-600 text-white px-4 py-1">Question {idx + 1}</Badge>
                  {examAnswers[q.id] !== undefined && examAnswers[q.id] !== '' && (
                    <Badge className="bg-green-500/10 text-green-600 border-none">Answered</Badge>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{q.questionText}</h3>
              </div>

              <div className="space-y-3">
                {q.type === 'mcq' && q.options ? (
                  <div className="grid grid-cols-1 gap-3">
                    {q.options.map((option: string, optIdx: number) => (
                      <button
                        key={optIdx}
                        onClick={() => handleExamAnswer(q.id, optIdx)}
                        className={`p-4 rounded-[20px] border-2 text-left transition-all duration-300 flex items-center gap-4 group ${
                          examAnswers[q.id] === optIdx
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-600/10 shadow-lg shadow-blue-500/5 scale-[1.01]'
                          : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-200 dark:hover:border-blue-800'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${
                          examAnswers[q.id] === optIdx ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <span className={`text-base font-bold transition-colors ${
                          examAnswers[q.id] === optIdx ? 'text-blue-600' : 'text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'
                        }`}>
                          {option}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      rows={4}
                      className="w-full bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[24px] p-6 outline-none focus:border-blue-600 transition-all text-base leading-relaxed dark:text-white"
                      placeholder="Write your answer here..."
                      value={(examAnswers[q.id] as string) || ''}
                      onChange={(e) => handleExamAnswer(q.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Final Submit Button at bottom */}
        <div className="flex flex-col items-center justify-center pt-8 pb-20 border-t border-zinc-200/50 dark:border-zinc-800/50 space-y-4">
          <p className="text-zinc-500 text-sm font-medium">Have you reviewed all your answers?</p>
          <Button onClick={handleExamSubmit} size="lg" className="rounded-2xl px-16 shadow-xl shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 h-14">
            Finish & Submit Exam
          </Button>
        </div>
      </div>
    );
  };

  const renderHome = () => (
    <div className="space-y-10">
      {/* Hero Section */}
      {!selectedCategory && (
        <section 
          className="relative py-16 overflow-hidden rounded-[40px] shadow-2xl"
          style={{ background: 'linear-gradient(90deg, #5de0e6, #004aad)' }}
        >
          {/* Animated Background Elements */}
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-palette/30 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary-palette/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="max-w-3xl mx-auto px-8 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="bg-white/20 text-white border border-white/20 mb-8 py-2 px-5 text-[11px] backdrop-blur-md">
                ✨ Made for Bangladeshi Students
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white mb-6 sm:mb-8 leading-[1.1] tracking-tight">
                Free Study Materials<br />
                <span className="text-white drop-shadow-sm">For Every Student</span> 📚
              </h2>
              <p className="text-white/90 text-base sm:text-lg mb-8 sm:mb-12 max-w-xl mx-auto leading-relaxed font-medium">
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
                      <div className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">{stat.label}</div>
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
        {/* Featured Exams Section */}
        <section id="exams-section" className="space-y-8 group/section relative">
          <div className="absolute top-2 right-4 sm:right-12 pointer-events-none">
            <div className="pointer-events-auto">
              <MiniRobot />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
                <ClipboardList size={24} />
              </div>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Featured Mock Exams</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1 mr-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                  onClick={() => scrollContainer("scroll-exams", 'left')}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-800 opacity-0 group-hover/section:opacity-100 transition-opacity"
                  onClick={() => scrollContainer("scroll-exams", 'right')}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
              <Button variant="ghost" className="text-blue-600 hover:bg-blue-50" onClick={() => setView('exam')}>View All <ChevronRight size={16} className="ml-1" /></Button>
            </div>
          </div>
          <div id="scroll-exams" className="flex overflow-x-auto pb-6 sm:pb-2 gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth">
            {allExams.slice(0, 10).map((exam, aeIdx) => (
              <div key={`home-exam-${exam.id || aeIdx}`} className="min-w-[300px] w-[300px] snap-start">
                <Card className="p-8 h-full flex flex-col space-y-4 hover:shadow-xl transition-all group">
                  <div className="flex items-center gap-4">
                    <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{exam.subject}</Badge>
                    <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400">{exam.class}</Badge>
                    <span className="text-xs font-bold text-zinc-400 group-hover:text-indigo-400 transition-colors uppercase tracking-widest">{exam.timeLimit} Min</span>
                  </div>
                  <h4 className="text-lg font-bold text-zinc-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">{exam.title}</h4>
                  <p className="text-sm text-zinc-500 line-clamp-2">{exam.description}</p>
                  <div className="flex justify-end pt-2 mt-auto">
                    <Button size="sm" onClick={() => setExamPrep(exam)} className="rounded-xl px-6 bg-indigo-600 shadow-lg shadow-indigo-500/20">Take Test</Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </section>
        {renderSection('Notes', 'Notes', <FileText className="text-blue-600" size={24} />, 'Add Note', 'notes-section')}
        {renderSection('Practice Sheets', 'Practice Sheet', <FileText className="text-orange-600" size={24} />, 'Add Practice Sheet', 'practice-section')}
        {renderSection('Books PDF', 'Books', <BookOpen className="text-green-600" size={24} />, 'Add Book', 'books-section')}
        {renderSection('Recent Question Papers', 'Question Papers', <History className="text-purple-600" size={24} />, 'Add Paper', 'papers-section')}
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
          {filteredContents.map((content, fcIdx) => {
            const card = renderContentCard(content);
            // Properly clone with index-based key to prevent collisions during filtering
            return React.cloneElement(card as React.ReactElement, {
              key: content.id + '-' + fcIdx
            });
          })}
        </AnimatePresence>
      </div>
    </div>
  );

  const handleNewsletter = async (e: FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    
    try {
      await addDoc(collection(db, 'newsletter_subscribers'), {
        email: newsletterEmail,
        subscribedAt: serverTimestamp()
      });
      setIsSubscribed(true);
      setNewsletterEmail('');
      setTimeout(() => setIsSubscribed(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'newsletter_subscribers', setGlobalError);
    }
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
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-white tracking-tighter">Parodorshhi</h2>
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
                        document.getElementById('practice-section')?.scrollIntoView({ behavior: 'smooth' });
                        triggerHighlight('practice-section');
                      }, 100);
                    } else {
                      document.getElementById('practice-section')?.scrollIntoView({ behavior: 'smooth' });
                      triggerHighlight('practice-section');
                    }
                  }} 
                  className="hover:text-white transition-colors text-left"
                >
                  Practice Sheets
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
              <li>
                <button 
                  onClick={() => { 
                    setSearchQuery('');
                    setView('exam');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                  className="hover:text-white transition-colors text-left"
                >
                  Mock Exam Center
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
          <p>© 2026 Parodorshhi. All rights reserved.</p>
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

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    console.log(`[STORAGE] Using STABLE mode for ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
    
    if (!auth.currentUser) throw new Error("Authentication required for upload.");

    // Sanitization
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const storageRef = ref(storage, `${folder}/${Date.now()}_${cleanName}`);
    
    setUploadProgress(5); // Show connection started
    
    try {
      // Using uploadBytes (POST) instead of uploadBytesResumable (PUT/Conversational)
      // This is often more reliable in restrictive proxy environments
      const snapshot = await uploadBytes(storageRef, file);
      setUploadProgress(95); 
      console.log(`[STORAGE] Upload success, finalizing...`);
      const url = await getDownloadURL(snapshot.ref);
      setUploadProgress(100);
      return url;
    } catch (error: any) {
      console.error(`[STORAGE] Upload failed:`, error.code, error.message);
      let msg = error.message;
      if (error.code === 'storage/unauthorized') msg = "Storage permission denied. Please try logging out and in again.";
      throw new Error(msg);
    }
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
        finalUrl = await uploadFile(selectedFiles.resource, 'resources');
      } else if (newItem.category === 'YouTube Classes' && finalUrl) {
        finalUrl = getYouTubeId(finalUrl);
      }

      // Upload Thumbnail if exists
      if (selectedFiles.thumbnail) {
        finalThumbnail = await uploadFile(selectedFiles.thumbnail, 'thumbnails');
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
          chapter: newItem.chapter || '',
          updatedAt: Date.now()
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
          chapter: newItem.chapter || '',
          authorId: user.uid,
          authorEmail: user.email,
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
      
      // Show success message or trigger notification if you had one
      setGlobalError(null); 
    } catch (error: any) {
      console.error("Full upload error object:", error);
      let errorMessage = error.message || "Failed to save content.";
      if (error.code === 'storage/unauthorized') {
        errorMessage = "Permission denied: Firebase Storage rules are blocking this upload. Please check your storage rules.";
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = "Storage quota exceeded. Please try again later.";
      }
      setUploadError(errorMessage);
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
        setIsUploading(true);
        setUploadProgress(0);
        finalThumbnail = await uploadFile(selectedFiles.thumbnail, 'thumbnails');
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
        chapter: newPlaylist.chapter || '',
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
    const playlist = allPlaylists.find(p => p.id === id) || userPlaylists.find(p => p.id === id);
    if (!playlist) return;
    
    // Check if admin or owner
    if (userRole !== 'admin' && playlist.authorId !== user?.uid) return;
    
    setDeletingId(id);
  };

  const confirmDeletePlaylist = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setUploadError(null);
    try {
      await deleteDoc(doc(db, 'playlists', deletingId));
      setDeletingId(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `playlists/${deletingId}`, setGlobalError);
      setUploadError("Failed to delete playlist. " + (error.message || "Please try again."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteQuestion = async (id: string, bankId?: string) => {
    if (userRole !== 'admin') return;
    setDeletingId(id);
    setDeleteBankId(bankId || 'global');
    setUploadError(null);
  };

  const confirmDeleteQuestion = async () => {
    if (!deletingId || !deleteBankId) return;
    setIsDeleting(true);
    try {
      if (deleteBankId === 'temp') {
        setTemporaryQuestions(prev => prev.filter(q => q.id !== deletingId));
      } else {
        const path = deleteBankId === 'global' 
          ? doc(db, 'questions', deletingId) 
          : doc(db, 'exams', deleteBankId, 'questions', deletingId);
        await deleteDoc(path);
      }
      setDeletingId(null);
      setDeleteBankId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `questions/${deletingId}`, setGlobalError);
    } finally {
      setIsDeleting(false);
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
    const content = allContents.find(c => c.id === id) || userContents.find(c => c.id === id);
    if (!content) return;
    
    // Check if admin or owner
    if (userRole !== 'admin' && content.authorId !== user?.uid) return;
    
    setDeletingId(id);
    setUploadError(null);
  };

  const confirmDeleteContent = async (id: string) => {
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
    
    // If it's already a data URL, return as is
    if (url.startsWith('data:')) return url;

    try {
      const urlObj = new URL(url);
      
      // Handle Google Drive links
      if (urlObj.hostname.includes('drive.google.com')) {
        const fileId = urlObj.searchParams.get('id') || urlObj.pathname.split('/d/')[1]?.split('/')[0];
        if (fileId) {
          return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
      }

      // Handle Google Image search result URLs (imgres)
      if (urlObj.hostname.includes('google.') && urlObj.pathname.includes('imgres')) {
        const imgUrl = urlObj.searchParams.get('imgurl');
        if (imgUrl) return decodeURIComponent(imgUrl);
      }

      // Handle Google Redirector URLs
      if (urlObj.hostname.includes('google.') && urlObj.pathname.includes('url')) {
        const urlParam = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
        if (urlParam) return decodeURIComponent(urlParam);
      }

      // Handle Google User Content - ensure high res
      if (urlObj.hostname.includes('googleusercontent.com')) {
        // Remove existing size parameters and force s1600
        const baseUrl = url.split('=')[0];
        return `${baseUrl}=s1600-rw`; // -rw for webp if supported, s1600 for original size
      }

      // Handle common image hosting wrappers (like postimg/imgur if they copy the page instead of image)
      // This is harder but common patterns can be added here if needed.

    } catch (e) {
      // Not a valid URL
    }
    return url;
  };

  const handleAddExam = async () => {
    if (userRole !== 'admin') return;
    if (!newExam.title || !newExam.subject) {
      setGlobalError("Title and Subject are required.");
      return;
    }

    setIsUploading(true);
    try {
      const examData = {
        title: newExam.title,
        class: newExam.class,
        subject: newExam.subject,
        chapter: newExam.chapter || '',
        chapterNameCustom: newExam.chapterNameCustom || '',
        examType: newExam.examType || 'mcq',
        totalQuestionsToShow: newExam.totalQuestionsToShow || 30,
        negativeMarking: newExam.negativeMarking || false,
        negativeValue: newExam.negativeValue || 0.25,
        createdBy: user?.uid || 'system',
        status: newExam.status || 'approved',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      let examId = editingExamId;

      if (editingExamId) {
        await setDoc(doc(db, 'exams', editingExamId), {
          ...examData,
          updatedAt: Date.now()
        }, { merge: true });
      } else {
        const docRef = await addDoc(collection(db, 'exams'), examData);
        examId = docRef.id;
        await setDoc(docRef, { id: docRef.id }, { merge: true });
        
        // Save temporary questions to the new exam's subcollection
        for (const q of temporaryQuestions) {
          const { id, ...qNoId } = q; // don't save the temp random id
          const qRef = await addDoc(collection(db, 'exams', examId, 'questions'), {
            ...qNoId,
            examId: examId,
            createdAt: Date.now()
          });
          await setDoc(qRef, { id: qRef.id }, { merge: true });
        }
      }

      setIsAddingExam(false);
      setEditingExamId(null);
      setTemporaryQuestions([]);
      setNewExam({
        title: '',
        class: 'Class 9',
        subject: 'Math',
        chapter: '',
        chapterNameCustom: '',
        examType: 'mcq',
        totalQuestionsToShow: 30,
        negativeMarking: false,
        negativeValue: 0.25,
        status: 'approved'
      });
    } catch (error: any) {
      setGlobalError(error.message || "Failed to save exam.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (userRole !== 'admin') return;
    if (!newQuestion.questionText) {
      setGlobalError("Question text is required.");
      return;
    }

    setIsUploading(true);
    try {
      const qData = {
        ...newQuestion,
        createdAt: Date.now()
      };

      if (editingExamId) {
        // Saving directly to exam subcollection
        if (editingQuestionId) {
          await setDoc(doc(db, 'exams', editingExamId, 'questions', editingQuestionId), {
            ...qData,
            examId: editingExamId,
            updatedAt: Date.now()
          }, { merge: true });
        } else {
          const docRef = await addDoc(collection(db, 'exams', editingExamId, 'questions'), {
            ...qData,
            examId: editingExamId
          });
          await setDoc(docRef, { id: docRef.id }, { merge: true });
        }
      } else if (isAddingExam) {
        // Adding to temporary list while creating a new exam
        if (editingQuestionId) {
          setTemporaryQuestions(prev => prev.map(q => q.id === editingQuestionId ? { ...q, ...qData } as any : q));
        } else {
          const tempId = Math.random().toString(36).substring(7);
          setTemporaryQuestions(prev => [...prev, { ...qData, id: tempId } as any]);
        }
      } else {
        // Global bank (from the main Questions tab)
        if (editingQuestionId) {
          await setDoc(doc(db, 'questions', editingQuestionId), {
            ...qData,
            updatedAt: Date.now()
          }, { merge: true });
        } else {
          const docRef = await addDoc(collection(db, 'questions'), qData);
          await setDoc(docRef, { id: docRef.id }, { merge: true });
        }
      }

      setIsAddingQuestion(false);
      setEditingQuestionId(null);
      setNewQuestion({
        type: 'mcq',
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        points: 1,
        class: newExam.class,
        subject: newExam.subject,
        chapter: newExam.chapter
      });
    } catch (error: any) {
      console.error(error);
      setGlobalError("Failed to save question.");
    } finally {
      setIsUploading(false);
    }
  };
  const handleAddExternal = async () => {
    if (userRole !== 'admin') return;
    if (!newExternal.title || !newExternal.url) {
      setGlobalError("Title and URL are required.");
      return;
    }

    setIsUploadingExternal(true);
    setUploadProgress(0);
    try {
      let finalThumbnail = getDirectImageUrl(newExternal.thumbnail || '');

      if (externalThumbnailFile) {
        finalThumbnail = await uploadFile(externalThumbnailFile, 'external_thumbnails');
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
    setUploadError(null);
  };

  const confirmDeleteExternal = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'external_resources', deletingId));
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `external_resources/${deletingId}`, setGlobalError);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl animate-bounce">P</div>
          <div className="flex items-center gap-2">
            <RefreshCcw className="animate-spin text-blue-600" size={20} />
            <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase">Initializing Parodorshhi...</span>
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
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-full flex items-center justify-between gap-4 sm:gap-12 relative">
          <div className="flex items-center shrink-0 h-full relative group">
            <img 
              src="/api/v1/files/input_file_0.png" 
              alt="Brand" 
              className="h-10 sm:h-14 w-auto block object-contain relative z-10"
              referrerPolicy="no-referrer"
              loading="eager"
            />
            {/* Fallback indicator if image is completely transparent/failing */}
            <div className="absolute inset-0 bg-white/5 rounded-lg -z-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

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
                    {suggestions.map((item, sIdx) => (
                      <button
                        key={`${item.id}-${sIdx}`}
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
              <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  onBlur={() => setTimeout(() => setIsUserMenuOpen(false), 200)}
                  className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${isUserMenuOpen ? 'border-blue-500 scale-95' : 'border-blue-500/20 hover:border-blue-500'}`}
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <UserIcon size={20} />
                    </div>
                  )}
                </button>
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full pt-2 z-50 transition-all"
                    >
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 min-w-[200px]">
                        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 mb-1">
                          <p className="text-xs font-black text-zinc-900 dark:text-white leading-none mb-1">{user.displayName}</p>
                          <Badge className="bg-blue-500/10 text-blue-500 border-none text-[9px] py-0.5 uppercase tracking-widest">{userRole}</Badge>
                        </div>
                        <button 
                          onClick={() => { setView('dashboard'); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                          <Monitor size={18} />
                          My Dashboard
                        </button>
                        <button 
                          onClick={() => { setView('leaderboard'); setIsUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                          <Trophy size={18} />
                          Leaderboard
                        </button>
                        {userRole === 'admin' && (
                          <button 
                            onClick={() => { setView('admin'); setIsUserMenuOpen(false); }}
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
                    </motion.div>
                  )}
                </AnimatePresence>
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
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl" onClick={handleBack}><ChevronLeft size={16} /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl" onClick={handleForward}><ChevronRight size={16} /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl" onClick={resetToHome}><Home size={16} /></Button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 rounded-2xl text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm shrink-0">
              <GraduationCap size={16} className="text-blue-500" strokeWidth={2.5} />
              <span className="tracking-tight whitespace-nowrap">Parodorshhi › {view === 'home' ? 'Home' : view === 'saved' ? 'Saved' : view === 'admin' ? 'Admin Portal' : view === 'dashboard' ? 'My Dashboard' : view === 'leaderboard' ? 'Leaderboard' : view === 'exam' ? (activeExam ? 'Taking Exam' : 'Exam Center') : selectedCategory}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            <Button 
              variant="outline" 
              size="sm" 
              icon={ClipboardList} 
              className={`h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none shadow-sm shrink-0 font-bold ${view === 'exam' ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300'}`} 
              onClick={() => { setView('exam'); setActiveExam(null); }}
            >
              Exam Center
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={Bookmark} 
              className={`h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none shadow-sm shrink-0 font-bold ${view === 'saved' ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300'}`} 
              onClick={() => setView('saved')}
            >
              Saved
            </Button>
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
              icon={FileText} 
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 border-none bg-white dark:bg-zinc-900 shadow-sm shrink-0" 
              onClick={() => { 
                setSearchQuery('');
                if (view !== 'home') {
                  setView('home');
                  setTimeout(() => {
                    document.getElementById('practice-section')?.scrollIntoView({ behavior: 'smooth' });
                    triggerHighlight('practice-section');
                  }, 100);
                } else {
                  document.getElementById('practice-section')?.scrollIntoView({ behavior: 'smooth' });
                  triggerHighlight('practice-section');
                }
              }}
            >
              Sheets
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
         view === 'leaderboard' ? renderLeaderboard() :
         view === 'admin' ? renderAdminPortal() :
         view === 'dashboard' ? renderUserDashboard() :
         view === 'exam' ? renderExamMode() : (
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
                  setSelectedFiles({});
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
                    <option value="Practice Sheet">Practice Sheet</option>
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
                  {STANDARD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter</label>
                <input 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                  placeholder="e.g. Chapter 1 or All Chapters"
                  value={newItem.chapter || ''}
                  onChange={e => setNewItem({...newItem, chapter: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Thumbnail</label>
                <div className="space-y-3">
                  <div 
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full aspect-video bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors overflow-hidden group relative"
                  >
                    {newItem.thumbnail ? (
                      <>
                        <img src={getDirectImageUrl(newItem.thumbnail)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
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
                  <p className="text-[10px] text-zinc-400 mt-1 italic">
                    Hint: Use 'Copy image address' for Google images for best results.
                  </p>
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

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    <span>{uploadProgress === 0 ? `Connecting (${(selectedFiles.resource?.size || 0) / (1024*1024) > 10 ? 'Large File' : 'Sending'})...` : `Uploading ${selectedFiles.resource ? 'Resource' : 'Thumbnail'}...`}</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-zinc-400">Stable Mode: Enabled</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(uploadProgress, 2)}%` }}
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
                  setSelectedFiles({});
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

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter</label>
                <input 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                  placeholder="e.g. Chapter 5: Trigonometry"
                  value={newPlaylist.chapter || ''}
                  onChange={e => setNewPlaylist({...newPlaylist, chapter: e.target.value})}
                />
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
                    {newPlaylist.thumbnail ? (
                      <>
                        <img src={getDirectImageUrl(newPlaylist.thumbnail)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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

        {isAddingQuestion && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-2xl w-full shadow-2xl space-y-6 relative my-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    {editingQuestionId ? 'Edit Question' : 'Add New Question'}
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium">Add questions to your global question bank.</p>
                </div>
                <button 
                  onClick={() => { 
                    setIsAddingQuestion(false); 
                    setEditingQuestionId(null);
                  }}
                  className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Class</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                    value={newQuestion.class}
                    onChange={e => setNewQuestion({...newQuestion, class: e.target.value as AcademicClass})}
                  >
                    {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Subject</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                    value={newQuestion.subject || ''}
                    onChange={e => setNewQuestion({...newQuestion, subject: e.target.value})}
                  >
                    <option value="">Select Subject</option>
                    {STANDARD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter</label>
                  <input 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                    placeholder="e.g., Chapter 1: Sets"
                    value={newQuestion.chapter || ''}
                    onChange={e => setNewQuestion({...newQuestion, chapter: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Question Type</label>
                  <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <button 
                      onClick={() => setNewQuestion({...newQuestion, type: 'mcq'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newQuestion.type === 'mcq' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500'}`}
                    >
                      MCQ
                    </button>
                    <button 
                      onClick={() => setNewQuestion({...newQuestion, type: 'written'})}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newQuestion.type === 'written' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Written
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Question Text</label>
                <textarea 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm h-32"
                  placeholder="Enter the question..."
                  value={newQuestion.questionText || ''}
                  onChange={e => setNewQuestion({...newQuestion, questionText: e.target.value})}
                />
              </div>

              {newQuestion.type === 'mcq' && (
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Options & Correct Answer</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {newQuestion.options?.map((opt, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${newQuestion.correctAnswer === idx ? 'bg-green-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <input 
                            className={`flex-1 bg-zinc-50 dark:bg-zinc-800 border p-3 rounded-xl outline-none dark:text-white text-sm ${newQuestion.correctAnswer === idx ? 'border-green-500/50 ring-1 ring-green-500/20' : 'border-zinc-200 dark:border-zinc-700'}`}
                            value={opt}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                            onChange={e => {
                              const opts = [...(newQuestion.options || [])];
                              opts[idx] = e.target.value;
                              setNewQuestion({...newQuestion, options: opts});
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => setNewQuestion({...newQuestion, correctAnswer: idx})}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${newQuestion.correctAnswer === idx ? 'bg-green-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-green-500'}`}
                          >
                            <Check size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4">
                <Button 
                  className="flex-1 py-4 bg-blue-600" 
                  icon={Save} 
                  onClick={handleAddQuestion}
                  disabled={isUploading}
                >
                  {editingQuestionId ? 'Update Question' : 'Save to Bank'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {leaderboardExamId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50"
             >
               <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-500/5 dark:to-zinc-900">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20">
                     <Trophy size={28} />
                   </div>
                   <div>
                     <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Exam Leaderboard</h3>
                     <p className="text-xs text-zinc-500">Class {getClassGroup(firestoreUser?.class || 'Class 9')} Group • Top Performers</p>
                   </div>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => setLeaderboardExamId(null)} className="rounded-xl"><X size={20} /></Button>
               </div>

               <div className="max-h-[60vh] overflow-y-auto no-scrollbar">
                 <div className="p-6 space-y-3">
                   {allLeaderboards
                    .filter(e => e.examId === leaderboardExamId && getClassGroup(e.class) === getClassGroup(firestoreUser?.class || 'Class 9'))
                    .sort((a, b) => {
                      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
                      if (a.timeTaken !== b.timeTaken) return a.timeTaken - b.timeTaken;
                      return a.firstSubmissionAt - b.firstSubmissionAt;
                    })
                    .slice(0, 50)
                    .map((entry, idx) => (
                      <div 
                        key={`${entry.id}-${idx}`} 
                        className={`flex items-center gap-4 p-4 rounded-3xl transition-all border ${entry.userId === auth.currentUser?.uid ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'}`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-zinc-300 text-zinc-700' : idx === 2 ? 'bg-orange-300 text-orange-900' : (entry.userId === auth.currentUser?.uid ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500')}`}>
                          {idx + 1}
                        </div>
                        <img 
                          src={entry.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.userName}`} 
                          className="w-10 h-10 rounded-2xl object-cover bg-white" 
                          alt="" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-sm">{entry.userName}</p>
                          <p className={`text-[10px] ${entry.userId === auth.currentUser?.uid ? 'text-indigo-100' : 'text-zinc-400'}`}>
                            {entry.totalAttempts} Attempts • Class {entry.class}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-sm">{entry.bestScore}</p>
                          <p className={`text-[10px] tabular-nums ${entry.userId === auth.currentUser?.uid ? 'text-indigo-100' : 'text-zinc-400'}`}>
                            {Math.floor(entry.timeTaken / 60)}:{(entry.timeTaken % 60).toString().padStart(2, '0')}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {allLeaderboards.filter(e => e.examId === leaderboardExamId && getClassGroup(e.class) === getClassGroup(firestoreUser?.class || 'Class 9')).length === 0 && (
                      <div className="py-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                          <Trophy size={32} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-zinc-900 dark:text-white">No rankings yet</p>
                          <p className="text-xs text-zinc-500">Be the first to participate in this exam!</p>
                        </div>
                      </div>
                    )}
                 </div>
               </div>
               
               <div className="p-6 bg-zinc-50 dark:bg-zinc-800/80 border-t border-zinc-100 dark:border-zinc-800 text-center">
                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                   RANKING PRIORITY: HIGH SCORE &gt; LOWEST TIME &gt; EARLIEST SUBMISSION
                 </p>
               </div>
             </motion.div>
          </div>
        )}
        {isAddingExam && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 max-w-4xl w-full shadow-2xl space-y-6 relative my-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    {editingExamId ? 'Edit Exam' : 'Create Scalable Exam'}
                  </h3>
                  <p className="text-sm text-zinc-500 font-medium">Define rules and metadata for the online test.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { 
                  setIsAddingExam(false); 
                  setEditingExamId(null);
                }} className="rounded-xl"><X size={20} /></Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                       Identification
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Exam Title</label>
                      <input 
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white font-bold"
                        placeholder="e.g. Physics Chapter 3 Mock"
                        value={newExam.title || ''}
                        onChange={e => setNewExam({...newExam, title: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Class</label>
                        <select 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm"
                          value={newExam.class}
                          onChange={e => setNewExam({...newExam, class: e.target.value as AcademicClass})}
                        >
                          {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Subject</label>
                        <select 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm"
                          value={newExam.subject}
                          onChange={e => setNewExam({...newExam, subject: e.target.value})}
                        >
                          <option value="">Select Subject</option>
                          {STANDARD_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Standard Chapter</label>
                        <input 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm"
                          placeholder="e.g. Chapter 1"
                          value={newExam.chapter || ''}
                          onChange={e => setNewExam({...newExam, chapter: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter Name Custom</label>
                        <input 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm"
                          placeholder="e.g. Vector & Mechanics"
                          value={newExam.chapterNameCustom || ''}
                          onChange={e => setNewExam({...newExam, chapterNameCustom: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                       Logic & Scoring
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1 text-green-600">Exam Type</label>
                        <select 
                          className="w-full bg-green-50/50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-4 rounded-2xl outline-none dark:text-white font-bold"
                          value={newExam.examType}
                          onChange={e => setNewExam({...newExam, examType: e.target.value as any})}
                        >
                          <option value="mcq">MCQ (Auto-Graded)</option>
                          <option value="written">Written</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Time Limit (Min)</label>
                        <input 
                          type="number"
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white font-bold text-center"
                          value={newExam.timeLimit || 30}
                          onChange={e => setNewExam({...newExam, timeLimit: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white">Enable Negative Marking</p>
                          <p className="text-[10px] text-zinc-500">Penalty for wrong answers</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setNewExam({...newExam, negativeMarking: !newExam.negativeMarking})}
                          className={`w-12 h-6 rounded-full transition-colors relative ${newExam.negativeMarking ? 'bg-red-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newExam.negativeMarking ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>
                      
                      {newExam.negativeMarking && (
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-red-500 uppercase">Penalty Value</span>
                          <input 
                            type="number"
                            step="0.05"
                            className="w-24 bg-white dark:bg-zinc-900 border border-red-500/30 p-2 rounded-lg outline-none text-right font-black"
                            value={newExam.negativeValue || 0.25}
                            onChange={e => setNewExam({...newExam, negativeValue: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-[32px] border border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                       Randomized Question Logic
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Question Display Count</label>
                      <input 
                        type="number"
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white font-black text-2xl text-indigo-600"
                        value={newExam.totalQuestionsToShow || 30}
                        onChange={e => setNewExam({...newExam, totalQuestionsToShow: parseInt(e.target.value) || 0})}
                      />
                      <p className="text-[10px] text-zinc-500 leading-tight">
                        How many questions from the bank will be shown to the student? (e.g. "Generate 10 questions from the 100 available").
                      </p>
                    </div>

                    <div className="pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                         <h5 className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Questions in Bank</h5>
                         <Button 
                          variant="outline" 
                          size="sm" 
                          icon={Plus} 
                          onClick={() => setIsAddingQuestion(true)}
                          className="rounded-xl border-indigo-500/30 text-indigo-600"
                         >
                          Add Question
                         </Button>
                      </div>
                      
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {allQuestions.filter(q => q.examId === editingExamId || q.examId === 'temp_new').length === 0 ? (
                          <div className="py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center">
                            <p className="text-zinc-400 text-[10px] font-bold uppercase">Pool is Empty</p>
                          </div>
                        ) : (
                          allQuestions
                            .filter(q => q.examId === editingExamId || q.examId === 'temp_new')
                            .map((q, idx) => (
                              <div key={`pool-q-${q.id || idx}`} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-indigo-500 uppercase">Q{idx + 1} • {q.type}</p>
                                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{q.questionText}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => {
                                    setNewQuestion(q);
                                    setEditingQuestionId(q.id);
                                    setIsAddingQuestion(true);
                                  }} className="p-2 text-zinc-400 hover:text-blue-500"><Pencil size={14} /></button>
                                  <button onClick={() => {
                                    handleDeleteQuestion(q.id, editingExamId || 'temp');
                                  }} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={14} /></button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                 <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Status</span>
                   <select 
                    className="bg-transparent text-sm font-black text-indigo-600 outline-none"
                    value={newExam.status}
                    onChange={e => setNewExam({...newExam, status: e.target.value as any})}
                   >
                     <option value="approved">Published</option>
                     <option value="pending">Draft</option>
                     <option value="rejected">Unlisted</option>
                   </select>
                 </div>
                 <div className="flex items-center gap-3">
                   <Button variant="ghost" onClick={() => setIsAddingExam(false)} className="rounded-2xl">Cancel</Button>
                   <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 min-w-[160px] py-4"
                    icon={isUploading ? RefreshCcw : Save}
                    onClick={handleAddExam}
                    disabled={isUploading}
                   >
                     {isUploading ? 'Saving...' : (editingExamId ? 'Update Exam' : 'Launch Exam')}
                   </Button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}

        {activePdf && (
          <div className={`fixed inset-0 z-[100] flex items-center justify-center ${isPdfFullScreen ? 'p-0' : 'p-4'} bg-black/80 backdrop-blur-sm transition-all duration-300`}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white dark:bg-zinc-900 ${isPdfFullScreen ? 'w-full h-full rounded-none' : 'rounded-3xl w-full max-w-5xl h-[90vh]'} flex flex-col overflow-hidden relative transition-all duration-300 shadow-2xl`}
            >
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 z-30">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold dark:text-white truncate max-w-[150px] sm:max-w-md">
                    {activePdf.isRestricted ? 'Practice Sheet (Read Only)' : 'PDF Preview'}
                  </h3>
                  {activePdf.isRestricted && (
                    <Badge className="bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] py-1 shrink-0">No Downloads</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsPdfFullScreen(!isPdfFullScreen)}
                    className="rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {isPdfFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setActivePdf(null);
                      setIsPdfFullScreen(false);
                    }}
                    className="rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-500 hover:text-red-500"
                  >
                    <X size={20} />
                  </Button>
                </div>
              </div>
              <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-800/50 flex flex-col overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <RefreshCcw className="animate-spin text-zinc-300 dark:text-zinc-700 mx-auto" size={48} />
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">Loading Document...</p>
                  </div>
                </div>
                <div className={`flex-1 w-full relative z-10 transition-all duration-500 ${activePdf.isRestricted ? 'overflow-hidden' : ''}`}>
                  <iframe 
                    src={activePdf.isRestricted 
                      ? (activePdf.url.includes('drive.google.com') ? getEmbedUrl(activePdf.url) : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(activePdf.url)}`)
                      : getEmbedUrl(activePdf.url)} 
                    className={`w-full h-full border-none transition-transform duration-500 ${activePdf.isRestricted ? 'h-[calc(100%+60px)] -mt-[60px]' : ''}`}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    onContextMenu={(e) => activePdf.isRestricted && e.preventDefault()}
                  />
                </div>
                
                {activePdf.isRestricted && (
                   <>
                     {/* Interaction Shields: Prevents clicking in sensitive areas */}
                     <div className="absolute top-0 left-0 right-0 h-20 z-20 cursor-default bg-transparent" />
                     <div className="absolute bottom-0 right-0 w-32 h-20 z-20 cursor-default bg-transparent" />

                     <div className="absolute top-4 right-4 z-30 pointer-events-none">
                        <div className="bg-zinc-900/95 text-white text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          Secure Read Mode
                        </div>
                     </div>
                   </>
                )}
              </div>
              {activePdf.isRestricted && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-900/40 text-center">
                  <p className="text-[10px] sm:text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">
                    Downloads are disabled for practice sheets. You can read, study, and take screenshots for reference.
                  </p>
                </div>
              )}
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
                  {(activeVideo || (activePlaylist && activePlaylist.type === 'youtube')) ? (
                    <iframe 
                      src={(() => {
                        const videoId = activeVideo || '';
                        const playlistId = activePlaylist?.youtubePlaylistId;
                        let baseUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
                        if (activePlaylist) {
                          if (activePlaylist.type === 'youtube' && playlistId) {
                            baseUrl += `&listType=playlist&list=${playlistId}`;
                          } else if (activePlaylist.type === 'custom' && activePlaylist.videoIds) {
                            const ids = contents
                              .filter(c => activePlaylist.videoIds?.includes(c.id))
                              .map(c => getYouTubeId(c.url))
                              .join(',');
                            if (ids) baseUrl += `&playlist=${ids}`;
                          }
                        }
                        return baseUrl;
                      })()} 
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
                          <div className="p-12 text-center space-y-6">
                            <div className="relative mx-auto w-20 h-20">
                              <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping" />
                              <div className="relative w-full h-full bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                                <Youtube size={32} className="animate-bounce" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">Syncing Playlist</p>
                              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed max-w-[150px] mx-auto text-center">
                                Connecting to YouTube to load your class videos.
                              </p>
                            </div>
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
                          <div className="p-8 text-center space-y-6">
                            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto text-blue-600 shadow-inner">
                              <List size={32} />
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm text-zinc-900 dark:text-zinc-100 font-black uppercase tracking-tight">Playlist Ready</p>
                              <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                                Use the YouTube controls in the player to skip between videos.
                              </p>
                            </div>
                            <Button 
                              variant="outline"
                              className="w-full text-[10px] font-black uppercase tracking-widest h-11 border-zinc-200 dark:border-zinc-800 rounded-xl"
                              onClick={() => window.open(`https://www.youtube.com/playlist?list=${activePlaylist.youtubePlaylistId}`, '_blank')}
                            >
                              View Entire List on YT
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
                              key={`${videoId}-${index}`}
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
                    } else if (allPlaylists.find(p => p.id === deletingId) || userPlaylists.find(p => p.id === deletingId)) {
                      confirmDeletePlaylist();
                    } else if (deleteBankId) {
                      confirmDeleteQuestion();
                    } else {
                      confirmDeleteContent(deletingId);
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
                <Button variant="ghost" size="icon" onClick={() => { 
                  setIsAddingExternal(false); 
                  setGlobalError(null); 
                  setExternalThumbnailFile(null);
                }}><X size={20} /></Button>
              </div>

              {globalError && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                  {globalError}
                </div>
              )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Icon (Emoji) & Platform Name</label>
                        <div className="flex gap-4">
                          <input 
                            className="w-20 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white text-center text-xl"
                            placeholder="🎓"
                            value={newExternal.icon}
                            onChange={e => setNewExternal({...newExternal, icon: e.target.value})}
                          />
                          <input 
                            className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                            placeholder="e.g. 10 Minute School"
                            value={newExternal.title}
                            onChange={e => setNewExternal({...newExternal, title: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Image Thumbnail (Upload or Paste Link)</label>
                        <div className="space-y-3">
                          <div 
                            onClick={() => document.getElementById('external-thumb')?.click()}
                            className="w-full aspect-video bg-zinc-50 dark:bg-zinc-800 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors overflow-hidden group relative"
                          >
                            {(externalThumbnailPreview || newExternal.thumbnail) ? (
                              <img src={getDirectImageUrl(externalThumbnailPreview || newExternal.thumbnail)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <>
                                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-2">
                                  <Upload className="text-zinc-400" size={20} />
                                </div>
                                <span className="text-xs text-zinc-500 font-medium">Click to Upload Image</span>
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
                            placeholder="Paste Google Image URL..."
                            value={newExternal.thumbnail && !externalThumbnailPreview ? newExternal.thumbnail : ''}
                            onChange={e => {
                              setNewExternal({...newExternal, thumbnail: e.target.value});
                              setExternalThumbnailPreview(null);
                              setExternalThumbnailFile(null);
                            }}
                          />
                        </div>
                        <input 
                          type="file"
                          id="external-thumb"
                          className="hidden"
                          accept="image/*"
                          onChange={handleExternalThumbnailChange}
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

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Target Chapter</label>
                        <input 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                          placeholder="e.g. Chapter 1 or All"
                          value={newExternal.chapter || ''}
                          onChange={e => setNewExternal({...newExternal, chapter: e.target.value})}
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
              <p className="text-sm text-zinc-500 font-medium">Your feedback helps us improve Parodorshhi for everyone.</p>
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

        {examPrep && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl overflow-hidden border border-white/20 dark:border-zinc-800 my-auto"
            >
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-3xl flex items-center justify-center mx-auto">
                    <Trophy size={32} />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Ready to Start?</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm">Review the exam details before beginning your test session.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Exam Summary */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">Target Class</span>
                      <Badge className="bg-zinc-900 dark:bg-white dark:text-zinc-900 border-none text-[10px] py-0.5">{examPrep.class}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">Subject</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{examPrep.subject}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">Chapter</span>
                      <input 
                        className="bg-transparent border-b border-zinc-200 dark:border-zinc-700 text-right text-xs font-bold text-zinc-900 dark:text-zinc-100 outline-none w-1/2 p-0 focus:border-blue-500 transition-colors"
                        value={examPrep.chapter || ''}
                        placeholder="All Chapters"
                        onChange={e => setExamPrep({...examPrep, chapter: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.1em]">Time Limit</span>
                      <span className="text-xs font-bold text-blue-600">{examPrep.timeLimit} Minutes</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full py-4 bg-blue-600 shadow-lg shadow-blue-500/20"
                    onClick={() => handleStartExam(examPrep)}
                    icon={Play}
                  >
                    Confirm & Start
                  </Button>
                </div>

                <div className="pt-2">
                  <Button
                    variant="ghost"
                    className="w-full rounded-2xl text-zinc-400 hover:text-red-500 hover:bg-red-500/5"
                    onClick={() => setExamPrep(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isGeneratingExam && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="text-center space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <Trophy className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white tracking-tight">Generating Exam...</h3>
              <p className="text-zinc-400 text-sm font-medium">Randomizing questions from the bank just for you.</p>
            </div>
          </motion.div>
        </div>
      )}

      {renderFooter()}
    </div>
  );
}

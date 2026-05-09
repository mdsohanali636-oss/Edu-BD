import { GoogleGenAI, Type } from "@google/genai";
import React, { useState, useMemo, useEffect, useRef, ChangeEvent, FormEvent, cloneElement, useCallback } from 'react';
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
  ChevronDown,
  ShieldCheck,
  RefreshCcw,
  RefreshCw,
  Home,
  Brain as BrainIcon,
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
  LogOut,
  User as UserIcon,
  Globe,
  Pencil,
  Lock,
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
  Crown,
  HelpCircle,
  Database,
  Calendar,
  Menu,
  LayoutGrid,
  Sparkles,
  Zap,
  MousePointer2,
  File as FileIcon
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Card, Button, Badge } from './components/ui/Base';
import { INITIAL_DATA, MOCK_EXAMS } from './data/mockData';
import { ContentItem, Category, AcademicClass, ExternalResource, Feedback, Playlist, Exam, Question, ExamAttempt, LeaderboardEntry, CustomExamSettings, AcademicClassInfo, AcademicSubject, AcademicChapter, OperationType, FirestoreErrorInfo } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { PremiumExamSection } from './components/PremiumExam/PremiumExamSection';
import { AcademicManagement } from './components/Admin/AcademicManagement';
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
import { User, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, db, storage, googleProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from './firebase';

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

// const STANDARD_SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'ICT', 'General Knowledge', 'General'];

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
};

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  try {
    if (typeof date === 'number') return new Date(date).toLocaleString();
    if (date.seconds) return new Date(date.seconds * 1000).toLocaleString();
    if (date.toDate && typeof date.toDate === 'function') return date.toDate().toLocaleString();
    return new Date(date).toLocaleString();
  } catch (e) {
    return 'Invalid Date';
  }
};

const TiltContainer = ({ children, className = "", style = {} }: { children: React.ReactNode, className?: string, style?: any }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)");
  const [isResetting, setIsResetting] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth < 768) return;
    if (!containerRef.current) return;
    setIsResetting(false);
    const rect = containerRef.current.getBoundingClientRect();
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const midX = rect.width / 2;
    const midY = rect.height / 2;
    
    const rotateY = ((x - midX) / midX) * 10;
    const rotateX = -((y - midY) / midY) * 10;
    
    setTransform(`
      perspective(1000px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale(1.03)
    `);
  };

  const handleLeave = () => {
    if (window.innerWidth < 768) return;
    setIsResetting(true);
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)");
    setTimeout(() => {
      setIsResetting(false);
    }, 400);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`tilt ${isResetting ? 'reset' : ''} ${className} overflow-hidden md:overflow-visible`}
      style={{ ...style, transform, maxWidth: '100%' }}
    >
      <div className="tilt-inner h-full w-full overflow-hidden md:overflow-visible">
        {children}
      </div>
    </div>
  );
};

const WaveDivider = () => (
  <div className="wave-transition">
    <div className="wave wave-back wave-back-anim">
      <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path d="M0,160 C480,280 960,40 1440,160 L1440,320 L0,320 Z"></path>
      </svg>
    </div>
    <div className="wave wave-mid wave-mid-anim">
      <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path d="M0,180 C480,320 960,0 1440,180 L1440,320 L0,320 Z"></path>
      </svg>
    </div>
    <div className="wave wave-front wave-front-anim">
      <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path d="M0,200 C480,260 960,60 1440,200 L1440,320 L0,320 Z"></path>
      </svg>
    </div>
  </div>
);

const ScrollSection = ({ children, id, className = "", style = {} }: { children: React.ReactNode, id?: string, className?: string, style?: any }) => {
  return (
    <motion.section
      id={id}
      style={{ ...style, transformStyle: typeof window !== 'undefined' && window.innerWidth > 768 ? "preserve-3d" : "flat" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`relative w-full max-w-full overflow-x-hidden ${className}`}
    >
      {children}
    </motion.section>
  );
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



const CharacterSpeechBubble = ({ children }: { children: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.5, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    className="relative bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-white/10 rounded-2xl px-6 py-4 shadow-2xl mb-8 max-w-[280px] text-center"
  >
    <div className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
      {children}
    </div>
    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-zinc-900 border-r-2 border-b-2 border-zinc-100 dark:border-white/10 rotate-45" />
  </motion.div>
);

const CinematicBackground = ({ mousePos, isNight }: { mousePos: { x: number, y: number }, isNight: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 190;
    canvas.height = 228;

    const drops = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      s: 1.2 + Math.random() * 2.8,
      l: 7 + Math.random() * 13,
      o: 0.1 + Math.random() * 0.28
    }));

    const drawCity = () => {
      const h = canvas.height;
      const blds = [
        { x: 0, w: 28, h: 80 }, { x: 22, w: 18, h: 105 }, { x: 36, w: 24, h: 92 },
        { x: 56, w: 32, h: 128 }, { x: 84, w: 18, h: 98 }, { x: 99, w: 28, h: 118 },
        { x: 124, w: 24, h: 95 }, { x: 145, w: 28, h: 112 }, { x: 170, w: 18, h: 83 },
        { x: 185, w: 28, h: 103 }
      ];
      blds.forEach(b => {
        ctx.fillStyle = '#10182A';
        ctx.fillRect(b.x, h - b.h, b.w, b.h);
        for (let wy = h - b.h + 8; wy < h - 6; wy += 13) {
          for (let wx = b.x + 3; wx < b.x + b.w - 7; wx += 9) {
            if (Math.random() > 0.38) {
              const wc = ['rgba(255,220,100,0.75)', 'rgba(255,255,200,0.65)', 'rgba(200,220,255,0.6)'][Math.floor(Math.random() * 3)];
              ctx.fillStyle = wc; ctx.fillRect(wx, wy, 5, 7);
            }
          }
        }
      });
    };

    const drawClouds = () => {
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      [[28, 38, 28], [118, 22, 22], [78, 58, 18]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.arc(x + r * 0.7, y - r * 0.3, r * 0.7, 0, Math.PI * 2);
        ctx.arc(x + r * 1.4, y, r * 0.9, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    let animationFrame: number;
    const animate = () => {
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (isNight) {
        g.addColorStop(0, '#0b1320'); g.addColorStop(0.5, '#14233A'); g.addColorStop(1, '#0e1b2e');
      } else {
        g.addColorStop(0, '#A8D8EA'); g.addColorStop(0.5, '#87CEEB'); g.addColorStop(1, '#b8dcf0');
      }
      ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
      isNight ? drawCity() : drawClouds();
      drops.forEach(d => {
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1, d.y + d.l);
        ctx.strokeStyle = `rgba(180,210,240,${d.o})`; ctx.lineWidth = 1; ctx.stroke();
        d.y += d.s; if (d.y > canvas.height) { d.y = -d.l; d.x = Math.random() * canvas.width; }
      });
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [isNight]);

  const dx = (mousePos.x - window.innerWidth / 2) / (window.innerWidth / 2);
  const dy = (mousePos.y - window.innerHeight / 2) / (window.innerHeight / 2);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Wall & Floor */}
      <div className={`absolute inset-0 transition-colors duration-500 ${isNight ? 'bg-[linear-gradient(180deg,#0E1A2B_0%,#142035_62%,#080E17_62%)]' : 'bg-[linear-gradient(180deg,#F2E5D0_0%,#EDD9BC_62%,#C9A27A_62%)]'}`} />
      
      {/* Stars for dark mode */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${isNight ? 'opacity-100' : 'opacity-0'}`}>
        {Array.from({ length: 45 }).map((_, i) => (
          <div 
            key={i}
            className="absolute bg-white rounded-full animate-sparkle"
            style={{ 
              left: `${Math.random() * 100}%`, 
              top: `${Math.random() * 60}%`, 
              width: `${1 + Math.random() * 2.5}px`, 
              height: `${1 + Math.random() * 2.5}px`,
              '--duration': `${0.8 + Math.random() * 2}s`,
              '--dl': `${Math.random() * 2}s`
            } as any}
          />
        ))}
      </div>

      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] h-[380px] transition-all duration-500"
        style={{ 
          background: `radial-gradient(ellipse at 50% 0%, ${isNight ? 'rgba(130,80,255,0.2)' : 'rgba(255,203,107,0.45)'} 0%, transparent 68%)`,
          transform: `translateX(calc(-50% + ${dx * -5}px))`
        }} 
      />

      {/* Window */}
      <div 
        className={`absolute top-[55px] right-[10%] w-[190px] h-[228px] border-[10px] rounded-lg overflow-hidden shadow-2xl transition-all duration-500 ${isNight ? 'border-[#1E2D40]' : 'border-[#C48E4A]'}`}
        style={{ transform: `translate(${dx * 7}px, ${dy * 4}px)` }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 z-1" />
        <div className={`absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2 z-[3] ${isNight ? 'bg-[#1E2D40]' : 'bg-[#C48E4A]'}`} />
        <div className={`absolute top-0 bottom-0 left-1/2 w-2 -translate-x-1/2 z-[3] ${isNight ? 'bg-[#1E2D40]' : 'bg-[#C48E4A]'}`} />
      </div>

      {/* Fairy Lights */}
      <div className="absolute top-0 left-0 right-0 h-14 z-[3]">
        <div className="absolute top-[10px] left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-black/15 to-transparent" />
        {Array.from({ length: 24 }).map((_, i) => {
          const colors = ['#FFD700', '#FF6BAE', '#A0E7FF', '#90FF90', '#FFB347', '#FF9DE2', '#B5EEFF'];
          const x = (i / 23) * 96 + 2;
          const y = 10 + Math.sin(i * 0.85) * 13;
          const c = colors[i % colors.length];
          return (
            <div
              key={i}
              className="absolute w-[9px] h-[11px] rounded-[50%_50%_40%_40%] animate-twinkle"
              style={{ 
                left: `${x}%`,
                top: `${y}px`,
                backgroundColor: c,
                boxShadow: `0 0 7px ${c}`,
                '--duration': `${1.4 + Math.random() * 2.2}s`,
                '--dl': `${Math.random() * 2}s`
              } as any}
            />
          );
        })}
      </div>

      {/* Desk */}
      <div className={`absolute bottom-0 left-0 right-0 h-[110px] border-t-8 transition-colors duration-500 z-[4] ${isNight ? 'bg-[#0A0F18] border-[#0F1520]' : 'bg-[#8B5E3C] border-[#A0714B]'}`} />

      {/* Floating Particles */}
      {Array.from({ length: 14 }).map((_, i) => {
        const colors = ['rgba(255,200,100,0.45)', 'rgba(120,200,255,0.4)', 'rgba(255,150,200,0.38)', 'rgba(150,255,180,0.38)'];
        return (
          <div
            key={i}
            className="absolute rounded-full opacity-0 animate-floatup"
            style={{
              left: `${5 + Math.random() * 90}%`,
              bottom: `${18 + Math.random() * 22}%`,
              width: `${3 + Math.random() * 5}px`,
              height: `${3 + Math.random() * 5}px`,
              backgroundColor: colors[i % 4],
              '--duration': `${6 + Math.random() * 9}s`,
              '--dl': `${Math.random() * 9}s`
            } as any}
          />
        );
      })}
    </div>
  );
};

const FlyInteraction = ({ onShoo }: { onShoo: () => void }) => {
  const [pos, setPos] = useState({ x: -10, y: 30 });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!isActive) return null;

  return (
    <motion.div
      animate={{ 
        x: [pos.x + "%", "50%", pos.x + "%"], 
        y: [pos.y + "%", "30%", pos.y + "%"] 
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      className="absolute w-6 h-6 z-50 pointer-events-auto cursor-pointer"
      onMouseEnter={() => {
        onShoo();
        setPos({ x: Math.random() * 100, y: Math.random() * 100 });
      }}
    >
      <svg viewBox="0 0 22 22" width="22" height="22">
        <ellipse cx="11" cy="14" rx="5.5" ry="3.5" fill="#222"/>
        <motion.ellipse 
          animate={{ opacity: [0.3, 0.8] }}
          transition={{ duration: 0.1, repeat: Infinity }}
          cx="6" cy="10" rx="5.5" ry="3" fill="rgba(160,210,255,0.65)" 
          transform="rotate(-20 6 10)"
        />
        <motion.ellipse 
          animate={{ opacity: [0.3, 0.8] }}
          transition={{ duration: 0.1, repeat: Infinity }}
          cx="16" cy="10" rx="5.5" ry="3" fill="rgba(160,210,255,0.65)" 
          transform="rotate(20 16 10)"
        />
        <circle cx="9" cy="11.5" r="1.8" fill="#AA0000"/>
        <circle cx="13" cy="11.5" r="1.8" fill="#AA0000"/>
      </svg>
    </motion.div>
  );
};

const NewBoyCharacter = ({ mood, mousePos, isTyping }: { mood: string, mousePos: { x: number, y: number }, isTyping: boolean }) => {
  const eyeX = useSpring(0, { stiffness: 150, damping: 20 });
  const eyeY = useSpring(0, { stiffness: 150, damping: 20 });

  useEffect(() => {
    if (isTyping) {
      eyeX.set(0);
      eyeY.set(8);
    } else {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = (mousePos.x - centerX) / 30;
      const dy = (mousePos.y - centerY) / 30;
      eyeX.set(Math.max(-10, Math.min(10, dx)));
      eyeY.set(Math.max(-10, Math.min(10, dy)));
    }
  }, [mousePos, isTyping, eyeX, eyeY]);

  return (
    <div id="svgwrap" className="relative animate-breathe origin-bottom">
      <svg id="charsvg" viewBox="0 0 300 420" width="270" height="368" className="drop-shadow-2xl">
        <defs>
          <radialGradient id="tg" cx="50%" cy="30%">
            <stop offset="0%" stopColor="#74B9FF" />
            <stop offset="100%" stopColor="#2471A3" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="c" />
            <feMerge>
              <feMergeNode in="c" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Shadow */}
        <ellipse cx="150" cy="412" rx="88" ry="11" fill="rgba(0,0,0,0.13)" />
        
        {/* Pants */}
        <rect x="102" y="303" width="46" height="96" rx="17" fill="#243447" />
        <rect x="152" y="303" width="46" height="96" rx="17" fill="#243447" />
        <rect x="122" y="310" width="3" height="82" rx="1" fill="rgba(255,255,255,0.07)" />
        <rect x="172" y="310" width="3" height="82" rx="1" fill="rgba(255,255,255,0.07)" />
        
        {/* Shoes */}
        <ellipse cx="123" cy="396" rx="29" ry="13" fill="#181825" />
        <ellipse cx="177" cy="396" rx="29" ry="13" fill="#181825" />
        <ellipse cx="118" cy="392" rx="11" ry="4.5" fill="rgba(255,255,255,0.13)" />
        <ellipse cx="172" cy="392" rx="11" ry="4.5" fill="rgba(255,255,255,0.13)" />
        
        {/* Hoodie body */}
        <path d="M87,198 Q80,252 76,308 L224,308 Q220,252 213,198 Q175,214 150,214 Q125,214 87,198 Z" fill="#38BCC8" />
        <path d="M87,198 Q80,252 76,308 L150,308 L150,214 Q125,214 87,198 Z" fill="rgba(255,255,255,0.05)" />
        
        {/* Pocket */}
        <rect x="114" y="260" width="72" height="36" rx="10" fill="#2EAAB5" />
        <rect x="116" y="262" width="68" height="32" rx="9" fill="rgba(0,0,0,0.05)" />
        
        {/* Hoodie strings */}
        <line x1="143" y1="214" x2="139" y2="244" stroke="#2EAAB5" strokeWidth="2.2" />
        <line x1="157" y1="214" x2="161" y2="244" stroke="#2EAAB5" strokeWidth="2.2" />
        <circle cx="139" cy="246" r="3.5" fill="#26979F" />
        <circle cx="161" cy="246" r="3.5" fill="#26979F" />
        
        {/* Collar */}
        <path d="M108,196 Q150,210 192,196 Q174,205 150,207 Q126,205 108,196 Z" fill="#2EAAB5" />

        {/* LEFT ARM */}
        <g id="armleft" style={{ display: mood === 'welcoming' || mood === 'annoyed' ? 'none' : 'block' }}>
          <path d="M89,204 Q56,232 52,292 Q52,313 70,316 Q90,318 97,298 Q102,258 110,218 Z" fill="#38BCC8" />
          <ellipse cx="63" cy="311" rx="19" ry="13" fill="#F0B07A" transform="rotate(-15 63 311)" />
        </g>
        
        <g id="armwave" style={{ display: mood === 'annoyed' ? 'block' : 'none', transformOrigin: '92px 210px' }}>
          <motion.path 
            animate={{ rotate: [0, 20, -20, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            d="M89,204 Q56,220 45,260 Q36,290 50,304 Q64,316 78,295 Q94,264 110,218 Z" 
            fill="#38BCC8" 
          />
          <ellipse cx="52" cy="300" rx="18" ry="12" fill="#F0B07A" transform="rotate(-35 52 300)" />
        </g>

        <g id="armthumb" style={{ display: mood === 'welcoming' ? 'block' : 'none', transformOrigin: '92px 210px' }}>
          <path d="M89,204 Q65,190 52,165 Q44,145 55,135 Q65,126 75,145 Q85,165 110,218 Z" fill="#38BCC8" />
          <ellipse cx="57" cy="131" rx="15" ry="12" fill="#F0B07A" transform="rotate(20 57 131)" />
        </g>

        {/* RIGHT ARM */}
        <g id="armright">
          <path d="M211,204 Q244,232 248,311 Q248,313 230,316 Q210,318 203,298 Q198,258 190,218 Z" fill="#38BCC8" />
          <ellipse cx="237" cy="311" rx="19" ry="13" fill="#F0B07A" transform="rotate(15 237 311)" />
        </g>
        
        <rect x="196" y="222" width="70" height="92" rx="9" fill="#1C2938" />
        <rect x="200" y="226" width="62" height="84" rx="7" fill="#2471A3" />
        <rect x="203" y="229" width="56" height="78" rx="5" fill="url(#tg)" />

        <rect x="129" y="184" width="42" height="27" rx="7" fill="#F0B07A" />
        <ellipse cx="150" cy="118" rx="73" ry="79" fill="#F5B57A" />
        <ellipse cx="79" cy="120" rx="15" ry="20" fill="#F5B57A" />
        <ellipse cx="221" cy="120" rx="15" ry="20" fill="#F5B57A" />

        <ellipse cx="150" cy="62" rx="68" ry="46" fill="#221409" />
        <path d="M83,88 Q79,48 102,33 Q122,20 150,18 Q178,20 198,33 Q221,48 217,88 Q198,56 150,54 Q102,56 83,88 Z" fill="#2D1B0E" />

        <motion.path 
          animate={{ d: mood === 'annoyed' ? 'M107,93 Q121,90 134,92' : mood === 'excited' ? 'M107,77 Q121,69 134,74' : 'M107,88 Q121,80 134,85' }}
          stroke="#2D1B0E" strokeWidth="4.5" fill="none" strokeLinecap="round" 
        />
        <motion.path 
          animate={{ d: mood === 'annoyed' ? 'M166,92 Q179,90 193,93' : mood === 'excited' ? 'M166,74 Q179,69 193,77' : 'M166,85 Q179,80 193,88' }}
          stroke="#2D1B0E" strokeWidth="4.5" fill="none" strokeLinecap="round" 
        />

        <g>
          <ellipse cx="119" cy="114" rx="20" ry="22" fill="white" />
          <motion.circle style={{ x: eyeX, y: eyeY }} cx={119} cy={114} r={13.5} fill="#5A3E28" />
          <motion.circle style={{ x: eyeX, y: eyeY }} cx={119} cy={114} r={7.8} fill="#160C06" />
        </g>
        <g>
          <ellipse cx="181" cy="114" rx="20" ry="22" fill="white" />
          <motion.circle style={{ x: eyeX, y: eyeY }} cx={181} cy={114} r={13.5} fill="#5A3E28" />
          <motion.circle style={{ x: eyeX, y: eyeY }} cx={181} cy={114} r={7.8} fill="#160C06" />
        </g>

        <ellipse cx="150" cy="140" rx="8.5" ry="5.5" fill="#E99A5E" opacity="0.65" />
        <motion.path 
          animate={{ 
            d: mood === 'excited' ? "M120,157 Q150,186 180,157" :
               mood === 'thinking' ? "M130,164 Q152,172 170,163" :
               mood === 'annoyed' ? "M131,170 Q150,163 169,170" :
               mood === 'welcoming' ? "M123,160 Q150,182 177,160" :
               "M129,162 Q150,176 171,162"
          }}
          stroke="#C47A4A" strokeWidth="3.5" fill="none" strokeLinecap="round" 
        />
      </svg>
    </div>
  );
};



const LandingPage = ({ onGoogleLogin, onEmailLogin, onEmailSignUp, onForgotPassword, onPhoneSignIn, onVerifyOtp, error, isLoading }: { 
  onGoogleLogin: () => void;
  onEmailLogin: (email: string, pass: string) => void;
  onEmailSignUp: (name: string, email: string, pass: string, academicClass: AcademicClass) => void;
  onForgotPassword: (email: string) => void;
  onPhoneSignIn: (phone: string) => Promise<any>;
  onVerifyOtp: (otp: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}) => {
  const [mode, setMode] = useState<'landing' | 'login' | 'signup' | 'forgot-password' | 'phone-login' | 'otp-verify'>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [academicClass, setAcademicClass] = useState<AcademicClass>('Class 9');
  const [resetSent, setResetSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [inputVal, setInputVal] = useState('');
  const [mood, setMood] = useState<'idle' | 'excited' | 'welcoming' | 'thinking' | 'annoyed'>('idle');

  useEffect(() => {
    const handleMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCommand(inputVal);
  };

  const processCommand = (val: string) => {
    const v = val.toLowerCase().trim();
    if (v === 'login' || v === 'log in' || v === 'sign in') {
      setMood('excited');
      setTimeout(() => setMode('login'), 400);
    } else if (v === 'signup' || v === 'sign up' || v === 'register') {
      setMood('welcoming');
      setTimeout(() => setMode('signup'), 400);
    }
  };

  useEffect(() => {
    if (mode === 'landing') {
      const v = inputVal.toLowerCase().trim();
      const loginWords = ['login', 'log in', 'sign in'];
      const signupWords = ['signup', 'sign up', 'register'];
      
      if (loginWords.includes(v) || signupWords.includes(v)) {
        processCommand(inputVal);
      } else if (inputVal.length > 0) {
        setMood('thinking');
      } else {
        setMood('idle');
      }
    }
  }, [inputVal, mode]);

  const [isNight, setIsNight] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (saved) return saved === 'dark';
    return new Date().getHours() > 18 || new Date().getHours() < 6;
  });

  useEffect(() => {
    if (isNight) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isNight]);
  
  return (
    <div className={`min-h-[100dvh] flex flex-col items-center justify-end pb-12 sm:pb-24 relative overflow-hidden transition-all duration-500`}>
      <CinematicBackground mousePos={mousePos} isNight={isNight} />
      
      {/* Branding - Website Name & Logo */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6 z-50 flex items-center gap-4 pointer-events-none"
      >
        <div className="bg-white/10 dark:bg-black/20 backdrop-blur-xl border border-white/20 p-2.5 rounded-2xl shadow-2xl">
          <img src="/api/v1/files/input_file_0.png" alt="Parodorshhi Logo" className="h-8 sm:h-10 w-auto brightness-110 contrast-125 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tighter text-zinc-900/80 dark:text-white/60 uppercase">
          Parodorshhi
        </h1>
      </motion.div>

      <motion.button
        onClick={() => {
          const next = !isNight;
          setIsNight(next);
          localStorage.setItem('theme', next ? 'dark' : 'light');
        }}
        className="fixed top-[18px] right-[18px] w-[42px] h-[42px] rounded-full bg-white dark:bg-zinc-800 border-none cursor-pointer text-xl flex items-center justify-center shadow-lg z-50 transition-all hover:scale-110"
      >
        {isNight ? '🌙' : '☀️'}
      </motion.button>

      <motion.div className="w-full max-w-6xl flex flex-col items-center justify-center relative z-10">
        <motion.div layout className="relative group flex flex-col items-center">
          <FlyInteraction onShoo={() => {
            setMood('annoyed');
            setTimeout(() => setMood('idle'), 3000);
          }} />
          
          <div id="bubble" className="relative bg-white dark:bg-[#121c30] rounded-[18px] px-6 py-3.5 mb-[18px] max-w-[330px] text-[1.02rem] font-bold text-zinc-900 dark:text-zinc-100 shadow-xl border-2 border-white/80 animate-bubblepop z-20 text-center after:content-[''] after:absolute after:bottom-[-15px] after:left-1/2 after:-translate-x-1/2 after:border-[9px] after:border-transparent after:border-t-white dark:after:border-t-[#121c30] transition-colors duration-300">
            {mode === 'landing' ? (
               <>Hey there 👋 Do you want to <strong>log in</strong> or <strong>sign up</strong>?</>
            ) : mode === 'login' ? (
               <>Awesome! Welcome back! 🎉</>
            ) : (
               <>Yay! Let's get you started! 🌟</>
            )}
          </div>

          <motion.div 
            layout
            animate={{ 
              scale: mode === 'landing' ? 1.2 : 0.8,
              y: mode === 'landing' ? 0 : -20
            }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="relative"
          >
            <NewBoyCharacter mood={mood} mousePos={mousePos} isTyping={inputVal.length > 0} />
          </motion.div>

          <AnimatePresence mode="wait">
            {mode === 'landing' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                className="mt-[26px] flex flex-col items-center"
              >
                <form onSubmit={handleInputSubmit} className="relative w-[310px] group/input">
                  <input 
                    id="maininput"
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="type 'login' or 'sign up'..."
                    autoFocus
                    autoComplete="off"
                    spellCheck="false"
                    className="w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-[2.5px] border-white/75 rounded-[14px] px-6 py-[15px] text-zinc-900 dark:text-white outline-none focus:border-red-500 focus:shadow-[0_4px_20px_rgba(255,96,96,0.18)] transition-all font-bold text-lg text-center placeholder:text-zinc-400/45 shadow-lg"
                  />
                  <div id="hint" className="text-center text-[0.78rem] text-orange-800/70 dark:text-zinc-400 mt-[7px] font-bold">
                    ✨ Just type what you'd like to do!
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Modal Panels */}
        <AnimatePresence>
          {(mode === 'login' || mode === 'signup' || mode === 'forgot-password' || mode === 'phone-login' || mode === 'otp-verify') && (
            <div className="fixed inset-0 flex items-center justify-center z-[100]">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setMode('landing'); setInputVal(''); }}
                className="absolute inset-0 bg-black/40 backdrop-blur-md"
              />
              
              <motion.div 
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.98 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="relative bg-white/88 dark:bg-zinc-900/90 backdrop-blur-[22px] border-2 border-white/70 dark:border-zinc-800/50 rounded-[26px] p-[38px_42px] w-[min(420px,88vw)] shadow-2xl"
              >
                {mode === 'login' && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100" style={{ fontFamily: "'Fredoka One', cursive" }}>Welcome back! 👋</h2>
                      <p className="text-zinc-500 dark:text-zinc-400 font-bold text-[0.88rem] mt-1">Sign in to continue your adventure</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Email Address</label>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-white/90 dark:bg-zinc-800/80 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-[13px_17px] text-zinc-900 dark:text-white outline-none focus:border-red-500 transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Password</label>
                        <input 
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-white/90 dark:bg-zinc-800/80 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-[13px_17px] text-zinc-900 dark:text-white outline-none focus:border-red-500 transition-all font-bold"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => onEmailLogin(email, password)}
                      disabled={isLoading}
                      className="w-full p-4 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-red-500/30 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                    >
                      {isLoading ? 'Wait...' : 'Let me in! 🚀'}
                    </button>

                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={onGoogleLogin}
                        className="w-full p-3 bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-colors"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Sign in with Google
                      </button>
                      
                      <button 
                        onClick={() => setMode('forgot-password')}
                        className="text-center font-bold text-sm text-zinc-500 hover:text-red-500 transition-colors"
                      >
                        Forgot Password?
                      </button>

                      <button 
                        onClick={() => { setMode('landing'); setInputVal(''); }}
                        className="text-center font-bold text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                      >
                        ← Go back
                      </button>
                    </div>
                    {error && (
                      <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold text-center">
                         {error}
                      </div>
                    )}
                  </div>
                )}

                {mode === 'signup' && (
                  <div className="space-y-5">
                    <div className="text-center">
                      <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100" style={{ fontFamily: "'Fredoka One', cursive" }}>Join the crew! 🚀</h2>
                      <p className="text-zinc-500 dark:text-zinc-400 font-bold text-[0.88rem] mt-1">Create your account to start your journey</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Full Name</label>
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your Name"
                          className="w-full bg-white/90 dark:bg-zinc-800/80 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-[13px_17px] text-zinc-900 dark:text-white outline-none focus:border-red-500 transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[0.75rem] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Email Address</label>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-white/90 dark:bg-zinc-800/80 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-[13px_17px] text-zinc-900 dark:text-white outline-none focus:border-red-500 transition-all font-bold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[0.75rem] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Class</label>
                          <select 
                            value={academicClass}
                            onChange={(e) => setAcademicClass(e.target.value as AcademicClass)}
                            className="w-full bg-white/90 dark:bg-zinc-800/80 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-[13px_17px] text-zinc-900 dark:text-white outline-none focus:border-red-500 transition-all font-bold"
                          >
                            <option value="Class 9">Class 9</option>
                            <option value="Class 10">Class 10</option>
                            <option value="Class 11">Class 11</option>
                            <option value="Class 12">Class 12</option>
                            <option value="Admission">Admission</option>
                            <option value="Jobs">Jobs</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[0.75rem] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Password</label>
                          <input 
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-white/90 dark:bg-zinc-800/80 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-[13px_17px] text-zinc-900 dark:text-white outline-none focus:border-red-500 transition-all font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => onEmailSignUp(name, email, password, academicClass)}
                      disabled={isLoading}
                      className="w-full p-4 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-red-500/30 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                    >
                      {isLoading ? 'Creating...' : 'Create Account! ✨'}
                    </button>

                    <button 
                      onClick={() => { setMode('landing'); setInputVal(''); }}
                      className="w-full text-center font-bold text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      ← Go back
                    </button>

                    {error && (
                      <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold text-center">
                         {error}
                      </div>
                    )}
                  </div>
                )}

                {(mode === 'forgot-password' || mode === 'phone-login' || mode === 'otp-verify') && (
                  <div className="space-y-6">
                    <div className="text-center">
                       <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100" style={{ fontFamily: "'Fredoka One', cursive" }}>Reset Password 🔑</h2>
                       <p className="text-zinc-500 dark:text-zinc-400 font-bold text-sm mt-1">Don't worry, it happens!</p>
                    </div>
                    {resetSent ? (
                      <div className="p-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-2xl text-center space-y-4">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto">✅</div>
                        <p className="font-bold text-green-600 dark:text-green-400 text-sm">Reset link sent! Please check your email.</p>
                        <button onClick={() => { setResetSent(false); setMode('login'); }} className="text-sm font-black text-green-700 underline">Back to Login</button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[0.75rem] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Email Address</label>
                          <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full bg-white/90 dark:bg-zinc-800/80 border-2 border-zinc-100 dark:border-zinc-700 rounded-xl p-[13px_17px] text-zinc-900 dark:text-white outline-none font-bold"
                          />
                        </div>
                        <button 
                          onClick={async () => {
                            await onForgotPassword(email);
                            setResetSent(true);
                          }}
                          disabled={isLoading}
                          className="w-full p-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold shadow-xl transition-all active:scale-95"
                        >
                          Send Reset Link
                        </button>
                        <button onClick={() => setMode('login')} className="w-full text-center font-bold text-sm text-zinc-500">Cancel</button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
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
    setTimeout(() => setJustClicked(false), 1200);
    
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
        y: justClicked ? -30 : (isSad ? [0, -6, 0] : [0, -12, 0]),
        rotateY: justClicked ? 360 : 0,
        filter: isSad ? 'grayscale(0.8) contrast(1.1)' : 'grayscale(0) contrast(1)',
      }}
      transition={{ 
        y: { 
          duration: justClicked ? 0.3 : (isSad ? 5 : 3), 
          repeat: justClicked ? 0 : Infinity, 
          ease: justClicked ? "easeOut" : "easeInOut" 
        },
        rotateY: { duration: 0.8, ease: "easeInOut" },
        scale: { type: "spring", stiffness: 400, damping: 15 },
        filter: { duration: 1 }
      }}
      whileHover={{ scale: 1.1 }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
      className="relative w-16 h-16 cursor-pointer group z-10 p-1.5"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Dynamic Glow Base */}
      <div className={`absolute inset-2 blur-2xl transition-all duration-500 opacity-40 group-hover:opacity-70 ${isSad ? 'bg-zinc-400' : 'bg-rose-500 group-hover:bg-rose-400'}`} />

      {/* 3D Body Construction */}
      <div 
        className={`absolute inset-1.5 transition-all duration-1000 rounded-[16px] transform-gpu border-b-[6px] border-r-[6px] ${
          isSad 
            ? 'bg-zinc-200 border-zinc-400 shadow-inner' 
            : 'bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 border-rose-700 shadow-[0_20px_40px_-5px_rgba(244,63,94,0.4)]'
        }`}
        style={{ transform: "perspective(1000px) rotateX(10deg) rotateY(10deg)", transformStyle: "preserve-3d" }}
      >
        {/* Face Screen */}
        <div className={`absolute inset-[4px] bg-zinc-950 rounded-[10px] overflow-hidden flex flex-col items-center justify-center border transition-colors duration-1000 ${
          isSad ? 'border-zinc-800' : 'border-rose-400/20'
        }`}>
          {/* Eyes Container */}
          <div className="flex gap-2.5 mb-1.5 relative">
            {/* Blushing Cheeks (Happy only) */}
            {!isSad && (
              <>
                <motion.div 
                  animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.4, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute -left-3 top-1 w-2.5 h-1 bg-rose-500/40 blur-[3px] rounded-full"
                />
                <motion.div 
                  animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.4, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                  className="absolute -right-3 top-1 w-2.5 h-1 bg-rose-500/40 blur-[3px] rounded-full"
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
              {!isSad && <div className="absolute -top-1 left-0 w-full h-[1px] bg-rose-400/50 -rotate-12 rounded-full" />}
              {justClicked ? (
                <div className="w-2 h-2 text-rose-300 font-black leading-none transform -rotate-12 text-center text-[10px]">
                  v
                </div>
              ) : (
                <motion.div 
                  animate={isSad ? { scaleY: 0.15, opacity: 0.6 } : { scaleY: [1, 0.1, 1], opacity: 1 }}
                  transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.05, 0.1] }}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-1000 relative overflow-hidden ${
                    isSad ? 'bg-zinc-200' : 'bg-rose-300 shadow-[0_0_10px_rgba(251,113,133,0.8)]'
                  }`} 
                >
                  {!isSad && <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-white rounded-full opacity-70" />}
                </motion.div>
              )}
            </div>
            <div className="relative">
              {!isSad && <div className="absolute -top-1 left-0 w-full h-[1px] bg-rose-400/50 rotate-12 rounded-full" />}
              {justClicked ? (
                <div className="w-2 h-2 text-rose-300 font-black leading-none transform rotate-12 text-center text-[10px]">
                  v
                </div>
              ) : (
                <motion.div 
                  animate={isSad ? { scaleY: 0.15, opacity: 0.6 } : { scaleY: [1, 0.1, 1], opacity: 1 }}
                  transition={{ duration: 3.5, repeat: Infinity, times: [0, 0.05, 0.1], delay: 0.15 }}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-1000 relative overflow-hidden ${
                    isSad ? 'bg-zinc-200' : 'bg-rose-300 shadow-[0_0_10px_rgba(251,113,133,0.8)]'
                  }`} 
                >
                  {!isSad && <div className="absolute top-0 left-0 w-0.5 h-0.5 bg-white rounded-full opacity-70" />}
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Mouth - Realistic & Beautiful SVG Smile */}
          <motion.div className="flex items-center justify-center mt-0.5 h-3">
            <svg width="24" height="12" viewBox="0 0 32 16" className="overflow-visible">
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
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="blur-[5px] opacity-20"
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
                strokeWidth="2"
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
        <div className={`absolute -right-1 top-3.5 w-1.5 h-5 transition-colors duration-1000 rounded-r-lg ${isSad ? 'bg-zinc-300' : 'bg-rose-700 shadow-md'}`} />
        <div className={`absolute -left-1 top-3.5 w-1.5 h-5 transition-colors duration-1000 rounded-l-lg ${isSad ? 'bg-zinc-300' : 'bg-rose-700 shadow-md'}`} />
      </div>
      
      {/* Ribbon / Bow Antenna */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-5 bg-zinc-600 rounded-full shadow-sm">
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
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-3 flex items-center justify-center"
        >
          <div className={`w-2 h-2 rounded-full relative z-10 transition-all duration-1000 ${
            isSad ? 'bg-zinc-400 border border-zinc-500' : 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,1)]'
          }`} />
          <div className={`absolute -left-1 w-3 h-3 transition-all duration-1000 rounded-sm rotate-45 border-l-2 ${
            isSad ? 'bg-zinc-300 border-zinc-400' : 'bg-rose-500 border-rose-600/50 shadow-sm'
          }`} />
          <div className={`absolute -right-1 w-3 h-3 transition-all duration-1000 rounded-sm -rotate-45 border-r-2 ${
            isSad ? 'bg-zinc-300 border-zinc-400' : 'bg-rose-500 border-rose-600/50 shadow-sm'
          }`} />
        </motion.div>
      </div>

      {/* Permanent Status Label */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-zinc-950/90 text-white text-[8px] font-black px-3 py-1.5 rounded-[16px] transition-all whitespace-nowrap pointer-events-none uppercase tracking-[0.2em] shadow-xl border border-white/10 backdrop-blur-xl z-20">
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
  const [dynamicClasses, setDynamicClasses] = useState<AcademicClassInfo[]>([]);
  const [dynamicSubjects, setDynamicSubjects] = useState<AcademicSubject[]>([]);
  const [dynamicChapters, setDynamicChapters] = useState<AcademicChapter[]>([]);
  const [dynamicTopics, setDynamicTopics] = useState<AcademicTopic[]>([]);
  const [canUpload, setCanUpload] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<'home' | 'category' | 'saved' | 'admin' | 'dashboard' | 'exam' | 'leaderboard' | 'privacy' | 'terms' | 'cookies' | 'premium-exam'>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useLocalStorage('parodorshhi_darkmode', false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'resources' | 'playlists' | 'users' | 'feedback' | 'exams' | 'questions' | 'leaderboards' | 'academics'>('resources');
  const [allFeedback, setAllFeedback] = useState<Feedback[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);

  const [contentTypeFilter, setContentTypeFilter] = useState<'free' | 'premium'>('free');

  // Parallax Effect Logic
  useEffect(() => {
    if (window.innerWidth < 768) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let frameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const animate = () => {
      currentX += (mouseX - currentX) * 0.05;
      currentY += (mouseY - currentY) * 0.05;

      // Constrain move range on mobile to prevent potential layer shifting outside bounds
      const sensitivity = window.innerWidth < 768 ? 10 : 30;
      const moveX = currentX * sensitivity;
      const moveY = currentY * sensitivity;

      const glowLayer = document.getElementById("glowLayer");
      if (glowLayer) {
        glowLayer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) scale(1.05)`;
      }
      frameId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    frameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  // Scroll-reactive wave motion
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const waves = document.querySelectorAll(".wave");
      
      waves.forEach((wave, index) => {
        const speed = (index + 1) * 0.05;
        const element = wave as HTMLElement;
        // Combine base animation with scroll offset
        element.style.transform = `translateX(${-scrollY * speed}px)`;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Filters
  const [classFilter, setClassFilter] = useState<AcademicClass | 'All'>('All');
  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [examClassFilter, setExamClassFilter] = useState<AcademicClass | 'All'>('All');
  const [questionClassFilter, setQuestionClassFilter] = useState<string>('All');

  const getSubjectNamesForClass = useCallback((className: string | 'All') => {
    if (dynamicSubjects.length > 0) {
      if (className === 'All') {
        // Return unique names if multiple classes have same subject name
        return Array.from(new Set(dynamicSubjects.map(s => s.name)));
      }
      const matchedClass = dynamicClasses.find(c => c.name === className);
      if (!matchedClass) return [];
      return dynamicSubjects.filter(s => s.classId === matchedClass.id).map(s => s.name);
    }
    return ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'ICT', 'General Knowledge', 'General'];
  }, [dynamicSubjects, dynamicClasses]);

  const currentSubjects = useMemo(() => getSubjectNamesForClass(classFilter), [getSubjectNamesForClass, classFilter]);
  const examSubjects = useMemo(() => getSubjectNamesForClass(examClassFilter), [getSubjectNamesForClass, examClassFilter]);
  const questionSubjects = useMemo(() => getSubjectNamesForClass(questionClassFilter), [getSubjectNamesForClass, questionClassFilter]);

  // Modals
  const [activePdf, setActivePdf] = useState<{ url: string; isRestricted: boolean } | null>(null);
  const [isPdfFullScreen, setIsPdfFullScreen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [fetchedPlaylistVideos, setFetchedPlaylistVideos] = useState<any[]>([]);
  const [isFetchingPlaylist, setIsFetchingPlaylist] = useState(false);

  // Exam Mode State
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examAnswers, setExamAnswers] = useState<Record<string, string | number>>({});
  const [examTimeLeft, setExamTimeLeft] = useState(0);
  const [examResults, setExamResults] = useState<ExamAttempt | null>(null);
  const [isExamActive, setIsExamActive] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ displayName: '', academicClass: 'Class 9' as AcademicClass });
  const [examSubjectFilter, setExamSubjectFilter] = useState('All');
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

  const handlePremiumExamClick = () => {
    if (firestoreUser?.hasPremiumAccess || userRole === 'admin') {
      setView('premium-exam');
      setActiveExam(null);
    } else {
      // Show upgrade modal or alert
      alert("Elite Customize Exam is a PREMIUM feature. Please upgrade your account to access it.");
    }
  };

  const ai = useMemo(() => {
    try {
      const key = process.env.GEMINI_API_KEY || "";
      if (!key) return null;
      return new GoogleGenAI({ apiKey: key });
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI:", err);
      return null;
    }
  }, []);

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
    if (!ai) return [];
    try {
      const prompt = `You are a YouTube expert. I need a COMPLETE and UNIQUE list of videos from this playlist: https://www.youtube.com/playlist?list=${playlistId}.
      
      Instructions:
      1. Find the playlist page and look at the video list.
      2. Extract the 'title' and the unique YouTube video 'url' for EVERY video you see.
      3. Double-check that you don't repeat the same URL for different titles.
      4. If there are 4 videos, I expect 4 objects in the JSON array.
      5. Return ONLY a JSON array of objects with { "title": "...", "url": "...", "description": "..." }.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
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
      const data = JSON.parse(result.text || "[]");
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

  const [examPrep, setExamPrep] = useState<Exam | null>(null);

  // Exam Mode Handlers
  const handleStartExam = async (exam: Exam) => {
    if (exam.isPremium && !firestoreUser?.hasPremiumAccess && userRole !== 'admin') {
      setGlobalError("🔒 This Exam is for Premium users only. Contact admin for access.");
      return;
    }
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
      handleFirestoreError(error, OperationType.WRITE, 'attempts/leaderboards', setGlobalError);
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
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
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
    isPremium: false,
    tags: [],
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
    thumbnail: '',
    isPremium: false
  });
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    title: '',
    class: 'Class 9',
    subject: 'Math',
    chapter: '',
    chapterNameCustom: '',
    topicIds: [],
    examType: 'mcq',
    timeLimit: 30,
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
    chapter: '',
    topicId: ''
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

  const getSubjectsForClass = (className: string) => {
    const matchedClass = dynamicClasses.find(c => c.name === className);
    if (!matchedClass) return [];
    return dynamicSubjects.filter(s => s.classId === matchedClass.id);
  };

  const getChaptersForSubject = (subjectName: string, className: string) => {
    const matchedClass = dynamicClasses.find(c => c.name === className);
    if (!matchedClass) return [];
    // Subject names might not be unique globally but unique per class
    const matchedSubject = dynamicSubjects.find(s => s.name === subjectName && s.classId === matchedClass.id);
    if (!matchedSubject) return [];
    return dynamicChapters.filter(c => c.subjectId === matchedSubject.id);
  };

  const getTopicsForChapter = (chapterName: string, subjectName: string, className: string) => {
    const matchedClass = dynamicClasses.find(c => c.name === className);
    if (!matchedClass) return [];
    const matchedSubject = dynamicSubjects.find(s => s.name === subjectName && s.classId === matchedClass.id);
    if (!matchedSubject) return [];
    const matchedChapter = dynamicChapters.find(c => c.name === chapterName && c.subjectId === matchedSubject.id);
    if (!matchedChapter) return [];
    return dynamicTopics.filter(t => t.chapterId === matchedChapter.id);
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
        setFirestoreUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setFirestoreUser(null);
      return;
    }

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

  useEffect(() => {
    // Listen for academic classes
    const classesUnsubscribe = onSnapshot(
      query(collection(db, 'academic_classes'), orderBy('order', 'asc')), 
      (snapshot) => {
        setDynamicClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicClassInfo)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'academic_classes', setGlobalError)
    );

    // Listen for subjects
    const subjectsUnsubscribe = onSnapshot(
      query(collection(db, 'subjects'), orderBy('order', 'asc')), 
      (snapshot) => {
        setDynamicSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicSubject)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'subjects', setGlobalError)
    );

    // Listen for chapters
    const chaptersUnsubscribe = onSnapshot(
      query(collection(db, 'chapters'), orderBy('order', 'asc')), 
      (snapshot) => {
        setDynamicChapters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicChapter)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'chapters', setGlobalError)
    );

    // Listen for topics
    const topicsUnsubscribe = onSnapshot(
      query(collection(db, 'topics'), orderBy('order', 'asc')), 
      (snapshot) => {
        setDynamicTopics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicTopic)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'topics', setGlobalError)
    );

    return () => {
      classesUnsubscribe();
      subjectsUnsubscribe();
      chaptersUnsubscribe();
      topicsUnsubscribe();
    };
  }, []);

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
    if (isAuthLoading) return; // Prevent multiple clicks/popups
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // Sync is now handled by the useEffect on 'user' state
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        handleAuthError(error);
      } else {
        console.log("Login popup closed/cancelled by user or app.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailLogin = async (email: string, pass: string) => {
    setAuthError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError("Please enter your email.");
      return;
    }
    setIsAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, pass);
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (name: string, email: string, pass: string, academicClass: AcademicClass) => {
    setAuthError(null);
    const trimmedEmail = email.trim();
    if (!name || !trimmedEmail || !pass) {
      setAuthError("All fields are required.");
      return;
    }
    
    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    setIsAuthLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, trimmedEmail, pass);
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
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError("Please enter your email address first.");
      throw new Error("Email required");
    }
    setIsAuthLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
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
    
    // Extract error code - Firebase errors can be objects with a 'code' property
    const errorCode = error.code || (error.message && error.message.match(/\((auth\/[^)]+)\)/)?.[1]);
    
    if (errorCode === 'auth/unauthorized-domain') {
      message = "Domain not authorized. Please add this URL to 'Authorized domains' in Firebase Console.";
    } else if (errorCode === 'auth/popup-blocked') {
      message = "Login popup blocked. Please enable popups in your browser settings to continue.";
    } else if (errorCode === 'auth/cancelled-popup-request') {
      message = "Login request cancelled. Please try clicking the login button again.";
    } else if (errorCode === 'auth/popup-closed-by-user') {
      message = "Login window was closed. Please try again.";
    } else if (errorCode === 'auth/email-already-in-use') {
      message = "This email is already in use! Try logging in or use 'Forgot Password' if you don't remember your password.";
    } else if (errorCode === 'auth/weak-password') {
      message = "Password is too weak. Please use at least 6 characters.";
    } else if (errorCode === 'auth/invalid-email') {
      message = "The email address you entered is not valid. Please check for typos.";
    } else if (errorCode === 'auth/user-not-found') {
      message = "No account found with this email. Please sign up first!";
    } else if (errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential' || errorCode === 'auth/invalid-login-credentials' || errorCode === 'auth/user-disabled') {
      message = "Incorrect email or password. Please try again or sign up if you're new!";
    } else if (errorCode === 'auth/account-exists-with-different-credential') {
      message = "An account already exists with this email but was created using a different method (like Google). Please use that method to log in.";
    } else if (errorCode === 'auth/operation-not-allowed') {
      message = "This sign-in method is not enabled. Please contact support.";
    } else if (errorCode === 'auth/invalid-phone-number') {
      message = "Invalid phone number format. Please include country code (e.g., +880...)";
    } else if (errorCode === 'auth/invalid-verification-code') {
      message = "Invalid verification code. Please check and try again.";
    } else if (errorCode === 'auth/too-many-requests') {
      message = "Too many failed attempts. Please try again in a few minutes.";
    } else if (error.message) {
      // Fallback to error message if we don't recognize the code but have a message
      message = error.message;
    }
    
    setAuthError(message);
  };

  useEffect(() => {
    // We'll initialize reCAPTCHA right before we actually need it to ensure the container is ready
    // and correctly attached to the DOM.
    return () => {
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch(e) {}
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const handlePhoneSignIn = async (phoneNumber: string) => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      // Clear any existing verifier to be safe
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch(e) {}
        recaptchaVerifierRef.current = null;
      }

      // Ensure language is set
      auth.languageCode = 'en';

      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'normal',
        callback: () => {
          console.log("reCAPTCHA solved");
        },
        'expired-callback': () => {
          console.warn("reCAPTCHA expired");
          if (recaptchaVerifierRef.current) {
            try { recaptchaVerifierRef.current.clear(); } catch(e) {}
            recaptchaVerifierRef.current = null;
          }
        }
      });

      // Render manually to catch errors early
      await recaptchaVerifierRef.current.render();

      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifierRef.current);
      setConfirmationResult(result);
      return result;
    } catch (error: any) {
      console.error("Phone sign in error:", error);
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch(e) {}
        recaptchaVerifierRef.current = null;
      }
      
      let message = "Phone authentication failed.";
      if (error.code === 'auth/captcha-check-failed') {
        message = "reCAPTCHA verification failed. Please check the widget below.";
      } else if (error.code === 'auth/invalid-phone-number') {
        message = "The phone number is invalid. Use E.164 format (e.g. +8801700000000).";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Too many attempts (Quota exceeded). Please try again later or use Google Login.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Phone sign-in is not enabled in Firebase Console. Please enable it!";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = `Domain ${window.location.hostname} is not authorized in Firebase Console.`;
      } else {
        message = error.message || "Could not send OTP. Check your connection/number.";
      }
      setAuthError(message);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (!confirmationResult) throw new Error("No confirmation result");
      await confirmationResult.confirm(otp);
      setConfirmationResult(null);
    } catch (error: any) {
      handleAuthError(error);
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
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

  const classes: (string | 'All')[] = useMemo(() => {
    if (dynamicClasses.length > 0) {
      return ['All', ...dynamicClasses.map(c => c.name)];
    }
    return [
      'All', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
      'SSC', 'HSC', 'Admission', 'Job Prep', 'General',
      'Engineering Admission-science', 'Medical Admission-science', 'Varsity Admission-science', 
      'Varsity Admission-humanities', 'Varsity Admission-commerce'
    ];
  }, [dynamicClasses]);
  
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

  const subjectsFilterList = useMemo(() => ['All', ...currentSubjects], [currentSubjects]);
  const examSubjectsFilterList = useMemo(() => ['All', ...examSubjects], [examSubjects]);
  const questionSubjectsFilterList = useMemo(() => ['All', ...questionSubjects], [questionSubjects]);

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

  const renderContentCard = (item: ContentItem) => {
    const isLocked = item.isPremium && !firestoreUser?.hasPremiumAccess && userRole !== 'admin';
    
    return (
      <TiltContainer className="h-full">
        <motion.div
          key={item.id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="h-full relative overflow-visible"
        >
          {/* Main Card Content */}
          <Card className={`flex flex-col h-full group border-none bg-white dark:bg-zinc-900/40 backdrop-blur-md overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 ${isLocked ? 'filter grayscale-[0.2]' : ''}`}>
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
                  className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out z-10 ${isLocked ? 'blur-sm opacity-50' : ''}`} 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    console.warn(`[IMAGE] Failed to load thumbnail for: ${item.title}. URL: ${item.thumbnail}`);
                    if (e.currentTarget) {
                      e.currentTarget.style.opacity = '0.4';
                    }
                  }}
                />
              )}

              {/* Locked Overlay */}
              {isLocked && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-4 text-center">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-amber-500/30 mb-3"
                  >
                    <Lock size={20} fill="currentColor" />
                  </motion.div>
                  <p className="text-white text-[10px] font-black uppercase tracking-widest leading-tight">Premium Content</p>
                  <p className="text-zinc-200 text-[8px] font-bold mt-1">Upgrade to reach this resource</p>
                </div>
              )}

              {/* YouTube Play Button Overlay */}
              {item.category === 'YouTube Classes' && !isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors duration-300 z-20">
                  <div className="w-12 h-12 bg-red-600/90 rounded-full flex items-center justify-center text-white shadow-2xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                    <Youtube size={24} fill="currentColor" />
                  </div>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-[45]">
                <div className="flex gap-1.5">
                  <Badge className="bg-blue-600 text-white text-[9px] px-2 py-1 shadow-lg backdrop-blur-md border-none">
                    {item.category.toUpperCase()}
                  </Badge>
                  <Badge className="bg-zinc-900/80 text-white text-[9px] px-2 py-1 shadow-lg backdrop-blur-md border-none">
                    {item.academicClass === 'Class 10' ? 'SSC' : item.academicClass === 'Class 12' ? 'HSC' : item.academicClass}
                  </Badge>
                </div>
                {item.isPremium && (
                  <Badge className={`${isLocked ? 'bg-amber-600' : 'bg-amber-500'} text-white text-[9px] px-2 py-1 shadow-lg backdrop-blur-md border-none flex items-center gap-1 w-fit animate-pulse`}>
                    <Lock size={10} fill="currentColor" /> PREMIUM
                  </Badge>
                )}
              </div>
            </div>

            <div className={`p-4 flex-1 flex flex-col ${isLocked ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 text-[9px]">
                  {item.academicClass === 'Class 10' ? 'SSC' : item.academicClass === 'Class 12' ? 'HSC' : item.academicClass}
                </Badge>
                <Badge className="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20 text-[9px]">
                  {item.subject}
                </Badge>
              </div>
              <h4 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white mb-2 line-clamp-1 leading-tight tracking-tight">{item.title}</h4>
              <p className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-xs mb-4 line-clamp-2 leading-relaxed font-bold italic">
                {item.description}
              </p>
              
              <div className="flex items-center gap-2 mt-auto relative z-50">
                <Button 
                  className={`flex-1 text-xs sm:text-sm py-2 sm:py-2.5 rounded-xl ${isLocked ? 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500' : ''}`} 
                  size="sm" 
                  icon={isLocked ? Lock : (item.category === 'YouTube Classes' ? Youtube : (item.category === 'Books' ? Download : (item.category === 'Practice Sheet' ? Eye : FileText)))} 
                  onClick={() => {
                    if (isLocked) {
                      setGlobalError("🔒 Locked! Please upgrade to premium to access this specific content.");
                      return;
                    }
                    if (item.category === 'YouTube Classes') setActiveVideo(getYouTubeId(item.url));
                    else setActivePdf({ url: item.url, isRestricted: item.category === 'Practice Sheet' });
                  }}
                >
                  {isLocked ? 'Unlock Now' : (item.category === 'YouTube Classes' ? 'Watch' : (item.category === 'Books' ? 'Download PDF' : (item.category === 'Practice Sheet' ? 'Read' : 'View')))}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => toggleBookmark(item.id)}
                  className={`rounded-xl h-10 w-10 ${bookmarks.includes(item.id) ? 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800' : 'text-zinc-400 border-zinc-200 dark:border-zinc-800'}`}
                >
                  <Bookmark size={16} fill={bookmarks.includes(item.id) ? 'currentColor' : 'none'} strokeWidth={2.5} />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </TiltContainer>
    );
  };

  const renderPlaylistCard = (playlist: Playlist) => {
    const isLocked = playlist.isPremium && !firestoreUser?.hasPremiumAccess && userRole !== 'admin';
    
    return (
      <TiltContainer className="h-full">
        <motion.div
          key={playlist.id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="cursor-pointer relative overflow-visible"
          onClick={() => {
            if (isLocked) {
              setGlobalError("🔒 This Playlist is for Premium users only. Join parodorshhi PRO for access!");
              return;
            }
            setActiveVideo(null);
            setActivePlaylist(playlist);
          }}
        >
      <Card className={`flex flex-col h-full group border-none bg-white dark:bg-zinc-900/40 backdrop-blur-md overflow-hidden relative ${isLocked ? 'filter grayscale-[0.2]' : ''}`}>
        <div className="aspect-[16/10] overflow-hidden relative bg-zinc-100 dark:bg-zinc-800">
          <img 
            src={playlist.thumbnail ? getDirectImageUrl(playlist.thumbnail) : `https://img.youtube.com/vi/playlist/mqdefault.jpg`} 
            alt={playlist.title} 
            className={`absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out ${isLocked ? 'blur-sm opacity-50' : ''}`} 
            referrerPolicy="no-referrer"
            onError={(e) => {
              console.warn(`[IMAGE] Failed to load playlist thumbnail: ${playlist.title}. URL: ${playlist.thumbnail}`);
              if (e.currentTarget) {
                e.currentTarget.style.opacity = '0.4';
              }
            }}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />
          
          {/* Locked Overlay */}
          {isLocked && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md p-4 text-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-amber-500/30 mb-2"
              >
                <Lock size={18} fill="currentColor" />
              </motion.div>
              <p className="text-white text-[9px] font-black uppercase tracking-widest leading-tight">Premium Playlist</p>
            </div>
          )}
          
          {/* Playlist Stack Effect */}
          <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white z-20">
            <Youtube size={24} className="mb-1" />
            <span className="text-xs font-black">
              {playlist.type === 'youtube' ? 'YT' : (playlist.videoIds?.length || 0)}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-tighter">VIDEOS</span>
          </div>

          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-30">
            <Badge className="bg-red-600 text-white text-[9px] px-2 py-1 shadow-lg border-none w-fit uppercase font-black">
              PLAYLIST
            </Badge>
            {playlist.isPremium && (
              <Badge className="bg-amber-500 text-white text-[9px] px-2 py-1 shadow-lg backdrop-blur-md border-none flex items-center gap-1 w-fit animate-pulse">
                <Lock size={10} fill="currentColor" /> PREMIUM
              </Badge>
            )}
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

        <div className={`p-4 flex-1 flex flex-col ${isLocked ? 'opacity-60' : ''}`}>
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
  </TiltContainer>
);
};

  const triggerHighlight = (id: string) => {
    setHighlightedSection(id);
    setTimeout(() => setHighlightedSection(null), 2000);
  };

  const renderSection = (title: string, category: Category, icon: any, addLabel: string, id: string) => {
    const sectionContents = filteredContents.filter(c => c.category === category).slice(0, 12);
    const containerId = `scroll-${id}`;
    
    if (sectionContents.length === 0 && searchQuery) return null;

    return (
    <ScrollSection 
      id={id} 
      className={`space-y-4 sm:space-y-8 p-3 sm:p-10 rounded-2xl sm:rounded-[48px] transition-all duration-700 relative group/section w-full max-w-full ${highlightedSection === id ? 'animate-section-flash ring-2 ring-blue-500/40 bg-blue-50/5' : ''}`}
    >
      <div className="absolute top-4 right-20 sm:top-16 sm:right-12 pointer-events-none scale-100 origin-top-right z-30 opacity-100">
        <div className="pointer-events-auto">
          <MiniRobot />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 max-w-full overflow-hidden relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg shrink-0">
            {icon}
          </div>
          <h3 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white truncate min-w-0">{title}</h3>
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
            <div key={item.id || `content-${sIdx}`} className="min-w-[200px] sm:min-w-[320px] w-[200px] sm:w-[320px] snap-start">
              {renderContentCard(item)}
            </div>
          ))}
        </div>
      </ScrollSection>
    );
  };

  const renderPlaylistsSection = () => {
    const filteredPlaylists = playlists.filter(p => {
      const matchesClass = classFilter === 'All' || p.academicClass === classFilter;
      const matchesSubject = subjectFilter === 'All' || p.subject === subjectFilter;
      const matchesType = contentTypeFilter === 'free' ? !p.isPremium : p.isPremium;
      return matchesClass && matchesSubject && matchesType;
    });

    const displayPlaylists = filteredPlaylists.slice(0, 12);
    const containerId = "scroll-playlists";

    if (filteredPlaylists.length === 0 && searchQuery) return null;
    if (filteredPlaylists.length === 0 && !canUpload) return null;

    return (
      <ScrollSection className="space-y-8 p-4 sm:p-10 rounded-2xl sm:rounded-[48px] transition-all duration-700 relative group/section w-full max-w-full">
        <div className="absolute top-4 right-20 sm:top-16 sm:right-12 pointer-events-none scale-100 origin-top-right z-30 opacity-100">
          <div className="pointer-events-auto">
            <MiniRobot />
          </div>
        </div>
        <div className="flex items-center justify-between relative z-10">
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

        <div id={containerId} className="flex overflow-x-auto pb-6 sm:pb-2 gap-4 sm:gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth">
          {displayPlaylists.map((playlist, pIdx) => (
            <div key={playlist.id || `playlist-${pIdx}`} className="min-w-[200px] sm:min-w-[320px] w-[200px] sm:w-[320px] snap-start">
              {renderPlaylistCard(playlist)}
            </div>
          ))}
          {displayPlaylists.length === 0 && canUpload && (
            <div 
              onClick={() => setIsAddingPlaylist(true)}
              className="min-w-[200px] sm:min-w-[320px] w-[200px] sm:w-[320px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[32px] flex flex-col items-center justify-center p-8 text-zinc-400 hover:border-blue-500 hover:text-blue-500 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20">
                <Plus size={24} />
              </div>
              <p className="font-bold text-sm">Create First Playlist</p>
            </div>
          )}
        </div>
      </ScrollSection>
    );
  };

  const renderExternalResources = () => {
    if (externalResources.length === 0 && userRole !== 'admin') return null;
    const containerId = "scroll-external";

    return (
      <section className="space-y-6 relative group/section overflow-visible w-full max-w-full">
        <div className="absolute top-4 right-20 sm:top-16 sm:right-12 pointer-events-none scale-100 origin-top-right z-30 opacity-100">
          <div className="pointer-events-auto">
            <MiniRobot />
          </div>
        </div>
        <div className="flex items-center justify-between relative z-10">
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
            <div key={resource.id || `ext-${erIdx}`} className="min-w-[180px] w-[180px] snap-start">
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
                        if (e.currentTarget) {
                          e.currentTarget.style.opacity = '0';
                        }
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
    <div className="py-6 sm:py-8 flex flex-col items-center w-full relative">
      {/* Ambient background for filter section */}
      <div className="absolute inset-0 bg-blue-50/20 dark:bg-zinc-900/10 blur-3xl -z-10 rounded-full scale-90" />
      
      <div className="space-y-10 w-full max-w-6xl px-4">
        <div className="flex flex-col items-center justify-center gap-4 w-full">
          <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-bold">
            Academic Level
          </Badge>
          <div className="flex sm:flex-wrap gap-2 justify-start sm:justify-center w-full max-w-4xl mx-auto px-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
            {classes.map(c => (
              <motion.button 
                key={c}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setClassFilter(c)}
                className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-bold transition-all duration-300 shadow-sm border shrink-0 ${
                  classFilter === c 
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xl shadow-zinc-900/10 dark:shadow-white/10' 
                  : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md'
                }`}
              >
                <span className="whitespace-nowrap">{c}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 w-full">
          <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-bold">
            Subject Focus
          </Badge>
          <div className="flex sm:flex-wrap gap-2 justify-start sm:justify-center w-full max-w-4xl mx-auto px-2 overflow-x-auto no-scrollbar pb-2 sm:pb-0">
            {subjectsFilterList.map(s => {
              const Icon = subjectIcons[s];
              return (
                <motion.button 
                  key={s}
                  whileHover={{ scale: 1.05, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSubjectFilter(s)}
                  className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-bold transition-all duration-300 shadow-sm border shrink-0 ${
                    subjectFilter === s 
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-transparent shadow-xl shadow-zinc-900/10 dark:shadow-white/10' 
                    : 'bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-800 border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md'
                  }`}
                >
                  {Icon && <Icon size={14} className={subjectFilter === s ? 'text-blue-400' : 'text-zinc-400'} strokeWidth={2.5} />}
                  <span className="whitespace-nowrap">{s}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {(user && (firestoreUser?.hasPremiumAccess === true || userRole === 'admin')) && (
          <div className="flex flex-col items-center justify-center gap-6 w-full pt-4">
            <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-none px-3 py-1 text-[9px] uppercase tracking-[0.25em] font-black">
              Content Access
            </Badge>
            
            <div className="relative flex p-1 bg-zinc-200/50 dark:bg-zinc-800/50 backdrop-blur-xl rounded-2xl w-full max-w-[280px] border border-zinc-200 dark:border-zinc-700 shadow-inner group/toggle">
              {/* Animated Slider */}
              <motion.div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl shadow-lg z-0 ${
                  contentTypeFilter === 'free' 
                  ? 'bg-blue-600 left-1' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 right-1'
                }`}
                layoutId="accessToggle"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
              
              <button 
                onClick={() => setContentTypeFilter('free')}
                className={`relative z-10 flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-colors duration-300 cursor-pointer ${
                  contentTypeFilter === 'free' ? 'text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Free
              </button>
              <button 
                onClick={() => setContentTypeFilter('premium')}
                className={`relative z-10 flex-1 py-2.5 text-xs font-black uppercase tracking-widest transition-colors duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                  contentTypeFilter === 'premium' ? 'text-white' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                {contentTypeFilter !== 'premium' && <Lock size={12} className="opacity-50" />}
                Premium
                {contentTypeFilter === 'premium' && (
                  <motion.span 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="bg-white/20 px-1.5 py-0.5 rounded-md text-[8px]"
                  >
                    PRO
                  </motion.span>
                )}
              </button>
            </div>
          </div>
        )}
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

      <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar scroll-smooth">
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
        <button 
          onClick={() => setAdminTab('academics')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${adminTab === 'academics' ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        >
          Academic Info
        </button>
      </div>

      {adminTab === 'academics' ? (
        <AcademicManagement db={db} />
      ) : adminTab === 'resources' ? (
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
                    if (e.currentTarget) {
                      e.currentTarget.style.opacity = '0';
                    }
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
                <FileIcon size={40} />
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
                    if (e.currentTarget) {
                      e.currentTarget.style.opacity = '0';
                    }
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
              <div className="flex items-center gap-6 shrink-0">
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Premium Access</span>
                  <button 
                    onClick={() => handleTogglePremiumAccess(u.id, u.hasPremiumAccess)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${u.hasPremiumAccess ? 'bg-amber-500' : 'bg-zinc-200 dark:bg-zinc-700'} cursor-pointer`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.hasPremiumAccess ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
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
                {classes.map(c => (
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
                {questionSubjectsFilterList.map(s => (
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
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{formatDate(f.createdAt)}</span>
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
    <ScrollSection className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Active Leaderboard</h2>
          <p className="text-sm sm:text-base text-zinc-500 font-medium">Global rankings across all subjects and exams.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-1 bg-white/50 dark:bg-zinc-900/50 max-w-full overflow-x-auto no-scrollbar">
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

      <TiltContainer>
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
    </TiltContainer>
      
      <div className="bg-zinc-50 dark:bg-zinc-800/80 p-6 rounded-[32px] text-center border border-zinc-100 dark:border-zinc-800">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
           Ranking logic is strictly: Highest Score &gt; Lowest Time Taken &gt; Earliest First Submission
        </p>
      </div>
    </ScrollSection>
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
                  <span className="text-[10px] font-black uppercase tracking-widest">{formatDate(firestoreUser?.createdAt || Date.now())}</span>
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
                      {classes.filter(c => c !== 'All').map(c => (
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
                  if (e.currentTarget) {
                    e.currentTarget.style.opacity = '0';
                  }
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
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{formatDate(item.createdAt)}</span>
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
                      if (e.currentTarget) {
                        e.currentTarget.style.opacity = '0';
                      }
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
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{formatDate(playlist.createdAt)}</span>
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
          <p className="text-zinc-500 font-bold">আপনি এখনও কোনো রিসোর্স আপলোড করেননি।</p>
          {canUpload && <Button variant="outline" onClick={() => setIsAdding(true)}>আপলোড শুরু করুন</Button>}
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
    let feedback = "আরও উন্নতি প্রয়োজন";
    let colorClass = "text-red-500";
    let bgClass = "bg-red-500/10";
    
    if (percentage >= 80) {
      feedback = "চমৎকার! আপনি এই বিষয়ে পারদর্শী।";
      colorClass = "text-green-500";
      bgClass = "bg-green-500/10";
    } else if (percentage >= 50) {
      feedback = "ভালো হয়েছে! আরও অগ্রগতির জন্য প্র্যাকটিস চালিয়ে যান।";
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
          <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">পরীক্ষা সম্পন্ন হয়েছে!</h2>
          <p className="text-zinc-500 dark:text-zinc-400">{activeExam.title} সাফল্যের সাথে শেষ করার জন্য অভিনন্দন।</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-8 text-center space-y-2">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">স্কোর</p>
            <h4 className="text-4xl font-black text-zinc-900 dark:text-white">{examResults.score} / {examResults.maxScore}</h4>
          </Card>
          <Card className="p-8 text-center space-y-2">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">শতকরা হার</p>
            <h4 className="text-4xl font-black text-zinc-900 dark:text-white">{Math.round(percentage)}%</h4>
          </Card>
          <Card className="p-8 text-center space-y-2">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">মতামত</p>
            <div className={`px-4 py-2 rounded-xl text-xs font-bold ${bgClass} ${colorClass}`}>
              {feedback}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-white px-2">সমাধান দেখুন</h3>
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
                      {q.type === 'mcq' ? (examResults.answers[idx] === q.correctAnswer ? 'সঠিক' : 'ভুল') : 'সম্পন্ন'}
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
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest underline decoration-blue-500 underline-offset-4">আপনার উত্তর:</p>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl text-sm italic text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      {examResults.answers[idx] || "কোনো উত্তর দেওয়া হয়নি।"}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-10">
          <Button onClick={() => setView('home')} size="lg" icon={Home} className="rounded-full px-12">
            হোমে ফিরে যান
          </Button>
        </div>
      </div>
    );
  };

  const renderExamMode = () => {
    if (!activeExam) {
      const subjects = examSubjectsFilterList;
      const classesList = classes;

      const filteredExams = allExams.filter(exam => {
        const matchesSubject = examSubjectFilter === 'All' || exam.subject === examSubjectFilter;
        const matchesClass = examClassFilter === 'All' || exam.class === examClassFilter;
        const matchesChapter = !examChapterFilter || examChapterFilter === 'All' || (exam.chapter || '').toLowerCase() === examChapterFilter.toLowerCase();
        const matchesType = contentTypeFilter === 'free' ? !exam.isPremium : exam.isPremium;
        return matchesSubject && matchesClass && matchesChapter && matchesType;
      });

      return (
        <ScrollSection className="max-w-6xl mx-auto px-4 py-6 sm:py-10 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">মক টেস্ট সেন্টার</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">আমাদের নির্বাচিত পরীক্ষাগুলোর মাধ্যমে নিজেকে যাচাই করুন। আপনার মেধা যাচাই করুন, সময় সচেতনতা বৃদ্ধি করুন এবং তাৎক্ষণিক ফলাফল পান।</p>
          </div>

          {/* Exam Filters */}
          <Card className="p-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-3xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-[40px] shadow-sm space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">বিষয় নির্বাচন করুন</label>
                <Badge className="bg-blue-500/10 text-blue-600 border-none">{examSubjectFilter}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {subjects.map(s => (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
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
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">শ্রেণী নির্বাচন করুন</label>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-none">{examClassFilter}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {classes.map(c => (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
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
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">উপলব্ধ অধ্যায়সমূহ</label>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none">{examChapterFilter || 'সব অধ্যায়'}</Badge>
              </div>
              {chapters.length > 1 ? (
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  {chapters.map(ch => (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={ch}
                      onClick={() => setExamChapterFilter(ch)}
                      className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-300 ${
                        (examChapterFilter === ch || (ch === 'All' && !examChapterFilter))
                        ? 'bg-emerald-600 text-white shadow-[0_10px_20px_-5px_rgba(5,150,105,0.4)] scale-105' 
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {ch}
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic ml-2">এই নির্বাচনের জন্য কোনো নির্দিষ্ট অধ্যায় পাওয়া যায়নি।</p>
              )}
            </div>

            <div className="pt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50">
               <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                 <ClipboardList size={18} />
                 <span>{filteredExams.length}টি পরীক্ষা পাওয়া গেছে</span>
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
                 ফিল্টার মুছে ফেলুন
               </Button>
            </div>
          </Card>
          
          {filteredExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredExams.map((exam, feIdx) => (
                <div key={exam.id || `exam-${feIdx}`}>
                  <TiltContainer className="h-full">
                    <Card className="p-8 space-y-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all border border-zinc-200/50 dark:border-zinc-800/50 hover:border-blue-500/30 group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                          <ClipboardList size={24} />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge>{exam.timeLimit} মি.</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-bold text-zinc-900 dark:text-white line-clamp-1">{exam.title}</h4>
                        <p className="text-sm text-zinc-500 line-clamp-2">{exam.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{exam.class}</Badge>
                        <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{exam.subject}</Badge>
                        {exam.isPremium && (
                          <Badge className="bg-amber-500 text-white border-none flex items-center gap-1 font-black animate-pulse">
                            <Lock size={10} fill="currentColor" /> প্রিমিয়াম
                          </Badge>
                        )}
                      </div>
                    <div className="flex items-center gap-2">
                      {exam.isPremium && !firestoreUser?.hasPremiumAccess && userRole !== 'admin' ? (
                        <Button 
                          className="rounded-2xl flex-1 h-12 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-500/20" 
                          onClick={() => setGlobalError("🔒 This Exam requires a Premium subscription. Unlock Parodorshhi PRO to continue!")} 
                          icon={Lock}
                        >
                          Unlock Exam
                        </Button>
                      ) : (
                        <Button 
                          className="rounded-2xl flex-1 h-12 bg-blue-600 hover:bg-blue-700" 
                          onClick={() => handleStartExam(exam)} 
                          icon={Play}
                        >
                          Start Exam
                        </Button>
                      )}
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
                  </TiltContainer>
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
        </ScrollSection>
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

        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-8 items-start relative">
          {/* Left: Question List Area */}
          <div className="flex-1 space-y-12 py-10">
            {questions.map((q: any, idx: number) => (
              <div 
                key={q.id}
                id={`question-${idx}`}
                className="w-full max-w-3xl space-y-8 pb-12 border-b border-zinc-100 dark:border-zinc-800 last:border-0 scroll-mt-32"
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

          {/* Right: Sidebar Navigator */}
          <aside className="hidden lg:block w-72 sticky top-32 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200/50 dark:border-zinc-800/50 p-6 shadow-sm">
              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Question Navigator</h4>
              <div className="grid grid-cols-4 gap-2">
                {questions.map((q: any, i: number) => {
                  const isAnswered = examAnswers[q.id] !== undefined && examAnswers[q.id] !== '';
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const el = document.getElementById(`question-${i}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={`aspect-square rounded-xl text-xs font-black transition-all border-2
                        ${isAnswered 
                          ? 'border-green-600/20 bg-green-500/10 text-green-600' 
                          : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-400'}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-blue-600 rounded-[32px] p-6 text-white shadow-xl shadow-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <BrainIcon size={20} />
                <h4 className="text-xs font-black uppercase tracking-widest">Exam Stats</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase opacity-60">Completion</span>
                  <span className="text-sm font-black">{Math.round((answeredCount / questions.length) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-white font-bold"
                    initial={{ width: 0 }}
                    animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </aside>
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
    <div className={`space-y-10 overflow-x-hidden w-full max-w-full relative transition-colors duration-1000 ${contentTypeFilter === 'premium' ? 'bg-indigo-950/5 dark:bg-indigo-950/20' : ''}`}>
      {/* Hero Section */}
      {!selectedCategory && (
        <ScrollSection 
          className="relative py-12 sm:py-24 overflow-hidden rounded-2xl sm:rounded-[40px] shadow-2xl perspective-1000 w-full"
          style={{ background: 'linear-gradient(95deg, #5de0e6, #004aad)' }}
        >
          {/* 3D Floating Objects */}
          <motion.div 
            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 right-[15%] text-5xl opacity-40 select-none hidden md:block z-30"
            style={{ transform: "translateZ(80px)" }}
          >
            🎓
          </motion.div>
          <motion.div 
            animate={{ y: [15, 0, 15], rotate: [0, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-20 left-[10%] text-5xl opacity-40 select-none hidden md:block z-30"
            style={{ transform: "translateZ(80px)" }}
          >
            📚
          </motion.div>
          
          {/* Animated Background Elements */}
          <div className="absolute top-[-20%] left-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-primary-palette/30 rounded-full blur-[80px] sm:blur-[120px] animate-pulse z-0 pointer-events-none"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-secondary-palette/20 rounded-full blur-[80px] sm:blur-[120px] animate-pulse z-0 pointer-events-none" style={{ animationDelay: '1s' }}></div>
          
          <div className="max-w-3xl mx-auto px-4 sm:px-8 relative z-20 text-center" style={{ transform: "translateZ(50px)" }}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <Badge className="bg-white/20 text-white border border-white/20 mb-6 sm:mb-8 py-1.5 sm:py-2 px-4 sm:px-5 text-[10px] sm:text-[11px] backdrop-blur-md italic font-medium">
                ✨ Made for Bangladeshi Students
              </Badge>
              <h2 className="text-lg sm:text-4xl md:text-6xl font-extrabold text-white mb-4 sm:mb-8 leading-[1.1] tracking-tight break-words px-2">
                Free Study Materials<br />
                <span className="text-white opacity-95">Every Student</span> 📚
              </h2>
              <p className="text-white/90 text-sm sm:text-lg mb-6 sm:mb-12 max-w-xl mx-auto leading-relaxed font-semibold">
                Access notes, textbook PDFs, board question papers, and live video classes — all in one place, completely free.
              </p>

              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 max-w-2xl mx-auto shadow-2xl transform-gpu"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10">
                  {[
                    { label: 'Resources', value: '18' },
                    { label: 'Classes', value: '2' },
                    { label: 'Subjects', value: '6' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center py-2 sm:py-0 border-b last:border-b-0 sm:border-b-0 border-white/10">
                      <div className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">{stat.value}</div>
                      <div className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </ScrollSection>
      )}

      <div className="w-full max-w-full px-3 sm:px-6 space-y-10 sm:space-y-16 pb-20 overflow-x-hidden">
        {renderFilters()}

        {contentTypeFilter === 'premium' && (user && (firestoreUser?.hasPremiumAccess === true || userRole === 'admin')) && (
          <ScrollSection className="w-full max-w-6xl mx-auto px-4 py-8">
            <div className="relative group cursor-pointer" onClick={handlePremiumExamClick}>
              {/* Premium Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-[40px] blur-xl opacity-25 group-hover:opacity-40 transition-all duration-700" />
              
              <Card className="relative overflow-hidden bg-zinc-900 border-none rounded-[40px] p-8 sm:p-14 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-palette/20 rounded-full blur-[100px] -mr-40 -mt-40 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px] -ml-20 -mb-20" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                  <div className="max-w-xl space-y-8 text-center md:text-left">
                    <div className="inline-flex items-center gap-3 px-5 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
                      <Sparkles size={18} className="text-amber-400" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/90">Elite Intelligence Service</span>
                    </div>
                    
                    <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-[1.05]">
                      Elite Customize <br /> 
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Exam System</span>
                    </h2>
                    
                    <p className="text-zinc-400 text-lg font-medium leading-relaxed">
                      Architect your own practice sessions with our advanced AI-driven question matrix. Complete control over subjects, chapters, and difficulty.
                    </p>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 sm:gap-6 pt-4">
                      <Button 
                        size="lg" 
                        onClick={handlePremiumExamClick}
                        className="rounded-2xl px-10 py-7 bg-white text-zinc-950 hover:bg-zinc-100 font-black text-lg shadow-xl shadow-white/10 group/btn"
                      >
                        Launch System
                        <Zap size={20} className="ml-2 group-hover:scale-125 transition-transform text-indigo-600" />
                      </Button>
                      <div className="flex flex-col items-center md:items-start">
                        <div className="flex -space-x-3 mb-2">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-9 h-9 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                              <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          <div className="w-9 h-9 rounded-full border-2 border-zinc-900 bg-indigo-600 flex items-center justify-center text-[10px] font-bold">1k+</div>
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Active Pro Students</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative hidden lg:block">
                    <motion.div 
                      animate={{ y: [0, -20, 0] }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      className="relative z-10 w-[340px] h-[340px] bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-[60px] border-4 border-white/5 shadow-2xl p-8 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner">
                          <BrainIcon size={24} />
                        </div>
                        <div className="h-4 w-3/4 bg-white/10 rounded-full" />
                        <div className="h-4 w-1/2 bg-white/5 rounded-full" />
                      </div>
                      
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div className="h-2 flex-1 bg-white/10 rounded-full" />
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between">
                         <div className="flex gap-2">
                           <div className="w-8 h-8 rounded-lg bg-zinc-700" />
                           <div className="w-8 h-8 rounded-lg bg-zinc-700" />
                         </div>
                         <div className="w-12 h-6 bg-indigo-500/20 rounded-full" />
                      </div>
                    </motion.div>
                    
                    {/* Floating Decorative Orbs */}
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], rotate: 360 }}
                      transition={{ duration: 15, repeat: Infinity }}
                      className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full blur-2xl opacity-50" 
                    />
                    <motion.div 
                      animate={{ y: [0, 30, 0] }}
                      transition={{ duration: 8, repeat: Infinity }}
                      className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" 
                    />
                  </div>
                </div>
              </Card>
            </div>
          </ScrollSection>
        )}

        <WaveDivider />
        {/* Featured Exams Section */}
        <ScrollSection id="exams-section" className="space-y-6 sm:space-y-8 group/section relative w-full max-w-full">
          <div className="absolute top-4 right-20 sm:top-16 sm:right-12 pointer-events-none scale-100 origin-top-right z-30 opacity-100">
            <div className="pointer-events-auto">
              <MiniRobot />
            </div>
          </div>
          <div className="flex items-center justify-between relative z-10">
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
          <div id="scroll-exams" className="flex overflow-x-auto pb-6 sm:pb-2 gap-4 sm:gap-6 no-scrollbar snap-x snap-mandatory scroll-smooth">
            {allExams
              .filter(e => contentTypeFilter === 'free' ? !e.isPremium : e.isPremium)
              .slice(0, 10)
              .map((exam, aeIdx) => (
              <div key={`home-exam-${exam.id || aeIdx}`} className="min-w-[200px] sm:min-w-[300px] w-[200px] sm:w-[300px] snap-start">
                <TiltContainer className="h-full">
                  <Card className={`p-5 sm:p-8 h-full flex flex-col space-y-3 sm:space-y-4 hover:shadow-xl transition-all group ${exam.isPremium && !firestoreUser?.hasPremiumAccess && userRole !== 'admin' ? 'border-amber-500/30' : ''}`}>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] sm:text-xs">{exam.subject}</Badge>
                      <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[9px] sm:text-xs">{exam.class}</Badge>
                      <span className="text-[9px] sm:text-xs font-bold text-zinc-400 group-hover:text-indigo-400 transition-colors uppercase tracking-widest">{exam.timeLimit} Min</span>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">{exam.title}</h4>
                    <p className="text-xs sm:text-sm text-zinc-500 line-clamp-2">{exam.description}</p>
                    <div className="flex justify-end pt-2 mt-auto">
                      {exam.isPremium && !firestoreUser?.hasPremiumAccess && userRole !== 'admin' ? (
                        <Button size="sm" onClick={() => setGlobalError("🔒 This is a Premium Exam. Join parodorshhi PRO for access!")} className="rounded-xl px-4 sm:px-6 bg-amber-600 shadow-lg shadow-amber-500/20 text-xs" icon={Lock}>Upgrade</Button>
                      ) : (
                        <Button size="sm" onClick={() => setExamPrep(exam)} className="rounded-xl px-4 sm:px-6 bg-indigo-600 shadow-lg shadow-indigo-500/20 text-xs">Take Test</Button>
                      )}
                    </div>
                  </Card>
                </TiltContainer>
              </div>
            ))}
          </div>
        </ScrollSection>
        <WaveDivider />
        {renderSection('Notes', 'Notes', <FileText className="text-blue-600" size={24} />, 'Add Note', 'notes-section')}
        <WaveDivider />
        {renderSection('Practice Sheets', 'Practice Sheet', <FileText className="text-orange-600" size={24} />, 'Add Practice Sheet', 'practice-section')}
        <WaveDivider />
        {renderSection('Books PDF', 'Books', <BookOpen className="text-green-600" size={24} />, 'Add Book', 'books-section')}
        <WaveDivider />
        {renderSection('Recent Question Papers', 'Question Papers', <History className="text-purple-600" size={24} />, 'Add Paper', 'papers-section')}
        <WaveDivider />
        {renderPlaylistsSection()}
        <WaveDivider />
        {renderSection('YouTube Classes', 'YouTube Classes', <Youtube className="text-red-600" size={24} />, 'Add Video', 'video-section')}
        <WaveDivider />
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
          {filteredContents.length > 0 ? (
            filteredContents.map((content, fcIdx) => {
              const card = renderContentCard(content);
              // Properly clone with index-based key to prevent collisions during filtering
              return React.cloneElement(card as React.ReactElement, {
                key: content.id + '-' + fcIdx
              });
            })
          ) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                <Search size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">No {contentTypeFilter} content found</h3>
                <p className="text-zinc-500 max-w-xs mx-auto">Try adjusting your filters or switching back to the regular material section.</p>
              </div>
            </div>
          )}
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

  const renderPrivacyPolicy = () => (
    <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => setView('home')}
          className="p-2 bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-500/20 transition-all active:scale-90"
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
            onClick={() => setView('home')}
            className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:translate-y-[-4px] transition-all relative z-10 shadow-xl"
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
  const renderTermsOfService = () => (
    <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => setView('home')}
          className="p-2 bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-500/20 transition-all active:scale-90"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Legal Documents</span>
      </div>
      <h1 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white mb-8 tracking-tighter leading-tight">
        Terms of <span className="text-blue-600">Service</span>
      </h1>
      
      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-xl">
          <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            By accessing Parodorshhi, you agree to bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
          </p>
        </section>
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-xl">
          <h2 className="text-2xl font-bold mb-4">2. Use License</h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Permission is granted to temporarily download one copy of the materials (information or software) on Parodorshhi's website for personal, non-commercial transitory viewing only.
          </p>
        </section>
      </div>
      
      <div className="mt-20 pt-10 border-t border-zinc-200 dark:border-zinc-800 text-center">
        <button onClick={() => setView('home')} className="text-blue-600 font-bold uppercase tracking-widest text-xs hover:underline">Back to Home</button>
      </div>
    </div>
  );

  const renderCookiePolicy = () => (
    <div className="max-w-4xl mx-auto px-6 py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-2">
        <button 
          onClick={() => setView('home')}
          className="p-2 bg-blue-500/10 text-blue-600 rounded-full hover:bg-blue-500/20 transition-all active:scale-90"
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
        <button onClick={() => setView('home')} className="text-blue-600 font-bold uppercase tracking-widest text-xs hover:underline">Back to Home</button>
      </div>
    </div>
  );

  const renderFooter = () => (
    <footer className="bg-zinc-900 text-zinc-400 pt-16 pb-32 sm:pb-16 mt-20 border-t border-white/5 w-full overflow-hidden relative z-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-black p-3 rounded-2xl border border-white/10 shadow-lg group">
                <img src="/api/v1/files/input_file_0.png" alt="Parodorshhi Logo" className="h-20 w-auto object-contain brightness-150 contrast-125 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" referrerPolicy="no-referrer" />
              </div>
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
              <li><button onClick={() => { resetToHome(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors text-left cursor-pointer">Home</button></li>
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
                  className="hover:text-white transition-colors text-left cursor-pointer"
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
                  className="hover:text-white transition-colors text-left cursor-pointer"
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
                  className="hover:text-white transition-colors text-left cursor-pointer"
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
                  className="hover:text-white transition-colors text-left cursor-pointer"
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
                  className="hover:text-white transition-colors text-left cursor-pointer"
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
                  className="hover:text-white transition-colors text-left cursor-pointer"
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
                <button onClick={() => setIsFeedbackOpen(true)} className="hover:text-white transition-colors text-left cursor-pointer">Send Feedback</button>
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
          <div className="flex gap-8 relative z-50">
            <button key="privacy" onClick={() => { setView('privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer relative z-10">Privacy Policy</button>
            <button key="terms" onClick={() => { setView('terms'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer relative z-10">Terms of Service</button>
            <button key="cookies" onClick={() => { setView('cookies'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-white transition-colors cursor-pointer relative z-10">Cookie Policy</button>
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
      const matchesType = contentTypeFilter === 'free' ? !item.isPremium : item.isPremium;
      
      if (view === 'saved') return bookmarks.includes(item.id) && matchesSearch;
      return matchesSearch && matchesClass && matchesSubject && matchesCategory && matchesYear && matchesType;
    });
  }, [contents, searchQuery, selectedCategory, classFilter, subjectFilter, yearFilter, view, bookmarks, contentTypeFilter]);

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
      isPremium: item.isPremium || false,
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
          tags: typeof newItem.tags === 'string' ? (newItem.tags as string).split(',').map(t => t.trim()).filter(Boolean) : (newItem.tags || []),
          isPremium: newItem.isPremium || false,
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
          tags: typeof newItem.tags === 'string' ? (newItem.tags as string).split(',').map(t => t.trim()).filter(Boolean) : (newItem.tags || []),
          authorId: user.uid,
          authorEmail: user.email,
          isPremium: newItem.isPremium || false,
          status: userRole === 'admin' ? 'approved' : 'pending',
          createdAt: Date.now(),
        };
        await addDoc(collection(db, 'contents'), itemData);
      }

      setIsAdding(false);
      setIsEditing(false);
      setEditingId(null);
      setNewItem({ 
        category: 'Notes', 
        academicClass: 'Class 9', 
        subject: '', 
        title: '', 
        description: '', 
        url: '', 
        thumbnail: '', 
        isPremium: false,
        tags: [] 
      });
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
            const meta = JSON.parse(metaResponse.text || "{}");
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
        isPremium: newPlaylist.isPremium || false,
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
        thumbnail: '',
        isPremium: false
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

  const handleTogglePremiumAccess = async (userId: string, currentStatus: boolean) => {
    if (userRole !== 'admin') return;
    try {
      await setDoc(doc(db, 'users', userId), { 
        hasPremiumAccess: !currentStatus,
        premiumExpiry: !currentStatus ? Date.now() + (365 * 24 * 60 * 60 * 1000) : null
      }, { merge: true });
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
        timeLimit: newExam.timeLimit || 30,
        totalQuestionsToShow: newExam.totalQuestionsToShow || 30,
        negativeMarking: newExam.negativeMarking || false,
        negativeValue: newExam.negativeValue || 0.25,
        createdBy: user?.uid || 'system',
        isPremium: newExam.isPremium || false,
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
        topic: '',
        examType: 'mcq',
        timeLimit: 30,
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
        <div className="flex flex-col items-center gap-10">
          <div className="bg-black p-10 rounded-[48px] shadow-[0_0_80px_rgba(37,99,235,0.15)] border border-blue-500/10">
            <img src="/api/v1/files/input_file_0.png" alt="Parodorshhi Logo" className="h-40 sm:h-72 w-auto animate-pulse object-contain brightness-150 contrast-125 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]" referrerPolicy="no-referrer" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="w-48 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
               <motion.div 
                 className="h-full bg-blue-600"
                 initial={{ x: "-100%" }}
                 animate={{ x: "100%" }}
                 transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
               />
            </div>
            <span className="text-zinc-500 font-bold tracking-widest text-xs uppercase">Initializing Parodorshhi...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {/* Visible reCAPTCHA Container - placed high enough to be seen */}
        <div id="recaptcha-container" className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] shadow-2xl"></div>
        <LandingPage 
          onGoogleLogin={handleLogin} 
          onEmailLogin={handleEmailLogin} 
          onEmailSignUp={handleEmailSignUp} 
          onForgotPassword={handleForgotPassword} 
          onPhoneSignIn={handlePhoneSignIn}
          onVerifyOtp={handleVerifyOtp}
          error={authError} 
          isLoading={isAuthLoading} 
        />
      </>
    );
  }

  return (
    <div className="min-h-screen relative selection:bg-blue-100 selection:text-blue-900 transition-colors duration-500 w-full overflow-x-hidden max-w-full">
      <div className="animated-bg" />
      <div className="glow-layer" id="glowLayer" />
      <div className="relative z-10 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden">
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

      <header className="glass h-20 relative z-50 transition-all duration-300 w-full max-w-full">
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
        <div className="max-w-[1440px] mx-auto px-3 sm:px-10 h-full flex items-center justify-between gap-4 sm:gap-12 relative">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 h-full relative">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors active:scale-95"
            >
              <Menu size={22} />
            </button>
            <motion.button
              onClick={() => {
                setView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center bg-zinc-950 rounded-xl sm:rounded-2xl p-2 sm:p-2 border-2 border-blue-500/30 shadow-[0_0_30px_rgba(37,99,235,0.2)] transition-all duration-300 hover:border-blue-500 hover:shadow-blue-500/40 group relative overflow-visible"
              aria-label="Website Logo - Home"
            >
              <div className="absolute -inset-2 bg-blue-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src="/api/v1/files/input_file_0.png" 
                alt="Parodorshhi Logo - Home" 
                className="h-10 sm:h-16 w-auto block object-contain brightness-150 contrast-125 relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                referrerPolicy="no-referrer"
                loading="eager"
              />
            </motion.button>
          </div>

          <div className="flex-1 max-w-2xl relative group hidden lg:block">
            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search study notes, books, videos..."
              className="w-full pl-11 sm:pl-14 pr-4 sm:pr-6 py-2.5 sm:py-3.5 bg-zinc-100/80 dark:bg-zinc-800/80 backdrop-blur-md border border-transparent focus:border-blue-500/50 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white font-medium placeholder:text-zinc-500 text-sm sm:text-base"
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
                  className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[100]"
                >
                  <div className="p-2 max-h-[400px] overflow-y-auto">
                    {suggestions.map((item, sIdx) => (
                      <button
                        key={`${item.id}-${sIdx}`}
                        onClick={() => {
                          setSearchQuery(item.title);
                          setShowSuggestions(false);
                          if (view === 'home') setView('category');
                          setSelectedCategory(item.category);
                        }}
                        className="w-full flex items-center gap-4 p-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors text-left group"
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
                        <ChevronRight size={14} className="text-zinc-300 group-hover:text-blue-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setIsDarkMode(!isDarkMode)} className="rounded-2xl w-9 h-9 sm:w-11 sm:h-11 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 transition-all">
              {isDarkMode ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
            </Button>
            
            <div className="relative group/user">
              <button 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={`flex items-center gap-2 p-1 pr-3 rounded-full transition-all duration-300 ${isUserMenuOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-4 ring-blue-500/10' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden border-2 shadow-inner transition-transform group-active/user:scale-95 ${isUserMenuOpen ? 'border-white/50 bg-white/20' : 'border-blue-500/20 bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    user.displayName?.charAt(0) || user.email?.charAt(0)
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-black uppercase tracking-widest">{user.displayName?.split(' ')[0]}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[-1]" onClick={() => setIsUserMenuOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(10px)' }}
                      className="absolute right-0 top-full mt-3 z-50 min-w-[240px]"
                    >
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-2 relative overflow-hidden backdrop-blur-xl">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600" />
                        <div className="px-4 py-4 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                          <p className="text-sm font-black text-zinc-900 dark:text-white leading-none mb-1.5">{user.displayName}</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate mb-3">{user.email}</p>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">{userRole}</span>
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">Verified</span>
                          </div>
                        </div>
                        
                        <div className="space-y-0.5">
                          <button 
                            onClick={() => { setView('dashboard'); setIsUserMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 rounded-xl transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
                              <Monitor size={18} />
                            </div>
                            My Dashboard
                          </button>
                          <button 
                            onClick={() => { setView('leaderboard'); setIsUserMenuOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 rounded-xl transition-all"
                          >
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
                              <Trophy size={18} />
                            </div>
                            Leaderboard
                          </button>
                          {userRole === 'admin' && (
                            <button 
                              onClick={() => { setView('admin'); setIsUserMenuOpen(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 rounded-xl transition-all"
                            >
                              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 transition-colors">
                                <Settings size={18} />
                              </div>
                              Admin Portal
                            </button>
                          )}
                        </div>

                        <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-2"></div>
                        <button 
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-black text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-widest"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600">
                            <LogOut size={18} />
                          </div>
                          Log Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white dark:bg-zinc-950 z-[101] lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
                <motion.button 
                  onClick={() => {
                    setView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setIsMobileMenuOpen(false);
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-zinc-950 p-4 rounded-3xl border-2 border-blue-500/20 shadow-[0_0_40px_rgba(37,99,235,0.15)] group relative overflow-visible"
                  aria-label="Website Logo - Home"
                >
                  <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img 
                    src="/api/v1/files/input_file_0.png" 
                    alt="Parodorshhi Logo" 
                    className="h-12 w-auto object-contain brightness-150 contrast-125 relative z-10"
                    referrerPolicy="no-referrer"
                  />
                </motion.button>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto space-y-8">
                {/* Mobile Search */}
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500" size={18} />
                  <input 
                    type="text"
                    placeholder="Search courses, notes..."
                    className="w-full pl-11 pr-4 py-3.5 bg-zinc-100 dark:bg-zinc-800/50 border border-transparent focus:border-blue-500/30 rounded-2xl outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-4 mb-4">Quick Navigation</p>
                  <button 
                    onClick={() => { setView('home'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${view === 'home' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Home size={20} /> Home
                  </button>
                  <button 
                    onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Monitor size={20} /> Dashboard
                  </button>
                  <button 
                    onClick={() => { setView('exam'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${view === 'exam' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <ClipboardList size={20} /> Exam Center
                  </button>
                  <button 
                    onClick={() => { handlePremiumExamClick(); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${view === 'premium-exam' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Crown size={20} className="text-amber-500" /> Customize Exam
                  </button>
                  <button 
                    onClick={() => { setView('leaderboard'); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold ${view === 'leaderboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  >
                    <Trophy size={20} /> Leaderboard
                  </button>
                </div>

                <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-4 px-4 py-2">
                    <img src={user.photoURL || ''} className="w-12 h-12 rounded-xl border-2 border-blue-500/20" alt="" />
                    <div className="min-w-0">
                      <p className="text-sm font-black text-zinc-900 dark:text-white truncate">{user.displayName}</p>
                      <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-4 text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl mt-4"
                  >
                    <LogOut size={20} /> Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sub Header / Breadcrumbs */}
      <div className="glass py-2 sm:py-3 relative z-40 overflow-hidden border-b-0">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0 scroll-smooth">
            <div className="flex items-center gap-1 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-1 bg-white/50 dark:bg-zinc-900/50 shadow-sm shrink-0">
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl" onClick={handleBack}><ChevronLeft size={16} /></Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl" onClick={handleForward}><ChevronRight size={16} /></Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9 rounded-xl" onClick={resetToHome}><Home size={16} /></Button>
            </div>
              <div className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-white dark:bg-zinc-900 rounded-2xl text-[10px] sm:text-sm font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm shrink-0 min-w-0">
                <GraduationCap size={14} className="text-blue-500 shrink-0" strokeWidth={2.5} />
                <span className="tracking-tight truncate max-w-[100px] sm:max-w-none">Parodorshhi › {view === 'home' ? 'Home' : view === 'saved' ? 'Saved' : view === 'admin' ? 'Admin Portal' : view === 'dashboard' ? 'My Dashboard' : view === 'leaderboard' ? 'Leaderboard' : view === 'exam' ? (activeExam ? 'Taking Exam' : 'Exam Center') : view === 'premium-exam' ? 'Customize Exam (Premium)' : selectedCategory}</span>
              </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-2 sm:pb-0 scroll-smooth">
            <Button 
              variant="outline" 
              size="sm" 
              icon={ClipboardList} 
              className={`h-11 sm:h-10 rounded-xl px-4 sm:px-4 border-none shadow-sm shrink-0 font-bold ${view === 'exam' ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'}`} 
              onClick={() => { setView('exam'); setActiveExam(null); }}
            >
              Exam Center
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={Crown} 
              className={`h-11 sm:h-10 rounded-xl px-4 sm:px-4 border-none shadow-sm shrink-0 font-bold ${view === 'premium-exam' ? 'bg-violet-600 text-white shadow-violet-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'}`} 
              onClick={handlePremiumExamClick}
            >
              Elite Exam
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              icon={Bookmark} 
              className={`h-11 sm:h-10 rounded-xl px-4 sm:px-4 border-none shadow-sm shrink-0 font-bold ${view === 'saved' ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'}`} 
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
                setNewItem({ 
                  category: 'Notes', 
                  academicClass: 'Class 9', 
                  subject: '', 
                  title: '', 
                  description: '', 
                  url: '', 
                  thumbnail: '', 
                  isPremium: false,
                  tags: [] 
                });
                setIsAdding(true);
              }}>Add</Button>
            )}
          </div>
        </div>
      </div>

      <main className="w-full max-w-full px-3 sm:px-4 py-6 sm:py-10 overflow-x-hidden">
        {(view === 'home' && !searchQuery) ? renderHome() : 
         view === 'leaderboard' ? renderLeaderboard() :
         view === 'admin' ? renderAdminPortal() :
         view === 'dashboard' ? renderUserDashboard() :
         view === 'exam' ? renderExamMode() : 
         view === 'premium-exam' ? <PremiumExamSection user={user} db={db} dynamicClasses={dynamicClasses} dynamicSubjects={dynamicSubjects} dynamicChapters={dynamicChapters} dynamicTopics={dynamicTopics} /> :
         view === 'privacy' ? renderPrivacyPolicy() : 
         view === 'terms' ? renderTermsOfService() : 
         view === 'cookies' ? renderCookiePolicy() : (
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
            className="fixed bottom-24 lg:bottom-8 right-6 lg:right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 animate-bounce-slow"
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
                  setNewItem({ 
                    category: 'Notes', 
                    academicClass: 'Class 9', 
                    subject: '', 
                    title: '', 
                    description: '', 
                    url: '', 
                    thumbnail: '', 
                    isPremium: false,
                    tags: [] 
                  });
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
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newItem.academicClass}
                    onChange={e => setNewItem({...newItem, academicClass: e.target.value as AcademicClass, subject: '', chapter: ''})}
                  >
                    <option value="">Select Class</option>
                    {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Title</label>
                <input 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                  placeholder="Enter resource title..."
                  value={newItem.title || ''}
                  onChange={e => setNewItem({...newItem, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Subject</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newItem.subject}
                    onChange={e => setNewItem({...newItem, subject: e.target.value, chapter: ''})}
                    disabled={!newItem.academicClass}
                  >
                    <option value="">Select Subject</option>
                    {getSubjectsForClass(newItem.academicClass as string).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {!newItem.academicClass && <option disabled>Choose class first</option>}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newItem.chapter || ''}
                    onChange={e => setNewItem({...newItem, chapter: e.target.value})}
                    disabled={!newItem.subject}
                  >
                    <option value="">Select Chapter</option>
                    {getChaptersForSubject(newItem.subject as string, newItem.academicClass as string).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    {!newItem.subject && <option disabled>Choose subject first</option>}
                  </select>
                </div>
              </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Content Type</label>
                  <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                    <button 
                      onClick={() => setNewItem({...newItem, isPremium: false})}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${!newItem.isPremium ? 'bg-white dark:bg-zinc-900 text-green-600 shadow-sm' : 'text-zinc-500'}`}
                    >
                      Regular (Free)
                    </button>
                    <button 
                      onClick={() => setNewItem({...newItem, isPremium: true})}
                      className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${newItem.isPremium ? 'bg-amber-500 text-white shadow-sm' : 'text-zinc-500'}`}
                    >
                      Premium (Paid)
                    </button>
                  </div>
                </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Description</label>
                <textarea 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                  placeholder="Enter resource description..."
                  value={newItem.description || ''}
                  rows={3}
                  onChange={e => setNewItem({...newItem, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Tags (Optional)</label>
                <input 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white"
                  placeholder="e.g. physics, vector, hsc (comma separated)"
                  value={typeof newItem.tags === 'string' ? newItem.tags : (newItem.tags || []).join(', ')}
                  onChange={e => setNewItem({...newItem, tags: e.target.value as any})}
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
                            <FileIcon size={20} />
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
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newPlaylist.academicClass}
                    onChange={e => setNewPlaylist({...newPlaylist, academicClass: e.target.value as AcademicClass, subject: '', chapter: ''})}
                  >
                    <option value="">Select Class</option>
                    {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest">Title</label>
                <input 
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                  placeholder="Enter playlist title..."
                  value={newPlaylist.title || ''}
                  onChange={e => setNewPlaylist({...newPlaylist, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Subject</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newPlaylist.subject}
                    onChange={e => setNewPlaylist({...newPlaylist, subject: e.target.value, chapter: ''})}
                    disabled={!newPlaylist.academicClass}
                  >
                    <option value="">Select Subject</option>
                    {getSubjectsForClass(newPlaylist.academicClass as string).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {!newPlaylist.academicClass && <option disabled>Choose class first</option>}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newPlaylist.chapter || ''}
                    onChange={e => setNewPlaylist({...newPlaylist, chapter: e.target.value})}
                    disabled={!newPlaylist.subject}
                  >
                    <option value="">Select Chapter</option>
                    {getChaptersForSubject(newPlaylist.subject as string, newPlaylist.academicClass as string).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    {!newPlaylist.subject && <option disabled>Choose subject first</option>}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Access Logic</label>
                <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                  <button 
                    onClick={() => setNewPlaylist({...newPlaylist, isPremium: false})}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${!newPlaylist.isPremium ? 'bg-white dark:bg-zinc-900 text-green-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Regular (Free)
                  </button>
                  <button 
                    onClick={() => setNewPlaylist({...newPlaylist, isPremium: true})}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${newPlaylist.isPremium ? 'bg-amber-500 text-white shadow-sm' : 'text-zinc-500'}`}
                  >
                    Premium (Paid)
                  </button>
                </div>
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
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newQuestion.class}
                    onChange={e => setNewQuestion({...newQuestion, class: e.target.value as AcademicClass, subject: '', chapter: ''})}
                  >
                    <option value="">Select Class</option>
                    {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Subject</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newQuestion.subject || ''}
                    onChange={e => setNewQuestion({...newQuestion, subject: e.target.value, chapter: ''})}
                    disabled={!newQuestion.class}
                  >
                    <option value="">Select Subject</option>
                    {getSubjectsForClass(newQuestion.class as string).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    {!newQuestion.class && <option disabled>Choose class first</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Chapter</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newQuestion.chapter || ''}
                    onChange={e => setNewQuestion({...newQuestion, chapter: e.target.value, topicId: ''})}
                    disabled={!newQuestion.subject}
                  >
                    <option value="">Select Chapter</option>
                    {getChaptersForSubject(newQuestion.subject || '', newQuestion.class as string).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    {!newQuestion.subject && <option disabled>Choose subject first</option>}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Topic</label>
                  <select 
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-3 rounded-xl outline-none dark:text-white font-bold"
                    value={newQuestion.topicId || ''}
                    onChange={e => setNewQuestion({...newQuestion, topicId: e.target.value})}
                    disabled={!newQuestion.chapter}
                  >
                    <option value="">Select Topic</option>
                    {getTopicsForChapter(newQuestion.chapter || '', newQuestion.subject || '', newQuestion.class as string).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                    {!newQuestion.chapter && <option disabled>Choose chapter first</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm font-bold"
                          value={newExam.class}
                          onChange={e => setNewExam({...newExam, class: e.target.value as AcademicClass, subject: '', chapter: ''})}
                        >
                          <option value="">Select Class</option>
                          {classes.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Subject</label>
                        <select 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm font-bold"
                          value={newExam.subject}
                          onChange={e => setNewExam({...newExam, subject: e.target.value, chapter: ''})}
                          disabled={!newExam.class}
                        >
                          <option value="">Select Subject</option>
                          {getSubjectsForClass(newExam.class as string).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          {!newExam.class && <option disabled>Choose class first</option>}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Standard Chapter</label>
                        <select 
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl outline-none dark:text-white text-sm font-bold"
                          value={newExam.chapter || ''}
                          onChange={e => {
                            const chap = e.target.value;
                            const topicsForChap = getTopicsForChapter(chap, newExam.subject || '', newExam.class as string);
                            setNewExam({
                              ...newExam, 
                              chapter: chap,
                              topicIds: topicsForChap.map(t => t.id)
                            });
                          }}
                          disabled={!newExam.subject}
                        >
                          <option value="">Select Chapter</option>
                          <option value="All Chapters">All Chapters</option>
                          {getChaptersForSubject(newExam.subject as string, newExam.class as string).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                          {!newExam.subject && <option disabled>Choose subject first</option>}
                        </select>
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

                    {newExam.chapter && newExam.chapter !== 'All Chapters' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Target Topics (Auto-selected)</label>
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 p-4 rounded-2xl max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                          {getTopicsForChapter(newExam.chapter || '', newExam.subject || '', newExam.class as string).map(topic => (
                             <label key={topic.id} className="flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors">
                               <input 
                                 type="checkbox"
                                 checked={(newExam.topicIds || []).includes(topic.id)}
                                 onChange={(e) => {
                                   const ids = [...(newExam.topicIds || [])];
                                   if (e.target.checked) {
                                     ids.push(topic.id);
                                   } else {
                                     const idx = ids.indexOf(topic.id);
                                     if (idx > -1) ids.splice(idx, 1);
                                   }
                                   setNewExam({...newExam, topicIds: ids});
                                 }}
                                 className="w-4 h-4 rounded border-zinc-300 text-primary-palette focus:ring-primary-palette"
                               />
                               <span className="text-xs font-bold dark:text-zinc-300">{topic.name}</span>
                             </label>
                          ))}
                          {getTopicsForChapter(newExam.chapter || '', newExam.subject || '', newExam.class as string).length === 0 && (
                            <p className="text-[10px] text-zinc-500 italic p-2">No topics found for this chapter.</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest pl-1">Access Logic</label>
                      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                        <button 
                          onClick={() => setNewExam({...newExam, isPremium: false})}
                          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${!newExam.isPremium ? 'bg-white dark:bg-zinc-900 text-green-600 shadow-sm' : 'text-zinc-500'}`}
                        >
                          Regular (Free)
                        </button>
                        <button 
                          onClick={() => setNewExam({...newExam, isPremium: true})}
                          className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${newExam.isPremium ? 'bg-amber-500 text-white shadow-sm' : 'text-zinc-500'}`}
                        >
                           Premium (Paid)
                        </button>
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
                        <div className="bg-zinc-900/95 text-white text-[9px] sm:text-[10px] px-2 sm:px-3 py-1 sm:py-1.5 rounded-full font-black uppercase tracking-widest backdrop-blur-md border border-white/10 shadow-2xl flex items-center gap-1 sm:gap-2">
                          <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-red-500 rounded-full animate-pulse" />
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
              className={`bg-white dark:bg-zinc-900 rounded-[24px] sm:rounded-[32px] w-full ${activePlaylist ? 'max-w-5xl' : 'max-w-2xl'} flex flex-col md:flex-row overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 md:h-[650px] h-[90svh] min-h-[500px] md:min-h-0`}
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
    </div>
  );
}

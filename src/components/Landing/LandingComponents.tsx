import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring } from 'motion/react';
import { 
  Plus, 
  Search, 
  Home, 
  Monitor, 
  ClipboardList, 
  Crown, 
  Trophy, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  GraduationCap, 
  X, 
  Sparkles, 
  Mail, 
  Lock, 
  Phone, 
  ArrowRight, 
  User, 
  Shield, 
  Brain, 
  Zap, 
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import { Button, Card, Badge } from '../ui/Base';

// Helper Components moved from App.tsx

export const TiltContainer = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isResetting, setIsResetting] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 8, y: -y * 8 });
  };

  const resetTilt = () => {
    setIsResetting(true);
    setTilt({ x: 0, y: 0 });
    setTimeout(() => setIsResetting(false), 400);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className={`${className} tilt ${isResetting ? 'reset' : ''}`}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`
      }}
    >
      <div className="tilt-inner h-full">
        {children}
      </div>
    </div>
  );
};

export const FlyInteraction = ({ onShoo }: { onShoo: () => void }) => {
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
      </svg>
    </motion.div>
  );
};

export const MiniRobot = () => {
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
      <div className={`absolute inset-2 blur-xl transition-all duration-500 opacity-40 group-hover:opacity-70 ${isSad ? 'bg-zinc-400' : 'bg-rose-500 group-hover:bg-rose-400'}`} />
      <div 
        className={`absolute inset-1.5 transition-all duration-1000 rounded-[16px] transform-gpu border-b-2 border-r-2 ${
          isSad 
            ? 'bg-zinc-200 border-zinc-300' 
            : 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-700 shadow-lg'
        }`}
        style={{ transform: "perspective(1000px) rotateX(5deg) rotateY(5deg)" }}
      >
        <div className={`absolute inset-[4px] bg-zinc-950 rounded-[10px] overflow-hidden flex flex-col items-center justify-center border transition-colors duration-1000 ${
          isSad ? 'border-zinc-800' : 'border-rose-400/20'
        }`}>
          <div className="flex gap-2.5 mb-1.5 relative">
            {!isSad && (
              <>
                <motion.div 
                  animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.4, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute -left-3 -top-1 w-5 h-2.5 bg-rose-500/30 blur-md rounded-full" 
                />
                <motion.div 
                   animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.4, 1] }}
                   transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                   className="absolute -right-3 -top-1 w-5 h-2.5 bg-rose-500/30 blur-md rounded-full" 
                />
              </>
            )}
            <motion.div 
              animate={isSad ? { scaleY: 0.2, y: 2 } : { scaleY: [1, 0.1, 1] }}
              transition={isSad ? {} : { duration: 4, repeat: Infinity, times: [0, 0.98, 1] }}
              className={`w-2 h-4 rounded-full ${isSad ? 'bg-zinc-600' : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`}
            />
            <motion.div 
              animate={isSad ? { scaleY: 0.2, y: 2 } : { scaleY: [1, 0.1, 1] }}
              transition={isSad ? {} : { duration: 4, repeat: Infinity, times: [0, 0.98, 1], delay: 0.1 }}
              className={`w-2 h-4 rounded-full ${isSad ? 'bg-zinc-600' : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]'}`}
            />
          </div>
          <motion.div 
            animate={isSad ? { d: "M2,2 Q5,0 8,2", opacity: 0.6 } : { d: "M2,0 Q5,4 8,0" }}
            className={`w-6 h-2 flex items-center justify-center`}
          >
            <svg viewBox="0 0 10 5" width="12" height="6">
              <path 
                d={isSad ? "M2,4 Q5,1 8,4" : "M2,1 Q5,4 8,1"} 
                fill="none" 
                stroke={isSad ? "#52525b" : "#fb7185"} 
                strokeWidth="1.5" 
                strokeLinecap="round" 
              />
            </svg>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export const NewBoyCharacter = ({ mood, mousePos, isTyping }: { mood: string, mousePos: { x: number, y: number }, isTyping: boolean }) => {
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
        </defs>
        <ellipse cx="150" cy="412" rx="88" ry="11" fill="rgba(0,0,0,0.13)" />
        <rect x="102" y="303" width="46" height="96" rx="17" fill="#243447" />
        <rect x="152" y="303" width="46" height="96" rx="17" fill="#243447" />
        <rect x="122" y="310" width="3" height="82" rx="1" fill="rgba(255,255,255,0.07)" />
        <rect x="172" y="310" width="3" height="82" rx="1" fill="rgba(255,255,255,0.07)" />
        <ellipse cx="123" cy="396" rx="29" ry="13" fill="#181825" />
        <ellipse cx="177" cy="396" rx="29" ry="13" fill="#181825" />
        <path d="M87,198 Q80,252 76,308 L224,308 Q220,252 213,198 Q175,214 150,214 Q125,214 87,198 Z" fill="#38BCC8" />
        <ellipse cx="150" cy="118" rx="73" ry="79" fill="#F5B57A" />
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
      </svg>
    </div>
  );
};

// characters and dividers moved to separate functions for better maintainability if needed

export const WaveDivider = () => (
  <div className="wave-transition h-24 sm:h-32 overflow-hidden relative">
    <div className="absolute inset-x-0 bottom-0 h-full bg-zinc-900/5 dark:bg-white/5" />
  </div>
);

export const ScrollSection = ({ children, id, className = "", style }: { children: React.ReactNode, id?: string, className?: string, style?: React.CSSProperties }) => (
  <motion.section id={id} className={`relative w-full ${className}`} style={style} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
    {children}
  </motion.section>
);

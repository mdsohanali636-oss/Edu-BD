import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  MessageSquare, 
  Check, 
  RefreshCcw, 
  X, 
  Mail, 
  Lock, 
  User,
  GraduationCap
} from 'lucide-react';
import { Button, Card } from '../ui/Base';

interface LandingPageProps {
  onGoogleLogin: () => void;
  onEmailLogin: (email: string, pass: string) => void;
  onEmailSignUp: (name: string, email: string, pass: string, academicClass: string, academicGroup: string) => void;
  onForgotPassword: (email: string) => void;
  onPhoneSignIn: (phone: string) => void;
  onVerifyOtp: (otp: string) => void;
  error: string | null;
  isLoading: boolean;
  dynamicClasses?: any[];
}

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
  // Credentials and selection State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [academicClass, setAcademicClass] = useState('');
  const [academicGroup, setAcademicGroup] = useState('All');
  const [formMode, setFormMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Set default class when dynamicClasses are populated
  useEffect(() => {
    if (dynamicClasses && dynamicClasses.length > 0 && !academicClass) {
      setAcademicClass(dynamicClasses[0]?.name || 'SSC');
    } else if (!academicClass) {
      setAcademicClass('SSC');
    }
  }, [dynamicClasses, academicClass]);

  // Reset group filter to All when changing class if group is not needed
  useEffect(() => {
    if (academicClass && !isGroupNeeded(academicClass)) {
      setAcademicGroup('All');
    }
  }, [academicClass, dynamicClasses]);
  
  // Ref for cleanup
  const activeTimers = useRef<any[]>([]);
  const animationFrames = useRef<number[]>([]);
  const localAudioCtx = useRef<AudioContext | null>(null);

  // Class selection needed indicator
  const isGroupNeeded = (className: string) => {
    if (!className || typeof className !== 'string') return false;
    const foundClass = dynamicClasses.find(c => c.name === className);
    if (foundClass) {
      return foundClass.has_groups ?? foundClass.hasGroups ?? false;
    }
    const nameLower = className.toLowerCase();
    if (nameLower === 'ssc' || nameLower === 'hsc' || nameLower === 'admission' || nameLower.includes('9') || nameLower.includes('10') || nameLower.includes('11') || nameLower.includes('12')) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    // Companion Page Interactive Scripts (Vanilla mapping to React mount lifecycle)
    const $ = (id: string) => document.getElementById(id);
    
    // SVG element refs
    const charsvg = $('charsvg');
    const pul = $('pul'), irl = $('irl'), pur = $('pur'), irr = $('irr');
    const ell = $('ell'), elr = $('elr');
    const bleft = $('bleft'), bright = $('bright');
    
    const mouths = {
      neutral: $('m-neutral'),
      happy: $('m-happy'),
      excited: $('m-excited'),
      think: $('m-think'),
      annoy: $('m-annoy'),
      curious: $('m-curious')
    };
    
    const teeth = $('teeth');
    const armleft = $('armleft'), armwave = $('armwave'), armthumb = $('armthumb');
    const svgwrap = $('svgwrap');
    const bubble = $('bubble');
    const maininput = $('maininput') as HTMLInputElement;
    const fly = $('fly');
    const formpanel = $('formpanel');

    // Speech bubble set helper
    function setSpeech(html: string) {
      if (bubble) {
        bubble.innerHTML = html;
        bubble.style.transform = 'scale(.95)';
        const t = setTimeout(() => {
          bubble.style.transform = 'scale(1)';
        }, 140);
        activeTimers.current.push(t);
      }
    }

    // Expressions map
    function setExpr(e: 'neutral' | 'happy' | 'excited' | 'think' | 'annoy' | 'curious') {
      Object.entries(mouths).forEach(([k, el]) => {
        if (el) el.setAttribute('opacity', k === e ? '1' : '0');
      });
      if (teeth) teeth.setAttribute('opacity', e === 'excited' ? '1' : '0');
      
      const browsMap = {
        neutral: ['M107,88 Q121,80 134,85', 'M166,85 Q179,80 193,88'],
        happy: ['M107,83 Q121,75 134,80', 'M166,80 Q179,75 193,83'],
        excited: ['M107,77 Q121,69 134,74', 'M166,74 Q179,69 193,77'],
        think: ['M107,86 Q121,78 134,83', 'M166,83 Q179,79 193,87'],
        annoy: ['M107,93 Q121,90 134,92', 'M166,92 Q179,90 193,93'],
        curious: ['M107,85 Q121,77 134,83', 'M166,84 Q179,79 193,87'],
      };
      
      const brows = browsMap[e] || browsMap.neutral;
      if (bleft && brows?.[0]) bleft.setAttribute('d', brows[0]);
      if (bright && brows?.[1]) bright.setAttribute('d', brows[1]);
    }

    // Sound utilities inside component
    function initAudio() {
      if (!localAudioCtx.current) {
        localAudioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    }

    function playTone(freq: number, type: OscillatorType, vol: number, dur: number) {
      try {
        initAudio();
        if (localAudioCtx.current) {
          const o = localAudioCtx.current.createOscillator();
          const g = localAudioCtx.current.createGain();
          o.connect(g);
          g.connect(localAudioCtx.current.destination);
          o.type = type;
          o.frequency.value = freq;
          g.gain.setValueAtTime(vol, localAudioCtx.current.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, localAudioCtx.current.currentTime + dur);
          o.start();
          o.stop(localAudioCtx.current.currentTime + dur);
        }
      } catch (e) {}
    }

    function playDing() {
      playTone(880, 'sine', 0.12, 0.5);
      const t = setTimeout(() => playTone(1100, 'sine', 0.08, 0.4), 150);
      activeTimers.current.push(t);
    }

    function playBuzz() {
      try {
        initAudio();
        if (localAudioCtx.current) {
          const o = localAudioCtx.current.createOscillator();
          const g = localAudioCtx.current.createGain();
          o.connect(g);
          g.connect(localAudioCtx.current.destination);
          o.type = 'sawtooth';
          o.frequency.setValueAtTime(220, localAudioCtx.current.currentTime);
          o.frequency.exponentialRampToValueAtTime(350, localAudioCtx.current.currentTime + 0.15);
          g.gain.setValueAtTime(0.04, localAudioCtx.current.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, localAudioCtx.current.currentTime + 0.3);
          o.start();
          o.stop(localAudioCtx.current.currentTime + 0.3);
        }
      } catch (e) {}
    }

    // ── BLINK ──
    let blinking = false;
    function blink() {
      if (blinking || !ell || !elr) return;
      blinking = true;
      let f = 0, tot = 10;
      const iv = setInterval(() => {
        f++;
        const p = f / tot;
        const ry = f < tot / 2 ? p * 2 * 22 : (1 - (p - 0.5) * 2) * 22;
        ell.setAttribute('cy', `${92 + ry}`);
        ell.setAttribute('ry', `${ry}`);
        elr.setAttribute('cy', `${92 + ry}`);
        elr.setAttribute('ry', `${ry}`);
        if (f >= tot) {
          clearInterval(iv);
          blinking = false;
        }
      }, 15);
    }

    let blinkTimeout: any;
    function schedBlink() {
      blinkTimeout = setTimeout(() => {
        blink();
        schedBlink();
      }, 2200 + Math.random() * 3800);
    }
    schedBlink();

    // Eye base positions
    const LB = { x: 119, y: 114 }, RB = { x: 181, y: 114 }, MAX = 7.5;

    // ── EYE TRACK ──
    const handleEyeTrack = (e: MouseEvent) => {
      if (!charsvg || !pul || !irl || !pur || !irr) return;
      const rect = charsvg.getBoundingClientRect();
      const sx = 300 / rect.width;
      const sy = 420 / rect.height;
      const mx = (e.clientX - rect.left) * sx;
      const my = (e.clientY - rect.top) * sy;

      function moveEye(mx: number, my: number, base: typeof LB, pEl: HTMLElement, iEl: HTMLElement) {
        const dx = mx - base.x;
        const dy = my - base.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ang = Math.atan2(dy, dx);
        const off = Math.min(dist * 0.09, MAX);
        pEl.setAttribute('cx', String(base.x + Math.cos(ang) * off));
        pEl.setAttribute('cy', String(base.y + Math.sin(ang) * off));
        iEl.setAttribute('cx', String(base.x + Math.cos(ang) * off * 0.5));
        iEl.setAttribute('cy', String(base.y + Math.sin(ang) * off * 0.5));
      }
      moveEye(mx, my, LB, pul, irl);
      moveEye(mx, my, RB, pur, irr);
    };
    document.addEventListener('mousemove', handleEyeTrack);

    // ── FAIRY LIGHTS ──
    const fairyEl = $('fairy');
    const cols = ['#FFD700', '#FF6BAE', '#A0E7FF', '#90FF90', '#FFB347', '#FF9DE2', '#B5EEFF'];
    if (fairyEl && fairyEl.children.length <= 1) { // Prevent duplicates
      for (let i = 0; i < 24; i++) {
        const b = document.createElement('div');
        b.className = 'fbulb';
        const c = cols[i % cols.length];
        const x = (i / 23) * 96 + 2;
        const y = 10 + Math.sin(i * 0.85) * 13;
        b.style.cssText = `left:${x}%;top:${y}px;background:${c};box-shadow:0 0 7px ${c};--d:${1.4 + Math.random() * 2.2}s;--dl:${Math.random() * 2}s;position:absolute;width:9px;height:11px;border-radius:50% 50% 40% 40%;animation:twinkle var(--d,2s) ease-in-out infinite alternate;animation-delay:var(--dl,0s);`;
        fairyEl.appendChild(b);
      }
    }

    // ── STARS ──
    const starsEl = $('stars');
    if (starsEl && starsEl.children.length === 0) {
      for (let i = 0; i < 45; i++) {
        const s = document.createElement('div');
        s.className = 'star';
        const sz = 1 + Math.random() * 2.5;
        s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 60}%;width:${sz}px;height:${sz}px;--d:${0.8 + Math.random() * 2}s;--dl:${Math.random() * 2}s;position:absolute;background:#fff;border-radius:50%;animation:sparkle var(--d) ease-in-out infinite alternate;animation-delay:var(--dl);`;
        starsEl.appendChild(s);
      }
    }

    // ── PARTICLES ──
    const scene = $('scene');
    const pcolors = ['rgba(255,200,100,.45)', 'rgba(120,200,255,.4)', 'rgba(255,150,200,.38)', 'rgba(150,255,180,.38)'];
    if (scene && scene.querySelectorAll('.ptcl').length === 0) {
      for (let i = 0; i < 14; i++) {
        const p = document.createElement('div');
        p.className = 'ptcl';
        const sz = 3 + Math.random() * 5;
        p.style.cssText = `left:${5 + Math.random() * 90}%;bottom:${18 + Math.random() * 22}%;width:${sz}px;height:${sz}px;background:${pcolors[i % 4]};--d:${6 + Math.random() * 9}s;--dl:${Math.random() * 9}s;position:absolute;border-radius:50%;opacity:0;animation:floatup var(--d,8s) ease-in-out infinite;animation-delay:var(--dl,0s);pointer-events:none;z-index:2;`;
        scene.appendChild(p);
      }
    }

    // ── RAIN ON CANVAS ──
    const rainCvs = $('rain') as HTMLCanvasElement;
    const winEl = $('win');
    let rainFrameId: number;
    let drops: any[] = [];
    if (rainCvs && winEl) {
      rainCvs.width = winEl.offsetWidth || 190;
      rainCvs.height = winEl.offsetHeight || 228;
      const rc = rainCvs.getContext('2d');
      drops = Array.from({ length: 45 }, () => ({
        x: Math.random() * rainCvs.width,
        y: Math.random() * rainCvs.height,
        s: 1.2 + Math.random() * 2.8,
        l: 7 + Math.random() * 13,
        o: 0.1 + Math.random() * 0.28
      }));

      function drawCity() {
        if (!rc) return;
        const h = rainCvs.height;
        const blds = [
          { x: 0, w: 28, h: 80 }, { x: 22, w: 18, h: 105 }, { x: 36, w: 24, h: 92 },
          { x: 56, w: 32, h: 128 }, { x: 84, w: 18, h: 98 }, { x: 99, w: 28, h: 118 },
          { x: 124, w: 24, h: 95 }, { x: 145, w: 28, h: 112 }, { x: 170, w: 18, h: 83 },
          { x: 185, w: 28, h: 103 }
        ];
        blds.forEach(b => {
          rc.fillStyle = '#10182A';
          rc.fillRect(b.x, h - b.h, b.w, b.h);
          for (let wy = h - b.h + 8; wy < h - 6; wy += 13) {
            for (let wx = b.x + 3; wx < b.x + b.w - 7; wx += 9) {
              if (Math.random() > 0.38) {
                const wc = ['rgba(255,220,100,.75)', 'rgba(255,255,200,.65)', 'rgba(200,220,255,.6)'][Math.floor(Math.random() * 3)];
                rc.fillStyle = wc;
                rc.fillRect(wx, wy, 5, 7);
              }
            }
          }
        });
      }

      function drawClouds() {
        if (!rc) return;
        rc.fillStyle = 'rgba(255,255,255,.72)';
        [[28, 38, 28], [118, 22, 22], [78, 58, 18]].forEach(([x, y, r]) => {
          rc.beginPath();
          rc.arc(x, y, r, 0, Math.PI * 2);
          rc.arc(x + r * 0.7, y - r * 0.3, r * 0.7, 0, Math.PI * 2);
          rc.arc(x + r * 1.4, y, r * 0.9, 0, Math.PI * 2);
          rc.fill();
        });
      }

      function animRain() {
        if (!rc) return;
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        const g = rc.createLinearGradient(0, 0, 0, rainCvs.height);
        if (dark) {
          g.addColorStop(0, '#0b1320');
          g.addColorStop(0.5, '#14233A');
          g.addColorStop(1, '#0e1b2e');
        } else {
          g.addColorStop(0, '#A8D8EA');
          g.addColorStop(0.5, '#87CEEB');
          g.addColorStop(1, '#b8dcf0');
        }
        rc.fillStyle = g;
        rc.fillRect(0, 0, rainCvs.width, rainCvs.height);
        if (dark) {
          drawCity();
        } else {
          drawClouds();
        }
        drops.forEach(d => {
          rc.beginPath();
          rc.moveTo(d.x, d.y);
          rc.lineTo(d.x - 1, d.y + d.l);
          rc.strokeStyle = `rgba(180,210,240,${d.o})`;
          rc.lineWidth = 1;
          rc.stroke();
          d.y += d.s;
          if (d.y > rainCvs.height) {
            d.y = -d.l;
            d.x = Math.random() * rainCvs.width;
          }
        });
        rainFrameId = requestAnimationFrame(animRain);
      }
      animRain();
    }

    // ── PARALLAX ──
    const handleParallaxMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx, dy = (e.clientY - cy) / cy;
      const win = $('win');
      const stamp = $('lampglow');
      if (win) win.style.transform = `translate(${dx * 7}px,${dy * 4}px)`;
      if (stamp) stamp.style.transform = `translateX(calc(-50% + ${dx * -5}px))`;
    };
    document.addEventListener('mousemove', handleParallaxMove);

    // ── INPUT & EXPRESSIONS DIALOG ENGINE ──
    const loginWords = ['login', 'log in', 'sign in', 'signin', 'let me in', 'enter here'];
    const signupWords = ['signup', 'sign up', 'register', 'join', 'create account', 'new account', 'create'];

    let idleRef: any = null;
    let listenerOn = true;

    function resetIdle() {
      setExpr('neutral');
      setSpeech("Hey there 👋 Do you want to <strong>log in</strong> or <strong>sign up</strong>?");
    }

    function doLogin() {
      listenerOn = false;
      if (maininput) maininput.disabled = true;
      playDing();
      setExpr('excited');
      setSpeech("Awesome! Welcome back! 🎉");
      if (svgwrap) {
        svgwrap.style.animation = 'none';
        svgwrap.style.transition = 'transform .2s cubic-bezier(.34,1.56,.64,1)';
        svgwrap.style.transform = 'translateY(-14px) scale(1.04)';
        const t1 = setTimeout(() => {
          svgwrap.style.transform = 'translateY(-6px) scale(1.02)';
          const t2 = setTimeout(() => {
            svgwrap.style.transform = '';
            svgwrap.style.animation = 'breathe 3.2s ease-in-out infinite';
          }, 150);
          activeTimers.current.push(t2);
        }, 120);
        activeTimers.current.push(t1);
      }
      setFormMode('login');
      const formTitle = $('ftitle');
      const formSub = $('fsub');
      const formBtn = $('fbtn');
      if (formTitle) formTitle.textContent = 'Welcome back! 👋';
      if (formSub) formSub.textContent = 'Sign in to continue your adventure';
      if (formBtn) formBtn.textContent = 'Let me in! 🚀';
      const t3 = setTimeout(() => {
        if (formpanel) formpanel.classList.add('show');
      }, 150);
      activeTimers.current.push(t3);
    }

    function doSignup() {
      listenerOn = false;
      if (maininput) maininput.disabled = true;
      playDing();
      setExpr('happy');
      setSpeech("Yay! Let's get you started! 🌟");
      if (armleft) armleft.style.display = 'none';
      if (armthumb) armthumb.style.display = '';
      if (svgwrap) {
        svgwrap.style.animation = 'none';
        svgwrap.style.transition = 'transform .2s cubic-bezier(.34,1.56,.64,1)';
        svgwrap.style.transform = 'translateY(-10px) scale(1.03)';
        const t1 = setTimeout(() => {
          svgwrap.style.transform = 'translateY(-3px) scale(1.01)';
          const t2 = setTimeout(() => {
            svgwrap.style.transform = '';
            svgwrap.style.animation = 'breathe 3.2s ease-in-out infinite';
          }, 150);
          activeTimers.current.push(t2);
        }, 120);
        activeTimers.current.push(t1);
      }
      setFormMode('signup');
      const formTitle = $('ftitle');
      const formSub = $('fsub');
      const formBtn = $('fbtn');
      if (formTitle) formTitle.textContent = 'Join the crew! 🚀';
      if (formSub) formSub.textContent = 'Create your account and start your adventure';
      if (formBtn) formBtn.textContent = 'Create Account! ✨';
      const t3 = setTimeout(() => {
        if (formpanel) formpanel.classList.add('show');
      }, 150);
      activeTimers.current.push(t3);
    }

    const handleInput = (e: Event) => {
      if (!listenerOn) return;
      const target = e.target as HTMLInputElement;
      const v = target.value.trim().toLowerCase();
      clearTimeout(idleRef);
      if (!v.length) {
        resetIdle();
        return;
      }
      
      if (loginWords.some(w => v.includes(w))) {
        doLogin();
        return;
      }
      if (signupWords.some(w => v.includes(w))) {
        doSignup();
        return;
      }

      setExpr('think');
      setSpeech('Hmm, let me see... 🤔');
      
      idleRef = setTimeout(() => {
        setExpr('curious');
        setSpeech("Try typing <strong>'login'</strong> or <strong>'sign up'</strong> 😊");
      }, 3500);
      activeTimers.current.push(idleRef);
    };

    if (maininput) {
      maininput.addEventListener('input', handleInput);
    }

    // ── FLY BUG ANIMATION ──
    let flyRaf: number;
    let flyActive = false;
    let flyTimer: any;

    function startFly() {
      if (flyActive || !fly || !svgwrap) return;
      flyActive = true;
      fly.style.opacity = '1';
      
      const cr = svgwrap.getBoundingClientRect();
      const noseX = cr.left + cr.width * 0.5;
      const noseY = cr.top + cr.height * 0.33;
      let fx = cr.left - 40;
      let fy = cr.top + 30;
      let ang = 0;
      let phase = 0;
      const orR = 58;

      function step() {
        if (phase === 0) {
          fx += (noseX - fx) * 0.04;
          fy += (noseY - fy) * 0.04;
        } else if (phase === 1) {
          ang += 0.038;
          fx = noseX + Math.cos(ang) * orR;
          fy = noseY + Math.sin(ang) * orR * 0.5 - 20;
        } else if (phase === 2) {
          fx += (noseX - fx) * 0.05 + ((Math.random() - 0.5) * 2);
          fy += (noseY - fy) * 0.05 + ((Math.random() - 0.5) * 2);
        } else if (phase === 3) {
          fx += 10;
          fy -= 7;
        }
        if (fly) {
          fly.style.left = fx + 'px';
          fly.style.top = fy + 'px';
          fly.style.transform = `rotate(${Math.sin(Date.now() * 0.012) * 12}deg) scaleX(${Math.sin(Date.now() * 0.02) > 0.5 ? 1 : -1})`;
        }
        if (phase < 3 || fx < window.innerWidth + 80) {
          flyRaf = requestAnimationFrame(step);
        }
      }
      step();

      const t1 = setTimeout(() => { phase = 1; }, 1500);
      const t2 = setTimeout(() => { phase = 2; playBuzz(); }, 4200);
      const t3 = setTimeout(() => {
        phase = 3;
        setExpr('annoy');
        setSpeech("Hey! Shoo! 😤");
        if (armwave) armwave.style.display = '';
        if (armleft) armleft.style.display = 'none';
        
        let wf = 0;
        const wi = setInterval(() => {
          if (armwave) armwave.style.transform = `rotate(${Math.sin(wf * 0.55) * 28}deg)`;
          wf++;
          if (wf > 24) {
            clearInterval(wi);
            if (armwave) armwave.style.transform = '';
          }
        }, 45);
        playBuzz();
        
        const t4 = setTimeout(() => {
          if (fly) fly.style.opacity = '0';
          cancelAnimationFrame(flyRaf);
          flyActive = false;
          if (armwave) armwave.style.display = 'none';
          if (armleft) armleft.style.display = '';
          if (listenerOn) {
            setExpr('neutral');
            setSpeech("Hey there 👋 Do you want to <strong>log in</strong> or <strong>sign up</strong>?");
          }
          flyTimer = setTimeout(startFly, 22000 + Math.random() * 18000);
          activeTimers.current.push(flyTimer);
        }, 2500);
        activeTimers.current.push(t4);
      }, 6500);

      activeTimers.current.push(t1, t2, t3);
    }
    
    flyTimer = setTimeout(startFly, 9000 + Math.random() * 8000);
    activeTimers.current.push(flyTimer);

    // ── IDLE DETECTOR ──
    let userIdle: any = null;
    function resetUserIdle() {
      clearTimeout(userIdle);
      userIdle = setTimeout(() => {
        if (maininput && !maininput.value && listenerOn) {
          setExpr('curious');
          setSpeech("Still there? 👀 Try typing <strong>'login'</strong>!");
          const innerTimeout = setTimeout(() => {
            if (maininput && !maininput.value && listenerOn) {
              resetIdle();
            }
          }, 3000);
          activeTimers.current.push(innerTimeout);
        }
      }, 7000);
      activeTimers.current.push(userIdle);
    }
    
    document.addEventListener('mousemove', resetUserIdle);
    document.addEventListener('keydown', resetUserIdle);
    resetUserIdle();

    // Back to main screen trigger
    const handleGoBack = () => {
      if (formpanel) formpanel.classList.remove('show');
      const innerT = setTimeout(() => {
        listenerOn = true;
        if (maininput) {
          maininput.disabled = false;
          maininput.value = '';
        }
        if (armleft) armleft.style.display = '';
        if (armthumb) armthumb.style.display = 'none';
        if (armwave) armwave.style.display = 'none';
        resetIdle();
        if (maininput) maininput.focus();
      }, 350);
      activeTimers.current.push(innerT);
    };

    const bbackBtn = $('bback');
    if (bbackBtn) {
      bbackBtn.addEventListener('click', handleGoBack);
    }

    // THEME BUTTON SYNC
    const thmBtn = $('thmbtn');
    const handleThemeToggle = () => {
      const dark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
      if (dark) {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
        if (thmBtn) thmBtn.textContent = '🌙';
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        if (thmBtn) thmBtn.textContent = '☀️';
      }
    };

    if (thmBtn) {
      thmBtn.addEventListener('click', handleThemeToggle);
      // set default icon
      const isCurrentlyDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
      thmBtn.textContent = isCurrentlyDark ? '☀️' : '🌙';
    }

    // Greet animation on mount
    const initialGreet = setTimeout(() => {
      setExpr('happy');
      const tGreet = setTimeout(() => setExpr('neutral'), 2200);
      activeTimers.current.push(tGreet);
    }, 900);
    activeTimers.current.push(initialGreet);

    // Initial focus focus
    if (maininput) maininput.focus();

    return () => {
      // ── CLEANUP ON UNMOUNT ──
      document.removeEventListener('mousemove', handleEyeTrack);
      document.removeEventListener('mousemove', handleParallaxMove);
      document.removeEventListener('mousemove', resetUserIdle);
      document.removeEventListener('keydown', resetUserIdle);
      
      if (bbackBtn) bbackBtn.removeEventListener('click', handleGoBack);
      if (maininput) maininput.removeEventListener('input', handleInput);
      if (thmBtn) thmBtn.removeEventListener('click', handleThemeToggle);
      
      cancelAnimationFrame(rainFrameId);
      cancelAnimationFrame(flyRaf);
      
      clearInterval(blinkTimeout);
      clearTimeout(userIdle);
      clearTimeout(idleRef);
      
      activeTimers.current.forEach(t => clearTimeout(t));
      animationFrames.current.forEach(f => cancelAnimationFrame(f));
      
      if (localAudioCtx.current) {
        localAudioCtx.current.close().catch(() => {});
      }
    };
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formMode === 'login') {
      onEmailLogin(email.trim(), password);
    } else if (formMode === 'signup') {
      onEmailSignUp(name.trim(), email.trim(), password, academicClass, academicGroup);
    } else if (formMode === 'forgot') {
      onForgotPassword(email.trim());
      setFormMode('login');
      // trigger vanilla visual notification
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = '📬 Password recovery code has been sent!';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
      }
    }
  };

  return (
    <div id="scene" className="w-full h-screen overflow-hidden select-none relative bg-neutral-100 dark:bg-zinc-950">
      {/* Dynamic CSS injections to preserve EXACT original rendering and styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --wall:#F2E5D0;--wall2:#EDD9BC;--floor:#C9A27A;--desk:#8B5E3C;
          --sky:#A8D8EA;--lamp:#FFCB6B;--bubble:#fffdf8;--txt:#2D1B10;--soft:#7A5540;
          --glass:rgba(255,252,248,.88);--gborder:rgba(255,255,255,.7);
          --inp:rgba(255,253,248,.92);--accent:#FF6060;--accent2:#FF8C42;
        }
        .dark, [data-theme=dark]{
          --wall:#0E1A2B;--wall2:#142035;--floor:#080E17;--desk:#0A0F18;
          --sky:#0d1520;--lamp:rgba(130,80,255,.2);--bubble:rgba(18,28,48,.95);
          --txt:#E8E0F8;--soft:#9080B8;--glass:rgba(10,18,35,.9);
          --gborder:rgba(100,80,200,.35);--inp:rgba(12,22,40,.92);
        }
        
        #scene{position:relative;width:100vw;height:100vh;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;background:var(--wall);transition:background .4s;}

        /* WALL */
        #wall{position:absolute;inset:0;background:linear-gradient(180deg,var(--wall) 0%,var(--wall2) 62%,var(--floor) 62%);transition:background .4s;z-index:0;}
        .dark #wall, [data-theme=dark] #wall{background:linear-gradient(180deg,var(--wall) 0%,var(--wall2) 62%,var(--floor) 62%);}

        /* LAMP GLOW */
        #lampglow{position:absolute;top:0;left:50%;transform:translateX(-50%);width:640px;height:380px;background:radial-gradient(ellipse at 50% 0%,var(--lamp) 0%,transparent 68%);pointer-events:none;z-index:1;transition:background .4s;}

        /* WINDOW */
        #win{position:absolute;top:55px;right:90px;width:190px;height:228px;border:10px solid #C48E4A;border-radius:5px;overflow:hidden;box-shadow:inset 0 0 16px rgba(0,0,0,.15),0 6px 24px rgba(0,0,0,.22);z-index:2;transition:border-color .4s, transform .2s ease-out;}
        .dark #win, [data-theme=dark] #win{border-color:#1E2D40;}
        #winH{position:absolute;top:50%;left:-5px;right:-5px;height:8px;background:#C48E4A;transform:translateY(-50%);z-index:3;transition:background .4s;}
        #winV{position:absolute;left:50%;top:-5px;bottom:-5px;width:8px;background:#C48E4A;transform:translateX(-50%);z-index:3;transition:background .4s;}
        .dark #winH, .dark #winV, [data-theme=dark] #winH,[data-theme=dark] #winV{background:#1E2D40;}
        #rain{position:absolute;inset:0;z-index:1;}

        /* DESK */
        #desk{position:absolute;bottom:0;left:0;right:0;height:110px;background:var(--desk);border-top:7px solid #A0714B;z-index:4;transition:background .4s,border-color .4s;}
        .dark #desk, [data-theme=dark] #desk{border-color:#0F1520;}
        #dlamp{position:absolute;top:-78px;right:22%;width:10px;height:78px;background:#8B7355;border-radius:4px;z-index:5;}
        .dark #dlamp, [data-theme=dark] #dlamp{background:#1a1018;}
        #dlamp::after{content:'';position:absolute;top:-22px;left:-22px;width:54px;height:28px;background:#C9A86C;border-radius:50% 50% 0 0;clip-path:ellipse(100% 100% at 50% 0%);}
        .dark #dlamp::after, [data-theme=dark] #dlamp::after{background:#2a1530;}
        #dlamplight{position:absolute;top:78px;left:-100px;width:220px;height:200px;background:radial-gradient(ellipse at 50% 0%,rgba(255,198,80,.28) 0%,transparent 70%);pointer-events:none;}

        /* FAIRY LIGHTS */
        #fairy{position:absolute;top:0;left:0;right:0;height:55px;z-index:3;pointer-events:none;}
        .fwire{position:absolute;top:10px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,0,0,.18),transparent);}
        @keyframes twinkle{0%{opacity:.35;filter:blur(.5px);}100%{opacity:1;filter:blur(0) brightness(1.3);}}

        /* STARS */
        #stars{position:absolute;inset:0;pointer-events:none;z-index:1;opacity:0;transition:opacity .6s;}
        .dark #stars, [data-theme=dark] #stars{opacity:1;}
        @keyframes sparkle{from{opacity:.15;}to{opacity:.9;}}

        /* PARTICLES */
        @keyframes floatup{0%{opacity:0;transform:translateY(0) scale(1);}25%{opacity:.5;}75%{opacity:.25;}100%{opacity:0;transform:translateY(-180px) scale(0.5);}}

        /* CHARACTER WRAPPER */
        #charwrap{position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;padding-bottom:38px;animation:charentrance .9s cubic-bezier(.34,1.56,.64,1) both;}
        @keyframes charentrance{from{opacity:0;transform:translateY(44px) scale(.88);}to{opacity:1;transform:translateY(0) scale(1);}}
        #svgwrap{position:relative;animation:breathe 3.2s ease-in-out infinite;transform-origin:center bottom;}
        @keyframes breathe{0%,100%{transform:translateY(0);}50%{transform:translateY(-7px);}}

        /* SPEECH BUBBLE */
        #bubble{position:relative;background:var(--bubble);border-radius:18px;padding:13px 22px;margin-bottom:18px;max-width:330px;font-size:1.02rem;font-weight:700;color:var(--txt);box-shadow:0 6px 28px rgba(0,0,0,.11);text-align:center;border:2px solid rgba(255,255,255,.8);animation:bubblepop .65s cubic-bezier(.34,1.56,.64,1) .4s both;transition:background .3s,color .3s,transform 0.15s ease-out;z-index:20;}
        #bubble::after{content:'';position:absolute;bottom:-15px;left:50%;transform:translateX(-50%);border:9px solid transparent;border-top-color:var(--bubble);transition:border-color .3s;}
        @keyframes bubblepop{from{opacity:0;transform:scale(.5) translateY(8px);}to{opacity:1;transform:scale(1) translateY(0);}}

        /* INPUT */
        #inputarea{position:relative;width:310px;margin-top:26px;animation:inputrise .8s cubic-bezier(.34,1.56,.64,1) .7s both;}
        @keyframes inputrise{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
        #maininput{width:100%;padding:15px 22px;border:2.5px solid rgba(255,255,255,.75);border-radius:14px;background:var(--inp);font-family:'Nunito',sans-serif;font-size:1rem;font-weight:700;color:var(--txt);outline:none;transition:all .3s;backdrop-filter:blur(10px);box-shadow:0 3px 18px rgba(0,0,0,.07);text-align:center;caret-color:var(--accent);}
        #maininput::placeholder{color:rgba(120,90,70,.45);font-weight:600;}
        #maininput:focus{border-color:var(--accent);box-shadow:0 4px 20px rgba(255,96,96,.18);transform:scale(1.02);}
        #maininput:disabled{opacity:.7;cursor:not-allowed;}
        #hint{text-align:center;font-size:.78rem;color:var(--soft);margin-top:7px;font-weight:700;opacity:.7;transition:color .3s;}
        #tdots{display:flex;gap:5px;justify-content:center;margin-top:7px;height:14px;}
        .tdot{width:7px;height:7px;border-radius:50%;background:var(--accent);opacity:0;}

        /* FORM PANEL */
        #formpanel{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:110;opacity:0;pointer-events:none;transition:opacity .2s ease-out;}
        #formpanel.show{opacity:1;pointer-events:all;}
        #fbackdrop{position:absolute;inset:0;background:rgba(0,0,0,.38);backdrop-filter:blur(9px);}
        #fcard{position:relative;background:var(--glass);border:1.5px solid var(--gborder);border-radius:26px;padding:34px 38px;width:min(440px,94vw);backdrop-filter:blur(22px);box-shadow:0 22px 64px rgba(0,0,0,.24);transform:translateY(24px) scale(.96);transition:transform .28s cubic-bezier(.34,1.56,.64,1),background .3s,border-color .3s;overflow-y:auto;max-height:92vh;}
        #formpanel.show #fcard{transform:none;}
        .ftitle{font-family:'Fredoka One',cursive;font-size:2rem;color:var(--txt);text-align:center;margin-bottom:6px;transition:color .3s;}
        .fsub{text-align:center;font-size:.88rem;color:var(--soft);margin-bottom:22px;font-weight:700;transition:color .3s;}
        .ffield{margin-bottom:14px;}
        .ffield label{display:block;font-size:.75rem;font-weight:800;color:var(--soft);margin-bottom:5px;text-transform:uppercase;letter-spacing:.9px;}
        .ffield input{width:100%;padding:13px 17px;border:2px solid rgba(150,130,100,.18);border-radius:11px;background:var(--inp);font-family:'Nunito',sans-serif;font-size:.94rem;font-weight:700;color:var(--txt);outline:none;transition:all .25s;}
        .ffield input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(255,96,96,.12);}
        .fbtn{width:100%;padding:14px;margin-top:6px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;border:none;border-radius:11px;font-family:'Nunito',sans-serif;font-size:1.02rem;font-weight:800;cursor:pointer;transition:all .25s;letter-spacing:.2px;}
        .fbtn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(255,96,96,.38);}
        .fbtn:active{transform:translateY(0);}
        .bback{display:block;text-align:center;margin-top:14px;font-size:.84rem;font-weight:700;color:var(--soft);cursor:pointer;transition:color .2s;}
        .bback:hover{color:var(--accent);}

        /* TOAST */
        #toast{position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-80px);background:linear-gradient(135deg,#4CAF50,#45A049);color:#fff;padding:12px 28px;border-radius:50px;font-family:'Nunito',sans-serif;font-weight:800;font-size:.95rem;z-index:200;transition:transform .4s cubic-bezier(.34,1.56,.64,1);white-space:nowrap;}
        #toast.show{transform:translateX(-50%) translateY(0);}

        /* THEME BTN */
        #thmbtn{position:fixed;top:18px;right:18px;width:42px;height:42px;border-radius:50%;background:var(--bubble);border:none;cursor:pointer;font-size:1.15rem;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 14px rgba(0,0,0,.14);z-index:50;transition:all .3s;}
        #thmbtn:hover{transform:scale(1.1) rotate(15deg);}

        /* FLY */
        #fly{position:fixed;pointer-events:none;z-index:15;opacity:0;transition:opacity .3s;width:22px;height:22px;}

        /* Mobile */
        @media(max-width:600px){
          #win{right:8px;top:28px;width:110px;height:138px;}
          #bubble{font-size:.88rem;max-width:260px;padding:11px 16px;}
          #inputarea{width:260px;}
          #charwrap svg{width:230px;height:315px;}
        }
      ` }} />

      <div id="wall">
        <div id="stars"></div>
        <div id="lampglow"></div>
      </div>
      
      <div id="win">
        <div id="winH"></div>
        <div id="winV"></div>
        <canvas id="rain"></canvas>
      </div>
      
      <div id="fairy">
        <div className="fwire"></div>
      </div>
      
      <div id="desk">
        <div id="dlamp">
          <div id="dlamplight"></div>
        </div>
      </div>

      <div id="charwrap">
        <div id="bubble">Hey there 👋 Do you want to <strong>log in</strong> or <strong>sign up</strong>?</div>
        
        <div id="svgwrap">
          <div id="fly">
            <svg viewBox="0 0 22 22" width="22" height="22">
              <ellipse cx="11" cy="14" rx="5.5" ry="3.5" fill="#222" />
              <ellipse cx="6" cy="10" rx="5.5" ry="3" fill="rgba(160,210,255,.65)" transform="rotate(-20 6 10)" />
              <ellipse cx="16" cy="10" rx="5.5" ry="3" fill="rgba(160,210,255,.65)" transform="rotate(20 16 10)" />
              <circle cx="9" cy="11.5" r="1.8" fill="#AA0000" />
              <circle cx="13" cy="11.5" r="1.8" fill="#AA0000" />
              <line x1="9.5" y1="11" x2="6.5" y2="6" stroke="#222" strokeWidth=".9" />
              <line x1="12.5" y1="11" x2="15.5" y2="6" stroke="#222" strokeWidth=".9" />
              <circle cx="6.5" cy="5.5" r="1.2" fill="#222" />
              <circle cx="15.5" cy="5.5" r="1.2" fill="#222" />
            </svg>
          </div>

          <svg id="charsvg" viewBox="0 0 300 420" width="270" height="368">
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
            <ellipse cx="150" cy="412" rx="88" ry="11" fill="rgba(0,0,0,.13)" />
            
            {/* Pants */}
            <rect x="102" y="303" width="46" height="96" rx="17" fill="#243447" />
            <rect x="152" y="303" width="46" height="96" rx="17" fill="#243447" />
            
            {/* Pants seam highlight */}
            <rect x="122" y="310" width="3" height="82" rx="1" fill="rgba(255,255,255,.07)" />
            <rect x="172" y="310" width="3" height="82" rx="1" fill="rgba(255,255,255,.07)" />
            
            {/* Shoes */}
            <ellipse cx="123" cy="396" rx="29" ry="13" fill="#181825" />
            <ellipse cx="177" cy="396" rx="29" ry="13" fill="#181825" />
            <ellipse cx="118" cy="392" rx="11" ry="4.5" fill="rgba(255,255,255,.13)" />
            <ellipse cx="172" cy="392" rx="11" ry="4.5" fill="rgba(255,255,255,.13)" />
            
            {/* Hoodie body */}
            <path d="M87,198 Q80,252 76,308 L224,308 Q220,252 213,198 Q175,214 150,214 Q125,214 87,198 Z" fill="#38BCC8" />
            
            {/* Hoodie texture/gradient overlay */}
            <path d="M87,198 Q80,252 76,308 L150,308 L150,214 Q125,214 87,198 Z" fill="rgba(255,255,255,.05)" />
            
            {/* Pocket */}
            <rect x="114" y="260" width="72" height="36" rx="10" fill="#2EAAB5" />
            <rect x="116" y="262" width="68" height="32" rx="9" fill="rgba(0,0,0,.05)" />
            
            {/* Hoodie strings */}
            <line x1="143" y1="214" x2="139" y2="244" stroke="#2EAAB5" strokeWidth="2.2" />
            <line x1="157" y1="214" x2="161" y2="244" stroke="#2EAAB5" strokeWidth="2.2" />
            <circle cx="139" cy="246" r="3.5" fill="#26979F" />
            <circle cx="161" cy="246" r="3.5" fill="#26979F" />
            
            {/* Collar */}
            <path d="M108,196 Q150,210 192,196 Q174,205 150,207 Q126,205 108,196 Z" fill="#2EAAB5" />

            {/* LEFT ARM (normal) */}
            <g id="armleft">
              <path d="M89,204 Q56,232 52,292 Q52,313 70,316 Q90,318 97,298 Q102,258 110,218 Z" fill="#38BCC8" />
              <ellipse cx="63" cy="311" rx="19" ry="13" fill="#F0B07A" transform="rotate(-15 63 311)" />
            </g>
            
            {/* LEFT ARM (wave - hidden by default) */}
            <g id="armwave" style={{ display: 'none', transformOrigin: '92px 210px' }}>
              <path d="M89,204 Q56,220 45,260 Q36,290 50,304 Q64,316 78,295 Q94,264 110,218 Z" fill="#38BCC8" />
              <ellipse cx="52" cy="300" rx="18" ry="12" fill="#F0B07A" transform="rotate(-35 52 300)" />
            </g>
            
            {/* LEFT ARM (thumbs-up - hidden by default) */}
            <g id="armthumb" style={{ display: 'none', transformOrigin: '92px 210px' }}>
              <path d="M89,204 Q65,190 52,165 Q44,145 55,135 Q65,126 75,145 Q85,165 110,218 Z" fill="#38BCC8" />
              <ellipse cx="57" cy="131" rx="15" ry="12" fill="#F0B07A" transform="rotate(20 57 131)" />
              {/* Thumb */}
              <path d="M60,128 Q55,120 62,116 Q68,112 70,120 Q72,128 65,132 Z" fill="#F0B07A" />
              <path d="M70,120 Q74,112 80,116 Q86,120 82,128 Q78,132 70,130 Z" fill="#F0B07A" />
            </g>

            {/* RIGHT ARM (holding tablet) */}
            <g id="armright">
              <path d="M211,204 Q244,232 248,292 Q248,313 230,316 Q210,318 203,298 Q198,258 190,218 Z" fill="#38BCC8" />
              <ellipse cx="237" cy="311" rx="19" ry="13" fill="#F0B07A" transform="rotate(15 237 311)" />
            </g>
            
            {/* Tablet */}
            <rect x="196" y="222" width="70" height="92" rx="9" fill="#1C2938" />
            <rect x="200" y="226" width="62" height="84" rx="7" fill="#2471A3" />
            <rect x="203" y="229" width="56" height="78" rx="5" fill="url(#tg)" />
            
            {/* Tablet screen content */}
            <circle cx="222" cy="246" r="3.5" fill="rgba(255,255,255,.55)" />
            <circle cx="232" cy="246" r="3.5" fill="rgba(255,255,255,.55)" />
            <circle cx="242" cy="246" r="3.5" fill="rgba(255,255,255,.55)" />
            <rect x="207" y="258" width="44" height="5" rx="2" fill="rgba(255,255,255,.4)" />
            <rect x="207" y="268" width="34" height="5" rx="2" fill="rgba(255,255,255,.3)" />
            <rect x="207" y="278" width="39" height="5" rx="2" fill="rgba(255,255,255,.3)" />
            <rect x="207" y="288" width="28" height="5" rx="2" fill="rgba(255,255,255,.2)" />
            
            {/* Tablet glow filter */}
            <rect x="200" y="226" width="62" height="84" rx="7" fill="rgba(100,200,255,.08)" filter="url(#glow)" />

            {/* Neck */}
            <rect x="129" y="184" width="42" height="27" rx="7" fill="#F0B07A" />

            {/* HEAD */}
            <ellipse cx="150" cy="118" rx="73" ry="79" fill="#F5B57A" />

            {/* Ears */}
            <ellipse cx="79" cy="120" rx="15" ry="20" fill="#F5B57A" />
            <ellipse cx="221" cy="120" rx="15" ry="20" fill="#F5B57A" />
            <ellipse cx="79" cy="120" rx="9" ry="13" fill="#E99A5E" />
            <ellipse cx="221" cy="120" rx="9" ry="13" fill="#E99A5E" />

            {/* HAIR (back) */}
            <ellipse cx="150" cy="62" rx="68" ry="46" fill="#221409" />
            {/* Hair front */}
            <path d="M83,88 Q79,48 102,33 Q122,20 150,18 Q178,20 198,33 Q221,48 217,88 Q198,56 150,54 Q102,56 83,88 Z" fill="#2D1B0E" />
            {/* Hair tuft */}
            <path d="M136,20 Q146,4 150,2 Q154,4 164,20 Q156,12 150,11 Q144,12 136,20 Z" fill="#2D1B0E" />
            {/* Hair sides */}
            <path d="M83,88 Q79,75 83,66" stroke="#2D1B0E" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M217,88 Q221,75 217,66" stroke="#2D1B0E" strokeWidth="9" fill="none" strokeLinecap="round" />
            {/* Hair highlight */}
            <path d="M130,25 Q148,18 165,24" stroke="rgba(255,255,255,.12)" strokeWidth="4" fill="none" strokeLinecap="round" />

            {/* EYEBROWS */}
            <path id="bleft" d="M107,88 Q121,80 134,85" stroke="#2D1B0E" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <path id="bright" d="M166,85 Q179,80 193,88" stroke="#2D1B0E" strokeWidth="4.5" fill="none" strokeLinecap="round" />

            {/* EYE LEFT */}
            <g id="eyelg">
              <ellipse cx="119" cy="114" rx="20" ry="22" fill="white" />
              <circle id="irl" cx="119" cy="114" r="13.5" fill="#5A3E28" />
              <circle id="pul" cx="119" cy="114" r="7.8" fill="#160C06" />
              <circle cx="123" cy="108" r="4.5" fill="white" opacity=".9" />
              <circle cx="114" cy="119" r="2" fill="white" opacity=".5" />
              <ellipse id="ell" cx="119" cy="92" rx="21" ry="1" fill="#F5B57A" />
            </g>
            
            {/* Eye right */}
            <g id="eyrg">
              <ellipse cx="181" cy="114" rx="20" ry="22" fill="white" />
              <circle id="irr" cx="181" cy="114" r="13.5" fill="#5A3E28" />
              <circle id="pur" cx="181" cy="114" r="7.8" fill="#160C06" />
              <circle cx="185" cy="108" r="4.5" fill="white" opacity=".9" />
              <circle cx="176" cy="119" r="2" fill="white" opacity=".5" />
              <ellipse id="elr" cx="181" cy="92" rx="21" ry="1" fill="#F5B57A" />
            </g>

            {/* Eyelashes left */}
            <g stroke="#2D1B0E" strokeWidth="1.5" strokeLinecap="round">
              <line x1="100" y1="96" x2="101" y2="89" />
              <line x1="108" y1="91" x2="107" y2="84" />
              <line x1="116" y1="89" x2="116" y2="82" />
              <line x1="124" y1="90" x2="125" y2="83" />
              <line x1="132" y1="93" x2="134" y2="86" />
              <line x1="138" y1="96" x2="140" y2="90" />
            </g>
            
            {/* Eyelashes right */}
            <g stroke="#2D1B0E" strokeWidth="1.5" strokeLinecap="round">
              <line x1="162" y1="96" x2="160" y2="90" />
              <line x1="168" y1="93" x2="166" y2="86" />
              <line x1="176" y1="90" x2="175" y2="83" />
              <line x1="184" y1="89" x2="184" y2="82" />
              <line x1="192" y1="91" x2="193" y2="84" />
              <line x1="199" y1="96" x2="200" y2="89" />
            </g>

            {/* NOSE */}
            <ellipse cx="150" cy="140" rx="8.5" ry="5.5" fill="#E99A5E" opacity=".65" />
            <circle cx="147" cy="138" r="2" fill="rgba(255,255,255,.38)" />

            {/* MOUTH expressions */}
            <path id="m-neutral" d="M129,162 Q150,176 171,162" stroke="#C47A4A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path id="m-happy" d="M123,160 Q150,182 177,160" stroke="#C47A4A" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0" />
            <path id="m-excited" d="M120,157 Q150,186 180,157" stroke="#C47A4A" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0" />
            <path id="m-think" d="M130,164 Q152,172 170,163" stroke="#C47A4A" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0" />
            <path id="m-annoy" d="M131,170 Q150,163 169,170" stroke="#C47A4A" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0" />
            <path id="m-curious" d="M129,163 Q148,175 168,161" stroke="#C47A4A" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0" />
            
            {/* Teeth */}
            <path id="teeth" d="M127,163 Q150,181 173,163 Q162,173 150,174 Q138,173 127,163 Z" fill="white" opacity="0" />

            {/* Blush */}
            <ellipse cx="96" cy="143" rx="18" ry="9.5" fill="#FF9898" opacity=".22" />
            <ellipse cx="204" cy="143" rx="18" ry="9.5" fill="#FF9898" opacity=".22" />
            
            {/* Freckles */}
            <circle cx="138" cy="149" r="2" fill="#D4906A" opacity=".4" />
            <circle cx="143" cy="154" r="1.5" fill="#D4906A" opacity=".4" />
            <circle cx="162" cy="149" r="2" fill="#D4906A" opacity=".4" />
            <circle cx="157" cy="154" r="1.5" fill="#D4906A" opacity=".4" />
          </svg>
        </div>

        <div id="inputarea">
          <input 
            id="maininput" 
            type="text" 
            placeholder="type 'login' or 'sign up'..." 
            autoComplete="off" 
            spellCheck="false" 
          />
          <p id="hint">✨ Just type what you'd like to do!</p>
          <div id="tdots">
            <div className="tdot"></div>
            <div className="tdot"></div>
            <div className="tdot"></div>
          </div>
        </div>
      </div>

      {/* FORM MODAL PANEL */}
      <div id="formpanel">
        <div id="fbackdrop"></div>
        <form id="fcard" onSubmit={handleFormSubmit} className="space-y-4">
          <h2 className="ftitle" id="ftitle">Welcome back!</h2>
          <p className="fsub" id="fsub">Sign in to continue your adventure</p>
          
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-xs font-bold text-center animate-in fade-in">
              ⚠️ {error}
            </div>
          )}

          {/* DYNAMIC FORM FIELDS */}
          {formMode === 'signup' && (
            <div className="ffield animate-in slide-in-from-top-1.5 duration-200">
              <label>Full Name</label>
              <input 
                type="text"
                placeholder="Abir Hossain"
                required
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          {(formMode === 'login' || formMode === 'signup' || formMode === 'forgot') && (
            <div className="ffield">
              <label>Email Address</label>
              <input 
                type="email" 
                placeholder="you@example.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          )}

          {(formMode === 'login' || formMode === 'signup') && (
            <div className="ffield">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          )}

          {formMode === 'signup' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 animate-in fade-in duration-200">
              <div className="ffield">
                <label>Academic Class</label>
                <select 
                  value={academicClass} 
                  onChange={e => setAcademicClass(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '13px 17px',
                    border: '2px solid rgba(150,130,100,0.18)',
                    borderRadius: '11px',
                    background: 'var(--inp)',
                    fontFamily: "'Nunito', sans-serif",
                    fontSize: '0.94rem',
                    fontWeight: 700,
                    color: 'var(--txt)',
                    outline: 'none'
                  }}
                >
                  {(dynamicClasses.length > 0 ? Array.from(new Set(dynamicClasses.map(c => c.name))) : ['SSC', 'HSC', 'Admission']).map(c => (
                    <option key={c} value={c} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-bold">{c}</option>
                  ))}
                </select>
              </div>

              {isGroupNeeded(academicClass) && (
                <div className="ffield">
                  <label>Academic Group</label>
                  <select 
                    value={academicGroup} 
                    onChange={e => setAcademicGroup(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '13px 17px',
                      border: '2px solid rgba(150,130,100,0.18)',
                      borderRadius: '11px',
                      background: 'var(--inp)',
                      fontFamily: "'Nunito', sans-serif",
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      color: 'var(--txt)',
                      outline: 'none'
                    }}
                  >
                    {['Science', 'Humanities', 'Commerce', 'All'].map(g => (
                      <option key={g} value={g} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-bold">{g}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {formMode === 'login' && (
            <button 
              type="button"
              onClick={() => {
                setFormMode('forgot');
                const formTitle = document.getElementById('ftitle');
                const formSub = document.getElementById('fsub');
                const formBtn = document.getElementById('fbtn');
                if (formTitle) formTitle.textContent = 'Forgot Password';
                if (formSub) formSub.textContent = 'Enter email to receive instructions';
                if (formBtn) formBtn.textContent = 'Send Reset Code 📧';
              }}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors pl-1 block mb-2 underline cursor-pointer text-left"
            >
              Forgot password?
            </button>
          )}

          {/* Core submit button */}
          <button type="submit" className="fbtn" id="fbtn" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCcw className="animate-spin" size={16} /> Connecting...
              </span>
            ) : (
              formMode === 'login' ? 'Let me in! 🚀' : 
              formMode === 'signup' ? 'Create Account! ✨' : 'Send Reset Code 📧'
            )}
          </button>

          {/* Social connection bridge */}
          <div className="relative py-2 pb-0">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-800/80" /></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-extrabold text-zinc-400"><span className="bg-[#fffdf8] dark:bg-[#121c30] px-3 transition-colors duration-300">or</span></div>
          </div>

          <button 
            type="button"
            onClick={onGoogleLogin}
            className="w-full py-3 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/40 flex items-center justify-center gap-3 font-extrabold text-xs text-zinc-600 dark:text-zinc-400 hover:border-indigo-400 dark:hover:border-indigo-400 transition-all cursor-pointer active:scale-98"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4.5 h-4.5" alt="Google Logo" />
            Continue with Google
          </button>

          <span className="bback" id="bback">← Go back</span>
        </form>
      </div>

      <div id="toast">✅ Action successful!</div>
      <button id="thmbtn" aria-label="Toggle dark mode">🌙</button>
    </div>
  );
};

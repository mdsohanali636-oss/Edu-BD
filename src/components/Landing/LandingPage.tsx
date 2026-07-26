import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, 
  X, 
  Mail, 
  Lock, 
  User,
  GraduationCap,
  School,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import parodorshiLogoPng from '../../assets/logo/parodorshiLogoBase64';

const LandingLogo = ({ className = "h-10 w-auto" }: { className?: string }) => {
  return (
    <img 
      src={parodorshiLogoPng} 
      alt="পারদর্শী Logo" 
      className={className}
      referrerPolicy="no-referrer"
    />
  );
};

interface LandingPageProps {
  onGoogleLogin: () => void;
  onEmailLogin: (email: string, pass: string) => void;
  onEmailSignUp: (name: string, email: string, pass: string, academicClass: string, academicGroup: string, schoolName: string) => void;
  onForgotPassword: (email: string) => Promise<void>;
  onPhoneSignIn: (phone: string, isSignUp?: boolean, name?: string, academicClass?: string, academicGroup?: string) => Promise<void>;
  onVerifyOtp: (otp: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
  dynamicClasses?: any[];
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onGoogleLogin, 
  onEmailLogin, 
  onEmailSignUp, 
  onForgotPassword, 
  error, 
  isLoading,
  dynamicClasses = []
}) => {
  // Credentials and selection State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [academicClass, setAcademicClass] = useState('');
  const [academicGroup, setAcademicGroup] = useState('All');
  const [formMode, setFormMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isResetSent, setIsResetSent] = useState(false);

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

  // Class selection needed indicator
  const isGroupNeeded = (className: string) => {
    if (!className || typeof className !== 'string') return false;
    const foundClass = dynamicClasses.find(c => c.name === className);
    if (foundClass) {
      return foundClass.has_groups ?? foundClass.hasGroups ?? false;
    }
    const normalized = className.toUpperCase();
    return normalized.includes('9') || normalized.includes('10') || normalized.includes('SSC') || normalized.includes('HSC') || normalized.includes('11') || normalized.includes('12');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formMode === 'login') {
      onEmailLogin(email.trim(), password);
    } else if (formMode === 'signup') {
      if (!schoolName.trim()) {
        showToast('School / College name is required! 🎓');
        return;
      }
      onEmailSignUp(name.trim(), email.trim(), password, academicClass, academicGroup, schoolName.trim());
    } else if (formMode === 'forgot') {
      try {
        await onForgotPassword(email.trim());
        setIsResetSent(true);
        showToast('Password reset link sent to your email! 📧');
      } catch (err: any) {
        console.error("[LandingPage / FORGOT] Failed to send forgot password email:", err);
      }
    }
  };

  const showToast = (message: string) => {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#07080d] text-[#e8ecff] flex flex-col items-center justify-center relative p-4 sm:p-6 overflow-hidden select-none font-sans">
      {/* CSS STYLES FOR SPLIT MORPH LOGIN */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root{
          --bg:#07080d;
          --panel:#0d0f18;
          --cyan:#37f0ff;
          --violet:#8b5cff;
          --pink:#ff3d9a;
          --text:#e8ecff;
          --muted:#6b7290;
        }

        .stage{
          position:relative;
          width:900px;
          max-width:94vw;
          height:580px;
          border-radius:28px;
          background:var(--panel);
          box-shadow:0 40px 100px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.08);
          overflow:hidden;
          display:flex;
          z-index: 10;
        }
        .visual{
          position:relative;
          width:50%;
          height:100%;
          overflow:hidden;
          transition:transform .9s cubic-bezier(.65,0,.35,1);
          display:flex;
          align-items:center;
          justify-content:center;
        }
        .visual::before{
          content:'';
          position:absolute;inset:-20%;
          background:
            radial-gradient(circle at 30% 30%, var(--cyan) 0%, transparent 45%),
            radial-gradient(circle at 70% 70%, var(--violet) 0%, transparent 50%),
            radial-gradient(circle at 50% 90%, var(--pink) 0%, transparent 40%);
          filter:blur(40px) saturate(1.4);
          animation:blob 10s ease-in-out infinite;
          opacity:.85;
        }
        @keyframes blob{
          0%,100%{transform:translate(0,0) rotate(0deg) scale(1);}
          33%{transform:translate(4%,-5%) rotate(8deg) scale(1.08);}
          66%{transform:translate(-3%,4%) rotate(-6deg) scale(0.96);}
        }
        .brand{position:relative;z-index:2;text-align:center;color:#fff;padding:0 30px;}
        .brand h1{font-size:32px;margin:0 0 10px;letter-spacing:.5px;text-shadow:0 0 30px rgba(55,240,255,.6);font-weight:800;color:#ffffff;}
        .brand p{color:rgba(255,255,255,.8);font-size:14px;line-height:1.6;max-width:280px;margin:0 auto;}

        .formside{
          width:50%;
          height:100%;
          display:flex;
          align-items:center;
          justify-content:center;
          transition:transform .9s cubic-bezier(.65,0,.35,1);
          padding:30px 24px;
          overflow-y:auto;
        }
        .formside form{width:100%;max-width:320px;}
        .toggle-title{color:var(--muted);font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;font-weight:700;}
        .formside h2{color:var(--text);font-size:28px;margin:0 0 22px;font-weight:800;}
        .field{position:relative;margin-bottom:18px;}
        .field input, .field select{
          width:100%;padding:14px 16px;
          background:#12141f;border:1px solid #232640;
          border-radius:12px;color:var(--text);font-size:14px;
          outline:none;transition:.25s;
        }
        .field input:focus, .field select:focus{
          border-color:var(--cyan);
          box-shadow:0 0 0 3px rgba(55,240,255,.15), 0 0 20px rgba(55,240,255,.25);
        }
        .field label{
          position:absolute;left:16px;top:14px;color:var(--muted);font-size:14px;
          pointer-events:none;transition:.2s;background:transparent;
        }
        .field input:focus + label, .field input:not(:placeholder-shown) + label, .field select + label{
          top:-9px;left:12px;font-size:11px;background:var(--panel);padding:0 6px;color:var(--cyan);font-weight:700;
        }
        .btn{
          width:100%;padding:14px;border:none;border-radius:12px;
          background:linear-gradient(90deg,var(--cyan),var(--violet));
          color:#03040a;font-weight:800;font-size:15px;cursor:pointer;
          box-shadow:0 10px 30px rgba(139,92,255,.35);
          transition:transform .2s, box-shadow .2s;
        }
        .btn:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(139,92,255,.5);}
        .switch{margin-top:20px;text-align:center;color:var(--muted);font-size:13px;}
        .switch span{color:var(--cyan);cursor:pointer;font-weight:700;}
        .switch span:hover{text-decoration:underline;}

        /* signup mode: swap sides */
        .stage.signup .visual{transform:translateX(100%);}
        .stage.signup .formside{transform:translateX(-100%);}
        .panel{display:none;}
        .panel.active{display:block;animation:fadein .5s ease;width:100%;}
        @keyframes fadein{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

        @media (max-width: 768px) {
          .stage {
            flex-direction: column;
            width: 100%;
            max-width: 100%;
            height: auto;
            max-height: 92vh;
            border-radius: 20px;
            overflow-y: auto;
            box-shadow: 0 20px 50px rgba(0,0,0,.9);
          }
          .visual, .formside {
            width: 100%;
            transform: none !important;
            transition: none;
          }
          .visual {
            height: auto;
            min-height: 110px;
            padding: 20px 16px 12px;
          }
          .visual .brand h1 {
            font-size: 20px;
            margin-bottom: 2px;
          }
          .visual .brand p {
            font-size: 12px;
            max-width: 100%;
          }
          .formside {
            padding: 20px 16px 28px;
            height: auto;
          }
          .formside form {
            max-width: 100%;
          }
          .formside h2 {
            font-size: 22px;
            margin-bottom: 16px;
          }
          .field {
            margin-bottom: 14px;
          }
          .field input, .field select {
            font-size: 16px; /* Prevents auto-zoom on iOS */
            padding: 12px 14px;
            border-radius: 10px;
          }
          .field label {
            font-size: 13px;
            top: 12px;
          }
          .field input:focus + label, .field input:not(:placeholder-shown) + label, .field select + label {
            top: -9px;
            left: 10px;
            font-size: 10px;
          }
          .btn {
            padding: 13px;
            border-radius: 10px;
            font-size: 15px;
          }
          .stage.signup .visual,
          .stage.signup .formside {
            transform: none !important;
          }
        }

        #toast{position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-80px);background:linear-gradient(135deg,#4CAF50,#45A049);color:#fff;padding:12px 28px;border-radius:50px;font-weight:800;font-size:.95rem;z-index:200;transition:transform .4s cubic-bezier(.34,1.56,.64,1);white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,0.5);}
        #toast.show{transform:translateX(-50%) translateY(0);}
      ` }} />


      {/* SPLIT MORPH LOGIN CONTAINER */}
      <div className={`stage ${formMode === 'signup' ? 'signup' : ''}`} id="stage">
        {/* Visual Side */}
        <div className="visual">
          <div className="brand">
            <div className="flex justify-center mb-3">
              <LandingLogo className="h-12 w-auto filter drop-shadow-[0_0_25px_rgba(55,240,255,0.8)]" />
            </div>
            <h1 id="brandTitle">
              {formMode === 'signup' ? 'Join Parodorshi' : 'Welcome Back'}
            </h1>
            <p id="brandText">
              {formMode === 'signup' 
                ? 'Create your account and start building your future today.' 
                : 'Sign in to pick up right where you left off.'}
            </p>
          </div>
        </div>

        {/* Form Side */}
        <div className="formside">
          {/* LOGIN PANEL */}
          <div className={`panel ${formMode === 'login' ? 'active' : ''}`} id="loginPanel">
            <div className="toggle-title">Parodorshi Account</div>
            <h2>Log in</h2>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold text-center">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="field">
                <input 
                  type="email" 
                  placeholder=" " 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <label>Email address</label>
              </div>
              
              <div className="field">
                <input 
                  type="password" 
                  placeholder=" " 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <label>Password</label>
              </div>

              <div className="flex items-center justify-between mb-4">
                <button 
                  type="button"
                  onClick={() => {
                    setIsResetSent(false);
                    setFormMode('forgot');
                  }}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCcw className="animate-spin" size={16} /> Connecting...
                  </span>
                ) : (
                  'Log in'
                )}
              </button>
            </form>

            <div className="switch">
              New here? <span onClick={() => setFormMode('signup')}>Create an account</span>
            </div>
          </div>

          {/* SIGNUP PANEL */}
          <div className={`panel ${formMode === 'signup' ? 'active' : ''}`} id="signupPanel">
            <div className="toggle-title">Parodorshi Account</div>
            <h2>Sign up</h2>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold text-center">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="field">
                <input 
                  type="text" 
                  placeholder=" " 
                  required 
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <label>Full name</label>
              </div>

              <div className="field">
                <input 
                  type="email" 
                  placeholder=" " 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <label>Email address</label>
              </div>

              <div className="field">
                <input 
                  type="password" 
                  placeholder=" " 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <label>Password</label>
              </div>

              <div className="field">
                <input 
                  type="text" 
                  placeholder=" " 
                  required 
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                />
                <label>School / College Name</label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className="field mb-0">
                  <select 
                    value={academicClass} 
                    onChange={e => setAcademicClass(e.target.value)}
                  >
                    {(dynamicClasses.length > 0 ? Array.from(new Set(dynamicClasses.map(c => c.name))) : ['SSC', 'HSC', 'Admission']).map(c => (
                      <option key={c} value={c} className="bg-zinc-900 text-white font-bold">{c}</option>
                    ))}
                  </select>
                  <label>Academic Class</label>
                </div>

                {isGroupNeeded(academicClass) && (
                  <div className="field mb-0">
                    <select 
                      value={academicGroup} 
                      onChange={e => setAcademicGroup(e.target.value)}
                    >
                      {['Science', 'Humanities', 'Commerce', 'All'].map(g => (
                        <option key={g} value={g} className="bg-zinc-900 text-white font-bold">{g}</option>
                      ))}
                    </select>
                    <label>Academic Group</label>
                  </div>
                )}
              </div>

              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCcw className="animate-spin" size={16} /> Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <div className="switch">
              Already have an account? <span onClick={() => setFormMode('login')}>Log in</span>
            </div>
          </div>

          {/* FORGOT PASSWORD PANEL */}
          <div className={`panel ${formMode === 'forgot' ? 'active' : ''}`} id="forgotPanel">
            <div className="toggle-title">Parodorshi Account</div>
            <h2>Reset Password</h2>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-bold text-center">
                ⚠️ {error}
              </div>
            )}

            {isResetSent && (
              <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold text-center">
                📧 Password reset email has been sent! Check your inbox.
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="field">
                <input 
                  type="email" 
                  placeholder=" " 
                  required 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <label>Email address</label>
              </div>

              <button type="submit" className="btn" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCcw className="animate-spin" size={16} /> Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className="switch">
              Remember your password? <span onClick={() => setFormMode('login')}>Back to Log in</span>
            </div>
          </div>
        </div>
      </div>

      <div id="toast">✅ Action successful!</div>
    </div>
  );
};

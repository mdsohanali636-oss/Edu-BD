import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'motion/react';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle, RefreshCcw, LogIn } from 'lucide-react';

interface ResetPasswordPageProps {
  onSuccess: () => void;
}

interface SharedRecoveryState {
  promise: Promise<any> | null;
  status: 'idle' | 'pending' | 'success' | 'error';
  error: any | null;
}

let sharedRecovery: SharedRecoveryState = {
  promise: null,
  status: 'idle',
  error: null
};

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState(5);

  const hasProcessedRecoveryRef = useRef(false);

  useEffect(() => {
    // Audit Log
    console.log("[PasswordReset / MOUNT] ResetPasswordPage mounted. Checking for recovery context...");

    if (hasProcessedRecoveryRef.current) {
      console.log("[PasswordReset / DUPLICATE] duplicate execution blocked: Recovery logic already ran once inside this component instance.");
      return;
    }
    hasProcessedRecoveryRef.current = true;

    // 1. Detect tokens / errors from URL search & hash parameters
    const hash = window.location.hash;
    const search = window.location.search;
    
    const searchParams = new URLSearchParams(search);
    const hashParams = new URLSearchParams(hash.replace('#', '?').replace(/^([^?])/, '?$1'));
    
    const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');
    const type = searchParams.get('type') || hashParams.get('type');
    
    const err = searchParams.get('error') || hashParams.get('error');
    const errCode = searchParams.get('error_code') || hashParams.get('error_code');
    const errDesc = searchParams.get('error_description') || hashParams.get('error_description');

    console.log("[PasswordReset / ROUTING] URL token detection context:", {
      hashExist: !!hash,
      searchExist: !!search,
      isRecoveryEvent: type === 'recovery' || hash.includes('type=recovery') || hash.includes('type%3Drecovery'),
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      err,
      errCode,
      errDesc
    });

    if (err || errDesc) {
      console.error("[PasswordReset / SESSION_FAILURE] URL query errors found:", err, errDesc);
      const decodedDesc = decodeURIComponent((errDesc || err || '').replace(/\+/g, ' '));
      const looksLikeExpired = decodedDesc.toLowerCase().includes('expired') || 
                               decodedDesc.toLowerCase().includes('invalid') || 
                               decodedDesc.toLowerCase().includes('bad') ||
                               errCode === 'otp_expired';

      setIsTokenValid(false);
      setIsValidating(false);
      if (looksLikeExpired) {
        setIsExpired(true);
        setErrorMsg("Password reset link has expired. Please request a new reset email.");
        console.warn("[PasswordReset / TOKEN_EXPIRATION] Determined token was expired via URL parameters.");
      } else {
        setErrorMsg(decodedDesc);
      }
      return;
    }

    if (accessToken) {
      console.info("[PasswordReset / RECOVERY_LINK_DETECTED] Active recovery link detected in URL parameters.");
      console.info("[PasswordReset / TOKEN_FOUND] Found access_token:", accessToken.substring(0, 10) + "...");

      // 2. Prevent duplicate recovery execution across all mounts by using a centralized Promise
      if (sharedRecovery.status === 'idle') {
        console.log("[PasswordReset / TOKEN_DETECTION] Creating authentication session from URL token parameters (Initiated FIRST call)...");
        sharedRecovery.status = 'pending';
        sharedRecovery.promise = supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ""
        }).then(({ data, error }) => {
          if (error) {
            sharedRecovery.status = 'error';
            sharedRecovery.error = error;
            console.error("[PasswordReset / SESSION_FAILURE] Supabase setSession rejected token configuration:", error);
            return { data, error };
          } else {
            sharedRecovery.status = 'success';
            console.log("[PasswordReset / SESSION_CREATION] Session registered successfully dynamically via token. Active target user:", data?.user?.email);
            return { data, error: null };
          }
        }).catch(err => {
          sharedRecovery.status = 'error';
          sharedRecovery.error = err;
          console.error("[PasswordReset / SESSION_FAILURE] Crash setting session parameters on mount:", err);
          return { data: null, error: err };
        });
      } else {
        console.log(`[PasswordReset / DUPLICATE] duplicate execution prevented: Reusing existing setSession promise (current status: ${sharedRecovery.status})`);
      }

      if (sharedRecovery.promise) {
        sharedRecovery.promise.then(({ data, error }) => {
          if (error) {
            const errorMsgStr = error.message || "";
            const looksLikeExpired = errorMsgStr.toLowerCase().includes('expired') || 
                                     errorMsgStr.toLowerCase().includes('invalid') || 
                                     errorMsgStr.toLowerCase().includes('bad') || 
                                     errorMsgStr.toLowerCase().includes('not found') ||
                                     errorMsgStr.toLowerCase().includes('signature') ||
                                     errorMsgStr.toLowerCase().includes('otp');
            
            setIsTokenValid(false);
            setIsValidating(false);
            if (looksLikeExpired) {
              setIsExpired(true);
              setErrorMsg("Password reset link has expired. Please request a new reset email.");
              console.warn("[PasswordReset / TOKEN_EXPIRATION] SetSession verification flagged expired credentials.");
            } else {
              setErrorMsg(error.message);
            }
          } else {
            setIsTokenValid(true);
            setIsValidating(false);
            setErrorMsg(null);
            
            // Scrub token details from visual browser address bar to satisfy production hygiene and refresh resilience
            if (window.location.hash || window.location.search) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        }).catch(err => {
          console.error("[PasswordReset / PROMISE_CATCH] Recovery promise resolver failed:", err);
          setIsTokenValid(false);
          setIsValidating(false);
          setErrorMsg("Password reset link has expired. Please request a new reset email.");
        });
      }
    } else {
      console.log("[PasswordReset / SESSION] No direct token present in URL. Verifying memory authorization sessions...");
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error("[PasswordReset / SESSION_FAILURE] Failed checking existing query session:", error);
          setIsTokenValid(false);
          setIsValidating(false);
          setErrorMsg("পাসওয়ার্ড রিসেট সেশন খুঁজে পাওয়া যায়নি। দয়া করে আবার পাসওয়ার্ড রিসেট লিংক জেনারেট করুন।");
        } else if (data?.session) {
          console.log("[PasswordReset / SESSION_CREATION] Active session validated from client storage cache. Target user:", data.session.user?.email);
          setIsTokenValid(true);
          setIsValidating(false);
        } else {
          // Defer checking brief timeout period for background SDK parse latency
          console.log("[PasswordReset / SESSION] Initiating deferred secondary session query fallback...");
          setTimeout(() => {
            supabase.auth.getSession().then(({ data: secondaryData, error: secondaryError }) => {
              if (secondaryError) {
                console.error("[PasswordReset / SESSION_FAILURE] Deferred session fallback check had error:", secondaryError);
                setIsTokenValid(false);
                setIsValidating(false);
              } else if (secondaryData?.session) {
                console.log("[PasswordReset / SESSION_CREATION] Verified deferred authorization session. Target user:", secondaryData.session.user?.email);
                setIsTokenValid(true);
                setIsValidating(false);
              } else {
                console.warn("[PasswordReset / SESSION_FAILURE] No authentication session could be verified.");
                setIsTokenValid(false);
                setIsValidating(false);
                setIsExpired(true);
                setErrorMsg("Password reset link has expired. Please request a new reset email.");
              }
            });
          }, 1000);
        }
      });
    }

    // Subscribe to password recovery state changes in local auth stream
    const { data: { subscription: internalAuthListener } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[PasswordReset / AUTH_EVENT] Internal reset hook event changed:", event, session ? "Session parsed" : "No session");
      if (event === 'PASSWORD_RECOVERY') {
        console.log("[PasswordReset / SUCCESS] Password recovery state event matches, setting token validity true.");
        setIsTokenValid(true);
        setIsValidating(false);
        setErrorMsg(null);
      }
    });

    return () => {
      internalAuthListener.unsubscribe();
    };
  }, []);

  // Countdown clock handling redirecting user back upon successful update completion
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (success && countdown === 0) {
      onSuccess();
    }
    return () => clearTimeout(timer);
  }, [success, countdown, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg("পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("পাসওয়ার্ড দুটি মেলেনি। দয়া করে আবার টাইপ করুন।");
      return;
    }

    setIsLoading(true);

    try {
      console.log("[PasswordReset] Injecting new password parameters via Supabase updateUser API...");
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      console.log("[PasswordReset / SUCCESS] Password updated completed successfully for user:", data?.user?.email);
      setSuccess(true);
      
      // Clear recovery state
      sharedRecovery = {
        promise: null,
        status: 'idle',
        error: null
      };

      // Auto sign-out to fully purge old metadata credentials securely
      await supabase.auth.signOut();
    } catch (err: any) {
      console.error("[PasswordReset / SESSION_FAILURE] User password update failed:", err);
      setErrorMsg(err.message || "পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Loading Verification State View
  if (isValidating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f8fafc] dark:bg-[#070d19] transition-colors duration-500">
        <div className="absolute inset-0 bg-grid-zinc-200/40 dark:bg-grid-zinc-800/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-6 shadow-sm border border-blue-100 dark:border-blue-900/30 animate-pulse">
            <KeyRound size={32} className="animate-spin-slow" />
          </div>
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            লিংকটি যাচাই করা হচ্ছে...
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
            Validating your password reset link. Please hold on.
          </p>
          <div className="mt-6 flex gap-1.5 justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // 2. Expired View State View
  if (isTokenValid === false || isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-[#070d19] transition-colors duration-500">
        <div className="absolute inset-0 bg-grid-zinc-200/40 dark:bg-grid-zinc-800/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-md bg-white dark:bg-[#0f172a] shadow-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-8 text-center transition-colors overflow-hidden"
        >
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 dark:bg-rose-600/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-6 py-4">
            <div className="flex justify-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <AlertTriangle size={32} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                রিসেট লিংকটির মেয়াদ শেষ হয়েছে
              </h3>
              
              <div className="text-xs text-rose-600 dark:text-rose-400 font-bold leading-relaxed bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl text-center space-y-1">
                <p>
                  Password reset link has expired. Please request a new reset email.
                </p>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-2 border-t border-rose-100 dark:border-rose-900/20 pt-2">
                  পাসওয়ার্ড রিসেটের লিংকটি ভুল অথবা এর মেয়াদ শেষ হয়ে গেছে। দয়া করে লগইন পেজ থেকে পুনরায় নতুন পাসওয়ার্ড রিসেট লিংক পাঠানোর জন্য অনুরোধ করুন।
                </p>
              </div>
            </div>

            <button
              onClick={onSuccess}
              className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-extrabold text-sm rounded-2xl transition-all cursor-pointer active:scale-98"
            >
              লগইন পেজে ফিরে যান (Return to Login)
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. Form Input View
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-[#070d19] transition-colors duration-500">
      <div className="absolute inset-0 bg-grid-zinc-200/40 dark:bg-grid-zinc-800/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md bg-white dark:bg-[#0f172a] shadow-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-8 text-center transition-colors overflow-hidden"
      >
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/10 dark:bg-rose-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-4 shadow-sm border border-blue-100 dark:border-blue-900/30">
              <KeyRound size={28} />
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              পাসওয়ার্ড রিসেট করুন
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
              Parodorshhi Educational Portal
            </p>
          </div>

          {success ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6 py-4"
            >
              <div className="flex justify-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 px-4">
                  আপনার নতুন পাসওয়ার্ডটি সেট করা হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে পুনরায় লগইন করুন।
                </p>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center justify-center gap-2">
                <RefreshCcw size={14} className="animate-spin text-blue-500" />
                {countdown} সেকেন্ডের মধ্যে লগইন পেজে রিডাইরেক্ট করা হচ্ছে...
              </div>

              <button
                onClick={onSuccess}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn size={16} /> এখনই লগইন করুন
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/40 flex items-start gap-2.5">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* New Password Input */}
              <div className="space-y-2">
                <label className="block text-[11px] uppercase tracking-wider font-extrabold text-zinc-400 dark:text-zinc-500">
                  নতুন পাসওয়ার্ড (New Password)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="কমপক্ষে ৬টি অক্ষর টাইপ করুন"
                    className="w-full px-4 py-3.5 pl-4 pr-12 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#121c30] text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 text-sm font-bold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#070d19] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label className="block text-[11px] uppercase tracking-wider font-extrabold text-zinc-400 dark:text-zinc-500">
                  নতুন পাসওয়ার্ড নিশ্চিত করুন (Confirm Password)
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="পাসওয়ার্ডটি পুনরায় লিখুন"
                    className="w-full px-4 py-3.5 pl-4 pr-12 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#121c30] text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 text-sm font-bold focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-[#070d19] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCcw size={16} className="animate-spin" /> রিসেট করা হচ্ছে...
                  </>
                ) : (
                  "পাসওয়ার্ড পরিবর্তন করুন"
                )}
              </button>

              <button
                type="button"
                onClick={onSuccess}
                className="w-full py-2.5 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-bold hover:underline text-center cursor-pointer transition-all"
              >
                লগইন পেজে ফিরে যান
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};


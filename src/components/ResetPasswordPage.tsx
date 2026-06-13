import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'motion/react';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertTriangle, RefreshCcw, LogIn } from 'lucide-react';

interface ResetPasswordPageProps {
  onSuccess: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 1. Detect tokens / errors from URL
    const hash = window.location.hash;
    const search = window.location.search;
    const params = new URLSearchParams(search || hash.replace('#', '?'));
    
    const err = params.get('error');
    const errDesc = params.get('error_description');
    const accessToken = params.get('access_token');
    const isRecovery = params.get('type') === 'recovery' || hash.includes('type=recovery') || hash.includes('type%3Drecovery');

    console.log("[PasswordReset / MOUNT] URL query and hash analysis:", {
      hash,
      search,
      err,
      errDesc,
      hasAccessToken: !!accessToken,
      isRecovery
    });

    if (err || errDesc) {
      console.error("[PasswordReset / ERROR] Recovery error detected in URL:", err, errDesc);
      setIsTokenValid(false);
      setErrorMsg(decodeURIComponent((errDesc || err || '').replace(/\+/g, ' ')));
    } else if (accessToken || isRecovery) {
      console.log("[PasswordReset / SUCCESS] Direct recovery token/type detected in URL. Token is valid.");
      setIsTokenValid(true);
    } else {
      // We'll check if supabase currently has an active session
      supabase.auth.getSession().then(({ data }) => {
        console.log("[PasswordReset / SESSION] Checked initial Supabase auth session status:", !!data?.session);
        if (data?.session) {
          setIsTokenValid(true);
        } else {
          // Wait briefly in case Supabase is still parsing the hash in the background
          setTimeout(() => {
            supabase.auth.getSession().then(({ data: secondaryData }) => {
              console.log("[PasswordReset / DEFERRED_SESSION] Checked deferred Supabase auth session:", !!secondaryData?.session);
              if (secondaryData?.session) {
                setIsTokenValid(true);
              } else {
                // We will set this to false, but onAuthStateChange can still correct it to true if a recovery event fires later
                setIsTokenValid((current) => {
                  if (current === true) return true;
                  setErrorMsg("রিসেট লিংকটি অকার্যকর অথবা মেয়াদোত্তীর্ণ। দয়া করে আবার নতুন পাসওয়ার্ড রিসেট লিংক জেনারেট করুন।");
                  return false;
                });
              }
            });
          }, 800);
        }
      });
    }

    // Subscribe to password recovery and session events inside ResetPasswordPage to avoid race conditions
    const { data: { subscription: internalAuthListener } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[PasswordReset / AUTH_EVENT] Internal Reset Page Auth Event:", event, session ? "Session is active" : "No session");
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        console.log("[PasswordReset / SUCCESS] Valid recovery event or sign-in detected through Auth State Change.");
        setIsTokenValid(true);
        setErrorMsg(null);
      }
    });

    return () => {
      internalAuthListener.unsubscribe();
    };
  }, []);

  // Handle countdown redirection
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

    // Form validation
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
      console.log("[PasswordReset] Attempting password update with Supabase Auth...");
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      console.log("[PasswordReset] Password updated successfully for user:", data?.user?.email);
      setSuccess(true);
      
      // Auto-signout to force user to login with new credentials
      await supabase.auth.signOut();
    } catch (err: any) {
      console.error("[PasswordReset] Error updating password:", err);
      setErrorMsg(err.message || "পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc] dark:bg-[#070d19] transition-colors duration-500">
      <div className="absolute inset-0 bg-grid-zinc-200/40 dark:bg-grid-zinc-800/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md bg-white dark:bg-[#0f172a] shadow-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-8 text-center transition-colors overflow-hidden"
      >
        {/* Floating background decorative blobs */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/10 dark:bg-rose-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Logo / Header */}
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
          ) : isTokenValid === false ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6 py-4"
            >
              <div className="flex justify-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                  <AlertTriangle size={32} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  লিংকটি সঠিক নয় বা মেয়াদ ফুরিয়েছে!
                </h3>
                <p className="text-xs text-rose-500 dark:text-rose-400 font-medium leading-relaxed bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-2xl text-center">
                  {errorMsg || "পাসওয়ার্ড রিসেট লিংকটি ভুল অথবা এর মেয়াদ শেষ হয়ে গেছে। দয়া করে লগইন পেজ থেকে আরেকটি নতুন রিকোয়েস্ট পাঠান।"}
                </p>
              </div>

              <button
                onClick={onSuccess}
                className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-sm rounded-2xl transition-all cursor-pointer active:scale-98"
              >
                লগইন পেজে ফিরে যান
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              {errorMsg && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-900/40 flex items-start gap-2.5 animate-shake">
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

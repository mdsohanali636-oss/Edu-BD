import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  Crown, 
  Smartphone, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Send, 
  Play, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  Info,
  Sparkles,
  Flame,
  Layers,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { supabaseService } from '../../services/supabaseService';
import { SubscriptionSettings, SubscriptionPackage, SubscriptionBenefit, SubscriptionRequest, SubscriptionCoupon } from '../../types';
import { Button } from '../ui/Base';

interface PremiumSubscriptionPageProps {
  user: any;
  onActivated?: () => void;
  onNavigateHome?: () => void;
}

export const PremiumSubscriptionPage: React.FC<PremiumSubscriptionPageProps> = ({ 
  user, 
  onActivated,
  onNavigateHome 
}) => {
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [benefits, setBenefits] = useState<SubscriptionBenefit[]>([]);
  const [pendingRequests, setPendingRequests] = useState<SubscriptionRequest[]>([]);
  const [allUserRequests, setAllUserRequests] = useState<SubscriptionRequest[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad'>('bKash');
  
  // Coupon and Stats state variables (Feature 2, 9)
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupons, setActiveCoupons] = useState<SubscriptionCoupon[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<SubscriptionCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Reference & Copy fields
  const [copiedRef, setCopiedRef] = useState(false);

  const getPaymentReference = () => {
    if (!user) return 'PARODORSSHHI';
    if (user.phone) {
      return user.phone.replace(/[^0-9]/g, '');
    }
    if (user.email) {
      return user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16);
    }
    return user.id.slice(0, 8).toUpperCase();
  };

  const handleCopyReference = () => {
    navigator.clipboard.writeText(getPaymentReference());
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };
  
  // Form fields
  const [paymentNumber, setPaymentNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pricing Calculation Function (Feature 9)
  const getCalculatedPrices = () => {
    if (!selectedPackage) return { original: 0, discount: 0, final: 0 };
    const original = selectedPackage.price;
    let discount = 0;
    if (appliedCoupon) {
      if (appliedCoupon.discount_type === 'percentage') {
        discount = Math.round((original * appliedCoupon.discount_value) / 100);
      } else {
        discount = appliedCoupon.discount_value;
      }
    }
    const final = Math.max(0, original - discount);
    return { original, discount, final };
  };

  const handleApplyCouponCode = (codeToApply?: string) => {
    setCouponError(null);
    setCouponSuccess(null);
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) {
      setAppliedCoupon(null);
      return;
    }

    const matched = activeCoupons.find(c => c.code.toUpperCase() === code);
    if (!matched) {
      setCouponError("Invalid coupon code.");
      setAppliedCoupon(null);
      return;
    }

    if (matched.expiry_date && new Date(matched.expiry_date).getTime() < Date.now()) {
      setCouponError("This coupon code has expired.");
      setAppliedCoupon(null);
      return;
    }

    if (matched.usage_limit && matched.used_count && matched.used_count >= matched.usage_limit) {
      setCouponError("This coupon has reached its usage limit.");
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(matched);
    setCouponSuccess(`Coupon Applied! Saved ৳${matched.discount_type === 'percentage' ? Math.round(((selectedPackage?.price || 0) * matched.discount_value) / 100) : matched.discount_value}`);
  };

  // Fetch settings, packages, benefits, and pending requests on load
  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      const [fetchedSettings, fetchedPackages, fetchedBenefits, fetchedCoupons] = await Promise.all([
        supabaseService.getSubscriptionSettings(),
        supabaseService.getSubscriptionPackages(),
        supabaseService.getSubscriptionBenefits(),
        supabaseService.getCoupons()
      ]);

      setSettings(fetchedSettings);
      setActiveCoupons(fetchedCoupons.filter(c => c.is_active));
      
      const activePackages = fetchedPackages.filter(p => p.is_active);
      setPackages(activePackages);
      
      if (activePackages.length > 0) {
        setSelectedPackage(activePackages[0]);
      }

      setBenefits(fetchedBenefits.filter(b => b.is_active));

      if (user?.id) {
        const [userPending, userAll] = await Promise.all([
          supabaseService.getPendingRequestsForUser(user.id),
          supabaseService.getRequestsForUser(user.id)
        ]);
        setPendingRequests(userPending);
        setAllUserRequests(userAll || []);

        // Welcome screen activation check (Feature 7)
        try {
          const { data: profile } = await supabase.from('profiles').select('has_premium_access').eq('id', user.id).maybeSingle();
          if (profile?.has_premium_access) {
            const hasSeen = localStorage.getItem(`seen_premium_welcome_${user.id}`);
            if (hasSeen !== 'true') {
              setShowWelcomeModal(true);
            }
          }
        } catch (e) {
          console.error("Welcome verification error:", e);
        }
      }
    } catch (err: any) {
      console.error("[PremiumSubscriptionPage] Error loading data:", err);
      setErrorMessage("Could not connect to subscription database. Using local fail-safes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();

    // Subscribe to realtime updates for user requests
    if (!user?.id) return;
    const requestChannel = supabase
      .channel(`sub-requests-realtime-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subscription_requests',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadSubscriptionData();
      })
      .subscribe();

    // Also subscribe to changes in user profile to detect instant activation
    const profileChannel = supabase
      .channel(`sub-profiles-realtime-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      }, (payload: any) => {
        if (payload.new && payload.new.has_premium_access) {
          setSuccessMessage("🎉 Your Premium Subscription has been approved! Enjoy premium privileges.");
          if (onActivated) onActivated();
          
          // Trigger the celebrate popup instantly upon approval!
          const hasSeen = localStorage.getItem(`seen_premium_welcome_${user.id}`);
          if (hasSeen !== 'true') {
            setShowWelcomeModal(true);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requestChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!user?.id) {
      setErrorMessage("Please sign in or re-log to verify subscription eligibility.");
      return;
    }

    if (!selectedPackage) {
      setErrorMessage("Please select a subscription package.");
      return;
    }

    const cleanNumber = paymentNumber.trim();
    const cleanTxId = transactionId.trim().toUpperCase();

    if (!cleanNumber || cleanNumber.length < 10) {
      setErrorMessage("Please submit a valid bKash or Nagad sender account number.");
      return;
    }

    if (!cleanTxId || cleanTxId.length < 6) {
      setErrorMessage("Please submit a valid TxID returned by the service provider.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Duplicate prevention checks locally and remotely
      const currentPending = await supabaseService.getPendingRequestsForUser(user.id);
      if (currentPending.length > 0) {
        setPendingRequests(currentPending);
        setErrorMessage("⚠️ Duplicate Request blocked: You already have a pending submission waiting for verification.");
        setIsSubmitting(false);
        return;
      }

      const { original, discount, final } = getCalculatedPrices();

      await supabaseService.submitSubscriptionRequest({
        user_id: user.id,
        package_name: selectedPackage.name,
        amount: final,
        payment_method: paymentMethod,
        transaction_id: cleanTxId,
        payment_number: cleanNumber,
        original_amount: original,
        discount_amount: discount,
        coupon_code: appliedCoupon ? appliedCoupon.code : null
      } as any);

      setSuccessMessage("Payment Submitted Successfully! Waiting For Admin Approval.");
      setPaymentNumber('');
      setTransactionId('');
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponSuccess(null);
      
      // Reload states
      const [userPending, userAll] = await Promise.all([
        supabaseService.getPendingRequestsForUser(user.id),
        supabaseService.getRequestsForUser(user.id)
      ]);
      setPendingRequests(userPending);
      setAllUserRequests(userAll || []);
    } catch (err: any) {
      console.error("[submitSubscriptionRequest] Error:", err);
      if (err.message && err.message.includes('unique')) {
        setErrorMessage("❌ Duplicate Transaction ID Detected: This TxID was already submitted for verification.");
      } else {
        setErrorMessage(err.message || "Failed to issue submission. Please review connection or transaction ID layout.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <Crown size={48} className="text-zinc-400 animate-bounce" />
        <p className="text-zinc-500 font-bold font-mono text-sm">LOADING PREMIUM ARCHITECTURE...</p>
      </div>
    );
  }

  const hasPending = pendingRequests.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12 select-none">
      {/* Premium Poster/Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[32px] overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-white min-h-[340px] flex flex-col justify-end p-6 md:p-12 shadow-2xl"
      >
        <div className="absolute inset-0 z-0">
          <img 
            src={settings?.poster_image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200'} 
            className="w-full h-full object-cover object-center opacity-30"
            alt="Premium Promotion Poster"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <Badge className="bg-amber-500 hover:bg-amber-600 text-black border-none px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase inline-flex items-center gap-2">
            <Crown size={12} fill="currentColor" /> Parodorshhi PRO Premium
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">{settings?.poster_title || 'Unlock Excellence'}</h1>
          <p className="text-zinc-300 text-sm md:text-base leading-relaxed font-semibold">
            {settings?.poster_description || 'Get full access to all premium exams, in-depth subject-specific interactive analytics, exclusive books and notes, and automatic future premium modules.'}
          </p>
        </div>
      </motion.div>

      {/* Premium Platform Statistics Bento-Grid (Feature 2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
        {[
          { label: "Premium Members", value: settings?.stats_members || 1250, desc: "Active Learners", color: "text-amber-500" },
          { label: "Premium Exams", value: settings?.stats_exams || 45, desc: "Comprehensive Tests", color: "text-blue-500" },
          { label: "Premium Notes", value: settings?.stats_notes || 180, desc: "Subject Books", color: "text-emerald-500" },
          { label: "Premium Sheets", value: settings?.stats_sheets || 65, desc: "Diagnostic Modules", color: "text-pink-500" }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm text-center flex flex-col justify-center items-center relative overflow-hidden"
          >
            <span className={`text-2xl md:text-3xl font-black ${item.color} tracking-tight block`}>
              {item.value.toLocaleString()}+
            </span>
            <span className="text-zinc-800 dark:text-zinc-100 font-extrabold text-[11px] mt-1 block">{item.label}</span>
            <span className="text-zinc-400 text-[9px] uppercase font-bold mt-0.5 tracking-wider block">{item.desc}</span>
            <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-zinc-100 dark:bg-zinc-800/20 rounded-full blur-xl animate-pulse" />
          </motion.div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Benefits & Packages */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Subscription Benefits */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" /> Premium Membership Benefits
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit) => (
                <div key={benefit.id} className="flex items-start gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="bg-emerald-500/10 text-emerald-500 p-1.5 rounded-xl mt-0.5 shrink-0">
                    <Check size={14} className="stroke-[3]" />
                  </div>
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 leading-tight">
                    {benefit.text}
                  </span>
                </div>
              ))}
              {benefits.length === 0 && (
                <>
                  <div className="flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl">
                    <Check size={16} className="text-emerald-500 mt-1" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Premium Practice Exams & Mockups</span>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl">
                    <Check size={16} className="text-emerald-500 mt-1" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Advanced Interactive Performance Analytics</span>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl">
                    <Check size={16} className="text-emerald-500 mt-1" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Exclusive Books, Lecture Notes, Sheets</span>
                  </div>
                  <div className="flex items-start gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl">
                    <Check size={16} className="text-emerald-500 mt-1" />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Future Premium Content Autoloading</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Package Selection Cards Container (Feature 1) */}
          <div 
            id="package-selection-container" 
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6 transition-all duration-300"
          >
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <Crown className="text-amber-500" /> Choose Your Subscription Package
              </h2>
              <p className="text-zinc-500 text-xs mt-1 font-semibold">Select the plan duration that matches your academic goals.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const isMostPopular = !!pkg.is_most_popular;
                return (
                  <div 
                    key={pkg.id}
                    onClick={() => {
                      if (!hasPending) {
                        setSelectedPackage(pkg);
                      }
                    }}
                    className={`cursor-pointer rounded-[24px] border-2 p-5 transition-all flex flex-col gap-3 relative ${
                      isMostPopular 
                        ? isSelected 
                          ? 'border-amber-500 bg-amber-500/[0.04] dark:bg-amber-500/[0.02] ring-2 ring-amber-500/30'
                          : 'border-amber-500/60 dark:border-amber-500/40 bg-zinc-50/10 hover:border-amber-500 shadow-md shadow-amber-500/[0.03]'
                        : isSelected 
                          ? 'border-blue-600 dark:border-blue-500 bg-blue-50/25 dark:bg-blue-500/5 shadow-md shadow-blue-500/5' 
                          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 hover:dark:border-zinc-700'
                    } ${hasPending ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {isMostPopular && (
                      <span className="absolute -top-3 left-4 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest flex items-center gap-1 shadow-md z-10">
                        🔥 Most Popular
                      </span>
                    )}

                    {pkg.discount_percent && !isMostPopular ? (
                      <span className="absolute top-3 right-3 bg-red-550 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider z-10">
                        {pkg.discount_percent}% Save
                      </span>
                    ) : null}

                    <div>
                      <h3 className="text-base font-black text-zinc-800 dark:text-white flex items-center gap-1.5 mt-2.5">
                        {pkg.name}
                      </h3>
                      <p className="text-zinc-500 text-[11px] font-bold mt-0.5">{pkg.duration_days} Days Full Access</p>
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-black text-zinc-900 dark:text-white">৳ {pkg.price}</span>
                      {pkg.old_price ? (
                        <span className="text-zinc-400 dark:text-zinc-600 text-sm line-through font-bold">৳ {pkg.old_price}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {packages.length === 0 && (
                <div className="col-span-2 text-center py-6 text-zinc-500 font-semibold text-xs border border-dashed rounded-2xl border-zinc-200">
                  Failed to fetch any dynamic packages. Please contact administrative support.
                </div>
              )}
            </div>
          </div>

          {/* Premium Features Showcases with Locks (Feature 5) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 md:p-8 shadow-sm space-y-4 text-left">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <Lock className="text-zinc-450 dark:text-zinc-500 shrink-0" size={18} /> Premium Analytical Modules Locked
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5 font-semibold">Get active access to these advanced diagnostic suites on approval of your subscription request.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "In-Depth Subject Analytics",
                  desc: "Unlock performance rating gauges, strength vectors, and active time-per-question metrics.",
                  tag: "Subject Analytics"
                },
                {
                  title: "Active Weakness Diagnostic Matrix",
                  desc: "Pinpoint study gap priorities instantly backed by automated wrong answer categorizations.",
                  tag: "Wrong Diagnostics"
                },
                {
                  title: "High-Yield Recall Engine",
                  desc: "Intelligent spaced repetition simulator using premium questions to lock in key concepts.",
                  tag: "High-Yield Review"
                },
                {
                  title: "Handout & Lecture PDF Downloads",
                  desc: "Save lecture PDFs, subject booklets, and high-quality revision files for offline revision.",
                  tag: "Offline PDF Library"
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const el = document.getElementById('package-selection-container');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth' });
                      el.classList.add('ring-4', 'ring-amber-500/20');
                      setTimeout(() => el.classList.remove('ring-4', 'ring-amber-500/20'), 1500);
                    }
                  }}
                  className="group cursor-pointer rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-blue-500 hover:dark:hover:border-blue-550/50 hover:bg-zinc-50/20 dark:hover:bg-zinc-900/40 transition-all text-left relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4 text-zinc-350 dark:text-zinc-655 transition-colors group-hover:text-blue-500">
                    <Lock size={14} />
                  </div>
                  <span className="text-[9px] bg-zinc-200/50 dark:bg-zinc-800 text-zinc-550 dark:text-zinc-400 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-widest mb-2 inline-block">
                    {item.tag}
                  </span>
                  <h3 className="text-sm font-extrabold text-zinc-850 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed mt-1">
                    {item.desc}
                  </p>
                  <div className="mt-3 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Unlock with VIP PRO <ChevronRight size={10} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Payment Verification Card */}
        <div className="lg:col-span-5 space-y-8">
          <AnimatePresence mode="wait">
            {hasPending ? (
              // Case A: User has a PENDING verification request
              <motion.div 
                key="pending-ui"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/40 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6 text-center"
              >
                <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <Clock size={32} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-zinc-800 dark:text-white">Payment Submitted Successfully</h3>
                  <p className="text-zinc-500 text-sm font-semibold max-w-sm mx-auto">Waiting For Admin Approval</p>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 p-5 rounded-2xl text-left space-y-3 font-mono text-[11px]">
                  <p className="text-zinc-700 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800 pb-2 flex justify-between">
                    <span>Transaction Details:</span>
                    <span className="text-[10px] bg-amber-500/20 text-yellow-600 px-2 py-0.5 rounded-full border border-yellow-500/20">PENDING</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-zinc-400">Package:</span>
                    <span className="text-zinc-900 dark:text-white font-black">{pendingRequests[0].package_name}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-zinc-400">Amount:</span>
                    <span className="text-zinc-900 dark:text-white font-black">৳ {pendingRequests[0].amount}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-zinc-400">Payment Channel:</span>
                    <span className="text-zinc-900 dark:text-white font-black">{pendingRequests[0].payment_method}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-zinc-400">From Account:</span>
                    <span className="text-zinc-900 dark:text-white font-black">{pendingRequests[0].payment_number}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-zinc-400">TxID:</span>
                    <span className="text-zinc-900 dark:text-white font-black break-all">{pendingRequests[0].transaction_id}</span>
                  </p>
                </div>

                <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl text-left border border-zinc-100 dark:border-zinc-800">
                  <Info size={16} className="text-zinc-400 shrink-0" />
                  <p className="text-zinc-500 text-xs leading-relaxed font-semibold">
                    We manually verify all transaction logs. This process can take anywhere from a few minutes up to 2 hours. This page will auto-activate immediately upon verification.
                  </p>
                </div>

                {onNavigateHome && (
                  <Button 
                    onClick={onNavigateHome}
                    className="w-full bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 py-3 font-black text-xs uppercase tracking-widest text-white dark:text-black rounded-2xl mt-4"
                  >
                    Go Back Home
                  </Button>
                )}
              </motion.div>
            ) : (
              // Case B: User can purchase a package (Form verification)
              <motion.div 
                key="purchase-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6"
              >
                <div>
                  <h2 className="text-lg font-black text-zinc-900 dark:text-white">Subscription Purchase</h2>
                  <p className="text-zinc-500 text-xs mt-1 font-semibold">Follow instructions below to complete manual subscription transfer.</p>
                </div>

                {/* Select Operator Method */}
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('bKash')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-black text-sm transition-all ${
                      paymentMethod === 'bKash' 
                        ? 'border-pink-500 bg-pink-50/10 text-pink-600 dark:text-pink-400' 
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    <Smartphone size={16} /> bKash Manual
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod('Nagad')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-black text-sm transition-all ${
                      paymentMethod === 'Nagad' 
                        ? 'border-orange-500 bg-orange-50/10 text-orange-600 dark:text-orange-400' 
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300'
                    }`}
                  >
                    <Smartphone size={16} /> Nagad Manual
                  </button>
                </div>
                {/* Transfer Guidance */}
                <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-4 sm:p-5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 space-y-3">
                  <p className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Transfer Instructions:</p>
                  <ol className="list-decimal list-inside text-xs space-y-2.5 font-semibold">
                    <li>Open your selected payment app ({paymentMethod}).</li>
                    <li>Choose <strong className="text-zinc-900 dark:text-white">"Send Money"</strong> (or Cash Out if personal).</li>
                    <li>Receiver Number: <span className="bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-900 dark:text-white select-all font-black">
                      {paymentMethod === 'bKash' ? (settings?.payment_number_bkash || '01712345678') : (settings?.payment_number_nagad || '01912345678')}
                    </span></li>
                    <li>Transfer Amount: <strong className="text-blue-600 dark:text-blue-400">৳ {getCalculatedPrices().final}</strong> (for {selectedPackage?.name || '1 Month'})</li>
                    <li>Payment Reference: <span className="bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-zinc-900 dark:text-white select-all font-black">
                      {getPaymentReference()}
                    </span>
                      <button 
                        type="button" 
                        onClick={handleCopyReference}
                        className="ml-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-black uppercase px-2.5 py-0.5 rounded transition-all inline-flex items-center gap-1 cursor-pointer align-middle"
                      >
                        {copiedRef ? 'Copied!' : 'Copy'}
                      </button>
                    </li>
                    <li>After completing, copy the returned <strong className="text-zinc-950 dark:text-white">Transaction ID (TxID)</strong> and submit validation below.</li>
                  </ol>
                </div>

                {/* Highlighted Copy Reference Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-350 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold uppercase text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded">Reference Pin</span>
                    <span className="font-mono font-bold select-all tracking-wider text-sm text-zinc-900 dark:text-zinc-100">{getPaymentReference()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyReference}
                    className="px-4 py-1.5 bg-blue-650 hover:bg-blue-700 text-white font-black text-[10px] uppercase rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/10 shrink-0"
                  >
                    {copiedRef ? 'Copied' : 'Copy Reference'}
                  </button>
                </div>

                {/* Available Offers & Coupons Display (Feature 9) */}
                {activeCoupons.length > 0 && (
                  <div className="space-y-2 border-t border-zinc-150 dark:border-zinc-800/80 pt-3 text-left">
                    <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-500 animate-pulse" /> Active Offers Available:
                    </p>
                    <div className="flex flex-wrap gap-2 text-left">
                      {activeCoupons.map(coupon => (
                        <div 
                          key={coupon.id}
                          onClick={() => {
                            if (!hasPending) {
                              setCouponCode(coupon.code);
                              handleApplyCouponCode(coupon.code);
                            }
                          }}
                          className="bg-zinc-50/50 hover:bg-blue-500/5 dark:bg-zinc-800/20 border border-zinc-200/50 dark:border-zinc-800/80 px-2.5 py-1.5 rounded-xl cursor-pointer text-left transition-all active:scale-95 flex items-center justify-between gap-3 select-none flex-1 min-w-[130px] shadow-sm"
                        >
                          <div>
                            <span className="font-mono font-black text-[10px] text-zinc-800 dark:text-zinc-200 bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                              {coupon.code}
                            </span>
                            <p className="text-[9px] text-zinc-400 font-extrabold mt-1 animate-pulse">
                              {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `৳${coupon.discount_value} OFF`}
                            </p>
                          </div>
                          <span className="text-[9px] text-blue-500 font-black uppercase tracking-wider shrink-0">Apply</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Alerts */}
                {errorMessage && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl flex items-start gap-3">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
                  </div>
                )}
                {successMessage && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">{successMessage}</p>
                  </div>
                )}

                {/* Form Inputs */}
                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  
                  {/* Promo Code Fields (Feature 9) */}
                  <div className="space-y-1.5" id="promo-code-container">
                    <label className="text-zinc-700 dark:text-zinc-300 text-xs font-bold font-mono">Promo Coupon Code (Optional):</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. SAVE20"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          if (!e.target.value) {
                            setAppliedCoupon(null);
                            setCouponSuccess(null);
                            setCouponError(null);
                          }
                        }}
                        className="flex-1 px-4 py-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-mono uppercase focus:outline-none focus:border-blue-500 placeholder-zinc-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCouponCode()}
                        className="px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-black font-extrabold text-xs uppercase rounded-2xl transition-all cursor-pointer"
                      >
                        Apply Code
                      </button>
                    </div>
                    {couponError && <p className="text-[10px] text-red-500 font-extrabold">{couponError}</p>}
                    {couponSuccess && <p className="text-[10px] text-emerald-500 font-extrabold">{couponSuccess}</p>}
                  </div>

                  {/* Dynamic Calculated Deductions breakdown */}
                  {appliedCoupon && selectedPackage && (
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/20 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl font-mono text-[11px] text-left space-y-1.5 leading-tight">
                      <div className="flex justify-between">
                        <span className="text-zinc-455 dark:text-zinc-500">Regular Package Base:</span>
                        <span className="font-bold line-through">৳{getCalculatedPrices().original}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                        <span>Promo Code Applied ({appliedCoupon.code}):</span>
                        <span>-৳{getCalculatedPrices().discount}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-zinc-200 dark:border-zinc-800 mt-1">
                        <span className="font-black animate-pulse">Net Total Due:</span>
                        <span className="font-black text-blue-600 dark:text-blue-400 text-xs">৳{getCalculatedPrices().final}</span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-zinc-700 dark:text-zinc-300 text-xs font-bold font-mono">Your {paymentMethod} Account Number:</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 017XXXXXXXX"
                      required
                      value={paymentNumber}
                      onChange={(e) => setPaymentNumber(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-700 dark:text-zinc-300 text-xs font-bold font-mono">Transaction ID (TxID):</label>
                    <input 
                      type="text" 
                      placeholder="e.g. ADR77GH89L"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-sm font-mono uppercase focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <Button 
                    type="submit"
                    disabled={isSubmitting || !selectedPackage}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-3.5 font-black text-xs uppercase tracking-widest text-white rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <Send size={14} /> Submit Payment For Approval
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
          <Clock className="text-blue-500 animate-pulse" /> Transaction & Payment History
        </h2>
        
        {allUserRequests.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 font-semibold text-xs border border-dashed rounded-2xl border-zinc-200 dark:border-zinc-800">
            No previous payment records found for your account. Once you submit a payment validation, it will register here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-450 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4 font-mono">Date</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 font-mono">TxID</th>
                  <th className="py-3 px-4 text-right">Status & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {allUserRequests.map((req) => (
                  <tr key={req.id} className="text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-50/50 dark:hover:bg-zinc-850/10">
                    <td className="py-4 px-4 font-mono text-zinc-500">
                      {new Date(req.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                      <div>{req.package_name}</div>
                      {req.coupon_code && (
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">Code: <span className="text-blue-500 font-black">{req.coupon_code}</span></div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-black text-zinc-900 dark:text-white">৳ {req.amount}</div>
                      {req.discount_amount && req.discount_amount > 0 ? (
                        <div className="text-[9px] text-zinc-400 line-through">৳{req.original_amount}</div>
                      ) : null}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        req.payment_method === 'bKash' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                      }`}>
                        {req.payment_method}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-zinc-500 select-all">{req.transaction_id}</td>
                    <td className="py-4 px-4 text-right flex flex-col items-end">
                      <div className="space-y-1.5 text-right flex flex-col items-end">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                          req.status === 'approved' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                            : req.status === 'rejected'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        }`}>
                          {req.status === 'approved' ? '🟢 Approved' : req.status === 'rejected' ? '🔴 Rejected' : '🟡 Pending Approval'}
                        </span>
                        
                        {req.admin_note && (
                          <div className="bg-zinc-100/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-350 p-2.5 rounded-xl text-[10px] font-semibold border border-zinc-200/50 dark:border-zinc-700/50 max-w-xs leading-relaxed text-left">
                            <strong className="text-zinc-800 dark:text-zinc-100 block mb-0.5 text-[9px] uppercase tracking-wide">Review Note:</strong>
                            {req.admin_note}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Premium Welcome Congratulations Screen (Feature 7) */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop cover with high aesthetic blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (user?.id) {
                  localStorage.setItem(`seen_premium_welcome_${user.id}`, 'true');
                }
                setShowWelcomeModal(false);
              }}
              className="absolute inset-0 bg-zinc-950/75 backdrop-blur-md"
            />

            {/* Modal Body container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 md:p-8 max-w-sm w-full relative z-10 shadow-2xl text-center space-y-6"
            >
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center animate-ping opacity-25">
                  <div className="w-16 h-16 bg-amber-500 rounded-full blur-xl" />
                </div>
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-400 text-black rounded-full flex items-center justify-center mx-auto shadow-lg relative z-10">
                  <Crown size={32} fill="currentColor" className="text-black" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full uppercase font-black tracking-widest inline-block">
                  PARODORSSHHI PRO MEMBER
                </span>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Congratulations! 🎉</h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-[11px] font-bold leading-relaxed max-w-xs mx-auto">
                  Your premium subscription upgrade has been approved. You now hold VIP access keys to all exams, subject analytics dashboards, weakness vectors, sheets, and notes modules!
                </p>
              </div>

              {/* Quick list of unlocked privilege items */}
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl text-left border border-zinc-150 dark:border-zinc-800/60 space-y-2.5">
                {[
                  "Complete Exam Simulator Unlocked",
                  "In-Depth Analytics Dashboard Armed",
                  "Weakness Matrix Diagnostics Online",
                  "Handouts and Subject Books Downloads Enabled"
                ].map((txt, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[10px] font-extrabold text-zinc-650 dark:text-zinc-350">
                    <span className="text-amber-500">✨</span>
                    <span>{txt}</span>
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => {
                  if (user?.id) {
                    localStorage.setItem(`seen_premium_welcome_${user.id}`, 'true');
                  }
                  setShowWelcomeModal(false);
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                Let's Enter Pro Module
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Simple inline Badge component mimicking the design
const Badge: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => {
  return (
    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg inline-flex items-center justify-center ${className}`}>
      {children}
    </span>
  );
};

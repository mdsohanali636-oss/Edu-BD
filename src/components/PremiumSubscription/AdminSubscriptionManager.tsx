import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, 
  X, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  CreditCard, 
  Users, 
  ListOrdered,
  Search,
  Filter,
  AlertTriangle,
  Image,
  Percent,
  CheckCircle,
  Clock,
  CircleAlert,
  Sparkles,
  RefreshCw,
  Coins,
  Tag
} from 'lucide-react';
import { supabaseService } from '../../services/supabaseService';
import { supabase } from '../../supabaseClient';
import { SubscriptionSettings, SubscriptionPackage, SubscriptionBenefit, SubscriptionRequest, SubscriptionCoupon } from '../../types';
import { Button, Card } from '../ui/Base';

export const AdminSubscriptionManager: React.FC<{ 
  adminUser: any; 
  allUsers?: any[]; 
  fetchUsersInfo?: () => void;
}> = ({ adminUser, allUsers = [], fetchUsersInfo }) => {
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'users' | 'stats' | 'settings' | 'packages' | 'benefits' | 'coupons'>('requests');
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [benefits, setBenefits] = useState<SubscriptionBenefit[]>([]);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter/Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [premiumUserSearch, setPremiumUserSearch] = useState('');
  const [activeRequestNotes, setActiveRequestNotes] = useState<Record<string, string>>({});

  // Edit forms states
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<SubscriptionSettings>>({});

  // New package form
  const [newPackage, setNewPackage] = useState({
    name: '',
    duration_days: 30,
    price: 300,
    old_price: 600,
    discount_percent: 50,
    is_most_popular: false
  });
  const [pkgError, setPkgError] = useState<string | null>(null);

  // New benefit form
  const [newBenefitText, setNewBenefitText] = useState('');
  const [benefitError, setBenefitError] = useState<string | null>(null);

  // Package & benefit editing state
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [editingPackageForm, setEditingPackageForm] = useState<{
    name: string;
    duration_days: number;
    price: number;
    old_price?: number;
    discount_percent?: number;
    is_active?: boolean;
    is_most_popular?: boolean;
  }>({ name: '', duration_days: 30, price: 300, is_most_popular: false });

  const [editingBenefitId, setEditingBenefitId] = useState<string | null>(null);
  const [editingBenefitText, setEditingBenefitText] = useState<string>('');

  // Coupon state fields (Feature 9)
  const [coupons, setCoupons] = useState<SubscriptionCoupon[]>([]);
  const [newCouponForm, setNewCouponForm] = useState({
    code: '',
    discount_type: 'percentage' as 'fixed' | 'percentage',
    discount_value: 10,
    usage_limit: 100,
    used_count: 0,
    expiry_date: '',
    is_active: true
  });
  const [couponFormError, setCouponFormError] = useState<string | null>(null);

  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [editingCouponForm, setEditingCouponForm] = useState<{
    code: string;
    discount_type: 'fixed' | 'percentage';
    discount_value: number;
    usage_limit?: number;
    expiry_date?: string;
    is_active?: boolean;
  }>({ code: '', discount_type: 'percentage', discount_value: 10 });

  // Confirmation state
  // Live dynamic statistics counters (Feature 2)
  const [liveStats, setLiveStats] = useState({
    members: 0,
    exams: 0,
    notes: 0,
    sheets: 0
  });

  const fetchLiveStats = async () => {
    try {
      const [profilesRes, rolesRes, examsRes, notesRes, sheetsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, premium_expiry, has_premium_access'),
        supabase
          .from('user_roles')
          .select('user_id, id, is_premium'),
        supabase
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('is_premium', true),
        supabase
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('is_premium', true),
        supabase
          .from('practice_sheets')
          .select('*', { count: 'exact', head: true })
          .eq('is_premium', true)
      ]);

      let premiumCount = 0;
      if (profilesRes.data) {
        const roles = rolesRes.data || [];
        profilesRes.data.forEach(p => {
          const roleRec = roles.find(r => r.user_id === p.id || r.id === p.id);
          const isExpired = p.premium_expiry && new Date(p.premium_expiry).getTime() < Date.now();
          const hasPremium = isExpired ? false : (roleRec ? (roleRec.is_premium ?? p.has_premium_access) : p.has_premium_access);
          if (hasPremium) {
            premiumCount++;
          }
        });
      }

      setLiveStats({
        members: premiumCount,
        exams: examsRes.count || 0,
        notes: notesRes.count || 0,
        sheets: sheetsRes.count || 0
      });
    } catch (err) {
      console.error("[fetchLiveStats] Error loading stats counters:", err);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void> | void;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  // Global triggers
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'ref', text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'ref' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      fetchLiveStats();

      const [fetchedSettings, fetchedPackages, fetchedBenefits, fetchedRequests, fetchedCoupons] = await Promise.all([
        supabaseService.getSubscriptionSettings(),
        supabaseService.getSubscriptionPackages(),
        supabaseService.getSubscriptionBenefits(),
        supabaseService.getSubscriptionRequests(),
        supabaseService.getCoupons()
      ]);

      setSettings(fetchedSettings);
      setSettingsForm(fetchedSettings);
      setPackages(fetchedPackages);
      setBenefits(fetchedBenefits);
      setRequests(fetchedRequests);
      setCoupons(fetchedCoupons || []);
    } catch (err) {
      console.error("[AdminSubscriptionManager] Failed loading database files:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Subscribe to realtime updates for subscription requests
    const channel = supabase
      .channel('admin-sub-requests-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subscription_requests' 
      }, () => {
        // Fetch fresh subscription requests
        supabaseService.getSubscriptionRequests().then(fetchedRequests => {
          setRequests(fetchedRequests);
        });
      })
      .subscribe();

    // Subscribe to all changes affecting dynamic Statistics counters (Feature 2)
    const statsChannel = supabase
      .channel('admin-stats-realtime-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log("[Admin Stats Realtime] profiles changed! Refetching stats...");
        fetchLiveStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        console.log("[Admin Stats Realtime] user_roles changed! Refetching stats...");
        fetchLiveStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
        console.log("[Admin Stats Realtime] exams changed! Refetching stats...");
        fetchLiveStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
        console.log("[Admin Stats Realtime] notes changed! Refetching stats...");
        fetchLiveStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'practice_sheets' }, () => {
        console.log("[Admin Stats Realtime] practice_sheets changed! Refetching stats...");
        fetchLiveStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_requests' }, () => {
        console.log("[Admin Stats Realtime] subscription_requests changed! Refetching stats...");
        fetchLiveStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(statsChannel);
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await supabaseService.updateSubscriptionSettings(settingsForm);
      showToast("Configured poster settings updated successfully!");
      const fetchedSettings = await supabaseService.getSubscriptionSettings();
      setSettings(fetchedSettings);
    } catch (err: any) {
      console.error(err);
      showToast("Verification failed: " + (err.message || 'Unknown network error'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleToggleGlobalPremium = async () => {
    if (!settings) return;
    const isEnabling = !settings.global_premium_mode;

    const performUpdate = async (enable: boolean) => {
      // 5. Add console logs: Before update
      console.log("[Global Premium Mode] Before update. Current mode: " + settings.global_premium_mode + ". Toggling to: " + enable);
      
      try {
        const payload: Partial<SubscriptionSettings> = {
          global_premium_mode: enable,
        };

        // Send actual DB update
        await supabaseService.updateSubscriptionSettings(payload);
        
        // 5. Add console logs: After update
        console.log("[Global Premium Mode] After update request sent. Payload used:", payload);

        // 6. After update, refetch site_settings (subscription_settings) and sync the UI.
        const fresh = await supabaseService.getSubscriptionSettings();
        console.log("[Global Premium Mode] Refeteched fresh settings from DB:", fresh);

        // 9. Verify that the update succeeds before showing the active toast status.
        if (fresh.global_premium_mode !== enable) {
          throw new Error("Value verification failed. The database is still returning global_premium_mode = " + fresh.global_premium_mode);
        }

        // 5. Add console logs: Update success
        console.log("[Global Premium Mode] Update success. Value is successfully changed to: " + fresh.global_premium_mode);

        setSettings(fresh);
        setSettingsForm(fresh);

        showToast(enable ? "🌍 Global Premium Mode Enabled!" : "Global Premium Mode Disabled.");
      } catch (err: any) {
        // 5. Add console logs: Update failed
        console.error("[Global Premium Mode] Update failed:", err);
        showToast("Error toggling Global Premium Mode: " + (err.message || 'Network error'));
      }
    };

    if (isEnabling) {
      setConfirmDialog({
        isOpen: true,
        title: "Are you sure?",
        description: "All users will temporarily receive premium access.\n\nExisting premium subscriptions will remain unchanged.",
        confirmText: "Enable Global Premium",
        cancelText: "Cancel",
        isDanger: false,
        onConfirm: () => performUpdate(true)
      });
    } else {
      await performUpdate(false);
    }
  };

  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("Poster image must be less than 10MB.", "ref");
      return;
    }

    setIsUploadingPoster(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `poster_${Date.now()}.${fileExt}`;
      const filePath = `poster_uploads/${fileName}`;

      // 1. Try uploading to 'posters' bucket first (if setup via POSTER_STORAGE_SETUP.sql)
      console.log("[POSTER UPLOAD] Attempting upload to bucket 'posters' at path:", filePath);
      const { data: dataPosters, error: errorPosters } = await supabase.storage
        .from('posters')
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type || 'image/jpeg'
        });

      if (!errorPosters) {
        const { data: { publicUrl } } = supabase.storage
          .from('posters')
          .getPublicUrl(filePath);
        setSettingsForm(prev => ({ ...prev, poster_image_url: publicUrl }));
        showToast("Poster uploaded successfully to posters bucket!");
        return;
      }

      console.warn("[POSTER UPLOAD] 'posters' bucket upload failed or missing, trying fallback to 'resources':", errorPosters);

      // 2. Try uploading to 'resources' bucket
      const { data: dataResources, error: errorResources } = await supabase.storage
        .from('resources')
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type || 'image/jpeg'
        });

      if (!errorResources) {
        const { data: { publicUrl } } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);
        setSettingsForm(prev => ({ ...prev, poster_image_url: publicUrl }));
        showToast("Poster uploaded successfully to resources!");
        return;
      }

      console.warn("[POSTER UPLOAD] 'resources' bucket upload failed, trying fallback to 'profile-images':", errorResources);

      // 3. Try fallback to 'profile-images' bucket
      const { data: dataProfiles, error: errorProfiles } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: true,
          contentType: file.type || 'image/jpeg'
        });

      if (!errorProfiles) {
        const { data: { publicUrl } } = supabase.storage
          .from('profile-images')
          .getPublicUrl(filePath);
        setSettingsForm(prev => ({ ...prev, poster_image_url: publicUrl }));
        showToast("Poster uploaded successfully to profile-images!");
        return;
      }

      throw new Error(`Upload failed on all buckets. Ensure you have run STORAGE_SETUP.sql or POSTER_STORAGE_SETUP.sql in Supabase! Details: ${errorProfiles.message}`);
    } catch (err: any) {
      console.error("[POSTER UPLOAD] Error:", err);
      showToast(err.message || "Failed to upload image.", "ref");
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setPkgError(null);
    if (!newPackage.name) {
      setPkgError("Please fill out package name (e.g. 1 Month).");
      return;
    }
    try {
      await supabaseService.createSubscriptionPackage({ ...newPackage, is_active: true });
      setNewPackage({ name: '', duration_days: 30, price: 300, old_price: 600, discount_percent: 50, is_most_popular: false });
      showToast("New package created successfully.");
      const fetchedPackages = await supabaseService.getSubscriptionPackages();
      setPackages(fetchedPackages);
    } catch (err: any) {
      console.error(err);
      setPkgError(err.message || "Unique package name duplicate error.");
    }
  };

  const handleUpdatePackage = async (id: string) => {
    try {
      if (!editingPackageForm.name) {
        showToast("Package name cannot be empty.", "ref");
        return;
      }
      setIsLoading(true);
      await supabaseService.updateSubscriptionPackage(id, {
        name: editingPackageForm.name,
        duration_days: Number(editingPackageForm.duration_days),
        price: Number(editingPackageForm.price),
        old_price: editingPackageForm.old_price ? Number(editingPackageForm.old_price) : undefined,
        discount_percent: editingPackageForm.discount_percent ? Number(editingPackageForm.discount_percent) : undefined,
        is_active: editingPackageForm.is_active,
        is_most_popular: editingPackageForm.is_most_popular,
      });
      showToast("Subscription package modified successfully!");
      setEditingPackageId(null);
      const fetchedPackages = await supabaseService.getSubscriptionPackages();
      setPackages(fetchedPackages);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to modify plan: " + (err.message || "Network error."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBenefit = async (id: string, text: string) => {
    try {
      const cleanText = text.trim();
      if (!cleanText) {
        showToast("Privilege text cannot be empty.", "ref");
        return;
      }
      setIsLoading(true);
      await supabaseService.updateSubscriptionBenefit(id, cleanText);
      showToast("Premium privilege updated!");
      setEditingBenefitId(null);
      const fetchedBenefits = await supabaseService.getSubscriptionBenefits();
      setBenefits(fetchedBenefits);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to modify privilege: " + (err.message || "Network error."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePackage = (id: string) => {
    const pkg = packages.find(p => p.id === id);
    if (!pkg) return;
    setConfirmDialog({
      isOpen: true,
      title: "Delete Subscription Plan",
      description: `Are you sure you want to permanently delete the "${pkg.name}" plan? This cannot be undone.`,
      confirmText: "Yes, Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await supabaseService.deleteSubscriptionPackage(id, pkg.name);
          showToast("Subscription plan deleted permanently!");
          const fetchedPackages = await supabaseService.getSubscriptionPackages();
          setPackages(fetchedPackages);
        } catch (err: any) {
          console.error(err);
          showToast("Failed to delete package: " + err.message, "ref");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleAddBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBenefitError(null);
    const cleanText = newBenefitText.trim();
    if (!cleanText) {
      setBenefitError("Please write a meaningful benefit item.");
      return;
    }
    try {
      await supabaseService.createSubscriptionBenefit(cleanText);
      setNewBenefitText('');
      showToast("New premium privilege added!");
      const fetchedBenefits = await supabaseService.getSubscriptionBenefits();
      setBenefits(fetchedBenefits);
    } catch (err: any) {
      console.error(err);
      setBenefitError("Unique item duplicates are not allowed.");
    }
  };

  const handleDeleteBenefit = (id: string) => {
    const bft = benefits.find(b => b.id === id);
    if (!bft) return;
    setConfirmDialog({
      isOpen: true,
      title: "Remove Premium Privilege",
      description: `Are you sure you want to remove "${bft.text}" from the benefits list?`,
      confirmText: "Yes, Remove",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await supabaseService.deleteSubscriptionBenefit(id, bft.text);
          showToast("Premium privilege removed successfully!");
          const fetchedBenefits = await supabaseService.getSubscriptionBenefits();
          setBenefits(fetchedBenefits);
        } catch (err: any) {
          console.error(err);
          showToast("Failed to remove privilege: " + err.message, "ref");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Coupon Action Handlers (Feature 9)
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFormError(null);
    if (!newCouponForm.code) {
      setCouponFormError("Please fill out coupon code (e.g. SAVE50).");
      return;
    }
    try {
      setIsLoading(true);
      await supabaseService.createCoupon({
        code: newCouponForm.code.trim().toUpperCase(),
        discount_type: newCouponForm.discount_type,
        discount_value: Number(newCouponForm.discount_value),
        usage_limit: newCouponForm.usage_limit ? Number(newCouponForm.usage_limit) : undefined,
        used_count: 0,
        expiry_date: newCouponForm.expiry_date || undefined,
        is_active: newCouponForm.is_active
      });
      setNewCouponForm({
        code: '',
        discount_type: 'percentage',
        discount_value: 10,
        usage_limit: 100,
        used_count: 0,
        expiry_date: '',
        is_active: true
      });
      showToast("Coupon created successfully!");
      const freshCoupons = await supabaseService.getCoupons();
      setCoupons(freshCoupons);
    } catch (err: any) {
      console.error(err);
      setCouponFormError(err.message || "Failed to create coupon code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCoupon = async (id: string) => {
    try {
      if (!editingCouponForm.code) {
        showToast("Coupon code cannot be empty.", "ref");
        return;
      }
      setIsLoading(true);
      await supabaseService.updateCoupon(id, {
        code: editingCouponForm.code.trim().toUpperCase(),
        discount_type: editingCouponForm.discount_type,
        discount_value: Number(editingCouponForm.discount_value),
        usage_limit: editingCouponForm.usage_limit === undefined ? undefined : Number(editingCouponForm.usage_limit),
        expiry_date: editingCouponForm.expiry_date || undefined,
        is_active: editingCouponForm.is_active
      });
      showToast("Coupon updated successfully!");
      setEditingCouponId(null);
      const freshCoupons = await supabaseService.getCoupons();
      setCoupons(freshCoupons);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to modify coupon: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCoupon = (id: string, code: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Coupon Code",
      description: `Are you sure you want to permanently delete the promo coupon "${code}"? This cannot be undone.`,
      confirmText: "Yes, Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await supabaseService.deleteCoupon(id);
          showToast("Coupon code deleted permanently.");
          const freshCoupons = await supabaseService.getCoupons();
          setCoupons(freshCoupons);
        } catch (err: any) {
          console.error(err);
          showToast("Failed to delete coupon: " + err.message, "ref");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleApproveRequest = (request: SubscriptionRequest, note?: string) => {
    console.log("[DEBUG handleApproveRequest] Initiate check:", request);
    if (request.status === 'approved') {
      showToast("Access already approved! This request is already processed.", "ref");
      return;
    }

    let days = 30;
    const lowerName = request.package_name.toLowerCase();
    if (lowerName.includes('3 month')) days = 90;
    else if (lowerName.includes('6 month')) days = 180;
    else if (lowerName.includes('12 month') || lowerName.includes('1 year')) days = 365;
    else {
      const matchingPkg = packages.find(p => p.name.toLowerCase() === lowerName);
      if (matchingPkg) {
        days = matchingPkg.duration_days;
      }
    }

    setConfirmDialog({
      isOpen: true,
      title: "Approve Premium Payment",
      description: `Verify and activate subscription for:
• Student: ${request.user_profiles?.full_name || 'Anonymous'}
• Plan: ${request.package_name} (${days} Days Premium Access)
• TXID: ${request.transaction_id}
• Amount Paid: ৳ ${request.amount}
${note ? `• Review Note: "${note}"` : ''}

Do you want to authorize this update?`,
      confirmText: "Verify & Approve",
      isDanger: false,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          console.log("[DEBUG handleApproveRequest] Initiating API approve request...");
          await supabaseService.approveSubscriptionRequest(request.id, request.user_id, days, adminUser.id, note);
          showToast("Premium user subscription approved and activated successfully!");
          
          console.log("[DEBUG handleApproveRequest] Fetching fresh subscription requests list...");
          const fetchedRequests = await supabaseService.getSubscriptionRequests();
          setRequests(fetchedRequests);
          
          if (fetchUsersInfo) {
            console.log("[DEBUG handleApproveRequest] Refreshing allUsers profiles list...");
            fetchUsersInfo();
          }
        } catch (err: any) {
          console.error("[DEBUG handleApproveRequest] Caught error during approval handle:", err);
          showToast("Unexpected approval failure: " + err.message, "ref");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleRejectRequest = (request: SubscriptionRequest, note?: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Reject Payment Request",
      description: `Decline and reject manual transaction TxID: ${request.transaction_id}?
• Student: ${request.user_profiles?.full_name || 'Anonymous'}
${note ? `• Reason/Note: "${note}"` : ''}

The student will remain guest/basic tier. Are you sure you want to proceed?`,
      confirmText: "Decline & Reject",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await supabaseService.rejectSubscriptionRequest(request.id, adminUser.id, note);
          showToast("Premium payment request rejected.");
          const fetchedRequests = await supabaseService.getSubscriptionRequests();
          setRequests(fetchedRequests);
          if (fetchUsersInfo) fetchUsersInfo();
        } catch (err: any) {
          showToast("Reject failed: " + err.message, "ref");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // User Premium modification handlers
  const handleExtendUser = async (userId: string, days: number) => {
    const userToUpdate = allUsers.find(u => u.id === userId);
    if (!userToUpdate) return;
    
    // Calculate new expiry date
    let currentExpiry = userToUpdate.premium_expiry ? new Date(userToUpdate.premium_expiry) : new Date();
    // If current expiry is in the past or invalid, start from now
    if (isNaN(currentExpiry.getTime()) || currentExpiry.getTime() < Date.now()) {
      currentExpiry = new Date();
    }
    currentExpiry.setDate(currentExpiry.getDate() + days);
    
    try {
      await supabaseService.updateUserPremiumExpiry(userId, currentExpiry.toISOString(), true);
      showToast(`Premium period extended by +${days} days successfully!`);
      if (fetchUsersInfo) fetchUsersInfo();
    } catch (err: any) {
      showToast("Failed to extend premium: " + err.message, "ref");
    }
  };

  const handleRemoveUser = (userId: string) => {
    const userToUpdate = allUsers.find(u => u.id === userId);
    if (!userToUpdate) return;

    setConfirmDialog({
      isOpen: true,
      title: "Revoke Premium Permissions",
      description: `Are you sure you want to completely revoke premium privileges from "${userToUpdate.name || 'this student'}"?`,
      confirmText: "Revoke Access",
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await supabaseService.updateUserPremiumExpiry(userId, null, false);
          showToast("Premium permissions successfully revoked!");
          if (fetchUsersInfo) fetchUsersInfo();
        } catch (err: any) {
          showToast("Failed to revoke premium: " + err.message, "ref");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleCustomExpiryChange = async (userId: string, dateStr: string) => {
    if (!dateStr) return;
    const selectedTime = new Date(dateStr).getTime();
    if (isNaN(selectedTime)) return;
    const isPremium = selectedTime > Date.now();
    try {
      await supabaseService.updateUserPremiumExpiry(userId, new Date(dateStr).toISOString(), isPremium);
      showToast("Premium expiry date updated successfully!");
      if (fetchUsersInfo) fetchUsersInfo();
    } catch (err: any) {
      showToast("Failed to update custom expiry date: " + err.message, "ref");
    }
  };

  // Search and filter requests logic
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.payment_number.includes(searchQuery) ||
      (req.user_profiles?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.user_profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Search through active premium users
  const activePremiumStudents = allUsers.filter(u => u.hasPremiumAccess || u.isPremium);
  const filteredPremiumStudents = activePremiumStudents.filter(u => 
    (u.name || '').toLowerCase().includes(premiumUserSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(premiumUserSearch.toLowerCase()) ||
    (u.phone_number || '').includes(premiumUserSearch) ||
    (u.phone || '').includes(premiumUserSearch)
  );

  // Statistics Computations
  const totalStudents = allUsers.length;
  const activePremiumCount = activePremiumStudents.filter(u => !u.premium_expiry || new Date(u.premium_expiry).getTime() > Date.now()).length;
  const expiredPremiumCount = allUsers.filter(u => u.premium_expiry && new Date(u.premium_expiry).getTime() < Date.now()).length;
  
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;
  const approvedRequestsCount = requests.filter(r => r.status === 'approved').length;
  const totalRevenueSum = requests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw size={36} className="text-zinc-400 animate-spin" />
        <p className="text-zinc-500 font-bold font-mono text-xs">SYNCHRONIZING SECURE CLIENT BILLING...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 bg-zinc-950 text-white border border-white/10 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold leading-none uppercase tracking-wider"
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle size={16} className="text-emerald-500 stroke-[3]" />
            ) : (
              <Sparkles size={16} className="text-amber-500" />
            )}
            {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segmented Tab Navigation for Admin Subscriptions Manager */}
      <div className="flex items-center gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl w-full xl:w-fit overflow-x-auto no-scrollbar scroll-smooth">
        <button 
          onClick={() => setActiveSubTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'requests' 
              ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <CreditCard size={14} /> Requests ({pendingRequestsCount} Pending)
        </button>
        <button 
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'users' 
              ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Users size={14} /> Active Premium ({activePremiumStudents.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('stats')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'stats' 
              ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Clock size={14} /> Statistics Hub
        </button>
        <button 
          onClick={() => setActiveSubTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'settings' 
              ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Settings size={14} /> Poster Settings
        </button>
        <button 
          onClick={() => setActiveSubTab('packages')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'packages' 
              ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <ListOrdered size={14} /> Pricing Packages ({packages.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('benefits')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'benefits' 
              ? 'bg-white dark:bg-zinc-900 text-blue-600 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Sparkles size={14} /> Benefits ({benefits.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('coupons')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 ${
            activeSubTab === 'coupons' 
              ? 'bg-white dark:bg-zinc-900 text-amber-500 shadow-sm' 
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Tag size={14} /> Coupons ({coupons.length})
        </button>
      </div>

      {/* 🌍 Global Premium Mode Dedicated Card */}
      {settings && (
        <Card id="adm-global-premium-card" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm overflow-hidden relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
          <div className="space-y-4 max-w-2xl text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-2xl shrink-0 self-start sm:self-center">🌍</span>
              <div>
                <h3 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider font-mono flex flex-wrap items-center gap-2">
                  Global Premium Mode
                  {settings.global_premium_mode ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 animate-pulse border border-emerald-500/20">
                      🌍 Global Premium Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                      Global Premium Disabled
                    </span>
                  )}
                </h3>
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {settings.global_premium_mode 
                    ? "All users currently have temporary premium access. No locks, no upgrade prompts, no boundaries." 
                    : "Only subscribed premium users have access. Standard restrictions apply."}
                </p>
              </div>
            </div>

            {/* Admin Analytics Panel */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed">
                Database Access Status: <span className={`font-black font-mono inline-flex items-center px-1.5 py-0.5 rounded ${settings.global_premium_mode ? 'text-emerald-500 bg-emerald-500/10' : 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800'}`}>{settings.global_premium_mode ? 'OVERRIDE ON - PUBLIC' : 'STANDARD RESTRICTED'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-800/45 p-4 rounded-2xl border border-zinc-150 dark:border-zinc-800/55 min-w-[185px] shrink-0 self-start md:self-center">
            <p className="text-[10px] font-black uppercase text-zinc-400 font-mono tracking-wider mb-2.5">Toggle Control</p>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black uppercase font-mono ${!settings.global_premium_mode ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-400'}`}>OFF</span>
              <button
                id="global-premium-toggle-button"
                type="button"
                onClick={handleToggleGlobalPremium}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  settings.global_premium_mode ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'
                } cursor-pointer shrink-0`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-all ${
                  settings.global_premium_mode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
              <span className={`text-[10px] font-black uppercase font-mono ${settings.global_premium_mode ? 'text-emerald-500' : 'text-zinc-400'}`}>ON</span>
            </div>
          </div>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {/* Tab 1: Payment Verification Requests */}
        {activeSubTab === 'requests' && (
          <motion.div 
            key="tab-requests" 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {supabaseService.subscriptionTablesMissing.requests && (
              <div className="bg-amber-500/10 border-2 border-amber-500/20 text-amber-600 dark:text-amber-400 p-5 rounded-3xl flex items-center gap-4">
                <AlertTriangle size={24} className="shrink-0 text-amber-500" />
                <div className="text-xs">
                  <h4 className="font-black text-sm uppercase tracking-wider mb-1">Local Sandbox Request Mode</h4>
                  <p className="font-semibold leading-relaxed animate-pulse">
                    The table <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded text-amber-700 dark:text-amber-300">subscription_requests</code> does not exist in your Supabase database yet. Payment flow operations are falling back to local persistent storage. To set up actual database request validation, please run Section 11 from <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">SUPABASE_FINAL_SCHEMA.sql</code> in your Supabase SQL Editor.
                  </p>
                </div>
              </div>
            )}

            {/* Search Filter Tools Bar */}
            <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-[24px]">
              <div className="flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-800 rounded-xl px-4 py-2 border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <Search size={16} className="text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search TxID, Senders phone, students full name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-semibold focus:outline-none text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  Pending ({requests.filter(r => r.status === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('approved')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === 'approved'
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  Approved ({requests.filter(r => r.status === 'approved').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === 'rejected'
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  Rejected ({requests.filter(r => r.status === 'rejected').length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  All ({requests.length})
                </button>
              </div>
            </div>

            {/* List Layout */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800 text-[11px] font-black tracking-widest text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800/60 font-mono">
                      <th className="px-6 py-4">Student Profile</th>
                      <th className="px-6 py-4">Payment Method</th>
                      <th className="px-6 py-4">Sender Phone</th>
                      <th className="px-6 py-4">Transaction ID (TxID)</th>
                      <th className="px-6 py-4">Amount Recv.</th>
                      <th className="px-6 py-4 text-center">Submission Date</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Verification Tools</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 font-semibold">
                    {filteredRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                        <td className="px-6 py-4 space-y-0.5">
                          <p className="font-black text-zinc-900 dark:text-white">{request.user_profiles?.full_name || 'Anonymous User'}</p>
                          <p className="text-[10px] text-zinc-400 tracking-tight font-mono break-all">{request.user_profiles?.email || 'No email log'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full block w-fit ${
                            request.payment_method === 'bKash' 
                              ? 'bg-pink-500/10 text-pink-600' 
                              : 'bg-orange-500/10 text-orange-600'
                          }`}>
                            {request.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold tracking-tight">
                          {request.payment_number}
                        </td>
                        <td className="px-6 py-4 font-mono font-black text-blue-600 dark:text-blue-400 select-all tracking-wide">
                          {request.transaction_id}
                        </td>
                        <td className="px-6 py-4 font-black">
                          ৳ {request.amount}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-[10px] text-zinc-500">
                          {request.created_at ? new Date(request.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            request.status === 'pending'
                              ? 'bg-amber-100 text-amber-600 animate-pulse'
                              : request.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">
                          {request.status === 'pending' ? (
                            <div className="flex flex-col gap-1.5 items-end justify-end">
                              <input 
                                type="text"
                                placeholder="Add review note..."
                                value={activeRequestNotes[request.id] || ''}
                                onChange={(e) => setActiveRequestNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                                className="px-2 py-1 text-[10px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-750 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 w-32 font-semibold"
                              />
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    if (request.status === 'approved') {
                                      showToast("This request has already been validated and approved!", "ref");
                                      return;
                                    }
                                    handleApproveRequest(request, activeRequestNotes[request.id]);
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-1.5 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/10 active:scale-95 transition-transform cursor-pointer"
                                  title="Approve manual transfer log with note"
                                >
                                  <Check size={14} className="stroke-[3]" />
                                </button>
                                <button 
                                  onClick={() => handleRejectRequest(request, activeRequestNotes[request.id])}
                                  className="bg-red-500 hover:bg-red-600 text-white font-bold p-1.5 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/10 active:scale-95 transition-transform cursor-pointer"
                                  title="Deny manual transfer log with note"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : request.status === 'approved' ? (
                            <div className="text-right flex flex-col items-end gap-1">
                              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <Check size={10} className="stroke-[3]" /> APPROVED BADGE
                              </span>
                              {request.approved_at && (
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono font-bold block">
                                  Approved: {new Date(request.approved_at).toLocaleDateString()}
                                </span>
                              )}
                              {request.admin_note && (
                                <p className="text-[10px] italic text-zinc-500 dark:text-zinc-400 max-w-[150px] truncate text-right border-t border-zinc-100 dark:border-zinc-800/60 pt-1 mt-0.5" title={request.admin_note}>
                                  Reason: {request.admin_note}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-right flex flex-col items-end gap-1">
                              <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-500 dark:text-red-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <X size={10} /> REJECTED
                              </span>
                              {request.admin_note && (
                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[120px] truncate text-right mt-0.5" title={request.admin_note}>
                                  Note: {request.admin_note}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-zinc-500 font-bold font-mono text-xs uppercase tracking-wide">
                          No transaction submissions available matching search filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 2: Active Premium Users (NEW!) */}
        {activeSubTab === 'users' && (
          <motion.div 
            key="tab-users" 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Search Premium Students */}
            <div className="bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-[24px]">
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl px-4 py-2 border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <Search size={16} className="text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search active premium users by student name or email address..."
                  value={premiumUserSearch}
                  onChange={(e) => setPremiumUserSearch(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-semibold focus:outline-none text-zinc-900 dark:text-white"
                />
              </div>
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-zinc-100 dark:bg-zinc-800 text-[11px] font-black tracking-widest text-zinc-500 uppercase border-b border-zinc-200 dark:border-zinc-800/60 font-mono">
                      <th className="px-6 py-4">Student Profile</th>
                      <th className="px-6 py-4">Contact Email</th>
                      <th className="px-6 py-4 text-center">Premium Start Date</th>
                      <th className="px-6 py-4 text-center">Premium Expiry Date</th>
                      <th className="px-6 py-4 text-center">Fast Extend Access</th>
                      <th className="px-6 py-4 text-center">Update Expiry Date</th>
                      <th className="px-6 py-4 text-right">Revoke Premium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 font-semibold">
                    {filteredPremiumStudents.map((u) => {
                      // Attempt to retrieve request validation start point
                      const appr = requests.find(r => r.user_id === u.id && r.status === 'approved');
                      const startLabel = appr?.approved_at 
                        ? new Date(appr.approved_at).toLocaleDateString() 
                        : 'Manual Setup';

                      return (
                        <tr key={u.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-extrabold text-zinc-900 dark:text-white flex items-center gap-1.5 leading-snug">
                                <Sparkles size={12} className="text-amber-500 fill-amber-500/25 animate-pulse shrink-0" />
                                {u.name || 'Anonymous Student'}
                              </span>
                              {(u.phone_number || u.phone) && (
                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-wider bg-indigo-50 dark:bg-indigo-950/20 px-1.5 py-0.5 rounded-md w-fit inline-flex items-center gap-1 mt-0.5 border border-indigo-100/50 dark:border-indigo-900/10">
                                  📱 {u.phone_number || u.phone}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-medium text-zinc-500 select-all break-all">{u.email}</td>
                          <td className="px-6 py-4 text-center font-mono text-zinc-500">{startLabel}</td>
                          <td className="px-6 py-4 text-center font-semibold text-zinc-900 dark:text-white">
                            {u.premium_expiry ? (
                              <span className={`px-2 py-0.5 rounded font-mono ${
                                new Date(u.premium_expiry).getTime() < Date.now() 
                                  ? 'bg-red-500/10 text-red-600 line-through' 
                                  : 'bg-emerald-500/10 text-emerald-600'
                              }`}>
                                {new Date(u.premium_expiry).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            ) : (
                              <span className="text-zinc-400">Lifetime</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => handleExtendUser(u.id, 7)}
                                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-black px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer text-zinc-800 dark:text-zinc-200"
                              >
                                +7d
                              </button>
                              <button
                                onClick={() => handleExtendUser(u.id, 30)}
                                className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2 py-1 rounded-lg border border-blue-100 dark:border-blue-900 transition-colors cursor-pointer"
                              >
                                +30d
                              </button>
                              <button
                                onClick={() => handleExtendUser(u.id, 90)}
                                className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-black px-2 py-1 rounded-lg border border-amber-100 dark:border-amber-900 transition-colors cursor-pointer"
                              >
                                +90d
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input 
                              type="date" 
                              value={u.premium_expiry ? u.premium_expiry.substring(0, 10) : ''}
                              onChange={(e) => handleCustomExpiryChange(u.id, e.target.value)}
                              className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[11px] font-bold text-zinc-950 dark:text-zinc-100 focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRemoveUser(u.id)}
                              className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 p-1.5 rounded-lg border border-red-500/10 hover:border-transparent transition-all shadow-sm shadow-red-500/5 cursor-pointer active:scale-95"
                              title="Revoke Premium Access"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredPremiumStudents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-zinc-500 font-bold font-mono text-xs uppercase tracking-wide">
                          No active premium students matched your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Statistics Hub (NEW!) */}
        {activeSubTab === 'stats' && (
          <motion.div 
            key="tab-stats" 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Stat Card 1 */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[28px] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black tracking-widest text-zinc-450 uppercase font-mono">Student Access Overview</span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 p-2 rounded-xl"><Users size={16} /></span>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{totalStudents}</p>
                  <p className="text-zinc-500 text-xs font-bold font-mono">TOTAL REGISTERED STUDENTS</p>
                </div>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[28px] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase font-mono">Premium Subscriptions</span>
                  <span className="bg-amber-100 dark:bg-amber-950/20 text-amber-500 p-2 rounded-xl"><Sparkles size={16} className="fill-amber-500/10" /></span>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{activePremiumCount}</p>
                  <p className="text-zinc-500 text-xs font-bold font-mono">ACTIVE PREMIUM SUBSCRIBERS</p>
                </div>
              </div>

              {/* Stat Card 3 */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[28px] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black tracking-widest text-red-500 uppercase font-mono">Subscription Expiries</span>
                  <span className="bg-red-100 dark:bg-red-950/20 text-red-500 p-2 rounded-xl"><Clock size={16} /></span>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">{expiredPremiumCount}</p>
                  <p className="text-zinc-500 text-xs font-bold font-mono">EXPIRED PREMIUM USERS</p>
                </div>
              </div>

              {/* Stat Card 4 */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-[28px] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black tracking-widest text-blue-500 uppercase font-mono">Sales & Income Flow</span>
                  <span className="bg-blue-100 dark:bg-blue-950/20 text-blue-500 p-2 rounded-xl"><CreditCard size={16} /></span>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">৳ {totalRevenueSum}</p>
                  <p className="text-zinc-500 text-xs font-bold font-mono">TOTAL REVENUE (APPROVED)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request Stats */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 space-y-6">
                <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white border-b pb-3 border-zinc-200 dark:border-zinc-800 font-mono tracking-wider">
                  Request Ledger Summary
                </h3>
                <div className="space-y-4 text-xs font-semibold">
                  <div className="flex justify-between p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                    <span className="text-amber-600">Pending Approvals</span>
                    <strong className="text-amber-700">{pendingRequestsCount} Transaction Verification Requests</strong>
                  </div>
                  <div className="flex justify-between p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                    <span className="text-emerald-600">Approved Payments</span>
                    <strong className="text-emerald-700">{approvedRequestsCount} Approved</strong>
                  </div>
                  <div className="flex justify-between p-3.5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl text-zinc-650 dark:text-zinc-350">
                    <span>Rejected/Dismissed Requests</span>
                    <strong>{requests.filter(r => r.status === 'rejected').length} Requests Dismissed</strong>
                  </div>
                </div>
              </div>

              {/* Settings Configuration States */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 space-y-6">
                <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white border-b pb-3 border-zinc-200 dark:border-zinc-800 font-mono tracking-wider">
                  Operational Settings Status
                </h3>
                <div className="space-y-4 text-xs font-semibold">
                  <div className="flex justify-between items-center p-3">
                    <span className="text-zinc-500 font-bold uppercase font-mono">System Subscription Sales:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      settingsForm.is_subscription_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {settingsForm.is_subscription_enabled ? 'ENABLED & DEPLOYED' : 'DISABLED / PAUSED'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 font-bold uppercase font-mono">bKash Manual Receiver Number:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-black">{settingsForm.payment_number_bkash || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500 font-bold uppercase font-mono">Nagad Manual Receiver Number:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-black">{settingsForm.payment_number_nagad || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 4: Poster Settings (Requirement 2) */}
        {activeSubTab === 'settings' && (
          <motion.div 
            key="tab-settings" 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 sm:p-8"
          >
            {supabaseService.subscriptionTablesMissing.settings && (
              <div className="mb-6 bg-amber-500/10 border-2 border-amber-500/20 text-amber-600 dark:text-amber-400 p-5 rounded-3xl flex items-center gap-4">
                <AlertTriangle size={24} className="shrink-0 text-amber-500" />
                <div className="text-xs">
                  <h4 className="font-black text-sm uppercase tracking-wider mb-1">Local Sandbox Settings Enabled</h4>
                  <p className="font-semibold leading-relaxed animate-pulse">
                    The table <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded text-amber-700 dark:text-amber-300">subscription_settings</code> does not exist in your Supabase database yet. Settings customization is operating in local sandbox fallback mode. To save settings permanently, run Section 10 of <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">SUPABASE_FINAL_SCHEMA.sql</code> in your Supabase SQL Editor.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-4 border-zinc-200 dark:border-zinc-800">
                <h2 className="text-lg font-black text-zinc-900 dark:text-white">
                  Premium Landing Page & Billing Settings
                </h2>
              </div>

              {/* Requirement 2: Toggle Sales switch */}
              <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/15 border border-blue-150 dark:border-blue-900/40 rounded-2xl gap-4">
                <div className="space-y-0.5">
                  <label className="text-xs font-black uppercase text-blue-700 dark:text-blue-400">Subscription Sales Control</label>
                  <p className="text-[11px] text-zinc-500 font-semibold leading-relaxed">Turn client subscription landing page open/close or toggle billing sales completely.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsForm(prev => ({ ...prev, is_subscription_enabled: !prev.is_subscription_enabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    settingsForm.is_subscription_enabled ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'
                  } cursor-pointer shrink-0`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settingsForm.is_subscription_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-bold uppercase text-zinc-400 font-mono flex items-center gap-1.5">
                    <Image size={12} /> Poster Background Image URL / File Upload
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      type="text" 
                      value={settingsForm.poster_image_url || ''} 
                      onChange={(e) => setSettingsForm({ ...settingsForm, poster_image_url: e.target.value })}
                      className="flex-1 px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Unsplash URL or upload file directly"
                    />
                    <label className={`shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition-all active:scale-95 ${isUploadingPoster ? 'opacity-80 pointer-events-none' : ''}`}>
                      <Plus size={14} className={`${isUploadingPoster ? 'animate-spin' : ''}`} />
                      <span>{isUploadingPoster ? 'Uploading...' : 'Direct Upload File'}</span>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg, image/webp" 
                        className="hidden" 
                        onChange={handlePosterUpload}
                        disabled={isUploadingPoster}
                      />
                    </label>
                  </div>
                  {settingsForm.poster_image_url && (
                    <div className="mt-2 relative w-full h-24 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                      <img src={settingsForm.poster_image_url} alt="Uploaded poster preview" className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2">
                        <span className="text-[10px] text-white font-mono break-all">{settingsForm.poster_image_url}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-xs font-bold uppercase text-zinc-400 font-mono">Poster Header Title</label>
                  <input 
                    type="text" 
                    value={settingsForm.poster_title || ''} 
                    onChange={(e) => setSettingsForm({ ...settingsForm, poster_title: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-xs font-bold uppercase text-zinc-400 font-mono">Poster Promotional Text / Subtitle</label>
                  <textarea 
                    value={settingsForm.poster_description || ''} 
                    onChange={(e) => setSettingsForm({ ...settingsForm, poster_description: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500 min-h-[50px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-zinc-400 font-mono flex items-center gap-1.5"><Coins size={12} className="text-pink-600" /> bKash Manual Receiver Number</label>
                  <input 
                    type="text" 
                    value={settingsForm.payment_number_bkash || ''} 
                    onChange={(e) => setSettingsForm({ ...settingsForm, payment_number_bkash: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-zinc-400 font-mono flex items-center gap-1.5"><Coins size={12} className="text-orange-550" /> Nagad Manual Receiver Number</label>
                  <input 
                    type="text" 
                    value={settingsForm.payment_number_nagad || ''} 
                    onChange={(e) => setSettingsForm({ ...settingsForm, payment_number_nagad: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="border-t pt-4 border-zinc-100 dark:border-zinc-800 col-span-2">
                  <h4 className="text-[11px] font-black uppercase text-zinc-500 tracking-widest font-mono mb-4">Fallback Pricing Configurations</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-zinc-400 font-mono">Current Price (৳)</label>
                      <input 
                        type="number" 
                        value={settingsForm.current_price || ''} 
                        onChange={(e) => setSettingsForm({ ...settingsForm, current_price: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-zinc-400 font-mono">Old Price (৳)</label>
                      <input 
                        type="number" 
                        value={settingsForm.old_price || ''} 
                        onChange={(e) => setSettingsForm({ ...settingsForm, old_price: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase text-zinc-400 font-mono">Discount Shown (%)</label>
                      <input 
                        type="number" 
                        value={settingsForm.discount_percent || ''} 
                        onChange={(e) => setSettingsForm({ ...settingsForm, discount_percent: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* FEATURE 2: Premium Stats live overview */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/20 p-5 rounded-[24px] border border-zinc-200 dark:border-zinc-800 space-y-4">
                    <h3 className="text-xs font-black uppercase text-emerald-500 tracking-wider font-mono flex items-center gap-1.5 border-b pb-2.5 border-zinc-200 dark:border-zinc-800">
                      ⚡ LIVE PREMIUM PLATFORM STATISTICS (AUTO-COMPUTED)
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-semibold leading-relaxed">
                      These counts are computed automatically and updated in real-time from your active database records.
                    </p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center">
                        <span className="text-2xl font-black text-amber-500 tracking-tight block font-mono">
                          {liveStats.members}
                        </span>
                        <span className="text-zinc-[700] dark:text-zinc-200 font-bold text-[10px] uppercase block mt-1">Premium Members</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center">
                        <span className="text-2xl font-black text-blue-500 tracking-tight block font-mono">
                          {liveStats.exams}
                        </span>
                        <span className="text-zinc-[700] dark:text-zinc-200 font-bold text-[10px] uppercase block mt-1">Premium Exams</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center">
                        <span className="text-2xl font-black text-emerald-500 tracking-tight block font-mono">
                          {liveStats.notes}
                        </span>
                        <span className="text-zinc-[700] dark:text-zinc-200 font-bold text-[10px] uppercase block mt-1">Premium Notes</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-center">
                        <span className="text-2xl font-black text-pink-500 tracking-tight block font-mono">
                          {liveStats.sheets}
                        </span>
                        <span className="text-zinc-[700] dark:text-zinc-200 font-bold text-[10px] uppercase block mt-1">Premium Sheets</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <Button 
                  type="submit" 
                  disabled={isSavingSettings}
                  className="bg-blue-600 hover:bg-blue-700 hover:shadow-lg font-black text-xs uppercase tracking-widest px-8 py-3.5 rounded-2xl shadow-blue-500/25 flex items-center gap-2 cursor-pointer"
                >
                  <Save size={14} /> {isSavingSettings ? 'Saving...' : 'Commit Configuration Changes'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Tab 5: Dynamic Packages list */}
        {activeSubTab === 'packages' && (
          <motion.div 
            key="tab-packages" 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {supabaseService.subscriptionTablesMissing.packages && (
              <div className="lg:col-span-12 bg-amber-500/10 border-2 border-amber-500/20 text-amber-600 dark:text-amber-400 p-5 rounded-3xl flex items-center gap-4">
                <AlertTriangle size={24} className="shrink-0 text-amber-500" />
                <div className="text-xs">
                  <h4 className="font-black text-sm uppercase tracking-wider mb-1">Local Sandbox Protocol Active</h4>
                  <p className="font-semibold leading-relaxed animate-pulse">
                    The table <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded text-amber-700 dark:text-amber-300">subscription_packages</code> does not exist in your Supabase database yet. High-fidelity operations are falling back to local persistent sandbox mode (independent of database limits). To fully sync your server-side packages, please copy and run Section 11 of <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">SUPABASE_FINAL_SCHEMA.sql</code> in your Supabase SQL Editor.
                  </p>
                </div>
              </div>
            )}

            {/* Create package form (Left) */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 space-y-6">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white border-b pb-3 border-zinc-200 dark:border-zinc-800">
                Add Subscription Plan (Package)
              </h2>

              {pkgError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p className="text-xs font-bold">{pkgError}</p>
                </div>
              )}

              <form onSubmit={handleAddPackage} className="space-y-4 text-xs font-bold text-zinc-400 tracking-wider">
                <div className="space-y-1.5">
                  <label className="text-zinc-600 dark:text-zinc-300">PLAN DESCRIPTION NAME:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 1 Month, 3 Months Standard"
                    required
                    value={newPackage.name}
                    onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-600 dark:text-zinc-300">DURATION (DAYS):</label>
                  <input 
                    type="number" 
                    required
                    value={newPackage.duration_days}
                    onChange={(e) => setNewPackage({ ...newPackage, duration_days: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-zinc-600 dark:text-zinc-300">PRICE (BDT):</label>
                    <input 
                      type="number" 
                      required
                      value={newPackage.price}
                      onChange={(e) => setNewPackage({ ...newPackage, price: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-zinc-600 dark:text-zinc-300">OLD PRICE (BDT):</label>
                    <input 
                      type="number" 
                      value={newPackage.old_price}
                      onChange={(e) => setNewPackage({ ...newPackage, old_price: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-zinc-600 dark:text-zinc-300">DISCOUNT SHOWN PERCENT (%):</label>
                  <input 
                    type="number" 
                    value={newPackage.discount_percent}
                    onChange={(e) => setNewPackage({ ...newPackage, discount_percent: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-white font-black focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center pl-1 py-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">
                    <input 
                      type="checkbox"
                      checked={newPackage.is_most_popular}
                      onChange={(e) => setNewPackage({ ...newPackage, is_most_popular: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    🔥 Is Most Popular Package
                  </label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3.5 font-black text-xs uppercase tracking-widest text-white rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={14} /> Add Subscription Plan
                </Button>
              </form>
            </div>

            {/* Packages List table (Right) */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 space-y-4">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white border-b pb-3 border-zinc-200 dark:border-zinc-800">
                Active Subscription Packages ({packages.length})
              </h2>

              <div className="space-y-3">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                    {editingPackageId === pkg.id ? (
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-zinc-500 font-mono tracking-wider">Modify Subscription Package</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 font-mono">PLAN NAME:</label>
                            <input
                              type="text"
                              value={editingPackageForm.name}
                              onChange={(e) => setEditingPackageForm({ ...editingPackageForm, name: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-semibold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 font-mono">DURATION (DAYS):</label>
                            <input
                              type="number"
                              value={editingPackageForm.duration_days}
                              onChange={(e) => setEditingPackageForm({ ...editingPackageForm, duration_days: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-semibold font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 font-mono">CURRENT PRICE (৳):</label>
                            <input
                              type="number"
                              value={editingPackageForm.price}
                              onChange={(e) => setEditingPackageForm({ ...editingPackageForm, price: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-bold font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 font-mono">OLD PRICE (৳):</label>
                            <input
                              type="number"
                              value={editingPackageForm.old_price || ''}
                              onChange={(e) => setEditingPackageForm({ ...editingPackageForm, old_price: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 font-mono">SHOWN DISCOUNT (%):</label>
                            <input
                              type="number"
                              value={editingPackageForm.discount_percent || ''}
                              onChange={(e) => setEditingPackageForm({ ...editingPackageForm, discount_percent: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono"
                            />
                          </div>
                          <div className="space-y-1 flex items-center pt-4 pl-1 gap-4">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-650 dark:text-zinc-355">
                              <input
                                type="checkbox"
                                checked={editingPackageForm.is_active}
                                onChange={(e) => setEditingPackageForm({ ...editingPackageForm, is_active: e.target.checked })}
                                className="rounded text-blue-650 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              Is Active (Display Package)
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-amber-600 dark:text-amber-400">
                              <input
                                type="checkbox"
                                checked={editingPackageForm.is_most_popular}
                                onChange={(e) => setEditingPackageForm({ ...editingPackageForm, is_most_popular: e.target.checked })}
                                className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                              />
                              🔥 Most Popular
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
                          <button
                            onClick={() => setEditingPackageId(null)}
                            className="px-3 py-1.5 text-xs font-black uppercase text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdatePackage(pkg.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Save size={13} /> Save Plan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-black text-zinc-900 dark:text-white">{pkg.name}</strong>
                            {pkg.is_most_popular ? (
                              <span className="bg-amber-500/10 text-amber-500 text-[9px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full border border-amber-500/15 flex items-center gap-1">
                                🔥 MOST POPULAR
                              </span>
                            ) : null}
                            {pkg.discount_percent ? (
                              <span className="bg-red-500/10 text-red-500 text-[10px] uppercase font-black tracking-normal px-2 py-0.5 rounded-full border border-red-500/10 block">
                                {pkg.discount_percent}% OFF
                              </span>
                            ) : null}
                            {!pkg.is_active ? (
                              <span className="bg-zinc-500/10 text-zinc-500 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full block">
                                Hidden
                              </span>
                            ) : null}
                          </div>
                          <p className="text-zinc-400 text-xs font-mono">{pkg.duration_days} Days full premium access</p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm font-black text-zinc-900 dark:text-white">৳ {pkg.price}</p>
                            {pkg.old_price ? (
                              <p className="text-zinc-400 text-[10px] line-through">৳ {pkg.old_price}</p>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditingPackageId(pkg.id);
                                setEditingPackageForm({
                                  name: pkg.name,
                                  duration_days: pkg.duration_days,
                                  price: pkg.price,
                                  old_price: pkg.old_price,
                                  discount_percent: pkg.discount_percent,
                                  is_active: pkg.is_active ?? true,
                                  is_most_popular: pkg.is_most_popular ?? false
                                });
                              }}
                              className="bg-zinc-500/10 hover:bg-zinc-500 hover:text-white text-zinc-500 p-2 rounded-xl transition-all hover:scale-105 active:scale-95 duration-250 cursor-pointer"
                              title="Edit plan"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeletePackage(pkg.id)}
                              className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 p-2 rounded-xl transition-all shadow-sm shadow-red-500/5 hover:scale-105 active:scale-95 duration-250 cursor-pointer"
                              title="Remove package"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {packages.length === 0 && (
                  <p className="text-zinc-400 text-center text-xs py-8">No billing packages created inside the system database yet.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 6: Benefits Management */}
        {activeSubTab === 'benefits' && (
          <motion.div 
            key="tab-benefits" 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {supabaseService.subscriptionTablesMissing.benefits && (
              <div className="lg:col-span-12 bg-amber-500/10 border-2 border-amber-500/20 text-amber-600 dark:text-amber-400 p-5 rounded-3xl flex items-center gap-4">
                <AlertTriangle size={24} className="shrink-0 text-amber-500" />
                <div className="text-xs">
                  <h4 className="font-black text-sm uppercase tracking-wider mb-1">Local Sandbox Benefits Mode</h4>
                  <p className="font-semibold leading-relaxed animate-pulse">
                    The table <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded text-amber-700 dark:text-amber-300">subscription_benefits</code> does not exist in your Supabase database yet. Active values are falling back to local persistent storage. To set up actual database subscription benefits, please run Section 11 from <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">SUPABASE_FINAL_SCHEMA.sql</code> in your Supabase SQL Editor.
                  </p>
                </div>
              </div>
            )}

            {/* Create Benefit Form (Left) */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 space-y-6">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white border-b pb-3 border-zinc-200 dark:border-zinc-800">
                Add Premium Benefit
              </h2>

              {benefitError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3.5 rounded-xl text-xs font-bold">
                  {benefitError}
                </div>
              )}

              <form onSubmit={handleAddBenefit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-zinc-600 dark:text-zinc-300 text-xs font-bold font-mono">Privilege Description:</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Daily Personal Mentorship Class"
                    required
                    value={newBenefitText}
                    onChange={(e) => setNewBenefitText(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3.5 font-black text-xs uppercase tracking-widest text-white rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={14} /> Add Premium Privilege
                </Button>
              </form>
            </div>

            {/* List Benefits table (Right) */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 space-y-4">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white border-b pb-3 border-zinc-200 dark:border-zinc-800">
                Premium Benefits / Privileges ({benefits.length})
              </h2>

              <div className="space-y-2.5">
                {benefits.map((benefit) => (
                  <div key={benefit.id} className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl gap-4">
                    {editingBenefitId === benefit.id ? (
                      <div className="flex-1 flex gap-2 items-center">
                        <input
                          type="text"
                          value={editingBenefitText}
                          onChange={(e) => setEditingBenefitText(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none"
                        />
                        <button
                          onClick={() => handleUpdateBenefit(benefit.id, editingBenefitText)}
                          className="bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500 p-2 rounded-xl transition-all cursor-pointer"
                          title="Save privilege text"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          onClick={() => setEditingBenefitId(null)}
                          className="bg-zinc-500/10 hover:bg-zinc-500 hover:text-white text-zinc-500 p-2 rounded-xl transition-all cursor-pointer"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 text-left">
                          {benefit.text}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingBenefitId(benefit.id);
                              setEditingBenefitText(benefit.text);
                            }}
                            className="bg-zinc-500/10 hover:bg-zinc-500 hover:text-white text-zinc-500 p-2 rounded-xl transition-all duration-250 cursor-pointer"
                            title="Edit privilege"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button 
                            onClick={() => handleDeleteBenefit(benefit.id)}
                            className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 p-2 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95 duration-250 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {benefits.length === 0 && (
                  <p className="text-zinc-400 text-center text-xs py-8">No privileges created yet inside the settings database.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 7: Coupons Management */}
        {activeSubTab === 'coupons' && (
          <motion.div 
            key="tab-coupons"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid lg:grid-cols-12 gap-6 items-start text-left"
          >
            {/* Create Coupon (Left) */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 space-y-4">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white border-b pb-3 border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                <Tag size={18} className="text-amber-500" /> Create Promo Coupon
              </h2>

              {couponFormError && (
                <div className="p-3 text-xs font-semibold rounded-xl bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400">
                  ⚠️ {couponFormError}
                </div>
              )}

              <form onSubmit={handleCreateCoupon} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-650 dark:text-zinc-300">COUPON CODE (UPPERCASE):</label>
                  <input 
                    type="text" 
                    placeholder="e.g. PROMO50, SAVE20"
                    required
                    value={newCouponForm.code}
                    onChange={(e) => setNewCouponForm({ ...newCouponForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-black text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-650 dark:text-zinc-300 font-sans">DISCOUNT TYPE:</label>
                    <select
                      value={newCouponForm.discount_type}
                      onChange={(e) => setNewCouponForm({ ...newCouponForm, discount_type: e.target.value as 'fixed' | 'percentage' })}
                      className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (৳)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 font-sans">DISCOUNT VALUE:</label>
                    <input 
                      type="number" 
                      required
                      value={newCouponForm.discount_value}
                      onChange={(e) => setNewCouponForm({ ...newCouponForm, discount_value: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 font-sans">USAGE LIMIT:</label>
                    <input 
                      type="number" 
                      value={newCouponForm.usage_limit}
                      onChange={(e) => setNewCouponForm({ ...newCouponForm, usage_limit: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 font-sans">EXPIRY DATE (LOCAL):</label>
                    <input 
                      type="date" 
                      value={newCouponForm.expiry_date}
                      onChange={(e) => setNewCouponForm({ ...newCouponForm, expiry_date: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-800 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center pl-1 py-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    <input 
                      type="checkbox"
                      checked={newCouponForm.is_active}
                      onChange={(e) => setNewCouponForm({ ...newCouponForm, is_active: e.target.checked })}
                      className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    Is Coupon Instantly Active
                  </label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-amber-500 hover:bg-amber-600 py-3.5 font-black text-xs uppercase tracking-widest text-white rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={14} /> Add Coupon Code
                </Button>
              </form>
            </div>

            {/* Coupons List Table (Right) */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-6 space-y-4">
              <h2 className="text-lg font-black text-zinc-900 dark:text-white border-b pb-3 border-zinc-200 dark:border-zinc-800">
                Active Promo Coupons ({coupons.length})
              </h2>

              <div className="space-y-3">
                {coupons.map((cpn) => (
                  <div key={cpn.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-left">
                    {editingCouponId === cpn.id ? (
                      <div className="space-y-4 text-left">
                        <h3 className="text-xs font-black uppercase text-amber-500 font-mono tracking-wider">Modify Coupon Parameters</h3>
                        
                        <div className="grid grid-cols-2 gap-3 text-left">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 font-mono">CODE:</label>
                            <input
                              type="text"
                              value={editingCouponForm.code}
                              onChange={(e) => setEditingCouponForm({ ...editingCouponForm, code: e.target.value.toUpperCase() })}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-black"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 font-mono">DISCOUNT TYPE:</label>
                            <select
                              value={editingCouponForm.discount_type}
                              onChange={(e) => setEditingCouponForm({ ...editingCouponForm, discount_type: e.target.value as 'fixed' | 'percentage' })}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-bold"
                            >
                              <option value="percentage">Percentage (%)</option>
                              <option value="fixed">Fixed (৳)</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 font-mono">VALUE:</label>
                            <input
                              type="number"
                              value={editingCouponForm.discount_value}
                              onChange={(e) => setEditingCouponForm({ ...editingCouponForm, discount_value: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-semibold font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-zinc-500 font-mono">USAGE LIMIT:</label>
                            <input
                              type="number"
                              value={editingCouponForm.usage_limit || ''}
                              onChange={(e) => setEditingCouponForm({ ...editingCouponForm, usage_limit: Number(e.target.value) })}
                              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1 text-left">
                          <label className="text-[10px] font-bold text-zinc-500 font-mono">EXPIRY DATE:</label>
                          <input
                            type="date"
                            value={editingCouponForm.expiry_date || ''}
                            onChange={(e) => setEditingCouponForm({ ...editingCouponForm, expiry_date: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono font-bold"
                          />
                        </div>

                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-650 dark:text-zinc-355 select-none">
                            <input
                              type="checkbox"
                              checked={editingCouponForm.is_active}
                              onChange={(e) => setEditingCouponForm({ ...editingCouponForm, is_active: e.target.checked })}
                              className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                            />
                            Coupon Is Enabled
                          </label>
                        </div>

                        <div className="flex gap-2 justify-end pt-2 border-t border-zinc-200 dark:border-zinc-800">
                          <button
                            onClick={() => setEditingCouponId(null)}
                            className="px-3 py-1.5 text-xs font-black uppercase text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateCoupon(cpn.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Save size={13} /> Save Coupon
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center gap-4 text-left">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                              {cpn.code}
                            </span>
                            <span className="text-xs font-black text-zinc-905 dark:text-zinc-100">
                              {cpn.discount_type === 'percentage' ? `${cpn.discount_value}% Discount` : `৳${cpn.discount_value} Discount`}
                            </span>
                            {!cpn.is_active && (
                              <span className="bg-red-500/10 text-red-550 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full block border border-red-500/10">
                                Disabled
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-zinc-400 text-[10px] font-mono">
                            <span>Limit: {cpn.used_count || 0} / {cpn.usage_limit || '∞'} Used</span>
                            {cpn.expiry_date && (
                              <span>Expires: {new Date(cpn.expiry_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCouponId(cpn.id);
                              setEditingCouponForm({
                                code: cpn.code,
                                discount_type: cpn.discount_type,
                                discount_value: cpn.discount_value,
                                usage_limit: cpn.usage_limit,
                                expiry_date: cpn.expiry_date,
                                is_active: cpn.is_active ?? true
                              });
                            }}
                            className="bg-zinc-500/10 hover:bg-zinc-500 hover:text-white text-zinc-500 p-2 rounded-xl transition-all hover:scale-105 active:scale-95 duration-250 cursor-pointer"
                            title="Edit coupon"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(cpn.id, cpn.code)}
                            className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 p-2 rounded-xl transition-all shadow-sm shadow-red-500/5 hover:scale-105 active:scale-95 duration-250 cursor-pointer"
                            title="Delete coupon"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {coupons.length === 0 && (
                  <p className="text-zinc-400 text-center text-xs py-8">No promo coupons created yet in the database.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safe In-App Confirmation Modal */}
      <AnimatePresence>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl shadow-zinc-950/10"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 text-amber-500">
                  <AlertTriangle size={24} />
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider font-mono">
                    {confirmDialog.title}
                  </h3>
                </div>
                <p className="text-xs font-semibold text-zinc-605 dark:text-zinc-300 leading-relaxed whitespace-pre-line text-left">
                  {confirmDialog.description}
                </p>
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    className="px-4 py-2 text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                  >
                    {confirmDialog.cancelText || "Cancel"}
                  </button>
                  <button
                    onClick={async () => {
                      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                      await confirmDialog.onConfirm();
                    }}
                    className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white rounded-xl transition-all cursor-pointer ${
                      confirmDialog.isDanger 
                        ? 'bg-red-650 hover:bg-red-700 shadow-lg shadow-red-600/10' 
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/10'
                    }`}
                  >
                    {confirmDialog.confirmText || "Confirm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
